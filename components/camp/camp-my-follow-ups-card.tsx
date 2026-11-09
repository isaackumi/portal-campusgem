'use client'

import { useMemo } from 'react'
import { followUpStatusOf } from '@/convex/lib/states/campRegistration'
import type { CampRegistration } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PhoneLink, QuickContactButtons } from '@/components/contact/phone-link'
import { useCampFollowUpMessage } from '@/components/camp/use-camp-follow-up-message'

type CampMyFollowUpsCardProps = {
  userId: string
  registrations: CampRegistration[]
  onOpenQueue: () => void
  onOpenRegistration: (registrationId: string) => void
}

export function CampMyFollowUpsCard({
  userId,
  registrations,
  onOpenQueue,
  onOpenRegistration,
}: CampMyFollowUpsCardProps) {
  const followUpMessage = useCampFollowUpMessage()
  const assigned = useMemo(
    () =>
      registrations.filter(
        (registration) =>
          registration.assigned_to === userId &&
          followUpStatusOf(registration) !== 'completed'
      ),
    [registrations, userId]
  )

  const pending = assigned.filter((registration) => followUpStatusOf(registration) === 'pending')
  const inProgress = assigned.filter((registration) => registration.follow_up_status === 'in_progress')
  const open = [...pending, ...inProgress]

  if (open.length === 0) {
    return (
      <div className="dashboard-panel p-4 sm:p-5">
        <h2 className="app-section-title">My follow-ups</h2>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Nothing assigned to you for this camp year.
        </p>
        <Button variant="outline" className="mt-4 h-11 w-full sm:h-10 sm:w-auto" onClick={onOpenQueue}>
          Open follow-up queue
        </Button>
      </div>
    )
  }

  return (
    <div className="dashboard-panel p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="app-section-title">My follow-ups</h2>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {open.length} open assignment{open.length === 1 ? '' : 's'} for this camp year
          </p>
        </div>
        <Button size="sm" variant="outline" className="h-10 sm:h-9" onClick={onOpenQueue}>
          View queue
        </Button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Badge variant="warning">
          {pending.length} pending
        </Badge>
        <Badge variant="outline" className="border-neutral-200 text-neutral-700 dark:border-neutral-600 dark:text-neutral-200">
          {inProgress.length} in progress
        </Badge>
      </div>
      <div className="mt-4 divide-y divide-neutral-100 dark:divide-neutral-700">
        {open.slice(0, 5).map((registration) => (
          <div key={registration.id} className="flex min-h-11 w-full items-center gap-3 py-2.5">
            <div className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => onOpenRegistration(registration.id)}
                className="block w-full truncate text-left text-sm font-medium text-neutral-900 hover:text-brand-600 dark:text-neutral-100 dark:hover:text-brand-300"
              >
                {registration.full_name}
              </button>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                <PhoneLink phone={registration.phone} whatsapp={registration.whatsapp} name={registration.full_name} message={followUpMessage(registration)} />
                <Badge variant="secondary" className="capitalize">
                  {(registration.follow_up_status ?? 'pending').replace('_', ' ')}
                </Badge>
              </div>
            </div>
            <QuickContactButtons phone={registration.phone} whatsapp={registration.whatsapp} name={registration.full_name} message={followUpMessage(registration)} />
          </div>
        ))}
      </div>
      {open.length > 5 ? (
        <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
          Showing 5 of {open.length}. Open the queue for the full list.
        </p>
      ) : null}
    </div>
  )
}
