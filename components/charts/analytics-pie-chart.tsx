'use client'

import { Cell, Legend, Pie, PieChart, Tooltip } from 'recharts'
import { ChartContainer } from '@/components/charts/chart-container'
import { AnalyticsChartTooltip } from '@/components/charts/chart-tooltip'
import { chartColor, slicesToChartData, type SliceDatum } from '@/lib/charts/theme'

type Props = {
  slices: SliceDatum[]
  height?: number
  innerRadius?: number | string
  showLegend?: boolean
  emptyMessage?: string
}

export function AnalyticsPieChart({
  slices,
  height = 260,
  innerRadius = '52%',
  showLegend = true,
  emptyMessage = 'No data',
}: Props) {
  const data = slicesToChartData(slices)
  const total = data.reduce((sum, row) => sum + row.value, 0)

  return (
    <ChartContainer empty={total === 0} emptyMessage={emptyMessage} height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius="80%"
          paddingAngle={2}
          stroke="#fff"
          strokeWidth={2}
        >
          {data.map((entry, index) => (
            <Cell key={entry.name} fill={entry.fill ?? chartColor(index)} />
          ))}
        </Pie>
        <Tooltip
          content={
            <AnalyticsChartTooltip
              valueFormatter={(v, name, entry) => {
                const pct = entry.payload?.percent
                return typeof pct === 'number' ? `${v} (${pct}%)` : String(v)
              }}
            />
          }
        />
        {showLegend ? (
          <Legend
            verticalAlign="bottom"
            height={48}
            formatter={(value) => <span className="text-xs text-slate-600">{value}</span>}
          />
        ) : null}
      </PieChart>
    </ChartContainer>
  )
}
