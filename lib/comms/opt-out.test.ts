import { describe, expect, test } from 'bun:test'
import { buildOptOutSet, isOptedOut } from './opt-out'

describe('opt-out set', () => {
  test('matches any phone format', () => {
    const set = buildOptOutSet(['0244123456', null, '', '+233 20 111 2222'])
    expect(isOptedOut(set, '+233244123456')).toBe(true)
    expect(isOptedOut(set, '233244123456')).toBe(true)
    expect(isOptedOut(set, '0201112222')).toBe(true)
    expect(isOptedOut(set, '0244000000')).toBe(false)
    expect(isOptedOut(set, undefined)).toBe(false)
  })
})
