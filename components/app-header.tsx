'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { LogOut, Menu, PanelLeft, Search } from 'lucide-react'
import { useAuth } from '@/components/providers'
import { ThemeToggle } from '@/components/theme-toggle'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  canSeeNavItem,
  filterSidebarSections,
  sidebarSettingsNavigation,
} from '@/lib/navigation/sidebar'
import type { UserRole } from '@/lib/types'
import { cn } from '@/lib/utils'

function initials(name?: string | null) {
  if (!name?.trim()) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase()
}

function formatRole(role?: string) {
  if (!role) return 'Member'
  return role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function AppHeader({
  collapsed,
  onToggleSidebar,
  onOpenMobile,
}: {
  collapsed: boolean
  onToggleSidebar: () => void
  onOpenMobile: () => void
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, signOut } = useAuth()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  const role = user?.role as UserRole | undefined
  const extra = user?.permissions

  const pages = useMemo(() => {
    const sections = filterSidebarSections(role, undefined, extra)
    const settings = sidebarSettingsNavigation.filter((item) => canSeeNavItem(role, item, extra))
    return [
      ...sections.flatMap((section) =>
        section.items.map((item) => ({ ...item, section: section.title }))
      ),
      ...settings.map((item) => ({ ...item, section: 'Settings' })),
    ]
  }, [role, extra])

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return pages
      .filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.section.toLowerCase().includes(q) ||
          (item.description?.toLowerCase().includes(q) ?? false)
      )
      .slice(0, 8)
  }, [pages, query])

  useEffect(() => {
    setQuery('')
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (document.getElementById('global-search-wrap')?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  useEffect(() => {
    const main = document.querySelector('[data-app-main]')
    if (!main) return

    const apply = () => {
      const q = query.trim().toLowerCase()
      main.querySelectorAll('tbody tr').forEach((node) => {
        const row = node as HTMLElement
        row.hidden = Boolean(q) && !row.innerText.toLowerCase().includes(q)
      })
    }

    apply()
    const observer = new MutationObserver(apply)
    observer.observe(main, { childList: true, subtree: true, characterData: true })
    return () => {
      observer.disconnect()
      main.querySelectorAll('tbody tr').forEach((node) => {
        ;(node as HTMLElement).hidden = false
      })
    }
  }, [query, pathname])

  function go(href: string) {
    setQuery('')
    setOpen(false)
    router.push(href)
  }

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-3 border-b border-neutral-200 bg-white px-4 dark:border-neutral-700 dark:bg-neutral-800 sm:gap-x-4 sm:px-6 lg:px-8">
      <button
        type="button"
        className="-m-2.5 p-2.5 text-neutral-700 dark:text-white lg:hidden"
        onClick={onOpenMobile}
      >
        <span className="sr-only">Open sidebar</span>
        <Menu className="h-6 w-6" aria-hidden />
      </button>

      <button
        type="button"
        onClick={onToggleSidebar}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="hidden items-center justify-center rounded-lg p-1.5 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700 lg:inline-flex"
      >
        <span className="sr-only">{collapsed ? 'Expand sidebar' : 'Collapse sidebar'}</span>
        <PanelLeft className="h-5 w-5" aria-hidden />
      </button>

      <div id="global-search-wrap" className="relative min-w-0 max-w-xs flex-1">
        <label htmlFor="global-search" className="sr-only">
          Search
        </label>
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <Search className="h-5 w-5 text-neutral-400" aria-hidden />
        </div>
        <input
          id="global-search"
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && matches[0]) {
              event.preventDefault()
              go(matches[0].href)
            }
            if (event.key === 'Escape') setOpen(false)
          }}
          placeholder="Search this page"
          className="block w-full rounded-lg border border-neutral-300 bg-white py-2 pl-10 pr-3 text-sm font-normal text-neutral-900 placeholder:text-neutral-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200 dark:placeholder:text-neutral-500"
        />
        {open && query.trim() ? (
          <div className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-50 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
            {matches.length > 0 ? (
              <ul className="py-1">
                <li className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                  Pages
                </li>
                {matches.map((item) => {
                  const Icon = item.icon
                  return (
                    <li key={`${item.section}-${item.href}`}>
                      <button
                        type="button"
                        onClick={() => go(item.href)}
                        className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-neutral-800 hover:bg-neutral-50 dark:text-neutral-100 dark:hover:bg-neutral-700"
                      >
                        <Icon className="h-4 w-4 shrink-0 text-neutral-500 dark:text-neutral-300" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{item.name}</span>
                          <span className="block truncate text-xs text-neutral-500 dark:text-neutral-400">
                            {item.section}
                          </span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="px-3 py-3 text-sm text-neutral-500 dark:text-neutral-400">
                No pages match. Table rows on this page are filtered as you type.
              </p>
            )}
          </div>
        ) : null}
      </div>

      <div className="ml-auto flex items-center gap-x-2 sm:gap-x-3">
        <ThemeToggle />
        <div className="hidden h-6 w-px bg-neutral-900/10 dark:bg-white/10 sm:block" aria-hidden />

        <DropdownMenu>
          <DropdownMenuTrigger
            className="-m-1.5 flex items-center gap-2 rounded-lg p-1.5 outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30"
            aria-label="Open user menu"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
              {initials(user?.full_name)}
            </span>
            <span className="hidden text-left leading-tight lg:block">
              <span className="block text-sm font-medium text-neutral-900 dark:text-neutral-100">
                {user?.full_name || 'Signed in'}
              </span>
              <span className="block text-xs text-neutral-500 dark:text-neutral-400">
                {formatRole(user?.role)}
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
                {user?.email || user?.phone || user?.membership_id || formatRole(user?.role)}
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
