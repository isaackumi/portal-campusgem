'use client'

import type { CampAnalyticsReport, CampYearAnalyticsReport } from '@/lib/camp/analytics'

function escapeCsv(value: string | number | null | undefined): string {
  const text = value == null ? '' : String(value)
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

function row(cells: Array<string | number | null | undefined>): string {
  return cells.map(escapeCsv).join(',')
}

function section(title: string, lines: string[]): string[] {
  return [title, ...lines, '']
}

function breakdownSection(title: string, slices: { label: string; count: number; percent: number }[]): string[] {
  if (slices.length === 0) return []
  return section(title, [row(['Label', 'Count', 'Percent']), ...slices.map((s) => row([s.label, s.count, `${s.percent}%`]))])
}

function yearReportSections(report: CampYearAnalyticsReport): string[] {
  const { overview } = report
  const lines: string[] = []

  lines.push(...section('Summary', [
    row(['Camp year', report.year]),
    row(['Theme', report.theme ?? '']),
    row(['Total registrations', report.total]),
    row(['Unique phones', report.uniquePhones]),
    row(['Checked in', overview.checkedIn]),
    row(['Check-in rate', `${overview.checkInRate}%`]),
    row(['New registrants', overview.newRegistrants]),
    row(['Returning', overview.returning]),
    row(['Paid count', overview.paid]),
    row(['Collection rate', `${overview.collectionRate}%`]),
    row(['Paid amount (GHS)', overview.paidAmount.toFixed(2)]),
    row(['Pending amount (GHS)', overview.pendingAmount.toFixed(2)]),
  ]))

  if (report.insights.length > 0) {
    lines.push(...section('Insights', report.insights.map((line, index) => row([index + 1, line]))))
  }

  lines.push(
    ...breakdownSection('Gender', report.demographics.gender),
    ...breakdownSection('Age bracket', report.demographics.ageBracket),
    ...breakdownSection('Education band', report.demographics.educationBand),
    ...breakdownSection('Residence', report.demographics.residence),
    ...breakdownSection('NHIS', report.operations.nhis),
    ...breakdownSection('Health', report.operations.health),
    ...breakdownSection('Follow-up', report.operations.followUp),
    ...breakdownSection('Payment status', report.operations.paymentStatus)
  )

  if (report.timeline.length > 0) {
    lines.push(
      ...section('Registration timeline', [
        row(['Date', 'Label', 'Daily count', 'Cumulative']),
        ...report.timeline.map((point) =>
          row([point.date, point.label, point.count, point.cumulative])
        ),
      ])
    )
  }

  if (report.dataQuality.length > 0) {
    lines.push(
      ...section('Data completeness', [
        row(['Field', 'Filled', 'Percent']),
        ...report.dataQuality.map((item) => row([item.field, item.filled, `${item.percent}%`])),
      ])
    )
  }

  return lines
}

function multiYearSections(report: Extract<CampAnalyticsReport, { scope: 'all' }>): string[] {
  const { combined, years, insights } = report
  const lines: string[] = []

  lines.push(
    ...section('Combined summary', [
      row(['Total registrations', combined.totalRegistrations]),
      row(['Unique campers', combined.uniqueCampers]),
      row(['Multi-year campers', combined.multiYearCampers]),
      row(['Single-year only', combined.singleYearCampers]),
      row(['Average registrations per year', combined.avgRegistrationsPerYear]),
    ])
  )

  if (insights.length > 0) {
    lines.push(...section('Cross-year insights', insights.map((line, index) => row([index + 1, line]))))
  }

  if (combined.yearComparison.length > 0) {
    lines.push(
      ...section('Year-over-year comparison', [
        row([
          'Year',
          'Theme',
          'Total',
          'Growth %',
          'New',
          'Returning',
          'Check-in rate',
          'Collection rate',
          'Peak day',
          'Peak day count',
        ]),
        ...combined.yearComparison.map((item) =>
          row([
            item.year,
            item.theme ?? '',
            item.total,
            item.growthPercent ?? '',
            item.newCampers,
            item.returningCampers,
            `${item.checkInRate}%`,
            `${item.collectionRate}%`,
            item.peakDay ?? '',
            item.peakDayCount,
          ])
        ),
      ])
    )
  }

  lines.push(...breakdownSection('Retention (unique campers)', combined.retention))
  lines.push(...breakdownSection('Combined age (unique campers)', combined.demographics.ageBracket))
  lines.push(...breakdownSection('Combined education (unique campers)', combined.demographics.educationBand))
  lines.push(...breakdownSection('Combined residence (unique campers)', combined.demographics.residence))

  for (const yearReport of years) {
    lines.push(`--- Camp ${yearReport.year} ---`)
    lines.push(...yearReportSections(yearReport))
  }

  return lines
}

export function buildCampAnalyticsCsv(report: CampAnalyticsReport): string {
  const header = row(['Campus Gem — Camp Analytics Export', new Date().toISOString()])
  const lines =
    report.scope === 'all'
      ? multiYearSections(report)
      : yearReportSections(report)

  return [header, '', ...lines].join('\n')
}

export function campAnalyticsExportFilename(report: CampAnalyticsReport): string {
  const stamp = new Date().toISOString().slice(0, 10)
  if (report.scope === 'all') {
    return `camp-analytics-all-years-${stamp}.csv`
  }
  return `camp-analytics-${report.year}-${stamp}.csv`
}

export function downloadCampAnalyticsCsv(report: CampAnalyticsReport): void {
  const content = buildCampAnalyticsCsv(report)
  const blob = new Blob(['\uFEFF', content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = campAnalyticsExportFilename(report)
  anchor.click()
  URL.revokeObjectURL(url)
}
