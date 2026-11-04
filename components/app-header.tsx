'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { LogOut, PanelLeft, Search } from 'lucide-react'
import { useAuth } from '@/components/providers'
import { ThemeToggle } from '@/components/theme-toggle'
import { BrandMark } from '@/components/brand-mark'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CommandPalette } from '@/components/command-palette'
import { useActiveCampYear } from '@/lib/hooks/use-camp'
import { ROLE_LABELS, isUserRole } from '@/lib/auth/roles'
import { cn, getInitials } from '@/lib/utils'

function CampStatusChip() {
  const { can } = useAuth()
  const allowed = can('camp.view')
  const { campYear: year } = useActiveCampYear({ enabled: allowed })

  if (!allowed || !year) return null
  const open = year.registration_open
  return (
    <Link
      href="/admin/camp-meeting"
      className="header-chip hidden md:inline-flex"
      title={open ? 'Camp registration is open' : 'Camp registration is closed'}
    >
      <span
        className={cn('h-1.5 w-1.5 rounded-full', open ? 'bg-emerald-500' : 'bg-neutral-400')}
        aria-hidden
      />
      <span className="font-medium">Camp {year.year}</span>
      <span className="text-neutral-500 dark:text-neutral-400">{open ? 'Registration open' : 'Registration closed'}</span>
    </Link>
  )
}

export function AppHeader({
  collapsed,
  onToggleSidebar,
}: {
  collapsed: boolean
  onToggleSidebar: () => void
}) {
  const { user, signOut } = useAuth()
  const [paletteOpen, setPaletteOpen] = useState(false)

  // ⌘K / Ctrl+K (or "/" outside a text field) opens search from anywhere.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const typing = target?.closest('input, textarea, select, [contenteditable="true"]')
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setPaletteOpen((v) => !v)
      } else if (event.key === '/' && !typing && !event.metaKey && !event.ctrlKey) {
        event.preventDefault()
        setPaletteOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const role = user?.role
  const roleLabel = isUserRole(role) ? ROLE_LABELS[role] : 'Member'

  return (
    <header className="sticky top-0 z-40 flex h-[calc(3.5rem+env(safe-area-inset-top))] shrink-0 items-center gap-x-3 bg-neutral-100/95 px-3 pt-[env(safe-area-inset-top)] backdrop-blur supports-[backdrop-filter]:bg-neutral-100/80 dark:bg-neutral-950/90 sm:gap-x-4 sm:px-4 lg:pl-3 lg:pr-4">
      <Link href="/dashboard" className="shrink-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 lg:hidden" aria-label="Home">
        <BrandMark size="sm" />
      </Link>

      <button
        type="button"
        onClick={onToggleSidebar}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="hidden h-9 w-9 items-center justify-center rounded-lg text-neutral-600 hover:bg-neutral-200/70 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white lg:inline-flex"
      >
        <span className="sr-only">{collapsed ? 'Expand sidebar' : 'Collapse sidebar'}</span>
        <PanelLeft className="h-[18px] w-[18px]" aria-hidden />
      </button>

      <div className="mx-auto min-w-0 max-w-md flex-1">
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          aria-haspopup="dialog"
          className="group flex h-9 w-full items-center gap-2.5 rounded-lg border border-neutral-200 bg-white pl-3 pr-2 text-left text-sm text-neutral-400 transition-colors hover:border-neutral-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-500 dark:hover:border-neutral-600"
        >
          <Search className="h-4 w-4 shrink-0 text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300" aria-hidden />
          <span className="min-w-0 flex-1 truncate">
            <span className="sm:hidden">Search</span>
            <span className="hidden sm:inline">Search people, campers, pages…</span>
          </span>
          <kbd className="hidden h-5 items-center rounded border border-neutral-200 bg-neutral-50 px-1.5 font-mono text-[11px] font-medium text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400 sm:inline-flex">
            ⌘K
          </kbd>
        </button>
        <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      </div>

      <div className="flex items-center gap-x-2 sm:gap-x-3">
        <CampStatusChip />
        <ThemeToggle />
        <div className="hidden h-6 w-px bg-neutral-900/10 dark:bg-white/10 sm:block" aria-hidden />

        <DropdownMenu>
          <DropdownMenuTrigger
            className="-m-1.5 flex items-center gap-2 rounded-lg p-1.5 outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30"
            aria-label="Open user menu"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
              {user?.full_name?.trim() ? getInitials(user.full_name) : '?'}
            </span>
            <span className="hidden text-left leading-tight lg:block">
              <span className="block text-sm font-medium text-neutral-900 dark:text-neutral-100">
                {user?.full_name || 'Signed in'}
              </span>
              <span className="block text-xs text-neutral-500 dark:text-neutral-400">
                {roleLabel}
              </span>
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72 p-0">
            <div className="rounded-t-md bg-neutral-100 px-5 py-3 dark:bg-neutral-700">
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Signed in as</p>
              <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                {user?.full_name || 'User'}
              </p>
              <p className="text-xs text-neutral-700 dark:text-neutral-300">
                {user?.email || user?.phone || user?.membership_id || roleLabel}
              </p>
            </div>
            <DropdownMenuItem
              className={cn('mx-1 my-1 cursor-pointer')}
              onClick={() => {
                void signOut()
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
