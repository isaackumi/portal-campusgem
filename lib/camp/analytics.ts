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
  checkedIn: number
  checkInRate: number
  paidCount: number
  collectionRate: number
  growthPercent: number | null
  peakDay: string | null
  peakDayCount: number
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
    dataQuality: buildDataQuality(registrations),
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
      checkedIn: report.overview.checkedIn,
      checkInRate: report.overview.checkInRate,
      paidCount: report.overview.paid,
      collectionRate: report.overview.collectionRate,
      growthPercent,
      peakDay: peak?.label ?? null,
      peakDayCount: peak?.count ?? 0,
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

  return insights.slice(0, 7)
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

  const combined = {
    totalRegistrations: allRegistrations.length,
    uniqueCampers,
    multiYearCampers,
    singleYearCampers: uniqueCampers - multiYearCampers,
    avgRegistrationsPerYear:
      sortedYears.length > 0 ? Math.round(allRegistrations.length / sortedYears.length) : 0,
    yearComparison: buildYearComparison(yearReports, registrationsByYear),
    retention: buildRetentionBuckets(byPhone, uniqueCampers),
    demographics: buildDemographicsSlices(uniqueRegistrations, total),
    operations: buildOperationsSlices(uniqueRegistrations, total),
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
