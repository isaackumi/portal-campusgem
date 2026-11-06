import type { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type StatTone = 'default' | 'success' | 'warning' | 'danger'

const toneSub: Record<StatTone, string> = {
  default: 'text-neutral-500 dark:text-neutral-400',
  success: 'text-emerald-700 dark:text-emerald-300',
  warning: 'text-amber-700 dark:text-amber-300',
  danger: 'text-red-700 dark:text-red-300',
}

const toneDot: Record<StatTone, string> = {
  default: '',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
}

/**
 * Headline number, deliberately plain: no icon chip (the `icon` prop is accepted for
 * older callers and ignored). Optional trend (percentage change, shown with an
 * arrow and sign so it never relies on colour) and link.
 */
export function StatCard({
  label,
  value,
  sub,
  tone = 'default',
  icon: _icon,
  trend,
  href,
  children,
  className,
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  tone?: StatTone
  icon?: LucideIcon
  /** Change vs the previous period, in percent. */
  trend?: number | null
  href?: string
  children?: ReactNode
  className?: string
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="app-stat-label">{label}</p>
      </div>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <p className="app-stat-value max-sm:text-[24px]">{value}</p>
        {trend != null && Number.isFinite(trend) ? (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums',
              trend >= 0
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300'
                : 'bg-red-50 text-red-700 dark:bg-red-400/10 dark:text-red-300'
            )}
          >
            {trend >= 0 ? <ArrowUpRight className="h-3 w-3" aria-hidden /> : <ArrowDownRight className="h-3 w-3" aria-hidden />}
            {trend >= 0 ? '+' : ''}
            {Math.round(trend)}%
          </span>
        ) : null}
      </div>
      {children}
      {sub ? (
        <p className={cn('flex items-center gap-1.5 text-[13px]', toneSub[tone])}>
          {tone !== 'default' && <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', toneDot[tone])} aria-hidden />}
          <span className="truncate">{sub}</span>
        </p>
      ) : null}
    </>
  )

  const cls = cn('dashboard-panel flex min-w-0 flex-col gap-2.5 p-4 sm:gap-3 sm:p-5', className)
  return href ? (
    <Link
      href={href}
      className={cn(
        cls,
        'transition-[box-shadow,border-color] hover:border-neutral-300 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 dark:hover:border-white/[0.12]'
      )}
    >
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  )
}
