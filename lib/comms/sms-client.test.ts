import { describe, expect, it } from 'bun:test'
import {
  isValidSmsPhone,
  normalizeSmsPhone,
  resolveSmsProvider,
  sendSms,
} from '@/lib/comms/sms-client'

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
    expect(isValidSmsPhone('024842385')).toBe(false)
    expect(isValidSmsPhone('123')).toBe(false)
    expect(isValidSmsPhone('')).toBe(false)
    expect(isValidSmsPhone(null)).toBe(false)
  })
})

describe('sendSms dry run', () => {
  it('returns dry_run provider without calling Hubtel', async () => {
    const result = await sendSms('233548769251', 'hello', { dryRun: true })
    expect(result.success).toBe(true)
    expect(result.provider).toBe('dry_run')
    expect(result.dryRun).toBe(true)
    expect(result.normalizedPhone).toBe('233548769251')
    expect(result.messageId).toStartWith('dry_run_')
  })
})

describe('resolveSmsProvider', () => {
  it('exposes a provider name string', () => {
    expect(typeof resolveSmsProvider()).toBe('string')
  })
})
