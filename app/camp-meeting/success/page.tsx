'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, Home, Share2 } from 'lucide-react'
import { Suspense, useMemo } from 'react'
import QRCode from 'react-qr-code'
import { WhatsappLogo } from '@/components/icons/whatsapp-logo'
import { buildCampRegistrationInviteShareUrl } from '@/lib/forms/whatsapp-share'
import {
  campQrDisplayName,
  campQrDisplayRole,
  parseCampQrPayload,
} from '@/lib/camp/qr-payload'

function SuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const name = searchParams.get('name')
  const registrationId = searchParams.get('id')
  const qrCode = searchParams.get('qr')
  const registerUrlParam = searchParams.get('register')
  const campLabel = searchParams.get('camp')

  const registrationUrl = useMemo(() => {
    if (registerUrlParam) {
      try {
        return decodeURIComponent(registerUrlParam)
      } catch {
        return registerUrlParam
      }
    }
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/camp-meeting/register`
    }
    return '/camp-meeting/register'
  }, [registerUrlParam])

  const qrPayload = useMemo(() => parseCampQrPayload(qrCode), [qrCode])
  const displayName = campQrDisplayName(qrPayload, name)
  const displayRole = campQrDisplayRole(qrPayload, searchParams.get('role'))

  const whatsappInviteHref = useMemo(
    () =>
      buildCampRegistrationInviteShareUrl({
        registrantName: name ?? 'I',
        registrationUrl,
        campLabel: campLabel ?? undefined,
      }),
    [name, registrationUrl, campLabel]
  )

  if (!registrationId) {
    return (
      <div className="text-center px-4">
        <h2 className="text-xl text-red-500">Invalid Registration Data</h2>
        <Button
          onClick={() => router.push('/camp-meeting/register')}
          className="mt-4 min-h-11 w-full max-w-xs"
        >
          Back to Registration
        </Button>
      </div>
    )
  }

  return (
    <Card className="w-full max-w-md border-0 shadow-lg sm:border sm:shadow-md">
      <CardHeader className="pb-2">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <CardTitle className="text-2xl text-green-700">Registration Successful!</CardTitle>
        <CardDescription className="text-base">
          Welcome{name ? `, ${name}` : ''}! We are excited to have you at the camp meeting.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <p className="text-center text-sm text-gray-700 sm:text-base">
          Your registration has been confirmed successfully.
        </p>

        {qrCode ? (
          <div className="space-y-3 text-center">
            <p className="text-sm text-gray-600">Present this QR code at check-in.</p>
            <div className="mx-auto w-fit rounded-xl border bg-white p-4 shadow-sm">
              <QRCode value={qrCode} size={Math.min(192, typeof window !== 'undefined' ? window.innerWidth - 120 : 192)} />
            </div>
            {(displayName || displayRole) && (
              <div className="space-y-0.5">
                {displayName ? (
                  <p className="text-base font-semibold text-gray-900">{displayName}</p>
                ) : null}
                {displayRole ? (
                  <p className="text-sm text-gray-600">{displayRole}</p>
                ) : null}
              </div>
            )}
          </div>
        ) : (
          <p className="text-center text-sm text-gray-600">
            You will receive your QR code and registration details upon arrival at the camp meeting.
          </p>
        )}

        <div className="space-y-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
          <p className="text-sm font-medium text-emerald-900">Tell friends to register</p>
          <p className="text-xs text-emerald-800/90">
            Share on WhatsApp so others know you&apos;ve signed up and can register too.
          </p>
          <Button
            className="min-h-11 w-full gap-2 bg-[#25D366] text-white hover:bg-[#1da851]"
            asChild
          >
            <a href={whatsappInviteHref} target="_blank" rel="noopener noreferrer">
              <WhatsappLogo className="h-5 w-5" />
              Share on WhatsApp
              <Share2 className="ml-1 h-4 w-4 opacity-80" />
            </a>
          </Button>
        </div>

        <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:justify-center">
          <Button
            variant="outline"
            onClick={() => router.push('/camp-meeting/register')}
            className="min-h-11 flex-1"
          >
            Register Another Person
          </Button>
          <Button variant="outline" onClick={() => router.push('/')} className="min-h-11 flex-1">
            <Home className="mr-2 h-4 w-4" />
            Home
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function SuccessPage() {
  return (
    <div
      className="flex min-h-[100dvh] items-center justify-center bg-gray-50 p-4 pt-[max(1rem,env(safe-area-inset-top))]"
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <SuccessContent />
      </Suspense>
    </div>
  )
}
