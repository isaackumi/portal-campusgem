import { describe, expect, test } from 'bun:test'
import { smsSegmentInfo } from '@/lib/comms/sms-segments'
import { birthdaysInNextDays, buildLeaderMessage, localPhone } from './leader-message'

describe('buildLeaderMessage', () => {
  test('single alert, no digest', () => {
    const text = buildLeaderMessage({
      digests: [],
      alerts: [{ name: 'Ama Mensah', weeks: 3, lastSeen: '2026-10-12', phone: '+233244123456' }],
      missedWeeks: 3,
    })
    expect(text).toBe(
      "Ama Mensah hasn't been in church for 3 Sundays (last seen 12 Oct). A call from you would mean a lot. 0244123456"
    )
  })

  test('digest only', () => {
    const text = buildLeaderMessage({
      digests: [
        {
          groupName: 'Youth Fellowship',
          present: 23,
          total: 31,
          birthdays: [{ name: 'Kofi', day: 'Tue' }, { name: 'Ama', day: 'Fri' }],
          missing: ['Yaw', 'Efua'],
        },
      ],
      alerts: [],
      missedWeeks: 3,
    })
    expect(text).toBe(
      'Youth Fellowship this week: 23 of 31 in church Sunday. Birthdays: Kofi (Tue), Ama (Fri). Missing 3+ weeks: Yaw, Efua.'
    )
  })

  test('digest and alerts combine into one text', () => {
    const text = buildLeaderMessage({
      digests: [{ groupName: 'Choir', present: 10, total: 12, birthdays: [], missing: [] }],
      alerts: [
        { name: 'Ama Mensah', weeks: 3, lastSeen: '2026-10-11', phone: '0244123456' },
        { name: 'Yaw Boateng', weeks: 4, lastSeen: null },
      ],
      missedWeeks: 3,
    })
    expect(text).toContain('Choir this week: 10 of 12 in church Sunday.')
    expect(text).toContain('Please call: Ama Mensah 0244123456 (3 Sundays, last 11 Oct); Yaw Boateng (4 Sundays).')
  })

  test('lists up to 5 alert names then +N more', () => {
    const alerts = Array.from({ length: 8 }, (_, i) => ({ name: `P${i}`, weeks: 3, lastSeen: null }))
    const text = buildLeaderMessage({ digests: [], alerts, missedWeeks: 3 })
    expect(text).toContain('P4 (3 Sundays); +3 more.')
    expect(text).not.toContain('P5')
  })

  test('says when no attendance was recorded', () => {
    const text = buildLeaderMessage({
      digests: [{ groupName: 'Choir', present: null, total: 12, birthdays: [{ name: 'Kofi', day: 'Tue' }], missing: [] }],
      alerts: [],
      missedWeeks: 3,
    })
    expect(text).toBe('Choir this week: no attendance recorded Sunday. Birthdays: Kofi (Tue).')
  })

  test('trims to fit 2 segments', () => {
    const many = (prefix: string, n: number) => Array.from({ length: n }, (_, i) => `${prefix}${'x'.repeat(8)}${i}`)
    const text = buildLeaderMessage({
      digests: [
        {
          groupName: 'Youth Fellowship',
          present: 23,
          total: 31,
          birthdays: many('B', 6).map((name) => ({ name, day: 'Tue' })),
          missing: many('M', 8),
        },
        { groupName: 'Choir', present: 5, total: 9, birthdays: [], missing: many('C', 4) },
      ],
      alerts: Array.from({ length: 6 }, (_, i) => ({
        name: `Person Number${i}`,
        weeks: 3,
        lastSeen: '2026-10-11',
        phone: '0244123456',
      })),
      missedWeeks: 3,
    })
    expect(smsSegmentInfo(text).segments).toBeLessThanOrEqual(2)
    expect(text).toContain('Person Number0')
    expect(text).toContain('more')
  })

  test('nothing to say gives empty text', () => {
    expect(buildLeaderMessage({ digests: [], alerts: [], missedWeeks: 3 })).toBe('')
  })
})

describe('birthdaysInNextDays', () => {
  const monday = new Date(Date.UTC(2026, 10, 2)) // Mon 2 Nov 2026

  test('finds birthdays in the next 7 days with weekday labels, soonest first', () => {
    const out = birthdaysInNextDays(
      [
        { name: 'Ama', dob: '1990-11-06' },
        { name: 'Kofi', dob: '2000-11-03' },
        { name: 'Late', dob: '1990-11-09' },
        { name: 'None', dob: null },
      ],
      monday
    )
    expect(out).toEqual([
      { name: 'Kofi', day: 'Tue', offset: 1 },
      { name: 'Ama', day: 'Fri', offset: 4 },
    ])
  })

  test('wraps the year end and handles Feb 29', () => {
    const dec29 = new Date(Date.UTC(2026, 11, 29))
    expect(birthdaysInNextDays([{ name: 'NY', dob: '1990-01-02' }], dec29)[0]?.name).toBe('NY')
    const feb26 = new Date(Date.UTC(2027, 1, 26))
    expect(birthdaysInNextDays([{ name: 'Leap', dob: '2000-02-29' }], feb26)[0]?.day).toBe('Sun')
  })
})

test('localPhone', () => {
  expect(localPhone('+233 24 412 3456')).toBe('0244123456')
  expect(localPhone('0244123456')).toBe('0244123456')
  expect(localPhone('')).toBe('')
})
