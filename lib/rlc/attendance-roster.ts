import { RLC_SERVICES } from '@/lib/constants/rlc'
import type { AgeRange, Attendance, Member, RlcMembershipType, Visitor } from '@/lib/types'
import { isChildAgeRange, resolveAgeRange } from '@/lib/rlc/age'
import { phoneLast9 } from '@/lib/rlc/camp-bridge'
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
  gender?: 'male' | 'female' | 'other'
  ageRange?: AgeRange
  rlcMembershipType?: RlcMembershipType
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

function attendancePersonKind(row: Attendance): 'member' | 'visitor' | 'unknown' {
  const meta = (row.metadata ?? {}) as { person_kind?: string }
  if (row.visitor_id || meta.person_kind === 'visitor') return 'visitor'
  if (row.member_id) return 'member'
  return 'unknown'
}

function activeVisitorPhoneIndex(visitors: Visitor[]): Map<string, Visitor> {
  const byPhone = new Map<string, Visitor>()
  for (const visitor of visitors) {
    if (visitor.converted_to_member || visitor.is_active === false) continue
    const key = phoneLast9(visitor.phone ?? visitor.secondary_phone)
    if (key && !byPhone.has(key)) byPhone.set(key, visitor)
  }
  return byPhone
}

/** Visitors stay on the check-in list and are not hidden behind a matching directory member. */
export function buildAttendancePeople(members: Member[], visitors: Visitor[]): RlcAttendancePerson[] {
  const visitorPhones = activeVisitorPhoneIndex(visitors)
  const visitorPeople = visitors
    .filter((visitor) => visitor.converted_to_member !== true && visitor.is_active !== false)
    .map(visitorToAttendancePerson)
  const memberPeople = members
    .filter((member) => {
      const key = phoneLast9(member.user?.phone)
      if (key && visitorPhones.has(key)) return false
      return true
    })
    .map(memberToAttendancePerson)

  return [...visitorPeople, ...memberPeople].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'visitor' ? -1 : 1
    return a.name.localeCompare(b.name)
  })
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
  const visitorsByPhone = activeVisitorPhoneIndex(visitors)

  return attendance
    .filter((row) => attendanceMatchesService(row, selection))
    .map((row) => {
      const storedKind = attendancePersonKind(row)
      const visitorFromId = row.visitor_id ? visitorById.get(row.visitor_id) : undefined
      const member = row.member_id ? memberById.get(row.member_id) : undefined
      const visitorFromPhone = member
        ? visitorsByPhone.get(phoneLast9(member.user?.phone))
        : undefined
      const visitor = visitorFromId ?? (storedKind === 'visitor' ? visitorFromPhone : undefined) ?? visitorFromPhone
      const treatAsVisitor = Boolean(visitorFromId || storedKind === 'visitor' || visitorFromPhone)

      if (treatAsVisitor) {
        const person = visitor ? visitorToAttendancePerson(visitor) : null
        return {
          attendance: row,
          name:
            person?.name ??
            (row.visitor_id ? `Visitor ${row.visitor_id.slice(-6)}` : member?.user?.full_name ?? 'Visitor'),
          kind: 'visitor' as const,
          phone: person?.phone ?? member?.user?.phone,
          code: person?.code ?? member?.check_in_code,
          gender: visitor?.gender ?? member?.gender ?? row.gender,
          ageRange:
            resolveAgeRange({
              age_range: visitor?.age_range ?? member?.age_range,
              dob: visitor?.date_of_birth ?? member?.dob,
            }) ?? (row.age_category === 'child' ? '0_12' : undefined),
        }
      }

      if (row.member_id) {
        const person = member ? memberToAttendancePerson(member) : null
        return {
          attendance: row,
          name: person?.name ?? `Member ${row.member_id.slice(-6)}`,
          kind: 'member' as const,
          phone: person?.phone,
          code: person?.code,
          membershipId: person?.membershipId,
          gender: member?.gender ?? row.gender,
          rlcMembershipType: member?.rlc_membership_type ?? 'full_member',
          ageRange:
            resolveAgeRange({
              age_range: member?.age_range,
              dob: member?.dob,
            }) ?? (row.age_category === 'child' ? '0_12' : undefined),
        }
      }

      return {
        attendance: row,
        name: 'Unknown',
        kind: 'unknown' as const,
        gender: row.gender,
        ageRange: row.age_category === 'child' ? ('0_12' as AgeRange) : undefined,
      }
    })
    .sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'visitor' ? -1 : 1
      return a.name.localeCompare(b.name)
    })
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

const PRESENT_MEMBER_SECTION_ORDER: RlcMembershipType[] = [
  'full_member',
  'associate',
  'visitor_converted',
]

const PRESENT_MEMBER_SECTION_LABELS: Record<RlcMembershipType, string> = {
  full_member: 'Present full members',
  associate: 'Present associate members',
  visitor_converted: 'Present converted members',
}

export function presentMemberSectionLabel(type: RlcMembershipType): string {
  return PRESENT_MEMBER_SECTION_LABELS[type]
}

export function groupPresentMembersByMembershipType(
  rows: RlcAttendanceRosterRow[]
): { type: RlcMembershipType; label: string; rows: RlcAttendanceRosterRow[] }[] {
  const buckets = new Map<RlcMembershipType, RlcAttendanceRosterRow[]>()
  for (const type of PRESENT_MEMBER_SECTION_ORDER) {
    buckets.set(type, [])
  }
  for (const row of rows) {
    if (row.kind === 'visitor') continue
    const type = row.rlcMembershipType ?? 'full_member'
    const bucket = buckets.get(type) ?? buckets.get('full_member')!
    bucket.push(row)
  }
  return PRESENT_MEMBER_SECTION_ORDER.map((type) => ({
    type,
    label: presentMemberSectionLabel(type),
    rows: buckets.get(type) ?? [],
  })).filter((group) => group.rows.length > 0)
}

export type AttendanceSummaryStats = {
  present: number
  members: number
  visitors: number
  male: number
  female: number
  otherGender: number
  genderUnspecified: number
  children: number
  teens: number
  youngAdults: number
  adults: number
  seniors: number
  ageUnspecified: number
}

export function summarizeAttendancePresent(present: RlcAttendanceRosterRow[]): AttendanceSummaryStats {
  const stats: AttendanceSummaryStats = {
    present: present.length,
    members: 0,
    visitors: 0,
    male: 0,
    female: 0,
    otherGender: 0,
    genderUnspecified: 0,
    children: 0,
    teens: 0,
    youngAdults: 0,
    adults: 0,
    seniors: 0,
    ageUnspecified: 0,
  }

  for (const row of present) {
    if (row.kind === 'member') stats.members += 1
    else if (row.kind === 'visitor') stats.visitors += 1

    if (row.gender === 'male') stats.male += 1
    else if (row.gender === 'female') stats.female += 1
    else if (row.gender === 'other') stats.otherGender += 1
    else stats.genderUnspecified += 1

    if (!row.ageRange) stats.ageUnspecified += 1
    else if (isChildAgeRange(row.ageRange)) stats.children += 1
    else if (row.ageRange === '13_17') stats.teens += 1
    else if (row.ageRange === '18_35') stats.youngAdults += 1
    else if (row.ageRange === '36_59') stats.adults += 1
    else stats.seniors += 1
  }

  return stats
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
    'Gender',
    'Age range',
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
        row.gender ?? '',
        row.ageRange ?? '',
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
