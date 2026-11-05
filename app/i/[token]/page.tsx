import { redirect } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'
import { getSessionUser } from '@/lib/auth/server-session'
import { ConfirmLinkShell } from '@/components/camp/confirm/confirm-link-shell'
import { SelfCheckInButton } from '@/components/attendance/self-check-in-button'
import {
  CHECKIN_SESSION_STATE_MESSAGES,
  isCheckinSessionTokenFormat,
  selfCheckInPath,
} from '@/lib/attendance/checkin-session'
import { SERVICE_TYPE_LABELS } from '@/lib/constants/service-types'

function serviceLabel(type: string): string {
  return (SERVICE_TYPE_LABELS as Record<string, string>)[type] ?? 'Service'
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
        <AlertTriangle className="h-6 w-6" aria-hidden />
      </div>
      <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{title}</h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{body}</p>
    </div>
  )
}

export default async function SelfCheckInPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const notFoundNotice = (
    <ConfirmLinkShell>
      <Notice
        title="We could not find this check-in"
        body="The code may be mistyped or out of date. Scan the code on display at the entrance, or ask an usher."
      />
    </ConfirmLinkShell>
  )
  if (!isCheckinSessionTokenFormat(token)) return notFoundNotice

  // The page itself requires sign-in (middleware also sends signed-out visitors to /auth).
  const user = await getSessionUser()
  if (!user) redirect(`/auth?redirect=${encodeURIComponent(selfCheckInPath(token))}`)

  const { getSelfCheckInViewFromConvex } = await import('@/lib/convex/checkin-bridge')
  const view = await getSelfCheckInViewFromConvex(token, user.id)
  if (!view) return notFoundNotice

  const { session, checked_in_at } = view
  const firstName = (user.first_name || user.full_name || '').trim().split(/\s+/)[0] || 'there'

  return (
    <ConfirmLinkShell>
      {session.state !== 'open' && !checked_in_at ? (
        <Notice {...CHECKIN_SESSION_STATE_MESSAGES[session.state]} />
      ) : (
        <SelfCheckInButton
          token={token}
          firstName={firstName}
          service={session.title || serviceLabel(session.service_type)}
          serviceDate={session.service_date}
          congregation={session.congregation === 'rlc' ? 'RLC' : 'Campus Gem'}
          initialCheckedInAt={checked_in_at}
        />
      )}
    </ConfirmLinkShell>
  )
}
