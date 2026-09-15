import { describe, expect, it } from 'bun:test'
import {
  ghanaCalendarDate,
  personalizeBirthdaySms,
} from '@/lib/birthdays/sms'

describe('personalizeBirthdaySms', () => {
  it('injects first name from full name', () => {
    const out = personalizeBirthdaySms('Happy Birthday {{firstName}}!', {
      name: 'Ama Mensah',
    })
    expect(out).toBe('Happy Birthday Ama!')
  })

  it('injects age when provided', () => {
    const out = personalizeBirthdaySms('Turning {{ageTurning}} — bless you {{name}}!', {
      name: 'Isaac',
      ageTurning: 30,
    })
    expect(out).toBe('Turning 30 — bless you Isaac!')
  })
})

describe('ghanaCalendarDate', () => {
  it('returns numeric year month day', () => {
    const d = ghanaCalendarDate(new Date('2026-09-15T12:00:00Z'))
    expect(d.year).toBe(2026)
    expect(d.month).toBe(9)
    expect(d.day).toBe(15)
    expect(d.iso).toBe('2026-09-15')
  })
})
