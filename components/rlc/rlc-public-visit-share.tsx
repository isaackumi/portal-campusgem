'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { getRlcPublicVisitUrl, RLC_PUBLIC_VISIT_PATH } from '@/lib/constants/rlc'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Copy, ExternalLink } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

type Props = {
  className?: string
}

export function RlcPublicVisitShare({ className }: Props) {
  const { toast } = useToast()
  const visitUrl = useMemo(() => getRlcPublicVisitUrl(), [])

  function copyLink() {
    void navigator.clipboard.writeText(visitUrl)
    toast({ title: 'Public registration link copied' })
  }

  return (
    <Card className={className ?? 'border-sky-100 bg-sky-50/40'}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Share with guests</CardTitle>
        <CardDescription>
          Send this link or QR poster so visitors can register themselves — no staff sign-in required.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <p className="min-w-0 flex-1 break-all text-sm text-muted-foreground">{visitUrl}</p>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={copyLink}>
            <Copy className="mr-2 h-4 w-4" />
            Copy link
          </Button>
          <Button type="button" variant="outline" size="sm" asChild>
            <Link href={RLC_PUBLIC_VISIT_PATH} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              Open form
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
