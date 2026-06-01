'use client'

import { ReactNode } from 'react'
import { Sidebar, MobileSidebar } from '@/components/sidebar'

interface DashboardLayoutProps {
  children: ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Mobile Header */}
        <div className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-x-3 border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur-sm lg:hidden">
          <MobileSidebar />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold text-slate-900">Campus Gem Ministries</h1>
          </div>
        </div>

        {/* Page Content */}
        <main className="py-4 sm:py-6 lg:py-8">
          <div className="min-w-0 px-3 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

export default DashboardLayout