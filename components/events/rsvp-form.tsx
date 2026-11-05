'use client'

import { useState, useTransition } from 'react'
import { CalendarDays, MapPin, Users } from 'lucide-react'
import { respondPublicRsvpAction, type PublicRsvpView } from '@/lib/actions/events'
import {
  RESPONSE_LABELS,
  capacityLeft,
  formatEventWhen,
  maxGuestsAllowed,
  rsvpClosedReason,
  type RsvpResponse,
} from '@/lib/events/rsvp'
import { RSVP_CHOICES, RsvpChoices } from '@/components/events/rsvp-choices'
import { cn } from '@/lib/utils'

const THANKS: Record<RsvpResponse, string> = {
  yes: "Wonderful! We can't wait to see you.",
  maybe: 'Thanks for letting us know. Tap your link again when you decide.',
  no: "We'll miss you. Thank you for telling us.",
}

export function RsvpForm({ token, initial }: { token: string; initial: PublicRsvpView }) {
  const [view, setView] = useState(initial)
  const [editing, setEditing] = useState(!initial.response)
  const [guests, setGuests] = useState(initial.response === 'yes' ? initial.guests : 0)
  const [pending, setPending] = useState<RsvpResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, startTransition] = useTransition()

  const { event } = view
  const closed = rsvpClosedReason(event)
  const maxGuests = maxGuestsAllowed(event.capacity, view.others_headcount)
  const left = capacityLeft(event.capacity, view.others_headcount)
  // Full for this person only if even they alone wouldn't fit (an existing yes keeps its place).
  const full = left === 0
  const chosen = view.response ? RSVP_CHOICES.find((c) => c.id === view.response) : null

  function choose(response: RsvpResponse) {
    setError(null)
    setPending(response)
    startTransition(async () => {
      const res = await respondPublicRsvpAction({ token, response, guests: response === 'yes' ? guests : 0 })
      setPending(null)
      if (res.view) setView(res.view)
      if (!res.ok) {
        setError(res.error ?? 'Something went wrong. Please try again.')
        return
      }
      setEditing(false)
    })
  }

  return (
    <div>
      <p className="app-overline">You&apos;re invited</p>
      <h1 className="app-page-title mt-1 text-[26px] leading-tight text-slate-900 dark:text-white">Hi {view.first_name}!</h1>
      <div className="mt-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
        <p className="text-[17px] font-semibold tracking-tight text-slate-900 dark:text-white">{event.title}</p>
        {event.description ? (
          <p className="mt-1 whitespace-pre-line text-sm text-slate-600 dark:text-slate-300">{event.description}</p>
        ) : null}
        <ul className="mt-3 space-y-1.5 text-sm text-slate-700 dark:text-slate-200">
          <li className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" aria-hidden />
            {formatEventWhen(event.starts_at, event.ends_at)}
          </li>
          {event.location ? (
            <li className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" aria-hidden />
              {event.location}
            </li>
          ) : null}
          {left != null && !closed ? (
            <li className="flex items-center gap-2">
              <Users className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" aria-hidden />
              {full ? 'This event is full' : `${left} place${left === 1 ? '' : 's'} left`}
            </li>
          ) : null}
        </ul>
      </div>

      {closed === 'cancelled' ? (
        <p className="mt-6 rounded-xl bg-red-50 p-4 text-[15px] text-red-800 dark:bg-red-500/10 dark:text-red-200">
          This event has been cancelled. Sorry for any inconvenience.
        </p>
      ) : closed ? (
        <p className="mt-6 text-[15px] text-slate-600 dark:text-slate-300">
          RSVPs are closed.
          {chosen ? (
            <>
              {' '}Your answer: <span className="font-semibold text-slate-900 dark:text-white">{RESPONSE_LABELS[chosen.id]}</span>.
            </>
          ) : null}
        </p>
      ) : !editing && chosen ? (
        <div className="mt-6 text-center" role="status" aria-live="polite">
          <span className={cn('mx-auto flex h-14 w-14 items-center justify-center rounded-full', chosen.active)}>
            <chosen.icon className="h-7 w-7" aria-hidden />
          </span>
          <p className="mt-3 text-lg font-semibold text-slate-900 dark:text-white">Thank you!</p>
          <p className="mt-1 text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">
            Your answer: <span className="font-semibold text-slate-900 dark:text-white">{chosen.label}</span>
            {chosen.id === 'yes' && view.guests ? ` (+${view.guests} guest${view.guests === 1 ? '' : 's'})` : ''}. {THANKS[chosen.id]}
          </p>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="mt-5 inline-flex h-11 items-center rounded-lg px-4 text-[15px] font-medium text-brand-700 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-500/10"
          >
            Change my answer
          </button>
        </div>
      ) : (
        <div className="mt-6">
          <h2 className="app-section-title mb-3 text-slate-900 dark:text-white">Can you come?</h2>
          <RsvpChoices
            guests={Math.min(guests, maxGuests)}
            maxGuests={maxGuests}
            full={full}
            pending={pending}
            busy={busy}
            onGuests={setGuests}
            onChoose={choose}
          />
          {full ? (
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              All places are taken. You can still answer Maybe and we&apos;ll be in touch if a place opens.
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          ) : null}
          {chosen && editing ? (
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="mt-3 block text-sm text-slate-500 hover:underline dark:text-slate-400"
            >
              Keep my answer ({chosen.label})
            </button>
          ) : null}
        </div>
      )}
    </div>
  )
}
