'use client'

import 'driver.js/dist/driver.css'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import type { Config, Driver, DriveStep, PopoverDOM } from 'driver.js'
import { useAuth } from '@/components/simple-auth-provider'
import type { Permission } from '@/lib/auth/roles'
import { FIRST_RUN_TOUR_ID, TOURS, getTour, type Tour } from '@/lib/tour/tours'
import {
  EMPTY_TOUR_STATE,
  isDynamicRoute,
  isTourCompleted,
  markTourCompleted,
  readTourState,
  resetTourState,
  shouldAutoStart,
  stepsForLayout,
  tourMatchesPath,
  tourStartPath,
  visibleSteps,
  visibleTours,
  writeTourState,
  type TourState,
} from '@/lib/tour/logic'
import { findTourElement, isMobileLayout, prefersReducedMotion, sleep, waitFor } from '@/components/tour/dom'

/**
 * Guided tours (driver.js). Mounted once in components/providers.tsx so a tour survives the
 * `router.push` to its page. Completed tours are remembered per user in localStorage
 * (not synced across devices). Tour content: lib/tour/tours.ts.
 */

type TourContextValue = {
  /** Tours this user may take. */
  tours: Tour[]
  state: TourState
  isCompleted: (tourId: string) => boolean
  /** Go to the tour's page if needed, then run it. */
  startTour: (tourId: string) => void
  /** Forget every completed tour (and offer the first-run tour again). */
  resetAll: () => void
  activeTourId: string | null
}

const TourContext = createContext<TourContextValue | null>(null)

const FIRST_RUN_DELAY_MS = 1500
const ROUTE_TIMEOUT_MS = 8000
const ELEMENT_TIMEOUT_MS = 4000

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

function baseConfig(): Config {
  const reduced = prefersReducedMotion()
  const dark = document.documentElement.classList.contains('dark')
  return {
    animate: !reduced,
    smoothScroll: !reduced,
    allowClose: true,
    allowKeyboardControl: true,
    // Look, don't touch: clicking a highlighted link mid-tour would leave the tour behind.
    disableActiveInteraction: true,
    overlayColor: '#020617', // slate-950
    overlayOpacity: dark ? 0.7 : 0.5,
    stagePadding: 6,
    stageRadius: 12,
    popoverClass: 'cg-tour',
    popoverOffset: 12,
    showProgress: true,
    progressText: '{{current}} of {{total}}',
    nextBtnText: 'Next',
    prevBtnText: 'Back',
    doneBtnText: 'Done',
    closeBtnLabel: 'Close tour',
  }
}

/**
 * driver.js focuses the first control in the card (the close button); move focus to the
 * primary button instead so Enter goes forward. Runs after driver's own focus call.
 */
function focusPrimary(popover: PopoverDOM) {
  window.setTimeout(() => {
    const btn = popover.nextButton
    if (btn.isConnected && btn.offsetParent !== null) btn.focus({ preventScroll: true })
  }, 0)
}

/** Resolve a tour into driver steps for this page and layout; missing elements are skipped. */
function buildSteps(tour: Tour, can: (p: Permission) => boolean): DriveStep[] {
  const mobile = isMobileLayout()
  const out: DriveStep[] = []
  for (const step of stepsForLayout(visibleSteps(tour, can), mobile)) {
    const id = mobile ? step.mobileElement ?? step.element : step.element
    const description = mobile && step.mobileBody ? step.mobileBody : step.body
    const popover = { title: step.title, description, side: step.side, align: 'start' as const }
    if (!id) {
      out.push({ popover })
      continue
    }
    const el = findTourElement(id)
    if (el) out.push({ element: el, popover })
    else if (step.fallback === 'center') out.push({ popover })
    // else: no permission, hidden on this layout, or not rendered: skip it.
  }
  return out
}

/** Element ids a tour can point at on this layout (to know when its page has rendered). */
function anchorIds(tour: Tour, can: (p: Permission) => boolean): string[] {
  const mobile = isMobileLayout()
  return stepsForLayout(visibleSteps(tour, can), mobile)
    .map((s) => (mobile ? s.mobileElement ?? s.element : s.element))
    .filter((id): id is string => Boolean(id))
}

export function TourProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname() ?? '/'
  const { user, loading, can } = useAuth()
  const userId = user?.id ?? null

  const [state, setState] = useState<TourState>(EMPTY_TOUR_STATE)
  const [loadedFor, setLoadedFor] = useState<string | null>(null)
  const [activeTourId, setActiveTourId] = useState<string | null>(null)

  const driverRef = useRef<Driver | null>(null)
  /** Path the running tour is on; leaving it closes the tour. */
  const startedOnRef = useRef<string | null>(null)
  const runRef = useRef<AbortController | null>(null)
  // Latest values for async callbacks.
  const live = useRef({ pathname, can, userId })
  live.current = { pathname, can, userId }

  useEffect(() => {
    if (!userId) {
      setState(EMPTY_TOUR_STATE)
      setLoadedFor(null)
      return
    }
    setState(readTourState(storage(), userId))
    setLoadedFor(userId)
  }, [userId])

  const update = useCallback((fn: (prev: TourState) => TourState) => {
    setState((prev) => {
      const next = fn(prev)
      const id = live.current.userId
      if (id) writeTourState(storage(), id, next)
      return next
    })
  }, [])

  const stopActive = useCallback(() => {
    runRef.current?.abort()
    runRef.current = null
    if (driverRef.current?.isActive()) driverRef.current.destroy()
    driverRef.current = null
  }, [])

  const startTour = useCallback(
    (tourId: string, options: { auto?: boolean } = {}) => {
      const tour = getTour(tourId)
      if (!tour) return
      stopActive()
      const run = new AbortController()
      runRef.current = run
      const { signal } = run

      void (async () => {
        const { driver } = await import('driver.js')
        if (signal.aborted) return

        const target = tourStartPath(tour, live.current.pathname)
        if (target) router.push(target)

        // Wait for the right page with the app shell on it.
        const onPage = await waitFor(
          () => {
            const path = window.location.pathname
            const right = target ? path === target : tour.anyPage || tourMatchesPath(tour, path)
            return right && document.querySelector('[data-app-main]')
          },
          { timeout: ROUTE_TIMEOUT_MS, signal }
        )
        if (!onPage || signal.aborted) return

        // A tour of an item page (a member, a group) started from elsewhere: say how to get there.
        if (isDynamicRoute(tour.route) && !tourMatchesPath(tour, window.location.pathname)) {
          await sleep(300, signal)
          if (signal.aborted) return
          const d = driver({
            ...baseConfig(),
            showProgress: false,
            showButtons: ['next', 'close'],
            nextBtnText: 'Got it',
            onNextClick: () => d.destroy(),
            onPopoverRender: focusPrimary,
            onDestroyed: () => {
              driverRef.current = null
              setActiveTourId(null)
            },
          })
          driverRef.current = d
          startedOnRef.current = window.location.pathname
          setActiveTourId(tour.id)
          d.highlight({ popover: { title: tour.title, description: tour.startHint ?? '' } })
          return
        }

        // Let the page render: wait for the first anchor, then a moment for the rest.
        const ids = anchorIds(tour, live.current.can)
        if (ids.length > 0) {
          await waitFor(() => ids.some((id) => findTourElement(id)), { timeout: ELEMENT_TIMEOUT_MS, signal })
        }
        await sleep(250, signal)
        if (signal.aborted) return

        const steps = buildSteps(tour, live.current.can)
        if (steps.length === 0) return

        const d = driver({
          ...baseConfig(),
          steps,
          onPopoverRender: (popover) => {
            focusPrimary(popover)
            // First-run tour: offer "Don't show again" on its first card.
            if (!options.auto || !d.isFirstStep()) return
            const btn = document.createElement('button')
            btn.type = 'button'
            btn.className = 'driver-popover-footer-btn cg-tour-optout'
            btn.textContent = 'Don’t show again'
            btn.addEventListener('click', () => {
              update((prev) => ({ ...prev, autoOptOut: true, autoStarted: true }))
              d.destroy()
            })
            popover.footer.insertBefore(btn, popover.footerButtons)
          },
          onDestroyed: (_el, _step, opts) => {
            if (opts.reason === 'done') update((prev) => markTourCompleted(prev, tour.id))
            if (driverRef.current === d) driverRef.current = null
            setActiveTourId((current) => (current === tour.id ? null : current))
          },
        })
        driverRef.current = d
        startedOnRef.current = window.location.pathname
        setActiveTourId(tour.id)
        d.drive()
      })()
    },
    [router, stopActive, update]
  )

  // A tour only makes sense on the page it started on: navigating away closes it.
  // Compared on change only, so a late pathname update for the tour's own page is harmless.
  const prevPathRef = useRef(pathname)
  useEffect(() => {
    if (prevPathRef.current === pathname) return
    prevPathRef.current = pathname
    if (driverRef.current && startedOnRef.current && pathname !== startedOnRef.current) stopActive()
  }, [pathname, stopActive])

  // Sign-out: close anything open.
  useEffect(() => {
    if (!userId) stopActive()
  }, [userId, stopActive])

  useEffect(() => () => stopActive(), [stopActive])

  // First sign-in: offer "Finding your way" once, after a short delay, on a ready app page.
  useEffect(() => {
    if (loading || !userId || loadedFor !== userId) return
    if (!shouldAutoStart(state, pathname, FIRST_RUN_TOUR_ID)) return
    const ctrl = new AbortController()
    void (async () => {
      await sleep(FIRST_RUN_DELAY_MS, ctrl.signal)
      const ready = await waitFor(
        () =>
          Boolean(document.querySelector('[data-app-main]')) &&
          Boolean(findTourElement('search')) &&
          // Nothing else open (a dialog, the mobile menu, another tour).
          !document.querySelector('[role="dialog"], [role="alertdialog"]') &&
          !driverRef.current,
        { timeout: 5000, interval: 250, signal: ctrl.signal }
      )
      if (!ready || ctrl.signal.aborted) return
      update((prev) => ({ ...prev, autoStarted: true }))
      startTour(FIRST_RUN_TOUR_ID, { auto: true })
    })()
    return () => ctrl.abort()
  }, [loading, userId, loadedFor, state, pathname, startTour, update])

  const tours = useMemo(() => (user ? visibleTours(TOURS, can) : []), [user, can])

  const value = useMemo<TourContextValue>(
    () => ({
      tours,
      state,
      isCompleted: (id) => isTourCompleted(state, id),
      startTour: (id) => startTour(id),
      resetAll: () => update((prev) => resetTourState(prev)),
      activeTourId,
    }),
    [tours, state, startTour, update, activeTourId]
  )

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>
}

export function useTour(): TourContextValue {
  const ctx = useContext(TourContext)
  if (!ctx) throw new Error('useTour must be used inside <TourProvider>')
  return ctx
}
