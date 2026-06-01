'use client'

import type { CampTrendAnalysis } from '@/lib/camp/analytics'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, ScrollableTabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AnalyticsCohortRetentionChart,
  AnalyticsFunnelRateTrendChart,
  AnalyticsMetricTrendChart,
  AnalyticsRegistrationGrowthChart,
  AnalyticsRevenueChart,
  AnalyticsVelocityOverlayChart,
} from '@/components/charts/analytics-charts'
import { CampDemographicTrendTable } from '@/components/camp/camp-analytics-charts'
import { downloadCampTrendReportCsv } from '@/lib/camp/analytics-export'
import type { CombinedRevenueSummary } from '@/lib/camp/analytics'
import { Button } from '@/components/ui/button'
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  FileSpreadsheet,
  LineChart,
  MapPin,
  Minus,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react'

type Props = {
  trends: CampTrendAnalysis
  revenue: CombinedRevenueSummary
  yearCount: number
}

function TrendDelta({
  current,
  previous,
  suffix = '',
  isPercentPoints = false,
}: {
  current: number
  previous: number | null
  suffix?: string
  isPercentPoints?: boolean
}) {
  if (previous == null) return <span className="text-xs text-muted-foreground">First year baseline</span>
  const delta = current - previous
  if (delta === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-slate-500">
        <Minus className="h-3 w-3" /> No change vs prior year
      </span>
    )
  }
  const positive = delta > 0
  const display = isPercentPoints ? `${delta > 0 ? '+' : ''}${delta} pp` : `${delta > 0 ? '+' : ''}${delta.toLocaleString()}${suffix}`
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${positive ? 'text-emerald-700' : 'text-rose-700'}`}>
      {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {display} vs prior year
    </span>
  )
}

export function CampTrendAnalysisPanel({ trends, revenue, yearCount }: Props) {
  if (yearCount < 2) {
    return (
      <Card className="border-2 border-dashed border-slate-200 bg-slate-50/40">
        <CardContent className="py-8 text-center text-sm text-slate-600">
          Add at least <strong>two camp years</strong> with registrations to unlock cross-year trend analysis.
        </CardContent>
      </Card>
    )
  }

  const latest = trends.kpiByYear[trends.kpiByYear.length - 1]
  const prior = trends.kpiByYear.length > 1 ? trends.kpiByYear[trends.kpiByYear.length - 2] : null

  return (
    <div className="space-y-6">
      <div className="rounded-xl border-2 border-slate-200 bg-gradient-to-br from-slate-50/80 via-white to-slate-100/50 p-4 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Cross-year analysis</p>
            <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Camp meeting trends</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Track registration growth, operational health, and demographic shifts across {yearCount} camp years.
              Hover charts for exact values.
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            {latest ? (
              <Badge variant="outline" className="w-fit shrink-0 border-indigo-300 bg-white">
                Latest: Camp {latest.year}
                {latest.theme ? ` · ${latest.theme}` : ''}
              </Badge>
            ) : null}
            <Button variant="outline" size="sm" className="w-fit shrink-0 bg-white" onClick={() => downloadCampTrendReportCsv(trends)}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Export trends CSV
            </Button>
          </div>
        </div>

        {latest ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Registrations', value: latest.total.toLocaleString(), current: latest.total, previous: prior?.total ?? null },
              { label: 'Check-in rate', value: `${latest.checkInRate}%`, current: latest.checkInRate, previous: prior?.checkInRate ?? null, isPercentPoints: true },
              { label: 'Return rate', value: `${latest.returnRate}%`, current: latest.returnRate, previous: prior?.returnRate ?? null, isPercentPoints: true },
              { label: 'Data quality', value: `${latest.dataQualityScore}%`, current: latest.dataQualityScore, previous: prior?.dataQualityScore ?? null, isPercentPoints: true },
            ].map((tile) => (
              <div key={tile.label} className="rounded-lg border border-white/80 bg-white/90 p-3 shadow-sm">
                <p className="text-xs font-medium text-muted-foreground">{tile.label}</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{tile.value}</p>
                <TrendDelta
                  current={tile.current}
                  previous={tile.previous}
                  isPercentPoints={tile.isPercentPoints}
                />
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {trends.alerts.length > 0 ? (
        <div className="space-y-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            Year-over-year alerts
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {trends.alerts.map((alert) => (
              <div
                key={alert.id}
                className={`rounded-lg border px-4 py-3 text-sm ${
                  alert.severity === 'warning'
                    ? 'border-amber-200 bg-amber-50'
                    : alert.severity === 'success'
                      ? 'border-emerald-200 bg-emerald-50'
                      : 'border-slate-200 bg-slate-50'
                }`}
              >
                <p className="font-medium text-slate-900">{alert.title}</p>
                <p className="mt-0.5 text-muted-foreground">{alert.detail}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <Tabs defaultValue="performance" className="space-y-4">
        <ScrollableTabsList className="w-full">
          <TabsTrigger value="performance" className="flex-1 sm:flex-none">
            Performance
          </TabsTrigger>
          <TabsTrigger value="velocity" className="flex-1 sm:flex-none">
            Velocity
          </TabsTrigger>
          <TabsTrigger value="cohorts" className="flex-1 sm:flex-none">
            Cohorts
          </TabsTrigger>
          <TabsTrigger value="operations" className="flex-1 sm:flex-none">
            Operations
          </TabsTrigger>
          <TabsTrigger value="demographics" className="flex-1 sm:flex-none">
            Demographics
          </TabsTrigger>
          <TabsTrigger value="revenue" className="flex-1 sm:flex-none">
            Revenue
          </TabsTrigger>
        </ScrollableTabsList>

        <TabsContent value="performance" className="mt-0 space-y-6 focus-visible:outline-none">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-2">
              <CardHeader className="border-b bg-slate-50">
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-5 w-5 text-indigo-600" />
                  Registration growth
                </CardTitle>
                <CardDescription>Total sign-ups per year with year-on-year % change</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <AnalyticsRegistrationGrowthChart rows={trends.registrationGrowth} />
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader className="border-b bg-slate-50">
                <CardTitle className="flex items-center gap-2 text-base">
                  <LineChart className="h-5 w-5 text-primary" />
                  KPI rate trends
                </CardTitle>
                <CardDescription>Check-in, retention, payments, data quality, and follow-up completion</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <AnalyticsMetricTrendChart series={trends.kpiRateSeries} height={300} />
              </CardContent>
            </Card>
          </div>

          <Card className="border-2">
            <CardHeader className="border-b bg-slate-50">
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-5 w-5 text-violet-600" />
                Funnel conversion over time
              </CardTitle>
              <CardDescription>
                What % of registrants reach check-in, payment, and follow-up completion each year
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <AnalyticsFunnelRateTrendChart rows={trends.funnelRates} />
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader className="border-b bg-slate-50">
              <CardTitle className="text-base">Year-by-year KPI table</CardTitle>
              <CardDescription>Full metrics for planning and leadership reports</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto pt-4">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Year</th>
                    <th className="pb-2 pr-4 font-medium">Total</th>
                    <th className="pb-2 pr-4 font-medium">Growth</th>
                    <th className="pb-2 pr-4 font-medium">New</th>
                    <th className="pb-2 pr-4 font-medium">Returning</th>
                    <th className="pb-2 pr-4 font-medium">Check-in</th>
                    <th className="pb-2 pr-4 font-medium">Return %</th>
                    <th className="pb-2 pr-4 font-medium">Collection</th>
                    <th className="pb-2 font-medium">Data quality</th>
                  </tr>
                </thead>
                <tbody>
                  {trends.kpiByYear.map((row) => (
                    <tr key={row.year} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-semibold">
                        {row.year}
                        {row.theme ? (
                          <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{row.theme}</span>
                        ) : null}
                      </td>
                      <td className="py-3 pr-4 tabular-nums">{row.total.toLocaleString()}</td>
                      <td className="py-3 pr-4 tabular-nums">
                        {row.growthPercent == null ? '—' : `${row.growthPercent >= 0 ? '+' : ''}${row.growthPercent}%`}
                      </td>
                      <td className="py-3 pr-4 tabular-nums">{row.newCampers}</td>
                      <td className="py-3 pr-4 tabular-nums">{row.returningCampers}</td>
                      <td className="py-3 pr-4 tabular-nums">{row.checkInRate}%</td>
                      <td className="py-3 pr-4 tabular-nums">{row.returnRate}%</td>
                      <td className="py-3 pr-4 tabular-nums">{row.collectionRate}%</td>
                      <td className="py-3 tabular-nums">{row.dataQualityScore}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="velocity" className="mt-0 space-y-6 focus-visible:outline-none">
          <Card className="border-2">
            <CardHeader className="border-b bg-slate-50">
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="h-5 w-5 text-amber-600" />
                Registration velocity overlay
              </CardTitle>
              <CardDescription>
                Cumulative sign-ups by days since each camp year&apos;s first registration — compare how fast
                different years fill up
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <AnalyticsVelocityOverlayChart series={trends.velocityOverlay} height={340} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cohorts" className="mt-0 space-y-6 focus-visible:outline-none">
          <Card className="border-2">
            <CardHeader className="border-b bg-slate-50">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-5 w-5 text-violet-600" />
                First-time camper cohort retention
              </CardTitle>
              <CardDescription>
                For each camp year, track how many first-time registrants (by phone) return in later years
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <AnalyticsCohortRetentionChart cohorts={trends.cohortRetention} height={300} />
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="bg-slate-50">
                    <tr className="text-left text-muted-foreground">
                      <th className="px-3 py-2 font-medium">Cohort (first camp)</th>
                      <th className="px-3 py-2 font-medium">Size</th>
                      {trends.cohortRetention[0]?.returnsByYear.map((r) => (
                        <th key={r.year} className="px-3 py-2 font-medium">
                          {r.year}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {trends.cohortRetention
                      .filter((c) => c.cohortSize > 0)
                      .map((cohort) => (
                        <tr key={cohort.cohortYear} className="border-t">
                          <td className="px-3 py-2 font-semibold">{cohort.cohortYear}</td>
                          <td className="px-3 py-2 tabular-nums">{cohort.cohortSize}</td>
                          {cohort.returnsByYear.map((ret) => (
                            <td key={`${cohort.cohortYear}-${ret.year}`} className="px-3 py-2 text-slate-600">
                              {ret.rate}%
                              <span className="ml-1 text-xs text-muted-foreground">({ret.count})</span>
                            </td>
                          ))}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="operations" className="mt-0 space-y-6 focus-visible:outline-none">
          <Card className="border-2">
            <CardHeader className="border-b bg-slate-50">
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-5 w-5 text-teal-600" />
                Operations & planning signals
              </CardTitle>
              <CardDescription>
                NHIS coverage, health reporting, parent contacts, payments, and follow-up — tracked year over year
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <AnalyticsMetricTrendChart series={trends.operationsSeries} height={320} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="demographics" className="mt-0 space-y-8 focus-visible:outline-none">
          <Card className="border-2">
            <CardHeader className="border-b bg-slate-50">
              <CardTitle className="text-base">Age bracket mix over time</CardTitle>
              <CardDescription>Share of each age group per camp year (% of that year&apos;s registrations)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <CampDemographicTrendTable title="Age bracket" rows={trends.demographicTrends.ageBracket} />
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader className="border-b bg-slate-50">
              <CardTitle className="text-base">Gender mix over time</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <CampDemographicTrendTable title="Gender" rows={trends.demographicTrends.gender} />
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader className="border-b bg-slate-50">
              <CardTitle className="text-base">Education band over time</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <CampDemographicTrendTable title="Education band" rows={trends.demographicTrends.educationBand} />
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader className="border-b bg-slate-50">
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-5 w-5 text-red-600" />
                Top residence regions over time
              </CardTitle>
              <CardDescription>How geographic reach shifts season to season</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <CampDemographicTrendTable title="Residence" rows={trends.demographicTrends.residence} />
            </CardContent>
          </Card>

          {trends.roleTrends.length > 0 ? (
            <Card className="border-2">
              <CardHeader className="border-b bg-slate-50">
                <CardTitle className="text-base">Role mix over time</CardTitle>
                <CardDescription>Participants, workers, volunteers, and other roles per camp year</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <CampDemographicTrendTable title="Role" rows={trends.roleTrends} />
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="revenue" className="mt-0 space-y-6 focus-visible:outline-none">
          <Card className="border-2">
            <CardHeader className="border-b bg-slate-50">
              <CardTitle className="text-base">Revenue collected vs pending</CardTitle>
              <CardDescription>Camp fee collection trend by year (₵)</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <AnalyticsRevenueChart rows={revenue.byYear} height={300} />
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader className="border-b bg-slate-50">
              <CardTitle className="text-base">Collection rate trend</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <AnalyticsMetricTrendChart
                height={260}
                series={[
                  {
                    key: 'collectionRate',
                    label: 'Collection rate',
                    values: trends.kpiByYear.map((row) => ({ year: row.year, value: row.collectionRate })),
                  },
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
