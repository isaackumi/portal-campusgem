'use client'

import { useTheme } from 'next-themes'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

type Point = { day: string; label: string; count: number }

function TrendTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: Point }> }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
      <p className="font-medium text-neutral-900 dark:text-neutral-100">{p.label}</p>
      <p className="mt-0.5 tabular-nums text-neutral-600 dark:text-neutral-300">
        {p.count} registration{p.count === 1 ? '' : 's'}
      </p>
    </div>
  )
}

/** Daily registrations, one brand-coloured series. Axes and grid stay recessive. */
export function RegistrationTrendChart({ data }: { data: Point[] }) {
  const { resolvedTheme } = useTheme()
  // indigo-600 on light, indigo-500 on dark: each validated against its own surface.
  const barColor = resolvedTheme === 'dark' ? '#6366f1' : '#4f46e5'
  const total = data.reduce((s, p) => s + p.count, 0)
  const peak = data.reduce((best, p) => (p.count > best.count ? p : best), data[0] ?? { label: '', count: 0, day: '' })
  return (
    <figure className="m-0">
      <div className="h-48 text-neutral-500 dark:text-neutral-400" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barCategoryGap={2}>
            <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.12} />
            <XAxis
              dataKey="label"
              tick={{ fill: 'currentColor', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              minTickGap={24}
            />
            <YAxis allowDecimals={false} tick={{ fill: 'currentColor', fontSize: 11 }} tickLine={false} axisLine={false} width={32} />
            <Tooltip content={<TrendTooltip />} cursor={{ fill: 'currentColor', fillOpacity: 0.06 }} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} fill={barColor} maxBarSize={22} animationDuration={500} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="sr-only">
        {total} registrations in the last {data.length} days
        {peak && peak.count > 0 ? `, busiest day ${peak.label} with ${peak.count}` : ''}.
      </figcaption>
    </figure>
  )
}
