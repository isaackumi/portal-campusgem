import type { Id } from '../_generated/dataModel'
import type { MutationCtx } from '../_generated/server'
import { allocateCampCheckInCode } from './campCheckInCode'
import { extractBirthdayParts } from './birthday'
import { normalizeGhanaPhone, phoneLookupVariants } from './phone'

export type CampRegistrationPublicInput = {
  camp_year_id: Id<'camp_years'>
  first_name: string
  last_name: string
  full_name?: string
  email?: string
  phone: string
  facebook_username?: string
  sex: 'Male' | 'Female'
  date_of_birth?: string
  birth_month?: number
  birth_day?: number
  age_bracket: string
  address_school_work: string
  education_level: string
  highest_qualification: string
  residence: string
  times_attended: number
  has_nhis_card: boolean
  nhis_card_expiry_date?: string
  has_health_challenge: boolean
  health_challenges?: string[]
  other_health_challenge?: string
  parent_name: string
  parent_contact: string
  role?: string
}

async function findRegistrationByPhoneForYear(
  ctx: MutationCtx,
  campYearId: string,
  phone: string
) {
  for (const variant of phoneLookupVariants(phone)) {
    const existing = await ctx.db
      .query('camp_registrations')
      .withIndex('by_camp_year_phone', (q) =>
        q.eq('camp_year_id', campYearId).eq('phone', variant)
      )
      .first()
    if (existing) return existing
  }
  return null
}

export async function countPastCampRegistrationsForPhone(
  ctx: MutationCtx,
  phone: string,
  excludeCampYearId: string
): Promise<number> {
  const seen = new Set<string>()
  let count = 0

  for (const variant of phoneLookupVariants(phone)) {
    const rows = await ctx.db
      .query('camp_registrations')
      .withIndex('by_phone', (q) => q.eq('phone', variant))
      .collect()
    for (const row of rows) {
      const id = String(row._id)
      if (seen.has(id)) continue
      seen.add(id)
      if (String(row.camp_year_id) === excludeCampYearId) continue
      count += 1
    }
  }

  return count
}

/** Public self-serve camp registration insert (legacy register page + Forms Hub). */
export async function insertCampRegistrationPublic(
  ctx: MutationCtx,
  args: CampRegistrationPublicInput
) {
  const year = await ctx.db.get('camp_years', args.camp_year_id)
  if (!year) {
    throw new Error('Camp year not found.')
  }
  if (!year.registration_open) {
    throw new Error('Registration is closed for this Camp Meeting.')
  }

  const yearIdStr = String(args.camp_year_id)
  const normalizedPhone = normalizeGhanaPhone(args.phone)
  const birthday =
    args.birth_month != null && args.birth_day != null
      ? { birth_month: args.birth_month, birth_day: args.birth_day }
      : extractBirthdayParts(args.date_of_birth)

  const existingPhone = await findRegistrationByPhoneForYear(ctx, yearIdStr, normalizedPhone)
  if (existingPhone) {
    throw new Error('This phone number is already registered for this event.')
  }

  const emailNorm = (args.email || '').trim()
  if (emailNorm.length > 0) {
    const existingEmail = await ctx.db
      .query('camp_registrations')
      .withIndex('by_camp_year_email', (q) =>
        q.eq('camp_year_id', yearIdStr).eq('email', emailNorm)
      )
      .first()
    if (existingEmail) {
      throw new Error('This email is already registered for this event.')
    }
  }

  let healthChallenges = args.health_challenges ?? []
  if (args.other_health_challenge?.trim() && healthChallenges.includes('other')) {
    healthChallenges = [...healthChallenges, `other: ${args.other_health_challenge.trim()}`]
  }

  const fullName =
    args.full_name?.trim() || `${args.first_name} ${args.last_name}`.trim()
  const isNewRegistrant = (args.times_attended || 0) === 0
  const role = args.role || 'Participant'
  const checkInCode = await allocateCampCheckInCode(ctx, yearIdStr, year.year)

  const now = Date.now()
  const regId = await ctx.db.insert('camp_registrations', {
    camp_year_id: yearIdStr,
    full_name: fullName,
    first_name: args.first_name,
    last_name: args.last_name,
    email: emailNorm.length > 0 ? emailNorm : ' ',
    phone: normalizedPhone,
    facebook_username: args.facebook_username,
    sex: args.sex,
    date_of_birth: args.date_of_birth,
    birth_month: birthday.birth_month,
    birth_day: birthday.birth_day,
    age_bracket: args.age_bracket as '1-12' | '13-19' | '20-29' | '30-39' | '40-49' | '50+',
    address_school_work: args.address_school_work,
    education_level: args.education_level,
    highest_qualification: args.highest_qualification,
    residence: args.residence,
    times_attended: args.times_attended,
    has_nhis_card: args.has_nhis_card,
    nhis_card_expiry_date: args.nhis_card_expiry_date,
    has_health_challenge: args.has_health_challenge,
    health_challenges: healthChallenges,
    parent_name: args.parent_name,
    parent_contact: args.parent_contact,
    role,
    is_new_registrant: isNewRegistrant,
    status: 'registered',
    payment_status: 'pending',
    payment_amount: 30.0,
    follow_up_status: 'pending',
    check_in_code: checkInCode,
    qr_code: checkInCode,
    updated_at: now,
  })

  const qrPayload = JSON.stringify({
    id: regId,
    name: fullName,
    role,
    year: year.year,
    code: checkInCode,
    check_in_code: checkInCode,
  })
  await ctx.db.patch('camp_registrations', regId, {
    qr_code: qrPayload,
    check_in_code: checkInCode,
    updated_at: Date.now(),
  })

  return await ctx.db.get('camp_registrations', regId)
}
