'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { type LucideIcon } from 'lucide-react'

export interface QuickAction {
  href: string
  label: string
  hint: string
  icon: LucideIcon
}

function greetingFor(date: Date): string {
  const hour = date.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

/** Page header for the home dashboard: greeting, date, actions, then quick-action tiles. */
export function DashboardHeader({
  firstName,
  subtitle,
  actions,
  quickActions,
}: {
  firstName: string
  subtitle?: ReactNode
  actions?: ReactNode
  quickActions: QuickAction[]
}) {
  const now = new Date()
  const today = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="app-overline">{today}</p>
          <h1 className="app-page-title mt-2">
            {greetingFor(now)}, {firstName}
          </h1>
          {subtitle ? <p className="app-page-description mt-1.5">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>

      {quickActions.length > 0 ? (
        <nav
          aria-label="Quick actions"
          className="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-2.5 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:scroll-px-6 sm:px-6 md:mx-0 md:grid md:snap-none md:grid-cols-3 md:gap-3 md:overflow-visible md:px-0 md:pb-0 xl:grid-cols-5"
        >
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <Link
                key={action.href}
                href={action.href}
                className="dashboard-panel group relative flex w-[9.25rem] shrink-0 snap-start flex-col items-start gap-2.5 p-3.5 transition-colors md:w-auto md:p-4 hover:border-neutral-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 dark:hover:border-white/20"
              >
                <Icon className="h-[18px] w-[18px] text-neutral-500 group-hover:text-neutral-800 dark:text-neutral-400 dark:group-hover:text-neutral-200" aria-hidden />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-neutral-900 dark:text-white">{action.label}</span>
                  <span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">{action.hint}</span>
                </span>
              </Link>
            )
          })}
        </nav>
      ) : null}
    </section>
  )
}
