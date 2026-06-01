import 'server-only'

import { getConvexHttpClient } from '@/lib/convex/http-client'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import type {
  CampCommunication,
  CampInteraction,
  CampRegistration,
  CampRegistrationForm,
  CampYear,
} from '@/lib/types'

/** Maps a Convex `camp_years` document to `CampYear` (public registration query). */
export function convexCampYearDocToCampYear(doc: Record<string, unknown> | null | undefined): CampYear | null {
  if (!doc || typeof doc !== 'object') return null
  const id = String(doc._id ?? '')
  if (!id) return null
  const ct = doc._creationTime as number | undefined
  const updated = doc.updated_at as number | undefined
  const iso = (t?: number) => (t != null ? new Date(t).toISOString() : '')
  return {
    id,
    year: Number(doc.year),
    theme: String(doc.theme ?? ''),
    start_date: String(doc.start_date ?? ''),
    end_date: String(doc.end_date ?? ''),
    is_active: Boolean(doc.is_active),
    registration_open: Boolean(doc.registration_open),
    flyer_image_url: doc.flyer_image_url != null ? (doc.flyer_image_url as string | null) : undefined,
    venue: doc.venue != null ? String(doc.venue) : undefined,
    created_at: iso(ct) || new Date().toISOString(),
    updated_at: iso(updated) || iso(ct) || new Date().toISOString(),
  }
}

/** Reads open-registration camp year from Convex (HTTP). */
export async function lookupCamperByPhoneFromConvex(
  phone: string,
  campYearId?: string
): Promise<{
  found: boolean
  already_registered_this_year: boolean
  previous_registrations: number
  profile: CampRegistration | null
  current_year_registration: CampRegistration | null
}> {
  let client
  try {
    client = getConvexHttpClient()
  } catch {
    return {
      found: false,
      already_registered_this_year: false,
      previous_registrations: 0,
      profile: null,
      current_year_registration: null,
    }
  }
  const result = (await client.query(api.camp.lookupCamperByPhonePublic, {
    phone,
    camp_year_id: campYearId,
  })) as {
    found: boolean
    already_registered_this_year: boolean
    previous_registrations: number
    profile: Record<string, unknown> | null
    current_year_registration: Record<string, unknown> | null
  }
  return {
    found: result.found,
    already_registered_this_year: result.already_registered_this_year,
    previous_registrations: result.previous_registrations,
    profile: convexRegistrationDocToCampRegistration(result.profile),
    current_year_registration: convexRegistrationDocToCampRegistration(result.current_year_registration),
  }
}

export async function fetchRegistrationYearFromConvex(): Promise<CampYear | null> {
  let client
  try {
    client = getConvexHttpClient()
  } catch {
    return null
  }
  const doc = (await client.query(api.camp.getRegistrationYearPublic, {})) as Record<
    string,
    unknown
  > | null
  return convexCampYearDocToCampYear(doc)
}

export async function fetchActiveCampYearFromConvex(): Promise<CampYear | null> {
  const client = getConvexHttpClient()
  const doc = (await client.query(api.camp.getActiveCampYearWithSecret, {
    secret: requireCampAdminSecret(),
  })) as Record<string, unknown> | null
  return convexCampYearDocToCampYear(doc)
}

/** Reads any camp year by id (public Convex query). */
export async function fetchCampYearByIdFromConvex(yearId: string): Promise<CampYear | null> {
  let client
  try {
    client = getConvexHttpClient()
  } catch {
    return null
  }
  const doc = (await client.query(api.camp.getCampYearByIdPublic, {
    id: yearId as Id<'camp_years'>,
  })) as Record<string, unknown> | null
  return convexCampYearDocToCampYear(doc)
}

/** Reads camp year by calendar year (public Convex query). */
export async function fetchCampYearByYearFromConvex(year: number): Promise<CampYear | null> {
  let client
  try {
    client = getConvexHttpClient()
  } catch {
    return null
  }
  const doc = (await client.query(api.camp.getCampYearByYearPublic, { year })) as Record<
    string,
    unknown
  > | null
  return convexCampYearDocToCampYear(doc)
}

/** Admin/server reads — requires matching `CAMP_CONVEX_SERVER_SECRET` in Convex env. */
export async function fetchRegistrationsFromConvex(campYearId: string): Promise<CampRegistration[]> {
  const secret = process.env.CAMP_CONVEX_SERVER_SECRET
  if (!secret) {
    throw new Error('CAMP_CONVEX_SERVER_SECRET must be set for Convex registration listing.')
  }
  const client = getConvexHttpClient()
  const docs = (await client.query(api.camp.listRegistrationsWithSecret, {
    camp_year_id: campYearId,
    secret,
  })) as Record<string, unknown>[]
  return docs
    .map((d) => convexRegistrationDocToCampRegistration(d))
    .filter((r): r is CampRegistration => r != null)
}

/** Maps Convex `camp_registrations` doc → app type. */
export function convexRegistrationDocToCampRegistration(
  doc: Record<string, unknown> | null | undefined
): CampRegistration | null {
  if (!doc || typeof doc !== 'object') return null
  const id = String(doc._id ?? '')
  if (!id) return null
  const ct = doc._creationTime as number | undefined
  const ut = doc.updated_at as number | undefined
  const iso = (t?: number) => (t != null ? new Date(t).toISOString() : '')
  return {
    id,
    camp_year_id: String(doc.camp_year_id ?? ''),
    user_id: doc.user_id != null ? String(doc.user_id) : undefined,
    full_name: String(doc.full_name ?? ''),
    first_name: doc.first_name != null ? String(doc.first_name) : undefined,
    last_name: doc.last_name != null ? String(doc.last_name) : undefined,
    email: String(doc.email ?? '').trim(),
    phone: String(doc.phone ?? ''),
    facebook_username: doc.facebook_username != null ? String(doc.facebook_username) : undefined,
    sex: doc.sex as CampRegistration['sex'],
    date_of_birth: doc.date_of_birth != null ? String(doc.date_of_birth) : undefined,
    birth_month: doc.birth_month != null ? Number(doc.birth_month) : undefined,
    birth_day: doc.birth_day != null ? Number(doc.birth_day) : undefined,
    age_bracket: doc.age_bracket as CampRegistration['age_bracket'],
    address_school_work:
      doc.address_school_work != null ? String(doc.address_school_work) : undefined,
    education_level: doc.education_level as CampRegistration['education_level'],
    highest_qualification: doc.highest_qualification as CampRegistration['highest_qualification'],
    residence: doc.residence != null ? String(doc.residence) : undefined,
    times_attended: doc.times_attended != null ? Number(doc.times_attended) : undefined,
    has_nhis_card: doc.has_nhis_card != null ? Boolean(doc.has_nhis_card) : undefined,
    nhis_card_expiry_date:
      doc.nhis_card_expiry_date != null ? String(doc.nhis_card_expiry_date) : undefined,
    has_health_challenge:
      doc.has_health_challenge != null ? Boolean(doc.has_health_challenge) : undefined,
    health_challenges: Array.isArray(doc.health_challenges)
      ? (doc.health_challenges as string[])
      : undefined,
    parent_name: doc.parent_name != null ? String(doc.parent_name) : undefined,
    parent_contact: doc.parent_contact != null ? String(doc.parent_contact) : undefined,
    payment_status: doc.payment_status as CampRegistration['payment_status'],
    payment_reference: doc.payment_reference != null ? String(doc.payment_reference) : undefined,
    payment_amount: doc.payment_amount != null ? Number(doc.payment_amount) : undefined,
    payment_date: doc.payment_date != null ? String(doc.payment_date) : undefined,
    role: String(doc.role ?? 'Participant'),
    is_new_registrant: Boolean(doc.is_new_registrant),
    status: (doc.status as CampRegistration['status']) ?? 'registered',
    assigned_to: doc.assigned_to != null ? String(doc.assigned_to) : undefined,
    follow_up_status: doc.follow_up_status as CampRegistration['follow_up_status'],
    import_warnings: Array.isArray(doc.import_warnings)
      ? (doc.import_warnings as string[])
      : undefined,
    check_in_code: doc.check_in_code != null ? String(doc.check_in_code) : undefined,
    qr_code: String(doc.qr_code ?? ''),
    created_at: iso(ct) || new Date().toISOString(),
    updated_at: iso(ut) || iso(ct) || new Date().toISOString(),
  }
}

export async function registerCamperViaConvex(formData: CampRegistrationForm): Promise<CampRegistration> {
  const client = getConvexHttpClient()
  const doc = (await client.mutation(api.camp.registerCamperPublic, {
    camp_year_id: formData.camp_year_id as Id<'camp_years'>,
    first_name: formData.first_name,
    last_name: formData.last_name,
    full_name: formData.full_name,
    email: formData.email,
    phone: formData.phone,
    facebook_username: formData.facebook_username,
    sex: formData.sex,
    date_of_birth: formData.date_of_birth,
    birth_month: formData.birth_month,
    birth_day: formData.birth_day,
    age_bracket: formData.age_bracket,
    address_school_work: formData.address_school_work,
    education_level: formData.education_level,
    highest_qualification: formData.highest_qualification,
    residence: formData.residence,
    times_attended: formData.times_attended,
    has_nhis_card: formData.has_nhis_card,
    nhis_card_expiry_date: formData.nhis_card_expiry_date,
    has_health_challenge: formData.has_health_challenge,
    health_challenges: formData.health_challenges,
    other_health_challenge: formData.other_health_challenge,
    parent_name: formData.parent_name,
    parent_contact: formData.parent_contact,
    role: formData.role,
  })) as Record<string, unknown> | null

  const mapped = convexRegistrationDocToCampRegistration(doc)
  if (!mapped) {
    throw new Error('Registration succeeded but response could not be read.')
  }
  return mapped
}

export function requireCampAdminSecret(): string {
  const s = process.env.CAMP_CONVEX_SERVER_SECRET
  if (!s) {
    throw new Error(
      'CAMP_CONVEX_SERVER_SECRET must be set for Convex camp admin operations (same value in Convex dashboard).'
    )
  }
  return s
}

export async function fetchAllCampYearsFromConvex(): Promise<CampYear[]> {
  const client = getConvexHttpClient()
  const secret = requireCampAdminSecret()
  const docs = (await client.query(api.camp.getAllCampYearsWithSecret, { secret })) as Record<
    string,
    unknown
  >[]
  return docs
    .map((d) => convexCampYearDocToCampYear(d))
    .filter((y): y is CampYear => y != null)
    .sort((a, b) => b.year - a.year)
}

export async function createCampYearInConvex(args: {
  year: number
  theme: string
  start_date: string
  end_date: string
  is_active: boolean
  registration_open: boolean
  flyer_image_url?: string | null
  venue?: string
}): Promise<CampYear> {
  const client = getConvexHttpClient()
  const doc = (await client.mutation(api.camp.createCampYearWithSecret, {
    secret: requireCampAdminSecret(),
    ...args,
  })) as Record<string, unknown>
  const y = convexCampYearDocToCampYear(doc)
  if (!y) throw new Error('Failed to create camp year')
  return y
}

export async function updateCampYearInConvex(
  yearId: string,
  args: {
    theme: string
    start_date: string
    end_date: string
    is_active: boolean
    registration_open: boolean
    flyer_image_url?: string | null
    venue?: string
  }
): Promise<CampYear> {
  const client = getConvexHttpClient()
  const doc = (await client.mutation(api.camp.updateCampYearWithSecret, {
    secret: requireCampAdminSecret(),
    yearId: yearId as Id<'camp_years'>,
    ...args,
  })) as Record<string, unknown>
  const y = convexCampYearDocToCampYear(doc)
  if (!y) throw new Error('Failed to update camp year')
  return y
}

export async function toggleCampYearRegistrationInConvex(
  yearId: string,
  current_registration_open: boolean
): Promise<void> {
  const client = getConvexHttpClient()
  await client.mutation(api.camp.toggleCampYearRegistrationWithSecret, {
    secret: requireCampAdminSecret(),
    yearId: yearId as Id<'camp_years'>,
    current_registration_open,
  })
}

export async function setActiveCampYearInConvex(activeYearId: string): Promise<void> {
  const client = getConvexHttpClient()
  await client.mutation(api.camp.setActiveCampYearWithSecret, {
    secret: requireCampAdminSecret(),
    activeYearId: activeYearId as Id<'camp_years'>,
  })
}

export async function deactivateCampYearInConvex(yearId: string): Promise<CampYear> {
  const client = getConvexHttpClient()
  const doc = (await client.mutation(api.camp.deactivateCampYearWithSecret, {
    secret: requireCampAdminSecret(),
    yearId: yearId as Id<'camp_years'>,
  })) as Record<string, unknown>
  const year = convexCampYearDocToCampYear(doc)
  if (!year) throw new Error('Failed to deactivate camp year')
  return year
}

export async function clearActiveCampYearInConvex(): Promise<void> {
  const client = getConvexHttpClient()
  await client.mutation(api.camp.clearActiveCampYearWithSecret, {
    secret: requireCampAdminSecret(),
  })
}

export type DeleteCampYearResult = {
  deleted: boolean
  year: number
  counts: {
    registrations: number
    interactions: number
    activities: number
    communications: number
    forms: number
    form_fields: number
    form_responses: number
  }
}

export async function deleteCampYearInConvex(args: {
  yearId?: string
  calendarYear?: number
  confirmYear: number
}): Promise<DeleteCampYearResult> {
  const client = getConvexHttpClient()
  return (await client.mutation(api.camp.deleteCampYearWithSecret, {
    secret: requireCampAdminSecret(),
    yearId: args.yearId ? (args.yearId as Id<'camp_years'>) : undefined,
    calendarYear: args.calendarYear,
    confirmYear: args.confirmYear,
  })) as DeleteCampYearResult
}

export async function bulkPatchRegistrationsInConvex(args: {
  registration_ids: string[]
  assigned_to?: string
  follow_up_status?: 'pending' | 'in_progress' | 'completed'
}): Promise<number> {
  const client = getConvexHttpClient()
  const result = (await client.mutation(api.camp.bulkPatchCampRegistrationsWithSecret, {
    secret: requireCampAdminSecret(),
    registration_ids: args.registration_ids as Id<'camp_registrations'>[],
    assigned_to: args.assigned_to,
    follow_up_status: args.follow_up_status,
  })) as { updated: number }
  return result.updated
}

export async function fetchRegistrationFromConvex(id: string): Promise<CampRegistration | null> {
  const client = getConvexHttpClient()
  const doc = (await client.query(api.camp.getRegistrationWithSecret, {
    secret: requireCampAdminSecret(),
    id: id as Id<'camp_registrations'>,
  })) as Record<string, unknown> | null
  return convexRegistrationDocToCampRegistration(doc)
}

export async function fetchInteractionsFromConvex(registrationId: string): Promise<CampInteraction[]> {
  const client = getConvexHttpClient()
  const docs = (await client.query(api.camp.listInteractionsWithSecret, {
    secret: requireCampAdminSecret(),
    registration_id: registrationId,
  })) as Record<string, unknown>[]
  return docs
    .map((d) => convexInteractionDocToCampInteraction(d))
    .filter((i): i is CampInteraction => i != null)
}

export async function patchRegistrationInConvex(
  id: string,
  patch: Partial<CampRegistration> & Record<string, unknown>
): Promise<CampRegistration> {
  const client = getConvexHttpClient()
  const doc = (await client.mutation(api.camp.patchCampRegistrationWithSecret, {
    secret: requireCampAdminSecret(),
    id: id as Id<'camp_registrations'>,
    patch,
  })) as Record<string, unknown>
  const r = convexRegistrationDocToCampRegistration(doc)
  if (!r) throw new Error('Update failed')
  return r
}

export async function promoteCampRegistrantInConvex(args: {
  registration_id: string
  role: 'admin' | 'pastor' | 'elder' | 'finance_officer' | 'member' | 'visitor'
  birth_month?: number
  birth_day?: number
  birth_year?: number
}): Promise<{ user: Record<string, unknown> | null; registration: CampRegistration | null }> {
  const client = getConvexHttpClient()
  const result = (await client.mutation(api.camp.promoteCampRegistrantWithSecret, {
    secret: requireCampAdminSecret(),
    registration_id: args.registration_id as Id<'camp_registrations'>,
    role: args.role,
    birth_month: args.birth_month,
    birth_day: args.birth_day,
    birth_year: args.birth_year,
  })) as {
    user: Record<string, unknown> | null
    registration: Record<string, unknown> | null
  }
  return {
    user: result.user,
    registration: convexRegistrationDocToCampRegistration(result.registration),
  }
}

export function convexInteractionDocToCampInteraction(
  doc: Record<string, unknown> | null | undefined
): CampInteraction | null {
  if (!doc || typeof doc !== 'object') return null
  const ct = doc._creationTime as number | undefined
  return {
    id: String(doc._id ?? ''),
    registration_id: String(doc.registration_id ?? ''),
    performed_by: String(doc.performed_by ?? ''),
    interaction_type: doc.interaction_type as CampInteraction['interaction_type'],
    notes: doc.notes != null ? String(doc.notes) : undefined,
    created_at:
      ct != null ? new Date(ct).toISOString() : new Date().toISOString(),
  }
}

export async function addInteractionInConvex(
  interaction: Partial<CampInteraction> & { registration_id: string; performed_by: string }
): Promise<CampInteraction> {
  const client = getConvexHttpClient()
  const doc = (await client.mutation(api.camp.addCampInteractionWithSecret, {
    secret: requireCampAdminSecret(),
    registration_id: interaction.registration_id,
    performed_by: interaction.performed_by,
    interaction_type: interaction.interaction_type ?? 'note',
    notes: interaction.notes,
  })) as Record<string, unknown>
  const i = convexInteractionDocToCampInteraction(doc)
  if (!i) throw new Error('Failed to add interaction')
  return i
}

export async function fetchCampActivitiesFromConvex(campYearId: string): Promise<unknown[]> {
  const client = getConvexHttpClient()
  return (await client.query(api.camp.listCampActivitiesWithSecret, {
    secret: requireCampAdminSecret(),
    camp_year_id: campYearId,
  })) as unknown[]
}

export async function createCampActivityInConvex(
  campYearId: string,
  activity: Record<string, unknown>
): Promise<unknown> {
  const client = getConvexHttpClient()
  return await client.mutation(api.camp.createCampActivityWithSecret, {
    secret: requireCampAdminSecret(),
    camp_year_id: campYearId,
    activity,
  })
}

export async function updateCampActivityInConvex(
  id: string,
  patch: Record<string, unknown>
): Promise<unknown> {
  const client = getConvexHttpClient()
  return await client.mutation(api.camp.updateCampActivityWithSecret, {
    secret: requireCampAdminSecret(),
    id: id as Id<'camp_activities'>,
    patch,
  })
}

export async function deleteCampActivityInConvex(id: string): Promise<void> {
  const client = getConvexHttpClient()
  await client.mutation(api.camp.deleteCampActivityWithSecret, {
    secret: requireCampAdminSecret(),
    id: id as Id<'camp_activities'>,
  })
}

export function convexCommunicationDocToCampCommunication(
  doc: Record<string, unknown> | null | undefined
): CampCommunication | null {
  if (!doc || typeof doc !== 'object') return null
  const id = String(doc._id ?? '')
  if (!id) return null
  const ct = doc._creationTime as number | undefined
  const iso = (t?: number) => (t != null ? new Date(t).toISOString() : undefined)
  return {
    id,
    camp_year_id: String(doc.camp_year_id ?? ''),
    communication_type: doc.communication_type as CampCommunication['communication_type'],
    sender_id: doc.sender_id != null ? String(doc.sender_id) : undefined,
    recipient_type: doc.recipient_type as CampCommunication['recipient_type'],
    recipient_registration_id:
      doc.recipient_registration_id != null ? String(doc.recipient_registration_id) : undefined,
    recipient_email: doc.recipient_email != null ? String(doc.recipient_email) : undefined,
    recipient_phone: doc.recipient_phone != null ? String(doc.recipient_phone) : undefined,
    subject: doc.subject != null ? String(doc.subject) : undefined,
    message_body: String(doc.message_body ?? ''),
    filter_criteria: doc.filter_criteria as CampCommunication['filter_criteria'],
    status: (doc.status as CampCommunication['status']) ?? 'pending',
    provider_message_id:
      doc.provider_message_id != null ? String(doc.provider_message_id) : undefined,
    error_message: doc.error_message != null ? String(doc.error_message) : undefined,
    metadata: doc.metadata as Record<string, unknown> | undefined,
    created_at: iso(ct) ?? new Date().toISOString(),
    sent_at: iso(doc.sent_at as number | undefined),
    delivered_at: iso(doc.delivered_at as number | undefined),
  }
}

export async function fetchCampCommunicationsFromConvex(
  campYearId: string
): Promise<CampCommunication[]> {
  const client = getConvexHttpClient()
  const docs = (await client.query(api.camp.listCampCommunicationsWithSecret, {
    secret: requireCampAdminSecret(),
    camp_year_id: campYearId,
  })) as Record<string, unknown>[]
  return docs
    .map((d) => convexCommunicationDocToCampCommunication(d))
    .filter((c): c is CampCommunication => c != null)
}

export async function logCampCommunicationInConvex(
  communication: Omit<CampCommunication, 'id' | 'created_at'> & {
    sent_at?: string
    delivered_at?: string
  }
): Promise<CampCommunication> {
  const client = getConvexHttpClient()
  const doc = (await client.mutation(api.camp.logCampCommunicationWithSecret, {
    secret: requireCampAdminSecret(),
    camp_year_id: communication.camp_year_id,
    communication_type: communication.communication_type,
    sender_id: communication.sender_id,
    recipient_type: communication.recipient_type,
    recipient_registration_id: communication.recipient_registration_id,
    recipient_email: communication.recipient_email,
    recipient_phone: communication.recipient_phone,
    subject: communication.subject,
    message_body: communication.message_body,
    filter_criteria: communication.filter_criteria,
    status: communication.status,
    provider_message_id: communication.provider_message_id,
    error_message: communication.error_message,
    metadata: communication.metadata,
    sent_at: communication.sent_at ? Date.parse(communication.sent_at) : undefined,
    delivered_at: communication.delivered_at ? Date.parse(communication.delivered_at) : undefined,
  })) as Record<string, unknown>
  const mapped = convexCommunicationDocToCampCommunication(doc)
  if (!mapped) throw new Error('Failed to log communication')
  return mapped
}

export async function importCampRegistrationsInConvex(
  campYearId: string,
  rows: Partial<CampRegistrationForm>[]
): Promise<{
  successful: number
  failed: number
  skipped: number
  warned: number
  errors: Array<{ row: number; errors: string[] }>
  skipped_rows: Array<{ row: number; reason: string }>
}> {
  const client = getConvexHttpClient()
  return (await client.mutation(api.camp.importCampRegistrationsWithSecret, {
    secret: requireCampAdminSecret(),
    camp_year_id: campYearId as Id<'camp_years'>,
    rows,
  })) as {
    successful: number
    failed: number
    skipped: number
    warned: number
    errors: Array<{ row: number; errors: string[] }>
    skipped_rows: Array<{ row: number; reason: string }>
  }
}

export async function fetchCamperDirectoryFromConvex(): Promise<import('@/lib/types').CampCamperDirectoryRow[]> {
  const client = getConvexHttpClient()
  return (await client.query(api.camp.listCamperDirectoryWithSecret, {
    secret: requireCampAdminSecret(),
  })) as import('@/lib/types').CampCamperDirectoryRow[]
}
