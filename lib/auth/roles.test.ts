import { describe, expect, test } from 'bun:test'
import {
  canAccessPath,
  decodePermissionsCookie,
  effectivePermissions,
  encodePermissionsCookie,
  hasPermission,
  safeRedirectPath,
} from './roles'
import { canSeeNavItem, filterSidebarSections } from '@/lib/navigation/sidebar'

describe('per-user permissions', () => {
  test('extra grants add to the role', () => {
    expect(hasPermission('elder', 'camp.settings')).toBe(false)
    expect(hasPermission('elder', 'camp.settings', ['camp.settings'])).toBe(true)
    expect(canAccessPath('elder', '/admin/camp-meeting/years', ['camp.settings'])).toBe(true)
    expect(canAccessPath('elder', '/admin/camp-meeting/years')).toBe(false)
  })

  test('unknown permission strings are ignored', () => {
    expect(hasPermission('member', 'users.manage', ['not.real', 'users.manage'])).toBe(true)
    expect(effectivePermissions('visitor', ['bogus'])).toEqual(['dashboard.view', 'attendance.view'])
  })

  test('cookie round-trips and drops junk', () => {
    expect(decodePermissionsCookie(encodePermissionsCookie(['camp.manage', 'x', 'camp.manage']))).toEqual([
      'camp.manage',
    ])
    expect(decodePermissionsCookie(undefined)).toEqual([])
  })
})

describe('admins see everything admins should', () => {
  test('every sidebar item is visible to an admin', () => {
    const sections = filterSidebarSections('admin')
    const hrefs = sections.flatMap((s) => s.items.map((i) => i.href))
    expect(hrefs).toContain('/admin/users')
    expect(hrefs).toContain('/admin/admins')
    expect(hrefs).toContain('/admin/camp-meeting/years')
    expect(hrefs).toContain('/admin/campus-activities')
  })

  test('nav visibility matches route access', () => {
    for (const section of filterSidebarSections('elder')) {
      for (const item of section.items) {
        expect(canAccessPath('elder', item.href.split('?')[0])).toBe(true)
      }
    }
  })

  test('granted permission reveals the nav link', () => {
    const item = { name: 'Users', href: '/admin/users' } as Parameters<typeof canSeeNavItem>[1]
    expect(canSeeNavItem('pastor', item)).toBe(false)
    expect(canSeeNavItem('pastor', item, ['users.manage'])).toBe(true)
  })
})

describe('safeRedirectPath', () => {
  test('blocks off-site and loop redirects', () => {
    expect(safeRedirectPath('https://evil.example')).toBe('/dashboard')
    expect(safeRedirectPath('//evil.example')).toBe('/dashboard')
    expect(safeRedirectPath('/\\evil.example')).toBe('/dashboard')
    expect(safeRedirectPath('/auth?redirect=/x')).toBe('/dashboard')
    expect(safeRedirectPath('/admin/users?tab=1')).toBe('/admin/users?tab=1')
    expect(safeRedirectPath(null)).toBe('/dashboard')
  })
})
