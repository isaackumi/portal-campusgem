import { describe, expect, test } from 'bun:test'
import {
  buildSigninCodeSms,
  generateSigninCode,
  hashSigninCode,
  normalizeCodeInput,
  requiresSigninCode,
  signinCodeMode,
} from './signin-code'

describe('sign-in codes', () => {
  test('mode defaults to staff', () => {
    expect(signinCodeMode(undefined)).toBe('staff')
    expect(signinCodeMode('ALL')).toBe('all')
    expect(signinCodeMode('off')).toBe('off')
    expect(signinCodeMode('nonsense')).toBe('staff')
  })

  test('staff mode: staff roles and extra grants need a code, members do not', () => {
    expect(requiresSigninCode({ role: 'admin' }, 'staff')).toBe(true)
    expect(requiresSigninCode({ role: 'elder' }, 'staff')).toBe(true)
    expect(requiresSigninCode({ role: 'member' }, 'staff')).toBe(false)
    expect(requiresSigninCode({ role: 'member', permissions: ['camp.calls'] }, 'staff')).toBe(true)
    expect(requiresSigninCode({ role: 'member' }, 'all')).toBe(true)
    expect(requiresSigninCode({ role: 'admin' }, 'off')).toBe(false)
  })

  test('codes are six digits', () => {
    for (let i = 0; i < 50; i++) expect(generateSigninCode()).toMatch(/^\d{6}$/)
  })

  test('hash is bound to the person and the secret', () => {
    const a = hashSigninCode('u1', '123456', 's')
    expect(a).toBe(hashSigninCode('u1', '123456', 's'))
    expect(a).not.toBe(hashSigninCode('u2', '123456', 's'))
    expect(a).not.toBe(hashSigninCode('u1', '123456', 't'))
    expect(a).not.toContain('123456')
  })

  test('input normalisation', () => {
    expect(normalizeCodeInput(' 123 456 ')).toBe('123456')
    expect(normalizeCodeInput('12345')).toBeNull()
    expect(normalizeCodeInput(null)).toBeNull()
  })

  test('sms puts the code first and adds the WebOTP line for https only', () => {
    expect(buildSigninCodeSms('042917', 'https://gem.app')).toBe(
      '042917 is your Campus Gem sign-in code. It expires in 10 minutes. Never share it.\n\n@gem.app #042917'
    )
    expect(buildSigninCodeSms('042917', 'http://localhost:3000')).not.toContain('@')
  })
})
