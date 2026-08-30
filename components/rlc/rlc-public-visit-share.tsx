'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import {
  getRlcPublicJoinUrl,
  getRlcPublicVisitUrl,
  RLC_PUBLIC_JOIN_PATH,
  RLC_PUBLIC_VISIT_PATH,
} from '@/lib/constants/rlc'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Copy, ExternalLink } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

type Props = {
  className?: string
  kind?: 'visit' | 'join'
}

export function RlcPublicVisitShare({ className, kind = 'visit' }: Props) {
  const { toast } = useToast()
  const isJoin = kind === 'join'
  const visitUrl = useMemo(
    () => (isJoin ? getRlcPublicJoinUrl() : getRlcPublicVisitUrl()),
    [isJoin]
  )
  const path = isJoin ? RLC_PUBLIC_JOIN_PATH : RLC_PUBLIC_VISIT_PATH

  function copyLink() {
    void navigator.clipboard.writeText(visitUrl)
    toast({ title: isJoin ? 'Public member form link copied' : 'Public registration link copied' })
  }

  return (
    <Card className={className ?? 'border-sky-100 bg-sky-50/40'}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{isJoin ? 'Share member form' : 'Share with guests'}</CardTitle>
        <CardDescription>
          {isJoin
            ? 'Send this link so people can register themselves as members — no staff sign-in required. Role defaults to member.'
            : 'Send this link or QR poster so visitors can register themselves — no staff sign-in required.'}
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
            <Link href={path} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              Open form
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
