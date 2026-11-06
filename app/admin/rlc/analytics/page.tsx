'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { loadRlcStatsAction, loadRlcVisitorsAction } from '@/lib/actions/rlc'
import {
  buildRlcAnalyticsInsights,
  rlcFollowUpBreakdown,
  rlcPipelineFunnel,
  rlcSourceSlices,
  rlcVisitorTimeline,
} from '@/lib/rlc/analytics'
import { RLC_SOURCE_LABELS } from '@/lib/constants/rlc'
import type { RlcStats, Visitor } from '@/lib/types'
import { PageContainer } from '@/components/layout/page-container'
import { StatCard } from '@/components/ui/stat-card'
import { RlcPageHeader } from '@/components/rlc/rlc-page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/loading'
import { rlcFollowUpHref } from '@/lib/rlc/follow-up-sla'
import { AnalyticsPieChart } from '@/components/charts/analytics-pie-chart'
import {
  AnalyticsCumulativeChart,
  AnalyticsHorizontalBarChart,
} from '@/components/charts/analytics-charts'
import { BarChart3, LineChart, PieChartIcon } from 'lucide-react'

export default function RlcAnalyticsPage() {
  const [stats, setStats] = useState<RlcStats | null>(null)
  const [visitors, setVisitors] = useState<Visitor[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([loadRlcStatsAction(), loadRlcVisitorsAction()]).then(([s, v]) => {
      setStats(s.data ?? null)
      setVisitors(v.data ?? [])
      setLoading(false)
    })
  }, [])

  const sourceSlices = useMemo(() => {
    if (!stats) return []
    return rlcSourceSlices(stats).map((row) => ({
      label: RLC_SOURCE_LABELS[row.label as keyof typeof RLC_SOURCE_LABELS] ?? row.label.replace(/_/g, ' '),
      count: row.count,
    }))
  }, [stats])

  const timeline = useMemo(() => rlcVisitorTimeline(visitors), [visitors])
  const followUpRows = useMemo(() => rlcFollowUpBreakdown(visitors), [visitors])

  if (loading || !stats) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  const insights = buildRlcAnalyticsInsights(stats, visitors)
  const funnel = rlcPipelineFunnel(stats)
  const funnelData = funnel.map((stage) => ({
    name: stage.stage,
    value: stage.count,
    percent: stats.total_visitors > 0 ? Math.round((stage.count / stats.total_visitors) * 100) : 0,
  }))

  return (
    <PageContainer>
      <RlcPageHeader title="RLC Analytics" subtitle="Conversion funnel, sources, visitor trends, and follow-up health." />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {[
          ['Total visitors', stats.total_visitors],
          ['Active pipeline', stats.active_visitors],
          ['Converted', stats.converted_visitors],
          ['Conversion %', `${stats.conversion_rate}%`],
        ].map(([label, value]) => (
          <StatCard key={label} className="p-4 sm:p-5" label={String(label)} value={value} />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LineChart className="h-5 w-5 text-neutral-400 dark:text-neutral-500" />
            Visitor arrivals over time
          </CardTitle>
          <CardDescription>Daily first visits and cumulative RLC visitors.</CardDescription>
        </CardHeader>
        <CardContent>
          <AnalyticsCumulativeChart points={timeline} height={280} emptyMessage="No visit dates recorded yet" />
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-neutral-400 dark:text-neutral-500" />
              Pipeline funnel
            </CardTitle>
            <CardDescription>How many people are at each step, from first visit to member.</CardDescription>
          </CardHeader>
          <CardContent>
            <AnalyticsHorizontalBarChart data={funnelData} barColor="#4f46e5" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-neutral-400 dark:text-neutral-500" />
              Visitor sources
            </CardTitle>
            <CardDescription>Where RLC visitors heard about the church.</CardDescription>
          </CardHeader>
          <CardContent>
            {sourceSlices.length === 0 ? (
              <p className="text-sm text-muted-foreground">No source data yet.</p>
            ) : (
              <AnalyticsPieChart slices={sourceSlices} height={260} />
            )}
          </CardContent>
        </Card>
      </div>

      {followUpRows.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Follow-up pipeline</CardTitle>
            <CardDescription>Active visitor follow-up status and SLA health.</CardDescription>
          </CardHeader>
          <CardContent>
            <AnalyticsHorizontalBarChart
              data={followUpRows.map((row) => ({
                name: row.label,
                value: row.count,
              }))}
              barColor="#4f46e5"
            />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Worth knowing</CardTitle>
          <CardDescription>
            Follow-up queue: {stats.pending_follow_up} pending ·{' '}
            <Link href={rlcFollowUpHref({ sla: 'overdue' })} className="text-brand-700 underline dark:text-brand-300">
              review overdue
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {insights.map((i) => (
            <div
              key={i.id}
              className={`rounded-lg border px-3 py-3 text-sm sm:px-4 ${
                i.severity === 'warning'
                  ? 'border-amber-200 bg-amber-50 dark:border-amber-400/20 dark:bg-amber-400/10'
                  : i.severity === 'success'
                    ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-400/20 dark:bg-emerald-400/10'
                    : 'border-neutral-200 bg-neutral-50 dark:border-white/10 dark:bg-white/[0.04]'
              }`}
            >
              <p className="font-medium">{i.title}</p>
              <p className="text-muted-foreground">{i.detail}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </PageContainer>
  )
}
