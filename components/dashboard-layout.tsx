'use client'

import { useState, type ReactNode } from 'react'
import { AppHeader } from '@/components/app-header'
import { Sidebar, MobileSidebar } from '@/components/sidebar'
import { cn } from '@/lib/utils'

interface DashboardLayoutProps {
  children: ReactNode
}

/**
 * App shell: sidebar and top bar sit on the neutral canvas; page content lives in a
 * single rounded panel so every screen reads as one surface.
 */
export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950">
      <div
        className={cn(
          'hidden lg:fixed lg:inset-y-0 lg:z-30 lg:flex lg:flex-col',
          collapsed ? 'lg:w-[72px]' : 'lg:w-[248px]'
        )}
      >
        <Sidebar collapsed={collapsed} />
      </div>

      <MobileSidebar open={mobileOpen} onOpenChange={setMobileOpen} />

      <div
        className={cn(
          'transition-[padding] duration-300 ease-in-out',
          collapsed ? 'lg:pl-[72px]' : 'lg:pl-[248px]'
        )}
      >
        <AppHeader
          collapsed={collapsed}
          onToggleSidebar={() => setCollapsed((value) => !value)}
          onOpenMobile={() => setMobileOpen(true)}
        />

        <main data-app-main className="px-2 pb-2 sm:px-3 sm:pb-3 lg:pl-0">
          <div className="app-content-panel min-h-[calc(100dvh-4rem)] min-w-0 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

export default DashboardLayout
