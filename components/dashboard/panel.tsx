import Link from 'next/link'
import type { ReactNode } from 'react'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { PersonAvatar } from '@/components/ui/person'
import { cn } from '@/lib/utils'

/** Card shell for every dashboard panel: same header, padding and type. */
export function DashboardPanel({
  title,
  meta,
  action,
  flush = false,
  className,
  children,
}: {
  title: string
  /** Short context on the right of the title, e.g. "Pending by assignee". */
  meta?: ReactNode
  /** Replaces `meta` with a control, e.g. a Refresh button. */
  action?: ReactNode
  /** Drop body padding for edge-to-edge content (tables). */
  flush?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <section className={cn('dashboard-panel flex flex-col', className)}>
      <header className="flex min-h-[52px] items-center justify-between gap-3 border-b border-neutral-100 px-5 py-3 dark:border-neutral-800">
        <h2 className="app-section-title truncate">{title}</h2>
        {action ?? (meta ? <span className="shrink-0 text-[13px] text-neutral-500 dark:text-neutral-400">{meta}</span> : null)}
      </header>
      <div className={cn('flex-1', flush ? 'p-2 sm:p-3' : 'px-5 py-2')}>{children}</div>
    </section>
  )
}

export type PanelRow = {
  key: string
  label: ReactNode
  /** Secondary line under the label (phone, date…). */
  detail?: ReactNode
  value: ReactNode
  /** Shows the value as a chip with this tone. Plain text when omitted. */
  tone?: BadgeProps['variant']
  href?: string
  /** Shows an initials avatar before the label (for rows that are people). */
  person?: { name?: string | null; seed?: string }
}

/** Label/value rows with dividers, the building block of most dashboard panels. */
export function PanelList({ rows, empty }: { rows: PanelRow[]; empty?: ReactNode }) {
  if (rows.length === 0) {
    return <p className="py-3 text-sm text-neutral-500 dark:text-neutral-400">{empty}</p>
  }
  return (
    <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
      {rows.map((row) => {
        const value = row.tone ? (
          <Badge variant={row.tone} className="min-w-[2rem] justify-center">
            {row.value}
          </Badge>
        ) : (
          <span className="text-sm font-medium tabular-nums text-neutral-900 dark:text-neutral-100">{row.value}</span>
        )
        return (
          <li key={row.key} className="flex min-h-11 items-center justify-between gap-3 py-2">
            <div className="flex min-w-0 items-center gap-3">
              {row.person ? <PersonAvatar name={row.person.name} seed={row.person.seed} size="sm" /> : null}
              <div className="min-w-0">
                <p className="truncate text-sm text-neutral-700 dark:text-neutral-300">{row.label}</p>
                {row.detail ? (
                  <p className="truncate text-[13px] text-neutral-500 dark:text-neutral-400">{row.detail}</p>
                ) : null}
              </div>
            </div>
            {row.href ? (
              <Link
                href={row.href}
                className="shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
              >
                {value}
              </Link>
            ) : (
              <span className="shrink-0">{value}</span>
            )}
          </li>
        )
      })}
    </ul>
  )
}
