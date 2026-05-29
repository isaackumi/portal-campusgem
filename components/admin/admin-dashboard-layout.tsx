'use client'

import type { ReactNode } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { AdminContextNav } from '@/components/admin/admin-context-nav'

export function AdminDashboardLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardLayout>
      <AdminContextNav />
      {children}
    </DashboardLayout>
  )
}
