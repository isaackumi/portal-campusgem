import { describe, expect, test } from 'bun:test'
import { ageRangeFromYears, ageYearsFromDob, isChildAgeRange, resolveAgeRange } from '@/lib/rlc/age'

describe('age range helpers', () => {
  test('computes age from date of birth', () => {
    expect(ageYearsFromDob('2018-01-01', new Date('2026-08-30'))).toBe(8)
    expect(ageYearsFromDob('2014-12-31', new Date('2026-08-30'))).toBe(11)
  })

  test('maps years to ranges and children', () => {
    expect(ageRangeFromYears(7)).toBe('0_12')
    expect(ageRangeFromYears(15)).toBe('13_17')
    expect(ageRangeFromYears(28)).toBe('18_35')
    expect(ageRangeFromYears(44)).toBe('36_59')
    expect(ageRangeFromYears(70)).toBe('60_plus')
    expect(isChildAgeRange('0_12')).toBe(true)
    expect(isChildAgeRange('13_17')).toBe(false)
  })

  test('prefers stored age range over date of birth', () => {
    expect(resolveAgeRange({ age_range: '0_12', dob: '1990-01-01' })).toBe('0_12')
    expect(resolveAgeRange({ dob: '2019-06-01', asOf: new Date('2026-08-30') })).toBe('0_12')
    expect(resolveAgeRange({})).toBeUndefined()
  })
})
