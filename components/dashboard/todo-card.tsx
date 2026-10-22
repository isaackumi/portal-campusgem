'use client'

import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DashboardPanel } from '@/components/dashboard/panel'
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
  const meta = loading
    ? 'Checking…'
    : items.length === 0
      ? 'All caught up'
      : `${items.length} ${items.length === 1 ? 'thing needs' : 'things need'} you`

  return (
    <DashboardPanel title="To do" meta={meta}>
      {items.length === 0 ? (
        <div className="flex min-h-11 items-center gap-2.5 py-2 text-sm text-neutral-500 dark:text-neutral-400">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden />
          {loading ? 'Looking for anything that needs attention…' : 'Nothing needs your attention right now.'}
        </div>
      ) : (
        <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {items.map((item) => {
            const Icon = item.icon
            return (
              <li key={item.id} className="flex min-h-14 items-center gap-3 py-2.5">
                <span
                  className={cn(
                    'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                    item.urgent
                      ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                      : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-300'
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1 text-sm text-neutral-800 dark:text-neutral-100">
                  {item.text}
                  {item.urgent ? (
                    <Badge variant="warning" className="ml-2 align-middle">
                      Urgent
                    </Badge>
                  ) : null}
                </span>
                <Button asChild variant="outline" size="sm" className="shrink-0 gap-1.5">
                  <Link href={item.href}>
                    {item.actionLabel}
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                </Button>
              </li>
            )
          })}
        </ul>
      )}
    </DashboardPanel>
  )
}
