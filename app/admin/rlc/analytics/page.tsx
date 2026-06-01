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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Total visitors', stats.total_visitors],
          ['Active pipeline', stats.active_visitors],
          ['Converted', stats.converted_visitors],
          ['Conversion %', `${stats.conversion_rate}%`],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardDescription>{label}</CardDescription>
              <CardTitle className="text-3xl tabular-nums">{value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LineChart className="h-5 w-5 text-rose-600" />
            Visitor arrivals over time
          </CardTitle>
          <CardDescription>Daily first visits and cumulative RLC visitors.</CardDescription>
        </CardHeader>
        <CardContent>
          <AnalyticsCumulativeChart points={timeline} height={280} emptyMessage="No visit dates recorded yet" />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-rose-600" />
              Pipeline funnel
            </CardTitle>
            <CardDescription>Stage counts across the RLC membership journey.</CardDescription>
          </CardHeader>
          <CardContent>
            <AnalyticsHorizontalBarChart data={funnelData} barColor="#e11d48" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-violet-600" />
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
              barColor="#8b5cf6"
            />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Insights</CardTitle>
          <CardDescription>
            Follow-up queue: {stats.pending_follow_up} pending ·{' '}
            <Link href={rlcFollowUpHref({ sla: 'overdue' })} className="text-rose-700 underline">
              review overdue
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {insights.map((i) => (
            <div
              key={i.id}
              className={`rounded-lg border px-4 py-3 text-sm ${
                i.severity === 'warning'
                  ? 'border-amber-200 bg-amber-50'
                  : i.severity === 'success'
                    ? 'border-emerald-200 bg-emerald-50'
                    : 'border-slate-200 bg-slate-50'
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
