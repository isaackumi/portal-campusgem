'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarCheck, Home, Menu, PhoneCall, Tent, Users, type LucideIcon } from 'lucide-react'
import { useAuth } from '@/components/providers'
import type { Permission } from '@/lib/auth/roles'
import { cn } from '@/lib/utils'

type Tab = { href: string; label: string; icon: LucideIcon; permission?: Permission; match: string[] }

/** Most-used destinations first; the first four the user can open are shown. */
const TABS: Tab[] = [
  { href: '/dashboard', label: 'Home', icon: Home, match: ['/dashboard'] },
  { href: '/members', label: 'Members', icon: Users, permission: 'members.view', match: ['/members'] },
  { href: '/admin/camp-meeting', label: 'Camp', icon: Tent, permission: 'camp.view', match: ['/admin/camp-meeting'] },
  { href: '/admin/camp-meeting/calls', label: 'Calls', icon: PhoneCall, permission: 'camp.calls', match: ['/admin/camp-meeting/calls'] },
  { href: '/attendance', label: 'Attendance', icon: CalendarCheck, permission: 'attendance.view', match: ['/attendance'] },
]

/** Thumb-reach navigation on phones and small tablets. Hidden from `lg` up, where the sidebar shows. */
export function MobileTabBar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const pathname = usePathname() ?? ''
  const { can } = useAuth()
  const tabs = TABS.filter((t) => !t.permission || can(t.permission)).slice(0, 4)

  // The most specific matching tab wins (Calls over Camp).
  const activeHref = tabs
    .filter((t) => t.match.some((m) => pathname === m || pathname.startsWith(`${m}/`)))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href

  const item =
    'flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500/40'

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200/80 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-white/85 dark:border-white/[0.08] dark:bg-neutral-950/95 dark:supports-[backdrop-filter]:bg-neutral-950/85 lg:hidden"
    >
      <ul className="mx-auto flex max-w-lg">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const active = tab.href === activeHref
          return (
            <li key={tab.href} className="flex flex-1">
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  item,
                  active ? 'text-brand-600 dark:text-brand-300' : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-white'
                )}
              >
                <span
                  className={cn(
                    'flex h-7 w-12 items-center justify-center rounded-full transition-colors',
                    active && 'bg-brand-50 dark:bg-brand-400/15'
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                {tab.label}
              </Link>
            </li>
          )
        })}
        <li className="flex flex-1">
          <button
            type="button"
            onClick={onOpenMenu}
            className={cn(item, 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-white')}
          >
            <span className="flex h-7 w-12 items-center justify-center rounded-full">
              <Menu className="h-5 w-5" aria-hidden />
            </span>
            Menu
          </button>
        </li>
      </ul>
    </nav>
  )
}
