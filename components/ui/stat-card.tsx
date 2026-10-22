import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type StatTone = 'default' | 'success' | 'warning' | 'danger'

const toneSub: Record<StatTone, string> = {
  default: 'text-neutral-500 dark:text-neutral-400',
  success: 'text-emerald-700 dark:text-emerald-400',
  warning: 'text-amber-700 dark:text-amber-400',
  danger: 'text-red-700 dark:text-red-400',
}

const toneDot: Record<StatTone, string> = {
  default: '',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
}

export function StatCard({
  label,
  value,
  sub,
  tone = 'default',
  className,
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  tone?: StatTone
  className?: string
}) {
  return (
    <div className={cn('dashboard-panel px-4 py-3.5 sm:px-5 sm:py-4', className)}>
      <p className="text-sm text-neutral-500 underline decoration-neutral-300 decoration-dotted underline-offset-4 dark:text-neutral-400 dark:decoration-neutral-600">
        {label}
      </p>
      <p className="mt-1.5 text-[26px] font-semibold leading-tight tracking-tight tabular-nums text-neutral-900 dark:text-neutral-50 sm:text-[28px]">
        {value}
      </p>
      {sub ? (
        <p className={cn('mt-1 flex items-center gap-1.5 text-xs', toneSub[tone])}>
          {tone !== 'default' && <span className={cn('h-1.5 w-1.5 rounded-full', toneDot[tone])} aria-hidden />}
          {sub}
        </p>
      ) : null}
    </div>
  )
}
