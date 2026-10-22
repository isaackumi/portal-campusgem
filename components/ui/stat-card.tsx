import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type StatTone = 'default' | 'success' | 'warning' | 'danger'

const toneValue: Record<StatTone, string> = {
  default: 'text-neutral-900 dark:text-neutral-100',
  success: 'text-emerald-700 dark:text-emerald-300',
  warning: 'text-amber-700 dark:text-amber-300',
  danger: 'text-red-700 dark:text-red-300',
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
    <div className={cn('dashboard-panel p-4 sm:p-5', className)}>
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{label}</p>
      <p className={cn('mt-2 text-2xl font-bold tabular-nums', toneValue[tone])}>{value}</p>
      {sub ? <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{sub}</p> : null}
    </div>
  )
}
