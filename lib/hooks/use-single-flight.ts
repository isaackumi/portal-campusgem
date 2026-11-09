'use client'

import { useCallback, useRef, useState } from 'react'

/**
 * One async action at a time, with a name for what is running.
 *
 *   const { busy, run } = useSingleFlight<'next' | 'save'>()
 *   <Button disabled={busy !== null} onClick={() => run('save', save)}>
 *
 * - A second `run` while one is in flight is ignored (returns undefined): no double submits, even
 *   from taps that land before React re-renders the disabled button.
 * - `busy` always clears when the action ends, including when it throws, so buttons never stay stuck.
 * - Errors are passed to `onError` when given (e.g. a toast); otherwise they are re-thrown.
 *
 * Use this instead of ad-hoc `setBusy(...)` / `setSubmitting(true)` pairs (AGENTS.md "State machines").
 */
export function useSingleFlight<K extends string = string>(onError?: (error: unknown, key: K) => void) {
  const [busy, setBusy] = useState<K | null>(null)
  const current = useRef<K | null>(null)
  const onErrorRef = useRef(onError)
  onErrorRef.current = onError

  const run = useCallback(async <T,>(key: K, action: () => Promise<T>): Promise<T | undefined> => {
    if (current.current !== null) return undefined
    current.current = key
    setBusy(key)
    try {
      return await action()
    } catch (error) {
      if (onErrorRef.current) {
        onErrorRef.current(error, key)
        return undefined
      }
      throw error
    } finally {
      current.current = null
      setBusy(null)
    }
  }, [])

  return { busy, run, isBusy: busy !== null }
}
