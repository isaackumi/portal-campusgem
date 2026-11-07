import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * The `by=` ref on a personal outreach QR link (/o/<slug>?by=<ref>): which GEM member showed
 * the code. NEVER the membership ID (a sign-in credential for plain members) and never a bare
 * user id: `<user id>.<truncated HMAC of it>`, so nobody can attribute a form to someone else
 * by editing the link. A bad ref only means the contact is unattributed. Pure (secret passed in).
 */

const TAG_LENGTH = 16 // base64url chars = 96 bits
const CONTEXT = 'outreach-ref:v1:'

/** Bound to the campus too, so a ref from one campus's link does nothing on another's. */
function tag(userId: string, campusId: string, secret: string): string {
  return createHmac('sha256', secret).update(`${CONTEXT}${campusId}:${userId}`).digest('base64url').slice(0, TAG_LENGTH)
}

export function signOutreachRef(userId: string, campusId: string, secret: string): string {
  if (!secret) throw new Error('A secret is required to sign outreach links.')
  if (!/^[a-z0-9]{10,64}$/i.test(userId)) throw new Error('Invalid user id.')
  return `${userId}.${tag(userId, campusId, secret)}`
}

/** The user id, or null for a missing / tampered / malformed ref (or one for another campus). */
export function verifyOutreachRef(ref: unknown, campusId: string, secret: string): string | null {
  if (!secret || !campusId || typeof ref !== 'string' || ref.length > 100) return null
  const m = /^([a-z0-9]{10,64})\.([A-Za-z0-9_-]{16})$/.exec(ref)
  if (!m) return null
  const [, userId, given] = m
  const expected = tag(userId, campusId, secret)
  const a = Buffer.from(given)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b) ? userId : null
}
