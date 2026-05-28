import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Form | Campus Gem Ministries',
  description: 'Complete a Campus Gem Ministries form',
}

/** Avoid stale vendor-chunk static path generation for dynamic public forms */
export const dynamic = 'force-dynamic'
export const dynamicParams = true

export default function PublicFormLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen antialiased">{children}</div>
}
