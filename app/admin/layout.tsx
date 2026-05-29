import type { ReactNode } from 'react'
import { AdminDashboardLayout } from '@/components/admin/admin-dashboard-layout'

export const dynamic = 'force-dynamic'
export const dynamicParams = true

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminDashboardLayout>{children}</AdminDashboardLayout>
}
