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
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col">
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="lg:pl-72">
        {/* Mobile Header */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm lg:hidden">
          <MobileSidebar />
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-gray-900" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
              Campus Gem Ministries
            </h1>
            <p className="text-sm text-gray-600">Campus Ministry</p>
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