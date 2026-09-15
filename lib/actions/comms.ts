'use server'

import type { ApiResponse } from '@/lib/services/api-types'
import type {
  CommunicationRecord,
  CommsChannel,
  CommsModule,
  CommsRecipient,
  CommsStats,
  SendCommsRequest,
  SendCommsResult,
} from '@/lib/comms/types'
import {
  filterMembersByModule,
  memberToRecipient,
  parseManualRecipients,
  visitorToRecipient,
} from '@/lib/comms/recipients'
import { sendCommunications } from '@/lib/comms/send'
import {
  getMissingSmsEnvKeys,
  getSmsProviderStatus,
  isSmsConfigured,
  isValidSmsPhone,
  normalizeSmsPhone,
  resolveSmsProvider,
  sendSms,
} from '@/lib/comms/sms-client'

function isConvexDataSource(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_CONVEX_URL)
}

function convexUnavailable(): string {
  return 'Database is not configured. Set NEXT_PUBLIC_CONVEX_URL.'
}

export async function listCommunicationsAction(filters?: {
  module?: CommsModule
  channel?: CommsChannel
  batch_id?: string
  limit?: number
}): Promise<ApiResponse<CommunicationRecord[]>> {
  if (!isConvexDataSource()) {
    return { data: null, error: convexUnavailable(), loading: false }
  }
  try {
    const { fetchCommunicationsFromConvex } = await import('@/lib/convex/comms-bridge')
    const data = await fetchCommunicationsFromConvex(filters)
    return { data, error: null, loading: false }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to load communications',
      loading: false,
    }
  }
}

export async function getCommsStatsAction(
  module?: CommsModule
): Promise<ApiResponse<CommsStats>> {
  if (!isConvexDataSource()) {
    return { data: null, error: convexUnavailable(), loading: false }
  }
  try {
    const { fetchCommsStatsFromConvex } = await import('@/lib/convex/comms-bridge')
    const data = await fetchCommsStatsFromConvex(module)
    return { data, error: null, loading: false }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to load stats',
      loading: false,
    }
  }
}

export async function getCommsProviderStatusAction(): Promise<
  ApiResponse<{
    email: string
    sms: boolean
    smsConfigured: boolean
    smsProvider: string
    smsSenderId: string
    environment: string
    devModeAvailable: boolean
    forceMock: boolean
    missingKeys: string[]
    envPresence: Record<string, boolean>
  }>
> {
  const emailProvider = process.env.NEXT_PUBLIC_EMAIL_PROVIDER ?? 'mock'
  const sms = getSmsProviderStatus()
  return {
    data: {
      email: emailProvider,
      sms: sms.configured,
      smsConfigured: sms.configured,
      smsProvider: sms.provider,
      smsSenderId: sms.senderId,
      environment: sms.environment,
      devModeAvailable: sms.devModeAvailable,
      forceMock: sms.forceMock,
      missingKeys: sms.missingKeys,
      envPresence: sms.envPresence,
    },
    error: null,
    loading: false,
  }
}

/** Single test/dry-run SMS for developer tooling. */
export async function sendTestSmsAction(input: {
  phone: string
  message?: string
  dry_run?: boolean
  force_mock?: boolean
  sender_id?: string
}): Promise<
  ApiResponse<{
    success: boolean
    messageId?: string
    provider: string
    normalizedPhone?: string
    error?: string
  }>
> {
  const phone = input.phone?.trim()
  if (!phone) return { data: null, error: 'Phone is required', loading: false }
  if (!isValidSmsPhone(phone)) {
    return {
      data: null,
      error: `Invalid Ghana phone. Normalized: ${normalizeSmsPhone(phone) || 'empty'}`,
      loading: false,
    }
  }

  const message =
    input.message?.trim() ||
    'Campus Gem SMS test — developer check. You can ignore this message.'

  const dryRun = Boolean(input.dry_run)
  const forceMock = Boolean(input.force_mock)
  if (!dryRun && !forceMock && !isSmsConfigured()) {
    const missing = getMissingSmsEnvKeys()
    return {
      data: null,
      error: `SMS is not configured (provider=${resolveSmsProvider()}). Missing: ${
        missing.join(', ') || 'Hubtel credentials'
      }. Add keys in Vercel → Environment Variables for Production, then Redeploy.`,
      loading: false,
    }
  }

  const result = await sendSms(phone, message, {
    dryRun,
    forceMock,
  })

  if (isConvexDataSource() && input.sender_id) {
    try {
      const { logCommunicationInConvex } = await import('@/lib/convex/comms-bridge')
      await logCommunicationInConvex({
        module: 'church',
        channel: 'sms',
        audience_type: 'individual',
        sender_id: input.sender_id,
        recipient_name: 'Test send',
        recipient_phone: result.normalizedPhone ?? normalizeSmsPhone(phone),
        recipient_entity_type: 'manual',
        recipient_entity_id: 'test',
        message_body: message,
        status: result.success ? 'sent' : 'failed',
        provider_message_id: result.messageId,
        error_message: result.error,
        metadata: {
          provider: result.provider,
          dry_run: Boolean(result.dryRun || input.dry_run),
          test: true,
          raw_phone: phone,
        },
        sent_at: result.success ? new Date().toISOString() : undefined,
      })
    } catch {
      // Logging failure should not hide send result
    }
  }

  return {
    data: {
      success: result.success,
      messageId: result.messageId,
      provider: result.provider,
      normalizedPhone: result.normalizedPhone,
      error: result.error,
    },
    error: result.success ? null : result.error ?? 'SMS failed',
    loading: false,
  }
}

export async function searchCommsRecipientsAction(params: {
  module: CommsModule
  query?: string
  limit?: number
}): Promise<ApiResponse<CommsRecipient[]>> {
  if (!isConvexDataSource()) {
    return { data: null, error: convexUnavailable(), loading: false }
  }

  const needle = params.query?.trim().toLowerCase() ?? ''
  const limit = params.limit ?? 30
  const recipients: CommsRecipient[] = []

  try {
    if (params.module === 'rlc') {
      const { loadRlcVisitorsAction, loadRlcMembersAction } = await import('@/lib/actions/rlc')
      const [visitorsRes, membersRes] = await Promise.all([
        loadRlcVisitorsAction({ include_inactive: false }),
        loadRlcMembersAction(),
      ])
      for (const visitor of visitorsRes.data ?? []) {
        const r = visitorToRecipient(visitor, 'rlc')
        if (!r) continue
        if (needle && !r.name.toLowerCase().includes(needle) && !r.phone?.includes(needle) && !r.email?.toLowerCase().includes(needle)) {
          continue
        }
        recipients.push(r)
      }
      for (const member of membersRes.data ?? []) {
        const r = memberToRecipient(member, 'rlc')
        if (!r) continue
        if (needle && !r.name.toLowerCase().includes(needle) && !r.phone?.includes(needle) && !r.email?.toLowerCase().includes(needle)) {
          continue
        }
        recipients.push(r)
      }
    } else if (params.module === 'camp') {
      const { getOpenRegistrationCampYear, getCampRegistrations } = await import('@/lib/actions/camp')
      const year = await getOpenRegistrationCampYear()
      if (!year.data?.id) {
        return { data: [], error: null, loading: false }
      }
      const { data: registrations } = await getCampRegistrations(year.data.id)
      for (const reg of registrations ?? []) {
        const name = reg.full_name ?? `${reg.first_name ?? ''} ${reg.last_name ?? ''}`.trim()
        if (!reg.email && !reg.phone) continue
        if (
          needle &&
          !name.toLowerCase().includes(needle) &&
          !reg.phone?.includes(needle) &&
          !reg.email?.toLowerCase().includes(needle)
        ) {
          continue
        }
        recipients.push({
          id: reg.id,
          name: name || 'Camper',
          email: reg.email ?? undefined,
          phone: reg.phone ?? undefined,
          entity_type: 'registration',
          entity_id: reg.id,
          module: 'camp',
          variables: { name: reg.first_name ?? name.split(' ')[0] ?? 'Friend', full_name: name },
        })
      }
    } else {
      const { loadMembersPage } = await import('@/lib/actions/core-data')
      const { data: members } = await loadMembersPage(1, 500, needle || undefined)
      const filtered = filterMembersByModule(members ?? [], 'church')
      for (const member of filtered) {
        const r = memberToRecipient(member, 'church')
        if (r) recipients.push(r)
      }
    }

    return { data: recipients.slice(0, limit), error: null, loading: false }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to search recipients',
      loading: false,
    }
  }
}

export async function resolveGroupRecipientsAction(params: {
  group_id: string
  module: CommsModule
}): Promise<ApiResponse<CommsRecipient[]>> {
  if (!isConvexDataSource()) {
    return { data: null, error: convexUnavailable(), loading: false }
  }

  try {
    const { listGroupMembershipsFromConvex } = await import('@/lib/convex/core-bridge')
    const { attachUsersToMembers, loadMembersPage } = await import('@/lib/actions/core-data')
    const memberships = await listGroupMembershipsFromConvex(params.group_id)
    const memberIds = new Set(memberships.map((m) => m.member_id))
    const { data: allMembers } = await loadMembersPage(1, 1000)
    const groupMembers = (allMembers ?? []).filter((m) => memberIds.has(m.id))
    const enriched = await attachUsersToMembers(groupMembers)
    const filtered = filterMembersByModule(enriched, params.module)
    const recipients = filtered
      .map((m) => memberToRecipient(m, params.module))
      .filter((r): r is CommsRecipient => r != null)
    return { data: recipients, error: null, loading: false }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to load group members',
      loading: false,
    }
  }
}

export async function sendCommsAction(
  request: Omit<SendCommsRequest, 'sender_id'> & {
    sender_id: string
    manual_recipients?: string
  }
): Promise<ApiResponse<SendCommsResult>> {
  if (!isConvexDataSource()) {
    return { data: null, error: convexUnavailable(), loading: false }
  }
  if (!request.sender_id) {
    return { data: null, error: 'Sender is required', loading: false }
  }
  if (!request.message_body?.trim()) {
    return { data: null, error: 'Message is required', loading: false }
  }

  let recipients = [...request.recipients]
  if (request.manual_recipients?.trim()) {
    recipients = [
      ...recipients,
      ...parseManualRecipients(request.manual_recipients, request.channel, request.module),
    ]
  }

  const unique = new Map<string, CommsRecipient>()
  for (const r of recipients) {
    const key = `${r.entity_type}:${r.entity_id}:${r.email ?? ''}:${r.phone ?? ''}`
    if (!unique.has(key)) unique.set(key, r)
  }
  recipients = Array.from(unique.values())

  if (recipients.length === 0) {
    return { data: null, error: 'Select at least one recipient', loading: false }
  }

  try {
    const data = await sendCommunications({
      module: request.module,
      channel: request.channel,
      audience_type: request.audience_type,
      sender_id: request.sender_id,
      subject: request.subject,
      message_body: request.message_body,
      recipients,
      filter_criteria: request.filter_criteria,
      metadata: request.metadata,
      dry_run: request.dry_run,
      force_mock: request.force_mock,
    })
    return { data, error: null, loading: false }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to send messages',
      loading: false,
    }
  }
}

/** Resend a logged message (sent / failed / delivered / bounced) as a new outbound. */
export async function resendCommunicationAction(input: {
  sender_id: string
  record: Pick<
    CommunicationRecord,
    | 'id'
    | 'module'
    | 'channel'
    | 'audience_type'
    | 'recipient_name'
    | 'recipient_email'
    | 'recipient_phone'
    | 'recipient_entity_type'
    | 'recipient_entity_id'
    | 'subject'
    | 'message_body'
    | 'status'
  >
}): Promise<ApiResponse<SendCommsResult>> {
  if (!isConvexDataSource()) {
    return { data: null, error: convexUnavailable(), loading: false }
  }
  if (!input.sender_id) {
    return { data: null, error: 'Sender is required', loading: false }
  }

  const { record } = input
  const resendable = new Set(['sent', 'delivered', 'failed', 'bounced'])
  if (!resendable.has(record.status)) {
    return {
      data: null,
      error: `Cannot resend a message with status "${record.status}"`,
      loading: false,
    }
  }
  if (!record.message_body?.trim()) {
    return { data: null, error: 'Original message body is empty', loading: false }
  }
  if (record.channel === 'email' && !record.recipient_email?.trim()) {
    return { data: null, error: 'No recipient email on this message', loading: false }
  }
  if (record.channel === 'sms' && !record.recipient_phone?.trim()) {
    return { data: null, error: 'No recipient phone on this message', loading: false }
  }
  if (record.channel === 'sms' && !isValidSmsPhone(record.recipient_phone)) {
    return {
      data: null,
      error: `Invalid phone for resend: ${normalizeSmsPhone(record.recipient_phone || '') || 'empty'}`,
      loading: false,
    }
  }
  if (record.channel === 'email' && !record.subject?.trim()) {
    return { data: null, error: 'Original email has no subject', loading: false }
  }

  const entityType = record.recipient_entity_type ?? 'manual'
  const entityId = record.recipient_entity_id ?? `resend-${record.id}`
  const recipient: CommsRecipient = {
    id: entityId,
    name: record.recipient_name?.trim() || 'Recipient',
    email: record.recipient_email,
    phone: record.recipient_phone,
    entity_type: entityType,
    entity_id: entityId,
    module: record.module,
  }

  try {
    const data = await sendCommunications({
      module: record.module,
      channel: record.channel,
      audience_type: 'individual',
      sender_id: input.sender_id,
      subject: record.channel === 'email' ? record.subject : undefined,
      message_body: record.message_body,
      recipients: [recipient],
      metadata: {
        resend_of: record.id,
        original_status: record.status,
      },
    })
    return { data, error: null, loading: false }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to resend message',
      loading: false,
    }
  }
}

export async function loadCommsGroupsAction(): Promise<
  ApiResponse<Array<{ id: string; name: string; group_type: string }>>
> {
  try {
    const { loadGroupsPage } = await import('@/lib/actions/core-data')
    const { data } = await loadGroupsPage(1, 200)
    return {
      data: (data ?? []).map((g) => ({ id: g.id, name: g.name, group_type: g.group_type })),
      error: null,
      loading: false,
    }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to load groups',
      loading: false,
    }
  }
}
