import { describe, expect, it } from 'vitest'
import {
  autoRemindersEnabled,
  buildReminderSms,
  daysUntilCamp,
  formatCampDate,
  planReminders,
  reminderKindFor,
  reminderSchedule,
  reminderStageFor,
  type ReminderKind,
} from './camp-reminders'
import { smsSegmentInfo as smsSegments } from '@/lib/comms/sms-segments'

const LINK = 'https://portal.campusgem.org/c/AbCdEfGhIjKlMnOpQrStUv'

describe('daysUntilCamp / reminderStageFor', () => {
  it('counts Ghana (UTC) calendar days', () => {
    expect(daysUntilCamp('2026-11-12', new Date('2026-11-05T08:00:00Z'))).toBe(7)
    expect(daysUntilCamp('2026-11-12', new Date('2026-11-05T23:59:00Z'))).toBe(7)
    expect(daysUntilCamp('2026-11-12', new Date('2026-11-11T00:00:00Z'))).toBe(1)
    expect(daysUntilCamp('2026-11-12T00:00:00.000Z', new Date('2026-11-12T10:00:00Z'))).toBe(0)
    expect(daysUntilCamp('', new Date())).toBeNull()
    expect(daysUntilCamp('soon', new Date())).toBeNull()
  })

  it('keeps the 7-day window open until the 1-day reminder takes over', () => {
    expect(reminderStageFor(8)).toBeNull()
    expect(reminderStageFor(7)).toBe('7d')
    expect(reminderStageFor(2)).toBe('7d')
    expect(reminderStageFor(1)).toBe('1d')
    expect(reminderStageFor(0)).toBeNull()
    expect(reminderStageFor(-3)).toBeNull()
    expect(reminderStageFor(null)).toBeNull()
  })

  it('is on unless switched off', () => {
    expect(autoRemindersEnabled({})).toBe(true)
    expect(autoRemindersEnabled({ auto_reminders: true })).toBe(true)
    expect(autoRemindersEnabled({ auto_reminders: false })).toBe(false)
  })
})

describe('audience', () => {
  it('7 days: everyone not declined; 1 day: confirmed + maybe', () => {
    expect(reminderKindFor(undefined, '7d')).toBe('confirm')
    expect(reminderKindFor('unreachable', '7d')).toBe('confirm')
    expect(reminderKindFor('maybe', '7d')).toBe('confirm')
    expect(reminderKindFor('confirmed', '7d')).toBe('see_you')
    expect(reminderKindFor('declined', '7d')).toBeNull()
    expect(reminderKindFor('confirmed', '1d')).toBe('day_before')
    expect(reminderKindFor('maybe', '1d')).toBe('day_before_maybe')
    expect(reminderKindFor('unconfirmed', '1d')).toBeNull()
    expect(reminderKindFor('declined', '1d')).toBeNull()
  })

  it('skips cancelled, at camp, declined, already sent and bad phones', () => {
    const base = { status: 'registered' as const, phone: '0241234567' }
    const regs = [
      { ...base, id: 'a' },
      { ...base, id: 'b', attendance_confirmation: 'confirmed' as const },
      { ...base, id: 'c', attendance_confirmation: 'declined' as const },
      { ...base, id: 'd', status: 'cancelled' as const },
      { ...base, id: 'e', status: 'checked_in' as const },
      { ...base, id: 'f', reminder_7d_sent_at: '2026-11-05T08:00:00Z' },
      { ...base, id: 'g', phone: '123' },
      { ...base, id: 'h', phone: '' },
    ]
    const plan = planReminders(regs, '7d', (p) => /^0\d{9}$/.test(p))
    expect(plan.send.map((s) => [s.registration.id, s.kind])).toEqual([
      ['a', 'confirm'],
      ['b', 'see_you'],
    ])
    expect(plan.skipped).toEqual({
      cancelled: 1,
      checked_in: 1,
      declined: 1,
      not_in_audience: 0,
      already_sent: 1,
      invalid_phone: 2,
    })

    const oneDay = planReminders(regs, '1d', (p) => /^0\d{9}$/.test(p))
    expect(oneDay.send.map((s) => s.registration.id)).toEqual(['b'])
    // 'f' got the 7-day one but not the 1-day one: markers are per stage.
    expect(oneDay.skipped.already_sent).toBe(0)
  })
})

describe('reminder texts', () => {
  it('formats dates in Ghana time', () => {
    expect(formatCampDate('2026-11-12')).toBe('Thu 12 Nov')
  })

  const kinds: ReminderKind[] = ['confirm', 'see_you', 'day_before', 'day_before_maybe']
  for (const kind of kinds) {
    it(`${kind} fits one GSM-7 SMS and carries the link`, () => {
      const text = buildReminderSms({
        kind,
        firstName: 'Abena',
        campYear: 2026,
        startDate: '2026-11-12',
        venue: 'Ayi Mensah Park',
        link: LINK,
      })
      expect(text).toContain(LINK)
      expect(smsSegments(text)).toMatchObject({ encoding: 'GSM-7', segments: 1 })
    })
  }

  it('drops a long venue rather than spilling into a second SMS', () => {
    const text = buildReminderSms({
      kind: 'day_before',
      firstName: 'Abena',
      campYear: 2026,
      startDate: '2026-11-12',
      venue: 'Presbyterian Women Centre, Abokobi, Greater Accra Region',
      link: LINK,
    })
    expect(text).not.toContain('Abokobi')
    expect(smsSegments(text).segments).toBe(1)
  })

  it('reads naturally', () => {
    expect(
      buildReminderSms({ kind: 'confirm', firstName: 'Kofi', campYear: 2026, startDate: '2026-11-12', link: LINK })
    ).toBe(`Hi Kofi, Eagles Camp Meeting 2026 starts Thu 12 Nov. Are you coming? Tap to let us know: ${LINK}`)
  })
})

describe('reminderSchedule', () => {
  it('next 7-day run is the start of the window, then the day before', () => {
    const s = reminderSchedule('2026-11-20', new Date('2026-11-05T10:00:00Z'))
    expect(s.sevenDay).toBe('2026-11-13T08:00:00.000Z')
    expect(s.dayBefore).toBe('2026-11-19T08:00:00.000Z')
  })

  it('inside the window the next run is today (before 08:00) or tomorrow', () => {
    expect(reminderSchedule('2026-11-10', new Date('2026-11-05T07:00:00Z')).sevenDay).toBe('2026-11-05T08:00:00.000Z')
    expect(reminderSchedule('2026-11-10', new Date('2026-11-05T09:00:00Z')).sevenDay).toBe('2026-11-06T08:00:00.000Z')
  })

  it('closes the 7-day window when only the day-before run is left', () => {
    const s = reminderSchedule('2026-11-07', new Date('2026-11-05T09:00:00Z'))
    expect(s.sevenDay).toBeNull()
    expect(s.dayBefore).toBe('2026-11-06T08:00:00.000Z')
    expect(reminderSchedule('2026-11-07', new Date('2026-11-06T09:00:00Z'))).toEqual({ sevenDay: null, dayBefore: null })
  })
})
