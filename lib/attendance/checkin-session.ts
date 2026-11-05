/**
 * QR self check-in sessions.
 *
 * An usher opens a session for one service; the app shows a QR code for `/i/<token>`.
 * Members scan it with their own phone, sign in, and tap "I'm here". The token only
 * identifies the session: the person checked in is always the signed-in user.
 * Pure helpers, shared by the pages, server actions and tests.
 */
import { generateConfirmToken, isConfirmTokenFormat } from '@/lib/camp/confirm-link'

/** Sessions close this long after they open unless the usher picks otherwise. */
export const DEFAULT_CHECKIN_SESSION_HOURS = 4
export const MAX_CHECKIN_SESSION_HOURS = 24

export type CheckinCongregation = 'campus_gem' | 'rlc'

export type CheckinSessionState = 'open' | 'not_open_yet' | 'expired' | 'closed'

export type CheckinSessionTimes = {
  opens_at: number
  closes_at: number
  closed_at?: number
}

/** 128-bit URL-safe token (same shape as tap-to-confirm links). */
export function generateCheckinSessionToken(
  random?: (bytes: Uint8Array) => Uint8Array
): string {
  return generateConfirmToken(random)
}

export function isCheckinSessionTokenFormat(token: unknown): token is string {
  return isConfirmTokenFormat(token)
}

export function selfCheckInPath(token: string): string {
  return `/i/${token}`
}

export function checkinSessionState(session: CheckinSessionTimes, now: number): CheckinSessionState {
  if (session.closed_at != null && session.closed_at <= now) return 'closed'
  if (now < session.opens_at) return 'not_open_yet'
  if (now >= session.closes_at) return 'expired'
  return 'open'
}

/** Clamp the requested length to 1..24 hours; default 4. */
export function checkinSessionWindow(
  now: number,
  hours: number | undefined = DEFAULT_CHECKIN_SESSION_HOURS
): { opens_at: number; closes_at: number } {
  const h = Number.isFinite(hours) ? Math.min(Math.max(hours as number, 1), MAX_CHECKIN_SESSION_HOURS) : DEFAULT_CHECKIN_SESSION_HOURS
  return { opens_at: now, closes_at: now + Math.round(h * 60 * 60 * 1000) }
}

export function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value))
}

export const CHECKIN_SESSION_STATE_MESSAGES: Record<Exclude<CheckinSessionState, 'open'>, { title: string; body: string }> = {
  closed: {
    title: 'Check-in has closed',
    body: 'This check-in code is no longer active. Please see an usher at the entrance and they will mark you present.',
  },
  expired: {
    title: 'This code has expired',
    body: 'This check-in code was for an earlier service. Scan the code on display today, or ask an usher.',
  },
  not_open_yet: {
    title: 'Check-in is not open yet',
    body: 'Check-in for this service has not started. Try again closer to the start time.',
  },
}
