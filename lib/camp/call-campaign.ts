/**
 * Confirmation-call campaign: "are you still coming to camp?"
 *
 * Registrants are split among callers (staff or volunteers). Each call records an
 * outcome; confirmed and declined settle the registrant, the rest stay on the list.
 * Pure helpers only, so the page, server actions and tests share one definition.
 */
import type { CampAttendanceConfirmation, CampRegistration } from '@/lib/types'

export type CallOutcome = CampAttendanceConfirmation

export type CallOutcomeMeta = {
  id: CallOutcome
  label: string
  /** Short verb-style label for the outcome buttons. */
  action: string
  description: string
  tone: 'success' | 'warning' | 'danger' | 'secondary' | 'brand'
  /** Whether this outcome keeps the person on the caller's open list. */
  open: boolean
}

export const CALL_OUTCOMES: CallOutcomeMeta[] = [
  {
    id: 'confirmed',
    label: 'Confirmed',
    action: 'Coming',
    description: 'Said they will attend camp.',
    tone: 'success',
    open: false,
  },
  {
    id: 'maybe',
    label: 'Not sure',
    action: 'Not sure',
    description: 'Undecided. Call again closer to camp.',
    tone: 'warning',
    open: true,
  },
  {
    id: 'unreachable',
    label: 'No answer',
    action: 'No answer',
    description: 'Did not pick up or number unreachable.',
    tone: 'secondary',
    open: true,
  },
  {
    id: 'declined',
    label: 'Not coming',
    action: 'Not coming',
    description: 'Will not attend this year.',
    tone: 'danger',
    open: false,
  },
  {
    id: 'unconfirmed',
    label: 'Not called',
    action: 'Reset',
    description: 'No call recorded yet.',
    tone: 'brand',
    open: true,
  },
]

const OUTCOME_BY_ID = new Map(CALL_OUTCOMES.map((o) => [o.id, o]))

export function callOutcomeMeta(outcome: CallOutcome | null | undefined): CallOutcomeMeta {
  return OUTCOME_BY_ID.get(outcome ?? 'unconfirmed') ?? CALL_OUTCOMES[CALL_OUTCOMES.length - 1]
}

export function isCallOutcome(value: unknown): value is CallOutcome {
  return typeof value === 'string' && OUTCOME_BY_ID.has(value as CallOutcome)
}

type CallFields = Pick<
  CampRegistration,
  'attendance_confirmation' | 'status' | 'assigned_to' | 'call_attempts'
>

export function effectiveOutcome(reg: Pick<CampRegistration, 'attendance_confirmation'>): CallOutcome {
  return reg.attendance_confirmation ?? 'unconfirmed'
}

/** Still needs a call: not settled, not cancelled, not already at camp. */
export function isOpenCall(reg: Pick<CampRegistration, 'attendance_confirmation' | 'status'>): boolean {
  if (reg.status === 'cancelled' || reg.status === 'checked_in') return false
  return callOutcomeMeta(effectiveOutcome(reg)).open
}

export type CallCampaignSummary = {
  total: number
  assigned: number
  unassigned: number
  called: number
  open: number
  byOutcome: Record<CallOutcome, number>
  /** Share of eligible registrants with a settled answer (confirmed or declined). */
  settledRate: number
  /** Expected attendance: confirmed + checked in. */
  expected: number
}

export function summarizeCallCampaign(regs: readonly CallFields[]): CallCampaignSummary {
  const byOutcome: Record<CallOutcome, number> = {
    unconfirmed: 0,
    confirmed: 0,
    maybe: 0,
    declined: 0,
    unreachable: 0,
  }
  let assigned = 0
  let called = 0
  let open = 0
  let expected = 0
  let eligible = 0
  for (const reg of regs) {
    if (reg.status === 'cancelled') continue
    eligible += 1
    const outcome = effectiveOutcome(reg)
    byOutcome[outcome] += 1
    if (reg.assigned_to) assigned += 1
    if ((reg.call_attempts ?? 0) > 0 || outcome !== 'unconfirmed') called += 1
    if (isOpenCall(reg)) open += 1
    if (reg.status === 'checked_in' || outcome === 'confirmed') expected += 1
  }
  const settled = byOutcome.confirmed + byOutcome.declined
  return {
    total: eligible,
    assigned,
    unassigned: eligible - assigned,
    called,
    open,
    byOutcome,
    settledRate: eligible > 0 ? settled / eligible : 0,
    expected,
  }
}

export type CallerProgress = {
  callerId: string
  total: number
  open: number
  confirmed: number
  declined: number
}

export function progressByCaller(regs: readonly CallFields[]): Map<string, CallerProgress> {
  const map = new Map<string, CallerProgress>()
  for (const reg of regs) {
    if (!reg.assigned_to || reg.status === 'cancelled') continue
    const row =
      map.get(reg.assigned_to) ??
      { callerId: reg.assigned_to, total: 0, open: 0, confirmed: 0, declined: 0 }
    row.total += 1
    if (isOpenCall(reg)) row.open += 1
    const outcome = effectiveOutcome(reg)
    if (outcome === 'confirmed') row.confirmed += 1
    if (outcome === 'declined') row.declined += 1
    map.set(reg.assigned_to, row)
  }
  return map
}

/**
 * Split registrations across callers so open workloads end up as even as possible.
 * `currentLoad` is each caller's open list before this assignment. Ties go to the
 * caller listed first, so the result is deterministic.
 */
export function distributeEvenly(
  registrationIds: readonly string[],
  callerIds: readonly string[],
  currentLoad: ReadonlyMap<string, number> = new Map()
): Array<{ registration_id: string; assigned_to: string }> {
  const callers = Array.from(new Set(callerIds.filter(Boolean)))
  if (callers.length === 0) return []
  const load = new Map(callers.map((id) => [id, currentLoad.get(id) ?? 0]))
  return registrationIds.map((registration_id) => {
    let pick = callers[0]
    for (const id of callers) {
      if ((load.get(id) ?? 0) < (load.get(pick) ?? 0)) pick = id
    }
    load.set(pick, (load.get(pick) ?? 0) + 1)
    return { registration_id, assigned_to: pick }
  })
}

export type CallListEntry = { name: string; phone: string; outcome?: CallOutcome }

/** Keep within three SMS segments so one part never arrives cut off. */
const MAX_SMS_CHARS = 450

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName.trim()
}

/**
 * Turn a caller's list into one or more SMS bodies. Every part is numbered when
 * there is more than one, and the link to mark outcomes goes in the last part.
 */
export function buildCallListSms(input: {
  callerName: string
  campYear?: number | string | null
  entries: readonly CallListEntry[]
  link?: string | null
  maxChars?: number
}): string[] {
  const max = input.maxChars ?? MAX_SMS_CHARS
  const yearLabel = input.campYear ? ` ${input.campYear}` : ''
  const intro = `Hi ${firstName(input.callerName)}, your Camp Meeting${yearLabel} call list (${input.entries.length}). Please call to confirm if they are coming:`
  const outro = input.link ? `Sign in, then mark each call here: ${input.link}` : 'Thank you!'
  const lines = input.entries.map((entry, index) => {
    const tag = entry.outcome && entry.outcome !== 'unconfirmed' ? ` [${callOutcomeMeta(entry.outcome).label}]` : ''
    return `${index + 1}. ${entry.name.trim()} ${entry.phone.trim()}${tag}`
  })

  const parts: string[][] = [[intro]]
  for (const line of lines) {
    const current = parts[parts.length - 1]
    const candidate = [...current, line].join('\n')
    // Reserve room for the "(2/3)" counter.
    if (candidate.length + 8 > max && current.length > 0 && !(current.length === 1 && current[0] === intro)) {
      parts.push([line])
    } else {
      current.push(line)
    }
  }
  const last = parts[parts.length - 1]
  if ([...last, outro].join('\n').length + 8 > max) parts.push([outro])
  else last.push(outro)

  if (parts.length === 1) return [parts[0].join('\n')]
  return parts.map((part, i) => `(${i + 1}/${parts.length}) ${part.join('\n')}`)
}

/**
 * The texts `sendCallListsBySmsAction` will send, per caller, built from the same
 * registrations: for the "check before sending" preview.
 */
export function planCallListSms(input: {
  registrations: readonly CampRegistration[]
  callers: ReadonlyArray<{ id: string; full_name: string; phone?: string | null; can_use_app?: boolean }>
  callerIds?: readonly string[]
  includeSettled?: boolean
  campYear?: number | string | null
  link: string
}): Array<{ id: string; name: string; phone: string | null; parts: string[] }> {
  const byCaller = new Map<string, CampRegistration[]>()
  for (const reg of input.registrations) {
    if (!reg.assigned_to || reg.status === 'cancelled') continue
    if (!input.includeSettled && !isOpenCall(reg)) continue
    if (input.callerIds?.length && !input.callerIds.includes(reg.assigned_to)) continue
    byCaller.set(reg.assigned_to, [...(byCaller.get(reg.assigned_to) ?? []), reg])
  }
  const people = new Map(input.callers.map((c) => [c.id, c]))
  return Array.from(byCaller.entries()).map(([id, list]) => {
    const person = people.get(id)
    const name = person?.full_name ?? 'Unknown caller'
    return {
      id,
      name,
      phone: person?.phone?.trim() || null,
      parts: buildCallListSms({
        callerName: name,
        campYear: input.campYear,
        entries: [...list]
          .sort((a, b) => a.full_name.localeCompare(b.full_name))
          .map((r) => ({ name: r.full_name, phone: r.phone, outcome: r.attendance_confirmation })),
        link: person?.can_use_app ? input.link : null,
      }),
    }
  })
}

/**
 * Default text when asking registrants themselves to confirm. Texts come from an
 * alphanumeric sender ID nobody can reply to, so `{{confirmLink}}` gives each person
 * their own tap-to-confirm page instead. One SMS segment with a typical name and link.
 */
export const CONFIRM_ATTENDANCE_SMS = `Hi {{firstName}}, are you still coming to Eagles Camp Meeting {{campYear}}? Please tap to let us know: {{confirmLink}}`
