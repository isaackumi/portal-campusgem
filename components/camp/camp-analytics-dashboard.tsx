'use client'

import type {
  AnalyticsSlice,
  CampAnalyticsReport,
  CampYearAnalyticsReport,
  CrossTabMatrix,
  LiveRegistrationPulse,
} from '@/lib/camp/analytics'
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
  Activity,
  BarChart3,
  Cake,
  Calendar,
  DollarSign,
  GraduationCap,
  Heart,
  Lightbulb,
  Mail,
  MapPin,
  Phone,
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
      <CardHeader className="border-b bg-slate-50">
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
                  <span className="text-sm font-semibold text-slate-700">{slice.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">{slice.count}</span>
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
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          {Icon ? <Icon className="h-4 w-4" /> : null}
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-3xl font-bold ${valueClassName ?? 'text-slate-900'}`}>{value}</div>
        {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
      </CardContent>
    </Card>
  )
}

function momentumLabel(momentum: LiveRegistrationPulse['momentum']): string {
  if (momentum === 'accelerating') return 'Accelerating'
  if (momentum === 'slowing') return 'Slowing'
  if (momentum === 'steady') return 'Steady'
  return 'No signal yet'
}

function LivePulsePanel({ pulse, total }: { pulse: LiveRegistrationPulse; total: number }) {
  if (total === 0) return null

  return (
    <Card className="border-2 border-indigo-200 bg-gradient-to-br from-indigo-50/70 to-white">
      <CardHeader className="border-b border-indigo-100">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base text-indigo-950">
              <Activity className="h-5 w-5 text-indigo-600" />
              Live registration pulse
            </CardTitle>
            <CardDescription>How the open form is performing right now</CardDescription>
          </div>
          <Badge
            variant="outline"
            className={
              pulse.momentum === 'accelerating'
                ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                : pulse.momentum === 'slowing'
                  ? 'border-amber-300 bg-amber-50 text-amber-900'
                  : 'border-indigo-200 bg-white text-indigo-800'
            }
          >
            {momentumLabel(pulse.momentum)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-indigo-100 bg-white p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Today</p>
            <p className="mt-1 text-2xl font-bold text-indigo-900">{pulse.today}</p>
            <p className="text-xs text-slate-500">{pulse.last24Hours} in last 24h</p>
          </div>
          <div className="rounded-xl border border-indigo-100 bg-white p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Last 7 days</p>
            <p className="mt-1 text-2xl font-bold text-indigo-900">{pulse.last7Days}</p>
            <p className="text-xs text-slate-500">{pulse.recentSharePercent}% of all sign-ups</p>
          </div>
          <div className="rounded-xl border border-indigo-100 bg-white p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Avg / day</p>
            <p className="mt-1 text-2xl font-bold text-indigo-900">{pulse.avgPerDay}</p>
            <p className="text-xs text-slate-500">{pulse.activeDays} active days</p>
          </div>
          <div className="rounded-xl border border-indigo-100 bg-white p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Peak day</p>
            <p className="mt-1 text-2xl font-bold text-indigo-900">{pulse.peakDayCount}</p>
            <p className="text-xs text-slate-500">{pulse.peakDay ?? '—'} · window {pulse.daysSinceFirst ?? 0}d</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function CrossTabCard({ matrix }: { matrix: CrossTabMatrix }) {
  if (matrix.cells.length === 0 || matrix.rows.length === 0 || matrix.columns.length === 0) return null
  const max = Math.max(...matrix.cells.map((c) => c.count), 1)
  const lookup = new Map(matrix.cells.map((c) => [`${c.row}::${c.column}`, c.count]))

  return (
    <Card className="border-2">
      <CardHeader className="border-b bg-slate-50">
        <CardTitle className="text-base">{matrix.title}</CardTitle>
        <CardDescription>
          {matrix.rowLabel} across {matrix.columnLabel.toLowerCase()} — useful for session and seating planning
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto pt-4">
        <table className="w-full min-w-[420px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 bg-white px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                {matrix.rowLabel}
              </th>
              {matrix.columns.map((column) => (
                <th
                  key={column}
                  className="px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.rows.map((row) => (
              <tr key={row} className="border-t border-slate-100">
                <td className="sticky left-0 bg-white px-2 py-2 font-medium text-slate-800">{row}</td>
                {matrix.columns.map((column) => {
                  const count = lookup.get(`${row}::${column}`) ?? 0
                  const intensity = count === 0 ? 0 : 0.12 + (count / max) * 0.75
                  return (
                    <td key={`${row}-${column}`} className="px-1.5 py-1.5 text-center">
                      <div
                        className="rounded-md px-2 py-2 font-semibold tabular-nums"
                        style={{
                          backgroundColor: count === 0 ? 'transparent' : `rgba(79, 70, 229, ${intensity})`,
                          color: intensity > 0.45 ? '#fff' : '#312e81',
                        }}
                      >
                        {count || '·'}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}

function YearReportSections({ report }: { report: CampYearAnalyticsReport }) {
  const { overview, demographics, operations, timeline, dataQuality, livePulse, contactCoverage, crossTabs } =
    report
  const birthMonths = demographics.birthMonth.filter((s) => s.label !== 'Not recorded')

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
          valueClassName="text-primary"
        />
        <StatTile
          label="Returning campers"
          value={overview.returning}
          hint={`${overview.newRegistrants} first-timers`}
          valueClassName="text-purple-600"
        />
      </div>

      <LivePulsePanel pulse={livePulse} total={report.total} />

      <InsightsPanel title="Key patterns this year" insights={report.insights} />

      <Card className="border-2">
        <CardHeader className="border-b bg-slate-50">
          <CardTitle className="text-base">Registration funnel</CardTitle>
          <CardDescription>Registered → checked in → paid → follow-up completed</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <CampFunnelSteps steps={report.funnel} />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatTile label="Return rate" value={`${report.returnRate}%`} hint="Returning campers this year" valueClassName="text-violet-600" />
        <StatTile label="Data quality" value={`${report.dataQualityScore}%`} hint="Average field completeness" />
        <StatTile
          label="Email on file"
          value={`${contactCoverage.emailPercent}%`}
          hint={`${contactCoverage.withEmail} of ${report.total}`}
          icon={Mail}
        />
        <StatTile
          label="WhatsApp on file"
          value={`${contactCoverage.whatsappPercent}%`}
          hint={`${contactCoverage.withWhatsapp} of ${report.total}`}
          icon={Phone}
        />
        <StatTile
          label="Date of birth"
          value={`${contactCoverage.dateOfBirthPercent}%`}
          hint={`${contactCoverage.withDateOfBirth} provided DOB`}
          icon={Cake}
        />
        <StatTile
          label="Location notes"
          value={`${contactCoverage.campLocationPercent}%`}
          hint={`${contactCoverage.withCampLocation} left a location note`}
          icon={MapPin}
        />
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-900">Demographics from the form</h2>
        <p className="text-sm text-muted-foreground">Gender, age, education, and residence from live 2026 registrations</p>
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
          title="Education level (detail)"
          description="Exact form options — JHS 1, SHS 2, Level 100…"
          icon={GraduationCap}
          iconClassName="text-amber-600"
          slices={demographics.educationLevel}
          total={report.total}
          barClassName="bg-gradient-to-r from-amber-500 to-amber-600"
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
        {birthMonths.length > 0 ? (
          <AnalyticsBreakdownCard
            title="Birth months"
            description="From date of birth — useful for birthday outreach"
            icon={Cake}
            iconClassName="text-pink-600"
            slices={birthMonths}
            total={contactCoverage.withDateOfBirth}
            barClassName="bg-gradient-to-r from-pink-500 to-pink-600"
          />
        ) : null}
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-900">Cross-cuts</h2>
        <p className="text-sm text-muted-foreground">How demographics stack together for planning</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <CrossTabCard matrix={crossTabs.ageByGender} />
        <CrossTabCard matrix={crossTabs.educationByAge} />
      </div>

      <Card className="border-2 lg:col-span-2">
        <CardHeader className="border-b bg-slate-50">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Registration velocity
          </CardTitle>
          <CardDescription>Daily sign-ups and cumulative curve for the full registration window</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <CampRegistrationVelocityChart points={timeline} />
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold text-slate-900">Operations & planning</h2>
        <p className="text-sm text-muted-foreground">Guardian contacts, medical, follow-up, and payment signals</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <AnalyticsBreakdownCard
          title="Parent / guardian contact"
          description="Completeness of guardian fields from the form"
          icon={Phone}
          iconClassName="text-sky-600"
          slices={operations.parentContact}
          total={report.total}
          barClassName="bg-gradient-to-r from-sky-500 to-sky-600"
        />
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
          barClassName="bg-gradient-to-r from-slate-800 to-slate-900"
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
          <CardHeader className="border-b bg-slate-50">
            <CardTitle className="text-base">Data completeness</CardTitle>
            <CardDescription>How complete registration records are for this year — includes live form fields</CardDescription>
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
        <CardHeader className="border-b bg-slate-50">
          <CardTitle className="text-base">All-years registration funnel</CardTitle>
          <CardDescription>Combined journey across every camp year in the system</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <CampFunnelSteps steps={combined.overallFunnel} />
        </CardContent>
      </Card>

      <Card className="border-2">
        <CardHeader className="border-b bg-slate-50">
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
        <CardHeader className="border-b bg-slate-50">
          <CardTitle className="text-base">New vs returning by year</CardTitle>
          <CardDescription>First-timers compared with returning campers each season</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <CampNewVsReturningChart rows={combined.newVsReturning} />
        </CardContent>
      </Card>

      <Card className="border-2">
        <CardHeader className="border-b bg-slate-50">
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
        <h2 className="text-lg font-semibold text-slate-900">Per-year snapshot</h2>
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
