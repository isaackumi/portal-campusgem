import { describe, expect, it } from 'bun:test'
import {
  ageInYearsOn,
  parseIsoDateOnly,
  validateDateOfBirthValue,
} from '@/lib/forms/date-of-birth-validation'

describe('validateDateOfBirthValue', () => {
  const today = new Date(2026, 8, 16) // 16 Sep 2026

  it('allows empty values', () => {
    expect(validateDateOfBirthValue('', { today })).toBeNull()
    expect(validateDateOfBirthValue(null, { today })).toBeNull()
  })

  it('rejects today and future dates', () => {
    expect(validateDateOfBirthValue('2026-09-16', { today, label: 'Date of birth' })).toMatch(
      /cannot be today or a future date/
    )
    expect(validateDateOfBirthValue('2026-09-17', { today })).toMatch(/cannot be today or a future date/)
  })

  it('rejects under-10 ages', () => {
    expect(validateDateOfBirthValue('2017-09-17', { today })).toMatch(/at least 10 years old/)
    expect(validateDateOfBirthValue('2016-09-16', { today })).toBeNull()
  })

  it('rejects absurd years', () => {
    expect(validateDateOfBirthValue('1900-01-01', { today })).toMatch(/looks incorrect/)
  })

  it('accepts a normal adult DOB', () => {
    expect(validateDateOfBirthValue('2000-05-01', { today })).toBeNull()
  })
})

describe('parseIsoDateOnly / ageInYearsOn', () => {
  it('parses calendar dates without UTC shift', () => {
    const d = parseIsoDateOnly('2000-01-15')
    expect(d?.getFullYear()).toBe(2000)
    expect(d?.getMonth()).toBe(0)
    expect(d?.getDate()).toBe(15)
  })

  it('computes age before birthday in the year', () => {
    const dob = parseIsoDateOnly('2000-10-01')!
    expect(ageInYearsOn(dob, new Date(2026, 8, 16))).toBe(25)
  })
})
