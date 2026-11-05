import type { Metadata } from 'next'

/** Public campus join pages: no app chrome, never indexed. */
export const metadata: Metadata = {
  title: 'Join your campus fellowship | Campus Gem Ministries',
  description: 'Join your Campus Gem campus fellowship.',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default function JoinLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-slate-100 antialiased dark:bg-slate-950">{children}</div>
}
