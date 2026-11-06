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
  if (previous == null) return <span className="text-xs text-neutral-500 dark:text-neutral-400">First year baseline</span>
  const delta = current - previous
  if (delta === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
        <Minus className="h-3 w-3" /> No change vs prior year
      </span>
    )
  }
  const positive = delta > 0
  const display = isPercentPoints ? `${delta > 0 ? '+' : ''}${delta} pp` : `${delta > 0 ? '+' : ''}${delta.toLocaleString()}${suffix}`
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${positive ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
      {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {display} vs prior year
    </span>
  )
}

export function CampTrendAnalysisPanel({ trends, revenue, yearCount }: Props) {
  if (yearCount < 2) {
    return (
      <Card className="border-dashed border-neutral-200 dark:border-white/10 bg-neutral-50/40 dark:bg-white/[0.03]">
        <CardContent className="py-8 text-center text-sm text-neutral-600 dark:text-neutral-400">
          Add at least <strong>two camp years</strong> with registrations to compare one year with another.
        </CardContent>
      </Card>
    )
  }

  const latest = trends.kpiByYear[trends.kpiByYear.length - 1]
  const prior = trends.kpiByYear.length > 1 ? trends.kpiByYear[trends.kpiByYear.length - 2] : null

  return (
    <div className="space-y-6">
      <div className="dashboard-panel p-4 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="app-overline text-brand-700 dark:text-brand-300">Cross-year analysis</p>
            <h2 className="app-section-title">Camp meeting trends</h2>
            <p className="mt-1 max-w-2xl text-sm text-neutral-500 dark:text-neutral-400">
              Track registration growth, operational health, and demographic shifts across {yearCount} camp years.
              Hover charts for exact values.
            </p>
          </div>
          <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:items-end">
            {latest ? (
              <Badge variant="brand" className="w-fit max-w-full shrink-0 truncate">
                Latest: Camp {latest.year}
                {latest.theme ? ` · ${latest.theme}` : ''}
              </Badge>
            ) : null}
            <Button variant="outline" size="sm" className="h-11 w-full shrink-0 sm:h-9 sm:w-fit" onClick={() => downloadCampTrendReportCsv(trends)}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Export trends CSV
            </Button>
          </div>
        </div>

        {latest ? (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
            {[
              { label: 'Registrations', value: latest.total.toLocaleString(), current: latest.total, previous: prior?.total ?? null },
              { label: 'Check-in rate', value: `${latest.checkInRate}%`, current: latest.checkInRate, previous: prior?.checkInRate ?? null, isPercentPoints: true },
              { label: 'Return rate', value: `${latest.returnRate}%`, current: latest.returnRate, previous: prior?.returnRate ?? null, isPercentPoints: true },
              { label: 'Data quality', value: `${latest.dataQualityScore}%`, current: latest.dataQualityScore, previous: prior?.dataQualityScore ?? null, isPercentPoints: true },
            ].map((tile) => (
              <div key={tile.label} className="min-w-0 rounded-lg border border-neutral-200/80 bg-neutral-50/60 p-3 dark:border-white/[0.06] dark:bg-white/[0.03]">
                <p className="app-stat-label">{tile.label}</p>
                <p className="app-stat-value mt-1 text-neutral-900 dark:text-neutral-100">{tile.value}</p>
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
          <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden />
            Year-over-year alerts
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {trends.alerts.map((alert) => (
              <div
                key={alert.id}
                className={`rounded-lg border px-4 py-3 text-sm ${
                  alert.severity === 'warning'
                    ? 'border-amber-200 bg-amber-50 dark:border-amber-400/20 dark:bg-amber-400/10'
                    : alert.severity === 'success'
                      ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-400/20 dark:bg-emerald-400/10'
                      : 'border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/[0.04]'
                }`}
              >
                <p className="font-medium text-neutral-900 dark:text-neutral-100">{alert.title}</p>
                <p className="mt-0.5 text-neutral-500 dark:text-neutral-400">{alert.detail}</p>
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
            Pace
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
            <Card>
              <CardHeader className="border-b border-neutral-200/80 p-4 dark:border-white/[0.06] sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-5 w-5 text-neutral-400 dark:text-neutral-500" aria-hidden />
                  Registration growth
                </CardTitle>
                <CardDescription>Total sign-ups per year with year-on-year % change</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-5 sm:p-6">
                <AnalyticsRegistrationGrowthChart rows={trends.registrationGrowth} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b border-neutral-200/80 p-4 dark:border-white/[0.06] sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base">
                  <LineChart className="h-5 w-5 text-primary" />
                  KPI rate trends
                </CardTitle>
                <CardDescription>Check-in, retention, payments, data quality, and follow-up completion</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-5 sm:p-6">
                <AnalyticsMetricTrendChart series={trends.kpiRateSeries} height={300} />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="border-b border-neutral-200/80 p-4 dark:border-white/[0.06] sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-5 w-5 text-neutral-400 dark:text-neutral-500" aria-hidden />
                Funnel conversion over time
              </CardTitle>
              <CardDescription>
                What % of registrants reach check-in, payment, and follow-up completion each year
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-5 sm:p-6">
              <AnalyticsFunnelRateTrendChart rows={trends.funnelRates} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-neutral-200/80 p-4 dark:border-white/[0.06] sm:p-6">
              <CardTitle className="text-base">Year-by-year KPI table</CardTitle>
              <CardDescription>Full metrics for planning and leadership reports</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <ul className="divide-y divide-neutral-200/80 md:hidden dark:divide-white/[0.06]">
                {trends.kpiByYear.map((row) => (
                  <li key={row.year} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="min-w-0 font-semibold text-neutral-900 dark:text-neutral-100">
                        {row.year}
                        {row.theme ? (
                          <span className="mt-0.5 block truncate text-xs font-normal text-neutral-500 dark:text-neutral-400">{row.theme}</span>
                        ) : null}
                      </p>
                      <div className="shrink-0 text-right">
                        <p className="text-lg font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">{row.total.toLocaleString()}</p>
                        {row.growthPercent == null ? null : (
                          <p className="text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
                            {`${row.growthPercent >= 0 ? '+' : ''}${row.growthPercent}%`} growth
                          </p>
                        )}
                      </div>
                    </div>
                    <dl className="mt-2 grid grid-cols-3 gap-x-3 gap-y-1.5 text-xs">
                      {[
                        ['New', row.newCampers],
                        ['Returning', row.returningCampers],
                        ['Check-in', `${row.checkInRate}%`],
                        ['Return', `${row.returnRate}%`],
                        ['Collection', `${row.collectionRate}%`],
                        ['Data', `${row.dataQualityScore}%`],
                      ].map(([label, value]) => (
                        <div key={String(label)} className="min-w-0">
                          <dt className="text-neutral-500 dark:text-neutral-400">{label}</dt>
                          <dd className="font-medium tabular-nums text-neutral-900 dark:text-neutral-100">{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </li>
                ))}
              </ul>
              <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-neutral-200/80 dark:border-white/[0.06] text-left text-neutral-500 dark:text-neutral-400">
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
                          <span className="mt-0.5 block text-xs font-normal text-neutral-500 dark:text-neutral-400">{row.theme}</span>
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
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="velocity" className="mt-0 space-y-6 focus-visible:outline-none">
          <Card>
            <CardHeader className="border-b border-neutral-200/80 p-4 dark:border-white/[0.06] sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base">
                How fast each year filled up
              </CardTitle>
              <CardDescription>
                Cumulative sign-ups by days since each camp year&apos;s first registration — compare how fast
                different years fill up
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-5 sm:p-6">
              <AnalyticsVelocityOverlayChart series={trends.velocityOverlay} height={340} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cohorts" className="mt-0 space-y-6 focus-visible:outline-none">
          <Card>
            <CardHeader className="border-b border-neutral-200/80 p-4 dark:border-white/[0.06] sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-5 w-5 text-neutral-400 dark:text-neutral-500" aria-hidden />
                First-time camper cohort retention
              </CardTitle>
              <CardDescription>
                For each camp year, track how many first-time registrants (by phone) return in later years
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 p-4 pt-5 sm:p-6">
              <AnalyticsCohortRetentionChart cohorts={trends.cohortRetention} height={300} />
              <div className="overflow-x-auto rounded-lg border border-neutral-200/80 dark:border-white/[0.06]">
                <table className="w-full text-sm sm:min-w-[560px]">
                  <thead className="bg-neutral-50 dark:bg-white/[0.04]">
                    <tr className="text-left text-neutral-500 dark:text-neutral-400">
                      <th className="sticky left-0 bg-neutral-50 px-3 py-2 font-medium dark:bg-neutral-800">Cohort</th>
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
                        <tr key={cohort.cohortYear} className="border-t border-neutral-200/80 dark:border-white/[0.06]">
                          <td className="sticky left-0 bg-white px-3 py-2 font-semibold dark:bg-neutral-800">{cohort.cohortYear}</td>
                          <td className="px-3 py-2 tabular-nums">{cohort.cohortSize}</td>
                          {cohort.returnsByYear.map((ret) => (
                            <td key={`${cohort.cohortYear}-${ret.year}`} className="whitespace-nowrap px-3 py-2 tabular-nums text-neutral-600 dark:text-neutral-400">
                              {ret.rate}%
                              <span className="ml-1 text-xs text-neutral-500 dark:text-neutral-400">({ret.count})</span>
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
          <Card>
            <CardHeader className="border-b border-neutral-200/80 p-4 dark:border-white/[0.06] sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-5 w-5 text-teal-600 dark:text-teal-400" aria-hidden />
                For planning
              </CardTitle>
              <CardDescription>
                NHIS coverage, health reporting, parent contacts, payments, and follow-up — tracked year over year
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-5 sm:p-6">
              <AnalyticsMetricTrendChart series={trends.operationsSeries} height={320} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="demographics" className="mt-0 space-y-8 focus-visible:outline-none">
          <Card>
            <CardHeader className="border-b border-neutral-200/80 p-4 dark:border-white/[0.06] sm:p-6">
              <CardTitle className="text-base">Age bracket mix over time</CardTitle>
              <CardDescription>Share of each age group per camp year (% of that year&apos;s registrations)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 p-4 pt-5 sm:p-6">
              <CampDemographicTrendTable title="Age bracket" rows={trends.demographicTrends.ageBracket} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-neutral-200/80 p-4 dark:border-white/[0.06] sm:p-6">
              <CardTitle className="text-base">Gender mix over time</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 p-4 pt-5 sm:p-6">
              <CampDemographicTrendTable title="Gender" rows={trends.demographicTrends.gender} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-neutral-200/80 p-4 dark:border-white/[0.06] sm:p-6">
              <CardTitle className="text-base">Education band over time</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 p-4 pt-5 sm:p-6">
              <CampDemographicTrendTable title="Education band" rows={trends.demographicTrends.educationBand} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-neutral-200/80 p-4 dark:border-white/[0.06] sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-5 w-5 text-red-600 dark:text-red-400" aria-hidden />
                Top residence regions over time
              </CardTitle>
              <CardDescription>How geographic reach shifts season to season</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 p-4 pt-5 sm:p-6">
              <CampDemographicTrendTable title="Residence" rows={trends.demographicTrends.residence} />
            </CardContent>
          </Card>

          {trends.roleTrends.length > 0 ? (
            <Card>
              <CardHeader className="border-b border-neutral-200/80 p-4 dark:border-white/[0.06] sm:p-6">
                <CardTitle className="text-base">Role mix over time</CardTitle>
                <CardDescription>Participants, workers, volunteers, and other roles per camp year</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 p-4 pt-5 sm:p-6">
                <CampDemographicTrendTable title="Role" rows={trends.roleTrends} />
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="revenue" className="mt-0 space-y-6 focus-visible:outline-none">
          <Card>
            <CardHeader className="border-b border-neutral-200/80 p-4 dark:border-white/[0.06] sm:p-6">
              <CardTitle className="text-base">Revenue collected vs pending</CardTitle>
              <CardDescription>Camp fee collection trend by year (₵)</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-5 sm:p-6">
              <AnalyticsRevenueChart rows={revenue.byYear} height={300} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-neutral-200/80 p-4 dark:border-white/[0.06] sm:p-6">
              <CardTitle className="text-base">Collection rate trend</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-5 sm:p-6">
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
