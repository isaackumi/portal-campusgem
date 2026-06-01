'use client'

import type { AnalyticsSlice, CampAnalyticsReport, CampYearAnalyticsReport } from '@/lib/camp/analytics'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  CampFunnelSteps,
  CampNewVsReturningChart,
  CampRegistrationVelocityChart,
  CampYearComparisonChart,
} from '@/components/camp/camp-analytics-charts'
import { AnalyticsPieChart } from '@/components/charts/analytics-pie-chart'
import { AnalyticsHorizontalBarChart } from '@/components/charts/analytics-charts'
import { CampTrendAnalysisPanel } from '@/components/camp/camp-trend-analysis-panel'
import {
  BarChart3,
  Calendar,
  DollarSign,
  GraduationCap,
  Heart,
  Lightbulb,
  MapPin,
  Shield,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react'

export function AnalyticsBreakdownCard({
  title,
  description,
  icon: Icon,
  iconClassName,
  slices,
  total,
  barClassName,
}: {
  title: string
  description: string
  icon: typeof Users
  iconClassName: string
  slices: AnalyticsSlice[]
  total: number
  barClassName: string
}) {
  if (slices.length === 0) return null

  return (
    <Card className="border-2">
      <CardHeader className="border-b bg-gray-50">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className={`h-5 w-5 ${iconClassName}`} />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <AnalyticsPieChart
            slices={slices.map((s) => ({
              label: s.label,
              count: s.count,
              percent: s.percent,
            }))}
            height={240}
            innerRadius="48%"
          />
          <div className="max-h-[400px] space-y-4 overflow-y-auto">
            {slices.map((slice) => (
              <div key={slice.label} className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-gray-700">{slice.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900">{slice.count}</span>
                    <Badge variant="outline" className="text-xs">
                      {slice.percent}%
                    </Badge>
                  </div>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${barClassName}`}
                    style={{ width: `${slice.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        {total > 0 ? (
          <p className="mt-4 text-xs text-muted-foreground">Based on {total.toLocaleString()} records</p>
        ) : null}
      </CardContent>
    </Card>
  )
}

export function InsightsPanel({ title, insights }: { title: string; insights: string[] }) {
  if (insights.length === 0) return null

  return (
    <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50/80 to-white">
      <CardHeader className="border-b border-amber-100 pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-amber-950">
          <Lightbulb className="h-5 w-5 text-amber-600" />
          {title}
        </CardTitle>
        <CardDescription>Patterns and planning signals from normalized camp data</CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <ul className="space-y-2.5">
          {insights.map((insight) => (
            <li key={insight} className="flex gap-2 text-sm leading-relaxed text-slate-700">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
              {insight}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

export function StatTile({
  label,
  value,
  hint,
  valueClassName,
  icon: Icon,
}: {
  label: string
  value: string | number
  hint?: string
  valueClassName?: string
  icon?: typeof Users
}) {
  return (
    <Card className="border-2">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          {Icon ? <Icon className="h-4 w-4" /> : null}
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-3xl font-bold ${valueClassName ?? 'text-gray-900'}`}>{value}</div>
        {hint ? <p className="mt-1 text-xs text-gray-500">{hint}</p> : null}
      </CardContent>
    </Card>
  )
}

function YearReportSections({ report }: { report: CampYearAnalyticsReport }) {
  const { overview, demographics, operations, timeline, dataQuality } = report

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Total registrations" value={report.total} hint={`${report.uniquePhones} unique phones`} icon={Users} />
        <StatTile
          label="Checked in"
          value={overview.checkedIn}
          hint={`${overview.checkInRate}% attendance rate`}
          valueClassName="text-green-600"
        />
        <StatTile
          label="Payments received"
          value={`₵${overview.paidAmount.toFixed(0)}`}
          hint={`${overview.paid} paid · ${overview.collectionRate}% collected`}
          valueClassName="text-blue-600"
        />
        <StatTile
          label="Returning campers"
          value={overview.returning}
          hint={`${overview.newRegistrants} first-timers`}
          valueClassName="text-purple-600"
        />
      </div>

      <InsightsPanel title="Key patterns this year" insights={report.insights} />

      <Card className="border-2">
        <CardHeader className="border-b bg-gray-50">
          <CardTitle className="text-base">Registration funnel</CardTitle>
          <CardDescription>Registered → checked in → paid → follow-up completed</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <CampFunnelSteps steps={report.funnel} />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Return rate" value={`${report.returnRate}%`} hint="Returning campers this year" valueClassName="text-violet-600" />
        <StatTile label="Data quality" value={`${report.dataQualityScore}%`} hint="Average field completeness" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AnalyticsBreakdownCard
          title="Gender"
          description="Normalized gender distribution"
          icon={Users}
          iconClassName="text-green-600"
          slices={demographics.gender}
          total={report.total}
          barClassName="bg-gradient-to-r from-green-500 to-green-600"
        />
        <AnalyticsBreakdownCard
          title="Age bracket"
          description="Age groups for programme planning"
          icon={Calendar}
          iconClassName="text-purple-600"
          slices={demographics.ageBracket}
          total={report.total}
          barClassName="bg-gradient-to-r from-purple-500 to-purple-600"
        />
        <AnalyticsBreakdownCard
          title="Education band"
          description="JHS · SHS · University groupings"
          icon={GraduationCap}
          iconClassName="text-orange-600"
          slices={demographics.educationBand}
          total={report.total}
          barClassName="bg-gradient-to-r from-orange-500 to-orange-600"
        />
        <AnalyticsBreakdownCard
          title="Residence areas"
          description="Normalized regions (top areas + Other)"
          icon={MapPin}
          iconClassName="text-red-600"
          slices={demographics.residence}
          total={report.total}
          barClassName="bg-gradient-to-r from-red-500 to-red-600"
        />
      </div>

      <Card className="border-2 lg:col-span-2">
        <CardHeader className="border-b bg-gray-50">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            Registration velocity
          </CardTitle>
          <CardDescription>Daily sign-ups and cumulative curve for the full registration window</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <CampRegistrationVelocityChart points={timeline} />
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold text-gray-900">Operations & planning</h2>
        <p className="text-sm text-muted-foreground">Medical, follow-up, and payment signals</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <AnalyticsBreakdownCard
          title="NHIS coverage"
          description="Medical planning"
          icon={Shield}
          iconClassName="text-teal-600"
          slices={operations.nhis}
          total={report.total}
          barClassName="bg-gradient-to-r from-teal-500 to-teal-600"
        />
        <AnalyticsBreakdownCard
          title="Health challenges"
          description="Self-reported health responses"
          icon={Heart}
          iconClassName="text-rose-600"
          slices={operations.health}
          total={report.total}
          barClassName="bg-gradient-to-r from-rose-500 to-rose-600"
        />
        <AnalyticsBreakdownCard
          title="Follow-up status"
          description="Outreach pipeline"
          icon={Users}
          iconClassName="text-indigo-600"
          slices={operations.followUp}
          total={report.total}
          barClassName="bg-gradient-to-r from-indigo-500 to-indigo-600"
        />
        <AnalyticsBreakdownCard
          title="Payment status"
          description="Camp fee collection"
          icon={BarChart3}
          iconClassName="text-emerald-600"
          slices={operations.paymentStatus}
          total={report.total}
          barClassName="bg-gradient-to-r from-emerald-500 to-emerald-600"
        />
      </div>

      {dataQuality.length > 0 ? (
        <Card className="border-2">
          <CardHeader className="border-b bg-gray-50">
            <CardTitle className="text-base">Data completeness</CardTitle>
            <CardDescription>How complete registration records are for this year</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <AnalyticsHorizontalBarChart
              data={dataQuality.map((row) => ({
                name: row.field,
                value: row.percent,
                percent: row.percent,
                fill: row.percent >= 80 ? '#10b981' : row.percent >= 50 ? '#f59e0b' : '#f87171',
              }))}
              barColor="#10b981"
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {dataQuality.map((row) => (
                <div key={row.field} className="rounded-lg border bg-slate-50 p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">{row.field}</span>
                    <Badge variant={row.percent >= 80 ? 'default' : 'outline'}>{row.percent}%</Badge>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                    <div
                      className={`h-full rounded-full ${row.percent >= 80 ? 'bg-emerald-500' : row.percent >= 50 ? 'bg-amber-500' : 'bg-rose-400'}`}
                      style={{ width: `${row.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </>
  )
}

export function CampAnalyticsDashboard({ report }: { report: CampAnalyticsReport }) {
  if (report.scope === 'year') {
    return <YearReportSections report={report} />
  }

  const { combined, years, insights } = report

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Total registrations"
          value={combined.totalRegistrations.toLocaleString()}
          hint={`${years.length} camp years`}
          icon={Users}
        />
        <StatTile
          label="Unique campers"
          value={combined.uniqueCampers.toLocaleString()}
          hint={`${combined.multiYearCampers} attended 2+ years`}
          valueClassName="text-indigo-600"
        />
        <StatTile
          label="Revenue collected"
          value={`₵${combined.revenue.totalPaid.toLocaleString()}`}
          hint={`${combined.revenue.collectionRate}% collection rate`}
          valueClassName="text-emerald-600"
          icon={DollarSign}
        />
        <StatTile
          label="Data quality"
          value={`${combined.avgDataQualityScore}%`}
          hint="Avg completeness across years"
        />
      </div>

      <InsightsPanel title="Cross-year patterns" insights={insights} />

      <CampTrendAnalysisPanel trends={combined.trends} revenue={combined.revenue} yearCount={years.length} />

      <Card className="border-2">
        <CardHeader className="border-b bg-gray-50">
          <CardTitle className="text-base">All-years registration funnel</CardTitle>
          <CardDescription>Combined journey across every camp year in the system</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <CampFunnelSteps steps={combined.overallFunnel} />
        </CardContent>
      </Card>

      <Card className="border-2">
        <CardHeader className="border-b bg-gray-50">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-5 w-5 text-indigo-600" />
            Registrations by camp year
          </CardTitle>
          <CardDescription>Total volume per year with year-on-year growth</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <CampYearComparisonChart rows={combined.yearComparison} />
        </CardContent>
      </Card>

      <Card className="border-2">
        <CardHeader className="border-b bg-gray-50">
          <CardTitle className="text-base">New vs returning by year</CardTitle>
          <CardDescription>First-timers compared with returning campers each season</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <CampNewVsReturningChart rows={combined.newVsReturning} />
        </CardContent>
      </Card>

      <Card className="border-2">
        <CardHeader className="border-b bg-gray-50">
          <CardTitle className="text-base">Year-over-year comparison</CardTitle>
          <CardDescription>Registration volume, growth, check-in, and payments by camp year</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto pt-4">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">Year</th>
                <th className="pb-2 pr-4 font-medium">Total</th>
                <th className="pb-2 pr-4 font-medium">Growth</th>
                <th className="pb-2 pr-4 font-medium">New</th>
                <th className="pb-2 pr-4 font-medium">Returning</th>
                <th className="pb-2 pr-4 font-medium">Return %</th>
                <th className="pb-2 pr-4 font-medium">Check-in</th>
                <th className="pb-2 pr-4 font-medium">Paid</th>
                <th className="pb-2 font-medium">Data quality</th>
              </tr>
            </thead>
            <tbody>
              {combined.yearComparison.map((row) => (
                <tr key={row.yearId} className="border-b last:border-0">
                  <td className="py-3 pr-4 font-semibold text-slate-900">
                    {row.year}
                    {row.theme ? (
                      <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{row.theme}</span>
                    ) : null}
                  </td>
                  <td className="py-3 pr-4">{row.total.toLocaleString()}</td>
                  <td className="py-3 pr-4">
                    {row.growthPercent == null ? (
                      <span className="text-muted-foreground">—</span>
                    ) : row.growthPercent >= 0 ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700">
                        <TrendingUp className="h-3.5 w-3.5" />
                        {row.growthPercent}%
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-rose-700">
                        <TrendingDown className="h-3.5 w-3.5" />
                        {row.growthPercent}%
                      </span>
                    )}
                  </td>
                  <td className="py-3 pr-4">{row.newCampers}</td>
                  <td className="py-3 pr-4">{row.returningCampers}</td>
                  <td className="py-3 pr-4">{row.returnRate}%</td>
                  <td className="py-3 pr-4">{row.checkInRate}%</td>
                  <td className="py-3 pr-4">{row.collectionRate}%</td>
                  <td className="py-3">{row.dataQualityScore}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <AnalyticsBreakdownCard
          title="Camper retention"
          description="How many camp years each unique phone attended"
          icon={Users}
          iconClassName="text-violet-600"
          slices={combined.retention}
          total={combined.uniqueCampers}
          barClassName="bg-gradient-to-r from-violet-500 to-violet-600"
        />
        <AnalyticsBreakdownCard
          title="Combined age profile"
          description="Unique campers (deduplicated by phone)"
          icon={Calendar}
          iconClassName="text-purple-600"
          slices={combined.demographics.ageBracket}
          total={combined.uniqueCampers}
          barClassName="bg-gradient-to-r from-purple-500 to-purple-600"
        />
        <AnalyticsBreakdownCard
          title="Combined education bands"
          description="Unique campers across all years"
          icon={GraduationCap}
          iconClassName="text-orange-600"
          slices={combined.demographics.educationBand}
          total={combined.uniqueCampers}
          barClassName="bg-gradient-to-r from-orange-500 to-orange-600"
        />
        <AnalyticsBreakdownCard
          title="Combined residence"
          description="Normalized regions from unique camper profiles"
          icon={MapPin}
          iconClassName="text-red-600"
          slices={combined.demographics.residence}
          total={combined.uniqueCampers}
          barClassName="bg-gradient-to-r from-red-500 to-red-600"
        />
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900">Per-year snapshot</h2>
        <p className="text-sm text-muted-foreground">Quick comparison across each camp year</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {years.map((yearReport) => (
          <Card key={yearReport.yearId} className="border-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Camp {yearReport.year}
                {yearReport.theme ? (
                  <span className="mt-1 block text-xs font-normal text-muted-foreground">{yearReport.theme}</span>
                ) : null}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Registrations</span>
                <span className="font-semibold">{yearReport.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Check-in rate</span>
                <span className="font-semibold">{yearReport.overview.checkInRate}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Returning</span>
                <span className="font-semibold">{yearReport.overview.returning} ({yearReport.returnRate}%)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Collection</span>
                <span className="font-semibold">{yearReport.overview.collectionRate}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Data quality</span>
                <span className="font-semibold">{yearReport.dataQualityScore}%</span>
              </div>
              {yearReport.insights[0] ? (
                <p className="border-t pt-2 text-xs leading-relaxed text-slate-600">{yearReport.insights[0]}</p>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  )
}
