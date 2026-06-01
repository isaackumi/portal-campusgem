/** Shared palette aligned with form analytics colors. */
export const CHART_PALETTE = [
  '#3b82f6',
  '#8b5cf6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#06b6d4',
  '#ec4899',
  '#64748b',
  '#14b8a6',
  '#f97316',
] as const

export function chartColor(index: number): string {
  return CHART_PALETTE[index % CHART_PALETTE.length]
}

export function formatCompactNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 10_000) return `${(value / 1_000).toFixed(1)}k`
  return value.toLocaleString()
}

export function formatPercent(value: number, digits = 0): string {
  return `${value.toFixed(digits)}%`
}

export type SliceDatum = {
  label: string
  count: number
  percent?: number
  color?: string
}

export function slicesToChartData(slices: SliceDatum[]) {
  return slices.map((slice, index) => ({
    name: slice.label,
    value: slice.count,
    percent: slice.percent,
    fill: slice.color ?? chartColor(index),
  }))
}

export const CHART_AXIS = {
  tick: { fill: '#64748b', fontSize: 11 },
  axisLine: { stroke: '#e2e8f0' },
  tickLine: { stroke: '#e2e8f0' },
} as const

export const CHART_GRID = {
  stroke: '#e2e8f0',
  strokeDasharray: '4 4',
  vertical: false,
} as const
