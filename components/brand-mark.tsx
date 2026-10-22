import { cn } from '@/lib/utils'

export function BrandMark({
  size = 'md',
  className,
}: {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const box =
    size === 'sm' ? 'h-8 w-8 text-[11px]' : size === 'lg' ? 'h-12 w-12 text-sm' : 'h-9 w-9 text-xs'

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 font-semibold tracking-[0.08em] text-white shadow-sm',
        box,
        className
      )}
      aria-hidden
    >
      CG
    </div>
  )
}

export function BrandTitle({
  compact = false,
  light = false,
  className,
}: {
  compact?: boolean
  light?: boolean
  className?: string
}) {
  if (compact) {
    return (
      <span
        className={cn(
          'text-sm font-bold tracking-tight',
          light ? 'text-neutral-900 dark:text-white' : 'text-neutral-900 dark:text-white',
          className
        )}
      >
        CGMS
      </span>
    )
  }

  return (
    <div className={cn('min-w-0', className)}>
      <p className="truncate text-[11px] font-medium uppercase tracking-wider text-neutral-400">
        Campus Gem
      </p>
      <p
        className={cn(
          'truncate text-base font-bold tracking-tight text-neutral-900 dark:text-white',
          className
        )}
      >
        Ministries
      </p>
    </div>
  )
}
