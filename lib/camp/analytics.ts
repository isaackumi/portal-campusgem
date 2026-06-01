import type { CampRegistration, CampYear } from '@/lib/types'

export type AnalyticsSlice = {
  label: string
  count: number
  percent: number
}

export type TimelinePoint = {
  date: string
  label: string
  count: number
  cumulative: number
}

export type YearComparisonRow = {
  yearId: string
  year: number
  theme?: string
  total: number
  newCampers: number
  returningCampers: number
  returnRate: number
  checkedIn: number
  checkInRate: number
  paidCount: number
  collectionRate: number
  growthPercent: number | null
  peakDay: string | null
  peakDayCount: number
  dataQualityScore: number
}

export type FunnelStep = {
  label: string
  count: number
  percent: number
  dropOffPercent?: number
}

export type NewVsReturningRow = {
  year: number
  yearId: string
  newCampers: number
  returningCampers: number
  returnRate: number
}

export type DemographicTrendRow = {
  label: string
  values: Array<{ year: number; percent: number; count: number }>
}

export type MetricTrendSeries = {
  key: string
  label: string
  description?: string
  unit: 'percent' | 'count' | 'currency'
  values: Array<{ year: number; value: number }>
}

/** Cross-year KPI and operations trend bundle for multi-year camp analytics. */
export type CampTrendAnalysis = {
  kpiByYear: Array<{
    year: number
    theme?: string
    total: number
    growthPercent: number | null
    checkInRate: number
    returnRate: number
    collectionRate: number
    dataQualityScore: number
    newCampers: number
    returningCampers: number
    checkedIn: number
    paidCount: number
    followUpCompletedRate: number
  }>
  /** Rate metrics (%): check-in, return, collection, data quality, follow-up completion. */
  kpiRateSeries: MetricTrendSeries[]
  /** YoY registration growth and volume. */
  registrationGrowth: Array<{ year: number; name: string; total: number; growthPercent: number | null }>
  /** Operations planning signals tracked year-over-year. */
  operationsSeries: MetricTrendSeries[]
  /** Funnel conversion rates by camp year. */
  funnelRates: Array<{
    year: number
    name: string
    checkInRate: number
    collectionRate: number
    followUpRate: number
  }>
  demographicTrends: {
    ageBracket: DemographicTrendRow[]
    gender: DemographicTrendRow[]
    educationBand: DemographicTrendRow[]
    residence: DemographicTrendRow[]
  }
  /** Cumulative sign-ups by days since each year's first registration. */
  velocityOverlay: VelocityOverlaySeries[]
  /** First-time camper cohorts and how many return in later years. */
  cohortRetention: CohortRetentionRow[]
  /** Participant / worker / volunteer mix over years. */
  roleTrends: DemographicTrendRow[]
  /** Automated year-over-year change flags. */
  alerts: TrendAlert[]
}

export type VelocityOverlaySeries = {
  year: number
  theme?: string
  points: Array<{ dayIndex: number; label: string; cumulative: number }>
}

export type CohortRetentionRow = {
  cohortYear: number
  cohortSize: number
  returnsByYear: Array<{ year: number; yearsSinceFirst: number; count: number; rate: number }>
}

export type TrendAlert = {
  id: string
  severity: 'warning' | 'info' | 'success'
  title: string
  detail: string
}

export type CombinedRevenueSummary = {
  totalPaid: number
  totalPending: number
  totalExpected: number
  collectionRate: number
  byYear: Array<{ year: number; paid: number; pending: number; collectionRate: number }>
}

export type RetentionBucket = {
  label: string
  count: number
  percent: number
}

export type DataQualityRow = {
  field: string
  filled: number
  percent: number
}

export type CampYearAnalyticsReport = {
  scope: 'year'
  yearId: string
  year: number
  theme?: string
  total: number
  uniquePhones: number
  overview: {
    checkedIn: number
    registered: number
    cancelled: number
    newRegistrants: number
    returning: number
    paid: number
    pendingPayment: number
    followUpPending: number
    followUpInProgress: number
    followUpCompleted: number
    paidAmount: number
    pendingAmount: number
    totalExpected: number
    collectionRate: number
    checkInRate: number
  }
  demographics: {
    gender: AnalyticsSlice[]
    ageBracket: AnalyticsSlice[]
    educationBand: AnalyticsSlice[]
    educationLevel: AnalyticsSlice[]
    residence: AnalyticsSlice[]
    role: AnalyticsSlice[]
  }
  operations: {
    nhis: AnalyticsSlice[]
    health: AnalyticsSlice[]
    attendanceHistory: AnalyticsSlice[]
    parentContact: AnalyticsSlice[]
    followUp: AnalyticsSlice[]
    paymentStatus: AnalyticsSlice[]
    healthConditions: AnalyticsSlice[]
  }
  timeline: TimelinePoint[]
  dataQuality: DataQualityRow[]
  dataQualityScore: number
  returnRate: number
  funnel: FunnelStep[]
  insights: string[]
}

export type CampMultiYearAnalyticsReport = {
  scope: 'all'
  years: CampYearAnalyticsReport[]
  combined: {
    totalRegistrations: number
    uniqueCampers: number
    multiYearCampers: number
    singleYearCampers: number
    avgRegistrationsPerYear: number
    yearComparison: YearComparisonRow[]
    retention: RetentionBucket[]
    demographics: CampYearAnalyticsReport['demographics']
    operations: CampYearAnalyticsReport['operations']
    revenue: CombinedRevenueSummary
    newVsReturning: NewVsReturningRow[]
    demographicTrends: {
      ageBracket: DemographicTrendRow[]
      gender: DemographicTrendRow[]
      educationBand: DemographicTrendRow[]
    }
    trends: CampTrendAnalysis
    avgDataQualityScore: number
    overallFunnel: FunnelStep[]
  }
  insights: string[]
}

export type CampAnalyticsReport = CampYearAnalyticsReport | CampMultiYearAnalyticsReport

const AGE_ORDER = ['1-12', '13-19', '20-29', '30-39', '40-49', '50+', 'Unknown']

const GHANA_REGION_ALIASES: Record<string, string> = {
  accra: 'Greater Accra',
  'greater accra': 'Greater Accra',
  'greater-accra': 'Greater Accra',
  tema: 'Greater Accra',
  kumasi: 'Ashanti',
  ashanti: 'Ashanti',
  'cape coast': 'Central',
  central: 'Central',
  tamale: 'Northern',
  northern: 'Northern',
  ho: 'Volta',
  volta: 'Volta',
  koforidua: 'Eastern',
  eastern: 'Eastern',
  takoradi: 'Western',
  western: 'Western',
  sunyani: 'Bono',
  bono: 'Bono',
  bolgatanga: 'Upper East',
  'upper east': 'Upper East',
  wa: 'Upper West',
  'upper west': 'Upper West',
}

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function normalizePhoneKey(phone: string | undefined | null): string {
  const digits = String(phone ?? '').replace(/\D/g, '')
  if (digits.length >= 9) return digits.slice(-9)
  return digits
}

export function normalizeResidenceLabel(residence: string | undefined | null): string {
  const raw = String(residence ?? '').trim()
  if (!raw) return 'Not recorded'

  const parts = raw.split(/[,;/|]+/).map((part) => part.trim()).filter(Boolean)
  const candidate = parts.length > 1 ? parts[parts.length - 1] : parts[0]
  const normalized = candidate.toLowerCase().replace(/\./g, '').trim()
  const mapped = GHANA_REGION_ALIASES[normalized]
  if (mapped) return mapped

  if (normalized.length <= 3) return titleCase(raw)
  return titleCase(candidate)
}

export function normalizeEducationBand(
  educationLevel: string | undefined | null,
  highestQualification?: string | null
): string {
  const level = String(educationLevel ?? highestQualification ?? '').toUpperCase()
  if (!level.trim()) return 'Not recorded'
  if (/JHS/.test(level)) return 'JHS'
  if (/SHS|COMPLETED/.test(level)) return 'SHS'
  if (/LEVEL|GRADUATED|POSTGRADUATE|UNIVERSITY/.test(level)) return 'University / Tertiary'
  if (/JHS|SHS|UNIVERSITY/.test(String(highestQualification ?? '').toUpperCase())) {
    return String(highestQualification)
  }
  return 'Other'
}

export function normalizeEducationLevel(
  educationLevel: string | undefined | null,
  highestQualification?: string | null
): string {
  const level = String(educationLevel ?? '').trim()
  if (level) return level
  const qual = String(highestQualification ?? '').trim()
  if (qual) return qual
  return 'Not recorded'
}

export function normalizeGender(sex: string | undefined | null): string {
  const value = String(sex ?? '').trim()
  if (!value) return 'Not recorded'
  if (/^m/i.test(value)) return 'Male'
  if (/^f/i.test(value)) return 'Female'
  return titleCase(value)
}

export function normalizeRole(role: string | undefined | null): string {
  const value = String(role ?? '').trim()
  if (!value) return 'Participant'
  return titleCase(value)
}

function computeDataQualityScore(rows: DataQualityRow[]): number {
  if (rows.length === 0) return 0
  return Math.round(rows.reduce((sum, row) => sum + row.percent, 0) / rows.length)
}

function buildFunnel(
  total: number,
  checkedIn: number,
  paid: number,
  followUpCompleted: number
): FunnelStep[] {
  if (total <= 0) return []

  const steps = [
    { label: 'Registered', count: total },
    { label: 'Checked in', count: checkedIn },
    { label: 'Paid', count: paid },
    { label: 'Follow-up done', count: followUpCompleted },
  ]

  return steps.map((step, index) => {
    const prev = index > 0 ? steps[index - 1].count : step.count
    const dropOffPercent =
      index > 0 && prev > 0 ? Math.round(((prev - step.count) / prev) * 100) : undefined
    return {
      label: step.label,
      count: step.count,
      percent: Math.round((step.count / total) * 100),
      dropOffPercent,
    }
  })
}

function buildCombinedRevenue(yearReports: CampYearAnalyticsReport[]): CombinedRevenueSummary {
  let totalPaid = 0
  let totalPending = 0
  let totalExpected = 0

  const byYear = yearReports.map((report) => {
    totalPaid += report.overview.paidAmount
    totalPending += report.overview.pendingAmount
    totalExpected += report.overview.totalExpected
    return {
      year: report.year,
      paid: report.overview.paidAmount,
      pending: report.overview.pendingAmount,
      collectionRate: report.overview.collectionRate,
    }
  })

  return {
    totalPaid,
    totalPending,
    totalExpected,
    collectionRate: totalExpected > 0 ? Math.round((totalPaid / totalExpected) * 100) : 0,
    byYear: byYear.sort((a, b) => a.year - b.year),
  }
}

function buildNewVsReturningRows(yearReports: CampYearAnalyticsReport[]): NewVsReturningRow[] {
  return [...yearReports]
    .sort((a, b) => a.year - b.year)
    .map((report) => ({
      year: report.year,
      yearId: report.yearId,
      newCampers: report.overview.newRegistrants,
      returningCampers: report.overview.returning,
      returnRate:
        report.total > 0 ? Math.round((report.overview.returning / report.total) * 100) : 0,
    }))
}

function buildDemographicTrends(
  yearReports: CampYearAnalyticsReport[],
  dimension: keyof CampYearAnalyticsReport['demographics'],
  maxLabels = 5
): DemographicTrendRow[] {
  const labelTotals = new Map<string, number>()
  for (const report of yearReports) {
    for (const slice of report.demographics[dimension]) {
      if (slice.label === 'Not recorded' || slice.label === 'Unknown') continue
      labelTotals.set(slice.label, (labelTotals.get(slice.label) ?? 0) + slice.count)
    }
  }

  const topLabels = Array.from(labelTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxLabels)
    .map(([label]) => label)

  return topLabels.map((label) => ({
    label,
    values: [...yearReports]
      .sort((a, b) => a.year - b.year)
      .map((report) => {
        const slice = report.demographics[dimension].find((row) => row.label === label)
        return {
          year: report.year,
          percent: slice?.percent ?? 0,
          count: slice?.count ?? 0,
        }
      }),
  }))
}

function findSlicePercent(slices: AnalyticsSlice[], matcher: (label: string) => boolean): number {
  const slice = slices.find((row) => matcher(row.label))
  return slice?.percent ?? 0
}

function buildOperationsMetricSeries(yearReports: CampYearAnalyticsReport[]): MetricTrendSeries[] {
  const sorted = [...yearReports].sort((a, b) => a.year - b.year)

  const build = (
    key: string,
    label: string,
    description: string,
    pick: (report: CampYearAnalyticsReport) => number
  ): MetricTrendSeries => ({
    key,
    label,
    description,
    unit: 'percent',
    values: sorted.map((report) => ({ year: report.year, value: pick(report) })),
  })

  return [
    build('nhis', 'NHIS card holders', 'Registrants who reported having NHIS', (report) =>
      findSlicePercent(report.operations.nhis, (l) => l.includes('Has NHIS'))
    ),
    build('health', 'Health challenges reported', 'Self-reported health challenges', (report) =>
      findSlicePercent(report.operations.health, (l) => l.includes('Reported'))
    ),
    build('followUp', 'Follow-up completed', 'Post-camp follow-up marked complete', (report) =>
      findSlicePercent(report.operations.followUp, (l) => l === 'Completed')
    ),
    build('parentContact', 'Complete parent/guardian contact', 'Both parent name and contact on file', (report) =>
      findSlicePercent(report.operations.parentContact, (l) => l.includes('Complete'))
    ),
    build('paid', 'Payment collected', 'Camp fees marked paid or confirmed', (report) =>
      findSlicePercent(report.operations.paymentStatus, (l) => l === 'Paid')
    ),
  ]
}

function buildVelocityOverlay(
  yearReports: CampYearAnalyticsReport[],
  registrationsByYearId: Record<string, CampRegistration[]>
): VelocityOverlaySeries[] {
  const sorted = [...yearReports].sort((a, b) => a.year - b.year)

  return sorted.map((report) => {
    const regs = registrationsByYearId[report.yearId] ?? []
    if (regs.length === 0) {
      return { year: report.year, theme: report.theme, points: [] }
    }

    const timestamps = regs
      .map((r) => new Date(r.created_at).getTime())
      .filter((t) => Number.isFinite(t))
    if (timestamps.length === 0) {
      return { year: report.year, theme: report.theme, points: [] }
    }

    const minDate = Math.min(...timestamps)
    const dayBuckets = new Map<number, number>()
    for (const reg of regs) {
      const t = new Date(reg.created_at).getTime()
      if (!Number.isFinite(t)) continue
      const dayIndex = Math.floor((t - minDate) / (24 * 60 * 60 * 1000))
      dayBuckets.set(dayIndex, (dayBuckets.get(dayIndex) ?? 0) + 1)
    }

    const maxDay = Math.min(Math.max(...Array.from(dayBuckets.keys()), 0), 120)
    let cumulative = 0
    const points: VelocityOverlaySeries['points'] = []
    for (let dayIndex = 0; dayIndex <= maxDay; dayIndex += 1) {
      cumulative += dayBuckets.get(dayIndex) ?? 0
      points.push({
        dayIndex,
        label: dayIndex === 0 ? 'Day 1' : `Day ${dayIndex + 1}`,
        cumulative,
      })
    }

    return { year: report.year, theme: report.theme, points }
  })
}

function buildCohortRetention(
  campYears: Array<Pick<CampYear, 'id' | 'year'>>,
  registrationsByYearId: Record<string, CampRegistration[]>
): CohortRetentionRow[] {
  const sortedYears = [...campYears].sort((a, b) => a.year - b.year)
  const phoneYears = new Map<string, Set<number>>()

  for (const campYear of sortedYears) {
    const regs = registrationsByYearId[campYear.id] ?? []
    for (const reg of regs) {
      const phone = normalizePhoneKey(reg.phone)
      if (!phone) continue
      const years = phoneYears.get(phone) ?? new Set<number>()
      years.add(campYear.year)
      phoneYears.set(phone, years)
    }
  }

  const phoneFirstYear = new Map<string, number>()
  for (const [phone, years] of Array.from(phoneYears.entries())) {
    phoneFirstYear.set(phone, Math.min(...Array.from(years)))
  }

  return sortedYears.map((campYear) => {
    const cohortYear = campYear.year
    const cohortPhones = Array.from(phoneFirstYear.entries())
      .filter(([, firstYear]) => firstYear === cohortYear)
      .map(([phone]) => phone)
    const cohortSize = cohortPhones.length

    const returnsByYear = sortedYears
      .filter((y) => y.year >= cohortYear)
      .map((y) => {
        const count = cohortPhones.filter((phone) => phoneYears.get(phone)?.has(y.year)).length
        return {
          year: y.year,
          yearsSinceFirst: y.year - cohortYear,
          count,
          rate: cohortSize > 0 ? Math.round((count / cohortSize) * 100) : 0,
        }
      })

    return { cohortYear, cohortSize, returnsByYear }
  })
}

export function buildTrendAlerts(kpiByYear: CampTrendAnalysis['kpiByYear']): TrendAlert[] {
  if (kpiByYear.length < 2) return []

  const latest = kpiByYear[kpiByYear.length - 1]
  const prior = kpiByYear[kpiByYear.length - 2]
  const alerts: TrendAlert[] = []

  const checkInDrop = prior.checkInRate - latest.checkInRate
  if (checkInDrop >= 10) {
    alerts.push({
      id: 'check-in-drop',
      severity: 'warning',
      title: 'Check-in rate dropped sharply',
      detail: `Camp ${latest.year} check-in is ${latest.checkInRate}% — down ${checkInDrop} pp from ${prior.checkInRate}% in ${prior.year}. Review reminders and desk staffing.`,
    })
  } else if (latest.checkInRate - prior.checkInRate >= 10) {
    alerts.push({
      id: 'check-in-up',
      severity: 'success',
      title: 'Check-in rate improved',
      detail: `Camp ${latest.year} check-in rose to ${latest.checkInRate}% (+${latest.checkInRate - prior.checkInRate} pp vs ${prior.year}).`,
    })
  }

  const collectionDrop = prior.collectionRate - latest.collectionRate
  if (collectionDrop >= 10) {
    alerts.push({
      id: 'collection-drop',
      severity: 'warning',
      title: 'Fee collection declined',
      detail: `Collection rate fell to ${latest.collectionRate}% (was ${prior.collectionRate}% in ${prior.year}). Follow up on pending payments.`,
    })
  }

  const qualityDrop = prior.dataQualityScore - latest.dataQualityScore
  if (qualityDrop >= 10) {
    alerts.push({
      id: 'quality-drop',
      severity: 'warning',
      title: 'Registration data quality slipped',
      detail: `Data completeness is ${latest.dataQualityScore}% — down ${qualityDrop} pp from ${prior.year}. Tighten required fields on the public form.`,
    })
  }

  if (latest.growthPercent != null && latest.growthPercent <= -15) {
    alerts.push({
      id: 'registration-decline',
      severity: 'warning',
      title: 'Registrations declined year-on-year',
      detail: `Camp ${latest.year} had ${latest.growthPercent}% fewer registrations than ${prior.year} (${latest.total} vs ${prior.total}).`,
    })
  } else if (latest.growthPercent != null && latest.growthPercent >= 20) {
    alerts.push({
      id: 'registration-surge',
      severity: 'success',
      title: 'Strong registration growth',
      detail: `Camp ${latest.year} grew ${latest.growthPercent}% vs ${prior.year} (${latest.total} registrations).`,
    })
  }

  const returnDrop = prior.returnRate - latest.returnRate
  if (returnDrop >= 10) {
    alerts.push({
      id: 'return-drop',
      severity: 'info',
      title: 'Return rate softened',
      detail: `Returning campers dropped to ${latest.returnRate}% of registrations (was ${prior.returnRate}% in ${prior.year}).`,
    })
  }

  return alerts.slice(0, 6)
}

export function buildCampTrendAnalysis(
  yearReports: CampYearAnalyticsReport[],
  yearComparison: YearComparisonRow[],
  campYears: Array<Pick<CampYear, 'id' | 'year'>> = [],
  registrationsByYearId: Record<string, CampRegistration[]> = {}
): CampTrendAnalysis {
  const emptyTrends: CampTrendAnalysis = {
    kpiByYear: [],
    kpiRateSeries: [],
    registrationGrowth: [],
    operationsSeries: [],
    funnelRates: [],
    demographicTrends: {
      ageBracket: [],
      gender: [],
      educationBand: [],
      residence: [],
    },
    velocityOverlay: [],
    cohortRetention: [],
    roleTrends: [],
    alerts: [],
  }

  if (yearReports.length === 0 || yearComparison.length === 0) {
    return emptyTrends
  }

  const sortedComparison = [...yearComparison].sort((a, b) => a.year - b.year)
  const sortedReports = [...yearReports].sort((a, b) => a.year - b.year)

  const kpiByYear = sortedComparison.map((row) => {
    const report = sortedReports.find((r) => r.yearId === row.yearId)
    const total = report?.total ?? row.total
    const followUpCompleted = report?.overview.followUpCompleted ?? 0
    return {
      year: row.year,
      theme: row.theme,
      total: row.total,
      growthPercent: row.growthPercent,
      checkInRate: row.checkInRate,
      returnRate: row.returnRate,
      collectionRate: row.collectionRate,
      dataQualityScore: row.dataQualityScore,
      newCampers: row.newCampers,
      returningCampers: row.returningCampers,
      checkedIn: row.checkedIn,
      paidCount: row.paidCount,
      followUpCompletedRate: total > 0 ? Math.round((followUpCompleted / total) * 100) : 0,
    }
  })

  const kpiRateSeries: MetricTrendSeries[] = [
    {
      key: 'checkInRate',
      label: 'Check-in rate',
      description: 'Registered campers who checked in',
      unit: 'percent',
      values: kpiByYear.map((row) => ({ year: row.year, value: row.checkInRate })),
    },
    {
      key: 'returnRate',
      label: 'Return rate',
      description: 'Returning campers as % of registrations',
      unit: 'percent',
      values: kpiByYear.map((row) => ({ year: row.year, value: row.returnRate })),
    },
    {
      key: 'collectionRate',
      label: 'Fee collection',
      description: 'Camp fees collected vs expected',
      unit: 'percent',
      values: kpiByYear.map((row) => ({ year: row.year, value: row.collectionRate })),
    },
    {
      key: 'dataQualityScore',
      label: 'Data quality',
      description: 'Average registration field completeness',
      unit: 'percent',
      values: kpiByYear.map((row) => ({ year: row.year, value: row.dataQualityScore })),
    },
    {
      key: 'followUpCompletedRate',
      label: 'Follow-up completed',
      description: 'Registrations with follow-up marked complete',
      unit: 'percent',
      values: kpiByYear.map((row) => ({ year: row.year, value: row.followUpCompletedRate })),
    },
  ]

  const registrationGrowth = sortedComparison.map((row) => ({
    year: row.year,
    name: String(row.year),
    total: row.total,
    growthPercent: row.growthPercent,
  }))

  const funnelRates = sortedReports.map((report) => ({
    year: report.year,
    name: String(report.year),
    checkInRate: report.overview.checkInRate,
    collectionRate: report.overview.collectionRate,
    followUpRate:
      report.total > 0 ? Math.round((report.overview.followUpCompleted / report.total) * 100) : 0,
  }))

  return {
    kpiByYear,
    kpiRateSeries,
    registrationGrowth,
    operationsSeries: buildOperationsMetricSeries(sortedReports),
    funnelRates,
    demographicTrends: {
      ageBracket: buildDemographicTrends(sortedReports, 'ageBracket'),
      gender: buildDemographicTrends(sortedReports, 'gender'),
      educationBand: buildDemographicTrends(sortedReports, 'educationBand'),
      residence: buildDemographicTrends(sortedReports, 'residence', 6),
    },
    velocityOverlay: buildVelocityOverlay(sortedReports, registrationsByYearId),
    cohortRetention: buildCohortRetention(campYears, registrationsByYearId),
    roleTrends: buildDemographicTrends(sortedReports, 'role', 6),
    alerts: buildTrendAlerts(kpiByYear),
  }
}

function buildOverallFunnel(yearReports: CampYearAnalyticsReport[]): FunnelStep[] {
  const totals = yearReports.reduce(
    (acc, report) => ({
      total: acc.total + report.total,
      checkedIn: acc.checkedIn + report.overview.checkedIn,
      paid: acc.paid + report.overview.paid,
      followUpCompleted: acc.followUpCompleted + report.overview.followUpCompleted,
    }),
    { total: 0, checkedIn: 0, paid: 0, followUpCompleted: 0 }
  )
  return buildFunnel(totals.total, totals.checkedIn, totals.paid, totals.followUpCompleted)
}

function countBy<T>(items: T[], getLabel: (item: T) => string): Map<string, number> {
  const map = new Map<string, number>()
  for (const item of items) {
    const label = getLabel(item)
    map.set(label, (map.get(label) ?? 0) + 1)
  }
  return map
}

function toSlices(
  buckets: Map<string, number>,
  total: number,
  options?: { sortOrder?: string[]; maxItems?: number; otherLabel?: string }
): AnalyticsSlice[] {
  const maxItems = options?.maxItems ?? 10
  const entries = Array.from(buckets.entries())
  const sorted = options?.sortOrder
    ? entries.sort((a, b) => {
        const ai = options.sortOrder!.indexOf(a[0])
        const bi = options.sortOrder!.indexOf(b[0])
        if (ai === -1 && bi === -1) return b[1] - a[1]
        if (ai === -1) return 1
        if (bi === -1) return -1
        return ai - bi
      })
    : entries.sort((a, b) => b[1] - a[1])

  const top = sorted.slice(0, maxItems)
  const rest = sorted.slice(maxItems)
  const otherCount = rest.reduce((sum, [, count]) => sum + count, 0)

  const slices: AnalyticsSlice[] = top.map(([label, count]) => ({
    label,
    count,
    percent: total > 0 ? Math.round((count / total) * 100) : 0,
  }))

  if (otherCount > 0) {
    slices.push({
      label: options?.otherLabel ?? 'Other',
      count: otherCount,
      percent: total > 0 ? Math.round((otherCount / total) * 100) : 0,
    })
  }

  return slices
}

function buildTimeline(registrations: CampRegistration[]): TimelinePoint[] {
  const byDate = countBy(registrations, (r) => new Date(r.created_at).toISOString().split('T')[0])
  const dates = Array.from(byDate.keys()).sort()
  let cumulative = 0
  return dates.map((date) => {
    const count = byDate.get(date) ?? 0
    cumulative += count
    const d = new Date(date)
    const label = Number.isNaN(d.getTime())
      ? date
      : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    return { date, label, count, cumulative }
  })
}

function buildDataQuality(registrations: CampRegistration[]): DataQualityRow[] {
  const total = registrations.length
  if (total === 0) return []

  const fields: Array<{ field: string; filled: (r: CampRegistration) => boolean }> = [
    { field: 'Phone', filled: (r) => Boolean(r.phone?.trim()) },
    { field: 'Email', filled: (r) => Boolean(r.email?.trim() && r.email.trim() !== ' ') },
    { field: 'Sex', filled: (r) => Boolean(r.sex) },
    { field: 'Age bracket', filled: (r) => Boolean(r.age_bracket) },
    { field: 'Residence', filled: (r) => Boolean(r.residence?.trim()) },
    { field: 'Education', filled: (r) => Boolean(r.education_level || r.highest_qualification) },
    { field: 'Parent contact', filled: (r) => Boolean(r.parent_name?.trim() && r.parent_contact?.trim()) },
    { field: 'NHIS response', filled: (r) => r.has_nhis_card === true || r.has_nhis_card === false },
    { field: 'Health response', filled: (r) => r.has_health_challenge === true || r.has_health_challenge === false },
  ]

  return fields.map(({ field, filled }) => {
    const count = registrations.filter(filled).length
    return { field, filled: count, percent: Math.round((count / total) * 100) }
  })
}

function buildYearInsights(
  report: Omit<CampYearAnalyticsReport, 'insights'>,
  registrations: CampRegistration[]
): string[] {
  const insights: string[] = []
  const { total, overview, demographics } = report

  if (total === 0) {
    insights.push('No registrations recorded for this camp year yet.')
    return insights
  }

  const topAge = demographics.ageBracket[0]
  if (topAge && topAge.percent >= 40) {
    insights.push(`${topAge.percent}% of registrants are in the ${topAge.label} age bracket — plan sessions accordingly.`)
  }

  const topGender = demographics.gender.find((s) => s.label !== 'Not recorded')
  if (topGender && topGender.percent >= 55) {
    insights.push(`${topGender.label} registrants make up ${topGender.percent}% of this year's camp.`)
  }

  const topRegion = demographics.residence.find((s) => s.label !== 'Not recorded')
  if (topRegion && topRegion.percent >= 20) {
    insights.push(`${topRegion.label} is the most common residence area (${topRegion.percent}%).`)
  }

  if (overview.returning > 0) {
    const returnPct = Math.round((overview.returning / total) * 100)
    insights.push(`${returnPct}% are returning campers (${overview.returning} of ${total}).`)
  }

  if (overview.checkInRate > 0 && overview.checkInRate < 70) {
    insights.push(`Check-in rate is ${overview.checkInRate}% — consider reminder SMS before camp day.`)
  } else if (overview.checkInRate >= 85) {
    insights.push(`Strong check-in rate at ${overview.checkInRate}%.`)
  }

  if (overview.collectionRate < 60 && overview.pendingPayment > 0) {
    insights.push(
      `Payment collection is ${overview.collectionRate}% with ${overview.pendingPayment} pending — follow up on camp fees.`
    )
  }

  const healthYes = report.operations.health.find((s) => s.label.includes('Reported'))
  if (healthYes && healthYes.percent >= 10) {
    insights.push(`${healthYes.percent}% reported a health challenge — review medical staffing needs.`)
  }

  const timeline = buildTimeline(registrations)
  if (timeline.length >= 3) {
    const peak = [...timeline].sort((a, b) => b.count - a.count)[0]
    if (peak.count >= 5) {
      insights.push(`Peak registration day: ${peak.label} (${peak.count} sign-ups).`)
    }
  }

  const incompleteParent = report.operations.parentContact.find((s) => s.label.includes('Missing'))
  if (incompleteParent && incompleteParent.percent >= 25) {
    insights.push(`${incompleteParent.percent}% lack complete parent/guardian contact — prioritize follow-up for minors.`)
  }

  return insights.slice(0, 6)
}

function buildOperationsSlices(registrations: CampRegistration[], total: number) {
  return {
    nhis: toSlices(
      countBy(registrations, (r) => {
        if (r.has_nhis_card === true) return 'Has NHIS card'
        if (r.has_nhis_card === false) return 'No NHIS card'
        return 'Not recorded'
      }),
      total
    ),
    health: toSlices(
      countBy(registrations, (r) => {
        if (r.has_health_challenge === true) return 'Reported health challenge'
        if (r.has_health_challenge === false) return 'No reported challenge'
        return 'Not recorded'
      }),
      total
    ),
    attendanceHistory: toSlices(
      countBy(registrations, (r) => {
        const times = r.times_attended
        if (times == null) return 'Not recorded'
        if (times <= 0) return 'First camp'
        if (times === 1) return '1 previous camp'
        if (times <= 3) return '2–3 previous camps'
        return '4+ previous camps'
      }),
      total,
      {
        sortOrder: ['First camp', '1 previous camp', '2–3 previous camps', '4+ previous camps', 'Not recorded'],
      }
    ),
    parentContact: toSlices(
      countBy(registrations, (r) => {
        const hasName = Boolean(r.parent_name?.trim() && r.parent_name.trim() !== 'N/A')
        const hasContact = Boolean(r.parent_contact?.trim() && r.parent_contact.trim() !== 'N/A')
        if (hasName && hasContact) return 'Complete parent/guardian contact'
        if (hasName || hasContact) return 'Partial contact'
        return 'Missing contact'
      }),
      total
    ),
    followUp: toSlices(
      countBy(registrations, (r) => {
        const status = r.follow_up_status ?? 'pending'
        if (status === 'pending') return 'Pending'
        if (status === 'in_progress') return 'In progress'
        if (status === 'completed') return 'Completed'
        return titleCase(status)
      }),
      total,
      { sortOrder: ['Pending', 'In progress', 'Completed'] }
    ),
    paymentStatus: toSlices(
      countBy(registrations, (r) => {
        const status = r.payment_status ?? 'pending'
        if (status === 'paid' || status === 'confirmed') return 'Paid'
        if (status === 'refunded') return 'Refunded'
        return 'Pending'
      }),
      total,
      { sortOrder: ['Paid', 'Pending', 'Refunded'] }
    ),
    healthConditions: toSlices(
      countBy(
        registrations.flatMap((r) =>
          r.has_health_challenge ? (r.health_challenges ?? []).map((c) => c.trim()).filter(Boolean) : []
        ),
        (label) => label
      ),
      total,
      { maxItems: 8 }
    ),
  }
}

function buildDemographicsSlices(registrations: CampRegistration[], total: number) {
  return {
    gender: toSlices(countBy(registrations, (r) => normalizeGender(r.sex)), total),
    ageBracket: toSlices(
      countBy(registrations, (r) => r.age_bracket ?? 'Unknown'),
      total,
      { sortOrder: AGE_ORDER }
    ),
    educationBand: toSlices(
      countBy(registrations, (r) => normalizeEducationBand(r.education_level, r.highest_qualification)),
      total,
      { sortOrder: ['JHS', 'SHS', 'University / Tertiary', 'Other', 'Not recorded'] }
    ),
    educationLevel: toSlices(
      countBy(registrations, (r) => normalizeEducationLevel(r.education_level, r.highest_qualification)),
      total,
      { maxItems: 8 }
    ),
    residence: toSlices(countBy(registrations, (r) => normalizeResidenceLabel(r.residence)), total, {
      maxItems: 12,
    }),
    role: toSlices(countBy(registrations, (r) => normalizeRole(r.role)), total, { maxItems: 8 }),
  }
}

export function buildCampYearAnalyticsReport(
  campYear: Pick<CampYear, 'id' | 'year' | 'theme'>,
  registrations: CampRegistration[]
): CampYearAnalyticsReport {
  const total = registrations.length
  const paid = registrations.filter((r) => r.payment_status === 'paid' || r.payment_status === 'confirmed')
  const pending = registrations.filter((r) => (r.payment_status ?? 'pending') === 'pending')
  const paidAmount = paid.reduce((sum, r) => sum + (r.payment_amount ?? 0), 0)
  const pendingAmount = pending.reduce((sum, r) => sum + (r.payment_amount ?? 0), 0)
  const totalExpected = registrations.reduce((sum, r) => sum + (r.payment_amount ?? 0), 0)
  const checkedIn = registrations.filter((r) => r.status === 'checked_in').length

  const uniquePhones = new Set(registrations.map((r) => normalizePhoneKey(r.phone)).filter(Boolean)).size

  const overview = {
    checkedIn,
    registered: registrations.filter((r) => r.status === 'registered').length,
    cancelled: registrations.filter((r) => r.status === 'cancelled').length,
    newRegistrants: registrations.filter((r) => r.is_new_registrant).length,
    returning: registrations.filter((r) => !r.is_new_registrant).length,
    paid: paid.length,
    pendingPayment: pending.length,
    followUpPending: registrations.filter((r) => (r.follow_up_status ?? 'pending') === 'pending').length,
    followUpInProgress: registrations.filter((r) => r.follow_up_status === 'in_progress').length,
    followUpCompleted: registrations.filter((r) => r.follow_up_status === 'completed').length,
    paidAmount,
    pendingAmount,
    totalExpected,
    collectionRate: totalExpected > 0 ? Math.round((paidAmount / totalExpected) * 100) : 0,
    checkInRate: total > 0 ? Math.round((checkedIn / total) * 100) : 0,
  }

  const dataQuality = buildDataQuality(registrations)
  const dataQualityScore = computeDataQualityScore(dataQuality)

  const base = {
    scope: 'year' as const,
    yearId: campYear.id,
    year: campYear.year,
    theme: campYear.theme,
    total,
    uniquePhones,
    overview,
    demographics: buildDemographicsSlices(registrations, total),
    operations: buildOperationsSlices(registrations, total),
    timeline: buildTimeline(registrations),
    dataQuality,
    dataQualityScore,
    returnRate: total > 0 ? Math.round((overview.returning / total) * 100) : 0,
    funnel: buildFunnel(total, checkedIn, overview.paid, overview.followUpCompleted),
  }

  return {
    ...base,
    insights: buildYearInsights(base, registrations),
  }
}

function groupRegistrationsByPhone(
  allRegistrations: CampRegistration[]
): Map<string, CampRegistration[]> {
  const map = new Map<string, CampRegistration[]>()
  for (const reg of allRegistrations) {
    const key = normalizePhoneKey(reg.phone)
    if (!key) continue
    const list = map.get(key) ?? []
    list.push(reg)
    map.set(key, list)
  }
  return map
}

/** One registration per unique phone (most recent registration wins for demographics). */
export function dedupeRegistrationsByPhone(registrations: CampRegistration[]): CampRegistration[] {
  const byPhone = groupRegistrationsByPhone(registrations)
  const result: CampRegistration[] = []
  for (const rows of Array.from(byPhone.values())) {
    const sorted = [...rows].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    result.push(sorted[0])
  }
  return result
}

function buildYearComparison(
  yearReports: CampYearAnalyticsReport[],
  registrationsByYear: Map<string, CampRegistration[]>
): YearComparisonRow[] {
  const sorted = [...yearReports].sort((a, b) => a.year - b.year)
  return sorted.map((report, index) => {
    const prev = index > 0 ? sorted[index - 1] : null
    const growthPercent =
      prev && prev.total > 0 ? Math.round(((report.total - prev.total) / prev.total) * 100) : null

    const timeline = buildTimeline(registrationsByYear.get(report.yearId) ?? [])
    const peak = timeline.length > 0 ? [...timeline].sort((a, b) => b.count - a.count)[0] : null

    return {
      yearId: report.yearId,
      year: report.year,
      theme: report.theme,
      total: report.total,
      newCampers: report.overview.newRegistrants,
      returningCampers: report.overview.returning,
      returnRate: report.returnRate,
      checkedIn: report.overview.checkedIn,
      checkInRate: report.overview.checkInRate,
      paidCount: report.overview.paid,
      collectionRate: report.overview.collectionRate,
      growthPercent,
      peakDay: peak?.label ?? null,
      peakDayCount: peak?.count ?? 0,
      dataQualityScore: report.dataQualityScore,
    }
  })
}

function buildRetentionBuckets(byPhone: Map<string, CampRegistration[]>, uniqueCampers: number): RetentionBucket[] {
  if (uniqueCampers === 0) return []

  let once = 0
  let twice = 0
  let threePlus = 0

  for (const rows of Array.from(byPhone.values())) {
    const yearIds = new Set(rows.map((r) => r.camp_year_id))
    const count = yearIds.size
    if (count <= 1) once += 1
    else if (count === 2) twice += 1
    else threePlus += 1
  }

  return [
    { label: 'Attended 1 camp year', count: once, percent: Math.round((once / uniqueCampers) * 100) },
    { label: 'Attended 2 camp years', count: twice, percent: Math.round((twice / uniqueCampers) * 100) },
    { label: 'Attended 3+ camp years', count: threePlus, percent: Math.round((threePlus / uniqueCampers) * 100) },
  ]
}

function buildMultiYearInsights(
  combined: CampMultiYearAnalyticsReport['combined'],
  yearReports: CampYearAnalyticsReport[]
): string[] {
  const insights: string[] = []
  const { uniqueCampers, totalRegistrations, multiYearCampers, yearComparison } = combined

  if (yearReports.length === 0) return ['No camp year data available.']

  insights.push(
    `${uniqueCampers.toLocaleString()} unique campers across ${yearReports.length} camp year${yearReports.length === 1 ? '' : 's'} (${totalRegistrations.toLocaleString()} total registrations).`
  )

  if (multiYearCampers > 0 && uniqueCampers > 0) {
    const pct = Math.round((multiYearCampers / uniqueCampers) * 100)
    insights.push(`${pct}% of unique campers (${multiYearCampers.toLocaleString()}) returned for more than one camp year.`)
  }

  const withGrowth = yearComparison.filter((row) => row.growthPercent != null)
  if (withGrowth.length > 0) {
    const latest = withGrowth[withGrowth.length - 1]
    if (latest.growthPercent != null) {
      if (latest.growthPercent > 10) {
        insights.push(`Camp ${latest.year} grew ${latest.growthPercent}% vs the previous year.`)
      } else if (latest.growthPercent < -10) {
        insights.push(`Camp ${latest.year} registrations dropped ${Math.abs(latest.growthPercent)}% vs the previous year.`)
      }
    }
    const bestGrowth = [...withGrowth].sort((a, b) => (b.growthPercent ?? 0) - (a.growthPercent ?? 0))[0]
    if (bestGrowth.growthPercent != null && bestGrowth.growthPercent > 20) {
      insights.push(`Largest year-on-year jump: ${bestGrowth.year} (+${bestGrowth.growthPercent}%).`)
    }
  }

  const topYear = [...yearComparison].sort((a, b) => b.total - a.total)[0]
  if (topYear && yearReports.length > 1) {
    insights.push(`Highest attendance year: ${topYear.year} with ${topYear.total.toLocaleString()} registrations.`)
  }

  const topAge = combined.demographics.ageBracket.find((s) => s.label !== 'Unknown')
  if (topAge && topAge.percent >= 35) {
    insights.push(`Across all years, ${topAge.label} is the dominant age bracket (${topAge.percent}% of unique campers).`)
  }

  const lowCollection = yearComparison.filter((row) => row.collectionRate > 0 && row.collectionRate < 55)
  if (lowCollection.length > 0) {
    insights.push(
      `${lowCollection.length} year${lowCollection.length === 1 ? '' : 's'} had collection rates below 55% — review payment follow-up timing.`
    )
  }

  const avgQuality =
    yearReports.length > 0
      ? Math.round(yearReports.reduce((sum, row) => sum + row.dataQualityScore, 0) / yearReports.length)
      : 0
  if (avgQuality > 0 && avgQuality < 70) {
    insights.push(`Average data completeness across years is ${avgQuality}% — tighten required fields on registration forms.`)
  }

  const highestReturn = [...yearComparison].sort((a, b) => b.returnRate - a.returnRate)[0]
  if (highestReturn && highestReturn.returnRate >= 30 && yearReports.length > 1) {
    insights.push(`Best return rate: Camp ${highestReturn.year} at ${highestReturn.returnRate}% returning campers.`)
  }

  return insights.slice(0, 8)
}

export function buildCampMultiYearAnalyticsReport(
  campYears: CampYear[],
  registrationsByYearId: Record<string, CampRegistration[]>
): CampMultiYearAnalyticsReport {
  const sortedYears = [...campYears].sort((a, b) => b.year - a.year)
  const yearReports = sortedYears.map((year) =>
    buildCampYearAnalyticsReport(year, registrationsByYearId[year.id] ?? [])
  )

  const allRegistrations = sortedYears.flatMap((year) => registrationsByYearId[year.id] ?? [])
  const byPhone = groupRegistrationsByPhone(allRegistrations)
  const uniqueCampers = byPhone.size
  const multiYearCampers = Array.from(byPhone.values()).filter(
    (rows) => new Set(rows.map((r) => r.camp_year_id)).size > 1
  ).length
  const uniqueRegistrations = dedupeRegistrationsByPhone(allRegistrations)
  const total = uniqueRegistrations.length

  const registrationsByYear = new Map<string, CampRegistration[]>()
  for (const year of sortedYears) {
    registrationsByYear.set(year.id, registrationsByYearId[year.id] ?? [])
  }

  const yearComparison = buildYearComparison(yearReports, registrationsByYear)

  const combined = {
    totalRegistrations: allRegistrations.length,
    uniqueCampers,
    multiYearCampers,
    singleYearCampers: uniqueCampers - multiYearCampers,
    avgRegistrationsPerYear:
      sortedYears.length > 0 ? Math.round(allRegistrations.length / sortedYears.length) : 0,
    yearComparison,
    retention: buildRetentionBuckets(byPhone, uniqueCampers),
    demographics: buildDemographicsSlices(uniqueRegistrations, total),
    operations: buildOperationsSlices(uniqueRegistrations, total),
    revenue: buildCombinedRevenue(yearReports),
    newVsReturning: buildNewVsReturningRows(yearReports),
    demographicTrends: {
      ageBracket: buildDemographicTrends(yearReports, 'ageBracket'),
      gender: buildDemographicTrends(yearReports, 'gender'),
      educationBand: buildDemographicTrends(yearReports, 'educationBand'),
    },
    trends: buildCampTrendAnalysis(yearReports, yearComparison, sortedYears, registrationsByYearId),
    avgDataQualityScore:
      yearReports.length > 0
        ? Math.round(yearReports.reduce((sum, row) => sum + row.dataQualityScore, 0) / yearReports.length)
        : 0,
    overallFunnel: buildOverallFunnel(yearReports),
  }

  return {
    scope: 'all',
    years: yearReports,
    combined,
    insights: buildMultiYearInsights(combined, yearReports),
  }
}

export function buildCampAnalyticsReport(
  campYears: CampYear[],
  registrationsByYearId: Record<string, CampRegistration[]>,
  selectedYearId: string | 'all'
): CampAnalyticsReport {
  if (selectedYearId === 'all') {
    return buildCampMultiYearAnalyticsReport(campYears, registrationsByYearId)
  }
  const year = campYears.find((y) => y.id === selectedYearId)
  if (!year) {
    const fallback = campYears[0]
    if (!fallback) {
      return buildCampMultiYearAnalyticsReport([], {})
    }
    return buildCampYearAnalyticsReport(fallback, registrationsByYearId[fallback.id] ?? [])
  }
  return buildCampYearAnalyticsReport(year, registrationsByYearId[year.id] ?? [])
}
