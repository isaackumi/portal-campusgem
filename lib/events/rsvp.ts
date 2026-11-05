/**
 * Events with tap-to-RSVP: pure helpers shared by the admin pages, the public `/e/<token>`
 * page, server actions and tests.
 *
 * Each invitee gets a personal 128-bit token (same shape as camp confirm links). The token is
 * the only credential on the public page, so it is never mapped to a browser other than in
 * the SMS sent to its owner.
 */
import { generateConfirmToken, isConfirmTokenFormat } from '@/lib/camp/confirm-link'

export type EventStatus = 'draft' | 'published' | 'cancelled'
export type EventAudience = 'all' | 'group' | 'custom'
export type RsvpResponse = 'yes' | 'no' | 'maybe'

/** Most guests one person can bring. */
export const MAX_GUESTS = 10

export type ChurchEvent = {
  id: string
  title: string
  description?: string
  starts_at: number
  ends_at?: number
  location?: string
  capacity?: number
  audience: EventAudience
  group_id?: string
  rsvp_closes_at?: number
  created_by: string
  status: EventStatus
  created_at: number
  updated_at: number
}

export type RsvpLike = {
  response?: RsvpResponse | null
  guests?: number | null
  invited_at?: number | null
}

export type RsvpTally = {
  yes: number
  /** People saying yes plus the guests they bring. */
  headcount: number
  guests: number
  no: number
  maybe: number
  noReply: number
  invited: number
  total: number
}

export const newRsvpToken = generateConfirmToken
export const isRsvpTokenFormat = isConfirmTokenFormat

export function isRsvpResponse(value: unknown): value is RsvpResponse {
  return value === 'yes' || value === 'no' || value === 'maybe'
}

export function clampGuests(value: unknown): number {
  const n = Math.floor(Number(value))
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.min(n, MAX_GUESTS)
}

/** Seats one "yes" takes: the person plus their guests. */
export function seatsFor(rsvp: RsvpLike): number {
  return rsvp.response === 'yes' ? 1 + clampGuests(rsvp.guests) : 0
}

export function tallyRsvps(rows: RsvpLike[]): RsvpTally {
  const t: RsvpTally = { yes: 0, headcount: 0, guests: 0, no: 0, maybe: 0, noReply: 0, invited: 0, total: rows.length }
  for (const r of rows) {
    if (r.invited_at) t.invited++
    if (r.response === 'yes') {
      t.yes++
      t.guests += clampGuests(r.guests)
      t.headcount += seatsFor(r)
    } else if (r.response === 'no') t.no++
    else if (r.response === 'maybe') t.maybe++
    else t.noReply++
  }
  return t
}

/** Seats left, or null when the event has no capacity limit. Never negative. */
export function capacityLeft(capacity: number | null | undefined, headcount: number): number | null {
  if (capacity == null || capacity <= 0) return null
  return Math.max(0, capacity - headcount)
}

/**
 * Can this person answer "yes" with `guests`, given everyone else's headcount?
 * `othersHeadcount` must exclude this person's own current seats.
 */
export function canAcceptYes(capacity: number | null | undefined, othersHeadcount: number, guests: number): boolean {
  if (capacity == null || capacity <= 0) return true
  return othersHeadcount + 1 + clampGuests(guests) <= capacity
}

/** Highest guest count this person may choose (0 when full or no room for guests). */
export function maxGuestsAllowed(capacity: number | null | undefined, othersHeadcount: number): number {
  if (capacity == null || capacity <= 0) return MAX_GUESTS
  return Math.max(0, Math.min(MAX_GUESTS, capacity - othersHeadcount - 1))
}

/** When answers stop: the RSVP deadline if set (and before the start), else the start. */
export function rsvpDeadline(event: Pick<ChurchEvent, 'starts_at' | 'rsvp_closes_at'>): number {
  if (event.rsvp_closes_at && event.rsvp_closes_at < event.starts_at) return event.rsvp_closes_at
  return event.starts_at
}

export type RsvpClosedReason = 'cancelled' | 'draft' | 'closed' | null

export function rsvpClosedReason(
  event: Pick<ChurchEvent, 'starts_at' | 'rsvp_closes_at' | 'status'>,
  now = Date.now()
): RsvpClosedReason {
  if (event.status === 'cancelled') return 'cancelled'
  if (event.status !== 'published') return 'draft'
  if (now >= rsvpDeadline(event)) return 'closed'
  return null
}

export function eventLinkPath(token: string): string {
  return `/e/${token}`
}

export function eventLinkUrl(origin: string, token: string): string {
  return `${origin.replace(/\/$/, '')}${eventLinkPath(token)}`
}

/** Same length as a real link, for previews before tokens exist. */
export function sampleEventLinkUrl(origin: string): string {
  return eventLinkUrl(origin, 'x'.repeat(22))
}

export type InviteMode = 'new' | 'reminder'

/** Who a send goes to: never-invited people, or (reminder) invited people who haven't answered. */
export function needsSend(rsvp: RsvpLike, mode: InviteMode): boolean {
  if (mode === 'new') return !rsvp.invited_at
  return Boolean(rsvp.invited_at) && !isRsvpResponse(rsvp.response)
}

export const DEFAULT_INVITE_TEMPLATE =
  'Hi {{name}}, you are invited to {{event}} on {{date}}. Tap to RSVP: {{link}}'
export const DEFAULT_REMINDER_TEMPLATE =
  'Hi {{name}}, a reminder about {{event}} on {{date}}. Please let us know if you can come: {{link}}'

const DATE_FMT = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
  timeZone: 'Africa/Accra',
})

const DAY_FMT = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Africa/Accra',
})

const TIME_FMT = new Intl.DateTimeFormat('en-GB', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
  timeZone: 'Africa/Accra',
})

/** "Sat, 14 Nov, 4:00 pm" in Ghana time, short enough for an SMS. */
export function formatEventShort(ms: number): string {
  return DATE_FMT.format(new Date(ms)).replace(/\s?([ap])m$/i, (_, p: string) => ` ${p.toLowerCase()}m`)
}

/** "Saturday 14 November 2026 · 4:00 pm – 6:00 pm" in Ghana time. */
export function formatEventWhen(starts: number, ends?: number | null): string {
  const day = DAY_FMT.format(new Date(starts)).replace(',', '')
  const start = TIME_FMT.format(new Date(starts))
  if (!ends || ends <= starts) return `${day} · ${start}`
  const sameDay = DAY_FMT.format(new Date(ends)) === DAY_FMT.format(new Date(starts))
  if (sameDay) return `${day} · ${start} – ${TIME_FMT.format(new Date(ends))}`
  return `${day} · ${start} – ${formatEventShort(ends)}`
}

/** Template variables for one invitee. */
export function inviteVariables(
  event: Pick<ChurchEvent, 'title' | 'starts_at' | 'location'>,
  firstName: string,
  link: string
): Record<string, string> {
  return {
    name: firstName,
    event: event.title,
    date: formatEventShort(event.starts_at),
    location: event.location ?? '',
    link,
  }
}

/**
 * Ghana-time `datetime-local` value <-> epoch ms. Ghana is UTC+0 all year, so the browser's
 * local string can be read as UTC; this keeps admin entry and SMS text in the same clock.
 */
export function localInputToMs(value: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value.trim())
  if (!m) return null
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]))
}

export function msToLocalInput(ms: number | null | undefined): string {
  if (!ms) return ''
  return new Date(ms).toISOString().slice(0, 16)
}

export type EventInput = {
  title: string
  description?: string
  starts_at: number
  ends_at?: number
  location?: string
  capacity?: number
  audience: EventAudience
  group_id?: string
  rsvp_closes_at?: number
  status: EventStatus
}

/** Validate and tidy admin input. Returns an error message or the cleaned event. */
export function validateEventInput(input: Partial<EventInput>): { ok: true; value: EventInput } | { ok: false; error: string } {
  const title = input.title?.replace(/\s+/g, ' ').trim()
  if (!title) return { ok: false, error: 'Give the event a title.' }
  if (title.length > 120) return { ok: false, error: 'Keep the title under 120 characters.' }
  const starts = Number(input.starts_at)
  if (!Number.isFinite(starts) || starts <= 0) return { ok: false, error: 'Choose when the event starts.' }
  const ends = input.ends_at != null ? Number(input.ends_at) : undefined
  if (ends != null && (!Number.isFinite(ends) || ends <= starts)) {
    return { ok: false, error: 'The end time must be after the start.' }
  }
  const closes = input.rsvp_closes_at != null ? Number(input.rsvp_closes_at) : undefined
  if (closes != null && (!Number.isFinite(closes) || closes > starts)) {
    return { ok: false, error: 'RSVPs must close before the event starts.' }
  }
  let capacity: number | undefined
  if (input.capacity != null && String(input.capacity) !== '') {
    capacity = Math.floor(Number(input.capacity))
    if (!Number.isFinite(capacity) || capacity < 1) return { ok: false, error: 'Capacity must be at least 1, or left empty.' }
  }
  const audience = input.audience ?? 'all'
  if (audience !== 'all' && audience !== 'group' && audience !== 'custom') return { ok: false, error: 'Choose who is invited.' }
  if (audience === 'group' && !input.group_id) return { ok: false, error: 'Choose a group.' }
  const status = input.status ?? 'draft'
  if (status !== 'draft' && status !== 'published' && status !== 'cancelled') return { ok: false, error: 'Invalid status.' }
  return {
    ok: true,
    value: {
      title,
      description: input.description?.trim().slice(0, 2000) || undefined,
      starts_at: starts,
      ends_at: ends,
      location: input.location?.replace(/\s+/g, ' ').trim().slice(0, 200) || undefined,
      capacity,
      audience,
      group_id: audience === 'group' ? input.group_id : undefined,
      rsvp_closes_at: closes,
      status,
    },
  }
}

export const RESPONSE_LABELS: Record<RsvpResponse, string> = {
  yes: 'Going',
  no: 'Not going',
  maybe: 'Maybe',
}
