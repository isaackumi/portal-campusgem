'use client'

import { useMemo } from 'react'
import type { CampRegistration } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

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
  const assigned = useMemo(
    () =>
      registrations.filter(
        (registration) =>
          registration.assigned_to === userId &&
          registration.follow_up_status !== 'completed'
      ),
    [registrations, userId]
  )

  const pending = assigned.filter((registration) => registration.follow_up_status === 'pending')
  const inProgress = assigned.filter((registration) => registration.follow_up_status === 'in_progress')
  const open = [...pending, ...inProgress]

  if (open.length === 0) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-800">
        <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">My follow-ups</h2>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Nothing assigned to you for this camp year.
        </p>
        <Button variant="outline" className="mt-4" onClick={onOpenQueue}>
          Open follow-up queue
        </Button>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-800">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">My follow-ups</h2>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {open.length} open assignment{open.length === 1 ? '' : 's'} for this camp year
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={onOpenQueue}>
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
          <button
            key={registration.id}
            type="button"
            onClick={() => onOpenRegistration(registration.id)}
            className="flex w-full items-center justify-between gap-3 py-3 text-left"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">{registration.full_name}</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">{registration.phone}</p>
            </div>
            <Badge variant="secondary" className="shrink-0 capitalize">
              {(registration.follow_up_status ?? 'pending').replace('_', ' ')}
            </Badge>
          </button>
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
