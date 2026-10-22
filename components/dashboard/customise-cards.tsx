'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronUp, RotateCcw, SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface DashboardCardOption<Id extends string> {
  id: Id
  label: string
}

interface StoredLayout {
  order: string[]
  hidden: string[]
}

function readLayout(key: string): StoredLayout | null {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredLayout
    return Array.isArray(parsed.order) && Array.isArray(parsed.hidden) ? parsed : null
  } catch {
    return null
  }
}

/**
 * Card order + visibility for one dashboard, remembered in this browser.
 * Cards added later appear at the end; cards removed from the app are dropped.
 */
export function useDashboardLayout<Id extends string>(storageKey: string, defaults: Id[]) {
  const [order, setOrder] = useState<Id[]>(defaults)
  const [hidden, setHidden] = useState<Id[]>([])

  useEffect(() => {
    const stored = readLayout(storageKey)
    if (!stored) return
    const known = new Set<string>(defaults)
    const kept = stored.order.filter((id): id is Id => known.has(id))
    const missing = defaults.filter((id) => !kept.includes(id))
    setOrder([...kept, ...missing])
    setHidden(stored.hidden.filter((id): id is Id => known.has(id)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, defaults.join('|')])

  const persist = useCallback(
    (nextOrder: Id[], nextHidden: Id[]) => {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify({ order: nextOrder, hidden: nextHidden }))
      } catch {
        // Private mode / storage blocked: layout still applies for this visit.
      }
    },
    [storageKey]
  )

  const toggle = useCallback(
    (id: Id) => {
      setHidden((prev) => {
        const next = prev.includes(id) ? prev.filter((h) => h !== id) : [...prev, id]
        persist(order, next)
        return next
      })
    },
    [order, persist]
  )

  const move = useCallback(
    (id: Id, delta: -1 | 1) => {
      setOrder((prev) => {
        const index = prev.indexOf(id)
        const target = index + delta
        if (index < 0 || target < 0 || target >= prev.length) return prev
        const next = [...prev]
        ;[next[index], next[target]] = [next[target], next[index]]
        persist(next, hidden)
        return next
      })
    },
    [hidden, persist]
  )

  const reset = useCallback(() => {
    setOrder(defaults)
    setHidden([])
    try {
      window.localStorage.removeItem(storageKey)
    } catch {
      // ignore
    }
  }, [defaults, storageKey])

  const visible = order.filter((id) => !hidden.includes(id))
  return { order, hidden, visible, toggle, move, reset }
}

export function CustomiseCardsButton<Id extends string>({
  options,
  order,
  hidden,
  onToggle,
  onMove,
  onReset,
}: {
  options: DashboardCardOption<Id>[]
  order: Id[]
  hidden: Id[]
  onToggle: (id: Id) => void
  onMove: (id: Id, delta: -1 | 1) => void
  onReset: () => void
}) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const labelFor = new Map(options.map((o) => [o.id, o.label]))
  const rows = order.filter((id) => labelFor.has(id))

  return (
    <div ref={wrapRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white/95 px-3 py-1.5 text-sm font-medium text-neutral-800 shadow-sm backdrop-blur hover:bg-white dark:border-neutral-700 dark:bg-neutral-900/90 dark:text-neutral-100 dark:hover:bg-neutral-900"
      >
        <SlidersHorizontal className="h-4 w-4" aria-hidden />
        Customise
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Show and order cards"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-30 w-[290px] rounded-xl border border-neutral-200 bg-white p-2 shadow-xl dark:border-neutral-700 dark:bg-neutral-900"
        >
          <div className="flex items-center justify-between px-2 pb-1 pt-1">
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Show and order cards</p>
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
            >
              <RotateCcw className="h-3 w-3" aria-hidden />
              Reset
            </button>
          </div>
          <ul className="max-h-[60vh] overflow-y-auto">
            {rows.map((id, index) => {
              const on = !hidden.includes(id)
              return (
                <li key={id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-800/60">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={on}
                    aria-label={`Show ${labelFor.get(id)}`}
                    onClick={() => onToggle(id)}
                    className={cn(
                      'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
                      on ? 'bg-brand-600' : 'bg-neutral-300 dark:bg-neutral-600'
                    )}
                  >
                    <span
                      className={cn(
                        'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform',
                        on ? 'translate-x-[18px]' : 'translate-x-0.5'
                      )}
                    />
                  </button>
                  <span className={cn('min-w-0 flex-1 truncate text-sm', on ? 'text-neutral-900 dark:text-neutral-100' : 'text-neutral-400')}>
                    {labelFor.get(id)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onMove(id, -1)}
                    disabled={index === 0}
                    aria-label={`Move ${labelFor.get(id)} up`}
                    className="rounded p-1 text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 dark:hover:bg-neutral-800"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onMove(id, 1)}
                    disabled={index === rows.length - 1}
                    aria-label={`Move ${labelFor.get(id)} down`}
                    className="rounded p-1 text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 dark:hover:bg-neutral-800"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
