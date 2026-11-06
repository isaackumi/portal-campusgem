import { describe, expect, test } from 'bun:test'
import {
  DEFAULT_BIRTHDAY_ADVANCE_SMS_TEMPLATE,
  DEFAULT_BIRTHDAY_SMS_TEMPLATE,
  birthdayMessageFor,
  nextBirthdayOn,
} from './sms'

const today = { year: 2026, month: 11, day: 6 }
const opts = { today, template: DEFAULT_BIRTHDAY_SMS_TEMPLATE, advanceTemplate: DEFAULT_BIRTHDAY_ADVANCE_SMS_TEMPLATE }

describe('birthdayMessageFor', () => {
  test('on the day: Happy Birthday', () => {
    const m = birthdayMessageFor({ name: 'Ama Mensah', birthMonth: 11, birthDay: 6 }, opts)
    expect(m.kind).toBe('today')
    expect(m.daysUntil).toBe(0)
    expect(m.body.startsWith('Happy Birthday Ama!')).toBe(true)
  })

  test('before the day: in advance, naming the date', () => {
    const m = birthdayMessageFor({ name: 'Kofi Boateng', birthMonth: 11, birthDay: 13 }, opts)
    expect(m.kind).toBe('advance')
    expect(m.daysUntil).toBe(7)
    expect(m.body).toContain('Happy birthday in advance, Kofi!')
    expect(m.body).toContain('Friday 13 November')
    expect(m.body).not.toContain('Happy Birthday Kofi')
  })

  test('birthday already passed this year counts to next year (advance)', () => {
    const m = birthdayMessageFor({ name: 'Yaw', birthMonth: 1, birthDay: 2 }, opts)
    expect(m.kind).toBe('advance')
    expect(m.birthdayDate).toBe('Saturday 2 January')
  })

  test('a custom message is used exactly as written', () => {
    const m = birthdayMessageFor({ name: 'Efua Asante', birthMonth: 12, birthDay: 1 }, { ...opts, customTemplate: 'Hi {{firstName}}, see you Sunday!' })
    expect(m.body).toBe('Hi Efua, see you Sunday!')
  })
})

describe('nextBirthdayOn', () => {
  test('29 February falls on 28 February in other years', () => {
    expect(nextBirthdayOn({ month: 2, day: 29 }, { year: 2027, month: 2, day: 1 })).toEqual({ year: 2027, month: 2, day: 28, daysUntil: 27 })
    expect(nextBirthdayOn({ month: 2, day: 29 }, { year: 2028, month: 2, day: 1 }).day).toBe(29)
  })
})
