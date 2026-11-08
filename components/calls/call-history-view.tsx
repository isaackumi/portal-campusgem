'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ChevronDown, Download, Search } from 'lucide-react'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LoadingSpinner } from '@/components/ui/loading'
import type { CallHistoryData } from '@/lib/actions/call-center'
import {
  callerStats,
  callSeconds,
  callsCsv,
  formatSeconds,
  groupCalls,
  outcomeText,
  sessionOf,
  type CallerStats,
  type CallGroup,
  type CallRow,
} from '@/lib/calls/history'
import { cn } from '@/lib/utils'

type View = 'callers' | 'calls'
type ResultFilter = 'all' | 'confirmed' | 'maybe' | 'declined' | 'unreachable' | 'link'
type SortBy = 'calls' | 'reach' | 'coming'

const RESULT_FILTERS: Array<{ id: ResultFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'confirmed', label: 'Coming' },
  { id: 'maybe', label: 'Not sure' },
  { id: 'declined', label: 'Not coming' },
  { id: 'unreachable', label: 'No answer' },
  { id: 'link', label: 'By link' },
]

function tone(row: Pick<CallRow, 'outcome' | 'kind'>): BadgeProps['variant'] {
  if (row.kind === 'link') return 'brand'
  if (row.outcome === 'confirmed') return 'success'
  if (row.outcome === 'maybe') return 'warning'
  if (row.outcome === 'declined') return 'danger'
  return 'secondary'
}

const time = (at: number) => new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
const day = (at: number) => new Date(at).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })
const pct = (n: number) => `${Math.round(n * 100)}%`

function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: Array<{ id: T; label: string }>; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex w-full rounded-lg bg-neutral-100 p-1 dark:bg-neutral-800 sm:w-auto">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            'h-9 flex-1 rounded-md px-4 text-sm font-medium transition-colors sm:flex-none',
            value === o.id ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-white' : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'h-9 shrink-0 rounded-full border px-3.5 text-[13px] font-medium transition-colors',
        active
          ? 'border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900'
          : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:border-neutral-600'
      )}
    >
      {children}
    </button>
  )
}

/** The call history screen for already-loaded data (page: app/admin/camp-meeting/calls/history). */
export function CallHistoryView({
  data,
  loading,
  error,
  onYearChange,
}: {
  data: CallHistoryData | undefined
  loading: boolean
  error: string | null
  onYearChange: (yearId: string) => void
}) {
  const [view, setView] = useState<View>('callers')
  const [sortBy, setSortBy] = useState<SortBy>('calls')
  const [callerId, setCallerId] = useState('')
  const [result, setResult] = useState<ResultFilter>('all')
  const [query, setQuery] = useState('')

  const now = useMemo(() => Date.now(), [data]) // eslint-disable-line react-hooks/exhaustive-deps
  const nameOf = useMemo(() => (id: string | null) => (id ? data?.callers[id] ?? 'Someone' : 'Themselves (link)'), [data])

  const stats = useMemo(() => {
    if (!data) return []
    const list = callerStats(data.calls, data.sessions, now)
    if (sortBy === 'reach') return [...list].sort((a, b) => b.reachRate - a.reachRate || b.calls - a.calls)
    if (sortBy === 'coming') return [...list].sort((a, b) => b.counts.confirmed - a.counts.confirmed || b.calls - a.calls)
    return list
  }, [data, sortBy, now])

  const filtered = useMemo(() => {
    if (!data) return []
    const q = query.trim().toLowerCase()
    const digits = q.replace(/\D/g, '')
    return data.calls.filter((r) => {
      if (callerId && r.caller_id !== callerId) return false
      if (result === 'link' ? r.kind !== 'link' : result !== 'all' && r.outcome !== result) return false
      if (!q) return true
      return r.name.toLowerCase().includes(q) || (digits.length >= 3 && (r.phone ?? '').replace(/\D/g, '').includes(digits)) || (r.note ?? '').toLowerCase().includes(q)
    })
  }, [data, callerId, result, query])

  const groups = useMemo(() => (data ? groupCalls(filtered, data.sessions, now) : []), [data, filtered, now])

  function exportCsv() {
    if (!data) return
    const titleOf = (r: CallRow) => {
      const sid = sessionOf(r, data.sessions, now)
      return sid ? data.sessions.find((s) => s.id === sid)?.title ?? '' : ''
    }
    const blob = new Blob([callsCsv(filtered, nameOf, titleOf)], { type: 'text/csv;charset=utf-8' })
    const href = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = href
    a.download = `call-history-${data.year.year}.csv`
    a.click()
    setTimeout(() => URL.revokeObjectURL(href), 5000)
  }

  const totalCalls = data ? data.calls.filter((r) => r.kind === 'call').length : 0

  return (
    <div className="mx-auto max-w-6xl pb-24">
      <Link
        href="/admin/camp-meeting/calls"
        className="-ml-1 inline-flex min-h-10 items-center gap-1 px-1 text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Call center
      </Link>
      <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="app-page-title">Call history</h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            {data
              ? `Camp meeting ${data.year.year} · ${totalCalls} ${totalCalls === 1 ? 'call' : 'calls'} by ${stats.length} ${stats.length === 1 ? 'caller' : 'callers'} · ${data.sessions.length} ${data.sessions.length === 1 ? 'session' : 'sessions'}`
              : 'Who called whom, what they said, and when.'}
          </p>
        </div>
        <div className="flex gap-2">
          {data && data.years.length > 1 ? (
            <select
              aria-label="Camp year"
              value={data.year.id}
              onChange={(e) => onYearChange(e.target.value)}
              className="h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-900 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
            >
              {data.years.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.year}
                  {y.is_active ? ' (active)' : ''}
                </option>
              ))}
            </select>
          ) : null}
          <Button variant="outline" className="h-10 flex-1 sm:flex-none" onClick={exportCsv} disabled={!data || filtered.length === 0}>
            <Download className="mr-2 h-4 w-4" aria-hidden />
            Export
          </Button>
        </div>
      </div>

      <div className="mt-5">
        <Segmented<View>
          label="Show"
          value={view}
          onChange={setView}
          options={[
            { id: 'callers', label: 'Callers' },
            { id: 'calls', label: 'Calls' },
          ]}
        />
      </div>

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <p className="mt-8 text-sm text-red-700 dark:text-red-300">{error}</p>
      ) : !data || data.calls.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-neutral-300 px-6 py-14 text-center dark:border-neutral-700">
          <p className="app-section-title">No calls yet</p>
          <p className="app-page-description mt-1">Calls appear here as soon as callers start saving what people said.</p>
        </div>
      ) : view === 'callers' ? (
        <CallersView
          stats={stats}
          sortBy={sortBy}
          setSortBy={setSortBy}
          nameOf={nameOf}
          onOpen={(id) => {
            setCallerId(id)
            setResult('all')
            setView('calls')
          }}
        />
      ) : (
        <section className="mt-5 space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative block flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" aria-hidden />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a person, phone or note" aria-label="Find a call" className="h-11 pl-9 sm:h-10" />
            </label>
            <select
              aria-label="Caller"
              value={callerId}
              onChange={(e) => setCallerId(e.target.value)}
              className="h-11 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-900 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 sm:h-10 sm:w-56"
            >
              <option value="">Every caller</option>
              {Object.entries(data.callers)
                .sort((a, b) => a[1].localeCompare(b[1]))
                .map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
            </select>
          </div>
          <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
            {RESULT_FILTERS.map((f) => (
              <Chip key={f.id} active={result === f.id} onClick={() => setResult(f.id)}>
                {f.label}
              </Chip>
            ))}
          </div>
          {groups.length === 0 ? (
            <p className="py-10 text-center text-sm text-neutral-500 dark:text-neutral-400">No calls match.</p>
          ) : (
            groups.map((g, i) => <GroupBlock key={g.key} group={g} nameOf={nameOf} defaultOpen={i < 3} />)
          )}
        </section>
      )}
    </div>
  )
}

function CallersView({
  stats,
  sortBy,
  setSortBy,
  nameOf,
  onOpen,
}: {
  stats: CallerStats[]
  sortBy: SortBy
  setSortBy: (s: SortBy) => void
  nameOf: (id: string | null) => string
  onOpen: (id: string) => void
}) {
  return (
    <section className="mt-5">
      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0">
        <Chip active={sortBy === 'calls'} onClick={() => setSortBy('calls')}>Most calls</Chip>
        <Chip active={sortBy === 'reach'} onClick={() => setSortBy('reach')}>Best reach</Chip>
        <Chip active={sortBy === 'coming'} onClick={() => setSortBy('coming')}>Most coming</Chip>
      </div>

      {/* Phones: one simple line per caller. */}
      <ol className="dashboard-panel divide-y divide-neutral-100 overflow-hidden max-sm:-mx-4 max-sm:rounded-none max-sm:border-x-0 dark:divide-white/[0.06] lg:hidden">
        {stats.map((s, i) => (
          <li key={s.caller_id}>
            <button type="button" onClick={() => onOpen(s.caller_id)} className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-neutral-50 dark:hover:bg-white/[0.04]">
              <span className="w-5 shrink-0 pt-0.5 text-right font-mono text-xs text-neutral-400 dark:text-neutral-500">{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="truncate font-semibold text-neutral-900 dark:text-neutral-50">{nameOf(s.caller_id)}</span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-neutral-900 dark:text-neutral-50">
                    {s.calls} <span className="font-normal text-neutral-500 dark:text-neutral-400">{s.calls === 1 ? 'call' : 'calls'}</span>
                  </span>
                </span>
                <span className="mt-0.5 block text-[13px] text-neutral-600 dark:text-neutral-400">
                  Reached {pct(s.reachRate)} · {s.counts.confirmed} coming · {s.counts.unreachable} no answer
                </span>
                <span className="block text-[13px] text-neutral-500 dark:text-neutral-500">
                  {[
                    s.avgSeconds !== null ? `${formatSeconds(s.avgSeconds)} a person` : null,
                    s.paceMinutes !== null ? `a call every ${Math.max(1, Math.round(s.paceMinutes))} min` : null,
                    s.sessions ? `${s.sessions} ${s.sessions === 1 ? 'session' : 'sessions'}` : null,
                    `last ${day(s.last)}`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ol>

      {/* Larger screens: the full table. */}
      <div className="dashboard-panel hidden overflow-x-auto lg:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200/80 text-left dark:border-white/[0.08]">
              {['Caller', 'Calls', 'People', 'Reached', 'Coming', 'Not sure', 'Not coming', 'No answer', 'Per person', 'Pace', 'Sessions', 'Last call'].map((h, i) => (
                <th key={h} className={cn('app-overline whitespace-nowrap px-3 py-3 font-semibold', i > 0 && 'text-right', i === 0 && 'pl-5')}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-white/[0.06]">
            {stats.map((s) => (
              <tr key={s.caller_id} onClick={() => onOpen(s.caller_id)} className="cursor-pointer hover:bg-neutral-50 dark:hover:bg-white/[0.04]">
                <td className="max-w-[14rem] truncate py-2.5 pl-5 pr-3 font-medium text-neutral-900 dark:text-neutral-50">{nameOf(s.caller_id)}</td>
                <td className="px-3 text-right font-semibold tabular-nums text-neutral-900 dark:text-neutral-50">{s.calls}</td>
                <td className="px-3 text-right tabular-nums text-neutral-700 dark:text-neutral-300">{s.people}</td>
                <td className="px-3 text-right tabular-nums text-neutral-700 dark:text-neutral-300">{pct(s.reachRate)}</td>
                <td className="px-3 text-right tabular-nums text-neutral-700 dark:text-neutral-300">{s.counts.confirmed}</td>
                <td className="px-3 text-right tabular-nums text-neutral-700 dark:text-neutral-300">{s.counts.maybe}</td>
                <td className="px-3 text-right tabular-nums text-neutral-700 dark:text-neutral-300">{s.counts.declined}</td>
                <td className="px-3 text-right tabular-nums text-neutral-700 dark:text-neutral-300">{s.counts.unreachable}</td>
                <td className="px-3 text-right tabular-nums text-neutral-700 dark:text-neutral-300">{formatSeconds(s.avgSeconds)}</td>
                <td className="whitespace-nowrap px-3 text-right tabular-nums text-neutral-700 dark:text-neutral-300">
                  {s.paceMinutes !== null ? `${Math.max(1, Math.round(s.paceMinutes))} min` : '—'}
                </td>
                <td className="px-3 text-right tabular-nums text-neutral-700 dark:text-neutral-300">{s.sessions}</td>
                <td className="whitespace-nowrap py-2.5 pl-3 pr-5 text-right text-neutral-600 dark:text-neutral-400">{day(s.last)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
        Reached: answered and said coming, not sure or not coming. Per person: from getting their name in a session to saving the
        answer (calls from now on). Pace: the usual gap between one call and the next. Tap a caller to see their calls.
      </p>
    </section>
  )
}

function GroupBlock({ group, nameOf, defaultOpen }: { group: CallGroup; nameOf: (id: string | null) => string; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const [limit, setLimit] = useState(40)
  const calls = group.rows.length
  const when =
    group.kind === 'session'
      ? `${day(group.start)} · ${time(group.start)}–${group.live ? 'now' : time(group.end)}`
      : day(group.start)
  const summary = [
    group.counts.confirmed ? `${group.counts.confirmed} coming` : null,
    group.counts.maybe ? `${group.counts.maybe} not sure` : null,
    group.counts.declined ? `${group.counts.declined} not coming` : null,
    group.counts.unreachable ? `${group.counts.unreachable} no answer` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <section className="dashboard-panel overflow-hidden max-sm:-mx-4 max-sm:rounded-none max-sm:border-x-0">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-start gap-3 px-4 py-3.5 text-left sm:px-5">
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-neutral-900 dark:text-neutral-50">{group.title}</span>
            {group.live ? <Badge variant="success">Live</Badge> : null}
          </span>
          <span className="mt-0.5 block text-[13px] text-neutral-600 dark:text-neutral-400">
            {when} · {calls} {calls === 1 ? 'call' : 'calls'}
            {group.callerIds.length ? ` · ${group.callerIds.length} ${group.callerIds.length === 1 ? 'caller' : 'callers'}` : ''}
          </span>
          {summary ? <span className="block text-[13px] text-neutral-500 dark:text-neutral-500">{summary}</span> : null}
        </span>
        <ChevronDown className={cn('mt-1 h-4 w-4 shrink-0 text-neutral-400 transition-transform dark:text-neutral-500', open && 'rotate-180')} aria-hidden />
      </button>
      {open ? (
        <>
          <ol className="divide-y divide-neutral-100 border-t border-neutral-200/80 dark:divide-white/[0.06] dark:border-white/[0.08]">
            {group.rows.slice(0, limit).map((r) => {
              const secs = callSeconds(r)
              return (
                <li key={r.id} className="flex gap-3 px-4 py-2.5 sm:px-5">
                  <span className="w-16 shrink-0 pt-0.5 font-mono text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
                    {group.kind === 'day' || new Date(r.at).toDateString() === new Date(group.start).toDateString() ? time(r.at) : `${day(r.at)} ${time(r.at)}`}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-medium text-neutral-900 dark:text-neutral-50">{r.name}</span>
                      <Badge variant={tone(r)}>{r.kind === 'link' ? `${outcomeText(r.outcome)} (link)` : outcomeText(r.outcome)}</Badge>
                      {r.kind === 'change' ? <span className="text-xs text-neutral-500 dark:text-neutral-400">corrected</span> : null}
                    </div>
                    <p className="mt-0.5 text-[13px] text-neutral-600 dark:text-neutral-400">
                      {r.kind === 'link' ? 'Answered by themselves' : <>by {nameOf(r.caller_id)}</>}
                      {r.phone ? <span className="font-mono text-xs"> · {r.phone}</span> : null}
                      {secs !== null ? ` · ${formatSeconds(secs)}` : ''}
                    </p>
                    {r.note ? <p className="mt-0.5 text-[13px] text-neutral-700 dark:text-neutral-300">{r.note}</p> : null}
                  </div>
                </li>
              )
            })}
          </ol>
          {group.rows.length > limit ? (
            <div className="border-t border-neutral-200/80 p-3 text-center dark:border-white/[0.08]">
              <Button variant="ghost" className="h-10" onClick={() => setLimit((l) => l + 100)}>
                Show more ({group.rows.length - limit} left)
              </Button>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  )
}
