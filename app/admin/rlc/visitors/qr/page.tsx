'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import QRCode from 'react-qr-code'
import { RLC_NAME, RLC_PUBLIC_VISIT_PATH, getRlcPublicVisitUrl } from '@/lib/constants/rlc'
import { PageContainer } from '@/components/layout/page-container'
import { RlcPageHeader } from '@/components/rlc/rlc-page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Copy, Printer } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function RlcVisitorQrPage() {
  const { toast } = useToast()
  const visitUrl = useMemo(() => getRlcPublicVisitUrl(), [])

  function copyLink() {
    void navigator.clipboard.writeText(visitUrl)
    toast({ title: 'Link copied' })
  }

  function printPoster() {
    window.print()
  }

  return (
    <>
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #rlc-qr-print,
          #rlc-qr-print * {
            visibility: visible;
          }
          #rlc-qr-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 2rem;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <PageContainer size="sm" className="no-print">
        <RlcPageHeader
          title="Visitor QR Code"
          subtitle="Print or display this code so guests can register without signing in."
          backHref="/admin/rlc/visitors"
          actions={
            <>
              <Button variant="outline" className="w-full sm:w-auto" onClick={copyLink}>
                <Copy className="mr-2 h-4 w-4" />
                Copy link
              </Button>
              <Button className="w-full bg-rose-700 hover:bg-rose-800 sm:w-auto" onClick={printPoster}>
                <Printer className="mr-2 h-4 w-4" />
                Print poster
              </Button>
            </>
          }
        />

        <Card id="rlc-qr-print" className="border-rose-100/80">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">{RLC_NAME}</CardTitle>
            <CardDescription>Scan to register as a visitor</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6 pb-10">
            <div className="rounded-2xl border-8 border-white bg-white p-4 shadow-lg">
              <QRCode value={visitUrl} size={220} />
            </div>
            <div className="max-w-sm text-center">
              <p className="text-lg font-semibold text-slate-900">First time with us?</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Scan with your phone camera to share your details. Our welcome team will follow up with you.
              </p>
              <p className="mt-4 break-all text-xs text-muted-foreground">{visitUrl}</p>
            </div>
          </CardContent>
        </Card>

        <p className="text-sm text-muted-foreground">
          Public form URL:{' '}
          <Link href={RLC_PUBLIC_VISIT_PATH} className="text-rose-700 underline-offset-2 hover:underline">
            {RLC_PUBLIC_VISIT_PATH}
          </Link>
        </p>
      </PageContainer>
    </>
  )
}
