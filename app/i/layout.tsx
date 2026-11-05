import type { Metadata } from 'next'

/** Self check-in pages (`/i/<token>`): no app chrome, never indexed, never leak the link. */
export const metadata: Metadata = {
  title: 'Check in | Campus Gem Ministries',
  description: 'Let us know you are here.',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
}

export const dynamic = 'force-dynamic'

export default function SelfCheckInLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-slate-100 antialiased dark:bg-slate-950">{children}</div>
}
