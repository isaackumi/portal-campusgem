import { describe, expect, it } from 'bun:test'
import {
  checkinSessionState,
  checkinSessionWindow,
  generateCheckinSessionToken,
  isCheckinSessionTokenFormat,
  isIsoDate,
  selfCheckInPath,
} from '@/lib/attendance/checkin-session'

const HOUR = 60 * 60 * 1000

describe('check-in session tokens', () => {
  it('are 128-bit URL-safe and distinct', () => {
    const a = generateCheckinSessionToken()
    const b = generateCheckinSessionToken()
    expect(a).toMatch(/^[A-Za-z0-9_-]{22}$/)
    expect(a).not.toBe(b)
    expect(isCheckinSessionTokenFormat(a)).toBe(true)
  })

  it('rejects junk', () => {
    expect(isCheckinSessionTokenFormat('../etc')).toBe(false)
    expect(isCheckinSessionTokenFormat('short')).toBe(false)
    expect(isCheckinSessionTokenFormat(42)).toBe(false)
  })

  it('builds the /i path', () => {
    expect(selfCheckInPath('abc')).toBe('/i/abc')
  })
})

describe('checkinSessionState', () => {
  const session = { opens_at: 1_000, closes_at: 1_000 + 4 * HOUR }

  it('is open inside the window', () => {
    expect(checkinSessionState(session, 1_000)).toBe('open')
    expect(checkinSessionState(session, 1_000 + HOUR)).toBe('open')
  })

  it('is not open yet before opens_at', () => {
    expect(checkinSessionState(session, 999)).toBe('not_open_yet')
  })

  it('expires at closes_at', () => {
    expect(checkinSessionState(session, session.closes_at)).toBe('expired')
  })

  it('closed wins over open', () => {
    expect(checkinSessionState({ ...session, closed_at: 2_000 }, 3_000)).toBe('closed')
  })
})

describe('checkinSessionWindow', () => {
  it('defaults to 4 hours', () => {
    expect(checkinSessionWindow(0)).toEqual({ opens_at: 0, closes_at: 4 * HOUR })
  })

  it('clamps to 1..24 hours', () => {
    expect(checkinSessionWindow(0, 0).closes_at).toBe(HOUR)
    expect(checkinSessionWindow(0, 100).closes_at).toBe(24 * HOUR)
    expect(checkinSessionWindow(0, Number.NaN).closes_at).toBe(4 * HOUR)
  })
})

describe('isIsoDate', () => {
  it('accepts YYYY-MM-DD only', () => {
    expect(isIsoDate('2026-11-08')).toBe(true)
    expect(isIsoDate('08/11/2026')).toBe(false)
    expect(isIsoDate('2026-13-45')).toBe(false)
  })
})
