import { describe, expect, it } from 'vitest'
import { categoryMeta, clientIp, describeDevice, isActivityCategory, maskPhone } from './describe'

describe('activity log wording', () => {
  it('names a device the way people say it', () => {
    expect(describeDevice('Mozilla/5.0 (Linux; Android 13; SM-A135F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36')).toBe('Chrome on Android')
    expect(describeDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1')).toBe('Safari on iPhone')
    expect(describeDevice('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36 Edg/120.0')).toBe('Edge on Windows')
    expect(describeDevice('Mozilla/5.0 (Linux; Android 12) SamsungBrowser/23.0 Chrome/115 Mobile Safari/537.36')).toBe('Samsung Internet on Android')
    expect(describeDevice('')).toBeUndefined()
  })

  it('masks most of a phone number', () => {
    expect(maskPhone('0241234567')).toBe('024•••••67')
    expect(maskPhone('+233 24 123 4567')).toBe('233•••••••67')
    expect(maskPhone('GEM-12')).toBe('GE•••')
    expect(maskPhone('')).toBe('')
  })

  it('takes the visitor from the first forwarded address', () => {
    expect(clientIp('41.66.1.2, 10.0.0.1')).toBe('41.66.1.2')
    expect(clientIp(null, ' 41.66.1.3 ')).toBe('41.66.1.3')
    expect(clientIp(undefined)).toBeUndefined()
  })

  it('knows its categories, and falls back for unknown ones', () => {
    expect(isActivityCategory('camp')).toBe(true)
    expect(isActivityCategory('nope')).toBe(false)
    expect(categoryMeta('nope').id).toBe('settings')
    expect(categoryMeta('auth').label).toBe('Sign-ins')
  })
})
