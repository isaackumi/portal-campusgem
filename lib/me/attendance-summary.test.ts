import { describe, expect, test } from 'bun:test'
import { summarizeAttendance, weekStartOf } from './attendance-summary'

// 2026-11-05 is a Thursday; its week starts Sunday 2026-11-01.
const TODAY = '2026-11-05'

describe('weekStartOf', () => {
  test('returns the Sunday of the week', () => {
    expect(weekStartOf('2026-11-05')).toBe('2026-11-01')
    expect(weekStartOf('2026-11-01')).toBe('2026-11-01')
    expect(weekStartOf('2026-10-31')).toBe('2026-10-25')
  })
})

describe('summarizeAttendance', () => {
  test('empty history', () => {
    const s = summarizeAttendance([], TODAY)
    expect(s.weeks).toHaveLength(12)
    expect(s.weeks[11].start).toBe('2026-11-01')
    expect(s.weeks[0].start).toBe('2026-08-16')
    expect(s.streak).toBe(0)
    expect(s.thisMonth).toBe(0)
    expect(s.weeksAttended).toBe(0)
  })

  test('streak counts back from this week', () => {
    const s = summarizeAttendance(['2026-11-01', '2026-10-25', '2026-10-18', '2026-10-04'], TODAY)
    expect(s.streak).toBe(3)
    expect(s.weeksAttended).toBe(4)
  })

  test('streak still counts when this week has no service yet', () => {
    const s = summarizeAttendance(['2026-10-25', '2026-10-18'], TODAY)
    expect(s.streak).toBe(2)
  })

  test('streak breaks after a missed week', () => {
    expect(summarizeAttendance(['2026-10-18'], TODAY).streak).toBe(0)
  })

  test('counts this month and ignores future or bad dates', () => {
    const s = summarizeAttendance(['2026-11-01', '2026-11-04', '2026-10-31', '2026-11-20', 'nope'], TODAY)
    expect(s.thisMonth).toBe(2)
    expect(s.weeks[11].count).toBe(2)
  })

  test('streak can run longer than the window', () => {
    const dates: string[] = []
    for (let i = 0; i < 20; i++) {
      const d = new Date(Date.UTC(2026, 10, 1) - i * 7 * 86400000)
      dates.push(d.toISOString().slice(0, 10))
    }
    expect(summarizeAttendance(dates, TODAY).streak).toBe(20)
  })
})
