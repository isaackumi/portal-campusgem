'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { CalendarDays, MapPin, Plus, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading'
import { PageHeader } from '@/components/layout/page-header'
import { AccessDenied } from '@/components/auth/access-denied'
import { useAuth } from '@/components/providers'
import { listEventsAction } from '@/lib/actions/events'
import type { EventWithTally } from '@/lib/convex/events-bridge'
import { capacityLeft, formatEventWhen } from '@/lib/events/rsvp'
import { EventStatusBadge } from '@/components/events/event-status-badge'

export default function EventsPage() {
  const { loading: authLoading, can } = useAuth()
  const [events, setEvents] = useState<EventWithTally[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const allowed = can('groups.manage')

  useEffect(() => {
    if (!allowed) return
    listEventsAction().then((res) => {
      if (res.error) setError(res.error)
      setEvents(res.data ?? [])
    })
  }, [allowed])

  const { upcoming, past } = useMemo(() => {
    const now = Date.now()
    const list = events ?? []
    return {
      upcoming: list.filter((e) => (e.ends_at ?? e.starts_at) >= now).sort((a, b) => a.starts_at - b.starts_at),
      past: list.filter((e) => (e.ends_at ?? e.starts_at) < now),
    }
  }, [events])

  if (authLoading) return <LoadingSpinner />
  if (!allowed) return <AccessDenied permission="groups.manage" />

  return (
    <div>
      <PageHeader
        title="Events"
        description="Invite people by SMS and see who's coming. Each person gets their own tap-to-RSVP link."
        actions={
          <Button asChild>
            <Link href="/admin/events/new">
              <Plus className="mr-2 h-4 w-4" aria-hidden />
              New event
            </Link>
          </Button>
        }
      />
      {error ? <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p> : null}
      {events == null ? (
        <LoadingSpinner />
      ) : events.length === 0 ? (
        <div className="dashboard-panel p-8 text-center">
          <CalendarDays className="mx-auto h-8 w-8 text-neutral-400 dark:text-neutral-500" aria-hidden />
          <p className="mt-3 font-medium text-neutral-900 dark:text-white">No events yet</p>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Create one, publish it, then text the invitations.</p>
          <Button asChild className="mt-4">
            <Link href="/admin/events/new">New event</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-8" data-tour="events-list">
          <EventList title="Upcoming" events={upcoming} empty="Nothing coming up." />
          {past.length ? <EventList title="Past" events={past} /> : null}
        </div>
      )}
    </div>
  )
}

function EventList({ title, events, empty }: { title: string; events: EventWithTally[]; empty?: string }) {
  return (
    <section>
      <h2 className="app-section-title mb-3">{title}</h2>
      {events.length === 0 ? (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">{empty}</p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {events.map((e) => {
            const left = capacityLeft(e.capacity, e.tally.headcount)
            return (
              <li key={e.id}>
                <Link
                  href={`/admin/events/${e.id}`}
                  className="dashboard-panel block p-5 transition-colors hover:border-brand-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 dark:hover:border-brand-400/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold text-neutral-900 dark:text-white">{e.title}</p>
                    <EventStatusBadge status={e.status} />
                  </div>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-neutral-600 dark:text-neutral-300">
                    <CalendarDays className="h-4 w-4 shrink-0 text-neutral-400 dark:text-neutral-500" aria-hidden />
                    {formatEventWhen(e.starts_at, e.ends_at)}
                  </p>
                  {e.location ? (
                    <p className="mt-0.5 flex items-center gap-1.5 text-sm text-neutral-600 dark:text-neutral-300">
                      <MapPin className="h-4 w-4 shrink-0 text-neutral-400 dark:text-neutral-500" aria-hidden />
                      {e.location}
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="success">
                      <Users className="h-3 w-3" aria-hidden />
                      {e.tally.headcount} coming
                    </Badge>
                    <Badge variant="secondary">{e.tally.maybe} maybe</Badge>
                    <Badge variant="secondary">{e.tally.noReply} no reply</Badge>
                    {left != null ? <Badge variant={left === 0 ? 'danger' : 'brand'}>{left === 0 ? 'Full' : `${left} places left`}</Badge> : null}
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
