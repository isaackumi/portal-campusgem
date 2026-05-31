/** SLA buckets for RLC follow-up queue (mirrors camp follow-up). */

export type RlcFollowUpSlaBucket = 'overdue' | 'due_soon' | 'healthy' | 'completed'

export type RlcFollowUpSlaInput = {
  follow_up_status?: string | null
  created_at: string
}

const DAY_MS = 24 * 60 * 60 * 1000

export function classifyRlcFollowUpSla(
  row: RlcFollowUpSlaInput,
  now: number = Date.now()
): RlcFollowUpSlaBucket {
  const status = row.follow_up_status ?? 'pending'
  if (status === 'completed') return 'completed'

  const createdAt = new Date(row.created_at).getTime()
  const ageDays = Number.isFinite(createdAt) ? (now - createdAt) / DAY_MS : 0

  if (status === 'pending' && ageDays > 3) return 'overdue'
  if (status === 'in_progress' && ageDays > 7) return 'overdue'
  if (ageDays > 2) return 'due_soon'
  return 'healthy'
}

export function summarizeRlcFollowUpSla(rows: RlcFollowUpSlaInput[], now?: number): {
  overdue: number
  dueSoon: number
  healthy: number
} {
  let overdue = 0
  let dueSoon = 0
  let healthy = 0
  const at = now ?? Date.now()

  for (const row of rows) {
    const bucket = classifyRlcFollowUpSla(row, at)
    if (bucket === 'overdue') overdue += 1
    else if (bucket === 'due_soon') dueSoon += 1
    else if (bucket === 'healthy') healthy += 1
  }

  return { overdue, dueSoon, healthy }
}

export function rlcFollowUpHref(args: {
  sla?: 'overdue' | 'due_soon' | 'healthy'
  status?: 'pending' | 'in_progress' | 'completed'
  mine?: boolean
}): string {
  const params = new URLSearchParams()
  if (args.sla) params.set('sla', args.sla)
  if (args.status) params.set('status', args.status)
  if (args.mine) params.set('mine', '1')
  const q = params.toString()
  return q ? `/admin/rlc/follow-up?${q}` : '/admin/rlc/follow-up'
}
