/**
 * Automatic camp reminders, 7 days and 1 day before camp starts.
 *
 * A daily cron (`/api/cron/camp-reminders`) decides which stage is due from the active
 * camp year's start date, picks the audience, and records a per-registration marker
 * so nobody is texted twice. Ghana is UTC+0 all year, so calendar days are UTC days.
 * Pure helpers only, shared by the cron, the admin card and tests.
 */
import type { CampAttendanceConfirmation, CampRegistration } from '@/lib/types'
import { firstNameOf } from '@/lib/camp/confirm-link'
import { smsSegmentInfo } from '@/lib/comms/sms-segments'

const DAY_MS = 86_400_000

/** Hour (UTC = Ghana time) the Vercel cron runs; keep in step with vercel.json. */
export const REMINDER_CRON_HOUR_UTC = 8

export type ReminderStage = '7d' | '1d'

export type ReminderKind =
  /** 7 days out, not yet confirmed: ask them to tap the link. */
  | 'confirm'
  /** 7 days out, already confirmed: see you there. */
  | 'see_you'
  /** Day before, confirmed. */
  | 'day_before'
  /** Day before, still "not sure". */
  | 'day_before_maybe'

/** Auto reminders are on unless switched off for the year. */
export function autoRemindersEnabled(year: { auto_reminders?: boolean | null }): boolean {
  return year.auto_reminders !== false
}

/** UTC day number for an ISO date (`YYYY-MM-DD…`) or Date. NaN when unparseable. */
function dayNumber(value: string | Date): number {
  if (value instanceof Date) return Math.floor(value.getTime() / DAY_MS)
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim())
  if (!m) return NaN
  return Math.floor(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / DAY_MS)
}

/** Whole days from `now` (Ghana calendar day) to the camp start date; null when not set. */
export function daysUntilCamp(startDate: string | null | undefined, now: Date): number | null {
  if (!startDate) return null
  const start = dayNumber(startDate)
  if (Number.isNaN(start)) return null
  return start - dayNumber(now)
}

/**
 * Which stage a run on a day with `daysLeft` sends. The 7-day window stays open from
 * 7 down to 2 days so a missed cron still catches people; on the last day the 1-day
 * reminder takes over and the 7-day one is no longer sent.
 */
export function reminderStageFor(daysLeft: number | null): ReminderStage | null {
  if (daysLeft == null) return null
  if (daysLeft === 1) return '1d'
  if (daysLeft >= 2 && daysLeft <= 7) return '7d'
  return null
}

type ReminderFields = Pick<
  CampRegistration,
  | 'id'
  | 'status'
  | 'attendance_confirmation'
  | 'phone'
  | 'reminder_7d_sent_at'
  | 'reminder_1d_sent_at'
>

export type ReminderSkipReason = 'cancelled' | 'checked_in' | 'declined' | 'not_in_audience' | 'already_sent' | 'invalid_phone'

/** Who gets what at each stage, before phone and already-sent checks. */
export function reminderKindFor(
  outcome: CampAttendanceConfirmation | undefined,
  stage: ReminderStage
): ReminderKind | null {
  const o = outcome ?? 'unconfirmed'
  if (o === 'declined') return null
  if (stage === '7d') return o === 'confirmed' ? 'see_you' : 'confirm'
  if (o === 'confirmed') return 'day_before'
  if (o === 'maybe') return 'day_before_maybe'
  return null
}

export type ReminderPlan<T extends ReminderFields> = {
  stage: ReminderStage
  send: Array<{ registration: T; kind: ReminderKind }>
  skipped: Record<ReminderSkipReason, number>
}

export function planReminders<T extends ReminderFields>(
  registrations: readonly T[],
  stage: ReminderStage,
  isValidPhone: (phone: string) => boolean
): ReminderPlan<T> {
  const skipped: Record<ReminderSkipReason, number> = {
    cancelled: 0,
    checked_in: 0,
    declined: 0,
    not_in_audience: 0,
    already_sent: 0,
    invalid_phone: 0,
  }
  const send: ReminderPlan<T>['send'] = []
  for (const reg of registrations) {
    if (reg.status === 'cancelled') {
      skipped.cancelled += 1
      continue
    }
    if (reg.status === 'checked_in') {
      skipped.checked_in += 1
      continue
    }
    if (reg.attendance_confirmation === 'declined') {
      skipped.declined += 1
      continue
    }
    const kind = reminderKindFor(reg.attendance_confirmation, stage)
    if (!kind) {
      skipped.not_in_audience += 1
      continue
    }
    const sentAt = stage === '7d' ? reg.reminder_7d_sent_at : reg.reminder_1d_sent_at
    if (sentAt) {
      skipped.already_sent += 1
      continue
    }
    if (!reg.phone?.trim() || !isValidPhone(reg.phone)) {
      skipped.invalid_phone += 1
      continue
    }
    send.push({ registration: reg, kind })
  }
  return { stage, send, skipped }
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "Fri 13 Nov" (Ghana / UTC calendar date). */
export function formatCampDate(isoDate: string): string {
  const n = dayNumber(isoDate)
  if (Number.isNaN(n)) return isoDate
  const d = new Date(n * DAY_MS)
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`
}

export type ReminderSmsInput = {
  kind: ReminderKind
  firstName: string
  campYear?: number | string | null
  startDate: string
  venue?: string | null
  link: string
}

function compose(input: ReminderSmsInput, venue: string | null): string {
  const camp = `Eagles Camp Meeting${input.campYear ? ` ${input.campYear}` : ''}`
  const date = formatCampDate(input.startDate)
  const hi = `Hi ${input.firstName}`
  switch (input.kind) {
    case 'confirm':
      return `${hi}, ${camp} starts ${date}. Are you coming? Tap to let us know: ${input.link}`
    case 'see_you':
      return `${hi}, see you at ${camp} on ${date}${venue ? `, ${venue}` : ''}! Plans changed? ${input.link}`
    case 'day_before':
      return `${hi}, ${camp} starts tomorrow${venue ? ` at ${venue}` : ''}. Safe travels, see you there! Can't make it? ${input.link}`
    case 'day_before_maybe':
      return `${hi}, ${camp} starts tomorrow${venue ? ` at ${venue}` : ''}. Still coming? Tap to let us know: ${input.link}`
  }
}

/** Reminder text. The venue is dropped when it would push the text past one SMS. */
export function buildReminderSms(input: ReminderSmsInput): string {
  const venue = input.venue?.trim() || null
  const full = compose(input, venue)
  if (!venue || smsSegmentInfo(full).segments <= 1) return full
  return compose(input, null)
}

export function reminderSmsFor(
  reg: Pick<CampRegistration, 'first_name' | 'full_name'>,
  kind: ReminderKind,
  ctx: { campYear?: number | string | null; startDate: string; venue?: string | null; link: string }
): string {
  return buildReminderSms({ kind, firstName: firstNameOf(reg), ...ctx })
}

function runTime(dayNum: number, hour: number): number {
  return dayNum * DAY_MS + hour * 3_600_000
}

/**
 * When each stage will next go out, from the current time. A stage whose window has
 * passed returns null. The 7-day batch is the next cron run inside days 7..2.
 */
export function reminderSchedule(
  startDate: string | null | undefined,
  now: Date,
  cronHourUtc = REMINDER_CRON_HOUR_UTC
): { sevenDay: string | null; dayBefore: string | null } {
  if (!startDate) return { sevenDay: null, dayBefore: null }
  const start = dayNumber(startDate)
  if (Number.isNaN(start)) return { sevenDay: null, dayBefore: null }
  const nowMs = now.getTime()
  const today = dayNumber(now)
  // First cron run that is still ahead of us.
  const firstRunDay = nowMs < runTime(today, cronHourUtc) ? today : today + 1

  const sevenFrom = Math.max(firstRunDay, start - 7)
  const sevenDay = sevenFrom <= start - 2 ? new Date(runTime(sevenFrom, cronHourUtc)).toISOString() : null
  const dayBefore = firstRunDay <= start - 1 ? new Date(runTime(start - 1, cronHourUtc)).toISOString() : null
  return { sevenDay, dayBefore }
}
