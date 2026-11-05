import { describe, expect, test } from 'bun:test'
import { isPlainMember, sanitizeMyDetails } from './my-details'

describe('sanitizeMyDetails', () => {
  test('drops fields a member may not change', () => {
    const out = sanitizeMyDetails({
      phone: '0241234567',
      secondary_phone: '0241234568',
      role: 'admin',
      permissions: ['users.manage'],
      membership_id: 'X',
      full_name: 'Someone else',
      occupation: ' Nurse ',
    })
    expect(out.user).toEqual({ occupation: 'Nurse' })
    expect(out.member).toEqual({})
  })

  test('splits user and member fields', () => {
    const out = sanitizeMyDetails({ email: 'a@b.co', address: 'Hse 1', area_of_residence: 'Ayeduase' })
    expect(out.user).toEqual({ email: 'a@b.co' })
    expect(out.member).toEqual({ address: 'Hse 1', area_of_residence: 'Ayeduase' })
  })

  test('rejects a bad email but allows clearing it', () => {
    expect(() => sanitizeMyDetails({ email: 'nope' })).toThrow()
    expect(sanitizeMyDetails({ email: '' }).user).toEqual({ email: '' })
  })

  test('marital status: valid, cleared, invalid', () => {
    expect(sanitizeMyDetails({ marital_status: 'married' }).user.marital_status).toBe('married')
    const cleared = sanitizeMyDetails({ marital_status: '' }).user
    expect('marital_status' in cleared).toBe(true)
    expect(cleared.marital_status).toBeUndefined()
    expect(() => sanitizeMyDetails({ marital_status: 'complicated' })).toThrow()
  })

  test('caps long values and ignores non-strings', () => {
    const out = sanitizeMyDetails({ occupation: 'x'.repeat(500), place_of_work: 42 })
    expect(out.user.occupation).toHaveLength(200)
    expect('place_of_work' in out.user).toBe(false)
  })
})

describe('isPlainMember', () => {
  test('members and visitors without grants', () => {
    expect(isPlainMember({ role: 'member' })).toBe(true)
    expect(isPlainMember({ role: 'visitor', permissions: [] })).toBe(true)
  })
  test('staff or extra grants are not plain', () => {
    expect(isPlainMember({ role: 'elder' })).toBe(false)
    expect(isPlainMember({ role: 'member', permissions: ['camp.calls'] })).toBe(false)
    expect(isPlainMember(null)).toBe(false)
  })
})
