'use client'

import { use, useEffect, useState } from 'react'
import { PageHeader } from '@/components/layout/page-header'
import { AccessDenied } from '@/components/auth/access-denied'
import { LoadingSpinner } from '@/components/ui/loading'
import { useAuth } from '@/components/providers'
import { EventForm } from '@/components/events/event-form'
import { getEventAction } from '@/lib/actions/events'
import type { ChurchEvent } from '@/lib/events/rsvp'

export default function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { loading, can } = useAuth()
  const allowed = can('groups.manage')
  const [event, setEvent] = useState<ChurchEvent | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!allowed) return
    getEventAction(id).then((res) => (res.data ? setEvent(res.data.event) : setError(res.error)))
  }, [allowed, id])

  if (loading) return <LoadingSpinner />
  if (!allowed) return <AccessDenied permission="groups.manage" />
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="Events" title="Edit event" />
      {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : event ? <EventForm event={event} /> : <LoadingSpinner />}
    </div>
  )
}
