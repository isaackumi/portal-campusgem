import type { ReactNode } from 'react'

/** Prevent stale vendor-chunk static path generation for form admin routes */
export const dynamic = 'force-dynamic'
export const dynamicParams = true

export default function AdminFormsLayout({ children }: { children: ReactNode }) {
  return children
}
