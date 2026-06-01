'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  Legend,
  Line,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartContainer } from '@/components/charts/chart-container'
import { AnalyticsChartTooltip } from '@/components/charts/chart-tooltip'
import { CHART_AXIS, CHART_GRID, CHART_PALETTE, chartColor, formatCompactNumber } from '@/lib/charts/theme'

type HorizontalBarProps = {
  data: Array<{ name: string; value: number; percent?: number; fill?: string }>
  height?: number
  barColor?: string
  emptyMessage?: string
}

/** Horizontal bar chart for funnel stages and breakdown lists. */
export function AnalyticsHorizontalBarChart({
  data,
  height,
  barColor = CHART_PALETTE[0],
  emptyMessage = 'No data',
}: HorizontalBarProps) {
  const computedHeight = height ?? Math.max(160, data.length * 44 + 48)
  const max = Math.max(...data.map((d) => d.value), 1)

  return (
    <ChartContainer empty={data.length === 0} emptyMessage={emptyMessage} height={computedHeight}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
        <CartesianGrid {...CHART_GRID} horizontal={false} />
        <XAxis type="number" domain={[0, max]} hide />
        <YAxis
          type="category"
          dataKey="name"
          width={120}
          tick={CHART_AXIS.tick}
          axisLine={CHART_AXIS.axisLine}
          tickLine={false}
        />
        <Tooltip
          content={
            <AnalyticsChartTooltip
              valueFormatter={(v, _n, entry) => {
                const pct = entry.payload?.percent
                return typeof pct === 'number' ? `${v} (${pct}%)` : String(v)
              }}
            />
          }
        />
        <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={28}>
          {data.map((row, i) => (
            <Cell key={row.name} fill={row.fill ?? barColor} />
          ))}
          <LabelList dataKey="value" position="right" className="fill-slate-700 text-[11px] font-medium" />
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}

type VerticalBarProps = {
  data: Array<{ name: string; value: number; fill?: string; growth?: number | null }>
  height?: number
  valueLabel?: string
  showGrowth?: boolean
  emptyMessage?: string
}

export function AnalyticsVerticalBarChart({
  data,
  height = 280,
  valueLabel = 'Total',
  showGrowth = false,
  emptyMessage = 'No data',
}: VerticalBarProps) {
  return (
    <ChartContainer empty={data.length === 0} emptyMessage={emptyMessage} height={height}>
      <BarChart data={data} margin={{ top: showGrowth ? 28 : 12, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid {...CHART_GRID} />
        <XAxis dataKey="name" tick={CHART_AXIS.tick} axisLine={CHART_AXIS.axisLine} tickLine={CHART_AXIS.tickLine} />
        <YAxis tick={CHART_AXIS.tick} axisLine={false} tickLine={false} tickFormatter={formatCompactNumber} width={40} />
        <Tooltip
          content={
            <AnalyticsChartTooltip
              valueFormatter={(v) => v.toLocaleString()}
              labelFormatter={(l) => l}
            />
          }
        />
        <Legend formatter={() => valueLabel} />
        <Bar dataKey="value" name={valueLabel} radius={[6, 6, 0, 0]} maxBarSize={56}>
          {data.map((row, i) => (
            <Cell key={row.name} fill={row.fill ?? chartColor(i)} />
          ))}
          <LabelList dataKey="value" position="top" className="fill-slate-800 text-[10px] font-semibold" />
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}

type StackedProps = {
  data: Array<{ name: string; newCampers: number; returningCampers: number; returnRate?: number }>
  height?: number
  emptyMessage?: string
}

export function AnalyticsStackedBarChart({ data, height = 300, emptyMessage = 'No data' }: StackedProps) {
  return (
    <ChartContainer empty={data.length === 0} emptyMessage={emptyMessage} height={height}>
      <BarChart data={data} margin={{ top: 12, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid {...CHART_GRID} />
        <XAxis dataKey="name" tick={CHART_AXIS.tick} axisLine={CHART_AXIS.axisLine} tickLine={CHART_AXIS.tickLine} />
        <YAxis tick={CHART_AXIS.tick} axisLine={false} tickLine={false} width={40} />
        <Tooltip content={<AnalyticsChartTooltip valueFormatter={(v) => v.toLocaleString()} />} />
        <Legend formatter={(v) => (v === 'newCampers' ? 'New' : 'Returning')} />
        <Bar dataKey="newCampers" stackId="campers" fill="#0ea5e9" radius={[0, 0, 0, 0]} maxBarSize={56} />
        <Bar dataKey="returningCampers" stackId="campers" fill="#8b5cf6" radius={[6, 6, 0, 0]} maxBarSize={56} />
      </BarChart>
    </ChartContainer>
  )
}

type TimelinePoint = { label: string; count: number; cumulative: number }

export function AnalyticsVelocityChart({ points, height = 320 }: { points: TimelinePoint[]; height?: number }) {
  const data = points.map((p) => ({
    name: p.label,
    daily: p.count,
    cumulative: p.cumulative,
  }))

  return (
    <div className="space-y-2">
      <ChartContainer empty={points.length === 0} emptyMessage="No registration data yet" height={height}>
        <ComposedChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 4 }}>
          <CartesianGrid {...CHART_GRID} />
          <XAxis dataKey="name" tick={CHART_AXIS.tick} axisLine={CHART_AXIS.axisLine} tickLine={CHART_AXIS.tickLine} />
          <YAxis
            yAxisId="left"
            tick={CHART_AXIS.tick}
            axisLine={false}
            tickLine={false}
            width={36}
            tickFormatter={formatCompactNumber}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={CHART_AXIS.tick}
            axisLine={false}
            tickLine={false}
            width={40}
            tickFormatter={formatCompactNumber}
          />
          <Tooltip content={<AnalyticsChartTooltip valueFormatter={(v) => v.toLocaleString()} />} />
          <Legend
            formatter={(v) => (v === 'daily' ? 'Daily sign-ups' : 'Cumulative')}
          />
          <Bar yAxisId="left" dataKey="daily" name="daily" fill="#60a5fa" radius={[4, 4, 0, 0]} maxBarSize={32} />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="cumulative"
            name="cumulative"
            stroke="#4f46e5"
            strokeWidth={2.5}
            dot={{ r: 3, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff' }}
          />
        </ComposedChart>
      </ChartContainer>
      <p className="text-xs text-muted-foreground">Daily bars with cumulative registration curve</p>
    </div>
  )
}

type CumulativeProps = {
  points: Array<{ label: string; count: number; cumulative: number }>
  height?: number
  emptyMessage?: string
}

export function AnalyticsCumulativeChart({
  points,
  height = 260,
  emptyMessage = 'No submissions yet',
}: CumulativeProps) {
  const data = points.map((p) => ({
    name: p.label,
    daily: p.count,
    cumulative: p.cumulative,
  }))

  return (
    <ChartContainer empty={points.length === 0} emptyMessage={emptyMessage} height={height}>
      <ComposedChart data={data} margin={{ top: 12, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid {...CHART_GRID} />
        <XAxis dataKey="name" tick={CHART_AXIS.tick} axisLine={CHART_AXIS.axisLine} tickLine={CHART_AXIS.tickLine} />
        <YAxis tick={CHART_AXIS.tick} axisLine={false} tickLine={false} width={40} />
        <Tooltip content={<AnalyticsChartTooltip valueFormatter={(v) => v.toLocaleString()} />} />
        <Legend formatter={(v) => (v === 'daily' ? 'Daily' : 'Cumulative total')} />
        <Bar dataKey="daily" name="daily" fill="#93c5fd" radius={[4, 4, 0, 0]} maxBarSize={28} />
        <Line
          type="monotone"
          dataKey="cumulative"
          name="cumulative"
          stroke="#2563eb"
          strokeWidth={2.5}
          dot={{ r: 3, fill: '#2563eb', stroke: '#fff', strokeWidth: 2 }}
        />
      </ComposedChart>
    </ChartContainer>
  )
}

type RevenueRow = { year: number; paid: number; pending: number }

export function AnalyticsRevenueChart({ rows, height = 280 }: { rows: RevenueRow[]; height?: number }) {
  const data = rows.map((r) => ({
    name: String(r.year),
    collected: r.paid,
    pending: r.pending,
  }))

  return (
    <ChartContainer empty={rows.length === 0} emptyMessage="No revenue data" height={height}>
      <BarChart data={data} margin={{ top: 12, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid {...CHART_GRID} />
        <XAxis dataKey="name" tick={CHART_AXIS.tick} axisLine={CHART_AXIS.axisLine} tickLine={CHART_AXIS.tickLine} />
        <YAxis tick={CHART_AXIS.tick} axisLine={false} tickLine={false} width={48} tickFormatter={(v) => `₵${formatCompactNumber(v)}`} />
        <Tooltip
          content={
            <AnalyticsChartTooltip valueFormatter={(v) => `₵${v.toLocaleString()}`} />
          }
        />
        <Legend formatter={(v) => (v === 'collected' ? 'Collected' : 'Pending')} />
        <Bar dataKey="collected" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
        <Bar dataKey="pending" fill="#fbbf24" radius={[4, 4, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ChartContainer>
  )
}

type TrendRow = {
  label: string
  values: Array<{ year: number; percent: number; count: number }>
}

/** Multi-series line chart for demographic % trends across camp years. */
export function AnalyticsDemographicTrendChart({ rows, height = 320 }: { rows: TrendRow[]; height?: number }) {
  if (rows.length === 0) {
    return <ChartContainer empty emptyMessage="No trend data" height={height} />
  }

  const years = rows[0]?.values.map((v) => v.year) ?? []
  const data = years.map((year) => {
    const point: Record<string, string | number> = { name: String(year) }
    for (const row of rows) {
      const match = row.values.find((v) => v.year === year)
      point[row.label] = match?.percent ?? 0
    }
    return point
  })

  const series = rows.slice(0, 8)

  return (
    <ChartContainer height={height}>
      <ComposedChart data={data} margin={{ top: 12, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid {...CHART_GRID} />
        <XAxis dataKey="name" tick={CHART_AXIS.tick} axisLine={CHART_AXIS.axisLine} tickLine={CHART_AXIS.tickLine} />
        <YAxis tick={CHART_AXIS.tick} axisLine={false} tickLine={false} width={36} domain={[0, 'auto']} unit="%" />
        <Tooltip
          content={
            <AnalyticsChartTooltip valueFormatter={(v) => `${v}%`} />
          }
        />
        <Legend formatter={(v) => <span className="text-xs">{v}</span>} />
        {series.map((row, i) => (
          <Line
            key={row.label}
            type="monotone"
            dataKey={row.label}
            stroke={chartColor(i)}
            strokeWidth={2}
            dot={{ r: 3, strokeWidth: 2, stroke: '#fff' }}
          />
        ))}
      </ComposedChart>
    </ChartContainer>
  )
}

type MetricSeriesInput = {
  key: string
  label: string
  values: Array<{ year: number; value: number }>
}

/** Multi-line chart from metric trend series (KPI rates, operations, etc.). */
export function AnalyticsMetricTrendChart({
  series,
  height = 300,
  yUnit = '%',
  maxSeries = 6,
}: {
  series: MetricSeriesInput[]
  height?: number
  yUnit?: string
  maxSeries?: number
}) {
  const active = series.filter((s) => s.values.some((v) => v.value > 0)).slice(0, maxSeries)
  if (active.length === 0) {
    return <ChartContainer empty emptyMessage="No trend data" height={height} />
  }

  const years = Array.from(new Set(active.flatMap((s) => s.values.map((v) => v.year)))).sort((a, b) => a - b)
  const data = years.map((year) => {
    const point: Record<string, string | number> = { name: String(year) }
    for (const row of active) {
      point[row.key] = row.values.find((v) => v.year === year)?.value ?? 0
    }
    return point
  })

  return (
    <ChartContainer height={height}>
      <ComposedChart data={data} margin={{ top: 12, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid {...CHART_GRID} />
        <XAxis dataKey="name" tick={CHART_AXIS.tick} axisLine={CHART_AXIS.axisLine} tickLine={CHART_AXIS.tickLine} />
        <YAxis tick={CHART_AXIS.tick} axisLine={false} tickLine={false} width={40} domain={[0, 100]} unit={yUnit} />
        <Tooltip content={<AnalyticsChartTooltip valueFormatter={(v) => `${v}${yUnit}`} />} />
        <Legend formatter={(v) => active.find((s) => s.key === v)?.label ?? v} />
        {active.map((row, i) => (
          <Line
            key={row.key}
            type="monotone"
            dataKey={row.key}
            name={row.key}
            stroke={chartColor(i)}
            strokeWidth={2.5}
            dot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
          />
        ))}
      </ComposedChart>
    </ChartContainer>
  )
}

type GrowthRow = { year: number; name: string; total: number; growthPercent: number | null }

/** Registration volume with year-on-year growth overlay. */
export function AnalyticsRegistrationGrowthChart({ rows, height = 300 }: { rows: GrowthRow[]; height?: number }) {
  const data = rows.map((row) => ({
    name: row.name,
    total: row.total,
    growth: row.growthPercent ?? 0,
    hasGrowth: row.growthPercent != null,
  }))

  return (
    <ChartContainer empty={rows.length === 0} emptyMessage="Need 2+ camp years for growth trends" height={height}>
      <ComposedChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 4 }}>
        <CartesianGrid {...CHART_GRID} />
        <XAxis dataKey="name" tick={CHART_AXIS.tick} axisLine={CHART_AXIS.axisLine} tickLine={CHART_AXIS.tickLine} />
        <YAxis
          yAxisId="left"
          tick={CHART_AXIS.tick}
          axisLine={false}
          tickLine={false}
          width={40}
          tickFormatter={formatCompactNumber}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          tick={CHART_AXIS.tick}
          axisLine={false}
          tickLine={false}
          width={44}
          unit="%"
        />
        <Tooltip
          content={
            <AnalyticsChartTooltip
              valueFormatter={(v, name) =>
                name === 'growth' || name === 'YoY growth' ? `${v}%` : v.toLocaleString()
              }
            />
          }
        />
        <Legend formatter={(v) => (v === 'total' ? 'Registrations' : 'YoY growth')} />
        <Bar yAxisId="left" dataKey="total" name="total" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={48} />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="growth"
          name="growth"
          stroke="#f59e0b"
          strokeWidth={2.5}
          dot={{ r: 4, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }}
          connectNulls
        />
      </ComposedChart>
    </ChartContainer>
  )
}

type FunnelRateRow = { year: number; name: string; checkInRate: number; collectionRate: number; followUpRate: number }

export function AnalyticsFunnelRateTrendChart({ rows, height = 280 }: { rows: FunnelRateRow[]; height?: number }) {
  return (
    <AnalyticsMetricTrendChart
      height={height}
      series={[
        {
          key: 'checkInRate',
          label: 'Check-in',
          values: rows.map((r) => ({ year: r.year, value: r.checkInRate })),
        },
        {
          key: 'collectionRate',
          label: 'Fee collection',
          values: rows.map((r) => ({ year: r.year, value: r.collectionRate })),
        },
        {
          key: 'followUpRate',
          label: 'Follow-up done',
          values: rows.map((r) => ({ year: r.year, value: r.followUpRate })),
        },
      ]}
    />
  )
}

type CompletionRow = { name: string; rate: number; answered: number; total: number }

export function AnalyticsCompletionChart({ rows, height }: { rows: CompletionRow[]; height?: number }) {
  const computedHeight = height ?? Math.max(200, rows.length * 36 + 56)
  const data = rows.map((r) => ({
    name: r.name.length > 28 ? `${r.name.slice(0, 26)}…` : r.name,
    fullName: r.name,
    rate: r.rate,
    answered: r.answered,
    total: r.total,
  }))

  return (
    <ChartContainer empty={rows.length === 0} emptyMessage="No questions" height={computedHeight}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 32, left: 8, bottom: 8 }}>
        <CartesianGrid {...CHART_GRID} horizontal={false} />
        <XAxis type="number" domain={[0, 100]} unit="%" tick={CHART_AXIS.tick} axisLine={CHART_AXIS.axisLine} />
        <YAxis type="category" dataKey="name" width={130} tick={CHART_AXIS.tick} axisLine={false} tickLine={false} />
        <Tooltip
          content={
            <AnalyticsChartTooltip
              valueFormatter={(v, _n, entry) => {
                const p = entry.payload as { answered?: number; total?: number; fullName?: string } | undefined
                return `${v}% (${p?.answered ?? 0}/${p?.total ?? 0})`
              }}
            />
          }
        />
        <Bar dataKey="rate" name="Completion" fill="#10b981" radius={[0, 6, 6, 0]} maxBarSize={22}>
          <LabelList dataKey="rate" position="right" formatter={(v) => `${v}%`} className="fill-slate-700 text-[10px]" />
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}
