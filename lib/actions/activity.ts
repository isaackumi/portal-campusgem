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
  /** Extra facts saved with the entry (a call note, counts…), as readable text. */
  details?: Array<{ key: string; value: string }>
}

/** Saved details as short label / text pairs for the page (nested values flattened to text). */
function plainDetails(details: Record<string, unknown>): Array<{ key: string; value: string }> {
  return Object.entries(details)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .slice(0, 12)
    .map(([k, v]) => ({
      key: k.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase(),
      value: (typeof v === 'object' ? JSON.stringify(v) : String(v)).slice(0, 300),
    }))
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
  /**
   * The start time the first page used. Later pages must send it back: a cursor only works for the
   * exact same query, and "7 days ago" computed again a minute later is a different query.
   */
  since?: number | null
}): Promise<{ data: { rows: ActivityRow[]; cursor: string | null; since: number } | null; error: string | null }> {
  try {
    await guard('users.manage')
    const secret = process.env.CAMP_CONVEX_SERVER_SECRET
    if (!secret) throw new Error('The activity log needs CAMP_CONVEX_SERVER_SECRET.')
    const { getConvexHttpClient } = await import('@/lib/convex/http-client')
    const { api } = await import('@/convex/_generated/api')
    const continuing = Boolean(input.cursor) && typeof input.since === 'number' && Number.isFinite(input.since)
    const since = continuing ? (input.since as number) : sinceOf(input.range ?? '7d')
    const page = await getConvexHttpClient().query(api.activity.listWithSecret, {
      secret,
      ...(input.actorId ? { actor_id: input.actorId } : {}),
      ...(input.category && isActivityCategory(input.category) ? { category: input.category } : {}),
      since,
      ...(input.failedOnly ? { failed_only: true } : {}),
      // A cursor without its start time can't be trusted to match: start from the top instead.
      cursor: continuing ? input.cursor! : null,
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
      ...(r.details && typeof r.details === 'object' ? { details: plainDetails(r.details as Record<string, unknown>) } : {}),
    }))
    return { data: { rows, cursor: page.cursor, since }, error: null }
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
