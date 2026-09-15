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
        'flex shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white font-semibold tracking-[0.08em] text-slate-900',
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
          'text-sm font-semibold tracking-tight',
          light ? 'text-slate-900' : 'text-slate-900',
          className
        )}
      >
        CGMS
      </span>
    )
  }

  return (
    <div className={cn('min-w-0', className)}>
      <p
        className={cn(
          'truncate text-sm font-semibold tracking-tight text-slate-900',
          className
        )}
        style={{ fontFamily: '"Source Serif 4", Georgia, serif' }}
      >
        Campus Gem
      </p>
      <p className="truncate text-xs text-slate-500">Church management</p>
    </div>
  )
}
