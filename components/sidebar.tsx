'use client'

import { Suspense, useState, useEffect, useMemo } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useAuth } from '@/components/providers'
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
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  User,
  ChevronLeft,
  ChevronRight,
  Gift,
  Settings,
} from 'lucide-react'

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
      <nav className="flex-1 px-4 py-4 space-y-6 overflow-y-auto overscroll-contain">
        {sections.map((section) => (
          <div key={section.title} className="space-y-2">
            {!collapsed && (
              <h3 className="text-xs font-semibold text-blue-200 uppercase tracking-wider px-3">
                {section.title}
              </h3>
            )}
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon
                const isActive = isSidebarItemActive(pathname, item.href, searchParams)
                return (
                  <Button
                    key={`${section.title}-${item.name}`}
                    variant="ghost"
                    className={cn(
                      'w-full justify-start px-3 py-2 h-auto',
                      collapsed && 'px-2',
                      isActive
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'text-blue-100 hover:text-white hover:bg-blue-800'
                    )}
                    onClick={() => go(item.href)}
                    title={item.description ?? item.name}
                  >
                    <Icon className={cn('h-4 w-4', !collapsed && 'mr-3')} />
                    {!collapsed && <span className="text-sm">{item.name}</span>}
                  </Button>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {!collapsed && settingsItems.length > 0 ? (
        <div className="px-4 py-4 border-t border-blue-800 space-y-2">
          <h3 className="text-xs font-semibold text-blue-200 uppercase tracking-wider px-3 flex items-center gap-2">
            <Settings className="h-3 w-3" />
            SETTINGS
          </h3>
          <div className="space-y-1">
            {settingsItems.map((item) => {
              const Icon = item.icon
              const isActive = isSidebarItemActive(pathname, item.href, searchParams)
              return (
                <Button
                  key={item.name}
                  variant="ghost"
                  className={cn(
                    'w-full justify-start px-3 py-2 h-auto',
                    isActive
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'text-blue-100 hover:text-white hover:bg-blue-800'
                  )}
                  onClick={() => go(item.href)}
                >
                  <Icon className="h-4 w-4 mr-3" />
                  <span className="text-sm">{item.name}</span>
                </Button>
              )
            })}
          </div>
        </div>
      ) : null}
    </>
  )
}

function SidebarNav(props: { collapsed: boolean; onNavigate?: () => void }) {
  return (
    <Suspense
      fallback={
        <nav className="flex-1 px-4 py-4">
          <div className="h-8 animate-pulse rounded bg-blue-800/60" />
        </nav>
      }
    >
      <SidebarNavInner {...props} />
    </Suspense>
  )
}

export function Sidebar({ className }: SidebarProps) {
  const router = useRouter()
  const auth = useAuth()
  const { user, role, mounted } = useSidebarNav()
  const [collapsed, setCollapsed] = useState(false)

  const showRecommendations =
    !mounted || !role || canSeeNavItem(role, { name: 'Recommendations', href: '/recommendations', icon: Gift })

  return (
    <div
      className={cn(
        'flex flex-col h-full bg-blue-900 transition-all duration-300',
        collapsed ? 'w-16' : 'w-72',
        className
      )}
    >
      <div className="flex items-center justify-between p-6 border-b border-blue-800">
        {!collapsed && (
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-yellow-400 rounded-lg flex items-center justify-center">
              <LayoutDashboard className="h-6 w-6 text-slate-900" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
                Campus Gem Ministries
              </h1>
              <p className="text-sm text-white">Campus Ministry</p>
              <p className="text-xs text-yellow-400">Kokomlemle, Accra</p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 text-blue-200 hover:text-white hover:bg-blue-800"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {!collapsed && (
        <div className="p-6 border-b border-blue-800">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center">
              <User className="h-6 w-6 text-slate-900" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.full_name || 'User'}</p>
              <p className="text-xs text-blue-200 truncate">{user?.role?.replace('_', ' ') || 'Member'}</p>
            </div>
          </div>
        </div>
      )}

      <SidebarNav collapsed={collapsed} />

      {!collapsed && showRecommendations ? (
        <div className="p-4">
          <Button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white justify-start px-3 py-2 h-auto"
            onClick={() => router.push('/recommendations')}
          >
            <Gift className="h-4 w-4 mr-3 text-yellow-400" />
            <span className="text-sm">Recommendations</span>
          </Button>
        </div>
      ) : null}

      <div className="p-4 border-t border-blue-800">
        <Button
          variant="ghost"
          className={cn(
            'w-full justify-start text-blue-100 hover:text-white hover:bg-blue-800',
            collapsed ? 'px-2' : 'px-3'
          )}
          onClick={async () => {
            await auth.signOut()
            router.push('/auth')
          }}
        >
          <LogOut className={cn('h-4 w-4', !collapsed && 'mr-3')} />
          {!collapsed && <span className="text-sm">Logout</span>}
        </Button>
      </div>
    </div>
  )
}

export function MobileSidebar() {
  const router = useRouter()
  const auth = useAuth()
  const { user, role, mounted } = useSidebarNav()
  const [open, setOpen] = useState(false)

  const showRecommendations =
    !mounted || !role || canSeeNavItem(role, { name: 'Recommendations', href: '/recommendations', icon: Gift })

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="lg:hidden p-2 text-slate-600"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-72 bg-blue-900 shadow-xl flex flex-col h-full">
            <div className="flex items-center justify-between p-6 border-b border-blue-800">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-yellow-400 rounded-lg flex items-center justify-center">
                  <LayoutDashboard className="h-6 w-6 text-slate-900" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
                    Campus Gem Ministries
                  </h1>
                  <p className="text-sm text-white">Campus Ministry</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
                className="p-2 text-blue-200 hover:text-white hover:bg-blue-800"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-6 border-b border-blue-800">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-slate-900" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{user?.full_name || 'User'}</p>
                  <p className="text-xs text-blue-200 truncate">{user?.role?.replace('_', ' ') || 'Member'}</p>
                </div>
              </div>
            </div>

            <SidebarNav collapsed={false} onNavigate={() => setOpen(false)} />

            {showRecommendations ? (
              <div className="p-4">
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white justify-start px-3 py-2 h-auto"
                  onClick={() => {
                    router.push('/recommendations')
                    setOpen(false)
                  }}
                >
                  <Gift className="h-4 w-4 mr-3 text-yellow-400" />
                  <span className="text-sm">Recommendations</span>
                </Button>
              </div>
            ) : null}

            <div className="p-4 border-t border-blue-800">
              <Button
                variant="ghost"
                className="w-full justify-start text-blue-100 hover:text-white hover:bg-blue-800 px-3"
                onClick={async () => {
                  await auth.signOut()
                  router.push('/auth')
                  setOpen(false)
                }}
              >
                <LogOut className="h-4 w-4 mr-3" />
                <span className="text-sm">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

export default Sidebar
