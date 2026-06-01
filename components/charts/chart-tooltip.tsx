'use client'

type ChartTooltipEntry = {
  name?: string
  value?: number | string
  color?: string
  dataKey?: string | number
  payload?: Record<string, unknown>
}

type AnalyticsChartTooltipProps = {
  active?: boolean
  payload?: ChartTooltipEntry[]
  label?: string | number
  valueFormatter?: (value: number, name: string, entry: ChartTooltipEntry) => string
  labelFormatter?: (label: string) => string
}

export function AnalyticsChartTooltip({
  active,
  payload,
  label,
  valueFormatter = (v) => String(v),
  labelFormatter,
}: AnalyticsChartTooltipProps) {
  if (!active || !payload?.length) return null

  const displayLabel = labelFormatter && label != null ? labelFormatter(String(label)) : label

  return (
    <div className="rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-lg backdrop-blur-sm">
      {displayLabel ? <p className="mb-1.5 font-semibold text-slate-800">{displayLabel}</p> : null}
      <ul className="space-y-1">
        {payload.map((entry) => {
          const name = String(entry.name ?? entry.dataKey ?? '')
          const raw = typeof entry.value === 'number' ? entry.value : Number(entry.value ?? 0)
          const percent = entry.payload?.percent
          return (
            <li key={name} className="flex items-center gap-2">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: entry.color ?? '#3b82f6' }}
              />
              <span className="text-slate-600">{name}</span>
              <span className="ml-auto font-medium tabular-nums text-slate-900">
                {valueFormatter(raw, name, entry)}
                {typeof percent === 'number' ? ` (${percent}%)` : null}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
