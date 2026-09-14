import { describe, expect, it } from 'bun:test'
import { normalizeSmsPhone } from '@/lib/comms/sms-client'

describe('normalizeSmsPhone', () => {
  it('formats Ghana numbers for Hubtel (233…)', () => {
    expect(normalizeSmsPhone('0244123456')).toBe('233244123456')
    expect(normalizeSmsPhone('+233244123456')).toBe('233244123456')
    expect(normalizeSmsPhone('233244123456')).toBe('233244123456')
  })
})
