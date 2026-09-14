import { describe, expect, it } from 'bun:test'
import { isValidSmsPhone, normalizeSmsPhone } from '@/lib/comms/sms-client'

describe('normalizeSmsPhone', () => {
  it('formats Ghana numbers for Hubtel (233…)', () => {
    expect(normalizeSmsPhone('0244123456')).toBe('233244123456')
    expect(normalizeSmsPhone('+233244123456')).toBe('233244123456')
    expect(normalizeSmsPhone('233244123456')).toBe('233244123456')
    expect(normalizeSmsPhone('233548769251')).toBe('233548769251')
  })
})

describe('isValidSmsPhone', () => {
  it('accepts Ghana mobiles and rejects bad values', () => {
    expect(isValidSmsPhone('0548769251')).toBe(true)
    expect(isValidSmsPhone('+233548769251')).toBe(true)
    expect(isValidSmsPhone('233548769251')).toBe(true)
    expect(isValidSmsPhone('123')).toBe(false)
    expect(isValidSmsPhone('')).toBe(false)
    expect(isValidSmsPhone(null)).toBe(false)
  })
})
