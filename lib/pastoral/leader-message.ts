/**
 * One weekly text per group leader: the group digest and any missed-church alerts,
 * combined and trimmed to fit `maxSegments` SMS parts. Pure.
 */
import { smsSegmentInfo } from '@/lib/comms/sms-segments'
import { birthdayPartsFromDob } from '@/lib/birthdays/upcoming-birthdays'
import { shortDate } from '@/lib/pastoral/absence'

export type GroupDigest = {
  groupName: string
  /** Group members in church last Sunday; null when no attendance was recorded that Sunday. */
  present: number | null
  total: number
  birthdays: Array<{ name: string; day: string }>
  /** First names of members missing for the threshold or longer (not already in `alerts`). */
  missing: string[]
}

export type AlertEntry = {
  name: string
  weeks: number
  lastSeen: string | null
  phone?: string | null
}

export type LeaderMessageInput = {
  digests: GroupDigest[]
  alerts: AlertEntry[]
  /** Threshold used for the "Missing N+ weeks" label. */
  missedWeeks: number
  maxAlertNames?: number
  maxSegments?: number
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** 0244123456 rather than +233244123456: shorter and how people write it here. */
export function localPhone(phone: string | null | undefined): string {
  const raw = (phone ?? '').trim()
  if (!raw) return ''
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('233') && digits.length === 12) return `0${digits.slice(3)}`
  if (digits.length === 10 && digits.startsWith('0')) return digits
  return raw.replace(/\s+/g, '')
}

export function firstName(fullName: string, first?: string | null): string {
  const f = first?.trim()
  if (f) return f
  return fullName.trim().split(/\s+/)[0] ?? fullName
}

/**
 * Birthdays in the `days` days starting on `from` (inclusive), soonest first.
 * Feb 29 birthdays fall on Feb 28 in other years.
 */
export function birthdaysInNextDays(
  people: ReadonlyArray<{ name: string; dob?: string | null }>,
  from: Date,
  days = 7
): Array<{ name: string; day: string; offset: number }> {
  const start = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate())
  const out: Array<{ name: string; day: string; offset: number }> = []
  for (const p of people) {
    const { month, day } = birthdayPartsFromDob(p.dob)
    if (month == null || day == null) continue
    for (let i = 0; i < days; i++) {
      const d = new Date(start + i * 86_400_000)
      const y = d.getUTCFullYear()
      const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0
      const m = month
      const dd = month === 2 && day === 29 && !leap ? 28 : day
      if (d.getUTCMonth() + 1 === m && d.getUTCDate() === dd) {
        out.push({ name: p.name, day: WEEKDAYS[d.getUTCDay()], offset: i })
        break
      }
    }
  }
  return out.sort((a, b) => a.offset - b.offset || a.name.localeCompare(b.name))
}

function listWithMore(items: string[], limit: number, sep = ', '): string {
  if (items.length <= limit) return items.join(sep)
  const shown = items.slice(0, Math.max(limit, 0))
  const more = `+${items.length - shown.length} more`
  return shown.length ? `${shown.join(sep)}${sep}${more}` : more
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}

function digestText(
  d: GroupDigest,
  limits: { birthdays: number; missing: number },
  missedWeeks: number
): string {
  const parts: string[] = []
  parts.push(
    d.present == null
      ? `${d.groupName} this week: no attendance recorded Sunday.`
      : `${d.groupName} this week: ${d.present} of ${d.total} in church Sunday.`
  )
  if (d.birthdays.length && limits.birthdays > 0) {
    parts.push(`Birthdays: ${listWithMore(d.birthdays.map((b) => `${b.name} (${b.day})`), limits.birthdays)}.`)
  }
  if (d.missing.length && limits.missing > 0) {
    parts.push(`Missing ${missedWeeks}+ weeks: ${listWithMore(d.missing, limits.missing)}.`)
  }
  return parts.join(' ')
}

function alertText(alerts: AlertEntry[], limit: number, withDigest: boolean): string {
  if (!alerts.length) return ''
  if (alerts.length === 1 && limit >= 1) {
    const a = alerts[0]
    const last = a.lastSeen ? ` (last seen ${shortDate(a.lastSeen)})` : ''
    const phone = localPhone(a.phone)
    return `${a.name} hasn't been in church for ${plural(a.weeks, 'Sunday')}${last}. A call from you would mean a lot.${phone ? ` ${phone}` : ''}`
  }
  const items = alerts.map((a) => {
    const phone = localPhone(a.phone)
    const last = a.lastSeen ? `, last ${shortDate(a.lastSeen)}` : ''
    return `${a.name}${phone ? ` ${phone}` : ''} (${plural(a.weeks, 'Sunday')}${last})`
  })
  const lead = withDigest ? 'Please call:' : "These members haven't been in church lately:"
  return `${lead} ${listWithMore(items, limit, '; ')}. A call from you would mean a lot.`
}

/** Build the text with given limits (exported for tests). */
export function composeLeaderMessage(
  input: LeaderMessageInput,
  limits: { alerts: number; birthdays: number; missing: number; groups: number }
): string {
  const digests = input.digests.slice(0, limits.groups)
  const parts = digests.map((d) => digestText(d, limits, input.missedWeeks))
  if (input.digests.length > digests.length) {
    parts.push(`+${input.digests.length - digests.length} more groups.`)
  }
  const alerts = alertText(input.alerts, limits.alerts, digests.length > 0)
  if (alerts) parts.push(alerts)
  return parts.join(' ').trim()
}

/**
 * The leader's weekly text. Starts with everything (up to `maxAlertNames` names) and
 * trims the least useful detail first (missing names, birthdays, extra groups, then
 * alert names) until it fits `maxSegments`. Returns '' when there is nothing to say.
 */
export function buildLeaderMessage(input: LeaderMessageInput): string {
  if (!input.digests.length && !input.alerts.length) return ''
  const maxSegments = input.maxSegments ?? 2
  const maxAlerts = input.maxAlertNames ?? 5
  const fits = (text: string) => smsSegmentInfo(text).segments <= maxSegments

  let limits = { alerts: maxAlerts, birthdays: 5, missing: 5, groups: 3 }
  let text = composeLeaderMessage(input, limits)
  const steps: Array<(l: typeof limits) => typeof limits | null> = [
    (l) => (l.missing > 2 ? { ...l, missing: l.missing - 1 } : null),
    (l) => (l.birthdays > 2 ? { ...l, birthdays: l.birthdays - 1 } : null),
    (l) => (l.groups > 1 ? { ...l, groups: l.groups - 1 } : null),
    (l) => (l.alerts > 2 ? { ...l, alerts: l.alerts - 1 } : null),
    (l) => (l.missing > 0 ? { ...l, missing: l.missing - 1 } : null),
    (l) => (l.birthdays > 0 ? { ...l, birthdays: l.birthdays - 1 } : null),
    (l) => (l.alerts > 1 ? { ...l, alerts: l.alerts - 1 } : null),
  ]
  while (!fits(text)) {
    let next: typeof limits | null = null
    for (const step of steps) {
      next = step(limits)
      if (next) break
    }
    if (!next) break
    limits = next
    text = composeLeaderMessage(input, limits)
  }
  return text
}
