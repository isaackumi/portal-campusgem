import { cn } from '@/lib/utils'

type MeterTone = 'brand' | 'success' | 'warning' | 'danger' | 'neutral'

const fill: Record<MeterTone, string> = {
  brand: 'bg-brand-600 dark:bg-brand-500',
  success: 'bg-emerald-500 dark:bg-emerald-400',
  warning: 'bg-amber-500 dark:bg-amber-400',
  danger: 'bg-red-500 dark:bg-red-400',
  neutral: 'bg-neutral-400 dark:bg-neutral-500',
}

/** A single progress bar: value out of max. Text stays outside, in ink colours. */
export function Meter({
  value,
  max,
  tone = 'brand',
  className,
  label,
}: {
  value: number
  max: number
  tone?: MeterTone
  className?: string
  /** Accessible name, e.g. "Beds filled". */
  label: string
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className={cn('h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-700/60', className)}
    >
      <div
        className={cn('h-full rounded-full transition-[width] duration-500 ease-out', fill[tone])}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export type Segment = {
  key: string
  label: string
  value: number
  /** Tailwind background class for the segment and its legend swatch. */
  className: string
}

/**
 * Parts of a whole in one bar, with a legend that always shows label + count,
 * so meaning never depends on colour alone. Segments have a 2px surface gap.
 */
export function SegmentedBar({
  segments,
  className,
  label,
  onSelect,
  selectedKey,
}: {
  segments: Segment[]
  className?: string
  label: string
  onSelect?: (key: string) => void
  selectedKey?: string | null
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0)
  return (
    <div className={className}>
      <div
        role="img"
        aria-label={`${label}: ${segments.map((s) => `${s.label} ${s.value}`).join(', ')}`}
        className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-700/60"
      >
        {total > 0
          ? segments
              .filter((s) => s.value > 0)
              .map((s) => (
                <div
                  key={s.key}
                  title={`${s.label}: ${s.value} (${Math.round((s.value / total) * 100)}%)`}
                  className={cn(
                    'h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full',
                    s.className,
                    selectedKey && selectedKey !== s.key && 'opacity-30'
                  )}
                  style={{ width: `${(s.value / total) * 100}%` }}
                />
              ))
          : null}
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-x-5 gap-y-1.5">
        {segments.map((s) => {
          const content = (
            <>
              <span className={cn('h-2 w-2 shrink-0 rounded-[3px]', s.className)} aria-hidden />
              <span className="truncate text-neutral-600 dark:text-neutral-300">{s.label}</span>
              <span className="ml-auto font-medium tabular-nums text-neutral-900 dark:text-neutral-100">{s.value}</span>
            </>
          )
          return (
            <li key={s.key}>
              {onSelect ? (
                <button
                  type="button"
                  onClick={() => onSelect(s.key)}
                  aria-pressed={selectedKey === s.key}
                  className={cn(
                    '-mx-1.5 flex w-[calc(100%+0.75rem)] items-center gap-2 rounded-md px-1.5 py-0.5 text-[13px] transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700/60',
                    selectedKey === s.key && 'bg-neutral-100 dark:bg-neutral-700/60'
                  )}
                >
                  {content}
                </button>
              ) : (
                <span className="flex items-center gap-2 text-[13px]">{content}</span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
