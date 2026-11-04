'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { ArrowUpRight, type LucideIcon } from 'lucide-react'

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
            {greetingFor(now)}, <span className="app-display-accent">{firstName}</span>
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
                className="dashboard-panel group relative flex w-[9.25rem] shrink-0 snap-start flex-col items-start gap-3 p-3.5 transition md:w-auto md:p-4-[box-shadow,border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:hover:border-brand-400/30"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 text-white shadow-[0_4px_10px_-3px_rgb(79_70_229/0.5)]">
                  <Icon className="h-[18px] w-[18px]" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-neutral-900 dark:text-white">{action.label}</span>
                  <span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">{action.hint}</span>
                </span>
                <ArrowUpRight
                  className="absolute right-3.5 top-3.5 h-4 w-4 text-neutral-300 transition-colors group-hover:text-brand-500 dark:text-neutral-600 dark:group-hover:text-brand-300"
                  aria-hidden
                />
              </Link>
            )
          })}
        </nav>
      ) : null}
    </section>
  )
}
