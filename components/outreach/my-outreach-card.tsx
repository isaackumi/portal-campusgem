'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Megaphone, QrCode } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { OutreachQrSheet } from '@/components/outreach/qr-sheet'
import { myOutreachSummaryAction } from '@/lib/actions/outreach'

/** My GEM: campus members get their outreach QR and follow-up count. Hidden when on no campus. */
export function MyOutreachCard() {
  const [qrOpen, setQrOpen] = useState(false)
  const query = useQuery({
    queryKey: ['my-outreach'],
    queryFn: async () => {
      const res = await myOutreachSummaryAction()
      if (res.error) throw new Error(res.error)
      return res.data
    },
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  })
  const data = query.data
  if (!data) return null
  const href = `/outreach?campus=${encodeURIComponent(data.campus.key)}`

  return (
    <section className="dashboard-panel grid min-w-0 grid-cols-1 gap-3 p-4 sm:p-5" data-tour="me-outreach">
      <h2 className="app-section-title flex items-center gap-2">
        <Megaphone className="h-4 w-4 text-neutral-400 dark:text-neutral-500" aria-hidden />
        Outreach on {data.campus.label}
      </h2>
      <div className="grid min-w-0 grid-cols-2 gap-2">
        <Button type="button" className="h-12 whitespace-normal px-2 leading-tight" onClick={() => setQrOpen(true)}>
          <QrCode className="mr-2 h-5 w-5 shrink-0" aria-hidden />
          Show QR
        </Button>
        <Button asChild variant="outline" className="h-12 whitespace-normal px-2 leading-tight">
          <Link href={href}>My follow-ups ({data.followUps})</Link>
        </Button>
      </div>
      <OutreachQrSheet open={qrOpen} onOpenChange={setQrOpen} url={data.qrUrl} campusName={data.campus.name} campusLabel={data.campus.label} />
    </section>
  )
}
