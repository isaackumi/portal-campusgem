'use client'

import type {
  DemographicTrendRow,
  FunnelStep,
  NewVsReturningRow,
  TimelinePoint,
  YearComparisonRow,
} from '@/lib/camp/analytics'
import { CumulativeChart } from '@/components/forms/cumulative-chart'

type VelocityProps = {
  points: TimelinePoint[]
  height?: number
}

/** Daily sign-ups (bars) plus cumulative registration curve. */
export function CampRegistrationVelocityChart({ points, height = 220 }: VelocityProps) {
  if (points.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-dashed bg-slate-50 text-sm text-muted-foreground"
        style={{ height }}
      >
        No registration data yet
      </div>
    )
  }

  const maxDaily = Math.max(...points.map((p) => p.count), 1)
  const barWidth = Math.max(Math.min(480 / points.length, 40), 12)
  const chartWidth = Math.max(points.length * (barWidth + 8) + 48, 320)
  const barHeight = 80

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto">
        <svg width={chartWidth} height={barHeight + 32} className="min-w-full">
          {points.map((point, index) => {
            const h = (point.count / maxDaily) * barHeight
            const x = 24 + index * (barWidth + 8)
            const y = barHeight - h + 8
            return (
              <g key={point.date}>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={h}
                  rx={4}
                  className="fill-blue-400/80"
                />
                {point.count > 0 ? (
                  <text
                    x={x + barWidth / 2}
                    y={y - 4}
                    textAnchor="middle"
                    className="fill-slate-600 text-[10px] font-medium"
                  >
                    {point.count}
                  </text>
                ) : null}
                <text
                  x={x + barWidth / 2}
                  y={barHeight + 24}
                  textAnchor="middle"
                  className="fill-slate-500 text-[10px]"
                >
                  {point.label}
                </text>
              </g>
            )
          })}
        </svg>
        <p className="mt-1 text-xs text-muted-foreground">Daily sign-ups</p>
      </div>

      <div>
        <CumulativeChart
          points={points.map((p) => ({
            date: p.date,
            label: p.label,
            count: p.count,
            cumulative: p.cumulative,
          }))}
          height={height}
        />
        <p className="mt-1 text-xs text-muted-foreground">Cumulative registrations over time</p>
      </div>
    </div>
  )
}

type ComparisonProps = {
  rows: YearComparisonRow[]
  height?: number
}

/** Registration totals by camp year with growth labels. */
export function CampYearComparisonChart({ rows, height = 240 }: ComparisonProps) {
  const sorted = [...rows].sort((a, b) => a.year - b.year)
  if (sorted.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-dashed bg-slate-50 text-sm text-muted-foreground"
        style={{ height }}
      >
        No year comparison data
      </div>
    )
  }

  const maxTotal = Math.max(...sorted.map((r) => r.total), 1)
  const barWidth = Math.max(Math.min(520 / sorted.length, 72), 36)
  const chartWidth = Math.max(sorted.length * (barWidth + 16) + 48, 320)
  const chartHeight = height - 48

  return (
    <div className="overflow-x-auto">
      <svg width={chartWidth} height={height} className="min-w-full">
        {sorted.map((item, index) => {
          const barH = (item.total / maxTotal) * chartHeight
          const x = 32 + index * (barWidth + 16)
          const y = chartHeight - barH + 12
          const growth =
            item.growthPercent == null
              ? null
              : `${item.growthPercent >= 0 ? '+' : ''}${item.growthPercent}%`

          return (
            <g key={item.yearId}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barH}
                rx={6}
                className="fill-indigo-500/85"
              />
              <text
                x={x + barWidth / 2}
                y={y - 8}
                textAnchor="middle"
                className="fill-slate-800 text-[11px] font-semibold"
              >
                {item.total.toLocaleString()}
              </text>
              {growth ? (
                <text
                  x={x + barWidth / 2}
                  y={y - 22}
                  textAnchor="middle"
                  className={`text-[10px] font-medium ${item.growthPercent != null && item.growthPercent >= 0 ? 'fill-emerald-600' : 'fill-rose-600'}`}
                >
                  {growth}
                </text>
              ) : null}
              <text
                x={x + barWidth / 2}
                y={height - 8}
                textAnchor="middle"
                className="fill-slate-600 text-[11px] font-medium"
              >
                {item.year}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

/** Stacked new vs returning registrants by camp year. */
export function CampNewVsReturningChart({ rows, height = 260 }: { rows: NewVsReturningRow[]; height?: number }) {
  if (rows.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-dashed bg-slate-50 text-sm text-muted-foreground"
        style={{ height }}
      >
        No new vs returning data
      </div>
    )
  }

  const maxTotal = Math.max(...rows.map((r) => r.newCampers + r.returningCampers), 1)
  const barWidth = Math.max(Math.min(520 / rows.length, 72), 36)
  const chartWidth = Math.max(rows.length * (barWidth + 16) + 48, 320)
  const chartHeight = height - 56

  return (
    <div className="overflow-x-auto">
      <svg width={chartWidth} height={height} className="min-w-full">
        {rows.map((item, index) => {
          const total = item.newCampers + item.returningCampers
          const newH = (item.newCampers / maxTotal) * chartHeight
          const returnH = (item.returningCampers / maxTotal) * chartHeight
          const x = 32 + index * (barWidth + 16)
          const baseY = chartHeight + 12

          return (
            <g key={item.yearId}>
              <rect x={x} y={baseY - returnH} width={barWidth} height={returnH} rx={4} className="fill-violet-500/85" />
              <rect
                x={x}
                y={baseY - returnH - newH}
                width={barWidth}
                height={newH}
                rx={4}
                className="fill-sky-500/85"
              />
              <text x={x + barWidth / 2} y={baseY - returnH - newH - 6} textAnchor="middle" className="fill-slate-800 text-[10px] font-semibold">
                {total}
              </text>
              <text x={x + barWidth / 2} y={height - 8} textAnchor="middle" className="fill-slate-600 text-[11px] font-medium">
                {item.year}
              </text>
              <text x={x + barWidth / 2} y={height - 22} textAnchor="middle" className="fill-violet-700 text-[9px]">
                {item.returnRate}% return
              </text>
            </g>
          )
        })}
      </svg>
      <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-sky-500" /> New</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-violet-500" /> Returning</span>
      </div>
    </div>
  )
}

export function CampFunnelSteps({ steps }: { steps: FunnelStep[] }) {
  if (steps.length === 0) return null

  return (
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
              <div className="h-full rounded-full bg-indigo-500" style={{ width: `${step.percent}%` }} />
            </div>
          ) : null}
        </div>
      ))}
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
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[480px] text-sm">
        <thead className="bg-slate-50">
          <tr className="text-left text-muted-foreground">
            <th className="px-3 py-2 font-medium">{title}</th>
            {years.map((year) => (
              <th key={year} className="px-3 py-2 font-medium">{year}</th>
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
  )
}
