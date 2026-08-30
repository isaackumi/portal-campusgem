import type { Id } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'
import { isValidGhanaPhone, normalizeGhanaPhone, phoneLookupVariants } from './phone'

type RegistrationDbCtx = Pick<MutationCtx, 'db'> | Pick<QueryCtx, 'db'>

export function normalizeCampRegistrationEmail(email?: string | null): string {
  return (email ?? '').trim().toLowerCase()
}

export async function findRegistrationByPhoneForYear(
  ctx: RegistrationDbCtx,
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

export async function findRegistrationByEmailForYear(
  ctx: RegistrationDbCtx,
  campYearId: string,
  email: string
) {
  const emailNorm = normalizeCampRegistrationEmail(email)
  if (!emailNorm) return null

  const existing = await ctx.db
    .query('camp_registrations')
    .withIndex('by_camp_year_email', (q) => q.eq('camp_year_id', campYearId).eq('email', emailNorm))
    .first()
  if (existing) return existing

  // Legacy rows may have mixed-case email stored before normalization.
  const yearRows = await ctx.db
    .query('camp_registrations')
    .withIndex('by_camp_year', (q) => q.eq('camp_year_id', campYearId))
    .collect()
  return (
    yearRows.find(
      (row) => normalizeCampRegistrationEmail(String(row.email ?? '')) === emailNorm
    ) ?? null
  )
}

export async function assertCampRegistrationSlotAvailable(
  ctx: MutationCtx,
  campYearId: string,
  phone: string,
  email?: string | null
) {
  const normalizedPhone = normalizeGhanaPhone(phone)
  if (!normalizedPhone || !isValidGhanaPhone(normalizedPhone)) {
    throw new Error('A valid Ghana mobile number is required to register.')
  }

  const existingPhone = await findRegistrationByPhoneForYear(ctx, campYearId, normalizedPhone)
  if (existingPhone) {
    throw new Error('This phone number is already registered for this Camp Meeting.')
  }

  const emailNorm = normalizeCampRegistrationEmail(email)
  if (emailNorm) {
    const existingEmail = await findRegistrationByEmailForYear(ctx, campYearId, emailNorm)
    if (existingEmail) {
      throw new Error('This email is already registered for this Camp Meeting.')
    }
  }

  return normalizedPhone
}

/** Query-context duplicate check for public registration flows. */
export async function campRegistrationDuplicateStatus(
  ctx: RegistrationDbCtx,
  campYearId: string,
  phone: string,
  email?: string | null
): Promise<{ already_registered: boolean; reason?: 'phone' | 'email' }> {
  const normalizedPhone = normalizeGhanaPhone(phone)
  if (!normalizedPhone || !isValidGhanaPhone(normalizedPhone)) {
    return { already_registered: false }
  }

  const existingPhone = await findRegistrationByPhoneForYear(ctx, campYearId, normalizedPhone)
  if (existingPhone) {
    return { already_registered: true, reason: 'phone' }
  }

  const emailNorm = normalizeCampRegistrationEmail(email)
  if (emailNorm) {
    const existingEmail = await findRegistrationByEmailForYear(ctx, campYearId, emailNorm)
    if (existingEmail) {
      return { already_registered: true, reason: 'email' }
    }
  }

  return { already_registered: false }
}

export function campYearIdFromUnknown(campYearId: Id<'camp_years'> | string): string {
  return String(campYearId)
}
