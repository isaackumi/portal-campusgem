/** Attendance numbers for "My GEM". Dates are service dates, `YYYY-MM-DD`. Weeks start on Sunday. */

const DAY_MS = 24 * 60 * 60 * 1000

function toUtcMs(date: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date)
  if (!m) return null
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

function fromUtcMs(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

/** Sunday of the week containing `date`. */
export function weekStartOf(date: string): string {
  const ms = toUtcMs(date)
  if (ms == null) return date
  return fromUtcMs(ms - new Date(ms).getUTCDay() * DAY_MS)
}

export type AttendanceWeek = { start: string; count: number }

export type AttendanceSummary = {
  /** Oldest first; the last entry is the current week. */
  weeks: AttendanceWeek[]
  /** Consecutive weeks attended, up to this week (or last week if this week has none yet). */
  streak: number
  thisMonth: number
  /** Weeks attended in the window. */
  weeksAttended: number
}

export function summarizeAttendance(dates: readonly string[], today: string, weekCount = 12): AttendanceSummary {
  const valid = dates.filter((d) => toUtcMs(d) != null && d.slice(0, 10) <= today)
  const perWeek = new Map<string, number>()
  for (const d of valid) {
    const start = weekStartOf(d)
    perWeek.set(start, (perWeek.get(start) ?? 0) + 1)
  }

  const currentStart = toUtcMs(weekStartOf(today)) ?? 0
  const weeks: AttendanceWeek[] = []
  for (let i = weekCount - 1; i >= 0; i--) {
    const start = fromUtcMs(currentStart - i * 7 * DAY_MS)
    weeks.push({ start, count: perWeek.get(start) ?? 0 })
  }

  let streak = 0
  let cursor = currentStart
  if (!perWeek.get(fromUtcMs(cursor))) cursor -= 7 * DAY_MS
  while (perWeek.get(fromUtcMs(cursor))) {
    streak++
    cursor -= 7 * DAY_MS
  }

  const month = today.slice(0, 7)
  const thisMonth = valid.filter((d) => d.slice(0, 7) === month).length

  return { weeks, streak, thisMonth, weeksAttended: weeks.filter((w) => w.count > 0).length }
}
