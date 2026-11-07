import type { Metadata } from 'next'

/** Public campus outreach form (/o/<slug>): no app chrome, never indexed. */
export const metadata: Metadata = {
  title: 'Campus GEM | Nice to meet you',
  description: 'Leave your details with Campus GEM.',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default function OutreachPublicLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-slate-100 antialiased dark:bg-slate-950">{children}</div>
}
