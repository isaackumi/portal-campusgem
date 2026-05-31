'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { loadRlcStatsAction, loadRlcVisitorsAction } from '@/lib/actions/rlc'
import { buildRlcAnalyticsInsights, rlcPipelineFunnel } from '@/lib/rlc/analytics'
import { RLC_SOURCE_LABELS } from '@/lib/constants/rlc'
import type { RlcStats, Visitor } from '@/lib/types'
import { RlcPageHeader } from '@/components/rlc/rlc-page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/loading'
import { rlcFollowUpHref } from '@/lib/rlc/follow-up-sla'

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

  if (loading || !stats) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  const insights = buildRlcAnalyticsInsights(stats, visitors)
  const funnel = rlcPipelineFunnel(stats)
  const maxFunnel = Math.max(...funnel.map((f) => f.count), 1)

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <RlcPageHeader title="RLC Analytics" subtitle="Conversion funnel, sources, and follow-up health." />

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

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pipeline funnel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {funnel.map((stage) => (
              <div key={stage.stage}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{stage.stage}</span>
                  <span className="font-medium tabular-nums">{stage.count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-rose-600"
                    style={{ width: `${(stage.count / maxFunnel) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Visitor sources</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(stats.source_counts).length === 0 ? (
              <p className="text-sm text-muted-foreground">No source data yet.</p>
            ) : (
              Object.entries(stats.source_counts)
                .sort((a, b) => b[1] - a[1])
                .map(([src, count]) => (
                  <div key={src} className="flex items-center justify-between text-sm">
                    <span>{RLC_SOURCE_LABELS[src as keyof typeof RLC_SOURCE_LABELS] ?? src}</span>
                    <span className="font-semibold tabular-nums">{count}</span>
                  </div>
                ))
            )}
          </CardContent>
        </Card>
      </div>

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
    </div>
  )
}
