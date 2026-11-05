'use server'

/**
 * Events with tap-to-RSVP.
 * - Staff (groups.manage): create/edit events, build the invite list, see the headcount.
 *   Texting invites also needs sms.send.
 * - Public `/e/<token>`: the token is the credential (asSystem, rate-limited, format-checked
 *   before any DB hit). Shows only the invitee's first name and the event.
 * - Signed-in members: their own upcoming events and answers.
 */
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { asSystem, guard } from '@/lib/auth/action-guard'
import { hasPermission } from '@/lib/auth/roles'
import type { ApiResponse } from '@/lib/services/api-types'
import type { CommsRecipient } from '@/lib/comms/types'
import type { EventInvitee, EventWithTally, MyEvent, PublicRsvpContext } from '@/lib/convex/events-bridge'
import {
  type ChurchEvent,
  type EventInput,
  type InviteMode,
  type RsvpResponse,
  clampGuests,
  eventLinkUrl,
  inviteVariables,
  isRsvpResponse,
  isRsvpTokenFormat,
  needsSend,
  newRsvpToken,
  validateEventInput,
} from '@/lib/events/rsvp'
import { createRateLimiter } from '@/lib/events/rate-limit'
import { siteOrigin } from '@/lib/site-url'

function ok<T>(data: T): ApiResponse<T> {
  return { data, error: null, loading: false }
}

function fail<T>(error: unknown, fallback: string): ApiResponse<T> {
  if (typeof error === 'string') return { data: null, error, loading: false }
  return { data: null, error: error instanceof Error ? error.message : fallback, loading: false }
}

function hasConvex(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_CONVEX_URL)
}

const bridge = () => import('@/lib/convex/events-bridge')

// ---------------------------------------------------------------------------
// Staff
// ---------------------------------------------------------------------------

export async function listEventsAction(): Promise<ApiResponse<EventWithTally[]>> {
  await guard('groups.manage')
  if (!hasConvex()) return fail('Database is not configured.', '')
  try {
    return ok(await (await bridge()).listEventsFromConvex())
  } catch (error) {
    return fail(error, 'Could not load events')
  }
}

export type EventDetail = {
  event: ChurchEvent
  rsvps: EventInvitee[]
  group_name?: string
  /** For the SMS preview's sample link. */
  link_origin: string
}

export async function getEventAction(id: string): Promise<ApiResponse<EventDetail>> {
  await guard('groups.manage')
  if (!hasConvex()) return fail('Database is not configured.', '')
  try {
    const found = await (await bridge()).getEventFromConvex(id)
    if (!found) return fail('Event not found.', '')
    let group_name: string | undefined
    if (found.event.group_id) {
      const { fetchGroupFromConvex } = await import('@/lib/convex/core-bridge')
      group_name = (await fetchGroupFromConvex(found.event.group_id).catch(() => null))?.name
    }
    return ok({ ...found, group_name, link_origin: siteOrigin() })
  } catch (error) {
    return fail(error, 'Could not load the event')
  }
}

export async function saveEventAction(input: Partial<EventInput> & { id?: string }): Promise<ApiResponse<{ id: string }>> {
  const user = await guard('groups.manage')
  if (!hasConvex()) return fail('Database is not configured.', '')
  const checked = validateEventInput(input)
  if (!checked.ok) return fail(checked.error, '')
  try {
    const b = await bridge()
    let id = input.id
    if (id) await b.updateEventInConvex(id, checked.value)
    else id = await b.createEventInConvex(checked.value, user?.id ?? 'system')
    try {
      revalidatePath('/admin/events')
    } catch {
      // not critical
    }
    return ok({ id })
  } catch (error) {
    return fail(error, 'Could not save the event')
  }
}

/** User ids of active members in the audience (all members, or one group). */
async function resolveAudienceUserIds(event: ChurchEvent): Promise<string[]> {
  const core = await import('@/lib/convex/core-bridge')
  const members = await core.fetchMembersFromConvex()
  const byId = new Map(members.map((m) => [m.id, m]))
  const byUser = new Map(members.filter((m) => m.user_id).map((m) => [m.user_id, m]))
  const ids = new Set<string>()

  if (event.audience === 'all') {
    const { filterMembersByModule } = await import('@/lib/comms/recipients')
    for (const m of filterMembersByModule(members, 'church')) {
      if (m.user_id && m.status !== 'inactive' && m.status !== 'transferred') ids.add(m.user_id)
    }
  } else if (event.audience === 'group' && event.group_id) {
    for (const row of await core.listGroupMembershipsFromConvex(event.group_id)) {
      const member = byId.get(row.member_id) ?? byUser.get(row.member_id)
      if (member?.user_id) ids.add(member.user_id)
    }
  }
  return Array.from(ids)
}

/**
 * Make sure everyone in the audience has an invite (with a personal token). For a custom
 * audience, adds the chosen people. Nobody is texted here.
 */
export async function addEventInviteesAction(input: {
  event_id: string
  user_ids?: string[]
}): Promise<ApiResponse<{ added: number }>> {
  await guard('groups.manage')
  if (!hasConvex()) return fail('Database is not configured.', '')
  try {
    const b = await bridge()
    const found = await b.getEventFromConvex(input.event_id)
    if (!found) return fail('Event not found.', '')
    const wanted = new Set<string>(input.user_ids?.slice(0, 2000) ?? [])
    if (found.event.audience !== 'custom') for (const id of await resolveAudienceUserIds(found.event)) wanted.add(id)
    for (const r of found.rsvps) wanted.delete(r.user_id)
    const added = await b.addInviteesInConvex(
      input.event_id,
      Array.from(wanted).map((user_id) => ({ user_id, token: newRsvpToken() }))
    )
    return ok({ added })
  } catch (error) {
    return fail(error, 'Could not update the invite list')
  }
}

export async function removeEventInviteeAction(rsvpId: string): Promise<ApiResponse<true>> {
  await guard('groups.manage')
  try {
    await (await bridge()).removeInviteeInConvex(rsvpId)
    return ok(true)
  } catch (error) {
    return fail(error, 'Could not remove the invitee')
  }
}

export type EventSendResult = { success_count: number; error_count: number; skipped: number; errors: string[] }

/**
 * Text personal RSVP links. `mode: 'new'` only reaches people never invited; `'reminder'`
 * only invited people who haven't answered. Called in chunks by the background-job runner.
 * Message placeholders: {{name}} {{event}} {{date}} {{location}} {{link}}.
 */
export async function sendEventInvitesAction(input: {
  event_id: string
  rsvp_ids: string[]
  message: string
  mode: InviteMode
  batch_id?: string
  dry_run?: boolean
}): Promise<ApiResponse<EventSendResult>> {
  const user = await guard('groups.manage')
  if (user && !hasPermission(user.role, 'sms.send', user.permissions)) {
    return fail('Sending texts needs the "Send SMS" permission.', '')
  }
  if (!hasConvex()) return fail('Database is not configured.', '')
  const message = input.message?.trim()
  if (!message) return fail('Write a message first.', '')
  if (!/\{\{link\}\}/.test(message)) return fail('The message must include {{link}} so people can RSVP.', '')
  if (!input.rsvp_ids?.length) return fail('No recipients.', '')
  if (input.rsvp_ids.length > 100) return fail('Send at most 100 per request.', '')

  try {
    const b = await bridge()
    const found = await b.getEventFromConvex(input.event_id)
    if (!found) return fail('Event not found.', '')
    if (found.event.status !== 'published') return fail('Publish the event before inviting people.', '')
    const targets = await b.listSendTargetsFromConvex(input.event_id, input.rsvp_ids)
    const { isValidSmsPhone } = await import('@/lib/comms/sms-client')
    const { sendCommunications } = await import('@/lib/comms/send')
    const origin = siteOrigin()

    let skipped = input.rsvp_ids.length - targets.length
    const recipients: CommsRecipient[] = []
    for (const t of targets) {
      if (!needsSend(t, input.mode) || !isValidSmsPhone(t.phone) || t.sms_opt_out) {
        skipped++
        continue
      }
      const vars = inviteVariables(found.event, t.first_name, eventLinkUrl(origin, t.token))
      recipients.push({
        id: t.rsvp_id,
        name: t.name,
        phone: t.phone,
        entity_type: 'member',
        entity_id: t.user_id,
        module: 'church',
        variables: vars,
      })
    }
    if (!recipients.length) return ok({ success_count: 0, error_count: 0, skipped, errors: [] })

    const result = await sendCommunications({
      module: 'church',
      channel: 'sms',
      audience_type: 'bulk',
      sender_id: user?.id ?? 'system',
      message_body: message,
      recipients,
      batch_id: input.batch_id,
      dry_run: Boolean(input.dry_run),
      filter_criteria: { event_id: input.event_id, mode: input.mode },
      metadata: { type: 'event_invite', event_id: input.event_id, event_title: found.event.title, mode: input.mode },
    })

    if (!input.dry_run) {
      // records are in recipient order; a 'sent' record means that invitee was texted.
      const sentIds = result.records
        .map((rec, i) => (rec.status === 'sent' ? recipients[i]?.id : undefined))
        .filter((id): id is string => Boolean(id))
      await b.markSentInConvex(sentIds, input.mode === 'new' ? 'invite' : 'reminder')
    }
    return ok({ success_count: result.success_count, error_count: result.error_count, skipped, errors: result.errors })
  } catch (error) {
    return fail(error, 'Could not send invites')
  }
}

// ---------------------------------------------------------------------------
// Public /e/<token>
// ---------------------------------------------------------------------------

const viewLimiter = createRateLimiter({ limit: 30, windowMs: 60_000 })
const answerLimiter = createRateLimiter({ limit: 10, windowMs: 60_000 })
const ipLimiter = createRateLimiter({ limit: 120, windowMs: 60_000 })

async function clientIp(): Promise<string> {
  try {
    const h = await headers()
    return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown'
  } catch {
    return 'unknown'
  }
}

export type PublicRsvpView = PublicRsvpContext

export async function getPublicRsvpAction(token: string): Promise<PublicRsvpView | null> {
  return asSystem(async () => {
    if (!isRsvpTokenFormat(token) || !hasConvex()) return null
    if (!ipLimiter.allow(await clientIp()) || !viewLimiter.allow(token)) return null
    try {
      return await (await bridge()).getRsvpByTokenFromConvex(token)
    } catch (error) {
      console.error('[events] rsvp lookup failed', error)
      return null
    }
  })
}

export async function respondPublicRsvpAction(input: {
  token: string
  response: RsvpResponse
  guests?: number
}): Promise<{ ok: boolean; error: string | null; full?: boolean; view?: PublicRsvpView | null }> {
  return asSystem(async () => {
    if (!isRsvpTokenFormat(input.token)) return { ok: false, error: 'This link is not valid.' }
    if (!isRsvpResponse(input.response)) return { ok: false, error: 'Choose an answer.' }
    if (!ipLimiter.allow(await clientIp()) || !answerLimiter.allow(input.token)) {
      return { ok: false, error: 'Too many tries. Wait a minute and try again.' }
    }
    try {
      const b = await bridge()
      const res = await b.respondRsvpInConvex({
        token: input.token,
        response: input.response,
        guests: clampGuests(input.guests),
      })
      const view = await b.getRsvpByTokenFromConvex(input.token)
      return { ok: res.ok, error: res.ok ? null : res.error ?? 'Could not save your answer.', full: res.full, view }
    } catch (error) {
      console.error('[events] rsvp answer failed', error)
      return { ok: false, error: 'Something went wrong. Please try again.' }
    }
  })
}

// ---------------------------------------------------------------------------
// Signed-in member
// ---------------------------------------------------------------------------

export async function listMyEventsAction(): Promise<ApiResponse<MyEvent[]>> {
  const user = await guard('dashboard.view')
  if (!user) return fail('Sign in again.', '')
  if (!hasConvex()) return ok([])
  try {
    return ok(await (await bridge()).listMyEventsFromConvex(user.id))
  } catch (error) {
    return fail(error, 'Could not load your events')
  }
}

export async function respondMyEventAction(input: {
  event_id: string
  response: RsvpResponse
  guests?: number
}): Promise<{ ok: boolean; error: string | null; full?: boolean }> {
  const user = await guard('dashboard.view')
  if (!user) return { ok: false, error: 'Sign in again.' }
  if (!isRsvpResponse(input.response)) return { ok: false, error: 'Choose an answer.' }
  try {
    const res = await (await bridge()).respondRsvpInConvex({
      event_id: input.event_id,
      user_id: user.id,
      response: input.response,
      guests: clampGuests(input.guests),
    })
    return { ok: res.ok, error: res.ok ? null : res.error ?? 'Could not save your answer.', full: res.full }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Could not save your answer.' }
  }
}
