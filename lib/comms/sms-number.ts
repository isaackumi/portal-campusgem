/**
 * Preferred SMS numbers: when someone has changed their number, every text the system sends to the
 * old one goes to the new one instead (`sms_number_changes` in Convex, applied inside `sendSms`).
 * Sign-in is not affected: people still sign in with the number on their account.
 *
 * Pure helpers, shared by the server and its tests.
 */

/** A Ghana number as one key, whatever way it was typed: 024 123 4567, +233 24…, 23324… → 233241234567. */
export function smsNumberKey(phone: string | null | undefined): string {
  const digits = (phone ?? '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('233')) return digits
  if (digits.startsWith('0')) return `233${digits.slice(1)}`
  if (digits.length === 9) return `233${digits}`
  return digits
}

export type NumberChange = { from_phone: string; to_phone: string }

/**
 * Where a text for `phone` should really go: its newest number, following a chain of changes
 * (old → new → newer) a few steps at most and stopping on a loop. The number itself when it has
 * not changed.
 */
export function preferredSmsNumber(phone: string, changes: ReadonlyMap<string, string>): string {
  let key = smsNumberKey(phone)
  if (!key) return phone
  let current = phone
  const seen = new Set<string>([key])
  for (let hop = 0; hop < 5; hop++) {
    const next = changes.get(key)
    if (!next) break
    const nextKey = smsNumberKey(next)
    if (!nextKey || seen.has(nextKey)) break
    seen.add(nextKey)
    current = next
    key = nextKey
  }
  return current
}

/** The changes as a lookup by old number's key. */
export function changeMap(changes: readonly NumberChange[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const c of changes) {
    const from = smsNumberKey(c.from_phone)
    if (from && smsNumberKey(c.to_phone) && from !== smsNumberKey(c.to_phone)) map.set(from, c.to_phone)
  }
  return map
}
