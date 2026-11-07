import 'server-only'

/**
 * Record what happened, by whom (the signed-in person unless given), from where (IP and device).
 * Never throws and never blocks what it records: if logging fails, the action still succeeds.
 *
 *   await logActivity({ category: 'people', action: 'people.update', summary: `Updated ${name}'s profile`, target: { type: 'member', id, label: name } })
 */
import { headers } from 'next/headers'
import type { ActivityCategory } from '@/lib/activity/describe'
import { clientIp, describeDevice } from '@/lib/activity/describe'

export type ActivityInput = {
  category: ActivityCategory
  action: string
  summary: string
  outcome?: 'ok' | 'failed'
  /** Who did it; defaults to the signed-in person. `null` for "nobody signed in" (a failed sign-in). */
  actor?: { id?: string | null; name?: string | null } | null
  target?: { type: string; id?: string | null; label?: string | null }
  details?: Record<string, unknown>
}

export async function logActivity(input: ActivityInput): Promise<void> {
  try {
    if (!process.env.CAMP_CONVEX_SERVER_SECRET || !process.env.NEXT_PUBLIC_CONVEX_URL) return
    let actor = input.actor
    if (actor === undefined) {
      const { getSessionUser } = await import('@/lib/auth/server-session')
      const user = await getSessionUser().catch(() => null)
      actor = user ? { id: user.id, name: user.full_name } : null
    }
    let ip: string | undefined
    let device: string | undefined
    try {
      const h = await headers()
      ip = clientIp(h.get('x-forwarded-for'), h.get('x-real-ip'))
      device = describeDevice(h.get('user-agent'))
    } catch {
      // Outside a request (a cron job): no IP or device to note.
    }
    const { getConvexHttpClient } = await import('@/lib/convex/http-client')
    const { api } = await import('@/convex/_generated/api')
    await getConvexHttpClient().mutation(api.activity.logWithSecret, {
      secret: process.env.CAMP_CONVEX_SERVER_SECRET,
      category: input.category,
      action: input.action,
      summary: input.summary,
      outcome: input.outcome ?? 'ok',
      ...(actor?.id ? { actor_id: actor.id } : {}),
      ...(actor?.name ? { actor_name: actor.name } : {}),
      ...(input.target?.type ? { target_type: input.target.type } : {}),
      ...(input.target?.id ? { target_id: input.target.id } : {}),
      ...(input.target?.label ? { target_label: input.target.label } : {}),
      ...(ip ? { ip } : {}),
      ...(device ? { device } : {}),
      ...(input.details ? { details: input.details } : {}),
    })
  } catch (error) {
    console.warn('Activity log: could not record', input.action, error)
  }
}

/** A readable name from whatever came back (a person, a member with its user, a group). */
export function labelOf(value: unknown): string | undefined {
  if (!value || typeof value !== 'object') return undefined
  const v = value as { full_name?: unknown; name?: unknown; user?: { full_name?: unknown } | null }
  const name = v.full_name ?? v.user?.full_name ?? v.name
  return typeof name === 'string' && name.trim() ? name.trim() : undefined
}
