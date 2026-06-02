'use client'

import { Suspense, useState, useEffect, useMemo } from 'react'
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
import { LogOut, Menu, X, ChevronLeft, ChevronRight } from 'lucide-react'

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
                        'sidebar-nav-item group flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
                        collapsed && 'justify-center px-2'
                      )}
                    >
                      <Icon className="sidebar-nav-icon h-4 w-4 shrink-0" />
                      {!collapsed && <span className="truncate font-medium">{item.name}</span>}
                      {isActive && !collapsed && (
                        <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                      )}
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
            'shrink-0 border-t border-white/10 px-3 py-3',
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
                      'sidebar-nav-item flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors',
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
          <div className="h-8 animate-pulse rounded-lg bg-white/10" />
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
          'flex shrink-0 items-center gap-3 border-b border-white/10 px-4 py-4',
          collapsed && 'justify-center px-2'
        )}
      >
        <BrandMark size="sm" />
        {!collapsed && <BrandTitle className="flex-1" />}
        {headerAction}
        {showCollapseToggle && onToggleCollapse ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="sidebar-sign-out h-8 w-8 shrink-0"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        ) : null}
      </div>

      {!collapsed && user ? (
        <div className="shrink-0 border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-400/20 text-xs font-semibold text-amber-300">
              {userInitials(user.full_name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{user.full_name || 'User'}</p>
              <p className="truncate text-xs text-slate-400">{formatRole(user.role)}</p>
            </div>
          </div>
        </div>
      ) : null}

      <SidebarNav collapsed={collapsed} onNavigate={onNavigate} />

      <div className={cn('shrink-0 border-t border-white/10 p-3', collapsed && 'flex justify-center')}>
        <button
          type="button"
          className={cn(
            'sidebar-sign-out flex w-full items-center rounded-lg text-sm font-medium transition-colors',
            collapsed ? 'h-9 w-9 justify-center px-0' : 'gap-3 px-2.5 py-2'
          )}
          onClick={async () => {
            await auth.signOut()
            router.push('/auth')
            onNavigate?.()
          }}
        >
          <LogOut className="h-4 w-4 shrink-0" />
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

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="text-slate-700 lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 z-10 flex h-full max-h-[100dvh] w-[min(100%,18rem)] flex-col bg-slate-950 shadow-2xl">
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
                  <X className="h-4 w-4" />
                </Button>
              }
            />
          </aside>
        </div>
      ) : null}
    </>
  )
}

export default Sidebar
