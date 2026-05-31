import { v } from 'convex/values'
import { query, mutation, type MutationCtx } from './_generated/server'
import { requireAuth } from './lib/access'
import { assertServerSecret } from './lib/serverSecret'
import { extractBirthdayParts, memberDobIsoFromCampRegistration } from './lib/birthday'
import { insertCampRegistrationPublic } from './lib/campRegistrationInsert'
import {
  isValidGhanaPhone,
  normalizeGhanaPhone,
  phoneLookupVariants,
  sanitizePhoneInput,
} from './lib/phone'

const directoryRoleValue = v.union(
  v.literal('admin'),
  v.literal('pastor'),
  v.literal('elder'),
  v.literal('finance_officer'),
  v.literal('member'),
  v.literal('visitor')
)

async function findUserDocByPhone(ctx: MutationCtx, phoneRaw: string) {
  for (const candidate of phoneLookupVariants(phoneRaw)) {
    const byPhone = await ctx.db
      .query('users')
      .withIndex('by_phone', (q) => q.eq('phone', candidate))
      .first()
    if (byPhone) return byPhone
  }
  const target = normalizeGhanaPhone(phoneRaw)
  if (!target) return null
  for (const user of await ctx.db.query('users').collect()) {
    if (user.phone && normalizeGhanaPhone(String(user.phone)) === target) return user
  }
  return null
}

/** Admin: camp years */
export const listCampYears = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    await requireAuth(ctx)
    return await ctx.db.query('camp_years').order('desc').collect()
  },
})

export const activeCampYear = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    await requireAuth(ctx)
    return await ctx.db
      .query('camp_years')
      .withIndex('by_active', (q) => q.eq('is_active', true))
      .first()
  },
})

/** Public registration — tighten before production (rate limits, captcha). */
export const getRegistrationYearPublic = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const years = await ctx.db.query('camp_years').collect()
    const open = years.find((y: { registration_open?: boolean }) => y.registration_open)
    return open ?? null
  },
})

/** Public read of a single year (for deep links / server actions). */
export const getCampYearByIdPublic = query({
  args: { id: v.id('camp_years') },
  returns: v.any(),
  handler: async (ctx, { id }) => {
    return await ctx.db.get('camp_years', id)
  },
})

/** Public read by calendar year (e.g. 2026). */
export const getCampYearByYearPublic = query({
  args: { year: v.number() },
  returns: v.any(),
  handler: async (ctx, { year }) => {
    return await ctx.db
      .query('camp_years')
      .withIndex('by_year', (q) => q.eq('year', year))
      .first()
  },
})

/** Public lookup for returning campers (prefill current-year registration). */
export const lookupCamperByPhonePublic = query({
  args: {
    phone: v.string(),
    camp_year_id: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, { phone, camp_year_id }) => {
    const seen = new Set<string>()
    const registrations: Array<Record<string, unknown> & { _id: string; _creationTime: number }> = []

    for (const variant of phoneLookupVariants(phone)) {
      const rows = await ctx.db
        .query('camp_registrations')
        .withIndex('by_phone', (q) => q.eq('phone', variant))
        .collect()
      for (const row of rows) {
        const id = String(row._id)
        if (seen.has(id)) continue
        seen.add(id)
        registrations.push(row as Record<string, unknown> & { _id: string; _creationTime: number })
      }
    }

    registrations.sort((a, b) => b._creationTime - a._creationTime)
    const profile = registrations[0] ?? null
    const currentYearRegistration =
      camp_year_id != null
        ? registrations.find((row) => String(row.camp_year_id) === camp_year_id) ?? null
        : null

    return {
      found: profile != null,
      previous_registrations: registrations.length,
      profile,
      current_year_registration: currentYearRegistration,
      already_registered_this_year: currentYearRegistration != null,
    }
  },
})

/**
 * Server-only: Next.js server actions call with CAMP_CONVEX_SERVER_SECRET
 * (set the same value locally and via `npx convex env set CAMP_CONVEX_SERVER_SECRET ...`).
 */
export const listRegistrationsWithSecret = query({
  args: { camp_year_id: v.string(), secret: v.string() },
  returns: v.array(v.any()),
  handler: async (ctx, { camp_year_id, secret }) => {
    assertServerSecret(secret)
    return await ctx.db
      .query('camp_registrations')
      .withIndex('by_camp_year', (q) => q.eq('camp_year_id', camp_year_id))
      .order('desc')
      .collect()
  },
})

/**
 * Public self-serve registration (no auth). Matches lib/actions/camp registerCamper rules.
 */
export const registerCamperPublic = mutation({
  args: {
    camp_year_id: v.id('camp_years'),
    first_name: v.string(),
    last_name: v.string(),
    full_name: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.string(),
    facebook_username: v.optional(v.string()),
    sex: v.union(v.literal('Male'), v.literal('Female')),
    date_of_birth: v.optional(v.string()),
    birth_month: v.optional(v.number()),
    birth_day: v.optional(v.number()),
    age_bracket: v.string(),
    address_school_work: v.string(),
    education_level: v.string(),
    highest_qualification: v.string(),
    residence: v.string(),
    times_attended: v.number(),
    has_nhis_card: v.boolean(),
    nhis_card_expiry_date: v.optional(v.string()),
    has_health_challenge: v.boolean(),
    health_challenges: v.optional(v.array(v.string())),
    other_health_challenge: v.optional(v.string()),
    parent_name: v.string(),
    parent_contact: v.string(),
    role: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await insertCampRegistrationPublic(ctx, args)
  },
})

export const listRegistrations = query({
  args: { camp_year_id: v.string() },
  returns: v.array(v.any()),
  handler: async (ctx, { camp_year_id }) => {
    await requireAuth(ctx)
    return await ctx.db
      .query('camp_registrations')
      .withIndex('by_camp_year', (q) => q.eq('camp_year_id', camp_year_id))
      .collect()
  },
})

export const getRegistration = query({
  args: { id: v.id('camp_registrations') },
  returns: v.any(),
  handler: async (ctx, { id }) => {
    await requireAuth(ctx)
    return await ctx.db.get('camp_registrations', id)
  },
})

export const getRegistrationByQr = query({
  args: { qr_code: v.string() },
  returns: v.any(),
  handler: async (ctx, { qr_code }) => {
    await requireAuth(ctx)
    return await ctx.db
      .query('camp_registrations')
      .withIndex('by_qr_code', (q) => q.eq('qr_code', qr_code))
      .first()
  },
})

export const updateRegistration = mutation({
  args: {
    id: v.id('camp_registrations'),
    patch: v.any(),
  },
  returns: v.id('camp_registrations'),
  handler: async (ctx, { id, patch }) => {
    await requireAuth(ctx)
    await ctx.db.patch('camp_registrations', id, { ...patch, updated_at: Date.now() })
    return id
  },
})

export const addInteraction = mutation({
  args: {
    registration_id: v.string(),
    performed_by: v.string(),
    interaction_type: v.union(
      v.literal('call'),
      v.literal('note'),
      v.literal('status_change'),
      v.literal('sms'),
      v.literal('email')
    ),
    notes: v.optional(v.string()),
  },
  returns: v.id('camp_interactions'),
  handler: async (ctx, args) => {
    await requireAuth(ctx)
    const now = Date.now()
    return await ctx.db.insert('camp_interactions', {
      ...args,
      updated_at: now,
    })
  },
})

export const listInteractions = query({
  args: { registration_id: v.string() },
  returns: v.array(v.any()),
  handler: async (ctx, { registration_id }) => {
    await requireAuth(ctx)
    return await ctx.db
      .query('camp_interactions')
      .withIndex('by_registration', (q) => q.eq('registration_id', registration_id))
      .order('desc')
      .collect()
  },
})

// --- Server-secret admin API (Next.js server actions + CAMP_CONVEX_SERVER_SECRET) ---

export const getAllCampYearsWithSecret = query({
  args: { secret: v.string() },
  returns: v.array(v.any()),
  handler: async (ctx, { secret }) => {
    assertServerSecret(secret)
    return await ctx.db.query('camp_years').order('desc').collect()
  },
})

export const createCampYearWithSecret = mutation({
  args: {
    secret: v.string(),
    year: v.number(),
    theme: v.string(),
    start_date: v.string(),
    end_date: v.string(),
    is_active: v.boolean(),
    registration_open: v.boolean(),
    flyer_image_url: v.optional(v.union(v.string(), v.null())),
    venue: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    assertServerSecret(args.secret)
    const now = Date.now()
    const id = await ctx.db.insert('camp_years', {
      year: args.year,
      theme: args.theme,
      start_date: args.start_date,
      end_date: args.end_date,
      is_active: args.is_active,
      registration_open: args.registration_open,
      flyer_image_url: args.flyer_image_url,
      venue: args.venue,
      updated_at: now,
    })

    if (args.is_active) {
      for (const y of await ctx.db.query('camp_years').collect()) {
        if (String(y._id) !== String(id)) {
          await ctx.db.patch(y._id, { is_active: false, updated_at: now })
        }
      }
    }

    return await ctx.db.get('camp_years', id)
  },
})

export const updateCampYearWithSecret = mutation({
  args: {
    secret: v.string(),
    yearId: v.id('camp_years'),
    theme: v.string(),
    start_date: v.string(),
    end_date: v.string(),
    is_active: v.boolean(),
    registration_open: v.boolean(),
    flyer_image_url: v.optional(v.union(v.string(), v.null())),
    venue: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    assertServerSecret(args.secret)
    const now = Date.now()
    await ctx.db.patch(args.yearId, {
      theme: args.theme,
      start_date: args.start_date,
      end_date: args.end_date,
      is_active: args.is_active,
      registration_open: args.registration_open,
      flyer_image_url: args.flyer_image_url,
      venue: args.venue,
      updated_at: now,
    })

    if (args.is_active) {
      for (const y of await ctx.db.query('camp_years').collect()) {
        if (String(y._id) !== String(args.yearId)) {
          await ctx.db.patch(y._id, { is_active: false, updated_at: now })
        }
      }
    }

    return await ctx.db.get('camp_years', args.yearId)
  },
})

export const toggleCampYearRegistrationWithSecret = mutation({
  args: {
    secret: v.string(),
    yearId: v.id('camp_years'),
    current_registration_open: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, { secret, yearId, current_registration_open }) => {
    assertServerSecret(secret)
    await ctx.db.patch(yearId, {
      registration_open: !current_registration_open,
      updated_at: Date.now(),
    })
    return null
  },
})

export const setActiveCampYearWithSecret = mutation({
  args: { secret: v.string(), activeYearId: v.id('camp_years') },
  returns: v.null(),
  handler: async (ctx, { secret, activeYearId }) => {
    assertServerSecret(secret)
    const all = await ctx.db.query('camp_years').collect()
    const now = Date.now()
    for (const y of all) {
      await ctx.db.patch(y._id, {
        is_active: y._id === activeYearId,
        updated_at: now,
      })
    }
    return null
  },
})

export const deactivateCampYearWithSecret = mutation({
  args: { secret: v.string(), yearId: v.id('camp_years') },
  returns: v.any(),
  handler: async (ctx, { secret, yearId }) => {
    assertServerSecret(secret)
    const year = await ctx.db.get('camp_years', yearId)
    if (!year) throw new Error('Camp year not found.')
    await ctx.db.patch(yearId, { is_active: false, updated_at: Date.now() })
    return await ctx.db.get('camp_years', yearId)
  },
})

export const clearActiveCampYearWithSecret = mutation({
  args: { secret: v.string() },
  returns: v.null(),
  handler: async (ctx, { secret }) => {
    assertServerSecret(secret)
    const now = Date.now()
    const all = await ctx.db.query('camp_years').collect()
    for (const y of all) {
      if (y.is_active) {
        await ctx.db.patch(y._id, { is_active: false, updated_at: now })
      }
    }
    return null
  },
})

export const getActiveCampYearWithSecret = query({
  args: { secret: v.string() },
  returns: v.any(),
  handler: async (ctx, { secret }) => {
    assertServerSecret(secret)
    return await ctx.db
      .query('camp_years')
      .withIndex('by_active', (q) => q.eq('is_active', true))
      .first()
  },
})

export const bulkPatchCampRegistrationsWithSecret = mutation({
  args: {
    secret: v.string(),
    registration_ids: v.array(v.id('camp_registrations')),
    assigned_to: v.optional(v.string()),
    follow_up_status: v.optional(
      v.union(v.literal('pending'), v.literal('in_progress'), v.literal('completed'))
    ),
  },
  returns: v.object({ updated: v.number() }),
  handler: async (ctx, { secret, registration_ids, assigned_to, follow_up_status }) => {
    assertServerSecret(secret)
    const now = Date.now()
    let updated = 0
    for (const id of registration_ids) {
      const patch: Record<string, unknown> = { updated_at: now }
      if (assigned_to !== undefined) patch.assigned_to = assigned_to
      if (follow_up_status !== undefined) patch.follow_up_status = follow_up_status
      await ctx.db.patch(id, patch)
      updated += 1
    }
    return { updated }
  },
})

export const getRegistrationWithSecret = query({
  args: { secret: v.string(), id: v.id('camp_registrations') },
  returns: v.any(),
  handler: async (ctx, { secret, id }) => {
    assertServerSecret(secret)
    return await ctx.db.get('camp_registrations', id)
  },
})

export const patchCampRegistrationWithSecret = mutation({
  args: { secret: v.string(), id: v.id('camp_registrations'), patch: v.any() },
  returns: v.any(),
  handler: async (ctx, { secret, id, patch }) => {
    assertServerSecret(secret)
    await ctx.db.patch(id, { ...patch, updated_at: Date.now() })
    return await ctx.db.get('camp_registrations', id)
  },
})

/**
 * Create or link a Convex user + member from a camp registration so they can sign in by phone.
 * Requires month/day (or full ISO date on the registration); year defaults to 2000 on the stored DOB when omitted.
 */
export const promoteCampRegistrantWithSecret = mutation({
  args: {
    secret: v.string(),
    registration_id: v.id('camp_registrations'),
    role: directoryRoleValue,
    birth_month: v.optional(v.number()),
    birth_day: v.optional(v.number()),
    birth_year: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    assertServerSecret(args.secret)
    const reg = await ctx.db.get(args.registration_id)
    if (!reg) throw new Error('Registration not found')

    const phone = normalizeGhanaPhone(String(reg.phone ?? ''))
    if (!phone) throw new Error('Registration has no valid phone number for login.')

    const dob = memberDobIsoFromCampRegistration(reg, {
      birth_month: args.birth_month,
      birth_day: args.birth_day,
      birth_year: args.birth_year,
    })
    if (!dob) {
      throw new Error(
        'Add month and day of birth on the registration (or a full YYYY-MM-DD date) before promoting to the directory.'
      )
    }

    const fullName =
      String(reg.full_name ?? '').trim() ||
      `${String(reg.first_name ?? '').trim()} ${String(reg.last_name ?? '').trim()}`.trim()
    const nameParts = fullName.split(/\s+/).filter(Boolean)
    const firstName =
      String(reg.first_name ?? '').trim() || (nameParts[0] ?? fullName)
    const lastName =
      String(reg.last_name ?? '').trim() ||
      (nameParts.length > 1 ? nameParts.slice(1).join(' ') : firstName)

    const emailRaw = String(reg.email ?? '').trim()
    const email = emailRaw && emailRaw !== ' ' ? emailRaw : undefined

    const joinYear = new Date().getFullYear()
    const digits = phone.replace(/\D/g, '').slice(-4).padStart(4, '0')
    const membershipId = `CG${digits}${joinYear}`.toUpperCase()

    const newAuthUid = (): string => {
      const c = globalThis.crypto as Crypto | undefined
      if (c?.randomUUID) return `cgms-${c.randomUUID()}`
      return `cgms-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
    }

    const gender =
      reg.sex === 'Male' ? ('male' as const) : reg.sex === 'Female' ? ('female' as const) : undefined

    let user = await findUserDocByPhone(ctx, String(reg.phone ?? ''))
    const now = Date.now()

    if (!user) {
      const userId = await ctx.db.insert('users', {
        full_name: fullName,
        first_name: firstName,
        last_name: lastName,
        phone,
        email,
        role: args.role,
        membership_id: membershipId,
        auth_uid: newAuthUid(),
        join_year: joinYear,
        updated_at: now,
      })
      user = await ctx.db.get(userId)
      if (!user) throw new Error('Failed to create user')
      await ctx.db.insert('members', {
        user_id: String(userId),
        dob,
        gender,
        emergency_contacts: [],
        documents: [],
        status: 'active',
        updated_at: now,
      })
    } else {
      const uid = String(user._id)
      const patchUser: Record<string, unknown> = {
        full_name: fullName,
        first_name: firstName || user.first_name,
        last_name: lastName || user.last_name,
        phone,
        role: args.role,
        updated_at: now,
      }
      if (email !== undefined) patchUser.email = email
      if (!user.auth_uid) patchUser.auth_uid = newAuthUid()
      await ctx.db.patch(user._id, patchUser)
      user = await ctx.db.get(user._id)
      if (!user) throw new Error('User update failed')

      const member = await ctx.db
        .query('members')
        .withIndex('by_user_id', (q) => q.eq('user_id', uid))
        .first()
      if (!member) {
        await ctx.db.insert('members', {
          user_id: uid,
          dob,
          gender,
          emergency_contacts: [],
          documents: [],
          status: 'active',
          updated_at: now,
        })
      } else {
        const memberPatch: Record<string, unknown> = { updated_at: now, dob }
        if (gender && !member.gender) memberPatch.gender = gender
        await ctx.db.patch(member._id, memberPatch)
      }
    }

    await ctx.db.patch(args.registration_id, {
      user_id: String(user._id),
      updated_at: Date.now(),
    })

    return {
      user: await ctx.db.get(user._id),
      registration: await ctx.db.get(args.registration_id),
    }
  },
})

export const listInteractionsWithSecret = query({
  args: { secret: v.string(), registration_id: v.string() },
  returns: v.array(v.any()),
  handler: async (ctx, { secret, registration_id }) => {
    assertServerSecret(secret)
    return await ctx.db
      .query('camp_interactions')
      .withIndex('by_registration', (q) => q.eq('registration_id', registration_id))
      .order('desc')
      .collect()
  },
})

export const addCampInteractionWithSecret = mutation({
  args: {
    secret: v.string(),
    registration_id: v.string(),
    performed_by: v.string(),
    interaction_type: v.union(
      v.literal('call'),
      v.literal('note'),
      v.literal('status_change'),
      v.literal('sms'),
      v.literal('email')
    ),
    notes: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    assertServerSecret(args.secret)
    const now = Date.now()
    const iid = await ctx.db.insert('camp_interactions', {
      registration_id: args.registration_id,
      performed_by: args.performed_by,
      interaction_type: args.interaction_type,
      notes: args.notes,
      updated_at: now,
    })
    return await ctx.db.get('camp_interactions', iid)
  },
})

export const listCampActivitiesWithSecret = query({
  args: { secret: v.string(), camp_year_id: v.string() },
  returns: v.array(v.any()),
  handler: async (ctx, { secret, camp_year_id }) => {
    assertServerSecret(secret)
    return await ctx.db
      .query('camp_activities')
      .withIndex('by_camp_year', (q) => q.eq('camp_year_id', camp_year_id))
      .collect()
  },
})

export const getCampActivityWithSecret = query({
  args: { secret: v.string(), id: v.id('camp_activities') },
  returns: v.any(),
  handler: async (ctx, { secret, id }) => {
    assertServerSecret(secret)
    return await ctx.db.get('camp_activities', id)
  },
})

export const createCampActivityWithSecret = mutation({
  args: {
    secret: v.string(),
    camp_year_id: v.string(),
    activity: v.any(),
  },
  returns: v.any(),
  handler: async (ctx, { secret, camp_year_id, activity }) => {
    assertServerSecret(secret)
    const now = Date.now()
    const aid = await ctx.db.insert('camp_activities', {
      ...activity,
      camp_year_id,
      updated_at: now,
    })
    return await ctx.db.get('camp_activities', aid)
  },
})

export const updateCampActivityWithSecret = mutation({
  args: { secret: v.string(), id: v.id('camp_activities'), patch: v.any() },
  returns: v.any(),
  handler: async (ctx, { secret, id, patch }) => {
    assertServerSecret(secret)
    await ctx.db.patch(id, { ...patch, updated_at: Date.now() })
    return await ctx.db.get('camp_activities', id)
  },
})

export const deleteCampActivityWithSecret = mutation({
  args: { secret: v.string(), id: v.id('camp_activities') },
  returns: v.null(),
  handler: async (ctx, { secret, id }) => {
    assertServerSecret(secret)
    await ctx.db.delete(id)
    return null
  },
})

export const listCampCommunicationsWithSecret = query({
  args: { secret: v.string(), camp_year_id: v.string() },
  returns: v.array(v.any()),
  handler: async (ctx, { secret, camp_year_id }) => {
    assertServerSecret(secret)
    return await ctx.db
      .query('camp_communications')
      .withIndex('by_camp_year', (q) => q.eq('camp_year_id', camp_year_id))
      .order('desc')
      .collect()
  },
})

export const logCampCommunicationWithSecret = mutation({
  args: {
    secret: v.string(),
    camp_year_id: v.string(),
    communication_type: v.union(v.literal('email'), v.literal('sms')),
    sender_id: v.optional(v.string()),
    recipient_type: v.union(v.literal('individual'), v.literal('bulk')),
    recipient_registration_id: v.optional(v.string()),
    recipient_email: v.optional(v.string()),
    recipient_phone: v.optional(v.string()),
    subject: v.optional(v.string()),
    message_body: v.string(),
    filter_criteria: v.optional(v.any()),
    status: v.union(
      v.literal('pending'),
      v.literal('sent'),
      v.literal('delivered'),
      v.literal('failed'),
      v.literal('bounced')
    ),
    provider_message_id: v.optional(v.string()),
    error_message: v.optional(v.string()),
    metadata: v.optional(v.any()),
    sent_at: v.optional(v.number()),
    delivered_at: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    assertServerSecret(args.secret)
    const now = Date.now()
    const id = await ctx.db.insert('camp_communications', {
      camp_year_id: args.camp_year_id,
      communication_type: args.communication_type,
      sender_id: args.sender_id,
      recipient_type: args.recipient_type,
      recipient_registration_id: args.recipient_registration_id,
      recipient_email: args.recipient_email,
      recipient_phone: args.recipient_phone,
      subject: args.subject,
      message_body: args.message_body,
      filter_criteria: args.filter_criteria,
      status: args.status,
      provider_message_id: args.provider_message_id,
      error_message: args.error_message,
      metadata: args.metadata,
      sent_at: args.sent_at ?? now,
      delivered_at: args.delivered_at,
      updated_at: now,
    })
    return await ctx.db.get('camp_communications', id)
  },
})

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

async function loadExistingPhonesForYear(
  ctx: MutationCtx,
  campYearId: string
): Promise<Set<string>> {
  const phones = new Set<string>()
  let cursor: string | null = null

  for (;;) {
    const page = await ctx.db
      .query('camp_registrations')
      .withIndex('by_camp_year', (q) => q.eq('camp_year_id', campYearId))
      .paginate({ numItems: 250, cursor })

    for (const registration of page.page) {
      for (const variant of phoneLookupVariants(registration.phone)) {
        phones.add(variant)
      }
    }

    if (page.isDone) break
    cursor = page.continueCursor
  }

  return phones
}

function isPhoneAlreadyRegistered(phones: Set<string>, phone: string): boolean {
  for (const variant of phoneLookupVariants(phone)) {
    if (phones.has(variant)) return true
  }
  return false
}

function rememberPhone(phones: Set<string>, phone: string): void {
  for (const variant of phoneLookupVariants(phone)) {
    phones.add(variant)
  }
}

export const importCampRegistrationsWithSecret = mutation({
  args: {
    secret: v.string(),
    camp_year_id: v.id('camp_years'),
    rows: v.array(v.any()),
  },
  returns: v.object({
    successful: v.number(),
    failed: v.number(),
    skipped: v.number(),
    errors: v.array(v.object({ row: v.number(), errors: v.array(v.string()) })),
    skipped_rows: v.array(v.object({ row: v.number(), reason: v.string() })),
  }),
  handler: async (ctx, { secret, camp_year_id, rows }) => {
    assertServerSecret(secret)
    const year = await ctx.db.get('camp_years', camp_year_id)
    if (!year) {
      throw new Error('Camp year not found.')
    }

    const yearIdStr = String(camp_year_id)
    let successful = 0
    let failed = 0
    let skipped = 0
    const errors: Array<{ row: number; errors: string[] }> = []
    const skippedRows: Array<{ row: number; reason: string }> = []
    const seenPhonesThisBatch = new Set<string>()
    const existingPhones = await loadExistingPhonesForYear(ctx, yearIdStr)

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index] as Record<string, unknown>
      const sourceRow = Number(row.source_row ?? index + 1)
      const rowErrors: string[] = []
      const firstName = String(row.first_name ?? '').trim()
      const lastName = String(row.last_name ?? '').trim()
      const fullName =
        String(row.full_name ?? '').trim() ||
        `${firstName} ${lastName}`.trim() ||
        firstName ||
        lastName
      const rawPhone = sanitizePhoneInput(row.phone ?? row.parent_contact ?? '')
      const phone = rawPhone ? normalizeGhanaPhone(rawPhone) : ''
      const emailNorm = String(row.email ?? '').trim()
      const birthday =
        row.birth_month != null && row.birth_day != null
          ? { birth_month: Number(row.birth_month), birth_day: Number(row.birth_day) }
          : extractBirthdayParts(row.date_of_birth)

      if (!fullName) {
        rowErrors.push('Name is required (first_name, last_name, or full_name)')
      }
      if (!rawPhone) {
        rowErrors.push('Phone number is required')
      } else if (!isValidGhanaPhone(rawPhone)) {
        rowErrors.push('Invalid phone number format')
      }

      if (rowErrors.length > 0) {
        failed++
        errors.push({ row: sourceRow, errors: rowErrors })
        continue
      }

      if (seenPhonesThisBatch.has(phone)) {
        skipped++
        skippedRows.push({
          row: sourceRow,
          reason: 'Duplicate phone number in this import file',
        })
        continue
      }

      if (isPhoneAlreadyRegistered(existingPhones, phone)) {
        skipped++
        skippedRows.push({
          row: sourceRow,
          reason: 'Phone number already registered for this camp year',
        })
        continue
      }

      if (emailNorm.length > 0) {
        const existingEmail = await ctx.db
          .query('camp_registrations')
          .withIndex('by_camp_year_email', (q) =>
            q.eq('camp_year_id', yearIdStr).eq('email', emailNorm)
          )
          .first()
        if (existingEmail) {
          skipped++
          skippedRows.push({
            row: sourceRow,
            reason: 'Email already registered for this camp year',
          })
          continue
        }
      }

      seenPhonesThisBatch.add(phone)
      rememberPhone(existingPhones, phone)

      const timesAttended = Number(row.times_attended ?? 0)
      const tempId = `CAMP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`
      const now = Date.now()
      const regId = await ctx.db.insert('camp_registrations', {
        camp_year_id: yearIdStr,
        full_name: fullName,
        first_name: firstName || undefined,
        last_name: lastName || undefined,
        email: emailNorm.length > 0 ? emailNorm : ' ',
        phone,
        facebook_username:
          row.facebook_username != null ? String(row.facebook_username) : undefined,
        sex: (row.sex as 'Male' | 'Female' | undefined) ?? 'Male',
        date_of_birth: row.date_of_birth != null ? String(row.date_of_birth) : undefined,
        birth_month: birthday.birth_month,
        birth_day: birthday.birth_day,
        age_bracket:
          (row.age_bracket as
            | '1-12'
            | '13-19'
            | '20-29'
            | '30-39'
            | '40-49'
            | '50+'
            | undefined) ?? '13-19',
        address_school_work:
          row.address_school_work != null ? String(row.address_school_work) : ' ',
        education_level: row.education_level != null ? String(row.education_level) : 'JHS 1',
        highest_qualification:
          row.highest_qualification != null ? String(row.highest_qualification) : 'JHS',
        residence: row.residence != null ? String(row.residence) : ' ',
        times_attended: Number.isFinite(timesAttended) ? timesAttended : 0,
        has_nhis_card: row.has_nhis_card != null ? Boolean(row.has_nhis_card) : false,
        nhis_card_expiry_date:
          row.nhis_card_expiry_date != null ? String(row.nhis_card_expiry_date) : undefined,
        has_health_challenge:
          row.has_health_challenge != null ? Boolean(row.has_health_challenge) : false,
        health_challenges: Array.isArray(row.health_challenges)
          ? (row.health_challenges as string[])
          : undefined,
        parent_name: row.parent_name != null ? String(row.parent_name) : ' ',
        parent_contact: row.parent_contact != null ? String(row.parent_contact) : ' ',
        role: row.role != null ? String(row.role) : 'Participant',
        is_new_registrant: timesAttended === 0,
        status: 'registered',
        payment_status: 'pending',
        payment_amount: 30.0,
        follow_up_status: 'pending',
        qr_code: tempId,
        updated_at: now,
      })

      const qrPayload = JSON.stringify({
        id: regId,
        name: fullName,
        role: row.role != null ? String(row.role) : 'Participant',
        year: year.year,
        code: tempId,
      })
      await ctx.db.patch('camp_registrations', regId, {
        qr_code: qrPayload,
        updated_at: Date.now(),
      })
      successful++
    }

    return { successful, failed, skipped, errors, skipped_rows: skippedRows }
  },
})

export const listCamperDirectoryWithSecret = query({
  args: { secret: v.string() },
  returns: v.array(v.any()),
  handler: async (ctx, { secret }) => {
    assertServerSecret(secret)

    const campYears = await ctx.db.query('camp_years').collect()
    const yearById = new Map(campYears.map((year) => [String(year._id), year.year]))

    type YearChip = {
      year_id: string
      year: number
      status: string
      registration_id: string
    }

    type Bucket = {
      phone_key: string
      full_name: string
      first_name?: string
      last_name?: string
      email?: string
      phone: string
      years: YearChip[]
      registration_count: number
      user_id?: string
      user_role?: string
    }

    const buckets = new Map<string, Bucket>()
    let cursor: string | null = null

    for (;;) {
      const page = await ctx.db.query('camp_registrations').paginate({ numItems: 500, cursor })
      for (const registration of page.page) {
        const normalized = normalizeGhanaPhone(registration.phone)
        const phoneKey = normalized || `missing:${String(registration._id)}`
        const existing = buckets.get(phoneKey)
        const yearId = String(registration.camp_year_id)
        const yearChip: YearChip = {
          year_id: yearId,
          year: yearById.get(yearId) ?? 0,
          status: registration.status,
          registration_id: String(registration._id),
        }

        if (!existing) {
          buckets.set(phoneKey, {
            phone_key: phoneKey,
            full_name: registration.full_name,
            first_name: registration.first_name,
            last_name: registration.last_name,
            email: registration.email,
            phone: registration.phone,
            years: [yearChip],
            registration_count: 1,
          })
          continue
        }

        existing.registration_count += 1
        if (!existing.years.some((item) => item.year_id === yearId)) {
          existing.years.push(yearChip)
        }
        existing.full_name = registration.full_name || existing.full_name
        existing.first_name = registration.first_name ?? existing.first_name
        existing.last_name = registration.last_name ?? existing.last_name
        existing.email = registration.email || existing.email
        existing.phone = registration.phone || existing.phone
      }

      if (page.isDone) break
      cursor = page.continueCursor
    }

    const users = await ctx.db.query('users').collect()
    const userByPhone = new Map<string, (typeof users)[number]>()
    for (const user of users) {
      if (!user.phone) continue
      userByPhone.set(normalizeGhanaPhone(user.phone), user)
    }

    const members = await ctx.db.query('members').collect()
    const memberByUserId = new Map(members.map((m) => [m.user_id, m]))

    return Array.from(buckets.values())
      .map((bucket) => {
        const user = userByPhone.get(bucket.phone_key)
        const member = user ? memberByUserId.get(String(user._id)) : undefined
        return {
          ...bucket,
          years: bucket.years.sort((a, b) => b.year - a.year),
          user_id: user ? String(user._id) : undefined,
          user_role: user?.role,
          member_id: member ? String(member._id) : undefined,
          rlc_roles: member?.rlc_roles,
          rlc_congregation: member?.congregation,
        }
      })
      .sort((a, b) => a.full_name.localeCompare(b.full_name))
  },
})
