'use client'

/**
 * Activity: who did what, when, and from where. Sign-ins (and failed ones), access changes, people,
 * groups, camp meeting, calls and texts, newest first, grouped by day, colour-coded by area.
 */
import { useMemo, useState } from 'react'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { AlertTriangle, Clock, Monitor, RefreshCw } from 'lucide-react'
import { useAuth } from '@/components/providers'
import { AccessDenied } from '@/components/auth/access-denied'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading'
import { cn } from '@/lib/utils'
import { ACTIVITY_CATEGORIES, categoryMeta } from '@/lib/activity/describe'
import { listActivityAction, listActivityPeopleAction, type ActivityRange, type ActivityRow } from '@/lib/actions/activity'

const RANGES: Array<{ id: ActivityRange; label: string }> = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
  { id: 'all', label: 'All' },
]

function dayLabel(at: number): string {
  const d = new Date(at)
  const today = new Date()
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric' })
}

const time = (at: number) => new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

export default function ActivityPage() {
  const { can } = useAuth()
  const [category, setCategory] = useState<string | null>(null)
  const [range, setRange] = useState<ActivityRange>('7d')
  const [actorId, setActorId] = useState<string>('')
  const [failedOnly, setFailedOnly] = useState(false)

  const people = useQuery({
    queryKey: ['activity-people'],
    enabled: can('users.manage'),
    queryFn: async () => (await listActivityPeopleAction()).data ?? [],
    staleTime: 5 * 60_000,
  })

  const log = useInfiniteQuery({
    queryKey: ['activity', category, range, actorId, failedOnly],
    enabled: can('users.manage'),
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const res = await listActivityAction({ category, range, actorId: actorId || null, failedOnly, cursor: pageParam })
      if (res.error || !res.data) throw new Error(res.error ?? 'Could not load the activity')
      return res.data
    },
    getNextPageParam: (last) => last.cursor,
  })

  const rows = useMemo(() => (log.data?.pages ?? []).flatMap((p) => p.rows), [log.data])
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

  return (
    <div className="mx-auto max-w-4xl pb-24">
      <PageHeader
        title="Activity"
        description="Who signed in and what changed across the app, newest first."
        actions={
          <Button variant="outline" onClick={() => void log.refetch()} disabled={log.isFetching} aria-label="Refresh">
            <RefreshCw className={cn('h-4 w-4 sm:mr-2', log.isFetching && 'animate-spin')} aria-hidden />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        }
      />

      <section className="dashboard-panel grid gap-3 p-3 sm:p-4" aria-label="Filters">
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="radiogroup" aria-label="Area">
          <Chip active={category === null} onClick={() => setCategory(null)} dot="bg-neutral-400">All</Chip>
          {ACTIVITY_CATEGORIES.map((c) => (
            <Chip key={c.id} active={category === c.id} onClick={() => setCategory(category === c.id ? null : c.id)} dot={c.dot}>
              {c.label}
            </Chip>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div role="radiogroup" aria-label="When" className="inline-flex w-full rounded-lg bg-neutral-200/60 p-0.5 dark:bg-neutral-800 sm:w-auto">
            {RANGES.map((r) => (
              <button
                key={r.id}
                type="button"
                role="radio"
                aria-checked={range === r.id}
                onClick={() => setRange(r.id)}
                className={cn('h-9 flex-1 rounded-md px-3 text-[13px] font-medium sm:flex-none', range === r.id ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-white' : 'text-neutral-600 dark:text-neutral-400')}
              >
                {r.label}
              </button>
            ))}
          </div>
          <select
            aria-label="Who"
            value={actorId}
            onChange={(e) => setActorId(e.target.value)}
            className="h-10 min-w-0 flex-1 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-900 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
          >
            <option value="">Everyone</option>
            {(people.data ?? []).map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button
            type="button"
            role="switch"
            aria-checked={failedOnly}
            onClick={() => setFailedOnly((v) => !v)}
            className={cn(
              'inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-3 text-[13px] font-medium',
              failedOnly ? 'border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200' : 'border-neutral-200 text-neutral-700 dark:border-neutral-600 dark:text-neutral-300'
            )}
          >
            <AlertTriangle className="h-4 w-4" aria-hidden />
            Failed only
          </button>
        </div>
      </section>

      {log.isLoading ? (
        <div className="flex min-h-[30vh] items-center justify-center"><LoadingSpinner /></div>
      ) : log.error ? (
        <p className="mt-8 text-sm text-red-700 dark:text-red-300">{log.error instanceof Error ? log.error.message : 'Could not load the activity.'}</p>
      ) : rows.length === 0 ? (
        <div className="mt-6 flex flex-col items-center rounded-xl border border-dashed border-neutral-300 px-6 py-14 text-center dark:border-neutral-700">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 dark:bg-white/[0.06] dark:text-neutral-400">
            <Clock className="h-5 w-5" aria-hidden />
          </span>
          <p className="app-section-title mt-4">Nothing here</p>
          <p className="app-page-description mt-1 max-w-sm">Nothing matches these filters in this time. Widen the time or clear a filter.</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-6">
          {days.map((day) => (
            <section key={day.label} aria-label={day.label}>
              <h2 className="app-overline mb-2 px-1">{day.label}</h2>
              <ol className="dashboard-panel divide-y divide-neutral-100 overflow-hidden dark:divide-neutral-700/70">
                {day.rows.map((row) => {
                  const meta = categoryMeta(row.category)
                  const failed = row.outcome === 'failed'
                  return (
                    <li key={row.id} className={cn('flex gap-3 px-4 py-3', failed && 'bg-red-50/60 dark:bg-red-950/20')}>
                      <span className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold', failed ? 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300' : meta.tone)} aria-hidden>
                        {failed ? <AlertTriangle className="h-4 w-4" /> : meta.label.slice(0, 2)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-neutral-800 dark:text-neutral-200">
                          {row.actor_name ? <span className="font-semibold text-neutral-900 dark:text-neutral-50">{row.actor_name} </span> : null}
                          <span>{row.actor_name ? lowerFirst(row.summary) : row.summary}</span>
                        </p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-neutral-500 dark:text-neutral-400">
                          <span className="tabular-nums">{time(row.at)}</span>
                          <span className={cn('rounded-full px-1.5 py-px text-[11px] font-medium', meta.tone)}>{meta.label}</span>
                          {row.device ? (
                            <span className="inline-flex items-center gap-1"><Monitor className="h-3 w-3" aria-hidden />{row.device}</span>
                          ) : null}
                          {row.ip ? <span className="font-mono">{row.ip}</span> : null}
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ol>
            </section>
          ))}
          {log.hasNextPage ? (
            <Button variant="outline" className="mx-auto h-11" onClick={() => void log.fetchNextPage()} disabled={log.isFetchingNextPage}>
              {log.isFetchingNextPage ? 'Loading…' : 'Load more'}
            </Button>
          ) : null}
        </div>
      )}
    </div>
  )
}

function lowerFirst(text: string): string {
  // "Signed in" reads as "Kofi signed in"; names stay capitalised.
  return text && /^[A-Z][a-z]/.test(text) ? text[0]!.toLowerCase() + text.slice(1) : text
}

function Chip({ active, onClick, dot, children }: { active: boolean; onClick: () => void; dot: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        'inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 text-[13px] font-medium transition-colors',
        active ? 'border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900' : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
      )}
    >
      <span className={cn('h-2 w-2 rounded-full', dot)} aria-hidden />
      {children}
    </button>
  )
}
