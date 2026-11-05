/**
 * Missed-church detection (pure, no I/O).
 *
 * People are keyed by the `members` doc id: that is what `attendance.member_id` and
 * `group_memberships.member_id` both hold. Only Sunday services count, and only Sundays
 * on which the church actually recorded attendance: a week nobody entered data for is
 * skipped rather than counted as everyone missing.
 */

export type CongregationKey = 'rlc' | 'campus_gem'

export type AttendanceRowLite = {
  member_id?: string | null
  service_date: string
  service_type?: string | null
  /** Rows written by the main check-in flows carry no congregation; we treat them as Campus Gem. */
  congregation?: CongregationKey | null
  status?: string | null
}

export type AbsenceRule = {
  /** Consecutive recorded Sundays missed before someone counts as lapsed. */
  missedWeeks: number
  /** Recorded Sundays before the gap that we look at to decide "was regular". */
  lookbackWeeks: number
  /** Sundays attended within the look-back to count as regular. */
  minAttended: number
}

export const DEFAULT_ABSENCE_RULE: AbsenceRule = { missedWeeks: 3, lookbackWeeks: 8, minAttended: 3 }

/** Re-alert an ongoing lapse after this many more missed Sundays. */
export const REPEAT_AFTER_WEEKS = 4
/** Past this many missed Sundays we stop texting about someone (still listed on the page). */
export const MAX_ALERT_STREAK = 12

const DAY_MS = 24 * 60 * 60 * 1000

function parseIsoDate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso?.trim() ?? '')
  if (!m) return null
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
  return Number.isNaN(d.getTime()) ? null : d
}

export function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** The Sunday on or before `iso` (UTC; Ghana has no DST), or null for a bad date. */
export function sundayOf(iso: string): string | null {
  const d = parseIsoDate(iso)
  if (!d) return null
  return toIsoDate(new Date(d.getTime() - d.getUTCDay() * DAY_MS))
}

/** Sunday-service rows: typed `sunday_service`, or untyped rows dated on a Sunday. */
export function isSundayServiceRow(row: AttendanceRowLite): boolean {
  if (row.service_type === 'sunday_service') return true
  if (row.service_type) return false
  const d = parseIsoDate(row.service_date)
  return d != null && d.getUTCDay() === 0
}

export function rowCongregation(row: AttendanceRowLite): CongregationKey {
  return row.congregation === 'rlc' ? 'rlc' : 'campus_gem'
}

export type SundaySummary = {
  /** Sundays with at least one attendance row, per congregation. */
  recorded: Record<CongregationKey, Set<string>>
  /** Sundays each member was present (keyed by members doc id). */
  attended: Map<string, Set<string>>
}

export function summariseSundays(rows: readonly AttendanceRowLite[]): SundaySummary {
  const recorded: SundaySummary['recorded'] = { rlc: new Set(), campus_gem: new Set() }
  const attended = new Map<string, Set<string>>()
  for (const row of rows) {
    if (!isSundayServiceRow(row)) continue
    const sunday = sundayOf(row.service_date)
    if (!sunday) continue
    // An "absent" row still shows the church took attendance that week.
    recorded[rowCongregation(row)].add(sunday)
    if (!row.member_id || row.status === 'absent') continue
    let set = attended.get(row.member_id)
    if (!set) attended.set(row.member_id, (set = new Set()))
    set.add(sunday)
  }
  return { recorded, attended }
}

export function congregationsFor(memberCongregation?: string | null): CongregationKey[] {
  if (memberCongregation === 'rlc') return ['rlc']
  if (memberCongregation === 'campus_gem') return ['campus_gem']
  return ['rlc', 'campus_gem']
}

/**
 * The Sundays that count for one member, newest first: Sundays their congregation(s)
 * recorded, plus any Sunday they were seen (proof that week was recorded for them),
 * up to and including `asOf`.
 */
export function countedSundaysFor(
  summary: SundaySummary,
  memberId: string,
  memberCongregation: string | null | undefined,
  asOf: string
): string[] {
  const dates = new Set<string>()
  for (const c of congregationsFor(memberCongregation)) {
    summary.recorded[c].forEach((d) => dates.add(d))
  }
  summary.attended.get(memberId)?.forEach((d) => dates.add(d))
  return Array.from(dates)
    .filter((d) => d <= asOf)
    .sort((a, b) => (a < b ? 1 : a > b ? -1 : 0))
}

export type AbsenceAssessment = {
  /** Consecutive counted Sundays missed, most recent first. */
  streak: number
  /** Last Sunday they were present (ISO), or null if never. */
  lastSeen: string | null
  attendedInLookback: number
  wasRegular: boolean
  lapsed: boolean
}

export function assessAbsence(
  countedDesc: readonly string[],
  attended: ReadonlySet<string> | undefined,
  rule: AbsenceRule = DEFAULT_ABSENCE_RULE
): AbsenceAssessment {
  const seen = attended ?? new Set<string>()
  let streak = 0
  while (streak < countedDesc.length && !seen.has(countedDesc[streak])) streak++
  const lastSeen = streak < countedDesc.length ? countedDesc[streak] : null
  const window = countedDesc.slice(streak, streak + rule.lookbackWeeks)
  const attendedInLookback = window.filter((d) => seen.has(d)).length
  const wasRegular = attendedInLookback >= rule.minAttended
  return {
    streak,
    lastSeen,
    attendedInLookback,
    wasRegular,
    lapsed: wasRegular && streak >= rule.missedWeeks,
  }
}

export type PriorAlert = { alerted_at: number; streak: number; last_seen?: string | null }

/**
 * Alert once per lapse. A new lapse (they came back since: `lastSeen` moved) alerts again
 * straight away; the same lapse alerts again only after `repeatAfter` more missed Sundays.
 */
export function shouldAlert(
  current: Pick<AbsenceAssessment, 'streak' | 'lastSeen'>,
  prior: PriorAlert | null | undefined,
  options: { repeatAfter?: number; maxStreak?: number } = {}
): boolean {
  const repeatAfter = options.repeatAfter ?? REPEAT_AFTER_WEEKS
  const maxStreak = options.maxStreak ?? MAX_ALERT_STREAK
  if (current.streak > maxStreak) return false
  if (!prior) return true
  if ((prior.last_seen ?? null) !== (current.lastSeen ?? null)) return true
  return current.streak >= prior.streak + repeatAfter
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "12 Oct" */
export function shortDate(iso: string | null | undefined): string {
  const d = iso ? parseIsoDate(iso) : null
  if (!d) return ''
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`
}
