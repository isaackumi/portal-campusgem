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
import { logActivity } from '@/lib/activity/log'

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
  session: { id: string; title: string; segment: CallSegment; sameGender: boolean; started_at: number; started_by_name: string } | null
  /** People still to reach, by segment (including those resting after no answer). */
  remaining: Record<CallSegment, number>
  progress: { total: number; confirmed: number; declined: number; open: number; expected: number }
  board: {
    present: Array<{ user_id: string; name: string; calls: number; confirmed: number; on: string | null }>
    recent: Array<{ caller: string; name: string; outcome: string; at: number }>
    /** My own calls this session, latest first, one per person: to go back and update. */
    mine: Array<{ target: CallTarget; at: number }>
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
        mine: (() => {
          const regById = new Map(registrations.map((r) => [r.id, r]))
          const seen = new Set<string>()
          const rows: Array<{ target: CallTarget; at: number }> = []
          for (const o of [...record.outcomes].sort((a, b) => b.at - a.at)) {
            if (o.caller_id !== user.id || seen.has(o.target_id)) continue
            seen.add(o.target_id)
            const r = regById.get(o.target_id)
            if (r) rows.push({ target: toTarget(r), at: o.at })
            if (rows.length >= 15) break
          }
          return rows
        })(),
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
          ? { id: live.id, title: live.title, segment: isCallSegment(live.segment) ? live.segment : 'all', sameGender: live.same_gender === true, started_at: live.started_at, started_by_name: startedByName }
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
export async function startCallSessionAction(input: { yearId?: string | null; segment: CallSegment; title?: string; sameGender?: boolean }): Promise<{ error: string | null }> {
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
      same_gender: input.sameGender === true,
    })
    if (session.segment !== segment || (session.same_gender === true) !== (input.sameGender === true)) {
      await cc.setSessionSegment(session.id, segment, input.sameGender === true)
    }
    await cc.heartbeat({ session_id: session.id, user_id: user.id, name: user.full_name })
    await logActivity({ category: 'calls', action: 'calls.session_start', summary: `Started a calling session for ${segment === 'all' ? 'everyone' : segment === 'new' ? 'new campers' : 'returning campers'}`, target: { type: 'call_session', id: session.id, label: session.title } })
    revalidatePath('/admin/camp-meeting/calls')
    return { error: null }
  } catch (error: unknown) {
    return { error: errorOf(error, 'Could not start the session') }
  }
}

/** Change who the live session works through. */
export async function setSessionSegmentAction(input: { sessionId: string; segment: CallSegment; sameGender?: boolean }): Promise<{ error: string | null }> {
  try {
    await guard('camp.manage')
    if (!isCallSegment(input.segment)) throw new Error('Choose who to call.')
    const cc = await import('@/lib/convex/call-center-bridge')
    await cc.setSessionSegment(input.sessionId, input.segment, input.sameGender)
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
    await logActivity({ category: 'calls', action: 'calls.session_end', summary: 'Ended the calling session', target: { type: 'call_session', id: input.sessionId } })
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
    const ordered = orderQueue(registrations, { segment, skip: (input.skip ?? []).slice(0, 500) })
    // This caller's rules: who they take (call team), and men to men / women to women when the
    // session says so. People who fit come first; the rest follow, so nobody sits idle.
    const team = (await cc.listCallTeam()).find((t) => t.user_id === user.id)
    let gender = team?.gender ?? null
    if (live.same_gender && !gender) {
      const { fetchMembersFromConvex } = await import('@/lib/convex/core-bridge')
      gender = toGender((await fetchMembersFromConvex().catch(() => [])).find((m) => m.user_id === user.id)?.gender)
    }
    const byId = new Map(registrations.map((r) => [r.id, r]))
    const fits = (id: string) => {
      const r = byId.get(id)
      if (!r) return false
      if (team && team.takes !== 'all' && (team.takes === 'new') !== (r.is_new_registrant === true)) return false
      if (live.same_gender && gender && r.sex && r.sex !== gender) return false
      return true
    }
    const candidates = [...ordered.filter(fits), ...ordered.filter((id) => !fits(id))]
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
    const claims = await cc.listClaims(listKey)
    if (!canManage) {
      // A result can be changed later (they called back, the WhatsApp reply came): only blocked
      // while another caller is on the phone with them right now.
      const other = claims.find((c) => c.target_id === reg.id && c.caller_id !== user.id)
      if (other) throw new Error('Someone else is calling them right now. Try again in a few minutes.')
    }
    const live = await cc.getLiveSession(listKey)
    // When this caller was given this person: the call's length in the history (ignored if stale).
    const mine = claims.find((c) => c.target_id === reg.id && c.caller_id === user.id)
    const startedAt = mine && Date.now() - mine.claimed_at < 60 * 60_000 ? mine.claimed_at : undefined
    await bridge.recordCallOutcomeInConvex({
      registration_id: reg.id,
      outcome: input.outcome,
      note: input.note?.trim().slice(0, 500) || undefined,
      performed_by: user.id,
      ...(live ? { session_id: live.id } : {}),
      ...(startedAt ? { started_at: startedAt } : {}),
    })
    if (live) {
      await cc.recordSessionOutcome({ session_id: live.id, caller_id: user.id, target_id: reg.id, target_name: reg.full_name, outcome: input.outcome })
    }
    await cc.releaseClaim({ list_key: listKey, caller_id: user.id, target_id: reg.id })
    await logActivity({ category: 'calls', action: 'calls.outcome', summary: `Called ${reg.full_name}: ${input.outcome === 'confirmed' ? 'coming' : input.outcome === 'declined' ? 'not coming' : input.outcome === 'maybe' ? 'not sure' : 'no answer'}`, target: { type: 'camp_registration', id: reg.id, label: reg.full_name }, details: input.note ? { note: input.note.slice(0, 200) } : undefined })
    revalidatePath('/admin/camp-meeting/calls')
    return { error: null }
  } catch (error: unknown) {
    return { error: errorOf(error, 'Could not save the call') }
  }
}

/**
 * "They called back": find anyone in this camp's list by name or phone, so a caller can record what
 * they said without waiting for them to come round in the queue.
 */
export async function findCallTargetsAction(input: { yearId?: string | null; query: string }): Promise<{ data: CallTarget[] | null; error: string | null }> {
  try {
    await guard('camp.calls')
    const q = input.query.trim().toLowerCase()
    if (q.length < 2) return { data: [], error: null }
    const digits = q.replace(/\D/g, '')
    const tail = digits.length >= 4 ? digits.slice(-9) : ''
    const { registrations } = await campContext(input.yearId)
    const found = registrations
      .filter((r) => r.status !== 'cancelled')
      .filter((r) => {
        if (r.full_name.toLowerCase().includes(q)) return true
        if (!tail) return false
        return [r.phone, r.whatsapp].some((ph) => (ph ?? '').replace(/\D/g, '').includes(tail))
      })
      .slice(0, 8)
      .map(toTarget)
    return { data: found, error: null }
  } catch (error: unknown) {
    return { data: null, error: errorOf(error, 'Could not search') }
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
    await logActivity({ category: 'calls', action: 'calls.template_save', summary: `Saved the WhatsApp message "${template.name}"${template.archived ? ' (hidden)' : ''}`, target: { type: 'message_template', id: template.key, label: template.name } })
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
    await logActivity({ category: 'calls', action: 'calls.template_reset', summary: 'Put a WhatsApp message back as it was', target: { type: 'message_template', id: input.key } })
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
    await logActivity({ category: 'calls', action: 'calls.number_change', summary: `Saved a new number for ${reg.full_name}`, target: { type: 'camp_registration', id: reg.id, label: reg.full_name } })
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
    await logActivity({ category: 'access', action: 'access.own_sms_number', summary: 'Changed the number their texts go to' })
    return { error: null }
  } catch (error: unknown) {
    return { error: errorOf(error, 'Could not save your number') }
  }
}

// --- Inviting the team -------------------------------------------------------------------------

export type SessionInvitee = { id: string; name: string; phone: string; message: string }

/** Everyone who can make calls and has a number, minus anyone who replied STOP (and the sender). */
async function inviteesFor(sender: AppUser): Promise<{ link: string; invitees: SessionInvitee[]; optedOut: number }> {
  const { fetchUsersFromConvex } = await import('@/lib/convex/core-bridge')
  const { isValidSmsPhone } = await import('@/lib/comms/sms-client')
  const { loadSmsOptOutSet, isOptedOut } = await import('@/lib/comms/opt-out')
  const { siteOrigin } = await import('@/lib/site-url')
  const { buildSessionInviteSms, sessionLink } = await import('@/lib/calls/invite')
  const link = sessionLink(siteOrigin())
  const [users, optOut] = await Promise.all([fetchUsersFromConvex(), loadSmsOptOutSet()])
  let optedOut = 0
  const invitees: SessionInvitee[] = []
  for (const u of users) {
    if (u.id === sender.id || !u.phone || !isValidSmsPhone(u.phone)) continue
    if (!hasPermission(u.role, 'camp.calls', u.permissions)) continue
    if (isOptedOut(optOut, u.phone)) {
      optedOut += 1
      continue
    }
    invitees.push({ id: u.id, name: u.full_name, phone: u.phone, message: buildSessionInviteSms({ name: u.full_name, starter: sender.full_name, link }) })
  }
  invitees.sort((a, b) => a.name.localeCompare(b.name))
  return { link, invitees, optedOut }
}

/** The link to join, and who "Text the team" would reach (for the preview). */
export async function getSessionInviteAction(): Promise<{
  data: { link: string; invitees: SessionInvitee[]; optedOut: number; canText: boolean } | null
  error: string | null
}> {
  try {
    const user = (await guard('camp.calls')) as AppUser | null
    if (!user) throw new Error('Sign in first.')
    const { siteOrigin } = await import('@/lib/site-url')
    const { sessionLink } = await import('@/lib/calls/invite')
    const canText = hasPermission(user.role, 'camp.manage', user.permissions) && hasPermission(user.role, 'sms.send', user.permissions)
    if (!canText) return { data: { link: sessionLink(siteOrigin()), invitees: [], optedOut: 0, canText }, error: null }
    const { link, invitees, optedOut } = await inviteesFor(user)
    return { data: { link, invitees, optedOut, canText }, error: null }
  } catch (error: unknown) {
    return { data: null, error: errorOf(error, 'Could not load the team') }
  }
}

/**
 * Text the session link to the chosen callers. The list is worked out again here (only people who
 * can make calls, with a number, who haven't opted out), whatever the page sent.
 */
export async function textTeamSessionLinkAction(input: { userIds: string[] }): Promise<{
  data: { sent: number; failed: Array<{ name: string; reason: string }> } | null
  error: string | null
}> {
  try {
    const user = (await guard('camp.manage')) as AppUser | null
    if (!user) throw new Error('Sign in first.')
    if (!hasPermission(user.role, 'sms.send', user.permissions)) throw new Error('You need the "Send SMS" permission to text the team.')
    const { sendSms, isSmsConfigured } = await import('@/lib/comms/sms-client')
    if (!isSmsConfigured()) throw new Error('SMS is not configured on this server.')
    const { listKey } = await campContext(null)
    const cc = await import('@/lib/convex/call-center-bridge')
    if (!listKey || !(await cc.getLiveSession(listKey))) throw new Error('Start the session first, then invite the team.')
    const wanted = new Set(input.userIds)
    const { invitees } = await inviteesFor(user)
    const chosen = invitees.filter((i) => wanted.has(i.id))
    if (!chosen.length) throw new Error('Choose who to text.')
    let sent = 0
    const failed: Array<{ name: string; reason: string }> = []
    for (const person of chosen) {
      const result = await sendSms(person.phone, person.message)
      if (result.success) sent += 1
      else failed.push({ name: person.name, reason: result.error ?? 'Not sent' })
    }
    await logActivity({ category: 'sms', action: 'sms.session_invite', outcome: sent === 0 && failed.length ? 'failed' : 'ok', summary: `Texted ${sent} ${sent === 1 ? 'caller' : 'callers'} the calling session link${failed.length ? ` (${failed.length} not sent)` : ''}` })
    return { data: { sent, failed }, error: null }
  } catch (error: unknown) {
    return { data: null, error: errorOf(error, 'Could not text the team') }
  }
}

// --- Call team and sharing out ------------------------------------------------------------------

export type TeamMemberView = {
  user_id: string
  name: string
  phone: string | null
  gender: 'Male' | 'Female' | null
  takes: 'all' | 'new' | 'returning'
  max: number | null
  active: boolean
  /** Holds camp.calls, so they can open their list in the app (else: texts only). */
  canUseApp: boolean
  /** Open calls already theirs this camp. */
  open: number
}

export type TeamCandidate = { id: string; name: string; phone: string | null; canUseApp: boolean; gender: 'Male' | 'Female' | null }

const toGender = (g: unknown): 'Male' | 'Female' | null => (g === 'male' || g === 'Male' ? 'Male' : g === 'female' || g === 'Female' ? 'Female' : null)

/** The call team, everyone who could join it, and each caller's open calls. */
export async function getCallTeamAction(yearId?: string | null): Promise<{
  data: { team: TeamMemberView[]; candidates: TeamCandidate[]; sessionPeople: Array<{ user_id: string; name: string }> } | null
  error: string | null
}> {
  try {
    await guard('camp.manage')
    const { fetchUsersFromConvex, fetchMembersFromConvex } = await import('@/lib/convex/core-bridge')
    const cc = await import('@/lib/convex/call-center-bridge')
    const { registrations, listKey } = await campContext(yearId)
    const { progressByCaller } = await import('@/lib/camp/call-campaign')
    const [users, members, team] = await Promise.all([fetchUsersFromConvex(), fetchMembersFromConvex().catch(() => []), cc.listCallTeam()])
    const genderOf = new Map(members.map((m) => [m.user_id, toGender(m.gender)]))
    const progress = progressByCaller(registrations)
    const byId = new Map(users.map((u) => [u.id, u]))
    const live = listKey ? await cc.getLiveSession(listKey) : null
    const sessionPeople = live
      ? (await cc.getSessionBoard(live.id)).people.filter((p) => Date.now() - p.last_seen < PRESENT_MS).map((p) => ({ user_id: p.user_id, name: p.name }))
      : []
    return {
      data: {
        team: team
          .map((t) => {
            const u = byId.get(t.user_id)
            return {
              user_id: t.user_id,
              name: u?.full_name ?? 'Former user',
              phone: u?.phone ?? null,
              gender: t.gender ?? genderOf.get(t.user_id) ?? null,
              takes: t.takes,
              max: t.max ?? null,
              active: t.active,
              canUseApp: !!u && hasPermission(u.role, 'camp.calls', u.permissions),
              open: progress.get(t.user_id)?.open ?? 0,
            }
          })
          .sort((a, b) => a.name.localeCompare(b.name)),
        candidates: users
          .filter((u) => u.role !== 'visitor')
          .map((u) => ({ id: u.id, name: u.full_name, phone: u.phone ?? null, canUseApp: hasPermission(u.role, 'camp.calls', u.permissions), gender: genderOf.get(u.id) ?? null }))
          .sort((a, b) => Number(b.canUseApp) - Number(a.canUseApp) || a.name.localeCompare(b.name)),
        sessionPeople,
      },
      error: null,
    }
  } catch (error: unknown) {
    return { data: null, error: errorOf(error, 'Could not load the call team') }
  }
}

export async function saveCallTeamMemberAction(input: {
  user_id: string
  gender: 'Male' | 'Female' | null
  takes: 'all' | 'new' | 'returning'
  max: number | null
  active: boolean
}): Promise<{ error: string | null }> {
  try {
    const user = (await guard('camp.manage')) as AppUser | null
    if (!user) throw new Error('Sign in first.')
    if (!input.user_id) throw new Error('Choose someone.')
    if (!['all', 'new', 'returning'].includes(input.takes)) throw new Error('Choose who they call.')
    const max = input.max == null || input.max === 0 ? undefined : Math.max(1, Math.min(500, Math.round(input.max)))
    const cc = await import('@/lib/convex/call-center-bridge')
    await cc.saveCallTeamMember({ user_id: input.user_id, gender: input.gender ?? undefined, takes: input.takes, max, active: input.active }, user.id)
    await logActivity({ category: 'calls', action: 'calls.team_save', summary: `Updated the call team (${input.active ? 'taking calls' : 'paused'}, ${input.takes === 'all' ? 'everyone' : input.takes === 'new' ? 'new campers' : 'returning campers'})`, target: { type: 'user', id: input.user_id } })
    return { error: null }
  } catch (error: unknown) {
    return { error: errorOf(error, 'Could not save') }
  }
}

export async function removeCallTeamMemberAction(input: { user_id: string }): Promise<{ error: string | null }> {
  try {
    await guard('camp.manage')
    const cc = await import('@/lib/convex/call-center-bridge')
    await cc.removeCallTeamMember(input.user_id)
    await logActivity({ category: 'calls', action: 'calls.team_remove', summary: 'Took someone off the call team', target: { type: 'user', id: input.user_id } })
    return { error: null }
  } catch (error: unknown) {
    return { error: errorOf(error, 'Could not remove') }
  }
}

export type ShareSource = 'session' | 'team'
export type ShareScope = 'unassigned' | 'open'

export type SharePlan = {
  seed: number
  source: ShareSource
  people: number
  callers: Array<{ id: string; name: string; total: number; male: number; female: number; newcomers: number; returning: number; alreadyOpen: number }>
  relaxed: { gender: number; takes: number }
  unplaced: number
}

async function planShare(input: { yearId?: string | null; source: ShareSource; scope: ShareScope; sameGender: boolean; matchTakes: boolean; seed: number }) {
  const { registrations, listKey } = await campContext(input.yearId)
  const cc = await import('@/lib/convex/call-center-bridge')
  const { fetchUsersFromConvex, fetchMembersFromConvex } = await import('@/lib/convex/core-bridge')
  const { isOpenCall, progressByCaller } = await import('@/lib/camp/call-campaign')
  const { shareOut, summarizeShare } = await import('@/lib/calls/distribute')
  const [users, members, team] = await Promise.all([fetchUsersFromConvex(), fetchMembersFromConvex().catch(() => []), cc.listCallTeam()])
  const names = new Map(users.map((u) => [u.id, u.full_name]))
  const genderOf = new Map(members.map((m) => [m.user_id, toGender(m.gender)]))
  const teamBy = new Map(team.map((t) => [t.user_id, t]))

  // Who calls: the people in the live session, or the call team (those switched on).
  let callerIds: string[]
  if (input.source === 'session') {
    const live = listKey ? await cc.getLiveSession(listKey) : null
    if (!live) throw new Error('No session is running. Share among the call team instead.')
    callerIds = (await cc.getSessionBoard(live.id)).people.filter((p) => Date.now() - p.last_seen < PRESENT_MS).map((p) => p.user_id)
  } else {
    callerIds = team.filter((t) => t.active).map((t) => t.user_id)
  }
  if (!callerIds.length) throw new Error(input.source === 'session' ? 'Nobody has joined the session yet.' : 'Add people to the call team first.')

  // Who gets a call: still to reach, and (unless re-sharing) without a caller.
  const open = registrations.filter((r) => isOpenCall(r))
  const toShare = input.scope === 'open' ? open : open.filter((r) => !r.assigned_to)
  const keep = input.scope === 'open' ? [] : registrations
  const load = progressByCaller(keep)
  const callers = callerIds.map((id) => {
    const t = teamBy.get(id)
    return { id, gender: t?.gender ?? genderOf.get(id) ?? null, takes: t?.takes ?? 'all', max: t?.max ?? null, load: load.get(id)?.open ?? 0 }
  })
  const people = toShare.map((r) => ({ id: r.id, sex: r.sex ?? null, isNew: r.is_new_registrant === true }))
  const result = shareOut(people, callers, { sameGender: input.sameGender, matchTakes: input.matchTakes }, input.seed)
  const summary = summarizeShare(result, people)
  const plan: SharePlan = {
    seed: input.seed,
    source: input.source,
    people: people.length,
    callers: callers
      .map((c) => ({ id: c.id, name: names.get(c.id) ?? 'Former user', alreadyOpen: c.load, ...(summary.get(c.id) ?? { total: 0, male: 0, female: 0, newcomers: 0, returning: 0 }) }))
      .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name)),
    relaxed: result.relaxed,
    unplaced: result.unplaced.length,
  }
  return { plan, result }
}

/** What sharing out would do (nothing is changed): for the preview. */
export async function previewShareAction(input: { yearId?: string | null; source: ShareSource; scope: ShareScope; sameGender: boolean; matchTakes: boolean; seed?: number }): Promise<{
  data: SharePlan | null
  error: string | null
}> {
  try {
    await guard('camp.manage')
    const { plan } = await planShare({ ...input, seed: input.seed ?? Math.floor(Math.random() * 2 ** 31) })
    return { data: plan, error: null }
  } catch (error: unknown) {
    return { data: null, error: errorOf(error, 'Could not plan the share') }
  }
}

/** Share out for real, with the seed the preview used, so what was checked is what happens. */
export async function applyShareAction(input: { yearId?: string | null; source: ShareSource; scope: ShareScope; sameGender: boolean; matchTakes: boolean; seed: number }): Promise<{
  data: { assigned: number; callers: number } | null
  error: string | null
}> {
  try {
    await guard('camp.manage')
    const { result } = await planShare(input)
    if (!result.assignments.length) throw new Error('Nobody to share out.')
    const bridge = await import('@/lib/convex/camp-bridge')
    const assigned = await bridge.setCallAssignmentsInConvex(result.assignments.map((a) => ({ registration_id: a.personId, assigned_to: a.callerId })))
    await logActivity({ category: 'calls', action: 'calls.share_out', summary: `Shared out ${assigned} calls among ${new Set(result.assignments.map((a) => a.callerId)).size} ${input.source === 'session' ? 'people in the session' : 'call team members'}`, details: { scope: input.scope, sameGender: input.sameGender, matchTakes: input.matchTakes, relaxed: result.relaxed, unplaced: result.unplaced.length } })
    revalidatePath('/admin/camp-meeting/calls')
    return { data: { assigned, callers: new Set(result.assignments.map((a) => a.callerId)).size }, error: null }
  } catch (error: unknown) {
    return { data: null, error: errorOf(error, 'Could not share out the calls') }
  }
}

export type CallHistoryData = {
  year: { id: string; year: number }
  years: Array<{ id: string; year: number; is_active: boolean }>
  calls: import('@/lib/calls/history').CallRow[]
  sessions: import('@/lib/calls/history').CallSessionInfo[]
  callers: Record<string, string>
}

/** Every call for a camp year with its sessions and callers' names: the call history page. Managers only. */
export async function loadCallHistoryAction(yearId?: string | null): Promise<{ data: CallHistoryData | null; error: string | null }> {
  try {
    await guard('camp.manage')
    const { bridge, year, listKey } = await campContext(yearId)
    if (!year || !listKey) return { data: null, error: 'There is no camp year yet.' }
    const cc = await import('@/lib/convex/call-center-bridge')
    const [history, years] = await Promise.all([cc.callHistory(year.id, listKey), bridge.fetchAllCampYearsFromConvex()])
    return {
      data: {
        year: { id: year.id, year: year.year },
        years: [...years].sort((a, b) => b.year - a.year).map((y) => ({ id: y.id, year: y.year, is_active: Boolean(y.is_active) })),
        ...history,
      },
      error: null,
    }
  } catch (error: unknown) {
    return { data: null, error: errorOf(error, 'Could not load the call history') }
  }
}
