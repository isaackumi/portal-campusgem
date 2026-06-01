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
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, index) => (
          <div key={step.label} className="rounded-lg border bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{step.label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{step.count.toLocaleString()}</p>
            <p className="text-sm text-slate-600">{step.percent}% of registered</p>
            {step.dropOffPercent != null && step.dropOffPercent > 0 ? (
              <p className="mt-1 text-xs text-rose-600">{step.dropOffPercent}% drop from previous step</p>
            ) : null}
            {index < steps.length - 1 ? (
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white">
                <div className="h-full rounded-full bg-slate-800" style={{ width: `${step.percent}%` }} />
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
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      <AnalyticsDemographicTrendChart rows={rows} height={280} />
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[480px] text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left text-muted-foreground">
              <th className="px-3 py-2 font-medium">{title}</th>
              {years.map((year) => (
                <th key={year} className="px-3 py-2 font-medium">
                  {year}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-t">
                <td className="px-3 py-2 font-medium text-slate-800">{row.label}</td>
                {row.values.map((value) => (
                  <td key={`${row.label}-${value.year}`} className="px-3 py-2 text-slate-600">
                    {value.percent}% <span className="text-xs text-muted-foreground">({value.count})</span>
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
