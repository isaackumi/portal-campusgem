'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, Copy, Home, Share2 } from 'lucide-react'
import { Suspense, useMemo } from 'react'
import QRCode from 'react-qr-code'
import { WhatsappLogo } from '@/components/icons/whatsapp-logo'
import { buildCampRegistrationInviteShareUrl } from '@/lib/forms/whatsapp-share'
import { buildCampRegistrationConfirmationShareUrl } from '@/lib/camp/whatsapp-share'
import {
  campQrDisplayName,
  campQrDisplayRole,
  parseCampQrPayload,
} from '@/lib/camp/qr-payload'
import { formatCampCheckInCodeForDisplay, resolveCampCheckInCode } from '@/lib/camp/check-in-code'
import { useToast } from '@/hooks/use-toast'

function SuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()

  const name = searchParams.get('name')
  const registrationId = searchParams.get('id')
  const qrCode = searchParams.get('qr')
  const codeParam = searchParams.get('code')
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
  const checkInCode = useMemo(() => {
    if (codeParam?.trim()) return formatCampCheckInCodeForDisplay(codeParam)
    return resolveCampCheckInCode({
      check_in_code: codeParam ?? undefined,
      qr_code: qrCode ?? '',
    })
  }, [codeParam, qrCode])

  const whatsappInviteHref = useMemo(
    () =>
      buildCampRegistrationInviteShareUrl({
        registrantName: name ?? 'I',
        registrationUrl,
        campLabel: campLabel ?? undefined,
      }),
    [name, registrationUrl, campLabel]
  )

  const whatsappMyDetailsHref = useMemo(() => {
    if (!checkInCode) return null
    return buildCampRegistrationConfirmationShareUrl({
      name: displayName ?? name ?? 'Camper',
      checkInCode,
      role: displayRole,
      campLabel: campLabel ?? undefined,
    })
  }, [checkInCode, displayName, displayRole, name, campLabel])

  async function copyCheckInCode() {
    if (!checkInCode) return
    try {
      await navigator.clipboard.writeText(checkInCode)
      toast({ title: 'Copied', description: 'Check-in code copied to clipboard.' })
    } catch {
      toast({ variant: 'destructive', title: 'Could not copy', description: 'Copy the code manually.' })
    }
  }

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
          Welcome{displayName ? `, ${displayName}` : ''}! We are excited to have you at the camp meeting.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <p className="text-center text-sm text-gray-700 sm:text-base">
          Your registration has been confirmed successfully.
        </p>

        {checkInCode ? (
          <div className="rounded-xl border-2 border-indigo-200 bg-indigo-50/80 p-4 text-center">
            <p className="text-xs font-medium uppercase tracking-wide text-indigo-800">
              Your camp check-in code
            </p>
            <p className="mt-1 font-mono text-2xl font-bold tracking-wider text-indigo-950">
              {checkInCode}
            </p>
            <p className="mt-2 text-xs text-indigo-900/80">
              Show this code, your QR, name, or phone at the gate — each person has their own code.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3 min-h-9 gap-1.5 border-indigo-300 bg-white"
              onClick={() => void copyCheckInCode()}
            >
              <Copy className="h-3.5 w-3.5" />
              Copy code
            </Button>
          </div>
        ) : null}

        {qrCode ? (
          <div className="space-y-3 text-center">
            <p className="text-sm text-gray-600">Or present this QR code at check-in.</p>
            <div className="mx-auto w-fit rounded-xl border bg-white p-4 shadow-sm">
              <QRCode
                value={qrCode}
                size={Math.min(192, typeof window !== 'undefined' ? window.innerWidth - 120 : 192)}
              />
            </div>
            {(displayName || displayRole) && (
              <div className="space-y-0.5">
                {displayName ? (
                  <p className="text-base font-semibold text-gray-900">{displayName}</p>
                ) : null}
                {displayRole ? <p className="text-sm text-gray-600">{displayRole}</p> : null}
              </div>
            )}
          </div>
        ) : (
          <p className="text-center text-sm text-gray-600">
            You will receive your QR code and registration details upon arrival at the camp meeting.
          </p>
        )}

        <div className="space-y-2">
          {whatsappMyDetailsHref ? (
            <Button
              className="min-h-11 w-full gap-2 bg-[#25D366] text-white hover:bg-[#1da851]"
              asChild
            >
              <a href={whatsappMyDetailsHref} target="_blank" rel="noopener noreferrer">
                <WhatsappLogo className="h-5 w-5" />
                Send my code on WhatsApp
              </a>
            </Button>
          ) : null}
          <div className="space-y-2 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
            <p className="text-sm font-medium text-emerald-900">Tell friends to register</p>
            <p className="text-xs text-emerald-800/90">
              Share on WhatsApp so others know you&apos;ve signed up and can register too.
            </p>
            <Button
              variant="outline"
              className="min-h-11 w-full gap-2 border-emerald-300 bg-white text-emerald-900 hover:bg-emerald-50"
              asChild
            >
              <a href={whatsappInviteHref} target="_blank" rel="noopener noreferrer">
                <WhatsappLogo className="h-5 w-5 text-[#25D366]" />
                Invite friends to register
                <Share2 className="ml-1 h-4 w-4 opacity-80" />
              </a>
            </Button>
          </div>
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
