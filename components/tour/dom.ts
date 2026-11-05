import { tourSelector } from '@/lib/tour/anchors'

/** DOM helpers for the guided tours (browser only). */

/** Matches the sidebar breakpoint (`lg`): below it the sidebar is a slide-out menu. */
export const DESKTOP_QUERY = '(min-width: 1024px)'

export function isMobileLayout(): boolean {
  return typeof window !== 'undefined' && !window.matchMedia(DESKTOP_QUERY).matches
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** On screen and not hidden (closed sidebar groups are `visibility: hidden` with no height). */
export function isVisible(el: Element): boolean {
  const rect = el.getBoundingClientRect()
  if (rect.width === 0 && rect.height === 0) return false
  const style = window.getComputedStyle(el)
  return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0'
}

/** The first visible element with `data-tour="<id>"`, or null. */
export function findTourElement(id: string): HTMLElement | null {
  const matches = document.querySelectorAll<HTMLElement>(tourSelector(id))
  for (const el of Array.from(matches)) {
    if (isVisible(el)) return el
  }
  return null
}

/**
 * Poll `check` until it returns something, the time runs out (→ null), or `signal` aborts.
 * Used after `router.push` to wait for the next page to render.
 */
export function waitFor<T>(
  check: () => T | null | undefined | false,
  { timeout = 5000, interval = 100, signal }: { timeout?: number; interval?: number; signal?: AbortSignal } = {}
): Promise<T | null> {
  return new Promise((resolve) => {
    const started = Date.now()
    const tick = () => {
      if (signal?.aborted) return resolve(null)
      const value = check()
      if (value) return resolve(value)
      if (Date.now() - started >= timeout) return resolve(null)
      window.setTimeout(tick, interval)
    }
    tick()
  })
}

/** Wait for a visible `data-tour` element. */
export function waitForElement(
  id: string,
  options?: { timeout?: number; interval?: number; signal?: AbortSignal }
): Promise<HTMLElement | null> {
  return waitFor(() => findTourElement(id), options)
}

export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const id = window.setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      window.clearTimeout(id)
      resolve()
    })
  })
}
