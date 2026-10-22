'use client'

import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface TodoItem {
  id: string
  icon: LucideIcon
  text: string
  actionLabel: string
  href: string
  /** Highlight items that are slipping (e.g. overdue follow-ups). */
  urgent?: boolean
}

export function TodoCard({ items, loading }: { items: TodoItem[]; loading?: boolean }) {
  return (
    <section className="dashboard-panel">
      <div className="flex items-baseline justify-between gap-3 px-5 pb-2 pt-4">
        <h2 className="app-section-title">To do</h2>
        <span className="text-xs text-neutral-500 dark:text-neutral-400">
          {loading ? 'Checking…' : items.length === 0 ? 'All caught up' : `${items.length} ${items.length === 1 ? 'thing needs' : 'things need'} you`}
        </span>
      </div>
      {items.length === 0 ? (
        <div className="flex items-center gap-3 px-5 pb-5 pt-2 text-sm text-neutral-500 dark:text-neutral-400">
          <CheckCircle2 className="h-5 w-5 text-emerald-500" aria-hidden />
          {loading ? 'Looking for anything that needs attention…' : 'Nothing needs your attention right now.'}
        </div>
      ) : (
        <ul className="px-2 pb-2">
          {items.map((item) => {
            const Icon = item.icon
            return (
              <li
                key={item.id}
                className="flex items-center gap-3 border-b border-neutral-100 px-3 py-2.5 last:border-0 dark:border-neutral-800"
              >
                <span
                  className={cn(
                    'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                    item.urgent
                      ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                      : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span
                  className={cn(
                    'min-w-0 flex-1 text-sm',
                    item.urgent ? 'text-amber-800 dark:text-amber-300' : 'text-neutral-800 dark:text-neutral-100'
                  )}
                >
                  {item.text}
                </span>
                <Link
                  href={item.href}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-800 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-800"
                >
                  {item.actionLabel}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
