import { describe, expect, test } from 'bun:test'
import type { Permission } from '@/lib/auth/roles'
import { activeWorkspaceId, buildWorkspaces, campusCode, shouldShowSwitcher } from './workspaces'

const campuses = [
  { id: 'c1', key: 'uew', name: 'University of Education, Winneba', short_code: 'UEW' },
  { id: 'c2', key: 'ucc', name: 'University of Cape Coast', short_code: 'UCC' },
]

const canAll = () => true
const canOnly = (...perms: Permission[]) => (p: Permission) => perms.includes(p)

describe('buildWorkspaces', () => {
  test('admin gets every area, each campus and the campus overview', () => {
    const ids = buildWorkspaces(canAll, campuses).map((w) => w.id)
    expect(ids).toEqual(['church', 'rlc', 'camp', 'corporate', 'campus:c1', 'campus:c2', 'campuses'])
  })

  test('campus leader of one campus has nothing to switch to', () => {
    const ws = buildWorkspaces(canOnly('dashboard.view', 'campus.lead'), [campuses[0]!])
    expect(ws.map((w) => w.id)).toEqual(['church', 'campus:c1'])
    expect(shouldShowSwitcher(ws)).toBe(true)
  })

  test('plain member sees only the church and no switcher', () => {
    const ws = buildWorkspaces(canOnly('dashboard.view'), campuses)
    expect(ws.map((w) => w.id)).toEqual(['church'])
    expect(shouldShowSwitcher(ws)).toBe(false)
  })

  test('campuses are ignored without campus permissions', () => {
    const ws = buildWorkspaces(canOnly('dashboard.view', 'rlc.view'), campuses)
    expect(ws.map((w) => w.id)).toEqual(['church', 'rlc'])
  })
})

describe('activeWorkspaceId', () => {
  const ws = buildWorkspaces(canAll, campuses)
  test.each([
    ['/dashboard', 'church'],
    ['/members/abc', 'church'],
    ['/admin/rlc/visitors', 'rlc'],
    ['/visitors/add', 'rlc'],
    ['/admin/camp-meeting/scan', 'camp'],
    ['/admin/corporate-gem', 'corporate'],
    ['/campuses/uew', 'campus:c1'],
    ['/campuses/ucc/responses/f1', 'campus:c2'],
    ['/campuses', 'campuses'],
    ['/campuses/unknown', 'campuses'],
    ['/admin/rlcx', 'church'],
  ])('%s → %s', (path, id) => {
    expect(activeWorkspaceId(path, ws)).toBe(id)
  })

  test('returns null when the matching workspace is not available', () => {
    const limited = buildWorkspaces(canOnly('dashboard.view'), [])
    expect(activeWorkspaceId('/admin/rlc', limited)).toBeNull()
  })
})

describe('campusCode', () => {
  test('prefers the short code', () => {
    expect(campusCode({ name: 'University of Ghana', short_code: 'ug' })).toBe('UG')
  })
  test('falls back to initials, skipping small words and brackets', () => {
    expect(campusCode({ name: 'University of Ghana (Legon)' })).toBe('UG')
    expect(campusCode({ name: 'Accra Technical University' })).toBe('ATU')
  })
})
