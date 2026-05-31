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
