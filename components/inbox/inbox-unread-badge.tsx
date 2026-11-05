'use client'

import { useEffect, useState } from 'react'
import { countUnreadInboxAction } from '@/lib/actions/inbox'
import { cn } from '@/lib/utils'

const REFRESH_MS = 60_000
const listeners = new Set<(n: number) => void>()

/** Let the inbox page update the sidebar count straight after reading a thread. */
export function refreshInboxUnreadBadge() {
  void countUnreadInboxAction().then((n) => listeners.forEach((fn) => fn(n)))
}

/** Unread SMS replies, for the sidebar "Inbox" item. Renders nothing at zero. */
export function InboxUnreadBadge({ collapsed = false }: { collapsed?: boolean }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let alive = true
    const set = (n: number) => alive && setCount(n)
    listeners.add(set)
    const load = () => {
      if (document.visibilityState === 'visible') void countUnreadInboxAction().then(set)
    }
    load()
    const timer = window.setInterval(load, REFRESH_MS)
    return () => {
      alive = false
      listeners.delete(set)
      window.clearInterval(timer)
    }
  }, [])

  if (count <= 0) return null
  const label = `${count >= 200 ? '199+' : count} unread`
  if (collapsed) {
    return (
      <span
        className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-brand-600 dark:bg-brand-400"
        aria-label={label}
        role="status"
      />
    )
  }
  return (
    <span
      className={cn(
        'ml-auto inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[11px] font-semibold leading-5',
        'bg-brand-600 text-white dark:bg-brand-500 dark:text-white'
      )}
      aria-label={label}
    >
      {count >= 200 ? '199+' : count}
    </span>
  )
}
