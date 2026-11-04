/**
 * Categorical palette in fixed order (validated for colour-vision deficiency and
 * contrast on white and slate-800). Status colours are not reused here.
 */
export const CHART_PALETTE = [
  '#6366f1',
  '#0d9488',
  '#ea580c',
  '#db2777',
  '#0284c7',
  '#65a30d',
  '#a855f7',
  '#b45309',
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
  tick: { fill: '#737373', fontSize: 11 },
  axisLine: { stroke: '#e5e5e5' },
  tickLine: { stroke: '#e5e5e5' },
} as const

export const CHART_GRID = {
  stroke: '#e5e5e5',
  strokeDasharray: '4 4',
  vertical: false,
} as const
