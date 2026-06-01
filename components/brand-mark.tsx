import { Church } from 'lucide-react'
import { cn } from '@/lib/utils'

export function BrandMark({
  size = 'md',
  className,
}: {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const box =
    size === 'sm' ? 'h-9 w-9 rounded-lg' : size === 'lg' ? 'h-14 w-14 rounded-2xl' : 'h-10 w-10 rounded-xl'
  const icon = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-7 w-7' : 'h-5 w-5'

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center bg-gradient-to-br from-amber-400 to-amber-500 shadow-sm',
        box,
        className
      )}
    >
      <Church className={cn(icon, 'text-slate-950')} />
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
          light ? 'text-slate-900' : 'text-white',
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
          'truncate text-sm font-semibold tracking-tight',
          light ? 'text-slate-900' : 'text-white'
        )}
      >
        Campus Gem Ministries
      </p>
      <p className={cn('truncate text-xs', light ? 'text-slate-500' : 'text-slate-400')}>
        Church management
      </p>
    </div>
  )
}
