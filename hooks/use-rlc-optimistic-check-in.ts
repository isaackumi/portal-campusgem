'use client'

import { useCallback, useRef, useState } from 'react'
import { recordRlcAttendanceAction } from '@/lib/actions/rlc'
import type { RlcAttendancePerson } from '@/lib/rlc/attendance-roster'
import {
  buildOptimisticAttendanceRecord,
  removeOptimisticAttendanceForPerson,
  upsertAttendanceRecord,
} from '@/lib/rlc/optimistic-check-in'
import { recordArgsFromSelection, type RlcServiceSelection } from '@/lib/rlc/service-selection'
import type { Attendance } from '@/lib/types'

type CheckInToast = (args: {
  variant?: 'destructive'
  title: string
  description?: string
}) => void

export function useRlcOptimisticCheckIn(options: {
  userId: string | undefined
  serviceDate: string
  serviceSelection: RlcServiceSelection
  setAttendance: React.Dispatch<React.SetStateAction<Attendance[]>>
  toast: CheckInToast
  onCheckedIn?: (person: RlcAttendancePerson) => void
}) {
  const { userId, serviceDate, serviceSelection, setAttendance, toast, onCheckedIn } = options
  const [pendingKeys, setPendingKeys] = useState<Set<string>>(() => new Set())
  const [lastCheckedIn, setLastCheckedIn] = useState<string | null>(null)
  const inFlightRef = useRef<Set<string>>(new Set())

  const checkIn = useCallback(
    async (person: RlcAttendancePerson, method: Attendance['method'] = 'admin') => {
      if (!userId) {
        toast({ variant: 'destructive', title: 'Sign in required' })
        return
      }
      if (inFlightRef.current.has(person.key)) return

      inFlightRef.current.add(person.key)
      setPendingKeys((prev) => new Set(prev).add(person.key))

      const optimistic = buildOptimisticAttendanceRecord({
        person,
        serviceDate,
        selection: serviceSelection,
        method,
        createdBy: userId,
        status: 'present',
      })

      setAttendance((prev) => upsertAttendanceRecord(prev, optimistic))
      setLastCheckedIn(person.name)
      onCheckedIn?.(person)

      const recordArgs = recordArgsFromSelection(serviceSelection)
      try {
        const { data, error } = await recordRlcAttendanceAction({
          memberId: person.kind === 'member' ? person.memberId : undefined,
          visitorId: person.kind === 'visitor' ? person.visitorId : undefined,
          serviceDate,
          ...recordArgs,
          method,
          createdBy: userId,
          status: 'present',
        })

        if (error || !data) {
          setAttendance((prev) => removeOptimisticAttendanceForPerson(prev, person))
          toast({ variant: 'destructive', title: 'Check-in failed', description: error ?? 'Try again' })
          return
        }

        setAttendance((prev) => upsertAttendanceRecord(prev, data.attendance))
        if (data.already_checked_in) {
          toast({ title: 'Already checked in', description: person.name })
        }
      } finally {
        inFlightRef.current.delete(person.key)
        setPendingKeys((prev) => {
          const next = new Set(prev)
          next.delete(person.key)
          return next
        })
      }
    },
    [userId, serviceDate, serviceSelection, setAttendance, toast, onCheckedIn]
  )

  return { checkIn, pendingKeys, lastCheckedIn }
}
