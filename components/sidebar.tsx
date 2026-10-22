'use client'

import { Suspense, useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { BrandMark, BrandTitle } from '@/components/brand-mark'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { activeNavHref, type SidebarNavItem, type SidebarNavSection } from '@/lib/navigation/sidebar'
import { useVisibleNav } from '@/lib/navigation/use-visible-nav'
import { ChevronRightIcon, Cross2Icon } from '@radix-ui/react-icons'

interface SidebarProps {
  className?: string
  collapsed?: boolean
}

const OPEN_GROUPS_KEY = 'cg-sidebar-groups-v1'

/** Which groups are expanded, remembered per browser. */
function useOpenGroups(activeSection: string | null) {
  const [open, setOpen] = useState<Record<string, boolean>>({})

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(OPEN_GROUPS_KEY) ?? '{}')
      if (saved && typeof saved === 'object') setOpen(saved)
    } catch {
      // Storage unavailable: every group starts closed except the current one.
    }
  }, [])

  // Navigating into a closed group opens it, so the active page is never hidden.
  useEffect(() => {
    if (activeSection) setOpen((prev) => (prev[activeSection] ? prev : { ...prev, [activeSection]: true }))
  }, [activeSection])

  function toggle(title: string) {
    setOpen((prev) => {
      const next = { ...prev, [title]: !prev[title] }
      try {
        localStorage.setItem(OPEN_GROUPS_KEY, JSON.stringify(next))
      } catch {
        // Not persisted; the toggle still applies for this visit.
      }
      return next
    })
  }

  return { isOpen: (title: string) => Boolean(open[title]), toggle }
}

function NavItem({
  item,
  active,
  collapsed,
  onSelect,
}: {
  item: SidebarNavItem
  active: boolean
  collapsed: boolean
  onSelect: (href: string) => void
}) {
  const Icon = item.icon
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(item.href)}
        title={collapsed ? item.name : item.description}
        aria-current={active ? 'page' : undefined}
        data-active={active ? 'true' : 'false'}
        className={cn('sidebar-nav-item group', collapsed && 'justify-center px-0')}
      >
        <Icon className="sidebar-nav-icon h-4 w-4 shrink-0" />
        {!collapsed && <span className="truncate">{item.name}</span>}
      </button>
    </li>
  )
}

function NavGroup({
  section,
  collapsible,
  open,
  onToggle,
  children,
}: {
  section: SidebarNavSection
  collapsible: boolean
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  if (!collapsible) return <ul className="flex flex-col gap-px">{children}</ul>
  const id = `nav-group-${section.title.toLowerCase().replace(/\W+/g, '-')}`
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={id}
        className="sidebar-group-toggle group"
      >
        <span className="truncate">{section.title}</span>
        <ChevronRightIcon
          className={cn('h-3.5 w-3.5 shrink-0 transition-transform duration-200', open && 'rotate-90')}
          aria-hidden
        />
      </button>
      {/* grid-rows 0fr → 1fr animates the height without measuring it. */}
      <div
        id={id}
        className={cn(
          'grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        {/* invisible (not just clipped) so closed links drop out of the tab order. */}
        <ul
          className={cn(
            'flex min-h-0 flex-col gap-px overflow-hidden transition-[visibility] duration-200',
            !open && 'invisible'
          )}
        >
          {children}
        </ul>
      </div>
    </div>
  )
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
  const { sections, settings, pages } = useVisibleNav()

  const activeHref = useMemo(
    () => activeNavHref(pages, pathname, searchParams),
    [pages, pathname, searchParams]
  )
  const activeSection = pages.find((page) => page.href === activeHref)?.section ?? null
  const groups = useOpenGroups(activeSection)

  function go(href: string) {
    router.push(href)
    onNavigate?.()
  }

  const renderItems = (items: SidebarNavItem[]) =>
    items.map((item) => (
      <NavItem
        key={item.href}
        item={item}
        active={item.href === activeHref}
        collapsed={collapsed}
        onSelect={go}
      />
    ))

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <nav
        aria-label="Main"
        className={cn(
          'sidebar-scroll flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pb-4 pt-2',
          'px-3'
        )}
      >
        {sections.map((section, index) =>
          collapsed ? (
            <div key={section.title}>
              {index > 0 && <div className="mx-2 mb-3 h-px bg-neutral-200 dark:bg-neutral-800" aria-hidden />}
              <ul className="flex flex-col gap-px">{renderItems(section.items)}</ul>
            </div>
          ) : (
            <NavGroup
              key={section.title}
              section={section}
              // The first group (Dashboard, Members…) is always visible.
              collapsible={index > 0}
              open={groups.isOpen(section.title)}
              onToggle={() => groups.toggle(section.title)}
            >
              {renderItems(section.items)}
            </NavGroup>
          )
        )}
      </nav>

      {settings.length > 0 ? (
        <div className="shrink-0 border-t border-neutral-200 px-3 py-3 dark:border-neutral-800">
          <ul className="flex flex-col gap-px">{renderItems(settings)}</ul>
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
          <div className="h-8 animate-pulse rounded-lg bg-neutral-200/80 dark:bg-neutral-800" />
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
          'flex h-14 shrink-0 items-center',
          collapsed ? 'justify-center px-3' : 'gap-x-2.5 px-5'
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
        collapsed ? 'w-[72px]' : 'w-[248px]',
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
        <aside className="mobile-nav-panel relative z-10 flex h-full max-h-[100dvh] w-full max-w-[260px] flex-col shadow-xl">
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
