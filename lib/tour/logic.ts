import type { Permission } from '@/lib/auth/roles'
import { TOUR_GROUPS, type Tour, type TourGroupId, type TourStep } from '@/lib/tour/tours'

/** Pure helpers for the guided tours (unit-tested in logic.test.ts). */

type Can = (permission: Permission) => boolean

/** True when no permission is needed, or the user has it (or any one of a list). */
export function allowedBy(permission: Permission | Permission[] | undefined, can: Can): boolean {
  if (!permission) return true
  const list = Array.isArray(permission) ? permission : [permission]
  return list.some((p) => can(p))
}

/** Tours this user may take, in the order they are defined. */
export function visibleTours(tours: readonly Tour[], can: Can): Tour[] {
  return tours.filter((tour) => allowedBy(tour.permission, can))
}

/** The steps of a tour this user may see (step-level permissions). */
export function visibleSteps(tour: Tour, can: Can): TourStep[] {
  return tour.steps.filter((step) => allowedBy(step.permission, can))
}

/** Steps for one layout: drops `only: 'desktop'` steps on mobile and vice versa. */
export function stepsForLayout(steps: readonly TourStep[], mobile: boolean): TourStep[] {
  return steps.filter((step) => !step.only || step.only === (mobile ? 'mobile' : 'desktop'))
}

/** Groups in display order with their visible tours; empty groups are dropped. */
export function groupTours(
  tours: readonly Tour[]
): Array<{ id: TourGroupId; title: string; description: string; tours: Tour[] }> {
  return TOUR_GROUPS.map((group) => ({ ...group, tours: tours.filter((t) => t.group === group.id) })).filter(
    (group) => group.tours.length > 0
  )
}

function normalizePath(pathname: string): string {
  const path = pathname.split('?')[0].split('#')[0]
  if (path.length > 1 && path.endsWith('/')) return path.slice(0, -1)
  return path || '/'
}

/** Does `pathname` match a route pattern such as `/members/[id]`? Segment by segment, exact length. */
export function routeMatches(pattern: string, pathname: string): boolean {
  const want = normalizePath(pattern).split('/')
  const have = normalizePath(pathname).split('/')
  if (want.length !== have.length) return false
  return want.every((segment, i) => (/^\[.+\]$/.test(segment) ? have[i].length > 0 : segment === have[i]))
}

export function isDynamicRoute(route: string): boolean {
  return /\[.+\]/.test(route)
}

/** Is `tour` the tour for this page? */
export function tourMatchesPath(tour: Tour, pathname: string): boolean {
  const path = normalizePath(pathname)
  if (tour.excludeRoutes?.some((r) => normalizePath(r) === path)) return false
  return routeMatches(tour.route, path)
}

/** Tours for the current page, exact routes before `[param]` ones. */
export function toursForPath(tours: readonly Tour[], pathname: string): Tour[] {
  return tours
    .filter((tour) => tourMatchesPath(tour, pathname))
    .sort((a, b) => Number(isDynamicRoute(a.route)) - Number(isDynamicRoute(b.route)))
}

/** Where to go before starting, or null to start right here. */
export function tourStartPath(tour: Tour, pathname: string): string | null {
  if (tour.anyPage || tourMatchesPath(tour, pathname)) return null
  if (isDynamicRoute(tour.route)) return tour.startRoute ?? null
  return tour.route
}

/**
 * Pages where tours never auto-start: public links, sign-in, and the public camp / RLC
 * sign-up forms. Matched by whole segment, so '/c' doesn't catch '/campuses'.
 */
export const PUBLIC_PATH_PREFIXES = ['/c', '/e', '/i', '/join', '/f', '/auth', '/camp-meeting', '/rlc'] as const

export function isPublicPath(pathname: string): boolean {
  const path = normalizePath(pathname)
  if (path === '/') return true
  return PUBLIC_PATH_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
}

// ── Completed-state storage ──────────────────────────────────────────────────

export type TourState = {
  /** Tour id → ISO time it was finished. */
  completed: Record<string, string>
  /** The first-sign-in tour has been offered (it is offered once). */
  autoStarted?: boolean
  /** "Don't show again": never auto-start a tour for this user. */
  autoOptOut?: boolean
}

export const EMPTY_TOUR_STATE: TourState = { completed: {} }

/** Minimal Storage surface, so tests can pass a plain object. */
export type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export function tourStorageKey(userId: string): string {
  return `cg-tours-v1:${userId}`
}

/** Parse stored JSON defensively: anything unexpected becomes an empty state. */
export function parseTourState(raw: string | null | undefined): TourState {
  if (!raw) return { completed: {} }
  try {
    const value = JSON.parse(raw) as unknown
    if (!value || typeof value !== 'object') return { completed: {} }
    const v = value as Record<string, unknown>
    const completed: Record<string, string> = {}
    if (v.completed && typeof v.completed === 'object') {
      for (const [id, at] of Object.entries(v.completed as Record<string, unknown>)) {
        if (typeof at === 'string') completed[id] = at
      }
    }
    return {
      completed,
      ...(v.autoStarted === true ? { autoStarted: true } : {}),
      ...(v.autoOptOut === true ? { autoOptOut: true } : {}),
    }
  } catch {
    return { completed: {} }
  }
}

export function readTourState(storage: KeyValueStorage | null | undefined, userId: string): TourState {
  if (!storage) return { completed: {} }
  try {
    return parseTourState(storage.getItem(tourStorageKey(userId)))
  } catch {
    return { completed: {} }
  }
}

export function writeTourState(storage: KeyValueStorage | null | undefined, userId: string, state: TourState): void {
  if (!storage) return
  try {
    storage.setItem(tourStorageKey(userId), JSON.stringify(state))
  } catch {
    // Private mode / quota: progress just isn't remembered.
  }
}

export function markTourCompleted(state: TourState, tourId: string, now: Date = new Date()): TourState {
  return { ...state, completed: { ...state.completed, [tourId]: now.toISOString() } }
}

export function isTourCompleted(state: TourState, tourId: string): boolean {
  return Boolean(state.completed[tourId])
}

/**
 * "Reset all tours": forget completions. The first-run flags stay, so resetting from /help
 * doesn't make the welcome tour pop up again on the next page.
 */
export function resetTourState(prev: TourState = EMPTY_TOUR_STATE): TourState {
  return {
    completed: {},
    ...(prev.autoStarted ? { autoStarted: true } : {}),
    ...(prev.autoOptOut ? { autoOptOut: true } : {}),
  }
}

/** Should the first-run tour start on its own? (Layout readiness is checked by the caller.) */
export function shouldAutoStart(state: TourState, pathname: string, firstRunTourId: string): boolean {
  if (isPublicPath(pathname)) return false
  if (normalizePath(pathname) === '/help') return false
  if (state.autoOptOut || state.autoStarted) return false
  return !isTourCompleted(state, firstRunTourId)
}
