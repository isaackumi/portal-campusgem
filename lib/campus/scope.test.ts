import { describe, expect, test } from 'bun:test'
import {
  allowsCampusLevel,
  campusAccessLevel,
  canAssignCampusRole,
  ledCampusIdsFrom,
  viewableCampusIdsFrom,
  type CampusScopeMembership,
} from '@/lib/campus/scope'
import { canAccessPath } from '@/lib/auth/roles'

const UEW = 'uew_group_id'
const UCC = 'ucc_group_id'
const leader = { role: 'campus_leader' as const, permissions: [] }

function m(group_id: string, role: CampusScopeMembership['role'], is_active = true, group_type = 'campus'): CampusScopeMembership {
  return { group_id, role, is_active, group_type }
}

describe('campusAccessLevel', () => {
  test('admin (groups.manage) manages any campus with no membership', () => {
    expect(campusAccessLevel({ role: 'admin' }, [], UEW)).toBe('manage')
    expect(campusAccessLevel({ role: 'elder' }, [], UCC)).toBe('manage')
  })

  test('a plain member who leads the campus is denied without campus.lead', () => {
    expect(campusAccessLevel({ role: 'member' }, [m(UEW, 'leader')], UEW)).toBeNull()
  })

  test('campus leader who is not a leader there is denied', () => {
    expect(campusAccessLevel(leader, [m(UEW, 'member')], UEW)).toBeNull()
    expect(campusAccessLevel(leader, [], UEW)).toBeNull()
  })

  test('leader of another campus is denied', () => {
    expect(campusAccessLevel(leader, [m(UCC, 'leader')], UEW)).toBeNull()
  })

  test('inactive leader membership is denied', () => {
    expect(campusAccessLevel(leader, [m(UEW, 'leader', false)], UEW)).toBeNull()
  })

  test('leadership of a non-campus group does not count', () => {
    expect(campusAccessLevel(leader, [m(UEW, 'leader', true, 'ministry')], UEW)).toBeNull()
  })

  test('leader and co-leader manage; executive views only', () => {
    expect(campusAccessLevel(leader, [m(UEW, 'leader')], UEW)).toBe('manage')
    expect(campusAccessLevel(leader, [m(UEW, 'co_leader')], UEW)).toBe('manage')
    expect(campusAccessLevel(leader, [m(UEW, 'executive')], UEW)).toBe('view')
    expect(allowsCampusLevel('view', 'manage')).toBe(false)
    expect(allowsCampusLevel('view', 'view')).toBe(true)
    expect(allowsCampusLevel(null, 'view')).toBe(false)
  })

  test('campus.lead as a per-user grant works like the role', () => {
    expect(campusAccessLevel({ role: 'member', permissions: ['campus.lead'] }, [m(UEW, 'leader')], UEW)).toBe('manage')
  })

  test('empty group id is denied even for admins', () => {
    expect(campusAccessLevel({ role: 'admin' }, [], '')).toBeNull()
  })
})

describe('led / viewable ids', () => {
  test('only active leader seats on campuses', () => {
    const rows = [m(UEW, 'leader'), m(UCC, 'leader', false), m('x', 'executive'), m('y', 'co_leader', true, 'ministry')]
    expect(ledCampusIdsFrom(leader, rows)).toEqual([UEW])
    expect(viewableCampusIdsFrom(leader, rows).sort()).toEqual([UEW, 'x'].sort())
    expect(ledCampusIdsFrom({ role: 'member' }, rows)).toEqual([])
  })
})

describe('canAssignCampusRole', () => {
  test('leaders cannot appoint or change the leader', () => {
    expect(canAssignCampusRole(false, 'leader')).toBe(false)
    expect(canAssignCampusRole(false, 'member', 'leader')).toBe(false)
    expect(canAssignCampusRole(false, 'executive', 'member')).toBe(true)
    expect(canAssignCampusRole(true, 'leader', 'member')).toBe(true)
  })
})

describe('/campuses route', () => {
  test('needs groups.manage or campus.lead', () => {
    expect(canAccessPath('admin', '/campuses')).toBe(true)
    expect(canAccessPath('campus_leader', '/campuses/uew')).toBe(true)
    expect(canAccessPath('member', '/campuses')).toBe(false)
    expect(canAccessPath('member', '/campuses', ['campus.lead'])).toBe(true)
    expect(canAccessPath('campus_leader', '/members')).toBe(false)
  })
})
