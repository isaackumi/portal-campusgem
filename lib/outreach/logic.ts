import { statusAfterOutcome } from '@/convex/lib/states/outreachContact'
import type { OutreachOutcome } from '@/lib/outreach/options'
import type { OutreachContact, OutreachStatus } from '@/lib/outreach/types'

/** Campus outreach rules: who sees what, filters, sorting, outcomes, sharing out. Pure. */

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

function parseIso(iso: string): Date {
  return new Date(`${iso.slice(0, 10)}T12:00:00Z`)
}

/** The outreach Sunday for a date: that day when it is a Sunday, else the Sunday before. */
export function outreachSunday(todayIso: string): string {
  const d = parseIso(todayIso)
  d.setUTCDate(d.getUTCDate() - d.getUTCDay())
  return d.toISOString().slice(0, 10)
}

export function isSunday(iso: string): boolean {
  return parseIso(iso).getUTCDay() === 0
}

/** "Sun 9 Nov" */
export function shortDay(iso: string): string {
  const d = parseIso(iso)
  if (Number.isNaN(d.getTime())) return iso
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getUTCDay()]
  const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getUTCMonth()]
  return `${day} ${d.getUTCDate()} ${month}`
}

// ---------------------------------------------------------------------------
// Access
// ---------------------------------------------------------------------------

/**
 * What a person may do on one campus's outreach list:
 * - `manage` (campus leaders, groups.manage holders): everything, including assigning.
 * - `view` (executives with campus.lead): see every contact; act only on theirs.
 * - `member` (any active member of the campus): only contacts they met or were given.
 */
export type OutreachAccess = 'manage' | 'view' | 'member'

export function seesAllContacts(access: OutreachAccess): boolean {
  return access === 'manage' || access === 'view'
}

export function canSeeContact(
  access: OutreachAccess,
  userId: string | null | undefined,
  c: Pick<OutreachContact, 'met_by_user_id' | 'assigned_to'>
): boolean {
  if (seesAllContacts(access)) return true
  return Boolean(userId && (c.met_by_user_id === userId || c.assigned_to === userId))
}

/** Record an outcome / note, edit, set status: the assignee, whoever met them, or a manager. */
export function canWorkContact(
  access: OutreachAccess,
  userId: string | null | undefined,
  c: Pick<OutreachContact, 'met_by_user_id' | 'assigned_to'>
): boolean {
  if (access === 'manage') return true
  return Boolean(userId && (c.met_by_user_id === userId || c.assigned_to === userId))
}

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

export type OutreachTab = 'mine' | 'met' | 'all'

export type OutreachFilters = {
  tab?: OutreachTab
  /** YYYY-MM-DD, or 'sunday' for the latest outreach Sunday. */
  metOn?: string
  status?: OutreachStatus
  unassigned?: boolean
  bibleStudy?: boolean
  search?: string
}

function digits(value: string | undefined): string {
  return (value ?? '').replace(/\D/g, '')
}

/** Phone digits match whatever way they are typed: 024…, 24…, 23324…. */
function phoneMatches(phone: string | undefined, q: string): boolean {
  const p = digits(phone)
  const d = q.replace(/^233/, '').replace(/^0/, '')
  return d.length >= 3 && p.includes(d)
}

export function matchesSearch(c: OutreachContact, search: string): boolean {
  const q = search.trim().toLowerCase()
  if (!q) return true
  const d = digits(q)
  if (d.length >= 3 && d.length === q.replace(/[\s+-]/g, '').length) {
    return phoneMatches(c.phone, d) || phoneMatches(c.whatsapp, d) || (c.student_id ?? '').includes(d)
  }
  return [c.full_name, c.hall, c.room, c.area, c.programme, c.student_id, c.level]
    .filter(Boolean)
    .some((v) => String(v).toLowerCase().includes(q))
}

export function filterContacts(
  contacts: readonly OutreachContact[],
  filters: OutreachFilters,
  ctx: { userId: string; access: OutreachAccess; todayIso: string }
): OutreachContact[] {
  const tab = filters.tab ?? 'mine'
  const day = filters.metOn === 'sunday' ? outreachSunday(ctx.todayIso) : filters.metOn
  return contacts.filter((c) => {
    if (!canSeeContact(ctx.access, ctx.userId, c)) return false
    if (tab === 'mine' && c.assigned_to !== ctx.userId) return false
    if (tab === 'met' && c.met_by_user_id !== ctx.userId) return false
    if (day && c.met_on !== day) return false
    if (filters.status && c.status !== filters.status) return false
    if (filters.unassigned && c.assigned_to) return false
    if (filters.bibleStudy && c.bible_study !== 'yes' && c.status !== 'bible_study') return false
    if (filters.search && !matchesSearch(c, filters.search)) return false
    return true
  })
}

const CLOSED: ReadonlySet<OutreachStatus> = new Set<OutreachStatus>(['joined', 'not_interested']) // = isClosedOutreachStatus

/**
 * My follow-ups: never-contacted first (oldest met first), then the rest by who was
 * contacted longest ago, closed ones (joined / not interested) last.
 * Other tabs: newest met first.
 */
export function sortContacts(contacts: readonly OutreachContact[], tab: OutreachTab): OutreachContact[] {
  const list = [...contacts]
  if (tab === 'mine') {
    const rank = (c: OutreachContact) => (CLOSED.has(c.status) ? 2 : c.last_contact_at ? 1 : 0)
    return list.sort((a, b) => {
      const r = rank(a) - rank(b)
      if (r) return r
      if (rank(a) === 1) return (a.last_contact_at ?? 0) - (b.last_contact_at ?? 0)
      return a.met_on.localeCompare(b.met_on) || a.created_at - b.created_at
    })
  }
  return list.sort((a, b) => b.met_on.localeCompare(a.met_on) || b.created_at - a.created_at)
}

/** Open follow-ups for one person: assigned to them and not closed. */
export function openFollowUps(contacts: readonly OutreachContact[], userId: string): number {
  return contacts.filter((c) => c.assigned_to === userId && !CLOSED.has(c.status)).length
}

export type OutreachDaySummary = { day: string; met: number; bibleStudy: number; unassigned: number }

/** Numbers for one outreach Sunday (campus page, outreach page). */
export function summarizeDay(contacts: readonly OutreachContact[], day: string): OutreachDaySummary {
  const that = contacts.filter((c) => c.met_on === day)
  return {
    day,
    met: that.length,
    bibleStudy: that.filter((c) => c.bible_study === 'yes').length,
    unassigned: that.filter((c) => !c.assigned_to).length,
  }
}

// ---------------------------------------------------------------------------
// Outcomes
// ---------------------------------------------------------------------------

export type OutcomePatch = {
  status?: OutreachStatus
  bible_study?: 'yes'
  attempts: number
  last_contact_at: number
  last_outcome: OutreachOutcome
}

/** What recording a call / WhatsApp outcome changes on the contact. */
export function applyOutcome(
  c: Pick<OutreachContact, 'status' | 'attempts'>,
  outcome: OutreachOutcome,
  now: number
): OutcomePatch {
  const base: OutcomePatch = { attempts: (c.attempts ?? 0) + 1, last_contact_at: now, last_outcome: outcome }
  // The rule itself lives with the server (convex/lib/states/outreachContact.ts), which applies it.
  const status = statusAfterOutcome(c.status, outcome)
  return {
    ...base,
    ...(status ? { status } : {}),
    ...(outcome === 'wants_bible_study' ? { bible_study: 'yes' as const } : {}),
  }
}

// ---------------------------------------------------------------------------
// Sharing out
// ---------------------------------------------------------------------------

/**
 * Split contacts between people as evenly as possible, counting what each already has open:
 * each contact goes to whoever has the fewest (ties: the order given). Returns contact id →
 * user id. Deterministic.
 */
export function shareOutEvenly(
  contactIds: readonly string[],
  assigneeIds: readonly string[],
  currentLoad: Readonly<Record<string, number>> = {}
): Record<string, string> {
  const people = Array.from(new Set(assigneeIds))
  const out: Record<string, string> = {}
  if (people.length === 0) return out
  const load = new Map(people.map((p) => [p, currentLoad[p] ?? 0]))
  for (const id of contactIds) {
    let best = people[0]
    for (const p of people) if ((load.get(p) ?? 0) < (load.get(best) ?? 0)) best = p
    out[id] = best
    load.set(best, (load.get(best) ?? 0) + 1)
  }
  return out
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

function firstName(name: string | null | undefined): string {
  return (name ?? '').trim().split(/\s+/)[0] ?? ''
}

/** Where they were met, for the opening line: their hall, else their area, else the campus. */
function placeOf(c: Pick<OutreachContact, 'residence' | 'hall' | 'area'>, campusPlace: string): string {
  if (c.residence === 'hall' && c.hall) return c.hall
  return campusPlace
}

/**
 * The WhatsApp opener from the signed-in member:
 * "Hi Ama, it's Kofi from Campus GEM (UG). It was lovely meeting you at Legon Hall on Sunday…"
 */
export function whatsAppOpener(input: {
  contact: Pick<OutreachContact, 'full_name' | 'residence' | 'hall' | 'area' | 'met_on' | 'bible_study'>
  senderName: string | null | undefined
  campusLabel: string
  campusPlace?: string
  todayIso: string
}): string {
  const them = firstName(input.contact.full_name)
  const me = firstName(input.senderName)
  const place = placeOf(input.contact, input.campusPlace || 'campus')
  const when = input.contact.met_on === input.todayIso ? 'today' : isSunday(input.contact.met_on) ? 'on Sunday' : 'the other day'
  const lines = [
    `Hi ${them}, it's ${me || 'your friend'} from Campus GEM (${input.campusLabel}).`,
    `It was lovely meeting you at ${place} ${when}.`,
    input.contact.bible_study === 'yes'
      ? 'You said you would like to do Bible study with us. When would be a good time this week?'
      : 'How has your week been? We would love to see you at our fellowship.',
  ]
  return lines.join(' ')
}
