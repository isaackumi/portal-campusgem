import type { Metadata } from 'next'

/** Public tap-to-confirm pages: no app chrome, never indexed, never leak the link. */
export const metadata: Metadata = {
  title: 'Camp Meeting | Campus Gem Ministries',
  description: 'Let us know if you are coming to camp.',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
}

export const dynamic = 'force-dynamic'

export default function ConfirmLinkLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100 antialiased dark:bg-slate-950">
      {children}
    </div>
  )
}
