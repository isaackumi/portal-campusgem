import { describe, expect, test } from 'bun:test'
import { hasPermission, type Permission } from '@/lib/auth/roles'
import type { UserRole } from '@/lib/types'
import { navItemTourId, navSectionTourId, tourSelector } from '@/lib/tour/anchors'
import {
  groupTours,
  isPublicPath,
  isTourCompleted,
  markTourCompleted,
  parseTourState,
  readTourState,
  resetTourState,
  routeMatches,
  shouldAutoStart,
  stepsForLayout,
  tourStartPath,
  tourStorageKey,
  toursForPath,
  visibleSteps,
  visibleTours,
  writeTourState,
  type KeyValueStorage,
} from '@/lib/tour/logic'
import { FIRST_RUN_TOUR_ID, TOURS, TOUR_GROUPS, getTour, type Tour } from '@/lib/tour/tours'

const canAs = (role: UserRole, extra: Permission[] = []) => (p: Permission) => hasPermission(role, p, extra)

function memoryStorage(): KeyValueStorage & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  }
}

describe('tour data', () => {
  test('ids are unique, groups are known, every tour has steps', () => {
    const ids = TOURS.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
    const groups = new Set(TOUR_GROUPS.map((g) => g.id))
    for (const tour of TOURS) {
      expect(groups.has(tour.group)).toBe(true)
      expect(tour.steps.length).toBeGreaterThan(0)
      expect(tour.route.startsWith('/')).toBe(true)
    }
  })

  test('tours on [param] pages say where Start goes', () => {
    for (const tour of TOURS.filter((t) => t.route.includes('['))) {
      expect(tour.startRoute).toBeTruthy()
      expect(tour.startHint).toBeTruthy()
    }
  })

  test('the first-run tour exists and needs no permission', () => {
    const tour = getTour(FIRST_RUN_TOUR_ID)
    expect(tour?.permission).toBeUndefined()
    expect(tour?.anyPage).toBe(true)
  })
})

describe('filtering by permission', () => {
  test('a member sees getting-started and groups, not admin tours', () => {
    const ids = visibleTours(TOURS, canAs('member')).map((t) => t.id)
    expect(ids).toContain(FIRST_RUN_TOUR_ID)
    expect(ids).toContain('my-gem')
    expect(ids).toContain('groups')
    expect(ids).not.toContain('members')
    expect(ids).not.toContain('access')
    expect(ids).not.toContain('camp-calls')
    expect(ids).not.toContain('pastoral-care')
  })

  test('an admin sees every tour', () => {
    expect(visibleTours(TOURS, canAs('admin')).length).toBe(TOURS.length)
  })

  test('per-user grants unlock tours', () => {
    const ids = visibleTours(TOURS, canAs('member', ['camp.calls'])).map((t) => t.id)
    expect(ids).toContain('camp-calls')
    expect(ids).not.toContain('camp-registrations')
  })

  test('a list of permissions means any one of them', () => {
    expect(visibleTours(TOURS, canAs('campus_leader')).map((t) => t.id)).toContain('campuses')
    expect(visibleTours(TOURS, canAs('elder')).map((t) => t.id)).toContain('campuses')
    expect(visibleTours(TOURS, canAs('member')).map((t) => t.id)).not.toContain('campuses')
  })

  test('step permissions hide steps', () => {
    const calls = getTour('camp-calls')!
    expect(visibleSteps(calls, canAs('member', ['camp.calls'])).length).toBe(calls.steps.length - 1)
    expect(visibleSteps(calls, canAs('admin')).length).toBe(calls.steps.length)
  })

  test('layout-only steps', () => {
    const steps = getTour(FIRST_RUN_TOUR_ID)!.steps
    const desktop = stepsForLayout(steps, false)
    const mobile = stepsForLayout(steps, true)
    expect(desktop.some((s) => s.element === 'nav-me')).toBe(true)
    expect(mobile.some((s) => s.element === 'nav-me')).toBe(false)
    expect(mobile.some((s) => s.element === 'mobile-tabs')).toBe(true)
    expect(desktop.some((s) => s.element === 'mobile-tabs')).toBe(false)
  })

  test('groupTours keeps group order and drops empty groups', () => {
    const groups = groupTours(visibleTours(TOURS, canAs('member')))
    expect(groups[0].id).toBe('getting-started')
    expect(groups.map((g) => g.id)).not.toContain('camp')
  })
})

describe('route matching', () => {
  test('static and [param] patterns', () => {
    expect(routeMatches('/members', '/members')).toBe(true)
    expect(routeMatches('/members', '/members/')).toBe(true)
    expect(routeMatches('/members', '/members?x=1')).toBe(true)
    expect(routeMatches('/members', '/members/123')).toBe(false)
    expect(routeMatches('/members/[id]', '/members/123')).toBe(true)
    expect(routeMatches('/members/[id]', '/members')).toBe(false)
    expect(routeMatches('/me', '/members')).toBe(false)
  })

  test('the tour for this page', () => {
    expect(toursForPath(TOURS, '/members').map((t) => t.id)).toEqual(['members'])
    expect(toursForPath(TOURS, '/members/abc').map((t) => t.id)).toEqual(['member-profile'])
    expect(toursForPath(TOURS, '/members/add')).toEqual([])
    expect(toursForPath(TOURS, '/groups/add')).toEqual([])
    expect(toursForPath(TOURS, '/admin/camp-meeting/calls').map((t) => t.id)).toEqual(['camp-calls'])
    expect(toursForPath(TOURS, '/admin/camp-meeting').map((t) => t.id)).toEqual(['camp-overview'])
    expect(toursForPath(TOURS, '/me').map((t) => t.id)).toEqual(['my-gem'])
    expect(toursForPath(TOURS, '/financial/donations')).toEqual([])
  })

  test('exact routes come before [param] ones', () => {
    const tours: Tour[] = [
      { id: 'dyn', group: 'people', title: '', description: '', route: '/x/[id]', steps: [{ title: '', body: '' }] },
      { id: 'static', group: 'people', title: '', description: '', route: '/x/new', steps: [{ title: '', body: '' }] },
    ]
    expect(toursForPath(tours, '/x/new').map((t) => t.id)).toEqual(['static', 'dyn'])
  })

  test('where Start navigates', () => {
    expect(tourStartPath(getTour('members')!, '/dashboard')).toBe('/members')
    expect(tourStartPath(getTour('members')!, '/members')).toBeNull()
    expect(tourStartPath(getTour('member-profile')!, '/help')).toBe('/members')
    expect(tourStartPath(getTour('member-profile')!, '/members/42')).toBeNull()
    expect(tourStartPath(getTour(FIRST_RUN_TOUR_ID)!, '/groups')).toBeNull()
  })

  test('public pages are matched by whole segment', () => {
    for (const p of ['/c/abc', '/e/tok', '/i/tok', '/join/legon', '/f/form', '/auth', '/auth/verify', '/', '/rlc/visit']) {
      expect(isPublicPath(p)).toBe(true)
    }
    for (const p of ['/campuses', '/celebrations', '/communication', '/events', '/financial', '/me', '/admin/rlc']) {
      expect(isPublicPath(p)).toBe(false)
    }
  })
})

describe('completed-state storage', () => {
  test('round trip per user', () => {
    const storage = memoryStorage()
    const at = new Date('2026-11-05T10:00:00Z')
    writeTourState(storage, 'u1', markTourCompleted(resetTourState(), 'members', at))
    expect(storage.data.has(tourStorageKey('u1'))).toBe(true)
    const u1 = readTourState(storage, 'u1')
    expect(isTourCompleted(u1, 'members')).toBe(true)
    expect(u1.completed.members).toBe(at.toISOString())
    expect(isTourCompleted(readTourState(storage, 'u2'), 'members')).toBe(false)
  })

  test('bad stored values become an empty state', () => {
    expect(parseTourState(null)).toEqual({ completed: {} })
    expect(parseTourState('not json')).toEqual({ completed: {} })
    expect(parseTourState('42')).toEqual({ completed: {} })
    expect(parseTourState('{"completed":{"a":"2026-01-01","b":3},"autoStarted":"yes"}')).toEqual({
      completed: { a: '2026-01-01' },
    })
  })

  test('storage errors are swallowed', () => {
    const broken: KeyValueStorage = {
      getItem: () => {
        throw new Error('denied')
      },
      setItem: () => {
        throw new Error('quota')
      },
      removeItem: () => undefined,
    }
    expect(readTourState(broken, 'u')).toEqual({ completed: {} })
    expect(() => writeTourState(broken, 'u', { completed: {} })).not.toThrow()
    expect(readTourState(null, 'u')).toEqual({ completed: {} })
  })

  test('reset forgets completions but keeps the first-run flags', () => {
    const state = { completed: { a: 'x' }, autoStarted: true }
    expect(isTourCompleted(state, 'a')).toBe(true)
    const reset = resetTourState(state)
    expect(isTourCompleted(reset, 'a')).toBe(false)
    expect(reset).toEqual({ completed: {}, autoStarted: true })
    expect(resetTourState()).toEqual({ completed: {} })
  })

  test('auto-start rules', () => {
    const fresh = { completed: {} }
    expect(shouldAutoStart(fresh, '/dashboard', FIRST_RUN_TOUR_ID)).toBe(true)
    expect(shouldAutoStart(fresh, '/c/token', FIRST_RUN_TOUR_ID)).toBe(false)
    expect(shouldAutoStart(fresh, '/join/legon', FIRST_RUN_TOUR_ID)).toBe(false)
    expect(shouldAutoStart(fresh, '/help', FIRST_RUN_TOUR_ID)).toBe(false)
    expect(shouldAutoStart({ completed: {}, autoStarted: true }, '/dashboard', FIRST_RUN_TOUR_ID)).toBe(false)
    expect(shouldAutoStart({ completed: {}, autoOptOut: true }, '/dashboard', FIRST_RUN_TOUR_ID)).toBe(false)
    expect(shouldAutoStart(markTourCompleted(fresh, FIRST_RUN_TOUR_ID), '/dashboard', FIRST_RUN_TOUR_ID)).toBe(false)
  })
})

describe('anchors', () => {
  test('sidebar ids', () => {
    expect(navItemTourId('/me')).toBe('nav-me')
    expect(navItemTourId('/admin/rlc/follow-up')).toBe('nav-admin-rlc-follow-up')
    expect(navItemTourId('/admin/forms?module=rlc')).toBe('nav-admin-forms-module-rlc')
    expect(navSectionTourId('Camp meeting')).toBe('nav-section-camp-meeting')
    expect(tourSelector('search')).toBe('[data-tour="search"]')
  })
})
