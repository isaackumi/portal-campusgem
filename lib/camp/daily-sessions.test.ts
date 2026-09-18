import { describe, expect, test } from 'bun:test'
import { suggestDailySessionPeriod } from './daily-sessions'

function at(hours: number, minutes = 0): Date {
  return new Date(2026, 8, 18, hours, minutes, 0, 0)
}

describe('suggestDailySessionPeriod', () => {
  test('morning until noon', () => {
    expect(suggestDailySessionPeriod(at(8))).toBe('morning')
    expect(suggestDailySessionPeriod(at(11, 59))).toBe('morning')
  })

  test('afternoon from noon until 5pm', () => {
    expect(suggestDailySessionPeriod(at(12))).toBe('afternoon')
    expect(suggestDailySessionPeriod(at(14))).toBe('afternoon')
    expect(suggestDailySessionPeriod(at(16, 59))).toBe('afternoon')
  })

  test('evening from 5pm', () => {
    expect(suggestDailySessionPeriod(at(17))).toBe('evening')
    expect(suggestDailySessionPeriod(at(20))).toBe('evening')
  })
})
