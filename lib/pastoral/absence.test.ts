import { describe, expect, test } from 'bun:test'
import {
  assessAbsence,
  countedSundaysFor,
  isSundayServiceRow,
  shortDate,
  shouldAlert,
  summariseSundays,
  sundayOf,
  type AttendanceRowLite,
} from './absence'

// Sundays in Sept–Nov 2026.
const S = [
  '2026-09-06', '2026-09-13', '2026-09-20', '2026-09-27',
  '2026-10-04', '2026-10-11', '2026-10-18', '2026-10-25', '2026-11-01',
]
const desc = (dates: string[]) => [...dates].sort().reverse()

describe('sundayOf / isSundayServiceRow', () => {
  test('maps any day to the Sunday on or before it', () => {
    expect(sundayOf('2026-11-01')).toBe('2026-11-01')
    expect(sundayOf('2026-11-02')).toBe('2026-11-01')
    expect(sundayOf('2026-11-07')).toBe('2026-11-01')
    expect(sundayOf('nope')).toBeNull()
  })

  test('typed sunday_service counts, other types do not, untyped only on Sundays', () => {
    expect(isSundayServiceRow({ service_date: '2026-11-04', service_type: 'sunday_service' })).toBe(true)
    expect(isSundayServiceRow({ service_date: '2026-11-01', service_type: 'midweek_service' })).toBe(false)
    expect(isSundayServiceRow({ service_date: '2026-11-01' })).toBe(true)
    expect(isSundayServiceRow({ service_date: '2026-11-04' })).toBe(false)
  })
})

describe('assessAbsence: streaks', () => {
  test('counts consecutive missed Sundays from the most recent', () => {
    const attended = new Set(['2026-10-11', '2026-10-04', '2026-09-27', '2026-09-20'])
    const a = assessAbsence(desc(S), attended)
    expect(a.streak).toBe(3) // 18 Oct, 25 Oct, 1 Nov
    expect(a.lastSeen).toBe('2026-10-11')
    expect(a.lapsed).toBe(true)
  })

  test('present last Sunday: streak 0, not lapsed', () => {
    const a = assessAbsence(desc(S), new Set(['2026-11-01', '2026-10-25', '2026-10-18']))
    expect(a.streak).toBe(0)
    expect(a.lapsed).toBe(false)
  })

  test('below the threshold is not lapsed', () => {
    const a = assessAbsence(desc(S), new Set(['2026-10-18', '2026-10-11', '2026-10-04']))
    expect(a.streak).toBe(2)
    expect(a.lapsed).toBe(false)
  })

  test('custom threshold', () => {
    const a = assessAbsence(desc(S), new Set(['2026-10-18', '2026-10-11', '2026-10-04']), {
      missedWeeks: 2, lookbackWeeks: 8, minAttended: 3,
    })
    expect(a.lapsed).toBe(true)
  })
})

describe('assessAbsence: was regular', () => {
  test('needs at least 3 of the 8 Sundays before the gap', () => {
    const two = assessAbsence(desc(S), new Set(['2026-10-11', '2026-09-13']))
    expect(two.attendedInLookback).toBe(2)
    expect(two.wasRegular).toBe(false)
    expect(two.lapsed).toBe(false)

    const three = assessAbsence(desc(S), new Set(['2026-10-11', '2026-09-13', '2026-09-06']))
    expect(three.attendedInLookback).toBe(3)
    expect(three.lapsed).toBe(true)
  })

  test('attendance older than the look-back window does not count', () => {
    // Only two Sundays before the gap are in range; the 8-week window ends at 6 Sep.
    const many = desc([...S, '2026-08-30', '2026-08-23', '2026-08-16'])
    const a = assessAbsence(many, new Set(['2026-10-11', '2026-10-04', '2026-08-16']))
    expect(a.attendedInLookback).toBe(2)
    expect(a.lapsed).toBe(false)
  })

  test('never seen: not regular, no last-seen date', () => {
    const a = assessAbsence(desc(S), new Set())
    expect(a.streak).toBe(S.length)
    expect(a.lastSeen).toBeNull()
    expect(a.lapsed).toBe(false)
  })
})

describe('empty weeks are skipped', () => {
  const row = (member_id: string | undefined, service_date: string, extra: Partial<AttendanceRowLite> = {}): AttendanceRowLite => ({
    member_id, service_date, service_type: 'sunday_service', ...extra,
  })

  test('a Sunday with no rows at all is not counted as a miss', () => {
    // Church recorded every Sunday except 25 Oct (no data entered).
    const rows: AttendanceRowLite[] = []
    for (const d of S) {
      if (d === '2026-10-25') continue
      rows.push(row('other', d))
    }
    for (const d of ['2026-10-11', '2026-10-04', '2026-09-27']) rows.push(row('ama', d))
    const summary = summariseSundays(rows)
    const counted = countedSundaysFor(summary, 'ama', 'campus_gem', '2026-11-02')
    expect(counted).not.toContain('2026-10-25')
    const a = assessAbsence(counted, summary.attended.get('ama'))
    expect(a.streak).toBe(2) // 18 Oct and 1 Nov only
    expect(a.lapsed).toBe(false)
  })

  test('an RLC-only Sunday does not count for a Campus Gem member', () => {
    const rows: AttendanceRowLite[] = [
      row('x', '2026-11-01', { congregation: 'rlc' }),
      row('x', '2026-10-25', { congregation: 'rlc' }),
      row('ama', '2026-10-18'),
    ]
    const summary = summariseSundays(rows)
    expect(countedSundaysFor(summary, 'ama', 'campus_gem', '2026-11-02')).toEqual(['2026-10-18'])
    expect(countedSundaysFor(summary, 'ama', 'both', '2026-11-02')).toEqual(['2026-11-01', '2026-10-25', '2026-10-18'])
  })

  test('absent rows mark the week recorded but not attended', () => {
    const summary = summariseSundays([row('ama', '2026-11-01', { congregation: 'rlc', status: 'absent' })])
    expect(summary.recorded.rlc.has('2026-11-01')).toBe(true)
    expect(summary.attended.get('ama')).toBeUndefined()
  })

  test('Sundays after asOf are ignored', () => {
    const summary = summariseSundays([row('x', '2026-11-08'), row('x', '2026-11-01')])
    expect(countedSundaysFor(summary, 'ama', null, '2026-11-02')).toEqual(['2026-11-01'])
  })
})

describe('shouldAlert', () => {
  test('first lapse alerts', () => {
    expect(shouldAlert({ streak: 3, lastSeen: '2026-10-11' }, null)).toBe(true)
  })
  test('same lapse does not alert again until 4 more weeks', () => {
    const prior = { alerted_at: 1, streak: 3, last_seen: '2026-10-11' }
    expect(shouldAlert({ streak: 4, lastSeen: '2026-10-11' }, prior)).toBe(false)
    expect(shouldAlert({ streak: 6, lastSeen: '2026-10-11' }, prior)).toBe(false)
    expect(shouldAlert({ streak: 7, lastSeen: '2026-10-11' }, prior)).toBe(true)
  })
  test('came back and lapsed again alerts', () => {
    const prior = { alerted_at: 1, streak: 3, last_seen: '2026-08-02' }
    expect(shouldAlert({ streak: 3, lastSeen: '2026-10-11' }, prior)).toBe(true)
  })
  test('stops after the max streak', () => {
    expect(shouldAlert({ streak: 13, lastSeen: '2026-01-04' }, null)).toBe(false)
  })
})

test('shortDate', () => {
  expect(shortDate('2026-10-12')).toBe('12 Oct')
  expect(shortDate(null)).toBe('')
})
