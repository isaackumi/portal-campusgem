import { describe, expect, test } from 'bun:test'
import type { Attendance } from '@/lib/types'
import {
  buildCalendarMonthGrid,
  groupSessionsByDate,
  monthDateBounds,
  summarizeAttendanceSessions,
} from '@/lib/rlc/attendance-calendar'

describe('rlc attendance calendar', () => {
  const rows = [
    {
      id: 'a1',
      service_date: '2026-08-24',
      service_type: 'sunday_service',
      check_in_time: '2026-08-24T09:00:00.000Z',
      method: 'admin',
      metadata: {},
      created_at: '2026-08-24T09:00:00.000Z',
      status: 'present',
    },
    {
      id: 'a2',
      service_date: '2026-08-24',
      service_type: 'sunday_service',
      check_in_time: '2026-08-24T09:05:00.000Z',
      method: 'admin',
      metadata: {},
      created_at: '2026-08-24T09:05:00.000Z',
      status: 'absent',
      notes: 'Travelling',
    },
    {
      id: 'a3',
      service_date: '2026-08-22',
      service_type: 'midweek_service',
      check_in_time: '2026-08-22T18:00:00.000Z',
      method: 'admin',
      metadata: {},
      created_at: '2026-08-22T18:00:00.000Z',
      status: 'present',
    },
  ] as Attendance[]

  test('summarizes sessions with present and absent counts', () => {
    const sessions = summarizeAttendanceSessions(rows, [])
    expect(sessions).toHaveLength(2)
    const sunday = sessions.find((s) => s.label === 'Sunday Service')
    expect(sunday?.present).toBe(1)
    expect(sunday?.absentNoted).toBe(1)
  })

  test('builds month grid with session markers on days', () => {
    const sessions = summarizeAttendanceSessions(rows, [])
    const byDate = groupSessionsByDate(sessions)
    const weeks = buildCalendarMonthGrid(2026, 7, byDate, '2026-08-24')
    const august24 = weeks.flat().find((cell) => cell.date === '2026-08-24')
    expect(august24?.sessions).toHaveLength(1)
    expect(august24?.isToday).toBe(true)
  })

  test('monthDateBounds returns ISO range', () => {
    expect(monthDateBounds(2026, 7)).toEqual({ from: '2026-08-01', to: '2026-08-31' })
  })
})
