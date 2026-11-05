/**
 * Tap-to-confirm attendance links.
 *
 * Registrants are texted from an alphanumeric sender ID they cannot reply to, so each
 * confirmation text carries a personal link (`/c/<token>`) instead of asking for YES/NO.
 * The token is the only credential: random, 128 bits, URL-safe, stored on the
 * registration. Pure helpers only, shared by the page, server actions and tests.
 */
import type { CampAttendanceConfirmation, CampRegistration } from '@/lib/types'

/** 16 random bytes = 128 bits, 22 base64url characters. */
export const CONFIRM_TOKEN_BYTES = 16

/** `confirmation_updated_by` / interaction `performed_by` for answers given through the link. */
export const SELF_REPORTED_BY = 'self'

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{22,64}$/

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const b of Array.from(bytes)) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** New unguessable token (Web Crypto, available in Node 18+, Bun and browsers). */
export function generateConfirmToken(
  random: (bytes: Uint8Array) => Uint8Array = (b) => globalThis.crypto.getRandomValues(b)
): string {
  return toBase64Url(random(new Uint8Array(CONFIRM_TOKEN_BYTES)))
}

/** Cheap shape check so junk never reaches the database. */
export function isConfirmTokenFormat(token: unknown): token is string {
  return typeof token === 'string' && TOKEN_PATTERN.test(token)
}

export function confirmLinkPath(token: string): string {
  return `/c/${token}`
}

export function confirmLinkUrl(origin: string, token: string): string {
  return `${origin.replace(/\/$/, '')}${confirmLinkPath(token)}`
}

/** Same length as a real link, for previews before tokens exist. */
export function sampleConfirmLinkUrl(origin: string): string {
  return confirmLinkUrl(origin, 'x'.repeat(22))
}

export function isSelfReported(reg: Pick<CampRegistration, 'confirmation_updated_by'>): boolean {
  return reg.confirmation_updated_by === SELF_REPORTED_BY
}

export type SelfReportOutcome = Extract<CampAttendanceConfirmation, 'confirmed' | 'maybe' | 'declined'>

export const SELF_REPORT_CHOICES: Array<{
  id: SelfReportOutcome
  label: string
  thanks: string
}> = [
  { id: 'confirmed', label: "Yes, I'm coming", thanks: "Wonderful! We can't wait to see you at camp." },
  { id: 'maybe', label: 'Not sure yet', thanks: 'Thanks for letting us know. Tap the link again when you decide.' },
  { id: 'declined', label: "I can't come", thanks: "We'll miss you. Thank you for telling us, and God bless you." },
]

export function isSelfReportOutcome(value: unknown): value is SelfReportOutcome {
  return value === 'confirmed' || value === 'maybe' || value === 'declined'
}

/** "Confirmed via link" style interaction note. */
export function selfReportInteractionNote(label: string, note?: string | null): string {
  return [`${label} via link`, note?.trim()].filter(Boolean).join(' — ')
}

export function firstNameOf(reg: { first_name?: string | null; full_name?: string | null }): string {
  const first = reg.first_name?.trim()
  if (first) return first.split(/\s+/)[0]
  return reg.full_name?.trim().split(/\s+/)[0] || 'there'
}
