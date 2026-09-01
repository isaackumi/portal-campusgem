import type { RlcAttendancePerson } from '@/lib/rlc/attendance-roster'
import { recordArgsFromSelection, type RlcServiceSelection } from '@/lib/rlc/service-selection'
import type { Attendance } from '@/lib/types'

const OPTIMISTIC_PREFIX = 'optimistic:'

export function isOptimisticAttendanceId(id: string): boolean {
  return id.startsWith(OPTIMISTIC_PREFIX)
}

export function personKeyFromAttendance(row: Attendance): string | null {
  if (row.member_id) return `m:${row.member_id}`
  if (row.visitor_id) return `v:${row.visitor_id}`
  return null
}

export function buildOptimisticAttendanceRecord(args: {
  person: RlcAttendancePerson
  serviceDate: string
  selection: RlcServiceSelection
  method: Attendance['method']
  createdBy: string
  status?: Attendance['status']
}): Attendance {
  const recordArgs = recordArgsFromSelection(args.selection)
  const now = new Date().toISOString()
  return {
    id: `${OPTIMISTIC_PREFIX}${args.person.key}:${now}`,
    member_id: args.person.kind === 'member' ? args.person.memberId : undefined,
    visitor_id: args.person.kind === 'visitor' ? args.person.visitorId : undefined,
    service_date: args.serviceDate,
    service_type: recordArgs.serviceType,
    check_in_time: now,
    method: args.method,
    metadata: {
      ...(recordArgs.customServiceId ? { custom_service_id: recordArgs.customServiceId } : {}),
      person_kind: args.person.kind,
      optimistic: true,
    },
    created_by: args.createdBy,
    created_at: now,
    status: args.status ?? 'present',
  }
}

/** Replace any prior record (optimistic or server) for the same person, then append the new row. */
export function upsertAttendanceRecord(list: Attendance[], record: Attendance): Attendance[] {
  const personKey = personKeyFromAttendance(record)
  const filtered = list.filter((row) => {
    if (row.id === record.id) return false
    if (!personKey) return true
    return personKeyFromAttendance(row) !== personKey
  })
  return [...filtered, record]
}

export function removeOptimisticAttendanceForPerson(
  list: Attendance[],
  person: RlcAttendancePerson
): Attendance[] {
  return list.filter((row) => {
    if (!isOptimisticAttendanceId(row.id)) return true
    if (person.kind === 'member' && row.member_id === person.memberId) return false
    if (person.kind === 'visitor' && row.visitor_id === person.visitorId) return false
    return true
  })
}
