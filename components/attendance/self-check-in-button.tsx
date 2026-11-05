'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { AlertTriangle, CalendarDays, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { selfCheckInAction } from '@/lib/actions/self-check-in'
import { CHECKIN_SESSION_STATE_MESSAGES } from '@/lib/attendance/checkin-session'

function timeOf(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function dateOf(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00`)
  return Number.isNaN(d.getTime())
    ? isoDate
    : d.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })
}

type Props = {
  token: string
  firstName: string
  service: string
  serviceDate: string
  congregation: string
  initialCheckedInAt: string | null
}

export function SelfCheckInButton({ token, firstName, service, serviceDate, congregation, initialCheckedInAt }: Props) {
  const [checkedInAt, setCheckedInAt] = useState<string | null>(initialCheckedInAt)
  const [justNow, setJustNow] = useState(false)
  const [closedMessage, setClosedMessage] = useState<{ title: string; body: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function checkIn() {
    setError(null)
    startTransition(async () => {
      try {
        const res = await selfCheckInAction(token)
        if (res.status === 'recorded' || res.status === 'already') {
          setCheckedInAt(res.check_in_time)
          setJustNow(res.status === 'recorded')
        } else if (res.status === 'closed' || res.status === 'expired' || res.status === 'not_open_yet') {
          setClosedMessage(CHECKIN_SESSION_STATE_MESSAGES[res.status])
        } else if (res.status === 'not_found') {
          setError('We could not find this check-in. Scan the code on display again.')
        } else {
          setError('error' in res ? res.error : 'Could not check you in. Please try again.')
        }
      } catch {
        setError('Could not reach the server. Check your connection and try again.')
      }
    })
  }

  const details = (
    <p className="mt-2 flex items-center justify-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
      <CalendarDays className="h-4 w-4" aria-hidden />
      {service} · {dateOf(serviceDate)} · {congregation}
    </p>
  )

  if (closedMessage) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
          <AlertTriangle className="h-6 w-6" aria-hidden />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{closedMessage.title}</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{closedMessage.body}</p>
      </div>
    )
  }

  if (checkedInAt) {
    return (
      <div className="text-center" aria-live="polite">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
          <Check className="h-8 w-8" aria-hidden />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {justNow ? `Welcome, ${firstName}!` : 'You’re already checked in'}
        </h1>
        <p className="mt-2 text-base text-slate-700 dark:text-slate-200">
          {justNow ? 'You’re checked in' : 'We have you down'}
          {timeOf(checkedInAt) ? ` at ${timeOf(checkedInAt)}` : ''}.
        </p>
        {details}
        <Button asChild variant="outline" className="mt-6 h-11 w-full">
          <Link href="/dashboard">Go to the app</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="text-center">
      <p className="app-overline">Self check-in</p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Hi {firstName}</h1>
      {details}
      <Button
        type="button"
        onClick={checkIn}
        disabled={isPending}
        className="mt-6 h-14 w-full text-lg font-semibold"
      >
        {isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden /> : <Check className="mr-2 h-5 w-5" aria-hidden />}
        I’m here
      </Button>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
      <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">This checks in you only, on your own account.</p>
    </div>
  )
}
