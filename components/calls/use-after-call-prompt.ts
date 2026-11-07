'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * "How did it go?" after a call: tapping Call opens the phone app; when the caller comes back to
 * this page (a few seconds later at least), the prompt opens for that person, so the list is
 * updated while the call is fresh.
 */
export function useAfterCallPrompt<T extends { id: string }>() {
  const pending = useRef<{ target: T; at: number } | null>(null)
  const [prompt, setPrompt] = useState<T | null>(null)

  useEffect(() => {
    const back = () => {
      if (document.visibilityState !== 'visible') return
      const p = pending.current
      if (!p) return
      pending.current = null
      // Back within a couple of seconds is a mis-tap, not a call.
      if (Date.now() - p.at > 3000) setPrompt(p.target)
    }
    document.addEventListener('visibilitychange', back)
    window.addEventListener('focus', back)
    return () => {
      document.removeEventListener('visibilitychange', back)
      window.removeEventListener('focus', back)
    }
  }, [])

  /** Call this as the Call link is tapped. */
  const calling = useCallback((target: T) => {
    pending.current = { target, at: Date.now() }
  }, [])

  return { prompt, calling, dismiss: () => setPrompt(null) }
}
