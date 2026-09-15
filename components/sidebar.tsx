'use client'

import { Suspense, useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useAuth } from '@/components/providers'
import { BrandMark, BrandTitle } from '@/components/brand-mark'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  filterSidebarSections,
  isSidebarItemActive,
  sidebarSettingsNavigation,
  canSeeNavItem,
} from '@/lib/navigation/sidebar'
import type { UserRole } from '@/lib/types'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  Cross2Icon,
  ExitIcon,
  HamburgerMenuIcon,
} from '@radix-ui/react-icons'

interface SidebarProps {
  className?: string
}

function useSidebarNav() {
  const { user } = useAuth()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const role = user?.role as UserRole | undefined

  const sections = useMemo(() => {
    if (!mounted) return filterSidebarSections(undefined)
    return filterSidebarSections(role)
  }, [mounted, role])

  const settingsItems = useMemo(() => {
    if (!mounted) return sidebarSettingsNavigation
    return sidebarSettingsNavigation.filter((item) => canSeeNavItem(role, item))
  }, [mounted, role])

  return { user, role, sections, settingsItems, mounted }
}

function userInitials(name?: string | null): string {
  if (!name?.trim()) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase()
}

function formatRole(role?: string): string {
  if (!role) return 'Member'
  return role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function SidebarNavInner({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean
  onNavigate?: () => void
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { sections, settingsItems } = useSidebarNav()

  function go(href: string) {
    router.push(href)
    onNavigate?.()
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <nav className="flex-1 space-y-5 overflow-y-auto overscroll-contain px-3 py-4">
        {sections.map((section) => (
          <div key={section.title}>
            {!collapsed && <p className="sidebar-section-label mb-1.5 px-2">{section.title}</p>}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon
                const isActive = isSidebarItemActive(pathname, item.href, searchParams)
                return (
                  <li key={`${section.title}-${item.name}`}>
                    <button
                      type="button"
                      onClick={() => go(item.href)}
                      title={collapsed ? item.name : item.description ?? item.name}
                      data-active={isActive ? 'true' : 'false'}
                      className={cn(
                        'sidebar-nav-item group flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left text-sm transition-colors',
                        collapsed && 'justify-center px-2'
                      )}
                    >
                      <Icon className="sidebar-nav-icon h-4 w-4 shrink-0" />
                      {!collapsed && <span className="truncate font-medium">{item.name}</span>}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {settingsItems.length > 0 ? (
        <div
          className={cn(
            'shrink-0 border-t border-slate-200 px-3 py-3',
            collapsed && 'flex flex-col items-center gap-1'
          )}
        >
          {!collapsed && <p className="sidebar-section-label mb-1.5 px-2">Settings</p>}
          <ul className="w-full space-y-0.5">
            {settingsItems.map((item) => {
              const Icon = item.icon
              const isActive = isSidebarItemActive(pathname, item.href, searchParams)
              return (
                <li key={item.name}>
                  <button
                    type="button"
                    onClick={() => go(item.href)}
                    title={item.name}
                    data-active={isActive ? 'true' : 'false'}
                    className={cn(
                      'sidebar-nav-item flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-colors',
                      collapsed && 'justify-center px-2'
                    )}
                  >
                    <Icon className="sidebar-nav-icon h-4 w-4 shrink-0" />
                    {!collapsed && <span className="truncate font-medium">{item.name}</span>}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

function SidebarNav(props: { collapsed: boolean; onNavigate?: () => void }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-0 flex-1 flex-col px-3 py-4">
          <div className="h-8 animate-pulse rounded-md bg-slate-200/80" />
        </div>
      }
    >
      <SidebarNavInner {...props} />
    </Suspense>
  )
}

function SidebarShell({
  collapsed,
  onToggleCollapse,
  onNavigate,
  showCollapseToggle = true,
  headerAction,
}: {
  collapsed: boolean
  onToggleCollapse?: () => void
  onNavigate?: () => void
  showCollapseToggle?: boolean
  headerAction?: React.ReactNode
}) {
  const router = useRouter()
  const auth = useAuth()
  const { user } = useSidebarNav()

  return (
    <div className="sidebar-panel">
      <div
        className={cn(
          'flex shrink-0 items-center gap-3 border-b border-slate-200 px-4 py-4',
          collapsed && 'justify-center px-2'
        )}
      >
        <BrandMark size="sm" />
        {!collapsed && <BrandTitle className="flex-1" light />}
        {headerAction}
        {showCollapseToggle && onToggleCollapse ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="sidebar-sign-out h-8 w-8 shrink-0"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRightIcon className="h-4 w-4" /> : <ChevronLeftIcon className="h-4 w-4" />}
          </Button>
        ) : null}
      </div>

      {!collapsed && user ? (
        <div className="shrink-0 border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-[11px] font-semibold text-slate-700">
              {userInitials(user.full_name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">{user.full_name || 'User'}</p>
              <p className="truncate text-xs text-slate-500">{formatRole(user.role)}</p>
            </div>
          </div>
        </div>
      ) : null}

      <SidebarNav collapsed={collapsed} onNavigate={onNavigate} />

      <div className={cn('shrink-0 border-t border-slate-200 p-3', collapsed && 'flex justify-center')}>
        <button
          type="button"
          className={cn(
            'sidebar-sign-out flex w-full items-center rounded-md text-sm font-medium transition-colors',
            collapsed ? 'h-9 w-9 justify-center px-0' : 'gap-3 px-2.5 py-2'
          )}
          onClick={async () => {
            await auth.signOut()
            router.push('/auth')
            onNavigate?.()
          }}
        >
          <ExitIcon className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </div>
  )
}

export function Sidebar({ className }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div
      className={cn(
        'h-full transition-[width] duration-200 ease-out',
        collapsed ? 'w-[4.5rem]' : 'w-64',
        className
      )}
    >
      <SidebarShell
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
      />
    </div>
  )
}

export function MobileSidebar() {
  const [open, setOpen] = useState(false)
  const [portalReady, setPortalReady] = useState(false)

  useEffect(() => {
    setPortalReady(true)
  }, [])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  const drawer =
    open && portalReady ? (
      <div
        className="mobile-nav-overlay fixed inset-0 z-[9999] lg:hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
      >
        <button
          type="button"
          className="absolute inset-0 bg-slate-950/75 backdrop-blur-[2px]"
          aria-label="Dismiss menu overlay"
          onClick={() => setOpen(false)}
        />
        <aside className="mobile-nav-panel relative z-10 flex h-full max-h-[100dvh] w-[min(85vw,18rem)] flex-col border-r border-slate-200 bg-[#f7f6f3] shadow-xl">
          <SidebarShell
            collapsed={false}
            onNavigate={() => setOpen(false)}
            showCollapseToggle={false}
            headerAction={
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                className="sidebar-sign-out ml-auto h-8 w-8 shrink-0"
                aria-label="Close menu"
              >
                <Cross2Icon className="h-4 w-4" />
              </Button>
            }
          />
        </aside>
      </div>
    ) : null

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="text-slate-700 lg:hidden"
        aria-label="Open menu"
      >
        <HamburgerMenuIcon className="h-5 w-5" />
      </Button>
      {drawer ? createPortal(drawer, document.body) : null}
    </>
  )
}

export default Sidebar
