import type { RlcStats, Visitor } from '@/lib/types'
import { classifyRlcFollowUpSla } from '@/lib/rlc/follow-up-sla'

export type RlcAnalyticsInsight = {
  id: string
  severity: 'info' | 'warning' | 'success'
  title: string
  detail: string
}

export function buildRlcAnalyticsInsights(stats: RlcStats, visitors: Visitor[]): RlcAnalyticsInsight[] {
  const insights: RlcAnalyticsInsight[] = []

  if (stats.conversion_rate >= 40) {
    insights.push({
      id: 'conversion-strong',
      severity: 'success',
      title: 'Strong visitor conversion',
      detail: `${stats.conversion_rate}% of RLC visitors have become members.`,
    })
  } else if (stats.active_visitors > 5 && stats.conversion_rate < 15) {
    insights.push({
      id: 'conversion-low',
      severity: 'warning',
      title: 'Conversion needs attention',
      detail: `Only ${stats.conversion_rate}% conversion with ${stats.active_visitors} active visitors in pipeline.`,
    })
  }

  if (stats.pending_follow_up > 0) {
    insights.push({
      id: 'pending-follow-up',
      severity: stats.pending_follow_up > 10 ? 'warning' : 'info',
      title: `${stats.pending_follow_up} visitors awaiting first follow-up`,
      detail: 'Assign follow-up members and log contact attempts promptly.',
    })
  }

  const active = visitors.filter((v) => v.is_active && !v.converted_to_member)
  const overdue = active.filter((v) => classifyRlcFollowUpSla(v) === 'overdue').length
  if (overdue > 0) {
    insights.push({
      id: 'overdue-sla',
      severity: 'warning',
      title: `${overdue} follow-ups overdue SLA`,
      detail: 'Pending >3 days or in-progress >7 days — prioritize these contacts.',
    })
  }

  const topSource = Object.entries(stats.source_counts).sort((a, b) => b[1] - a[1])[0]
  if (topSource) {
    insights.push({
      id: 'top-source',
      severity: 'info',
      title: `Top visitor source: ${topSource[0].replace('_', ' ')}`,
      detail: `${topSource[1]} visitors recorded from this channel.`,
    })
  }

  if (stats.week_attendance > 0) {
    insights.push({
      id: 'attendance-week',
      severity: 'info',
      title: `${stats.week_attendance} RLC check-ins this week`,
      detail: `${stats.today_attendance} recorded today across RLC services.`,
    })
  }

  return insights
}

export function rlcPipelineFunnel(stats: RlcStats): Array<{ stage: string; count: number }> {
  return [
    { stage: 'First Visit', count: stats.pipeline_counts.first_visit },
    { stage: 'Follow-up', count: stats.pipeline_counts.follow_up },
    { stage: 'New Member', count: stats.pipeline_counts.new_member },
    { stage: 'Full Member', count: stats.pipeline_counts.full_member },
  ]
}

export function rlcSourceSlices(stats: RlcStats): Array<{ label: string; count: number }> {
  return Object.entries(stats.source_counts)
    .sort((a, b) => b[1] - a[1])
    .map(([src, count]) => ({ label: src, count }))
}

export function rlcVisitorTimeline(visitors: Visitor[]): Array<{ label: string; count: number; cumulative: number }> {
  const dayCounts = new Map<string, number>()
  for (const visitor of visitors) {
    const day = visitor.visit_date?.slice(0, 10)
    if (!day) continue
    dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1)
  }
  const sorted = Array.from(dayCounts.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  let running = 0
  return sorted.map(([date, count]) => {
    running += count
    const label = new Date(`${date}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    return { label, count, cumulative: running }
  })
}

export function rlcFollowUpBreakdown(visitors: Visitor[]): Array<{ label: string; count: number }> {
  const active = visitors.filter((v) => v.is_active && !v.converted_to_member)
  const buckets = new Map<string, number>([
    ['Pending', 0],
    ['In progress', 0],
    ['Overdue SLA', 0],
    ['Completed', 0],
  ])
  for (const v of visitors) {
    if (v.converted_to_member) {
      buckets.set('Completed', (buckets.get('Completed') ?? 0) + 1)
      continue
    }
    if (!v.is_active) continue
    const sla = classifyRlcFollowUpSla(v)
    if (sla === 'overdue') buckets.set('Overdue SLA', (buckets.get('Overdue SLA') ?? 0) + 1)
    else if (v.follow_up_status === 'in_progress') buckets.set('In progress', (buckets.get('In progress') ?? 0) + 1)
    else buckets.set('Pending', (buckets.get('Pending') ?? 0) + 1)
  }
  if (active.length === 0 && visitors.every((v) => v.converted_to_member || !v.is_active)) {
    // still show completed
  }
  return Array.from(buckets.entries())
    .filter(([, count]) => count > 0)
    .map(([label, count]) => ({ label, count }))
}
