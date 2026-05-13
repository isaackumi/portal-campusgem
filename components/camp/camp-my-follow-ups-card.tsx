'use client'

import { useMemo } from 'react'
import type { CampRegistration } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { UserCheck } from 'lucide-react'

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
      <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-amber-900 text-lg">
            <UserCheck className="h-5 w-5" />
            My follow-ups
          </CardTitle>
          <CardDescription className="text-amber-800">
            Campers assigned to you for outreach
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-amber-900/80">
            You have no open follow-ups for the active camp year.
          </p>
          <Button variant="outline" className="mt-4 border-amber-300" onClick={onOpenQueue}>
            Open follow-up queue
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-amber-900 text-lg">
              <UserCheck className="h-5 w-5" />
              My follow-ups
            </CardTitle>
            <CardDescription className="text-amber-800">
              {open.length} open assignment{open.length === 1 ? '' : 's'} for this camp year
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" className="border-amber-300" onClick={onOpenQueue}>
            View queue
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="border-amber-300 bg-white text-amber-900">
            {pending.length} pending
          </Badge>
          <Badge variant="outline" className="border-amber-300 bg-white text-amber-900">
            {inProgress.length} in progress
          </Badge>
        </div>
        <div className="space-y-2">
          {open.slice(0, 5).map((registration) => (
            <button
              key={registration.id}
              type="button"
              onClick={() => onOpenRegistration(registration.id)}
              className="flex w-full items-center justify-between rounded-lg border border-amber-200 bg-white px-3 py-2 text-left transition hover:border-amber-300 hover:bg-amber-50"
            >
              <div>
                <p className="text-sm font-semibold text-gray-900">{registration.full_name}</p>
                <p className="text-xs text-gray-500">{registration.phone}</p>
              </div>
              <Badge variant="secondary" className="capitalize">
                {(registration.follow_up_status ?? 'pending').replace('_', ' ')}
              </Badge>
            </button>
          ))}
        </div>
        {open.length > 5 ? (
          <p className="text-xs text-amber-800">
            Showing 5 of {open.length}. Open the queue for the full list.
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
