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
import { Cross2Icon } from '@radix-ui/react-icons'

interface SidebarProps {
  className?: string
  collapsed?: boolean
}

function useSidebarNav() {
  const { user } = useAuth()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const role = user?.role as UserRole | undefined
  const extra = user?.permissions

  const sections = useMemo(() => {
    if (!mounted) return []
    return filterSidebarSections(role, undefined, extra)
  }, [mounted, role, extra])

  const settingsItems = useMemo(() => {
    if (!mounted) return []
    return sidebarSettingsNavigation.filter((item) => canSeeNavItem(role, item, extra))
  }, [mounted, role, extra])

  return { user, role, sections, settingsItems, mounted }
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
      <nav
        className={cn(
          'sidebar-scroll mt-6 flex min-h-0 flex-1 flex-col gap-y-1 overflow-y-auto pb-4',
          collapsed ? 'px-2' : 'px-4'
        )}
      >
        {sections.map((section, sectionIndex) => (
          <div key={section.title} className={sectionIndex > 0 ? 'mt-4' : undefined}>
            {!collapsed && (
              <p className="sidebar-section-label mb-1 px-2 py-1">{section.title}</p>
            )}
            <ul className="flex flex-col gap-y-1">
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
                        'sidebar-nav-item group flex w-full items-center gap-x-3 rounded-lg p-2 text-left text-sm font-medium transition-colors',
                        collapsed && 'justify-center px-2.5'
                      )}
                    >
                      <Icon className="sidebar-nav-icon h-5 w-5 shrink-0" />
                      {!collapsed && <span className="truncate">{item.name}</span>}
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
            'mt-auto shrink-0 border-t border-neutral-200 py-3 dark:border-neutral-700',
            collapsed ? 'px-2' : 'px-4',
            collapsed && 'flex flex-col items-center gap-1'
          )}
        >
          {!collapsed && <p className="sidebar-section-label mb-1.5 px-2">Settings</p>}
          <ul className="flex w-full flex-col gap-y-1">
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
                      'sidebar-nav-item flex w-full items-center gap-x-3 rounded-lg p-2 text-sm font-medium transition-colors',
                      collapsed && 'justify-center px-2'
                    )}
                  >
                    <Icon className="sidebar-nav-icon h-5 w-5 shrink-0" />
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
  onNavigate,
  headerAction,
}: {
  collapsed: boolean
  onNavigate?: () => void
  headerAction?: React.ReactNode
}) {
  return (
    <div className="sidebar-panel">
      <div
        className={cn(
          'flex shrink-0 items-center pt-6',
          collapsed ? 'justify-center px-2' : 'gap-x-2.5 px-6'
        )}
      >
        <BrandMark size={collapsed ? 'sm' : 'md'} />
        {!collapsed && <BrandTitle className="min-w-0 flex-1" />}
        {headerAction}
      </div>

      <SidebarNav collapsed={collapsed} onNavigate={onNavigate} />
    </div>
  )
}

export function Sidebar({ className, collapsed = false }: SidebarProps) {
  return (
    <div
      className={cn(
        'h-full transition-[width] duration-300 ease-in-out',
        collapsed ? 'w-[72px]' : 'w-[250px]',
        className
      )}
    >
      <SidebarShell collapsed={collapsed} />
    </div>
  )
}

export function MobileSidebar({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
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

  const close = () => onOpenChange(false)

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
          className="absolute inset-0 bg-neutral-900/80"
          aria-label="Dismiss menu overlay"
          onClick={close}
        />
        <aside className="mobile-nav-panel relative z-10 flex h-full max-h-[100dvh] w-full max-w-[260px] flex-col bg-white shadow-xl dark:bg-neutral-800">
          <SidebarShell
            collapsed={false}
            onNavigate={close}
            headerAction={
              <Button
                variant="ghost"
                size="icon"
                onClick={close}
                className="sidebar-sign-out ml-auto h-8 w-8 shrink-0"
                aria-label="Close menu"
              >
                <Cross2Icon className="h-5 w-5" />
              </Button>
            }
          />
        </aside>
      </div>
    ) : null

  return drawer ? createPortal(drawer, document.body) : null
}

export default Sidebar
