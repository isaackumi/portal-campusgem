/**
 * SMS opt-outs. People who reply STOP get `users.sms_opt_out`; every bulk send
 * (comms centre, groups, birthdays, camp bulk, camp reminders, event invites) skips them.
 * One-to-one sends (an inbox reply, a sign-in code) still go through.
 */
import { normalizeSmsPhone } from '@/lib/comms/sms-client'

export function buildOptOutSet(phones: Array<string | null | undefined>): Set<string> {
  const out = new Set<string>()
  for (const phone of phones) {
    const n = phone?.trim() ? normalizeSmsPhone(phone) : ''
    if (n) out.add(n)
  }
  return out
}

export function isOptedOut(set: Set<string>, phone: string | null | undefined): boolean {
  if (!phone?.trim() || set.size === 0) return false
  return set.has(normalizeSmsPhone(phone))
}

/** Server only. Never throws: if the lookup fails, sends go ahead as before. */
export async function loadSmsOptOutSet(): Promise<Set<string>> {
  try {
    if (!process.env.NEXT_PUBLIC_CONVEX_URL) return new Set()
    const { listOptedOutPhonesFromConvex } = await import('@/lib/convex/inbox-bridge')
    return buildOptOutSet(await listOptedOutPhonesFromConvex())
  } catch (error) {
    console.error('[sms opt-out] lookup failed', error)
    return new Set()
  }
}

export const OPTED_OUT_REASON = 'Opted out of SMS (replied STOP)'
