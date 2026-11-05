import { describe, expect, test } from 'bun:test'
import { canAccessPath } from '@/lib/auth/roles'
import { canSeeNavItem, sidebarNavigationSections } from '@/lib/navigation/sidebar'

describe('My GEM route', () => {
  test('every role can open /me', () => {
    for (const role of ['admin', 'pastor', 'elder', 'finance_officer', 'member', 'visitor'] as const) {
      expect(canAccessPath(role, '/me')).toBe(true)
    }
  })

  test("'/me' does not open up /members for members", () => {
    expect(canAccessPath('member', '/members')).toBe(false)
    expect(canAccessPath('visitor', '/members/abc')).toBe(false)
  })

  test('sidebar shows My GEM first for members and visitors', () => {
    const first = sidebarNavigationSections[0].items[0]
    expect(first.href).toBe('/me')
    expect(canSeeNavItem('member', first)).toBe(true)
    expect(canSeeNavItem('visitor', first)).toBe(true)
  })
})
