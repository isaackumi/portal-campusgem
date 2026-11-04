'use client'

import type {
  DemographicTrendRow,
  FunnelStep,
  NewVsReturningRow,
  TimelinePoint,
  YearComparisonRow,
} from '@/lib/camp/analytics'
import { chartColor } from '@/lib/charts/theme'
import {
  AnalyticsDemographicTrendChart,
  AnalyticsHorizontalBarChart,
  AnalyticsStackedBarChart,
  AnalyticsVelocityChart,
  AnalyticsVerticalBarChart,
} from '@/components/charts/analytics-charts'

/** Daily sign-ups (bars) plus cumulative registration curve. */
export function CampRegistrationVelocityChart({ points, height = 320 }: { points: TimelinePoint[]; height?: number }) {
  return (
    <AnalyticsVelocityChart
      points={points.map((p) => ({ label: p.label, count: p.count, cumulative: p.cumulative }))}
      height={height}
    />
  )
}

/** Registration totals by camp year. */
export function CampYearComparisonChart({ rows, height = 280 }: { rows: YearComparisonRow[]; height?: number }) {
  const sorted = [...rows].sort((a, b) => a.year - b.year)
  const data = sorted.map((item, index) => ({
    name: String(item.year),
    value: item.total,
    fill: chartColor(index),
    growth: item.growthPercent,
  }))

  return <AnalyticsVerticalBarChart data={data} height={height} valueLabel="Registrations" />
}

/** Stacked new vs returning registrants by camp year. */
export function CampNewVsReturningChart({ rows, height = 300 }: { rows: NewVsReturningRow[]; height?: number }) {
  const data = rows.map((item) => ({
    name: String(item.year),
    newCampers: item.newCampers,
    returningCampers: item.returningCampers,
    returnRate: item.returnRate,
  }))

  return <AnalyticsStackedBarChart data={data} height={height} />
}

export function CampFunnelSteps({ steps }: { steps: FunnelStep[] }) {
  if (steps.length === 0) return null

  const data = steps.map((step) => ({
    name: step.label,
    value: step.count,
    percent: step.percent,
  }))

  return (
    <div className="space-y-4">
      <AnalyticsHorizontalBarChart data={data} barColor="#6366f1" />
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        {steps.map((step, index) => (
          <div key={step.label} className="min-w-0 rounded-lg border border-neutral-200/80 bg-neutral-50 p-3 dark:border-white/[0.06] dark:bg-white/[0.04] sm:p-4">
            <p className="app-overline">{step.label}</p>
            <p className="app-stat-value mt-1 text-neutral-900 dark:text-neutral-100">{step.count.toLocaleString()}</p>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 sm:text-sm">{step.percent}% of registered</p>
            {step.dropOffPercent != null && step.dropOffPercent > 0 ? (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{step.dropOffPercent}% drop from previous step</p>
            ) : null}
            {index < steps.length - 1 ? (
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white dark:bg-white/10">
                <div className="h-full rounded-full bg-neutral-800 dark:bg-neutral-200" style={{ width: `${step.percent}%` }} />
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}

export function CampDemographicTrendTable({
  title,
  rows,
}: {
  title: string
  rows: DemographicTrendRow[]
}) {
  if (rows.length === 0) return null

  const years = rows[0]?.values.map((v) => v.year) ?? []

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{title}</h3>
      <AnalyticsDemographicTrendChart rows={rows} height={280} />
      <div className="overflow-x-auto rounded-lg border border-neutral-200/80 dark:border-white/[0.06]">
        <table className="w-full text-sm sm:min-w-[480px]">
          <thead className="bg-neutral-50 dark:bg-white/[0.04]">
            <tr className="text-left text-neutral-500 dark:text-neutral-400">
              <th className="sticky left-0 bg-neutral-50 px-3 py-2 font-medium dark:bg-neutral-800">{title}</th>
              {years.map((year) => (
                <th key={year} className="px-3 py-2 font-medium">
                  {year}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-t border-neutral-200/80 dark:border-white/[0.06]">
                <td className="sticky left-0 bg-white px-3 py-2 font-medium text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">{row.label}</td>
                {row.values.map((value) => (
                  <td key={`${row.label}-${value.year}`} className="whitespace-nowrap px-3 py-2 tabular-nums text-neutral-600 dark:text-neutral-400">
                    {value.percent}% <span className="text-xs text-neutral-500 dark:text-neutral-400">({value.count})</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
