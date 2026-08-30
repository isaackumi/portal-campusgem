import { RLC_SERVICES } from '@/lib/constants/rlc'
import type { Attendance, Member, Visitor } from '@/lib/types'
import {
  attendanceMatchesService,
  type RlcServiceSelection,
} from '@/lib/rlc/service-selection'

export type RlcAttendancePerson = {
  key: string
  kind: 'member' | 'visitor'
  memberId?: string
  visitorId?: string
  name: string
  phone?: string
  code?: string
  membershipId?: string
}

export type RlcAttendanceRosterRow = {
  attendance: Attendance
  name: string
  kind: 'member' | 'visitor' | 'unknown'
  phone?: string
  code?: string
  membershipId?: string
}

export function rlcServiceLabel(serviceType?: string, customName?: string): string {
  if (serviceType === 'other') return customName?.trim() || 'Other service'
  if (!serviceType) return 'Service'
  return RLC_SERVICES.find((s) => s.value === serviceType)?.label ?? serviceType.replace(/_/g, ' ')
}

export function memberToAttendancePerson(member: Member): RlcAttendancePerson {
  return {
    key: `m:${member.id}`,
    kind: 'member',
    memberId: member.id,
    name: member.user?.full_name?.trim() || 'Member',
    phone: member.user?.phone,
    code: member.check_in_code,
    membershipId: member.user?.membership_id,
  }
}

export function visitorToAttendancePerson(visitor: Visitor): RlcAttendancePerson {
  return {
    key: `v:${visitor.id}`,
    kind: 'visitor',
    visitorId: visitor.id,
    name: [visitor.first_name, visitor.middle_name, visitor.last_name].filter(Boolean).join(' ').trim() || 'Visitor',
    phone: visitor.phone ?? visitor.secondary_phone,
    code: visitor.check_in_code,
    membershipId: undefined,
  }
}

export function personSearchHaystack(person: RlcAttendancePerson): string {
  return [person.name, person.phone, person.code, person.membershipId]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

export function filterAttendancePeople(
  people: RlcAttendancePerson[],
  query: string,
  alreadyCheckedKeys: Set<string>
): RlcAttendancePerson[] {
  const needle = query.trim().toLowerCase()
  const available = people.filter((p) => !alreadyCheckedKeys.has(p.key))
  if (!needle) return available.slice(0, 12)
  return available.filter((p) => personSearchHaystack(p).includes(needle)).slice(0, 20)
}

export function sessionCheckedKeys(attendance: Attendance[], selection: RlcServiceSelection): Set<string> {
  const ids = new Set<string>()
  for (const row of attendance) {
    if (!attendanceMatchesService(row, selection)) continue
    if (row.member_id) ids.add(`m:${row.member_id}`)
    if (row.visitor_id) ids.add(`v:${row.visitor_id}`)
  }
  return ids
}

export function buildAttendanceRoster(
  attendance: Attendance[],
  members: Member[],
  visitors: Visitor[],
  selection: RlcServiceSelection
): RlcAttendanceRosterRow[] {
  const memberById = new Map(members.map((m) => [m.id, m]))
  const visitorById = new Map(visitors.map((v) => [v.id, v]))

  return attendance
    .filter((row) => attendanceMatchesService(row, selection))
    .map((row) => {
      if (row.member_id) {
        const member = memberById.get(row.member_id)
        const person = member ? memberToAttendancePerson(member) : null
        return {
          attendance: row,
          name: person?.name ?? `Member ${row.member_id.slice(-6)}`,
          kind: 'member' as const,
          phone: person?.phone,
          code: person?.code,
          membershipId: person?.membershipId,
        }
      }
      if (row.visitor_id) {
        const visitor = visitorById.get(row.visitor_id)
        const person = visitor ? visitorToAttendancePerson(visitor) : null
        return {
          attendance: row,
          name: person?.name ?? `Visitor ${row.visitor_id.slice(-6)}`,
          kind: 'visitor' as const,
          phone: person?.phone,
          code: person?.code,
        }
      }
      return {
        attendance: row,
        name: 'Unknown',
        kind: 'unknown' as const,
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function splitAttendanceRoster(rows: RlcAttendanceRosterRow[]): {
  present: RlcAttendanceRosterRow[]
  absentNoted: RlcAttendanceRosterRow[]
} {
  const present: RlcAttendanceRosterRow[] = []
  const absentNoted: RlcAttendanceRosterRow[] = []
  for (const row of rows) {
    if (row.attendance.status === 'absent') {
      absentNoted.push(row)
    } else {
      present.push(row)
    }
  }
  return { present, absentNoted }
}

export function attendanceStatusLabel(status?: Attendance['status']): string {
  if (status === 'absent') return 'Absent (noted)'
  if (status === 'late') return 'Late'
  return 'Present'
}

export function attendanceRosterToCsv(
  rows: RlcAttendanceRosterRow[],
  meta: { serviceDate: string; serviceLabel: string; churchName?: string }
): string {
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`
  const header = [
    'Name',
    'Type',
    'Status',
    'Note',
    'Phone',
    'Check-in code',
    'Membership ID',
    'Service date',
    'Service',
    'Check-in time',
    'Method',
  ]
  const lines = [
    `# ${meta.churchName ?? 'RLC'} attendance evidence`,
    `# Date: ${meta.serviceDate}`,
    `# Service: ${meta.serviceLabel}`,
    `# Generated: ${new Date().toISOString()}`,
    `# Count: ${rows.length}`,
    header.join(','),
    ...rows.map((row) =>
      [
        escape(row.name),
        row.kind,
        escape(attendanceStatusLabel(row.attendance.status)),
        escape(row.attendance.notes ?? ''),
        escape(row.phone ?? ''),
        escape(row.code ?? ''),
        escape(row.membershipId ?? ''),
        meta.serviceDate,
        escape(meta.serviceLabel),
        escape(row.attendance.check_in_time ? new Date(row.attendance.check_in_time).toLocaleString() : ''),
        row.attendance.method ?? '',
      ].join(',')
    ),
  ]
  return lines.join('\n')
}

export function downloadAttendanceCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
