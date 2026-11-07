'use server'

/**
 * The activity log for /admin/activity: newest first, filtered by category, person, time and
 * outcome, a page at a time. Needs `users.manage` (it shows sign-ins with IP addresses).
 */
import { guard } from '@/lib/auth/action-guard'
import { isActivityCategory } from '@/lib/activity/describe'

export type ActivityRow = {
  id: string
  at: number
  category: string
  action: string
  summary: string
  outcome: 'ok' | 'failed'
  actor_id?: string
  actor_name?: string
  target_type?: string
  target_id?: string
  target_label?: string
  ip?: string
  device?: string
}

export type ActivityRange = 'today' | '7d' | '30d' | 'all'

function sinceOf(range: ActivityRange): number {
  const now = new Date()
  if (range === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  if (range === '7d') return now.getTime() - 7 * 86_400_000
  if (range === '30d') return now.getTime() - 30 * 86_400_000
  return 0
}

export async function listActivityAction(input: {
  category?: string | null
  actorId?: string | null
  range?: ActivityRange
  failedOnly?: boolean
  cursor?: string | null
}): Promise<{ data: { rows: ActivityRow[]; cursor: string | null } | null; error: string | null }> {
  try {
    await guard('users.manage')
    const secret = process.env.CAMP_CONVEX_SERVER_SECRET
    if (!secret) throw new Error('The activity log needs CAMP_CONVEX_SERVER_SECRET.')
    const { getConvexHttpClient } = await import('@/lib/convex/http-client')
    const { api } = await import('@/convex/_generated/api')
    const page = await getConvexHttpClient().query(api.activity.listWithSecret, {
      secret,
      ...(input.actorId ? { actor_id: input.actorId } : {}),
      ...(input.category && isActivityCategory(input.category) ? { category: input.category } : {}),
      since: sinceOf(input.range ?? '7d'),
      ...(input.failedOnly ? { failed_only: true } : {}),
      cursor: input.cursor ?? null,
      limit: 60,
    })
    const rows = (page.rows as Array<Record<string, unknown>>).map((r) => ({
      id: String(r.id),
      at: Number(r.at),
      category: String(r.category),
      action: String(r.action),
      summary: String(r.summary),
      outcome: r.outcome === 'failed' ? ('failed' as const) : ('ok' as const),
      ...(r.actor_id ? { actor_id: String(r.actor_id) } : {}),
      ...(r.actor_name ? { actor_name: String(r.actor_name) } : {}),
      ...(r.target_type ? { target_type: String(r.target_type) } : {}),
      ...(r.target_id ? { target_id: String(r.target_id) } : {}),
      ...(r.target_label ? { target_label: String(r.target_label) } : {}),
      ...(r.ip ? { ip: String(r.ip) } : {}),
      ...(r.device ? { device: String(r.device) } : {}),
    }))
    return { data: { rows, cursor: page.cursor }, error: null }
  } catch (error: unknown) {
    return { data: null, error: error instanceof Error ? error.message : 'Could not load the activity' }
  }
}

/** People for the "Who" filter. */
export async function listActivityPeopleAction(): Promise<{ data: Array<{ id: string; name: string }> | null; error: string | null }> {
  try {
    await guard('users.manage')
    const { fetchUsersFromConvex } = await import('@/lib/convex/core-bridge')
    const users = await fetchUsersFromConvex()
    return { data: users.filter((u) => u.role !== 'visitor').map((u) => ({ id: u.id, name: u.full_name })).sort((a, b) => a.name.localeCompare(b.name)), error: null }
  } catch (error: unknown) {
    return { data: null, error: error instanceof Error ? error.message : 'Could not load people' }
  }
}
