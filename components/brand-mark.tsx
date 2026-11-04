import { Gem } from 'lucide-react'
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
  const icon = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-[18px] w-[18px]'

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 via-brand-600 to-violet-700 text-white shadow-[0_4px_12px_-2px_rgb(79_70_229/0.45),inset_0_1px_0_rgb(255_255_255/0.2)]',
        box,
        className
      )}
      aria-hidden
    >
      <Gem className={icon} strokeWidth={2.25} />
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
