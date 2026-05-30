'use client'

import type { TimelinePoint, YearComparisonRow } from '@/lib/camp/analytics'
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
