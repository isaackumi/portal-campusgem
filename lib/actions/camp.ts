'use server'

import {
  CampRegistrationForm,
  CampYear,
  CampRegistration,
  CampInteraction,
  CampCommunication,
} from '@/lib/types'
import { isValidPhone } from '@/lib/phone'
import { revalidatePath } from 'next/cache'
import {
  getRegistrationConfirmationSmsTemplate,
  getRoomAllocationSmsTemplate,
  personalizeCampMessage,
  shouldSendRegistrationConfirmationSms,
  type CampMessageTemplateId,
  getCampMessageTemplate,
} from '@/lib/camp/sms-templates'

function requireConvexEnv(): void {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    throw new Error('NEXT_PUBLIC_CONVEX_URL is required for camp data')
  }
}

export async function getActiveCampYear(): Promise<{ data: CampYear | null; error: string | null }> {
  requireConvexEnv()
  try {
    const { fetchActiveCampYearFromConvex } = await import('@/lib/convex/camp-bridge')
    const data = await fetchActiveCampYearFromConvex()
    return { data, error: null }
  } catch (error: unknown) {
    console.error('Error fetching active camp year from Convex:', error)
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to fetch active camp year from Convex',
    }
  }
}

export async function getOpenRegistrationCampYear(): Promise<{
  data: CampYear | null
  error: string | null
}> {
  requireConvexEnv()
  try {
    const { fetchRegistrationYearFromConvex } = await import('@/lib/convex/camp-bridge')
    const data = await fetchRegistrationYearFromConvex()
    return { data, error: null }
  } catch (error: unknown) {
    console.error('Error fetching open registration camp year from Convex:', error)
    return {
      data: null,
      error:
        error instanceof Error ? error.message : 'Failed to fetch open registration camp year from Convex',
    }
  }
}

export async function getCampYearById(yearId: string): Promise<{ data: CampYear | null; error: string | null }> {
  requireConvexEnv()
  try {
    const { fetchCampYearByIdFromConvex } = await import('@/lib/convex/camp-bridge')
    const data = await fetchCampYearByIdFromConvex(yearId)
    if (!data) return { data: null, error: 'Not found' }
    return { data, error: null }
  } catch (error: unknown) {
    console.error('Error fetching camp year from Convex:', error)
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to fetch camp year',
    }
  }
}

export async function lookupCampRegistrationByPhone(
  phone: string,
  campYearId?: string
): Promise<{
  found: boolean
  already_registered_this_year: boolean
  previous_registrations: number
  profile: CampRegistration | null
  current_year_registration: CampRegistration | null
  error: string | null
}> {
  requireConvexEnv()
  try {
    const { lookupCamperByPhoneFromConvex } = await import('@/lib/convex/camp-bridge')
    const result = await lookupCamperByPhoneFromConvex(phone, campYearId)
    return { ...result, error: null }
  } catch (error: unknown) {
    return {
      found: false,
      already_registered_this_year: false,
      previous_registrations: 0,
      profile: null,
      current_year_registration: null,
      error: error instanceof Error ? error.message : 'Failed to look up registration',
    }
  }
}

export async function getCampYearByYear(year: number): Promise<{ data: CampYear | null; error: string | null }> {
  requireConvexEnv()
  try {
    const { fetchCampYearByYearFromConvex } = await import('@/lib/convex/camp-bridge')
    const data = await fetchCampYearByYearFromConvex(year)
    if (!data) return { data: null, error: 'Not found' }
    return { data, error: null }
  } catch (error: unknown) {
    console.error('Error fetching camp year from Convex:', error)
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to fetch camp year',
    }
  }
}

export async function registerCamper(formData: CampRegistrationForm): Promise<{
  success: boolean
  data?: CampRegistration
  error?: string
}> {
  requireConvexEnv()
  if (!isValidPhone(formData.phone)) {
    return { success: false, error: 'Enter a valid Ghana mobile number to register.' }
  }

  try {
    const duplicate = await lookupCampRegistrationByPhone(formData.phone, formData.camp_year_id)
    if (duplicate.already_registered_this_year) {
      return {
        success: false,
        error: 'This phone number is already registered for this Camp Meeting.',
      }
    }

    const { registerCamperViaConvex } = await import('@/lib/convex/camp-bridge')
    const updatedReg = await registerCamperViaConvex(formData)
    revalidatePath('/admin/camp-meeting')

    try {
      await sendCampRegistrationConfirmationSms(updatedReg)
    } catch (err) {
      console.error('Camp registration confirmation SMS failed:', err)
    }

    return { success: true, data: updatedReg }
  } catch (error: unknown) {
    console.error('Registration error (Convex):', error)
    const message = error instanceof Error ? error.message : 'Registration failed. Please try again.'
    return { success: false, error: message }
  }
}

export async function backfillCampCheckInCodes(campYearId: string): Promise<{
  data: { updated: number } | null
  error: string | null
}> {
  requireConvexEnv()
  const secret = process.env.CAMP_CONVEX_SERVER_SECRET
  if (!secret) {
    return { data: null, error: 'Server secret not configured for camp code backfill.' }
  }
  try {
    const { getConvexHttpClient } = await import('@/lib/convex/http-client')
    const { api } = await import('@/convex/_generated/api')
    const client = getConvexHttpClient()
    const result = (await client.mutation(api.camp.backfillCampCheckInCodesWithSecret, {
      secret,
      camp_year_id: campYearId,
    })) as { updated: number }
    revalidatePath('/admin/camp-meeting')
    revalidatePath('/admin/camp-meeting/registrations')
    revalidatePath('/admin/camp-meeting/scan')
    return { data: result, error: null }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to assign camp codes',
    }
  }
}

export async function getCampRegistrations(campYearId: string): Promise<{
  data: CampRegistration[] | null
  error: string | null
}> {
  requireConvexEnv()
  try {
    const { fetchRegistrationsFromConvex } = await import('@/lib/convex/camp-bridge')
    const data = await fetchRegistrationsFromConvex(campYearId)
    return { data, error: null }
  } catch (error: unknown) {
    console.error('Error in getCampRegistrations (Convex):', error)
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to fetch registrations',
    }
  }
}

export async function getCamperDirectory(): Promise<{
  data: import('@/lib/types').CampCamperDirectoryRow[]
  error: string | null
}> {
  requireConvexEnv()
  try {
    const { fetchCamperDirectoryFromConvex } = await import('@/lib/convex/camp-bridge')
    const data = await fetchCamperDirectoryFromConvex()
    return { data, error: null }
  } catch (error: unknown) {
    return {
      data: [],
      error: error instanceof Error ? error.message : 'Failed to load camper directory',
    }
  }
}

export type CampInviteAudienceRow = {
  id: string
  full_name: string
  first_name?: string
  last_name?: string
  phone: string
  email?: string
  source: 'member' | 'past_camper'
}

/** Members + past campers who are not registered for the given camp year. */
export async function getCampUnregisteredAudienceAction(campYearId: string): Promise<{
  data: {
    rows: CampInviteAudienceRow[]
    registration_path: string
    registered_count: number
  } | null
  error: string | null
}> {
  requireConvexEnv()
  if (!campYearId) return { data: null, error: 'Camp year is required' }

  try {
    const { normalizeSmsPhone, isValidSmsPhone } = await import('@/lib/comms/sms-client')
    const { getPublishedCampFormForYear } = await import('@/lib/actions/forms')
    const { fetchUsersFromConvex } = await import('@/lib/convex/core-bridge')

    const [regsResult, dirResult, usersResult, formResult] = await Promise.all([
      getCampRegistrations(campYearId),
      getCamperDirectory(),
      fetchUsersFromConvex(),
      getPublishedCampFormForYear(campYearId),
    ])

    if (regsResult.error) return { data: null, error: regsResult.error }
    if (dirResult.error) return { data: null, error: dirResult.error }

    const registrations = regsResult.data ?? []
    const registeredPhones = new Set<string>()
    const registeredUserIds = new Set<string>()

    for (const reg of registrations) {
      if (reg.status === 'cancelled') continue
      if (reg.user_id) registeredUserIds.add(reg.user_id)
      if (reg.phone && isValidSmsPhone(reg.phone)) {
        registeredPhones.add(normalizeSmsPhone(reg.phone))
      }
    }

    const byPhone = new Map<string, CampInviteAudienceRow>()

    for (const user of usersResult) {
      const phone = user.phone || user.whatsapp || user.secondary_phone
      if (!phone || !isValidSmsPhone(phone)) continue
      if (registeredUserIds.has(user.id)) continue
      const key = normalizeSmsPhone(phone)
      if (registeredPhones.has(key)) continue
      if (byPhone.has(key)) continue

      const nameParts = (user.full_name || '').trim().split(/\s+/)
      byPhone.set(key, {
        id: `user:${user.id}`,
        full_name: user.full_name || 'Member',
        first_name: user.first_name || nameParts[0],
        last_name: user.last_name || nameParts.slice(1).join(' ') || undefined,
        phone,
        email: user.email,
        source: 'member',
      })
    }

    for (const row of dirResult.data ?? []) {
      if (!row.phone || !isValidSmsPhone(row.phone)) continue
      const key = normalizeSmsPhone(row.phone)
      if (registeredPhones.has(key)) continue
      if (row.user_id && registeredUserIds.has(row.user_id)) continue
      const attendedThisYear = row.years.some((y) => y.year_id === campYearId)
      if (attendedThisYear) continue
      if (byPhone.has(key)) continue

      byPhone.set(key, {
        id: `camper:${row.phone_key || key}`,
        full_name: row.full_name || 'Camper',
        first_name: row.first_name,
        last_name: row.last_name,
        phone: row.phone,
        email: row.email,
        source: 'past_camper',
      })
    }

    const rows = Array.from(byPhone.values()).sort((a, b) =>
      a.full_name.localeCompare(b.full_name, undefined, { sensitivity: 'base' })
    )

    const registration_path = formResult.data?.slug
      ? `/f/${formResult.data.slug}`
      : '/camp-meeting/register'

    return {
      data: {
        rows,
        registration_path,
        registered_count: registrations.filter((r) => r.status !== 'cancelled').length,
      },
      error: null,
    }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to load unregistered audience',
    }
  }
}

export async function mergeCampDirectoryContacts(args: {
  canonicalPhone: string
  registrationIds: string[]
}): Promise<{
  data: { merged: number; skipped: number; conflicts: Array<{ registration_id: string; reason: string }> } | null
  error: string | null
}> {
  requireConvexEnv()
  try {
    const { mergeCampDirectoryContactsInConvex } = await import('@/lib/convex/camp-bridge')
    const data = await mergeCampDirectoryContactsInConvex(args)
    return { data, error: null }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to merge contacts',
    }
  }
}

export async function getCampRegistrationById(
  id: string
): Promise<{ data: CampRegistration | null; error: string | null }> {
  requireConvexEnv()
  try {
    const { fetchRegistrationFromConvex, fetchInteractionsFromConvex } = await import(
      '@/lib/convex/camp-bridge'
    )
    const data = await fetchRegistrationFromConvex(id)
    if (!data) return { data: null, error: 'Not found' }
    const interactions = await fetchInteractionsFromConvex(id)
    return { data: { ...data, interactions }, error: null }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to load registration',
    }
  }
}

export async function patchCampRegistration(
  id: string,
  patch: Partial<CampRegistration> & Record<string, unknown>
): Promise<{ data: CampRegistration | null; error: string | null }> {
  requireConvexEnv()
  try {
    const { fetchRegistrationFromConvex, patchRegistrationInConvex } = await import(
      '@/lib/convex/camp-bridge'
    )
    const previous = await fetchRegistrationFromConvex(id)
    const data = await patchRegistrationInConvex(id, patch)
    revalidatePath('/admin/camp-meeting')
    revalidatePath('/admin/camp-meeting/follow-up')

    const nextAssignee =
      patch.assigned_to === undefined
        ? undefined
        : patch.assigned_to === null
          ? null
          : String(patch.assigned_to)
    if (nextAssignee && nextAssignee !== previous?.assigned_to) {
      const { notifyFollowUpAssignment } = await import(
        '@/lib/services/camp-follow-up-notifications'
      )
      const { fetchCampYearByIdFromConvex } = await import('@/lib/convex/camp-bridge')
      const year = data.camp_year_id
        ? await fetchCampYearByIdFromConvex(data.camp_year_id)
        : null
      await notifyFollowUpAssignment({
        assigneeUserId: nextAssignee,
        camperName: data.full_name,
        registrationId: data.id,
        campYearId: data.camp_year_id,
        campYearLabel: year ? String(year.year) : undefined,
      })
    }

    return { data, error: null }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to update registration',
    }
  }
}

export async function getCampCommunications(
  campYearId: string
): Promise<{ data: CampCommunication[] | null; error: string | null }> {
  requireConvexEnv()
  try {
    const { fetchCampCommunicationsFromConvex } = await import('@/lib/convex/camp-bridge')
    const data = await fetchCampCommunicationsFromConvex(campYearId)
    return { data, error: null }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to load communications',
    }
  }
}

export async function recordCampCommunication(
  communication: Omit<CampCommunication, 'id' | 'created_at'>
): Promise<{ data: CampCommunication | null; error: string | null }> {
  requireConvexEnv()
  try {
    const { logCampCommunicationInConvex } = await import('@/lib/convex/camp-bridge')
    const data = await logCampCommunicationInConvex(communication)
    revalidatePath('/admin/camp-meeting/communications')
    return { data, error: null }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to log communication',
    }
  }
}

/** Resend a camp history row (SMS or email) as a new outbound. */
export async function resendCampCommunicationAction(input: {
  sender_id: string
  camp_year_id: string
  camp_year?: number | null
  communication: Pick<
    CampCommunication,
    | 'id'
    | 'communication_type'
    | 'recipient_registration_id'
    | 'recipient_email'
    | 'recipient_phone'
    | 'subject'
    | 'message_body'
    | 'status'
  > & {
    recipient_name?: string | null
  }
}): Promise<{
  data: { success: boolean; provider?: string; messageId?: string } | null
  error: string | null
}> {
  requireConvexEnv()
  if (!input.sender_id) return { data: null, error: 'Sender is required' }

  const comm = input.communication
  const resendable = new Set(['sent', 'delivered', 'failed', 'bounced'])
  if (!resendable.has(comm.status)) {
    return { data: null, error: `Cannot resend a message with status "${comm.status}"` }
  }
  if (!comm.message_body?.trim()) {
    return { data: null, error: 'Original message body is empty' }
  }

  if (comm.communication_type === 'sms') {
    if (!comm.recipient_phone?.trim()) {
      return { data: null, error: 'No recipient phone on this message' }
    }
    const reg = comm.recipient_registration_id
      ? {
          id: comm.recipient_registration_id,
          full_name: comm.recipient_name,
          phone: comm.recipient_phone,
        }
      : {
          id: `resend-${comm.id}`,
          full_name: comm.recipient_name || 'Recipient',
          phone: comm.recipient_phone,
        }

    const bulk = await sendCampBulkSmsAction({
      camp_year_id: input.camp_year_id,
      sender_id: input.sender_id,
      message_template: comm.message_body,
      camp_year: input.camp_year,
      recipients: [reg],
      filter_criteria: { resend_of: comm.id, original_status: comm.status },
    })
    if (bulk.error || !bulk.data) {
      return { data: null, error: bulk.error ?? 'Failed to resend SMS' }
    }
    if (bulk.data.error_count > 0 && bulk.data.success_count === 0) {
      return { data: null, error: bulk.data.errors[0] ?? 'Failed to resend SMS' }
    }
    return {
      data: {
        success: bulk.data.success_count > 0,
        provider: bulk.data.provider,
      },
      error: null,
    }
  }

  if (!comm.recipient_email?.trim()) {
    return { data: null, error: 'No recipient email on this message' }
  }
  if (!comm.subject?.trim()) {
    return { data: null, error: 'Original email has no subject' }
  }

  const { EmailService } = await import('@/lib/services/email-service')
  const emailService = new EmailService()
  const result = await emailService.sendEmail({
    to: comm.recipient_email,
    subject: comm.subject,
    text: comm.message_body,
    html: `<p>${comm.message_body.replace(/\n/g, '<br>')}</p>`,
    camp_year_id: input.camp_year_id,
    sender_id: input.sender_id,
    recipient_registration_id: comm.recipient_registration_id,
  })

  if (!result.success) {
    return { data: null, error: result.error || 'Failed to resend email' }
  }

  return {
    data: {
      success: true,
      messageId: result.communication?.provider_message_id,
    },
    error: null,
  }
}

type CampSmsRecipient = {
  id: string
  full_name?: string | null
  first_name?: string | null
  last_name?: string | null
  phone?: string | null
  email?: string | null
  role?: string | null
  qr_code?: string | null
  check_in_code?: string | null
  room_name?: string | null
  building?: string | null
  room_leader?: string | null
  roommates?: string | null
  /** When true, do not link the log row to a camp registration. */
  invite_only?: boolean
  source?: 'member' | 'past_camper' | 'registration'
}

function personalizeCampSms(
  template: string,
  registration: CampSmsRecipient,
  campYear?: number | null,
  extras?: { theme?: string | null; venue?: string | null; registrationLink?: string | null }
): string {
  return personalizeCampMessage(template, {
    fullName: registration.full_name,
    firstName: registration.first_name,
    lastName: registration.last_name,
    role: registration.role,
    campYear,
    phone: registration.phone,
    email: registration.email,
    checkInCode: registration.check_in_code,
    qrCode: registration.qr_code,
    theme: extras?.theme,
    venue: extras?.venue,
    roomName: registration.room_name,
    building: registration.building,
    roomLeader: registration.room_leader,
    roommates: registration.roommates,
    registrationLink: extras?.registrationLink,
  })
}

/**
 * Auto SMS after camp registration (2026+ by default). Soft-skips when SMS
 * is not configured or the year is gated off. Never throws to callers that catch.
 * Pass `{ force: true }` for manual admin resend (skips year gate).
 */
export async function sendCampRegistrationConfirmationSms(
  registration: Pick<
    CampRegistration,
    | 'id'
    | 'camp_year_id'
    | 'full_name'
    | 'first_name'
    | 'last_name'
    | 'phone'
    | 'email'
    | 'role'
    | 'check_in_code'
    | 'qr_code'
  >,
  options?: { force?: boolean; sender_id?: string }
): Promise<{ sent: boolean; skipped?: string; error?: string }> {
  if (!registration.phone?.trim()) {
    return { sent: false, skipped: 'no_phone' }
  }

  let yearDoc: CampYear | null = null
  try {
    const { fetchCampYearByIdFromConvex } = await import('@/lib/convex/camp-bridge')
    yearDoc = await fetchCampYearByIdFromConvex(registration.camp_year_id)
  } catch {
    // fall through — may still send with calendar year
  }

  const campYearNum = yearDoc?.year ?? new Date().getFullYear()
  if (!options?.force && !shouldSendRegistrationConfirmationSms(campYearNum)) {
    return { sent: false, skipped: `year_${campYearNum}_gated` }
  }

  const { isSmsConfigured } = await import('@/lib/comms/sms-client')
  if (!isSmsConfigured()) {
    return { sent: false, skipped: 'sms_not_configured' }
  }

  const template = getRegistrationConfirmationSmsTemplate()
  const senderId =
    options?.sender_id?.trim() ||
    process.env.CAMP_SYSTEM_SENDER_ID?.trim() ||
    'system-registration'

  const result = await sendCampBulkSmsAction({
    camp_year_id: registration.camp_year_id,
    sender_id: senderId,
    message_template: template,
    camp_year: campYearNum,
    recipients: [
      {
        id: registration.id,
        full_name: registration.full_name,
        first_name: registration.first_name,
        last_name: registration.last_name,
        phone: registration.phone,
        email: registration.email,
        role: registration.role,
        check_in_code: registration.check_in_code,
        qr_code: registration.qr_code,
      },
    ],
    filter_criteria: {
      auto: !options?.force,
      type: 'registration_confirmation',
      theme: yearDoc?.theme,
      venue: yearDoc?.venue,
    },
  })

  if (result.error || !result.data) {
    return { sent: false, error: result.error ?? 'send_failed' }
  }
  if (result.data.success_count < 1) {
    return { sent: false, error: result.data.errors[0] ?? 'send_failed' }
  }
  return { sent: true }
}

/**
 * Send camp SMS templates to one or many registrations (confirmation or room allocation).
 * Enriches room fields when template needs them.
 */
export async function sendCampTemplateSmsToRegistrationsAction(input: {
  camp_year_id: string
  sender_id: string
  registration_ids: string[]
  template_id: Extract<CampMessageTemplateId, 'registration_confirmation' | 'room_allocation'>
  dry_run?: boolean
  force_mock?: boolean
}): Promise<{
  data: {
    success_count: number
    error_count: number
    skipped_count: number
    errors: string[]
    batch_id: string
    provider: string
  } | null
  error: string | null
}> {
  requireConvexEnv()
  if (!input.sender_id) return { data: null, error: 'Sender is required' }
  if (!input.registration_ids.length) return { data: null, error: 'Select at least one registration' }

  const { fetchRegistrationsFromConvex, fetchCampRoomsFromConvex, fetchCampYearByIdFromConvex } =
    await import('@/lib/convex/camp-bridge')
  const { campRegistrationDisplayName } = await import('@/lib/camp/manual-check-in-search')

  const [allRegs, rooms, yearDoc] = await Promise.all([
    fetchRegistrationsFromConvex(input.camp_year_id),
    fetchCampRoomsFromConvex(input.camp_year_id),
    fetchCampYearByIdFromConvex(input.camp_year_id),
  ])

  const idSet = new Set(input.registration_ids)
  const selected = allRegs.filter((r) => idSet.has(r.id) && r.status !== 'cancelled')
  if (!selected.length) return { data: null, error: 'No matching registrations found' }

  const roomById = new Map(rooms.map((r) => [r.id, r]))
  const occupantsByRoom = new Map<string, CampRegistration[]>()
  for (const reg of allRegs) {
    if (!reg.room_id || reg.status === 'cancelled') continue
    const list = occupantsByRoom.get(reg.room_id) ?? []
    list.push(reg)
    occupantsByRoom.set(reg.room_id, list)
  }

  const template =
    input.template_id === 'room_allocation'
      ? getRoomAllocationSmsTemplate()
      : getCampMessageTemplate(input.template_id)?.body || getRegistrationConfirmationSmsTemplate()

  const errors: string[] = []
  let skipped_count = 0
  const recipients: CampSmsRecipient[] = []

  for (const reg of selected) {
    if (!reg.phone?.trim()) {
      skipped_count++
      errors.push(`${campRegistrationDisplayName(reg)}: No phone`)
      continue
    }

    let room_name: string | undefined
    let building: string | undefined
    let room_leader: string | undefined
    let roommates: string | undefined

    if (input.template_id === 'room_allocation') {
      if (!reg.room_id) {
        skipped_count++
        errors.push(`${campRegistrationDisplayName(reg)}: No room assigned`)
        continue
      }
      const room = roomById.get(reg.room_id)
      if (!room) {
        skipped_count++
        errors.push(`${campRegistrationDisplayName(reg)}: Room not found`)
        continue
      }
      const occupants = occupantsByRoom.get(reg.room_id) ?? []
      const leader = room.room_leader_id
        ? occupants.find((o) => o.id === room.room_leader_id)
        : undefined
      room_name = room.name
      building = room.building
      room_leader = leader ? campRegistrationDisplayName(leader) : undefined
      roommates = occupants
        .filter((o) => o.id !== reg.id)
        .map((o) => campRegistrationDisplayName(o))
        .join(', ')
    }

    recipients.push({
      id: reg.id,
      full_name: reg.full_name,
      first_name: reg.first_name,
      last_name: reg.last_name,
      phone: reg.phone,
      email: reg.email,
      role: reg.role,
      check_in_code: reg.check_in_code,
      qr_code: reg.qr_code,
      room_name,
      building,
      room_leader,
      roommates,
    })
  }

  if (!recipients.length) {
    return {
      data: null,
      error: errors[0] || 'No recipients with valid phone/room',
    }
  }

  const bulk = await sendCampBulkSmsAction({
    camp_year_id: input.camp_year_id,
    sender_id: input.sender_id,
    message_template: template,
    camp_year: yearDoc?.year,
    recipients,
    dry_run: input.dry_run,
    force_mock: input.force_mock,
    filter_criteria: {
      type: input.template_id,
      theme: yearDoc?.theme,
      venue: yearDoc?.venue,
      manual: true,
    },
  })

  if (bulk.error || !bulk.data) {
    return { data: null, error: bulk.error ?? 'Failed to send SMS' }
  }

  return {
    data: {
      success_count: bulk.data.success_count,
      error_count: bulk.data.error_count,
      skipped_count,
      errors: [...errors, ...bulk.data.errors],
      batch_id: bulk.data.batch_id,
      provider: bulk.data.provider,
    },
    error: null,
  }
}

/** Server-side Hubtel bulk SMS for camp registrations (one-by-one with small gap). */
export async function sendCampBulkSmsAction(input: {
  camp_year_id: string
  sender_id: string
  message_template: string
  camp_year?: number | null
  recipients: CampSmsRecipient[]
  dry_run?: boolean
  force_mock?: boolean
  filter_criteria?: Record<string, unknown>
  registration_link?: string | null
}): Promise<{
  data: {
    success_count: number
    error_count: number
    errors: string[]
    batch_id: string
    provider: string
    dry_run: boolean
  } | null
  error: string | null
}> {
  requireConvexEnv()
  if (!input.sender_id) return { data: null, error: 'Sender is required' }
  if (!input.message_template.trim()) return { data: null, error: 'Message is required' }
  if (!input.recipients.length) return { data: null, error: 'Select at least one recipient' }

  const {
    sendSms,
    normalizeSmsPhone,
    isValidSmsPhone,
    isSmsConfigured,
    resolveSmsProvider,
    getMissingSmsEnvKeys,
    getSmsEnvPresence,
  } = await import('@/lib/comms/sms-client')
  const { randomUUID } = await import('crypto')
  const batch_id = randomUUID()
  const dryRun = Boolean(input.dry_run)
  const forceMock = Boolean(input.force_mock)
  const registrationLink = input.registration_link?.trim() || null

  if (!dryRun && !forceMock && !isSmsConfigured()) {
    const missing = getMissingSmsEnvKeys()
    const presence = getSmsEnvPresence()
    return {
      data: null,
      error: `SMS is not configured on this server (provider=${resolveSmsProvider()}). Missing: ${
        missing.join(', ') || 'unknown'
      }. Seen: ${Object.entries(presence)
        .map(([k, v]) => `${k}=${v ? 'yes' : 'no'}`)
        .join(', ')}. Add Hubtel keys in Vercel → Settings → Environment Variables for Production, then Redeploy.`,
    }
  }

  const { logCampCommunicationInConvex } = await import('@/lib/convex/camp-bridge')
  const smsGapMs = Math.max(0, Number(process.env.SMS_BULK_GAP_MS ?? 150))
  let success_count = 0
  let error_count = 0
  const errors: string[] = []
  let lastProvider = dryRun ? 'dry_run' : resolveSmsProvider()

  let theme: string | null =
    typeof input.filter_criteria?.theme === 'string' ? input.filter_criteria.theme : null
  let venue: string | null =
    typeof input.filter_criteria?.venue === 'string' ? input.filter_criteria.venue : null
  if (!theme || !venue) {
    try {
      const { fetchCampYearByIdFromConvex } = await import('@/lib/convex/camp-bridge')
      const yearDoc = await fetchCampYearByIdFromConvex(input.camp_year_id)
      theme = theme || yearDoc?.theme || null
      venue = venue || yearDoc?.venue || null
    } catch {
      // optional enrichment
    }
  }

  for (let i = 0; i < input.recipients.length; i++) {
    const registration = input.recipients[i]
    const label =
      registration.full_name?.trim() ||
      `${registration.first_name ?? ''} ${registration.last_name ?? ''}`.trim() ||
      registration.id

    if (!registration.phone?.trim()) {
      error_count++
      errors.push(`${label}: No phone number`)
      continue
    }
    if (!isValidSmsPhone(registration.phone)) {
      error_count++
      errors.push(
        `${label}: Invalid phone (need Ghana mobile like 024… / +233… / 233…). Got: ${registration.phone}`
      )
      continue
    }

    const message = personalizeCampSms(input.message_template, registration, input.camp_year, {
      theme,
      venue,
      registrationLink,
    })
    const to = normalizeSmsPhone(registration.phone)

    if (i > 0 && smsGapMs > 0 && !dryRun) {
      await new Promise((resolve) => setTimeout(resolve, smsGapMs))
    }

    try {
      const smsResult = await sendSms(registration.phone, message, {
        dryRun,
        forceMock,
      })
      lastProvider = smsResult.provider
      await logCampCommunicationInConvex({
        camp_year_id: input.camp_year_id,
        communication_type: 'sms',
        sender_id: input.sender_id,
        recipient_type: input.recipients.length > 1 ? 'bulk' : 'individual',
        recipient_registration_id: registration.invite_only ? undefined : registration.id,
        recipient_phone: smsResult.normalizedPhone ?? to,
        message_body: message,
        status: smsResult.success ? 'sent' : 'failed',
        provider_message_id: smsResult.messageId,
        error_message: smsResult.error,
        metadata: {
          batch_id,
          provider: smsResult.provider,
          dry_run: dryRun || Boolean(smsResult.dryRun),
          recipient_name: label,
          raw_phone: registration.phone,
          normalized_phone: smsResult.normalizedPhone ?? to,
          filters: input.filter_criteria,
          invite_only: Boolean(registration.invite_only),
          audience_source: registration.source ?? (registration.invite_only ? 'invite' : 'registration'),
          registration_link: registrationLink,
        },
        sent_at: smsResult.success ? new Date().toISOString() : undefined,
      })

      if (smsResult.success) success_count++
      else {
        error_count++
        errors.push(`${label}: ${smsResult.error ?? 'SMS failed'}`)
      }
    } catch (error: unknown) {
      error_count++
      errors.push(`${label}: ${error instanceof Error ? error.message : 'Send failed'}`)
    }
  }

  revalidatePath('/admin/camp-meeting/communications')
  revalidatePath('/admin/communications')
  return {
    data: {
      success_count,
      error_count,
      errors,
      batch_id,
      provider: lastProvider,
      dry_run: dryRun,
    },
    error: null,
  }
}

export async function appendCampInteraction(data: {
  registration_id: string
  performed_by: string
  interaction_type: CampInteraction['interaction_type']
  notes?: string
}): Promise<{ data: CampInteraction | null; error: string | null }> {
  requireConvexEnv()
  try {
    const { addInteractionInConvex } = await import('@/lib/convex/camp-bridge')
    const row = await addInteractionInConvex(data)
    return { data: row, error: null }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to add interaction',
    }
  }
}

export async function loadCampActivitiesForYear(
  campYearId: string
): Promise<{ data: unknown[] | null; error: string | null }> {
  requireConvexEnv()
  try {
    const { fetchCampActivitiesFromConvex } = await import('@/lib/convex/camp-bridge')
    const raw = await fetchCampActivitiesFromConvex(campYearId)
    const data = raw.map((doc: unknown) => {
      const r = doc as Record<string, unknown>
      return { id: String(r._id ?? ''), ...r }
    })
    return { data, error: null }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to load activities',
    }
  }
}

export async function createCampActivityRecord(activity: Record<string, unknown>): Promise<{
  data: unknown | null
  error: string | null
}> {
  requireConvexEnv()
  const campYearId = String(activity.camp_year_id ?? '')
  try {
    const { createCampActivityInConvex } = await import('@/lib/convex/camp-bridge')
    const { camp_year_id: _c, ...rest } = activity
    const data = await createCampActivityInConvex(campYearId, rest as Record<string, unknown>)
    revalidatePath('/admin/camp-meeting/activities')
    return { data, error: null }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to create activity',
    }
  }
}

export async function updateCampActivityRecord(
  id: string,
  patch: Record<string, unknown>
): Promise<{ data: unknown | null; error: string | null }> {
  requireConvexEnv()
  try {
    const { updateCampActivityInConvex } = await import('@/lib/convex/camp-bridge')
    const data = await updateCampActivityInConvex(id, patch)
    revalidatePath('/admin/camp-meeting/activities')
    return { data, error: null }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to update activity',
    }
  }
}

export async function deleteCampActivityRecord(id: string): Promise<{ error: string | null }> {
  requireConvexEnv()
  try {
    const { deleteCampActivityInConvex } = await import('@/lib/convex/camp-bridge')
    await deleteCampActivityInConvex(id)
    revalidatePath('/admin/camp-meeting/activities')
    return { error: null }
  } catch (error: unknown) {
    return {
      error: error instanceof Error ? error.message : 'Failed to delete activity',
    }
  }
}

export async function createCampYear(yearData: {
  year: number
  theme: string
  start_date: string
  end_date: string
  is_active: boolean
  registration_open: boolean
  flyer_image_url?: string | null
  venue?: string
}): Promise<{ success: boolean; data?: CampYear; error?: string }> {
  requireConvexEnv()
  try {
    const { createCampYearInConvex } = await import('@/lib/convex/camp-bridge')
    const data = await createCampYearInConvex(yearData)
    revalidatePath('/admin/camp-meeting/years')
    return { success: true, data }
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create camp year',
    }
  }
}

export async function updateCampYear(
  yearId: string,
  yearData: {
    theme: string
    start_date: string
    end_date: string
    is_active: boolean
    registration_open: boolean
    flyer_image_url?: string | null
    venue?: string
  }
): Promise<{ success: boolean; data?: CampYear; error?: string }> {
  requireConvexEnv()
  try {
    const { updateCampYearInConvex } = await import('@/lib/convex/camp-bridge')
    const data = await updateCampYearInConvex(yearId, yearData)
    revalidatePath('/admin/camp-meeting/years')
    return { success: true, data }
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update camp year',
    }
  }
}

export async function toggleCampYearRegistration(
  yearId: string,
  currentStatus: boolean
): Promise<{ success: boolean; error?: string }> {
  requireConvexEnv()
  try {
    const { toggleCampYearRegistrationInConvex } = await import('@/lib/convex/camp-bridge')
    await toggleCampYearRegistrationInConvex(yearId, currentStatus)
    revalidatePath('/admin/camp-meeting/years')
    return { success: true }
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to toggle',
    }
  }
}

export async function setActiveCampYear(yearId: string): Promise<{ success: boolean; error?: string }> {
  requireConvexEnv()
  try {
    const { setActiveCampYearInConvex } = await import('@/lib/convex/camp-bridge')
    await setActiveCampYearInConvex(yearId)
    revalidatePath('/admin/camp-meeting/years')
    revalidatePath('/admin/camp-meeting')
    return { success: true }
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to set active year',
    }
  }
}

export async function deactivateCampYear(yearId: string): Promise<{ success: boolean; error?: string }> {
  requireConvexEnv()
  try {
    const { deactivateCampYearInConvex } = await import('@/lib/convex/camp-bridge')
    await deactivateCampYearInConvex(yearId)
    revalidatePath('/admin/camp-meeting/years')
    revalidatePath('/admin/camp-meeting')
    revalidatePath(`/admin/camp-meeting/years/${yearId}`)
    return { success: true }
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to deactivate camp year',
    }
  }
}

export async function deleteCampYear(args: {
  yearId?: string
  calendarYear?: number
  confirmYear: number
}): Promise<{
  success: boolean
  data: import('@/lib/convex/camp-bridge').DeleteCampYearResult | null
  error: string | null
}> {
  requireConvexEnv()
  try {
    const { deleteCampYearInConvex } = await import('@/lib/convex/camp-bridge')
    const data = await deleteCampYearInConvex(args)
    revalidatePath('/admin/camp-meeting/years')
    revalidatePath('/admin/camp-meeting')
    revalidatePath('/admin/camp-meeting/registrations')
    revalidatePath('/admin/camp-meeting/analytics')
    revalidatePath('/admin/camp-meeting/import')
    if (args.yearId) {
      revalidatePath(`/admin/camp-meeting/years/${args.yearId}`)
    }
    return { success: true, data, error: null }
  } catch (error: unknown) {
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Failed to delete camp year',
    }
  }
}

export async function clearActiveCampYear(): Promise<{ success: boolean; error?: string }> {
  requireConvexEnv()
  try {
    const { clearActiveCampYearInConvex } = await import('@/lib/convex/camp-bridge')
    await clearActiveCampYearInConvex()
    revalidatePath('/admin/camp-meeting/years')
    revalidatePath('/admin/camp-meeting')
    return { success: true }
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to clear active year',
    }
  }
}

export async function bulkPatchCampRegistrations(args: {
  registration_ids: string[]
  assigned_to?: string
  follow_up_status?: 'pending' | 'in_progress' | 'completed'
}): Promise<{ updated: number; error: string | null }> {
  requireConvexEnv()
  try {
    const { bulkPatchRegistrationsInConvex, fetchRegistrationFromConvex, fetchCampYearByIdFromConvex } =
      await import('@/lib/convex/camp-bridge')
    const registrations =
      args.assigned_to && args.registration_ids.length > 0
        ? (
            await Promise.all(args.registration_ids.map((id) => fetchRegistrationFromConvex(id)))
          ).filter((registration): registration is CampRegistration => registration != null)
        : []
    const updated = await bulkPatchRegistrationsInConvex(args)
    revalidatePath('/admin/camp-meeting')
    revalidatePath('/admin/camp-meeting/follow-up')

    if (args.assigned_to && updated > 0) {
      const { notifyFollowUpAssignment } = await import(
        '@/lib/services/camp-follow-up-notifications'
      )
      const campYearId = registrations[0]?.camp_year_id
      const year = campYearId ? await fetchCampYearByIdFromConvex(campYearId) : null
      await notifyFollowUpAssignment({
        assigneeUserId: args.assigned_to,
        assignedCount: updated,
        sampleNames: registrations.map((registration) => registration.full_name).slice(0, 5),
        campYearId,
        campYearLabel: year ? String(year.year) : undefined,
      })
    }

    return { updated, error: null }
  } catch (error: unknown) {
    return {
      updated: 0,
      error: error instanceof Error ? error.message : 'Failed to update registrations',
    }
  }
}

export async function getAllCampYears(): Promise<{ data: CampYear[] | null; error: string | null }> {
  requireConvexEnv()
  try {
    const { fetchAllCampYearsFromConvex } = await import('@/lib/convex/camp-bridge')
    const data = await fetchAllCampYearsFromConvex()
    return { data, error: null }
  } catch (error: unknown) {
    console.error('Error fetching camp years (Convex):', error)
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to fetch camp years',
    }
  }
}

export async function promoteCampRegistrant(
  registrationId: string,
  args: {
    role: 'admin' | 'pastor' | 'elder' | 'finance_officer' | 'member' | 'visitor'
    birth_month?: number
    birth_day?: number
    birth_year?: number
  }
): Promise<{ data: CampRegistration | null; error: string | null }> {
  requireConvexEnv()
  try {
    const { promoteCampRegistrantInConvex } = await import('@/lib/convex/camp-bridge')
    const { registration } = await promoteCampRegistrantInConvex({
      registration_id: registrationId,
      role: args.role,
      birth_month: args.birth_month,
      birth_day: args.birth_day,
      birth_year: args.birth_year,
    })
    revalidatePath('/admin/camp-meeting')
    revalidatePath(`/admin/camp-meeting/registrations/${registrationId}`)
    return { data: registration, error: null }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to promote registrant',
    }
  }
}

export async function syncCampRegistrationDobToMember(registrationId: string): Promise<{
  data: boolean
  error: string | null
}> {
  requireConvexEnv()
  try {
    const { fetchRegistrationFromConvex } = await import('@/lib/convex/camp-bridge')
    const { fetchMemberByUserIdFromConvex, patchMemberInConvex } = await import('@/lib/convex/core-bridge')
    const { memberDobIsoFromCampRegistration } = await import('@/lib/camp/birthday')
    const reg = await fetchRegistrationFromConvex(registrationId)
    if (!reg) return { data: false, error: 'Registration not found' }
    if (!reg.user_id) return { data: false, error: 'Registration is not linked to a directory user yet.' }
    const dob = memberDobIsoFromCampRegistration({
      date_of_birth: reg.date_of_birth,
      birth_month: reg.birth_month,
      birth_day: reg.birth_day,
    })
    if (!dob) return { data: false, error: 'No birthday data on this registration.' }
    const member = await fetchMemberByUserIdFromConvex(reg.user_id)
    if (!member) return { data: false, error: 'Linked user has no member profile.' }
    await patchMemberInConvex(member.id, { dob })
    revalidatePath('/admin/camp-meeting')
    revalidatePath(`/admin/camp-meeting/registrations/${registrationId}`)
    revalidatePath('/dashboard')
    return { data: true, error: null }
  } catch (error: unknown) {
    return {
      data: false,
      error: error instanceof Error ? error.message : 'Failed to sync birthday',
    }
  }
}

export async function recordCampSessionCheckIn(args: {
  activity_id: string
  registration_id: string
  performed_by: string
  check_in_method?: import('@/lib/types').CampSessionAttendance['check_in_method']
}): Promise<{
  data: {
    already_checked_in: boolean
    attendance: import('@/lib/types').CampSessionAttendance | null
    registration: CampRegistration | null
  } | null
  error: string | null
}> {
  requireConvexEnv()
  try {
    const { recordCampSessionCheckInInConvex } = await import('@/lib/convex/camp-bridge')
    const data = await recordCampSessionCheckInInConvex(args)
    revalidatePath('/admin/camp-meeting/scan')
    revalidatePath('/admin/camp-meeting/registrations')
    return { data, error: null }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Session check-in failed',
    }
  }
}

export async function getCampSessionAttendancesForActivity(activityId: string): Promise<{
  data: import('@/lib/types').CampSessionAttendance[] | null
  error: string | null
}> {
  requireConvexEnv()
  try {
    const { fetchCampSessionAttendancesForActivityFromConvex } = await import('@/lib/convex/camp-bridge')
    const data = await fetchCampSessionAttendancesForActivityFromConvex(activityId)
    return { data, error: null }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to load session attendance',
    }
  }
}

export async function getCampRooms(campYearId: string): Promise<{
  data: import('@/lib/types').CampRoom[] | null
  error: string | null
}> {
  requireConvexEnv()
  try {
    const { fetchCampRoomsFromConvex } = await import('@/lib/convex/camp-bridge')
    const data = await fetchCampRoomsFromConvex(campYearId)
    return { data, error: null }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to load rooms',
    }
  }
}

export async function createCampRoom(input: {
  camp_year_id: string
  name: string
  building?: string
  capacity: number
  gender?: import('@/lib/types').CampRoomGender
  notes?: string
}): Promise<{ data: import('@/lib/types').CampRoom | null; error: string | null }> {
  requireConvexEnv()
  try {
    const { createCampRoomInConvex } = await import('@/lib/convex/camp-bridge')
    const data = await createCampRoomInConvex(input)
    revalidatePath('/admin/camp-meeting/rooms')
    return { data, error: null }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to create room',
    }
  }
}

export async function updateCampRoom(
  id: string,
  patch: {
    name?: string
    building?: string
    capacity?: number
    gender?: import('@/lib/types').CampRoomGender | null
    notes?: string
  }
): Promise<{ data: import('@/lib/types').CampRoom | null; error: string | null }> {
  requireConvexEnv()
  try {
    const { updateCampRoomInConvex } = await import('@/lib/convex/camp-bridge')
    const data = await updateCampRoomInConvex(id, patch)
    revalidatePath('/admin/camp-meeting/rooms')
    return { data, error: null }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to update room',
    }
  }
}

export async function deleteCampRoom(id: string): Promise<{
  data: { deleted: boolean; unassigned: number } | null
  error: string | null
}> {
  requireConvexEnv()
  try {
    const { deleteCampRoomInConvex } = await import('@/lib/convex/camp-bridge')
    const data = await deleteCampRoomInConvex(id)
    revalidatePath('/admin/camp-meeting/rooms')
    return { data, error: null }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to delete room',
    }
  }
}

export async function assignCampRegistrationRoom(args: {
  registration_id: string
  room_id: string | null
}): Promise<{ data: CampRegistration | null; error: string | null }> {
  requireConvexEnv()
  try {
    const { assignCampRegistrationRoomInConvex } = await import('@/lib/convex/camp-bridge')
    const data = await assignCampRegistrationRoomInConvex(args)
    revalidatePath('/admin/camp-meeting/rooms')
    revalidatePath('/admin/camp-meeting/registrations')
    return { data, error: null }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to assign room',
    }
  }
}

export async function randomAssignCampRooms(args: {
  camp_year_id: string
  respect_gender?: boolean
  only_unassigned?: boolean
}): Promise<{ data: { assigned: number; skipped: number } | null; error: string | null }> {
  requireConvexEnv()
  try {
    const { randomAssignCampRoomsInConvex } = await import('@/lib/convex/camp-bridge')
    const data = await randomAssignCampRoomsInConvex(args)
    revalidatePath('/admin/camp-meeting/rooms')
    revalidatePath('/admin/camp-meeting/registrations')
    return { data, error: null }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Random assignment failed',
    }
  }
}

export async function getCampRegistrationRoomContext(registrationId: string): Promise<{
  data: import('@/lib/types').CampRegistrationRoomContext | null
  error: string | null
}> {
  requireConvexEnv()
  try {
    const { fetchCampRegistrationRoomContextFromConvex } = await import('@/lib/convex/camp-bridge')
    const data = await fetchCampRegistrationRoomContextFromConvex(registrationId)
    return { data, error: null }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to load room details',
    }
  }
}

export async function setCampRoomLeader(args: {
  room_id: string
  registration_id: string | null
}): Promise<{ data: import('@/lib/types').CampRoom | null; error: string | null }> {
  requireConvexEnv()
  try {
    const { setCampRoomLeaderInConvex } = await import('@/lib/convex/camp-bridge')
    const data = await setCampRoomLeaderInConvex(args)
    revalidatePath('/admin/camp-meeting/rooms')
    revalidatePath('/admin/camp-meeting/registrations')
    return { data, error: null }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to set room leader',
    }
  }
}
