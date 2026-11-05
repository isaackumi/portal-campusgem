'use client'

import { PageHeader } from '@/components/layout/page-header'
import { AccessDenied } from '@/components/auth/access-denied'
import { LoadingSpinner } from '@/components/ui/loading'
import { useAuth } from '@/components/providers'
import { EventForm } from '@/components/events/event-form'

export default function NewEventPage() {
  const { loading, can } = useAuth()
  if (loading) return <LoadingSpinner />
  if (!can('groups.manage')) return <AccessDenied permission="groups.manage" />
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="Events" title="New event" description="Save as a draft, then publish when you're ready to invite people." />
      <EventForm />
    </div>
  )
}
