import { describe, expect, it } from 'vitest'
import { changeMap, preferredSmsNumber, smsNumberKey } from './sms-number'

describe('preferred SMS numbers', () => {
  it('reads a number the same whichever way it was typed', () => {
    expect(smsNumberKey('024 123 4567')).toBe('233241234567')
    expect(smsNumberKey('+233 24 123 4567')).toBe('233241234567')
    expect(smsNumberKey('233241234567')).toBe('233241234567')
    expect(smsNumberKey('241234567')).toBe('233241234567')
    expect(smsNumberKey('')).toBe('')
  })

  it('sends to the new number, however the old one was written', () => {
    const map = changeMap([{ from_phone: '0241234567', to_phone: '0559876543' }])
    expect(preferredSmsNumber('+233241234567', map)).toBe('0559876543')
    expect(preferredSmsNumber('0201111111', map)).toBe('0201111111')
  })

  it('follows a number changed more than once, and stops on a loop', () => {
    const chain = changeMap([
      { from_phone: '0241111111', to_phone: '0242222222' },
      { from_phone: '0242222222', to_phone: '0243333333' },
    ])
    expect(preferredSmsNumber('0241111111', chain)).toBe('0243333333')
    const loop = changeMap([
      { from_phone: '0241111111', to_phone: '0242222222' },
      { from_phone: '0242222222', to_phone: '0241111111' },
    ])
    expect(preferredSmsNumber('0241111111', loop)).toBe('0242222222')
  })

  it('ignores a change to the same number', () => {
    expect(changeMap([{ from_phone: '0241234567', to_phone: '+233241234567' }]).size).toBe(0)
  })
})
