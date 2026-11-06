import { cn } from '@/lib/utils'

export function BrandMark({
  size = 'md',
  className,
}: {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const box =
    size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-12 w-12' : 'h-9 w-9'
  const text = size === 'sm' ? 'text-[13px]' : size === 'lg' ? 'text-lg' : 'text-sm'

  return (
    <div
      className={cn(
        'flex shrink-0 select-none items-center justify-center rounded-lg bg-brand-700 font-display font-extrabold leading-none tracking-[-0.06em] text-white dark:bg-brand-600',
        text,
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
      <p className="app-overline truncate leading-4">Campus Gem</p>
      <p className="truncate text-[15px] font-semibold leading-5 tracking-tight text-neutral-900 dark:text-white">
        Ministries
      </p>
    </div>
  )
}
