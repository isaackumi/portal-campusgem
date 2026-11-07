/**
 * The shared calling queue for a calling session: everyone in the room taps "Next person" and gets
 * someone nobody else is calling. This file decides the order (pure, tested); the claim that keeps
 * two callers off the same person is made in one Convex transaction (`convex/callCenter.ts`).
 */
import type { CampRegistration } from '@/lib/types'
import { effectiveOutcome, isOpenCall } from '@/lib/camp/call-campaign'

/** Who a session works through: everyone, first-time campers, or those who came before. */
export type CallSegment = 'all' | 'new' | 'returning'

export const CALL_SEGMENTS: Array<{ id: CallSegment; label: string; description: string }> = [
  { id: 'all', label: 'Everyone', description: 'Every registrant still to reach.' },
  { id: 'new', label: 'New', description: 'First camp: they may need more help and a warmer welcome.' },
  { id: 'returning', label: 'Returning', description: 'Came to camp before.' },
]

export function isCallSegment(value: unknown): value is CallSegment {
  return value === 'all' || value === 'new' || value === 'returning'
}

type QueueFields = Pick<
  CampRegistration,
  'id' | 'full_name' | 'status' | 'attendance_confirmation' | 'is_new_registrant' | 'call_attempts' | 'last_called_at'
>

export function matchesSegment(reg: Pick<CampRegistration, 'is_new_registrant'>, segment: CallSegment): boolean {
  if (segment === 'new') return reg.is_new_registrant === true
  if (segment === 'returning') return reg.is_new_registrant !== true
  return true
}

/** Someone who did not pick up is not rung again for this long, so the room spreads its calls. */
export const NO_ANSWER_COOLDOWN_MS = 45 * 60 * 1000

/** How long a claim lasts without an outcome before the person goes back in the queue. */
export const CLAIM_TTL_MS = 10 * 60 * 1000

/**
 * The order to call in: never called first, then fewest attempts, then longest since the last
 * call; "no answer" within the cooldown waits; skipped ones (this caller, this session) go last.
 */
export function orderQueue(
  regs: readonly QueueFields[],
  options: { segment?: CallSegment; now?: number; skip?: readonly string[]; cooldownMs?: number } = {}
): string[] {
  const now = options.now ?? Date.now()
  const cooldown = options.cooldownMs ?? NO_ANSWER_COOLDOWN_MS
  const skip = new Set(options.skip ?? [])
  const lastAt = (r: QueueFields) => (r.last_called_at ? new Date(r.last_called_at).getTime() || 0 : 0)
  const eligible = regs.filter((r) => isOpenCall(r) && matchesSegment(r, options.segment ?? 'all'))
  const resting = (r: QueueFields) => effectiveOutcome(r) === 'unreachable' && now - lastAt(r) < cooldown
  return eligible
    .filter((r) => !resting(r))
    .sort((a, b) => {
      const as = skip.has(a.id) ? 1 : 0
      const bs = skip.has(b.id) ? 1 : 0
      if (as !== bs) return as - bs
      const ac = a.call_attempts ?? 0
      const bc = b.call_attempts ?? 0
      if ((ac === 0) !== (bc === 0)) return ac === 0 ? -1 : 1
      return ac - bc || lastAt(a) - lastAt(b) || a.full_name.localeCompare(b.full_name)
    })
    .map((r) => r.id)
}

/** How many are left for a segment right now (in the queue or resting after no answer). */
export function remainingFor(regs: readonly QueueFields[], segment: CallSegment): number {
  return regs.filter((r) => isOpenCall(r) && matchesSegment(r, segment)).length
}

export type SessionOutcomeEntry = { caller_id: string; outcome: string; at: number }

/** The board's tally for a session: per caller, and for the room. */
export function tallySession(entries: readonly SessionOutcomeEntry[]): {
  total: number
  byOutcome: Record<string, number>
  byCaller: Map<string, { total: number; confirmed: number }>
} {
  const byOutcome: Record<string, number> = {}
  const byCaller = new Map<string, { total: number; confirmed: number }>()
  for (const e of entries) {
    byOutcome[e.outcome] = (byOutcome[e.outcome] ?? 0) + 1
    const row = byCaller.get(e.caller_id) ?? { total: 0, confirmed: 0 }
    row.total += 1
    if (e.outcome === 'confirmed') row.confirmed += 1
    byCaller.set(e.caller_id, row)
  }
  return { total: entries.length, byOutcome, byCaller }
}
