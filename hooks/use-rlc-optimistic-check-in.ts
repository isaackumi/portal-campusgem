'use client'

import { useCallback, useRef, useState } from 'react'
import { deleteRlcAttendanceAction, recordRlcAttendanceAction } from '@/lib/actions/rlc'
import type { RlcAttendancePerson } from '@/lib/rlc/attendance-roster'
import {
  buildOptimisticAttendanceRecord,
  isOptimisticAttendanceId,
  personKeyFromAttendance,
  removeAttendanceForPersonKey,
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
  const dismissedKeysRef = useRef<Set<string>>(new Set())

  const checkIn = useCallback(
    async (person: RlcAttendancePerson, method: Attendance['method'] = 'admin') => {
      if (!userId) {
        toast({ variant: 'destructive', title: 'Sign in required' })
        return
      }
      if (inFlightRef.current.has(person.key)) return

      dismissedKeysRef.current.delete(person.key)
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

        if (dismissedKeysRef.current.has(person.key)) {
          dismissedKeysRef.current.delete(person.key)
          if (!isOptimisticAttendanceId(data.attendance.id)) {
            void deleteRlcAttendanceAction(data.attendance.id)
          }
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

  const removeFromSession = useCallback(
    async (row: Attendance): Promise<{ error: string | null }> => {
      const personKey = personKeyFromAttendance(row)
      if (personKey) {
        dismissedKeysRef.current.add(personKey)
        inFlightRef.current.delete(personKey)
        setPendingKeys((prev) => {
          const next = new Set(prev)
          next.delete(personKey)
          return next
        })
      }

      setAttendance((prev) =>
        personKey ? removeAttendanceForPersonKey(prev, personKey) : prev.filter((r) => r.id !== row.id)
      )

      if (isOptimisticAttendanceId(row.id)) {
        return { error: null }
      }

      const { error } = await deleteRlcAttendanceAction(row.id)
      if (error) {
        if (personKey) dismissedKeysRef.current.delete(personKey)
        return { error }
      }
      return { error: null }
    },
    [setAttendance]
  )

  return { checkIn, removeFromSession, pendingKeys, lastCheckedIn }
}
