'use server'

/**
 * Calling sessions: the call team meets (in a room or on a call), everyone opens the session on
 * their phone, and taps "Next person" to get someone nobody else is calling. A live board shows
 * who is calling and how it is going. Plus the WhatsApp templates callers pick from.
 *
 * - Joining, taking the next person and recording outcomes: `camp.calls`.
 * - Starting or ending a session, and editing templates: `camp.manage`.
 * Callers only ever receive what they need to make the call (no health or guardian details).
 */
import { revalidatePath } from 'next/cache'
import { guard } from '@/lib/auth/action-guard'
import { hasPermission } from '@/lib/auth/roles'
import type { AppUser, CampAttendanceConfirmation, CampRegistration, CampYear } from '@/lib/types'
import { isCallOutcome, summarizeCallCampaign } from '@/lib/camp/call-campaign'
import { CLAIM_TTL_MS, isCallSegment, orderQueue, remainingFor, tallySession, type CallSegment } from '@/lib/calls/queue'
import { cleanTemplateInput, templatesFor, type CallTemplate, type TemplateAudience } from '@/lib/calls/templates'

/** A session's board treats anyone seen within this as still in the room. */
const PRESENT_MS = 90_000

export type CallTarget = Pick<
  CampRegistration,
  | 'id'
  | 'full_name'
  | 'first_name'
  | 'phone'
  | 'whatsapp'
  | 'residence'
  | 'sex'
  | 'is_new_registrant'
  | 'times_attended'
  | 'attendance_confirmation'
  | 'confirmation_note'
  | 'call_attempts'
  | 'last_called_at'
  | 'status'
>

export type SessionState = {
  year: Pick<CampYear, 'id' | 'year' | 'theme' | 'start_date' | 'end_date' | 'venue'> | null
  listKey: string | null
  session: { id: string; title: string; segment: CallSegment; started_at: number; started_by_name: string } | null
  /** People still to reach, by segment (including those resting after no answer). */
  remaining: Record<CallSegment, number>
  progress: { total: number; confirmed: number; declined: number; open: number; expected: number }
  board: {
    present: Array<{ user_id: string; name: string; calls: number; confirmed: number; on: string | null }>
    recent: Array<{ caller: string; name: string; outcome: string; at: number }>
    calls: number
    byOutcome: Record<string, number>
  } | null
  /** Who this caller is on right now (survives a reload). */
  current: CallTarget | null
  me: { id: string; full_name: string }
  canManage: boolean
}

function toTarget(r: CampRegistration): CallTarget {
  return {
    id: r.id,
    full_name: r.full_name,
    first_name: r.first_name,
    phone: r.phone,
    whatsapp: r.whatsapp,
    residence: r.residence,
    sex: r.sex,
    is_new_registrant: r.is_new_registrant,
    times_attended: r.times_attended,
    attendance_confirmation: r.attendance_confirmation,
    confirmation_note: r.confirmation_note,
    call_attempts: r.call_attempts,
    last_called_at: r.last_called_at,
    status: r.status,
  }
}

async function campContext(yearId?: string | null) {
  const bridge = await import('@/lib/convex/camp-bridge')
  const year = yearId
    ? await bridge.fetchCampYearByIdFromConvex(yearId)
    : (await bridge.fetchActiveCampYearFromConvex()) ??
      [...(await bridge.fetchAllCampYearsFromConvex())].sort((a, b) => b.year - a.year)[0] ??
      null
  const registrations = year ? await bridge.fetchRegistrationsFromConvex(year.id) : []
  return { bridge, year, registrations, listKey: year ? `camp:${year.id}` : null }
}

function errorOf(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

/**
 * Everything the session screen shows, polled every few seconds. While a session is live this also
 * says "I'm here" for the caller, so the board knows who is in the room.
 */
export async function getSessionStateAction(yearId?: string | null): Promise<{ data: SessionState | null; error: string | null }> {
  try {
    const user = (await guard('camp.calls')) as AppUser | null
    if (!user) throw new Error('Sign in to join the calls.')
    const canManage = hasPermission(user.role, 'camp.manage', user.permissions)
    const { year, registrations, listKey } = await campContext(yearId)
    const cc = await import('@/lib/convex/call-center-bridge')
    const live = listKey ? await cc.getLiveSession(listKey) : null
    const summary = summarizeCallCampaign(registrations)

    let board: SessionState['board'] = null
    let current: CallTarget | null = null
    let startedByName = ''
    if (live && listKey) {
      await cc.heartbeat({ session_id: live.id, user_id: user.id, name: user.full_name })
      const [record, claims] = await Promise.all([cc.getSessionBoard(live.id), cc.listClaims(listKey)])
      const tally = tallySession(record.outcomes)
      const names = new Map(record.people.map((p) => [p.user_id, p.name]))
      const regName = new Map(registrations.map((r) => [r.id, r.full_name]))
      const onWhom = new Map(claims.map((c) => [c.caller_id, c.target_id]))
      const now = Date.now()
      board = {
        present: record.people
          .filter((p) => now - p.last_seen < PRESENT_MS)
          .map((p) => {
            const row = tally.byCaller.get(p.user_id)
            const on = onWhom.get(p.user_id)
            return { user_id: p.user_id, name: p.name, calls: row?.total ?? 0, confirmed: row?.confirmed ?? 0, on: on ? (regName.get(on) ?? null) : null }
          })
          .sort((a, b) => b.calls - a.calls || a.name.localeCompare(b.name)),
        recent: [...record.outcomes]
          .sort((a, b) => b.at - a.at)
          .slice(0, 12)
          .map((o) => ({ caller: names.get(o.caller_id) ?? 'Someone', name: o.target_name, outcome: o.outcome, at: o.at })),
        calls: tally.total,
        byOutcome: tally.byOutcome,
      }
      const held = onWhom.get(user.id)
      const reg = held ? registrations.find((r) => r.id === held) : undefined
      current = reg ? toTarget(reg) : null
      if (live.started_by === user.id) startedByName = user.full_name
      else startedByName = names.get(live.started_by) ?? ''
    }

    return {
      data: {
        year: year ? { id: year.id, year: year.year, theme: year.theme, start_date: year.start_date, end_date: year.end_date, venue: year.venue } : null,
        listKey,
        session: live
          ? { id: live.id, title: live.title, segment: isCallSegment(live.segment) ? live.segment : 'all', started_at: live.started_at, started_by_name: startedByName }
          : null,
        remaining: {
          all: remainingFor(registrations, 'all'),
          new: remainingFor(registrations, 'new'),
          returning: remainingFor(registrations, 'returning'),
        },
        progress: {
          total: summary.total,
          confirmed: summary.byOutcome.confirmed,
          declined: summary.byOutcome.declined,
          open: summary.open,
          expected: summary.expected,
        },
        board,
        current,
        me: { id: user.id, full_name: user.full_name },
        canManage,
      },
      error: null,
    }
  } catch (error: unknown) {
    return { data: null, error: errorOf(error, 'Could not load the session') }
  }
}

/** Is the team calling together right now? (A light check for banners: it does not join anyone.) */
export async function getLiveSessionInfoAction(yearId?: string | null): Promise<{ data: { title: string; startedAt: number } | null; error: string | null }> {
  try {
    await guard('camp.calls')
    const bridge = await import('@/lib/convex/camp-bridge')
    const year = yearId ? await bridge.fetchCampYearByIdFromConvex(yearId) : await bridge.fetchActiveCampYearFromConvex()
    if (!year) return { data: null, error: null }
    const cc = await import('@/lib/convex/call-center-bridge')
    const live = await cc.getLiveSession(`camp:${year.id}`)
    return { data: live ? { title: live.title, startedAt: live.started_at } : null, error: null }
  } catch (error: unknown) {
    return { data: null, error: errorOf(error, 'Could not check for a session') }
  }
}

/** Start the team's calling session (or open the one already live). */
export async function startCallSessionAction(input: { yearId?: string | null; segment: CallSegment; title?: string }): Promise<{ error: string | null }> {
  try {
    const user = (await guard('camp.manage')) as AppUser | null
    if (!user) throw new Error('Sign in to start a session.')
    const { year, listKey } = await campContext(input.yearId)
    if (!year || !listKey) throw new Error('Create a camp year first.')
    const cc = await import('@/lib/convex/call-center-bridge')
    const segment = isCallSegment(input.segment) ? input.segment : 'all'
    const session = await cc.startSession({
      list_key: listKey,
      title: input.title?.trim() || `Camp Meeting ${year.year} calls`,
      segment,
      started_by: user.id,
    })
    if (session.segment !== segment) await cc.setSessionSegment(session.id, segment)
    await cc.heartbeat({ session_id: session.id, user_id: user.id, name: user.full_name })
    revalidatePath('/admin/camp-meeting/calls')
    return { error: null }
  } catch (error: unknown) {
    return { error: errorOf(error, 'Could not start the session') }
  }
}

/** Change who the live session works through. */
export async function setSessionSegmentAction(input: { sessionId: string; segment: CallSegment }): Promise<{ error: string | null }> {
  try {
    await guard('camp.manage')
    if (!isCallSegment(input.segment)) throw new Error('Choose who to call.')
    const cc = await import('@/lib/convex/call-center-bridge')
    await cc.setSessionSegment(input.sessionId, input.segment)
    return { error: null }
  } catch (error: unknown) {
    return { error: errorOf(error, 'Could not change the session') }
  }
}

/** End the session for everyone. */
export async function endCallSessionAction(input: { sessionId: string }): Promise<{ error: string | null }> {
  try {
    await guard('camp.manage')
    const cc = await import('@/lib/convex/call-center-bridge')
    await cc.endSession(input.sessionId)
    revalidatePath('/admin/camp-meeting/calls')
    return { error: null }
  } catch (error: unknown) {
    return { error: errorOf(error, 'Could not end the session') }
  }
}

/**
 * The next person for this caller: someone still to reach in the session's group, that nobody
 * else holds. `skip` are the ones this caller passed over (they go to the back of the queue).
 */
export async function nextCallAction(input: { yearId?: string | null; skip?: string[] }): Promise<{ data: CallTarget | null; done: boolean; error: string | null }> {
  try {
    const user = (await guard('camp.calls')) as AppUser | null
    if (!user) throw new Error('Sign in to make calls.')
    const { registrations, listKey } = await campContext(input.yearId)
    if (!listKey) throw new Error('There is no camp year to call for.')
    const cc = await import('@/lib/convex/call-center-bridge')
    const live = await cc.getLiveSession(listKey)
    if (!live) throw new Error('The session has ended.')
    const segment = isCallSegment(live.segment) ? live.segment : 'all'
    const candidates = orderQueue(registrations, { segment, skip: (input.skip ?? []).slice(0, 500) })
    const id = await cc.claimNext({ list_key: listKey, caller_id: user.id, candidate_ids: candidates, ttl_ms: CLAIM_TTL_MS })
    const reg = id ? registrations.find((r) => r.id === id) : undefined
    return { data: reg ? toTarget(reg) : null, done: !reg, error: null }
  } catch (error: unknown) {
    return { data: null, done: false, error: errorOf(error, 'Could not get the next person') }
  }
}

/** Pass on this person for now: they go back in the queue for others. */
export async function skipCallAction(input: { yearId?: string | null; registrationId: string }): Promise<{ error: string | null }> {
  try {
    const user = (await guard('camp.calls')) as AppUser | null
    if (!user) throw new Error('Sign in to make calls.')
    const { listKey } = await campContext(input.yearId)
    if (!listKey) return { error: null }
    const cc = await import('@/lib/convex/call-center-bridge')
    await cc.releaseClaim({ list_key: listKey, caller_id: user.id, target_id: input.registrationId })
    return { error: null }
  } catch (error: unknown) {
    return { error: errorOf(error, 'Could not skip') }
  }
}

/**
 * What the person said. Only the caller holding them (or a camp manager) can record it; it counts
 * as a call, goes on the board, and lets the person go.
 */
export async function recordSessionCallAction(input: {
  yearId?: string | null
  registrationId: string
  outcome: CampAttendanceConfirmation
  note?: string
}): Promise<{ error: string | null }> {
  try {
    const user = (await guard('camp.calls')) as AppUser | null
    if (!user) throw new Error('Sign in to record calls.')
    if (!isCallOutcome(input.outcome) || input.outcome === 'unconfirmed') throw new Error('Choose what they said.')
    const { bridge, registrations, listKey } = await campContext(input.yearId)
    if (!listKey) throw new Error('There is no camp year to call for.')
    const reg = registrations.find((r) => r.id === input.registrationId)
    if (!reg) throw new Error('This registration no longer exists.')
    const cc = await import('@/lib/convex/call-center-bridge')
    const canManage = hasPermission(user.role, 'camp.manage', user.permissions)
    if (!canManage) {
      const claims = await cc.listClaims(listKey)
      if (!claims.some((c) => c.target_id === reg.id && c.caller_id === user.id)) {
        throw new Error('Someone else has this person now. Tap Next person.')
      }
    }
    await bridge.recordCallOutcomeInConvex({
      registration_id: reg.id,
      outcome: input.outcome,
      note: input.note?.trim().slice(0, 500) || undefined,
      performed_by: user.id,
    })
    const live = await cc.getLiveSession(listKey)
    if (live) {
      await cc.recordSessionOutcome({ session_id: live.id, caller_id: user.id, target_id: reg.id, target_name: reg.full_name, outcome: input.outcome })
    }
    await cc.releaseClaim({ list_key: listKey, caller_id: user.id, target_id: reg.id })
    revalidatePath('/admin/camp-meeting/calls')
    return { error: null }
  } catch (error: unknown) {
    return { error: errorOf(error, 'Could not save the call') }
  }
}

// --- WhatsApp templates ------------------------------------------------------------------------

/** The templates a caller picks from (defaults plus what managers changed), and whether they can edit. */
export async function listCallTemplatesAction(input: { audience: TemplateAudience; includeArchived?: boolean }): Promise<{
  data: CallTemplate[] | null
  canEdit: boolean
  error: string | null
}> {
  try {
    const user = (await guard('camp.calls')) as AppUser | null
    const canEdit = !!user && hasPermission(user.role, 'camp.manage', user.permissions)
    const cc = await import('@/lib/convex/call-center-bridge')
    const saved = await cc.listSavedTemplates()
    return { data: templatesFor(input.audience, saved, { includeArchived: canEdit && input.includeArchived }), canEdit, error: null }
  } catch (error: unknown) {
    return { data: null, canEdit: false, error: errorOf(error, 'Could not load the templates') }
  }
}

/** Save a template (new, edited, hidden or shown again). */
export async function saveCallTemplateAction(input: {
  key?: string
  name: string
  body: string
  audience: TemplateAudience
  position?: number
  archived?: boolean
}): Promise<{ error: string | null; key: string | null }> {
  try {
    const user = (await guard('camp.manage')) as AppUser | null
    if (!user) throw new Error('Sign in to edit templates.')
    const { template, error } = cleanTemplateInput(input)
    if (!template) throw new Error(error ?? 'Check the template.')
    const cc = await import('@/lib/convex/call-center-bridge')
    const saved = await cc.listSavedTemplates()
    if (!input.key && saved.filter((t) => t.audience === template.audience).length >= 40) {
      throw new Error('That is a lot of templates. Hide or reuse one first.')
    }
    await cc.saveTemplate(template, user.id)
    return { error: null, key: template.key }
  } catch (error: unknown) {
    return { error: errorOf(error, 'Could not save the template'), key: null }
  }
}

/** Put one of the app's templates back as it ships (or remove a custom one). */
export async function resetCallTemplateAction(input: { key: string }): Promise<{ error: string | null }> {
  try {
    await guard('camp.manage')
    const cc = await import('@/lib/convex/call-center-bridge')
    await cc.resetTemplate(input.key)
    return { error: null }
  } catch (error: unknown) {
    return { error: errorOf(error, 'Could not reset the template') }
  }
}

// --- Changed numbers ---------------------------------------------------------------------------

/**
 * A registrant's number changed: save the new one on their registration and send every future text
 * meant for the old one to it, across the whole system. The caller must hold or be assigned this
 * person (or manage camp).
 */
export async function setRegistrantNumberAction(input: { yearId?: string | null; registrationId: string; phone: string }): Promise<{
  error: string | null
  phone: string | null
}> {
  try {
    const user = (await guard('camp.calls')) as AppUser | null
    if (!user) throw new Error('Sign in to update numbers.')
    const { isValidSmsPhone, normalizeSmsPhone } = await import('@/lib/comms/sms-client')
    const { smsNumberKey } = await import('@/lib/comms/sms-number')
    if (!isValidSmsPhone(input.phone)) throw new Error('Type a Ghana mobile number, like 024 123 4567.')
    const { bridge, registrations, listKey } = await campContext(input.yearId)
    const reg = registrations.find((r) => r.id === input.registrationId)
    if (!reg) throw new Error('This registration no longer exists.')
    const cc = await import('@/lib/convex/call-center-bridge')
    const canManage = hasPermission(user.role, 'camp.manage', user.permissions)
    if (!canManage && reg.assigned_to !== user.id) {
      const claims = listKey ? await cc.listClaims(listKey) : []
      if (!claims.some((c) => c.target_id === reg.id && c.caller_id === user.id)) {
        throw new Error('Only their caller can change this number.')
      }
    }
    const next = normalizeSmsPhone(input.phone)
    const oldKey = smsNumberKey(reg.phone)
    const newKey = smsNumberKey(next)
    if (oldKey === newKey) return { error: null, phone: reg.phone }
    const sameWhatsApp = !reg.whatsapp || smsNumberKey(reg.whatsapp) === oldKey
    await bridge.patchRegistrationInConvex(reg.id, { phone: next, ...(sameWhatsApp ? { whatsapp: next } : {}) })
    if (oldKey) await cc.setNumberChange({ from_phone: oldKey, to_phone: newKey, set_by: user.id, context: 'camp call' })
    const { forgetNumberChanges } = await import('@/lib/comms/sms-reroute')
    forgetNumberChanges()
    revalidatePath('/admin/camp-meeting/calls')
    return { error: null, phone: next }
  } catch (error: unknown) {
    return { error: errorOf(error, 'Could not save the number'), phone: null }
  }
}

/** The number this caller gets their call list and other texts on (their own, or a changed one). */
export async function getMySmsNumberAction(): Promise<{ data: { account: string; sms: string } | null; error: string | null }> {
  try {
    const user = (await guard('camp.calls')) as AppUser | null
    if (!user) throw new Error('Sign in first.')
    const cc = await import('@/lib/convex/call-center-bridge')
    const { changeMap, preferredSmsNumber } = await import('@/lib/comms/sms-number')
    const account = user.phone ?? ''
    return { data: { account, sms: account ? preferredSmsNumber(account, changeMap(await cc.listNumberChanges())) : '' }, error: null }
  } catch (error: unknown) {
    return { data: null, error: errorOf(error, 'Could not load your number') }
  }
}

/**
 * Texts for this caller go to another number from now on (every text the system sends them). They
 * still sign in with the number on their account.
 */
export async function setMySmsNumberAction(input: { phone: string }): Promise<{ error: string | null }> {
  try {
    const user = (await guard('camp.calls')) as AppUser | null
    if (!user) throw new Error('Sign in first.')
    const { isValidSmsPhone, normalizeSmsPhone } = await import('@/lib/comms/sms-client')
    const { smsNumberKey } = await import('@/lib/comms/sms-number')
    if (!user.phone) throw new Error('Your account has no phone number. Ask an admin to add one.')
    if (!isValidSmsPhone(input.phone)) throw new Error('Type a Ghana mobile number, like 024 123 4567.')
    const cc = await import('@/lib/convex/call-center-bridge')
    await cc.setNumberChange({ from_phone: smsNumberKey(user.phone), to_phone: smsNumberKey(normalizeSmsPhone(input.phone)), set_by: user.id, context: 'own number' })
    const { forgetNumberChanges } = await import('@/lib/comms/sms-reroute')
    forgetNumberChanges()
    return { error: null }
  } catch (error: unknown) {
    return { error: errorOf(error, 'Could not save your number') }
  }
}
