import 'server-only'

/**
 * Applies number changes to every SMS: fills in `sendSms`'s resolver with the `sms_number_changes`
 * table, read at most once a minute (and at once after a change made here).
 */
import { registerSmsNumberResolver } from '@/lib/comms/sms-client'
import { changeMap, preferredSmsNumber } from '@/lib/comms/sms-number'

const FRESH_MS = 60_000
let cache: { at: number; map: Map<string, string> } | null = null

async function currentChanges(): Promise<Map<string, string>> {
  if (cache && Date.now() - cache.at < FRESH_MS) return cache.map
  const { listNumberChanges } = await import('@/lib/convex/call-center-bridge')
  const map = changeMap(await listNumberChanges())
  cache = { at: Date.now(), map }
  return map
}

/** Forget the cached changes (after one is saved), so the next text uses it. */
export function forgetNumberChanges(): void {
  cache = null
}

export function installSmsReroute(): void {
  if (!process.env.CAMP_CONVEX_SERVER_SECRET || !process.env.NEXT_PUBLIC_CONVEX_URL) return
  registerSmsNumberResolver(async (phone) => preferredSmsNumber(phone, await currentChanges()))
}
