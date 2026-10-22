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
    <div className={cn('dashboard-panel flex flex-col gap-3 p-5', className)}>
      <p className="app-stat-label">{label}</p>
      <p className="app-stat-value">{value}</p>
      {sub ? (
        <p className={cn('flex items-center gap-1.5 text-[13px]', toneSub[tone])}>
          {tone !== 'default' && <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', toneDot[tone])} aria-hidden />}
          <span className="truncate">{sub}</span>
        </p>
      ) : null}
    </div>
  )
}
