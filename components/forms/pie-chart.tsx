'use client'

import type { AnalyticsSlice } from '@/lib/forms/analytics'

type Props = {
  slices: AnalyticsSlice[]
  size?: number
  emptyLabel?: string
}

export function PieChart({ slices, size = 160, emptyLabel = 'No data' }: Props) {
  const total = slices.reduce((sum, slice) => sum + slice.count, 0)
  if (total === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-full bg-slate-100 text-xs text-muted-foreground"
        style={{ width: size, height: size }}
      >
        {emptyLabel}
      </div>
    )
  }

  const radius = size / 2
  const center = radius
  let angle = -90

  const arcs = slices.map((slice) => {
    const sweep = (slice.count / total) * 360
    const start = angle
    const end = angle + sweep
    angle = end

    const startRad = (Math.PI / 180) * start
    const endRad = (Math.PI / 180) * end
    const x1 = center + radius * Math.cos(startRad)
    const y1 = center + radius * Math.sin(startRad)
    const x2 = center + radius * Math.cos(endRad)
    const y2 = center + radius * Math.sin(endRad)
    const largeArc = sweep > 180 ? 1 : 0

    const path =
      sweep >= 359.9
        ? `M ${center} ${center - radius} A ${radius} ${radius} 0 1 1 ${center - 0.01} ${center - radius} Z`
        : `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`

    return { ...slice, path }
  })

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        {arcs.map((arc) => (
          <path key={arc.label} d={arc.path} fill={arc.color} stroke="#fff" strokeWidth="1.5" />
        ))}
        <circle cx={center} cy={center} r={radius * 0.45} fill="white" />
        <text
          x={center}
          y={center}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-slate-700 text-[11px] font-semibold"
        >
          {total}
        </text>
      </svg>
      <ul className="min-w-0 flex-1 space-y-1.5 text-sm">
        {slices.map((slice) => (
          <li key={slice.label} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: slice.color }} />
            <span className="min-w-0 flex-1 truncate">{slice.label}</span>
            <span className="shrink-0 text-muted-foreground">
              {slice.count} ({slice.percent}%)
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
