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
  Mail,
  MapPin,
  Phone,
  Shield,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react'
import { CampDailySummaryShare } from '@/components/camp/camp-daily-summary-share'

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
    <Card>
      <CardHeader className="border-b border-neutral-200/80 p-4 dark:border-white/[0.06] sm:p-6">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className={`h-5 w-5 ${iconClassName}`} />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-5 sm:p-6">
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
          <div className="space-y-4 lg:max-h-[400px] lg:overflow-y-auto lg:pr-1">
            {slices.map((slice) => (
              <div key={slice.label} className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="min-w-0 break-words text-sm font-medium text-neutral-700 dark:text-neutral-300">{slice.label}</span>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-sm font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">{slice.count}</span>
                    <Badge variant="outline" className="text-xs">
                      {slice.percent}%
                    </Badge>
                  </div>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-white/10">
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
          <p className="mt-4 text-xs text-neutral-500 dark:text-neutral-400">Based on {total.toLocaleString()} records</p>
        ) : null}
      </CardContent>
    </Card>
  )
}

export function InsightsPanel({ title, insights }: { title: string; insights: string[] }) {
  if (insights.length === 0) return null

  return (
    <Card>
      <CardHeader className="border-b border-neutral-200/80 p-4 pb-3 dark:border-white/[0.06] sm:p-6 sm:pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {title}
        </CardTitle>
        <CardDescription>Things worth knowing from the registrations</CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 sm:pt-4">
        <ul className="space-y-2.5">
          {insights.map((insight) => (
            <li key={insight} className="flex gap-2 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
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
    <div className="dashboard-panel min-w-0 p-4 sm:p-5">
      <p className="app-stat-label flex items-center gap-1.5">
        {Icon ? <Icon className="h-4 w-4 shrink-0" aria-hidden /> : null}
        <span className="min-w-0 truncate">{label}</span>
      </p>
      <div className={`app-stat-value mt-2 ${valueClassName ?? 'text-neutral-900 dark:text-neutral-100'}`}>{value}</div>
      {hint ? <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{hint}</p> : null}
    </div>
  )
}

function momentumLabel(momentum: LiveRegistrationPulse['momentum']): string {
  if (momentum === 'accelerating') return 'Accelerating'
  if (momentum === 'slowing') return 'Slowing'
  if (momentum === 'steady') return 'Steady'
  return 'Not enough data yet'
}

function LivePulsePanel({
  pulse,
  total,
  year,
  yearId,
  theme,
  newRegistrants,
  returning,
}: {
  pulse: LiveRegistrationPulse
  total: number
  year: number
  yearId: string
  theme?: string
  newRegistrants: number
  returning: number
}) {
  if (total === 0) return null

  return (
    <Card>
      <CardHeader className="border-b border-neutral-200/80 p-4 dark:border-white/[0.06] sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-5 w-5 text-neutral-400 dark:text-neutral-500" aria-hidden />
              Live registration pulse
            </CardTitle>
            <CardDescription>How the open form is performing right now</CardDescription>
          </div>
          <Badge
            variant={
              pulse.momentum === 'accelerating' ? 'success' : pulse.momentum === 'slowing' ? 'warning' : 'brand'
            }
          >
            {momentumLabel(pulse.momentum)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-6">
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          <div className="min-w-0 rounded-xl border border-neutral-200/80 bg-neutral-50/60 p-3 dark:border-white/[0.06] dark:bg-white/[0.03]">
            <p className="app-overline">Today</p>
            <p className="app-stat-value mt-1 text-neutral-900 dark:text-neutral-100">{pulse.today}</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {pulse.todayNew} new · {pulse.todayReturning} returning
            </p>
          </div>
          <div className="min-w-0 rounded-xl border border-neutral-200/80 bg-neutral-50/60 p-3 dark:border-white/[0.06] dark:bg-white/[0.03]">
            <p className="app-overline">Last 7 days</p>
            <p className="app-stat-value mt-1 text-neutral-900 dark:text-neutral-100">{pulse.last7Days}</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {pulse.last7New} new · {pulse.last7Returning} returning
            </p>
          </div>
          <div className="min-w-0 rounded-xl border border-neutral-200/80 bg-neutral-50/60 p-3 dark:border-white/[0.06] dark:bg-white/[0.03]">
            <p className="app-overline">Avg / day</p>
            <p className="app-stat-value mt-1 text-neutral-900 dark:text-neutral-100">{pulse.avgPerDay}</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">{pulse.activeDays} active days</p>
          </div>
          <div className="min-w-0 rounded-xl border border-neutral-200/80 bg-neutral-50/60 p-3 dark:border-white/[0.06] dark:bg-white/[0.03]">
            <p className="app-overline">Peak day</p>
            <p className="app-stat-value mt-1 text-neutral-900 dark:text-neutral-100">{pulse.peakDayCount}</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">{pulse.peakDay ?? '—'} · window {pulse.daysSinceFirst ?? 0}d</p>
          </div>
        </div>
        <CampDailySummaryShare
          variant="card"
          yearId={yearId}
          input={{
            year,
            theme,
            total,
            newRegistrants,
            returning,
            pulse,
          }}
        />
      </CardContent>
    </Card>
  )
}

function CrossTabCard({ matrix }: { matrix: CrossTabMatrix }) {
  if (matrix.cells.length === 0 || matrix.rows.length === 0 || matrix.columns.length === 0) return null
  const max = Math.max(...matrix.cells.map((c) => c.count), 1)
  const lookup = new Map(matrix.cells.map((c) => [`${c.row}::${c.column}`, c.count]))

  return (
    <Card>
      <CardHeader className="border-b border-neutral-200/80 p-4 dark:border-white/[0.06] sm:p-6">
        <CardTitle className="text-base">{matrix.title}</CardTitle>
        <CardDescription>
          {matrix.rowLabel} across {matrix.columnLabel.toLowerCase()} — useful for session and seating planning
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto p-4 sm:p-6">
        <table className="w-full min-w-[420px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 bg-white px-2 py-2 text-left app-overline dark:bg-neutral-800">
                {matrix.rowLabel}
              </th>
              {matrix.columns.map((column) => (
                <th
                  key={column}
                  className="px-2 py-2 text-center app-overline"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.rows.map((row) => (
              <tr key={row} className="border-t border-neutral-100 dark:border-white/[0.06]">
                <td className="sticky left-0 bg-white px-2 py-2 font-medium dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">{row}</td>
                {matrix.columns.map((column) => {
                  const count = lookup.get(`${row}::${column}`) ?? 0
                  const intensity = count === 0 ? 0 : 0.12 + (count / max) * 0.75
                  return (
                    <td key={`${row}-${column}`} className="px-1.5 py-1.5 text-center">
                      <div
                        className={`rounded-md px-2 py-2 font-semibold tabular-nums ${
                          intensity > 0.45 ? 'text-white' : 'text-brand-900 dark:text-brand-100'
                        }`}
                        style={{
                          backgroundColor: count === 0 ? 'transparent' : `rgba(79, 70, 229, ${intensity})`,
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
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile label="Total registrations" value={report.total} hint={`${report.uniquePhones} unique phones`} icon={Users} />
        <StatTile
          label="Checked in"
          value={overview.checkedIn}
          hint={`${overview.checkInRate}% attendance rate`}
          valueClassName="text-emerald-600 dark:text-emerald-400"
        />
        <StatTile
          label="Payments received"
          value={`₵${overview.paidAmount.toFixed(0)}`}
          hint={`${overview.paid} paid · ${overview.collectionRate}% collected`}
          valueClassName="text-brand-600 dark:text-brand-300"
        />
        <StatTile
          label="Returning campers"
          value={overview.returning}
          hint={`${overview.newRegistrants} first-timers`}
          valueClassName="text-violet-600 dark:text-violet-400"
        />
      </div>

      <LivePulsePanel
        pulse={livePulse}
        total={report.total}
        year={report.year}
        yearId={report.yearId}
        theme={report.theme}
        newRegistrants={overview.newRegistrants}
        returning={overview.returning}
      />

      <InsightsPanel title="Key patterns this year" insights={report.insights} />

      <Card>
        <CardHeader className="border-b border-neutral-200/80 p-4 dark:border-white/[0.06] sm:p-6">
          <CardTitle className="text-base">Registration funnel</CardTitle>
          <CardDescription>Registered → checked in → paid → follow-up completed</CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-5 sm:p-6">
          <CampFunnelSteps steps={report.funnel} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <StatTile label="Return rate" value={`${report.returnRate}%`} hint="Returning campers this year" valueClassName="text-violet-600 dark:text-violet-400" />
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
        <h2 className="app-section-title">Demographics from the form</h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Gender, age, education, and residence from live 2026 registrations</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AnalyticsBreakdownCard
          title="Gender"
          description="Men and women"
          icon={Users}
          iconClassName="text-brand-600 dark:text-brand-300"
          slices={demographics.gender}
          total={report.total}
          barClassName="bg-brand-500 dark:bg-brand-400"
        />
        <AnalyticsBreakdownCard
          title="Age bracket"
          description="Age groups for programme planning"
          icon={Calendar}
          iconClassName="text-brand-600 dark:text-brand-300"
          slices={demographics.ageBracket}
          total={report.total}
          barClassName="bg-brand-500 dark:bg-brand-400"
        />
        <AnalyticsBreakdownCard
          title="Education band"
          description="JHS · SHS · University groupings"
          icon={GraduationCap}
          iconClassName="text-brand-600 dark:text-brand-300"
          slices={demographics.educationBand}
          total={report.total}
          barClassName="bg-brand-500 dark:bg-brand-400"
        />
        <AnalyticsBreakdownCard
          title="Education level (detail)"
          description="Exact form options — JHS 1, SHS 2, Level 100…"
          icon={GraduationCap}
          iconClassName="text-brand-600 dark:text-brand-300"
          slices={demographics.educationLevel}
          total={report.total}
          barClassName="bg-brand-500 dark:bg-brand-400"
        />
        <AnalyticsBreakdownCard
          title="Residence areas"
          description="Standardized towns/areas (aliases remapped for charts — DB values unchanged)"
          icon={MapPin}
          iconClassName="text-brand-600 dark:text-brand-300"
          slices={demographics.residence}
          total={report.total}
          barClassName="bg-brand-500 dark:bg-brand-400"
        />
        <AnalyticsBreakdownCard
          title="Camp roles"
          description="Participant, Protocol, Music, Cook, and other assigned roles"
          icon={Users}
          iconClassName="text-brand-600 dark:text-brand-300"
          slices={demographics.role}
          total={report.total}
          barClassName="bg-brand-500 dark:bg-brand-400"
        />
        {birthMonths.length > 0 ? (
          <AnalyticsBreakdownCard
            title="Birth months"
            description="From date of birth — useful for birthday outreach"
            icon={Cake}
            iconClassName="text-brand-600 dark:text-brand-300"
            slices={birthMonths}
            total={contactCoverage.withDateOfBirth}
            barClassName="bg-brand-500 dark:bg-brand-400"
          />
        ) : null}
      </div>

      <div>
        <h2 className="app-section-title">Cross-cuts</h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">How demographics stack together for planning</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <CrossTabCard matrix={crossTabs.ageByGender} />
        <CrossTabCard matrix={crossTabs.educationByAge} />
        <CrossTabCard matrix={crossTabs.residenceByGender} />
      </div>

      <Card className="lg:col-span-2">
        <CardHeader className="border-b border-neutral-200/80 p-4 dark:border-white/[0.06] sm:p-6">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            How fast people registered
          </CardTitle>
          <CardDescription>Daily sign-ups and cumulative curve for the full registration window</CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-5 sm:p-6">
          <CampRegistrationVelocityChart points={timeline} />
        </CardContent>
      </Card>

      <div>
        <h2 className="app-section-title">Operations & planning</h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Status, rooms, guardian contacts, medical, follow-up, and payment</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <AnalyticsBreakdownCard
          title="Registration status"
          description="Registered vs checked in vs cancelled"
          icon={Activity}
          iconClassName="text-brand-600 dark:text-brand-300"
          slices={operations.registrationStatus}
          total={report.total}
          barClassName="bg-brand-500 dark:bg-brand-400"
        />
        <AnalyticsBreakdownCard
          title="Room assignment"
          description="Lodging progress for this camp year"
          icon={MapPin}
          iconClassName="text-brand-600 dark:text-brand-300"
          slices={operations.roomAssignment}
          total={report.total}
          barClassName="bg-brand-500 dark:bg-brand-400"
        />
        <AnalyticsBreakdownCard
          title="Previous camp attendance"
          description="How many camps people have attended before"
          icon={Calendar}
          iconClassName="text-brand-600 dark:text-brand-300"
          slices={operations.attendanceHistory}
          total={report.total}
          barClassName="bg-brand-500 dark:bg-brand-400"
        />
        <AnalyticsBreakdownCard
          title="Parent / guardian contact"
          description="Completeness of guardian fields from the form"
          icon={Phone}
          iconClassName="text-brand-600 dark:text-brand-300"
          slices={operations.parentContact}
          total={report.total}
          barClassName="bg-brand-500 dark:bg-brand-400"
        />
        <AnalyticsBreakdownCard
          title="NHIS coverage"
          description="Medical planning"
          icon={Shield}
          iconClassName="text-brand-600 dark:text-brand-300"
          slices={operations.nhis}
          total={report.total}
          barClassName="bg-brand-500 dark:bg-brand-400"
        />
        <AnalyticsBreakdownCard
          title="Health challenges"
          description="Self-reported health responses"
          icon={Heart}
          iconClassName="text-brand-600 dark:text-brand-300"
          slices={operations.health}
          total={report.total}
          barClassName="bg-brand-500 dark:bg-brand-400"
        />
        {operations.healthConditions.length > 0 ? (
          <AnalyticsBreakdownCard
            title="Health conditions (detail)"
            description="Named conditions when a challenge was reported"
            icon={Heart}
            iconClassName="text-brand-600 dark:text-brand-300"
            slices={operations.healthConditions}
            total={report.total}
            barClassName="bg-brand-500 dark:bg-brand-400"
          />
        ) : null}
        <AnalyticsBreakdownCard
          title="Follow-up status"
          description="Outreach pipeline"
          icon={Users}
          iconClassName="text-brand-600 dark:text-brand-300"
          slices={operations.followUp}
          total={report.total}
          barClassName="bg-brand-500 dark:bg-brand-400"
        />
        <AnalyticsBreakdownCard
          title="Payment status"
          description="Camp fee collection"
          icon={BarChart3}
          iconClassName="text-brand-600 dark:text-brand-300"
          slices={operations.paymentStatus}
          total={report.total}
          barClassName="bg-brand-500 dark:bg-brand-400"
        />
      </div>

      {dataQuality.length > 0 ? (
        <Card>
          <CardHeader className="border-b border-neutral-200/80 p-4 dark:border-white/[0.06] sm:p-6">
            <CardTitle className="text-base">Data completeness</CardTitle>
            <CardDescription>How complete registration records are for this year — includes live form fields</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 p-4 pt-5 sm:p-6">
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
                <div key={row.field} className="rounded-lg border border-neutral-200/80 dark:border-white/[0.06] bg-neutral-50 dark:bg-white/[0.04] p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-neutral-700 dark:text-neutral-300">{row.field}</span>
                    <Badge variant={row.percent >= 80 ? 'default' : 'outline'}>{row.percent}%</Badge>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white dark:bg-white/10">
                    <div
                      className={`h-full rounded-full ${row.percent >= 80 ? 'bg-emerald-500' : row.percent >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
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
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
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
          valueClassName="text-brand-600 dark:text-brand-300"
        />
        <StatTile
          label="Revenue collected"
          value={`₵${combined.revenue.totalPaid.toLocaleString()}`}
          hint={`${combined.revenue.collectionRate}% collection rate`}
          valueClassName="text-emerald-600 dark:text-emerald-400"
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

      <Card>
        <CardHeader className="border-b border-neutral-200/80 p-4 dark:border-white/[0.06] sm:p-6">
          <CardTitle className="text-base">All-years registration funnel</CardTitle>
          <CardDescription>Every camp year side by side</CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-5 sm:p-6">
          <CampFunnelSteps steps={combined.overallFunnel} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-neutral-200/80 p-4 dark:border-white/[0.06] sm:p-6">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-5 w-5 text-neutral-400 dark:text-neutral-500" aria-hidden />
            Registrations by camp year
          </CardTitle>
          <CardDescription>Total volume per year with year-on-year growth</CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-5 sm:p-6">
          <CampYearComparisonChart rows={combined.yearComparison} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-neutral-200/80 p-4 dark:border-white/[0.06] sm:p-6">
          <CardTitle className="text-base">New vs returning by year</CardTitle>
          <CardDescription>First-timers compared with returning campers each season</CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-5 sm:p-6">
          <CampNewVsReturningChart rows={combined.newVsReturning} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-neutral-200/80 p-4 dark:border-white/[0.06] sm:p-6">
          <CardTitle className="text-base">Year-over-year comparison</CardTitle>
          <CardDescription>Registration volume, growth, check-in, and payments by camp year</CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <ul className="divide-y divide-neutral-200/80 md:hidden dark:divide-white/[0.06]">
            {combined.yearComparison.map((row) => (
              <li key={row.yearId} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="min-w-0 font-semibold text-neutral-900 dark:text-neutral-100">
                    {row.year}
                    {row.theme ? (
                      <span className="mt-0.5 block truncate text-xs font-normal text-neutral-500 dark:text-neutral-400">{row.theme}</span>
                    ) : null}
                  </p>
                  <div className="shrink-0 text-right">
                    <p className="text-lg font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">{row.total.toLocaleString()}</p>
                    {row.growthPercent == null ? null : row.growthPercent >= 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-300">
                        <TrendingUp className="h-3 w-3" aria-hidden />+{row.growthPercent}%
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-red-700 dark:text-red-300">
                        <TrendingDown className="h-3 w-3" aria-hidden />
                        {row.growthPercent}%
                      </span>
                    )}
                  </div>
                </div>
                <dl className="mt-2 grid grid-cols-3 gap-x-3 gap-y-1.5 text-xs">
                  {[
                    ['New', row.newCampers],
                    ['Returning', row.returningCampers],
                    ['Return', `${row.returnRate}%`],
                    ['Check-in', `${row.checkInRate}%`],
                    ['Paid', `${row.collectionRate}%`],
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
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-neutral-200/80 dark:border-white/[0.06] text-left text-neutral-500 dark:text-neutral-400">
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
                  <td className="py-3 pr-4 font-semibold text-neutral-900 dark:text-neutral-100">
                    {row.year}
                    {row.theme ? (
                      <span className="mt-0.5 block text-xs font-normal text-neutral-500 dark:text-neutral-400">{row.theme}</span>
                    ) : null}
                  </td>
                  <td className="py-3 pr-4">{row.total.toLocaleString()}</td>
                  <td className="py-3 pr-4">
                    {row.growthPercent == null ? (
                      <span className="text-neutral-500 dark:text-neutral-400">—</span>
                    ) : row.growthPercent >= 0 ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
                        <TrendingUp className="h-3.5 w-3.5" />
                        {row.growthPercent}%
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-700 dark:text-red-300">
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
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <AnalyticsBreakdownCard
          title="Camper retention"
          description="How many camp years each unique phone attended"
          icon={Users}
          iconClassName="text-brand-600 dark:text-brand-300"
          slices={combined.retention}
          total={combined.uniqueCampers}
          barClassName="bg-brand-500 dark:bg-brand-400"
        />
        <AnalyticsBreakdownCard
          title="Combined age profile"
          description="Unique campers (deduplicated by phone)"
          icon={Calendar}
          iconClassName="text-brand-600 dark:text-brand-300"
          slices={combined.demographics.ageBracket}
          total={combined.uniqueCampers}
          barClassName="bg-brand-500 dark:bg-brand-400"
        />
        <AnalyticsBreakdownCard
          title="Combined education bands"
          description="Unique campers across all years"
          icon={GraduationCap}
          iconClassName="text-brand-600 dark:text-brand-300"
          slices={combined.demographics.educationBand}
          total={combined.uniqueCampers}
          barClassName="bg-brand-500 dark:bg-brand-400"
        />
        <AnalyticsBreakdownCard
          title="Combined residence"
          description="Standardized towns/areas from unique camper profiles"
          icon={MapPin}
          iconClassName="text-brand-600 dark:text-brand-300"
          slices={combined.demographics.residence}
          total={combined.uniqueCampers}
          barClassName="bg-brand-500 dark:bg-brand-400"
        />
        <AnalyticsBreakdownCard
          title="Combined roles"
          description="Roles across unique campers"
          icon={Users}
          iconClassName="text-brand-600 dark:text-brand-300"
          slices={combined.demographics.role}
          total={combined.uniqueCampers}
          barClassName="bg-brand-500 dark:bg-brand-400"
        />
      </div>

      <div>
        <h2 className="app-section-title">Per-year snapshot</h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Quick comparison across each camp year</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {years.map((yearReport) => (
          <Card key={yearReport.yearId}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Camp {yearReport.year}
                {yearReport.theme ? (
                  <span className="mt-1 block text-xs font-normal text-neutral-500 dark:text-neutral-400">{yearReport.theme}</span>
                ) : null}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-500 dark:text-neutral-400">Registrations</span>
                <span className="font-semibold">{yearReport.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500 dark:text-neutral-400">Check-in rate</span>
                <span className="font-semibold">{yearReport.overview.checkInRate}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500 dark:text-neutral-400">Returning</span>
                <span className="font-semibold">{yearReport.overview.returning} ({yearReport.returnRate}%)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500 dark:text-neutral-400">Collection</span>
                <span className="font-semibold">{yearReport.overview.collectionRate}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500 dark:text-neutral-400">Data quality</span>
                <span className="font-semibold">{yearReport.dataQualityScore}%</span>
              </div>
              {yearReport.insights[0] ? (
                <p className="border-t pt-2 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">{yearReport.insights[0]}</p>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  )
}
