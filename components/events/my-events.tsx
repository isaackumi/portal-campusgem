'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { CalendarDays, MapPin } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { listMyEventsAction, respondMyEventAction } from '@/lib/actions/events'
import type { MyEvent } from '@/lib/convex/events-bridge'
import {
  RESPONSE_LABELS,
  capacityLeft,
  formatEventWhen,
  maxGuestsAllowed,
  rsvpClosedReason,
  type RsvpResponse,
} from '@/lib/events/rsvp'
import { RsvpChoices } from '@/components/events/rsvp-choices'
import { cn } from '@/lib/utils'

const RESPONSE_TONE: Record<RsvpResponse, 'success' | 'warning' | 'secondary'> = {
  yes: 'success',
  maybe: 'warning',
  no: 'secondary',
}

/**
 * The signed-in member's upcoming published events with their RSVP, answerable in place.
 * Renders nothing when they have no upcoming invitations (so it can sit on any page).
 */
export function MyEvents({ className, title = 'Your events' }: { className?: string; title?: string }) {
  const [events, setEvents] = useState<MyEvent[] | null>(null)

  const load = useCallback(async () => {
    const res = await listMyEventsAction().catch(() => null)
    setEvents(res?.data ?? [])
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (!events || events.length === 0) return null

  return (
    <section className={cn('dashboard-panel p-5', className)} aria-labelledby="my-events-title">
      <h2 id="my-events-title" className="app-section-title mb-3">
        {title}
      </h2>
      <ul className="space-y-3">
        {events.map((e) => (
          <MyEventCard key={e.event_id} event={e} onChanged={load} />
        ))}
      </ul>
    </section>
  )
}

function MyEventCard({ event, onChanged }: { event: MyEvent; onChanged: () => Promise<void> }) {
  const [editing, setEditing] = useState(!event.response)
  const [guests, setGuests] = useState(event.response === 'yes' ? event.guests : 0)
  const [pending, setPending] = useState<RsvpResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, startTransition] = useTransition()
  const closed = rsvpClosedReason(event)
  const left = capacityLeft(event.capacity, event.others_headcount)
  const maxGuests = maxGuestsAllowed(event.capacity, event.others_headcount)

  function choose(response: RsvpResponse) {
    setError(null)
    setPending(response)
    startTransition(async () => {
      const res = await respondMyEventAction({ event_id: event.event_id, response, guests: response === 'yes' ? guests : 0 })
      setPending(null)
      if (!res.ok) {
        setError(res.error ?? 'Could not save your answer.')
        return
      }
      setEditing(false)
      await onChanged()
    })
  }

  return (
    <li className="rounded-xl border border-neutral-200/80 p-4 dark:border-white/[0.06]">
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold text-neutral-900 dark:text-white">{event.title}</p>
        {event.response ? (
          <Badge variant={RESPONSE_TONE[event.response]}>
            {RESPONSE_LABELS[event.response]}
            {event.response === 'yes' && event.guests ? ` +${event.guests}` : ''}
          </Badge>
        ) : (
          <Badge variant="brand">Please reply</Badge>
        )}
      </div>
      <p className="mt-1 flex items-center gap-1.5 text-sm text-neutral-600 dark:text-neutral-300">
        <CalendarDays className="h-4 w-4 shrink-0 text-neutral-400 dark:text-neutral-500" aria-hidden />
        {formatEventWhen(event.starts_at, event.ends_at)}
      </p>
      {event.location ? (
        <p className="mt-0.5 flex items-center gap-1.5 text-sm text-neutral-600 dark:text-neutral-300">
          <MapPin className="h-4 w-4 shrink-0 text-neutral-400 dark:text-neutral-500" aria-hidden />
          {event.location}
        </p>
      ) : null}

      {closed ? (
        <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">RSVPs are closed.</p>
      ) : editing ? (
        <div className="mt-3">
          <RsvpChoices
            size="sm"
            guests={Math.min(guests, maxGuests)}
            maxGuests={maxGuests}
            full={left === 0}
            pending={pending}
            busy={busy}
            onGuests={setGuests}
            onChoose={choose}
          />
          {error ? (
            <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          ) : null}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mt-2 inline-flex h-10 items-center text-sm font-medium text-brand-700 hover:underline dark:text-brand-300"
        >
          Change my answer
        </button>
      )}
    </li>
  )
}
