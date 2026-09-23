/**
 * Daily camp presence sessions.
 *
 * Clock rules (local time) — used to auto-select so desks don’t mark the wrong period:
 * - Morning: before 12:00 (session ends at noon)
 * - Afternoon: 12:00–16:59 (session typically from ~1–2pm)
 * - Evening: from 17:00 (session typically from ~5–6pm)
 */
export const CAMP_DAILY_SESSION_PERIODS = ['morning', 'afternoon', 'evening'] as const

export type CampDailySessionPeriod = (typeof CAMP_DAILY_SESSION_PERIODS)[number]

export const CAMP_DAILY_SESSION_META: Record<
  CampDailySessionPeriod,
  { title: string; start_time: string; end_time: string; label: string; hint: string }
> = {
  morning: {
    title: 'Morning session',
    label: 'Morning',
    start_time: '08:00',
    end_time: '12:00',
    hint: 'Until 12:00',
  },
  afternoon: {
    title: 'Afternoon session',
    label: 'Afternoon',
    start_time: '13:00',
    end_time: '17:00',
    hint: 'From ~1–2pm',
  },
  evening: {
    title: 'Evening session',
    label: 'Evening',
    start_time: '17:00',
    end_time: '21:30',
    hint: 'From ~5–6pm',
  },
}

/** Minute-of-day cutovers for auto-select (inclusive start of next period). */
export const CAMP_DAILY_SESSION_CUTOVERS = {
  /** Morning → Afternoon at noon */
  afternoonStartsAtMinutes: 12 * 60,
  /** Afternoon → Evening at 5:00pm */
  eveningStartsAtMinutes: 17 * 60,
} as const

export function todayIsoDate(now = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function minutesOfDay(now: Date): number {
  return now.getHours() * 60 + now.getMinutes()
}

export function suggestDailySessionPeriod(now = new Date()): CampDailySessionPeriod {
  const mins = minutesOfDay(now)
  if (mins < CAMP_DAILY_SESSION_CUTOVERS.afternoonStartsAtMinutes) return 'morning'
  if (mins < CAMP_DAILY_SESSION_CUTOVERS.eveningStartsAtMinutes) return 'afternoon'
  return 'evening'
}

/** True when `period` matches what the clock would auto-select. */
export function isSuggestedDailySessionPeriod(
  period: CampDailySessionPeriod,
  now = new Date()
): boolean {
  return suggestDailySessionPeriod(now) === period
}

export function matchDailySessionPeriod(
  activity: {
    title?: string | null
    start_time?: string | null
    metadata?: Record<string, unknown> | null
  }
): CampDailySessionPeriod | null {
  const fromMeta = activity.metadata?.daily_period
  if (
    typeof fromMeta === 'string' &&
    (CAMP_DAILY_SESSION_PERIODS as readonly string[]).includes(fromMeta)
  ) {
    return fromMeta as CampDailySessionPeriod
  }
  const title = (activity.title || '').toLowerCase()
  for (const period of CAMP_DAILY_SESSION_PERIODS) {
    if (title.includes(period)) return period
  }
  const start = (activity.start_time || '').slice(0, 5)
  if (start) {
    for (const period of CAMP_DAILY_SESSION_PERIODS) {
      if (CAMP_DAILY_SESSION_META[period].start_time === start) return period
    }
  }
  return null
}
