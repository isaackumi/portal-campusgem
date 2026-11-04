'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { CornerDownLeft, FolderKanban, Loader2, Search, Tent, UserRound } from 'lucide-react'
import { useVisibleNav } from '@/lib/navigation/use-visible-nav'
import { globalSearchAction, type SearchHit } from '@/lib/actions/global-search'
import { PersonAvatar } from '@/components/ui/person'
import { cn } from '@/lib/utils'

type Row =
  | { type: 'page'; key: string; title: string; subtitle: string; href: string; icon: React.ComponentType<{ className?: string }> }
  | { type: 'hit'; key: string; hit: SearchHit }

const SECTION_LABEL: Record<SearchHit['kind'], string> = {
  person: 'People',
  camper: 'Camp registrants',
  group: 'Groups',
}

const KIND_ICON: Record<SearchHit['kind'], typeof UserRound> = {
  person: UserRound,
  camper: Tent,
  group: FolderKanban,
}

const RECENT_KEY = 'cg-palette-recent-v1'

function readRecent(): Array<{ title: string; href: string; subtitle?: string }> {
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]')
    return Array.isArray(raw) ? raw.slice(0, 5) : []
  } catch {
    return []
  }
}

function pushRecent(entry: { title: string; href: string; subtitle?: string }) {
  try {
    const next = [entry, ...readRecent().filter((r) => r.href !== entry.href)].slice(0, 5)
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {
    // Storage unavailable: recents just won't persist.
  }
}

/** ⌘K: jump to any page, person, camper or group. */
export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter()
  const { pages } = useVisibleNav()
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<SearchHit[]>([])
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState(0)
  const [recent, setRecent] = useState<ReturnType<typeof readRecent>>([])
  const listRef = useRef<HTMLDivElement>(null)
  const requestId = useRef(0)

  useEffect(() => {
    if (open) {
      setRecent(readRecent())
    } else {
      setQuery('')
      setHits([])
    }
  }, [open])

  // Debounced server search; stale responses are ignored.
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setHits([])
      setLoading(false)
      return
    }
    setLoading(true)
    const id = ++requestId.current
    const t = setTimeout(() => {
      void globalSearchAction(q).then((res) => {
        if (id !== requestId.current) return
        setHits(res.data)
        setLoading(false)
      })
    }, 180)
    return () => clearTimeout(t)
  }, [query])

  const pageRows = useMemo<Row[]>(() => {
    const q = query.trim().toLowerCase()
    const list = q
      ? pages.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.section.toLowerCase().includes(q) ||
            (p.description?.toLowerCase().includes(q) ?? false)
        )
      : []
    return list.slice(0, q ? 6 : 0).map((p) => ({
      type: 'page' as const,
      key: `page-${p.section}-${p.href}`,
      title: p.name,
      subtitle: p.section,
      href: p.href,
      icon: p.icon,
    }))
  }, [pages, query])

  const groups = useMemo(() => {
    const out: Array<{ label: string; rows: Row[] }> = []
    if (!query.trim() && recent.length) {
      out.push({
        label: 'Recent',
        rows: recent.map((r) => ({
          type: 'hit' as const,
          key: `recent-${r.href}`,
          hit: { id: r.href, kind: 'person' as const, title: r.title, subtitle: r.subtitle, href: r.href },
        })),
      })
    }
    if (pageRows.length) out.push({ label: 'Pages', rows: pageRows })
    for (const kind of ['person', 'camper', 'group'] as const) {
      const rows = hits.filter((h) => h.kind === kind).map((hit) => ({ type: 'hit' as const, key: hit.id, hit }))
      if (rows.length) out.push({ label: SECTION_LABEL[kind], rows })
    }
    return out
  }, [query, recent, pageRows, hits])

  const flat = useMemo(() => groups.flatMap((g) => g.rows), [groups])

  useEffect(() => setActive(0), [query, hits.length])

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const go = useCallback(
    (row: Row) => {
      const href = row.type === 'page' ? row.href : row.hit.href
      const title = row.type === 'page' ? row.title : row.hit.title
      const subtitle = row.type === 'page' ? row.subtitle : row.hit.subtitle
      pushRecent({ title, href, subtitle })
      onOpenChange(false)
      router.push(href)
    },
    [onOpenChange, router]
  )

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((i) => Math.min(flat.length - 1, i + 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((i) => Math.max(0, i - 1))
    } else if (event.key === 'Enter' && flat[active]) {
      event.preventDefault()
      go(flat[active])
    }
  }

  let index = -1
  const q = query.trim()

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-neutral-950/40 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          onKeyDown={onKeyDown}
          className="fixed left-1/2 top-[12vh] z-[61] w-[calc(100%-1.5rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-[0.98] data-[state=open]:zoom-in-[0.98] dark:border-neutral-700 dark:bg-neutral-900"
        >
          <DialogPrimitive.Title className="sr-only">Search</DialogPrimitive.Title>
          <div className="flex items-center gap-3 border-b border-neutral-200 px-4 dark:border-neutral-700">
            {loading ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-neutral-400" aria-hidden />
            ) : (
              <Search className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden />
            )}
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search people, campers, groups or pages…"
              aria-label="Search"
              role="combobox"
              aria-expanded
              aria-controls="palette-results"
              aria-activedescendant={flat[active] ? `palette-${flat[active].key}` : undefined}
              className="h-14 min-w-0 flex-1 bg-transparent text-[15px] text-neutral-900 placeholder:text-neutral-400 focus:outline-none dark:text-neutral-100 dark:placeholder:text-neutral-500"
            />
            <kbd className="hidden rounded border border-neutral-200 px-1.5 py-0.5 font-mono text-[11px] text-neutral-500 dark:border-neutral-700 dark:text-neutral-400 sm:inline">
              Esc
            </kbd>
          </div>

          <div ref={listRef} id="palette-results" role="listbox" className="max-h-[min(60vh,28rem)] overflow-y-auto p-2">
            {groups.length === 0 ? (
              <div className="px-3 py-10 text-center">
                {q.length < 2 ? (
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Type a name, phone number, membership ID or check-in code.
                  </p>
                ) : loading ? (
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Searching…</p>
                ) : (
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Nothing found for <span className="font-medium text-neutral-800 dark:text-neutral-200">“{q}”</span>.
                  </p>
                )}
              </div>
            ) : (
              groups.map((group) => (
                <div key={group.label} className="mb-1 last:mb-0">
                  <p className="app-overline px-2 pb-1 pt-2">{group.label}</p>
                  {group.rows.map((row) => {
                    index += 1
                    const i = index
                    const selected = i === active
                    const title = row.type === 'page' ? row.title : row.hit.title
                    const subtitle = row.type === 'page' ? row.subtitle : row.hit.subtitle
                    return (
                      <button
                        key={row.key}
                        id={`palette-${row.key}`}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        data-index={i}
                        onMouseMove={() => setActive(i)}
                        onClick={() => go(row)}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left',
                          selected ? 'bg-neutral-100 dark:bg-neutral-800' : ''
                        )}
                      >
                        {row.type === 'page' ? (
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                            <row.icon className="h-4 w-4" />
                          </span>
                        ) : row.hit.kind === 'group' ? (
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                            {(() => {
                              const Icon = KIND_ICON.group
                              return <Icon className="h-4 w-4" />
                            })()}
                          </span>
                        ) : (
                          <PersonAvatar name={row.hit.title} seed={row.hit.id} size="sm" />
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">{title}</span>
                          {subtitle ? (
                            <span className="block truncate text-xs capitalize text-neutral-500 dark:text-neutral-400">{subtitle}</span>
                          ) : null}
                        </span>
                        {row.type === 'hit' && row.hit.code ? (
                          <span className="hidden shrink-0 font-mono text-xs text-neutral-500 dark:text-neutral-400 sm:inline">{row.hit.code}</span>
                        ) : null}
                        {selected ? <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-neutral-400" aria-hidden /> : null}
                      </button>
                    )
                  })}
                </div>
              ))
            )}
          </div>

          <div className="flex items-center gap-4 border-t border-neutral-200 px-4 py-2 text-[11px] text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
            <span><kbd className="font-mono">↑↓</kbd> move</span>
            <span><kbd className="font-mono">↵</kbd> open</span>
            <span className="ml-auto"><kbd className="font-mono">⌘K</kbd> anywhere</span>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
