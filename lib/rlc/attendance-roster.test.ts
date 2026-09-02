import { describe, expect, test } from 'bun:test'
import {
  attendanceRosterToCsv,
  buildAttendancePeople,
  buildAttendanceRoster,
  filterAttendancePeople,
  groupPresentMembersByMembershipType,
  presentMemberSectionLabel,
  sessionCheckedKeys,
  splitAttendanceRoster,
  summarizeAttendancePresent,
  type RlcAttendancePerson,
} from '@/lib/rlc/attendance-roster'
import { defaultRlcServiceSelection, type RlcServiceSelection } from '@/lib/rlc/service-selection'
import type { Attendance, Member, Visitor } from '@/lib/types'

describe('rlc attendance roster helpers', () => {
  const people: RlcAttendancePerson[] = [
    {
      key: 'm:1',
      kind: 'member',
      memberId: '1',
      name: 'Ama Mensah',
      phone: '0244123456',
      membershipId: 'CG-24-001',
      code: 'RLC-26-ABCD',
    },
    {
      key: 'v:2',
      kind: 'visitor',
      visitorId: '2',
      name: 'Kofi Boateng',
      phone: '0555987654',
      code: 'RLC-26-EFGH',
    },
  ]

  test('filters by phone and name and skips already checked in', () => {
    const checked = new Set(['m:1'])
    expect(filterAttendancePeople(people, '0555', checked).map((p) => p.key)).toEqual(['v:2'])
    expect(filterAttendancePeople(people, 'ama', checked)).toEqual([])
    expect(filterAttendancePeople(people, 'RLC-26-EFGH', checked)[0]?.name).toBe('Kofi Boateng')
  })

  test('builds session keys per service type', () => {
    const rows = [
      {
        id: 'a1',
        service_date: '2026-08-24',
        service_type: 'sunday_service',
        member_id: '1',
        check_in_time: new Date().toISOString(),
        method: 'admin',
        metadata: {},
        created_at: new Date().toISOString(),
      },
      {
        id: 'a2',
        service_date: '2026-08-24',
        service_type: 'midweek_service',
        visitor_id: '2',
        check_in_time: new Date().toISOString(),
        method: 'admin',
        metadata: {},
        created_at: new Date().toISOString(),
      },
      {
        id: 'a3',
        service_date: '2026-08-24',
        service_type: 'other',
        member_id: '3',
        check_in_time: new Date().toISOString(),
        method: 'admin',
        metadata: { custom_service_id: 'custom1', custom_service_name: 'Leadership retreat' },
        created_at: new Date().toISOString(),
      },
    ] as Attendance[]

    expect(Array.from(sessionCheckedKeys(rows, { kind: 'standard', serviceType: 'sunday_service' }))).toEqual(['m:1'])
    expect(Array.from(sessionCheckedKeys(rows, { kind: 'standard', serviceType: 'midweek_service' }))).toEqual(['v:2'])
    expect(
      Array.from(
        sessionCheckedKeys(rows, { kind: 'custom', customServiceId: 'custom1', label: 'Leadership retreat' })
      )
    ).toEqual(['m:3'])
  })

  test('splits roster into present and absent noted rows', () => {
    const rows = [
      {
        attendance: {
          id: 'a1',
          service_date: '2026-08-24',
          check_in_time: '2026-08-24T09:00:00.000Z',
          method: 'admin',
          metadata: {},
          created_at: '2026-08-24T09:00:00.000Z',
          status: 'present' as const,
        },
        name: 'Present Person',
        kind: 'member' as const,
      },
      {
        attendance: {
          id: 'a2',
          service_date: '2026-08-24',
          check_in_time: '2026-08-24T09:00:00.000Z',
          method: 'admin',
          metadata: {},
          created_at: '2026-08-24T09:00:00.000Z',
          status: 'absent' as const,
          notes: 'Travelling',
        },
        name: 'Absent Person',
        kind: 'visitor' as const,
      },
    ]

    const split = splitAttendanceRoster(rows)
    expect(split.present).toHaveLength(1)
    expect(split.absentNoted).toHaveLength(1)
    expect(split.absentNoted[0]?.attendance.notes).toBe('Travelling')
  })

  test('summarizes gender and children from present rows', () => {
    const stats = summarizeAttendancePresent([
      {
        attendance: {
          id: 'a1',
          service_date: '2026-08-24',
          check_in_time: '2026-08-24T09:00:00.000Z',
          method: 'admin',
          metadata: {},
          created_at: '2026-08-24T09:00:00.000Z',
        },
        name: 'Boy',
        kind: 'visitor',
        gender: 'male',
        ageRange: '0_12',
      },
      {
        attendance: {
          id: 'a2',
          service_date: '2026-08-24',
          check_in_time: '2026-08-24T09:00:00.000Z',
          method: 'admin',
          metadata: {},
          created_at: '2026-08-24T09:00:00.000Z',
        },
        name: 'Woman',
        kind: 'member',
        gender: 'female',
        ageRange: '36_59',
      },
      {
        attendance: {
          id: 'a3',
          service_date: '2026-08-24',
          check_in_time: '2026-08-24T09:00:00.000Z',
          method: 'admin',
          metadata: {},
          created_at: '2026-08-24T09:00:00.000Z',
        },
        name: 'Unknown',
        kind: 'member',
      },
    ])
    expect(stats.present).toBe(3)
    expect(stats.male).toBe(1)
    expect(stats.female).toBe(1)
    expect(stats.genderUnspecified).toBe(1)
    expect(stats.children).toBe(1)
    expect(stats.adults).toBe(1)
    expect(stats.ageUnspecified).toBe(1)
    expect(stats.members).toBe(2)
    expect(stats.visitors).toBe(1)
  })

  test('csv includes evidence header and rows', () => {
    const csv = attendanceRosterToCsv(
      [
        {
          attendance: {
            id: 'a1',
            service_date: '2026-08-24',
            service_type: 'sunday_service',
            check_in_time: '2026-08-24T09:15:00.000Z',
            method: 'admin',
            metadata: {},
            created_at: '2026-08-24T09:15:00.000Z',
          },
          name: 'Ama Mensah',
          kind: 'member',
          phone: '0244123456',
          code: 'RLC-26-ABCD',
          membershipId: 'CG-24-001',
        },
      ],
      { serviceDate: '2026-08-24', serviceLabel: 'Sunday Service', churchName: 'RLC' }
    )
    expect(csv).toContain('# RLC attendance evidence')
    expect(csv).toContain('Ama Mensah')
    expect(csv).toContain('Sunday Service')
  })

  test('keeps visitors on the check-in list and labels them visitor even with a matching member phone', () => {
    const visitors = [
      {
        id: 'v1',
        first_name: 'Kofi',
        last_name: 'Boateng',
        phone: '0244123456',
        visit_date: '2026-08-24',
        follow_up_completed: false,
        converted_to_member: false,
        is_active: true,
        created_at: '',
        updated_at: '',
      },
    ] as Visitor[]
    const members = [
      {
        id: 'm1',
        user_id: 'u1',
        status: 'active',
        emergency_contacts: [],
        documents: [],
        created_at: '',
        updated_at: '',
        user: { id: 'u1', membership_id: 'CG1', full_name: 'Kofi Boateng', phone: '0244123456', role: 'member' },
      },
    ] as Member[]

    const people = buildAttendancePeople(members, visitors)
    expect(people.map((p) => p.kind)).toEqual(['visitor'])
    expect(people[0]?.visitorId).toBe('v1')

    const roster = buildAttendanceRoster(
      [
        {
          id: 'a1',
          service_date: '2026-08-24',
          service_type: 'sunday_service',
          member_id: 'm1',
          check_in_time: '2026-08-24T09:00:00.000Z',
          method: 'admin',
          metadata: {},
          created_at: '2026-08-24T09:00:00.000Z',
        },
      ] as Attendance[],
      members,
      visitors,
      { kind: 'standard', serviceType: 'sunday_service' }
    )
    expect(roster[0]?.kind).toBe('visitor')
    expect(roster[0]?.name).toContain('Kofi')
  })

  test('groups present members by RLC membership type', () => {
    const rows = [
      {
        attendance: {
          id: 'a1',
          service_date: '2026-09-01',
          check_in_time: '2026-09-01T09:00:00.000Z',
          method: 'admin',
          metadata: {},
          created_at: '2026-09-01T09:00:00.000Z',
          status: 'present' as const,
        },
        name: 'Full Member Person',
        kind: 'member' as const,
        rlcMembershipType: 'full_member' as const,
      },
      {
        attendance: {
          id: 'a2',
          service_date: '2026-09-01',
          check_in_time: '2026-09-01T09:00:00.000Z',
          method: 'admin',
          metadata: {},
          created_at: '2026-09-01T09:00:00.000Z',
          status: 'present' as const,
        },
        name: 'Associate Person',
        kind: 'member' as const,
        rlcMembershipType: 'associate' as const,
      },
    ]

    const groups = groupPresentMembersByMembershipType(rows)
    expect(groups).toHaveLength(2)
    expect(groups[0]?.label).toBe('Present full members')
    expect(groups[0]?.rows).toHaveLength(1)
    expect(presentMemberSectionLabel('full_member')).toBe('Present full members')
  })
})
