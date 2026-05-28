'use client'

import type { CumulativePoint } from '@/lib/forms/analytics'

type Props = {
  points: CumulativePoint[]
  height?: number
}

export function CumulativeChart({ points, height = 200 }: Props) {
  if (points.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-dashed bg-slate-50 text-sm text-muted-foreground"
        style={{ height }}
      >
        No submissions yet
      </div>
    )
  }

  const maxCumulative = Math.max(...points.map((p) => p.cumulative), 1)
  const width = Math.max(points.length * 48, 320)
  const padding = { top: 16, right: 16, bottom: 36, left: 40 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  const coords = points.map((point, index) => {
    const x = padding.left + (index / Math.max(points.length - 1, 1)) * chartW
    const y = padding.top + chartH - (point.cumulative / maxCumulative) * chartH
    return { ...point, x, y }
  })

  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ')
  const areaPath = `${linePath} L ${coords[coords.length - 1]?.x ?? 0} ${padding.top + chartH} L ${coords[0]?.x ?? 0} ${padding.top + chartH} Z`

  return (
    <div className="overflow-x-auto">
      <svg width={width} height={height} className="min-w-full">
        {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
          const y = padding.top + chartH - tick * chartH
          const value = Math.round(tick * maxCumulative)
          return (
            <g key={tick}>
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#e2e8f0" strokeWidth="1" />
              <text x={padding.left - 6} y={y + 4} textAnchor="end" className="fill-slate-400 text-[10px]">
                {value}
              </text>
            </g>
          )
        })}
        <path d={areaPath} fill="url(#cumGradient)" opacity={0.35} />
        <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinejoin="round" />
        {coords.map((point) => (
          <g key={point.date}>
            <circle cx={point.x} cy={point.y} r="4" fill="#3b82f6" stroke="#fff" strokeWidth="2" />
            <text x={point.x} y={height - 8} textAnchor="middle" className="fill-slate-500 text-[10px]">
              {point.label}
            </text>
          </g>
        ))}
        <defs>
          <linearGradient id="cumGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  )
}
