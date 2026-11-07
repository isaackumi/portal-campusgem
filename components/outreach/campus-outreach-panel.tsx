'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { QrCode } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatCard } from '@/components/ui/stat-card'
import { LoadingSpinner } from '@/components/ui/loading'
import { OutreachQrSheet } from '@/components/outreach/qr-sheet'
import { campusOutreachSummaryAction } from '@/lib/actions/outreach'
import { shortDay } from '@/lib/outreach/logic'

/** Campus page "Outreach" tab: the latest Sunday's numbers, the QR, and a link to /outreach. */
export function CampusOutreachPanel({ groupId, campusKey }: { groupId: string; campusKey: string }) {
  const [qrOpen, setQrOpen] = useState(false)
  const query = useQuery({
    queryKey: ['campus-outreach-summary', groupId],
    queryFn: async () => {
      const res = await campusOutreachSummaryAction(groupId)
      if (res.error || !res.data) throw new Error(res.error ?? 'Could not load outreach numbers')
      return res.data
    },
    staleTime: 30_000,
  })

  if (query.isLoading) {
    return (
      <div className="flex justify-center py-10">
        <LoadingSpinner />
      </div>
    )
  }
  if (query.error || !query.data) {
    return <p className="dashboard-panel p-5 text-sm text-red-700 dark:text-red-300">{query.error?.message ?? 'Could not load outreach numbers'}</p>
  }
  const { summary, total, qrUrl, campus } = query.data
  const href = `/outreach?campus=${encodeURIComponent(campusKey)}`

  return (
    <section className="grid min-w-0 grid-cols-1 gap-4">
      <div className="min-w-0">
        <h2 className="app-section-title">Sunday outreach</h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          {shortDay(summary.day)}. {total} {total === 1 ? 'person' : 'people'} on the outreach list in all.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-3">
        <StatCard label="Met" value={summary.met} sub="On campus that Sunday" href={href} />
        <StatCard label="Bible study: yes" value={summary.bibleStudy} sub="Said yes on the form" href={href} />
        <StatCard label="Not assigned" value={summary.unassigned} tone={summary.unassigned > 0 ? 'warning' : 'default'} sub="Nobody following up yet" href={href} />
      </div>
      <div className="grid min-w-0 grid-cols-1 gap-2 sm:flex sm:flex-wrap">
        <Button asChild className="h-12 sm:h-11">
          <Link href={href}>Open outreach</Link>
        </Button>
        {qrUrl ? (
          <Button type="button" variant="outline" className="h-12 sm:h-11" onClick={() => setQrOpen(true)}>
            <QrCode className="mr-2 h-4 w-4" aria-hidden />
            Show my QR code
          </Button>
        ) : null}
      </div>
      <OutreachQrSheet open={qrOpen} onOpenChange={setQrOpen} url={qrUrl} campusName={campus.name} campusLabel={campus.label} />
    </section>
  )
}
