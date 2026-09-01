import { describe, expect, it } from '@jest/globals'
import { isValidGhanaPhone, normalizeGhanaPhone, sanitizePhoneInput } from '@/lib/camp/phone'

describe('Ghana phone validation', () => {
  it('rejects names mixed into country code', () => {
    expect(isValidGhanaPhone('+233Afiawo')).toBe(false)
    expect(normalizeGhanaPhone('+233Afiawo')).toBe('')
    expect(sanitizePhoneInput('+233Afiawo')).toBe('')
  })

  it('accepts common local and international formats', () => {
    expect(isValidGhanaPhone('0244123456')).toBe(true)
    expect(normalizeGhanaPhone('0244123456')).toBe('+233244123456')
    expect(normalizeGhanaPhone('+233244123456')).toBe('+233244123456')
  })
})
