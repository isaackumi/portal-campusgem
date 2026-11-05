import { describe, expect, test } from 'bun:test'
import {
  bearerToken,
  classifyKeyword,
  entriesToRecord,
  groupThreads,
  inboundAction,
  inboundSecretOk,
  parseInboundSms,
} from './inbound'

describe('parseInboundSms', () => {
  test('Hubtel field names', () => {
    expect(
      parseInboundSms({ From: '+233244123456', To: '1234', Content: 'Hello', MessageId: 'abc-1' })
    ).toEqual({ from: '+233244123456', to: '1234', body: 'Hello', provider_message_id: 'abc-1' })
  })

  test('generic names: msisdn + message, Text', () => {
    expect(parseInboundSms({ msisdn: '233244123456', message: 'Hi' })?.from).toBe('233244123456')
    expect(parseInboundSms({ from: '0244123456', Text: 'yo' })?.body).toBe('yo')
  })

  test('nested Data object', () => {
    const p = parseInboundSms({ ResponseCode: '0000', Data: { From: '0244123456', Content: 'STOP', MessageId: 9 } })
    expect(p).toEqual({ from: '0244123456', to: undefined, body: 'STOP', provider_message_id: '9' })
  })

  test('strips formatting from sender', () => {
    expect(parseInboundSms({ From: '+233 24 412 3456', Content: 'x' })?.from).toBe('+233244123456')
  })

  test('rejects missing or junk', () => {
    expect(parseInboundSms(null)).toBeNull()
    expect(parseInboundSms([])).toBeNull()
    expect(parseInboundSms({ Content: 'no sender' })).toBeNull()
    expect(parseInboundSms({ From: '0244123456' })).toBeNull()
    expect(parseInboundSms({ From: 'abc', Content: 'x' })).toBeNull()
  })

  test('form entries', () => {
    const rec = entriesToRecord(new URLSearchParams('From=0244123456&Content=Yes+please&From=other'))
    expect(parseInboundSms(rec)).toMatchObject({ from: '0244123456', body: 'Yes please' })
  })
})

describe('inboundSecretOk', () => {
  test('requires match when configured', () => {
    expect(inboundSecretOk({ configured: 's3cret', provided: 's3cret', isProduction: true })).toBe(true)
    expect(inboundSecretOk({ configured: 's3cret', provided: 'nope', isProduction: false })).toBe(false)
    expect(inboundSecretOk({ configured: 's3cret', provided: undefined, isProduction: false })).toBe(false)
  })
  test('unset secret refused in production only', () => {
    expect(inboundSecretOk({ configured: '', provided: undefined, isProduction: true })).toBe(false)
    expect(inboundSecretOk({ configured: undefined, provided: undefined, isProduction: false })).toBe(true)
  })
  test('bearer parsing', () => {
    expect(bearerToken('Bearer abc')).toBe('abc')
    expect(bearerToken('bearer  abc ')).toBe('abc')
    expect(bearerToken('Basic abc')).toBeUndefined()
    expect(bearerToken(null)).toBeUndefined()
  })
})

describe('keywords', () => {
  test('whole-message keywords only', () => {
    expect(classifyKeyword('stop')).toBe('stop')
    expect(classifyKeyword(' Unsubscribe. ')).toBe('stop')
    expect(classifyKeyword('START')).toBe('start')
    expect(classifyKeyword('Yes!')).toBe('yes')
    expect(classifyKeyword('no')).toBe('no')
    expect(classifyKeyword('stop sending at night')).toBeNull()
    expect(classifyKeyword('yes, but late')).toBeNull()
    expect(classifyKeyword('')).toBeNull()
  })

  test('actions', () => {
    expect(inboundAction('STOP', { isCampRegistrant: false })).toEqual({ keyword: 'stop', tags: ['opt-out'], optOut: true })
    expect(inboundAction('start', { isCampRegistrant: true }).optOut).toBe(false)
    expect(inboundAction('yes', { isCampRegistrant: true }).tags).toEqual(['confirm-yes'])
    expect(inboundAction('NO', { isCampRegistrant: true }).tags).toEqual(['confirm-no'])
    expect(inboundAction('yes', { isCampRegistrant: false }).tags).toEqual([])
    expect(inboundAction('yes', { isCampRegistrant: true }).optOut).toBeUndefined()
  })
})

describe('groupThreads', () => {
  test('groups by phone, newest first, counts unread', () => {
    const threads = groupThreads([
      { id: '1', phone: 'A', body: 'old', received_at: 1, read_at: 5 },
      { id: '2', phone: 'B', body: 'b', received_at: 3, tags: ['opt-out'] },
      { id: '3', phone: 'A', body: 'new', received_at: 4, sender_name: 'Ama' },
      { id: '4', phone: 'C', body: 'c', received_at: 2, archived: true },
    ])
    expect(threads.map((t) => t.phone)).toEqual(['A', 'B', 'C'])
    expect(threads[0]).toMatchObject({ last_body: 'new', unread: 1, count: 2, sender_name: 'Ama', archived: false })
    expect(threads[1].tags).toEqual(['opt-out'])
    expect(threads[2]).toMatchObject({ archived: true, unread: 0 })
  })
})
