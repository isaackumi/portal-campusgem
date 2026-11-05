import { describe, expect, test } from 'bun:test'
import { buildAccessWelcomeSms, gainedPermissions, phoneTail } from './access-welcome'

describe('access welcome sms', () => {
  test('admin message names the role, link and phone tail', () => {
    const sms = buildAccessWelcomeSms({ fullName: 'Ama Owusu', role: 'admin', phone: '0244 123 482', siteUrl: 'https://gem.app/', codeMode: 'staff' })
    expect(sms).toBe(
      "Hi Ama, you're now an Administrator on Campus Gem. Sign in at https://gem.app/auth with your phone number ending 482. We'll text you a code to confirm it's you."
    )
    expect(
      buildAccessWelcomeSms({ fullName: 'Ama', role: 'admin', phone: '0244123482', siteUrl: 'https://gem.app', codeMode: 'off' })
    ).toContain('No password needed.')
  })

  test('caller-only grant points to Calls', () => {
    const sms = buildAccessWelcomeSms({ fullName: 'Kofi', role: 'member', permissions: ['camp.calls'], phone: '0201112223', siteUrl: 'https://x.y' })
    expect(sms).toContain('camp caller')
    expect(sms).toContain('ending 223')
    expect(sms).toContain('open Calls')
  })

  test('staff role uses its label', () => {
    expect(buildAccessWelcomeSms({ fullName: 'Yaw', role: 'elder', phone: '', siteUrl: 'https://x.y' })).toContain(
      'Elder access'
    )
  })

  test('phoneTail', () => {
    expect(phoneTail('+233 24 412 3482')).toBe('482')
    expect(phoneTail('12')).toBeNull()
    expect(phoneTail(undefined)).toBeNull()
  })

  test('gainedPermissions only counts new access', () => {
    expect(gainedPermissions({ role: 'member' }, { role: 'admin' }).length).toBeGreaterThan(0)
    expect(gainedPermissions({ role: 'admin' }, { role: 'member' })).toEqual([])
    expect(gainedPermissions({ role: 'member' }, { role: 'member', permissions: ['camp.calls'] })).toEqual(['camp.calls'])
    expect(gainedPermissions({ role: 'member', permissions: ['camp.calls'] }, { role: 'member', permissions: ['camp.calls'] })).toEqual([])
  })
})
