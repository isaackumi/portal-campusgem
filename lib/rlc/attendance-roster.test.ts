import { describe, expect, test } from 'bun:test'
import {
  attendanceRosterToCsv,
  filterAttendancePeople,
  sessionCheckedKeys,
  type RlcAttendancePerson,
} from '@/lib/rlc/attendance-roster'
import type { Attendance } from '@/lib/types'

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
    ] as Attendance[]

    expect(Array.from(sessionCheckedKeys(rows, 'sunday_service'))).toEqual(['m:1'])
    expect(Array.from(sessionCheckedKeys(rows, 'midweek_service'))).toEqual(['v:2'])
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
      { serviceDate: '2026-08-24', serviceType: 'sunday_service', churchName: 'RLC' }
    )
    expect(csv).toContain('# RLC attendance evidence')
    expect(csv).toContain('Ama Mensah')
    expect(csv).toContain('Sunday Service')
  })
})
