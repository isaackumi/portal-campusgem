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
import { LogOut, Menu, X, ChevronLeft, ChevronRight, Settings } from 'lucide-react'

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
    <>
      <nav className="flex-1 space-y-5 overflow-y-auto overscroll-contain px-3 py-4">
        {sections.map((section) => (
          <div key={section.title}>
            {!collapsed && (
              <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                {section.title}
              </p>
            )}
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
                      className={cn(
                        'group flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
                        collapsed && 'justify-center px-2',
                        isActive
                          ? 'bg-white/10 text-white'
                          : 'text-slate-300 hover:bg-white/5 hover:text-white'
                      )}
                    >
                      <Icon
                        className={cn(
                          'h-4 w-4 shrink-0',
                          isActive ? 'text-amber-400' : 'text-slate-400 group-hover:text-slate-200'
                        )}
                      />
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
            'border-t border-white/10 px-3 py-3',
            collapsed && 'flex flex-col items-center gap-1'
          )}
        >
          {!collapsed && (
            <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Settings
            </p>
          )}
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
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors',
                      collapsed && 'justify-center px-2',
                      isActive
                        ? 'bg-white/10 text-white'
                        : 'text-slate-300 hover:bg-white/5 hover:text-white'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-slate-400" />
                    {!collapsed && <span className="truncate font-medium">{item.name}</span>}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}
    </>
  )
}

function SidebarNav(props: { collapsed: boolean; onNavigate?: () => void }) {
  return (
    <Suspense
      fallback={
        <nav className="flex-1 px-3 py-4">
          <div className="h-8 animate-pulse rounded-lg bg-white/5" />
        </nav>
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
}: {
  collapsed: boolean
  onToggleCollapse?: () => void
  onNavigate?: () => void
  showCollapseToggle?: boolean
}) {
  const router = useRouter()
  const auth = useAuth()
  const { user } = useSidebarNav()

  return (
    <div className="flex h-full flex-col bg-slate-950 text-white">
      <div
        className={cn(
          'flex items-center gap-3 border-b border-white/10 px-4 py-4',
          collapsed && 'justify-center px-2'
        )}
      >
        <BrandMark size="sm" />
        {!collapsed && <BrandTitle className="flex-1" />}
        {showCollapseToggle && onToggleCollapse ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="h-8 w-8 shrink-0 text-slate-400 hover:bg-white/10 hover:text-white"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        ) : null}
      </div>

      {!collapsed && user ? (
        <div className="border-b border-white/10 px-4 py-3">
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

      <div className={cn('border-t border-white/10 p-3', collapsed && 'flex justify-center')}>
        <Button
          variant="ghost"
          className={cn(
            'w-full text-slate-300 hover:bg-white/5 hover:text-white',
            collapsed ? 'h-9 w-9 px-0' : 'justify-start gap-3 px-2.5'
          )}
          onClick={async () => {
            await auth.signOut()
            router.push('/auth')
            onNavigate?.()
          }}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Sign out</span>}
        </Button>
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

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="lg:hidden text-slate-700"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-[min(100%,18rem)] flex-col shadow-2xl">
            <div className="relative flex h-full flex-col">
              <SidebarShell collapsed={false} onNavigate={() => setOpen(false)} showCollapseToggle={false} />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                className="absolute right-3 top-4 h-8 w-8 text-slate-400 hover:bg-white/10 hover:text-white"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

export default Sidebar
