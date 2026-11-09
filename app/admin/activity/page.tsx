'use client'

/**
 * Activity: who did what, when, and from where. One quiet line per entry (time, who, what), grouped
 * by day; tap an entry for the full record (exact time, area, what it touched, device, IP and any
 * saved details). Filters stay folded away until needed; active ones show as removable chips.
 */
import { useMemo, useState } from 'react'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { RefreshCw, Search, SlidersHorizontal, X } from 'lucide-react'
import { ActivityEntry as Entry } from '@/components/admin/activity-entry'
import { useAuth } from '@/components/providers'
import { AccessDenied } from '@/components/auth/access-denied'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LoadingSpinner } from '@/components/ui/loading'
import { cn } from '@/lib/utils'
import { ACTIVITY_CATEGORIES, categoryMeta } from '@/lib/activity/describe'
import { listActivityAction, listActivityPeopleAction, type ActivityRange, type ActivityRow } from '@/lib/actions/activity'

const RANGES: Array<{ id: ActivityRange; label: string; phrase: string }> = [
  { id: 'today', label: 'Today', phrase: 'today' },
  { id: '7d', label: 'Last 7 days', phrase: 'in the last 7 days' },
  { id: '30d', label: 'Last 30 days', phrase: 'in the last 30 days' },
  { id: 'all', label: 'All time', phrase: 'in total' },
]

function dayLabel(at: number): string {
  const d = new Date(at)
  const today = new Date()
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric' })
}


export default function ActivityPage() {
  const { can } = useAuth()
  const [category, setCategory] = useState<string>('')
  const [range, setRange] = useState<ActivityRange>('7d')
  const [actorId, setActorId] = useState<string>('')
  const [failedOnly, setFailedOnly] = useState(false)
  const [query, setQuery] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)

  const people = useQuery({
    queryKey: ['activity-people'],
    enabled: can('users.manage'),
    queryFn: async () => (await listActivityPeopleAction()).data ?? [],
    staleTime: 5 * 60_000,
  })

  const log = useInfiniteQuery({
    queryKey: ['activity', category, range, actorId, failedOnly],
    enabled: can('users.manage'),
    initialPageParam: null as { cursor: string; since: number } | null,
    queryFn: async ({ pageParam }) => {
      const res = await listActivityAction({ category: category || null, range, actorId: actorId || null, failedOnly, cursor: pageParam?.cursor ?? null, since: pageParam?.since ?? null })
      if (res.error || !res.data) throw new Error(res.error ?? 'Could not load the activity')
      return res.data
    },
    // Every later page reuses the first page's start time, so its cursor stays valid.
    getNextPageParam: (last) => (last.cursor ? { cursor: last.cursor, since: last.since } : undefined),
  })

  const loaded = useMemo(() => (log.data?.pages ?? []).flatMap((p) => p.rows), [log.data])
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return loaded
    return loaded.filter((r) =>
      [r.summary, r.actor_name, r.target_label, r.device, r.ip, ...(r.details ?? []).map((d) => d.value)].some((v) => v?.toLowerCase().includes(q))
    )
  }, [loaded, query])
  const days = useMemo(() => {
    const groups: Array<{ label: string; rows: ActivityRow[] }> = []
    for (const row of rows) {
      const label = dayLabel(row.at)
      const last = groups[groups.length - 1]
      if (last && last.label === label) last.rows.push(row)
      else groups.push({ label, rows: [row] })
    }
    return groups
  }, [rows])

  if (!can('users.manage')) return <AccessDenied permission="users.manage" />

  const personName = (people.data ?? []).find((p) => p.id === actorId)?.name
  const active: Array<{ key: string; label: string; clear: () => void }> = [
    ...(category ? [{ key: 'area', label: categoryMeta(category).label, clear: () => setCategory('') }] : []),
    ...(actorId ? [{ key: 'who', label: personName ?? 'One person', clear: () => setActorId('') }] : []),
    ...(failedOnly ? [{ key: 'failed', label: 'Problems only', clear: () => setFailedOnly(false) }] : []),
  ]
  const rangeInfo = RANGES.find((r) => r.id === range)!
  const failedCount = loaded.filter((r) => r.outcome === 'failed').length

  const select =
    'h-11 w-full rounded-lg border border-neutral-200 bg-white px-3 text-[15px] text-neutral-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 sm:h-10 sm:text-sm'

  return (
    <div className="mx-auto max-w-3xl pb-24">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="app-page-title">Activity</h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            {log.isLoading
              ? 'Who signed in and what changed.'
              : `${loaded.length}${log.hasNextPage ? '+' : ''} ${loaded.length === 1 ? 'entry' : 'entries'} ${rangeInfo.phrase}`}
            {!log.isLoading && failedCount ? <span className="text-red-700 dark:text-red-300"> · {failedCount} failed</span> : null}
          </p>
        </div>
        <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0" onClick={() => void log.refetch()} disabled={log.isFetching} aria-label="Refresh">
          <RefreshCw className={cn('h-4 w-4', log.isFetching && 'animate-spin')} aria-hidden />
        </Button>
      </div>

      {/* Search and filters: one line until opened. */}
      <div className="mt-4 flex gap-2">
        <label className="relative block min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" aria-hidden />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search names, actions, devices" aria-label="Search activity" className="h-11 pl-9 sm:h-10" />
        </label>
        <Button variant="outline" className="h-11 shrink-0 sm:h-10" onClick={() => setFiltersOpen((o) => !o)} aria-expanded={filtersOpen} aria-controls="activity-filters">
          <SlidersHorizontal className="h-4 w-4 sm:mr-2" aria-hidden />
          <span className="sr-only sm:not-sr-only">Filters</span>
          {active.length ? <span className="ml-1.5 rounded-full bg-neutral-900 px-1.5 text-[11px] font-semibold leading-5 text-white dark:bg-white dark:text-neutral-900">{active.length}</span> : null}
        </Button>
      </div>

      {filtersOpen ? (
        <div id="activity-filters" className="mt-2 grid grid-cols-1 gap-3 rounded-xl border border-neutral-200 bg-white p-3 dark:border-white/10 dark:bg-neutral-900 sm:grid-cols-2">
          <label className="grid gap-1.5 text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
            When
            <select value={range} onChange={(e) => setRange(e.target.value as ActivityRange)} className={select}>
              {RANGES.map((r) => (
                <option key={r.id} value={r.id}>{r.label}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
            Area
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={select}>
              <option value="">Everything</option>
              {ACTIVITY_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
            Who
            <select value={actorId} onChange={(e) => setActorId(e.target.value)} className={select}>
              <option value="">Everyone</option>
              {(people.data ?? []).map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>
          <label className="flex min-h-11 cursor-pointer items-center gap-3 self-end rounded-lg border border-neutral-200 px-3 text-sm text-neutral-800 dark:border-neutral-700 dark:text-neutral-200 sm:min-h-10">
            <input type="checkbox" checked={failedOnly} onChange={(e) => setFailedOnly(e.target.checked)} className="h-4 w-4 accent-brand-600" />
            Only problems (failed sign-ins, errors)
          </label>
        </div>
      ) : null}

      {active.length ? (
        <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Active filters">
          {active.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={f.clear}
              className="inline-flex h-8 items-center gap-1 rounded-full border border-neutral-200 bg-white pl-3 pr-2 text-[13px] text-neutral-800 hover:border-neutral-300 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-200"
              aria-label={`Remove filter: ${f.label}`}
            >
              {f.label}
              <X className="h-3.5 w-3.5 text-neutral-500" aria-hidden />
            </button>
          ))}
        </div>
      ) : null}

      {log.isLoading ? (
        <div className="flex min-h-[30vh] items-center justify-center"><LoadingSpinner /></div>
      ) : log.error ? (
        <p className="mt-8 text-sm text-red-700 dark:text-red-300">{log.error instanceof Error ? log.error.message : 'Could not load the activity.'}</p>
      ) : rows.length === 0 ? (
        <div className="mt-10 text-center">
          <p className="app-section-title">Nothing here</p>
          <p className="app-page-description mt-1">
            {query ? 'No loaded entry matches that search.' : 'Nothing matches these filters in this time. Try a longer time or clear a filter.'}
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-6">
          {days.map((day) => (
            <section key={day.label} aria-label={day.label}>
              <h2 className="mb-1 flex items-baseline justify-between px-1">
                <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">{day.label}</span>
                <span className="text-xs tabular-nums text-neutral-500 dark:text-neutral-400">{day.rows.length}</span>
              </h2>
              <ol className="dashboard-panel divide-y divide-neutral-100 overflow-hidden max-sm:-mx-4 max-sm:rounded-none max-sm:border-x-0 dark:divide-white/[0.06]">
                {day.rows.map((row) => (
                  <Entry
                    key={row.id}
                    row={row}
                    open={openId === row.id}
                    onToggle={() => setOpenId(openId === row.id ? null : row.id)}
                    onOnlyThisPerson={
                      row.actor_id
                        ? () => {
                            setActorId(row.actor_id!)
                            setOpenId(null)
                            window.scrollTo({ top: 0, behavior: 'smooth' })
                          }
                        : undefined
                    }
                  />
                ))}
              </ol>
            </section>
          ))}
          {log.hasNextPage ? (
            <Button variant="outline" className="mx-auto h-11 px-6" onClick={() => void log.fetchNextPage()} disabled={log.isFetchingNextPage}>
              {log.isFetchingNextPage ? 'Loading…' : 'Show older entries'}
            </Button>
          ) : (
            <p className="text-center text-xs text-neutral-500 dark:text-neutral-400">That’s everything {rangeInfo.phrase}.</p>
          )}
        </div>
      )}
    </div>
  )
}
