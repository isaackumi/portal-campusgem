'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowRight,
  ArrowUpRight,
  ListChecks,
  MoreHorizontal,
  MessageCircle,
  MessageSquareText,
  PhoneCall,
  Radio,
  RefreshCw,
  Search,
  Send,
  UserMinus,
  UserPlus,
  X,
  History,
} from 'lucide-react'
import { useAuth } from '@/components/providers'
import { AccessDenied } from '@/components/auth/access-denied'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Meter, SegmentedBar } from '@/components/ui/meter'
import { PersonAvatar } from '@/components/ui/person'
import { LoadingSpinner } from '@/components/ui/loading'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { isSelfReported } from '@/lib/camp/confirm-link'
import type { CampRegistration } from '@/lib/types'
import {
  effectiveOutcome,
  isCallOutcome,
  isOpenCall,
  progressByCaller,
  summarizeCallCampaign,
  type CallOutcome,
} from '@/lib/camp/call-campaign'
import {
  assignCallersAction,
  getCallBoardAction,
  recordCallOutcomeAction,
  type CallBoardData,
} from '@/lib/actions/camp-calls'
import { CallCard } from '@/components/camp/calls/call-card'
import { AssignCallersDialog } from '@/components/camp/calls/assign-callers-dialog'
import { TextCallListsDialog } from '@/components/camp/calls/text-call-lists-dialog'
import { TextRegistrantsDialog } from '@/components/camp/calls/text-registrants-dialog'
import { OutcomeBadge, outcomeSegments } from '@/components/camp/call-outcome'
import { PhoneLink, QuickContactButtons } from '@/components/contact/phone-link'
import { useCampFollowUpMessage } from '@/components/camp/use-camp-follow-up-message'
import { getCallTeamAction, getLiveSessionInfoAction } from '@/lib/actions/call-center'
import { ShareOutDialog } from '@/components/calls/share-out-dialog'
import { CallersBoard } from '@/components/calls/callers-board'
import { CALL_SEGMENTS, isCallSegment, matchesSegment, type CallSegment } from '@/lib/calls/queue'

type View = 'team' | 'mine'
type CallerFilter = 'all' | 'unassigned' | string
type OutcomeFilter = 'all' | 'open' | CallOutcome

const PAGE_SIZE = 50

function matchesQuery(r: CampRegistration, q: string): boolean {
  if (!q) return true
  const hay = `${r.full_name} ${r.phone} ${r.whatsapp ?? ''} ${r.residence ?? ''} ${r.email ?? ''}`.toLowerCase()
  return q
    .toLowerCase()
    .split(/\s+/)
    .every((part) => hay.includes(part) || hay.replace(/\s/g, '').includes(part))
}

function CallsWorkspace() {
  const followUpMessage = useCampFollowUpMessage()
  const router = useRouter()
  const params = useSearchParams()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { user, can } = useAuth()
  const yearParam = params.get('year')

  const board = useQuery({
    queryKey: ['call-board', yearParam ?? 'active'],
    queryFn: async () => {
      const res = await getCallBoardAction(yearParam)
      if (res.error || !res.data) throw new Error(res.error ?? 'Could not load the call list')
      return res.data
    },
    staleTime: 15_000,
  })
  const data = board.data

  const [view, setView] = useState<View>('team')
  const [query, setQuery] = useState(params.get('q') ?? '')
  const [callerFilter, setCallerFilter] = useState<CallerFilter>(params.get('caller') ?? 'all')
  const [outcomeFilter, setOutcomeFilter] = useState<OutcomeFilter>(() => {
    const o = params.get('outcome')
    return o === 'open' || isCallOutcome(o) ? (o as OutcomeFilter) : 'all'
  })
  const [segment, setSegment] = useState<CallSegment>(() => {
    const s = params.get('group')
    return isCallSegment(s) ? s : 'all'
  })
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [limit, setLimit] = useState(PAGE_SIZE)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [assignOpen, setAssignOpen] = useState(false)
  const [textListsOpen, setTextListsOpen] = useState(false)
  const [textRegsOpen, setTextRegsOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)

  useEffect(() => {
    if (data && !data.canManage) setView('mine')
  }, [data])

  useEffect(() => setLimit(PAGE_SIZE), [query, callerFilter, outcomeFilter, view, segment])

  const team = useQuery({
    queryKey: ['call-team'],
    enabled: !!data?.canManage,
    queryFn: async () => (await getCallTeamAction(yearParam)).data,
    staleTime: 30_000,
  })
  const live = useQuery({
    queryKey: ['call-session-live', yearParam ?? 'active'],
    queryFn: async () => (await getLiveSessionInfoAction(yearParam)).data,
    refetchInterval: 30_000,
  })

  const regs = useMemo(() => data?.registrations ?? [], [data])
  const peopleById = useMemo(() => new Map((data?.people ?? []).map((p) => [p.id, p])), [data])
  const summary = useMemo(() => summarizeCallCampaign(regs), [regs])
  const callerProgress = useMemo(() => progressByCaller(regs), [regs])
  const openLoad = useMemo(() => {
    const m = new Map<string, number>()
    callerProgress.forEach((row, id) => m.set(id, row.open))
    return m
  }, [callerProgress])

  const unassignedOpen = useMemo(() => regs.filter((r) => isOpenCall(r) && !r.assigned_to).length, [regs])

  const callerOptions = useMemo(() => {
    const names = new Map<string, string>()
    for (const m of team.data?.team ?? []) names.set(m.user_id, m.name)
    callerProgress.forEach((_, id) => { if (!names.has(id)) names.set(id, peopleById.get(id)?.full_name ?? 'Former user') })
    return Array.from(names, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
  }, [team.data, callerProgress, peopleById])

  const myId = data?.me.id ?? user?.id
  const mine = useMemo(() => regs.filter((r) => r.assigned_to === myId), [regs, myId])

  const visible = useMemo(() => {
    const base = view === 'mine' ? mine : regs
    return base
      .filter((r) => r.status !== 'cancelled')
      .filter((r) => {
        if (view === 'mine' || callerFilter === 'all') return true
        if (callerFilter === 'unassigned') return !r.assigned_to
        return r.assigned_to === callerFilter
      })
      .filter((r) => {
        if (outcomeFilter === 'all') return true
        if (outcomeFilter === 'open') return isOpenCall(r)
        return effectiveOutcome(r) === outcomeFilter
      })
      .filter((r) => matchesSegment(r, segment))
      .filter((r) => matchesQuery(r, query.trim()))
      .sort((a, b) => {
        // Open calls first, then fewest attempts, then name.
        const ao = isOpenCall(a) ? 0 : 1
        const bo = isOpenCall(b) ? 0 : 1
        return ao - bo || (a.call_attempts ?? 0) - (b.call_attempts ?? 0) || a.full_name.localeCompare(b.full_name)
      })
  }, [view, mine, regs, callerFilter, outcomeFilter, query, segment])
  const segmentCounts = useMemo(() => {
    const active = (view === 'mine' ? mine : regs).filter((r) => r.status !== 'cancelled')
    return Object.fromEntries(CALL_SEGMENTS.map((s) => [s.id, active.filter((r) => matchesSegment(r, s.id)).length])) as Record<CallSegment, number>
  }, [view, mine, regs])

  const selectedRegs = useMemo(() => regs.filter((r) => selected.has(r.id)), [regs, selected])
  const allVisibleSelected = visible.length > 0 && visible.every((r) => selected.has(r.id))

  const refresh = useCallback(() => queryClient.invalidateQueries({ queryKey: ['call-board'] }), [queryClient])

  async function recordOutcome(reg: CampRegistration, outcome: CallOutcome, note: string) {
    setSavingId(reg.id)
    // Optimistic: reflect the outcome straight away.
    queryClient.setQueryData<CallBoardData>(['call-board', yearParam ?? 'active'], (prev) =>
      prev
        ? {
            ...prev,
            registrations: prev.registrations.map((r) =>
              r.id === reg.id
                ? {
                    ...r,
                    attendance_confirmation: outcome,
                    confirmation_note: note.trim() || r.confirmation_note,
                    confirmation_updated_by: undefined,
                    call_attempts: (r.call_attempts ?? 0) + 1,
                    last_called_at: new Date().toISOString(),
                  }
                : r
            ),
          }
        : prev
    )
    const res = await recordCallOutcomeAction({ registration_id: reg.id, outcome, note })
    setSavingId(null)
    if (res.error) {
      toast({ variant: 'destructive', title: 'Not saved', description: res.error })
      void refresh()
      return
    }
    toast({ title: `${reg.full_name.split(' ')[0]}: ${outcome === 'confirmed' ? 'coming' : outcome === 'declined' ? 'not coming' : outcome === 'maybe' ? 'not sure' : 'no answer'}` })
  }

  async function clearCaller() {
    const res = await assignCallersAction({ registration_ids: Array.from(selected), caller_ids: [], mode: 'clear' })
    if (res.error) {
      toast({ variant: 'destructive', title: 'Could not remove caller', description: res.error })
      return
    }
    toast({ title: 'Caller removed', description: `${res.updated} back in the unassigned pool.` })
    setSelected(new Set())
    void refresh()
  }

  if (!can('camp.calls')) return <AccessDenied permission="camp.calls" />

  if (board.isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (board.error || !data) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <p className="app-section-title">Couldn't load the call list</p>
        <p className="app-page-description mt-2">{board.error instanceof Error ? board.error.message : 'Try again.'}</p>
        <Button className="mt-6" variant="outline" onClick={() => void board.refetch()}>Try again</Button>
      </div>
    )
  }

  const year = data.year
  if (!year) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <p className="app-section-title">No camp year yet</p>
        <p className="app-page-description mt-2">Create a camp year and collect registrations, then come back to confirm attendance.</p>
      </div>
    )
  }

  const myOpen = mine.filter(isOpenCall).length
  const confirmedPct = summary.total ? Math.round((summary.byOutcome.confirmed / summary.total) * 100) : 0

  return (
    <div className="mx-auto max-w-7xl pb-28">
      <PageHeader
        eyebrow={`Camp meeting ${year.year}`}
        title="Call center"
        description={
          data.canManage
            ? 'Split registrants among callers, text them their lists, and watch confirmations come in.'
            : 'Call each person on your list and tap what they said. Your updates reach the camp team straight away.'
        }
        actions={
          <>
            {data.years.length > 1 ? (
              <select
                aria-label="Camp year"
                value={year.id}
                onChange={(e) => router.push(`/admin/camp-meeting/calls?year=${e.target.value}`)}
                className="h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-900 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
              >
                {data.years.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.year}{y.is_active ? ' (active)' : ''}
                  </option>
                ))}
              </select>
            ) : null}
            <Button variant="outline" onClick={() => void board.refetch()} disabled={board.isFetching} aria-label="Refresh">
              <RefreshCw className={cn('h-4 w-4 sm:mr-2', board.isFetching && 'animate-spin')} aria-hidden />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            {/* Occasional places live in one menu; the two main actions stay as buttons. */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" aria-label="More">
                  <MoreHorizontal className="h-4 w-4 sm:mr-2" aria-hidden />
                  <span className="hidden sm:inline">More</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuItem asChild className="cursor-pointer gap-2.5 py-2">
                  <Link href="/admin/camp-meeting/calls/mine">
                    <ListChecks className="h-4 w-4 text-brand-600 dark:text-brand-400" aria-hidden />
                    My calls
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer gap-2.5 py-2">
                  <Link href="/admin/camp-meeting/calls/session">
                    <Radio className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
                    Calling session
                  </Link>
                </DropdownMenuItem>
                {data.canManage ? (
                  <>
                    <DropdownMenuItem asChild className="cursor-pointer gap-2.5 py-2">
                      <Link href="/admin/camp-meeting/calls/history">
                        <History className="h-4 w-4 text-neutral-500 dark:text-neutral-400" aria-hidden />
                        Call history
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="cursor-pointer gap-2.5 py-2">
                      <Link href="/admin/camp-meeting/calls/templates">
                        <MessageCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
                        WhatsApp messages
                      </Link>
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
            {data.canManage && data.canSms ? (
              <Button variant="outline" onClick={() => setTextListsOpen(true)}>
                <MessageSquareText className="h-4 w-4 sm:mr-2" aria-hidden />
                <span className="hidden sm:inline">Text call lists</span>
                <span className="sr-only sm:hidden">Text call lists</span>
              </Button>
            ) : null}
            {data.canManage ? null : (
              <Button asChild className="flex-1 sm:flex-none">
                <Link href="/admin/camp-meeting/calls/mine">
                  <ListChecks className="mr-2 h-4 w-4" aria-hidden />
                  My calls
                </Link>
              </Button>
            )}
          </>
        }
      />

      {/* The team calling together: join if it's live; managers start one. */}
      {live.data || data.canManage ? (
        <Link
          href="/admin/camp-meeting/calls/session"
          className={cn(
            'mb-4 flex items-center gap-3 rounded-xl border p-4 transition-colors',
            live.data
              ? 'border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100 dark:hover:bg-emerald-950/60'
              : 'border-neutral-200 bg-white text-neutral-900 hover:border-brand-300 dark:border-neutral-700 dark:bg-neutral-800/60 dark:text-neutral-100 dark:hover:border-brand-700'
          )}
        >
          <Radio className={cn('h-5 w-5 shrink-0', live.data ? 'animate-pulse motion-reduce:animate-none' : 'text-brand-600 dark:text-brand-400')} aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">{live.data ? `Calling session live: ${live.data.title}` : 'Start a calling session'}</span>
            <span className="block text-sm opacity-80">
              {live.data
                ? 'Join on your phone and take people from the shared list.'
                : 'Get the team together: everyone taps "Next person" and gets someone nobody else is calling, with a live board.'}
            </span>
          </span>
          <ArrowRight className="h-5 w-5 shrink-0" aria-hidden />
        </Link>
      ) : null}

      {data.canManage ? (
        <section data-tour="calls-progress" aria-label="Campaign progress">
          <div className="dashboard-panel p-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="app-stat-label">Confirmed coming</p>
                <p className="mt-2 flex items-baseline gap-2">
                  <span className="app-stat-value">{summary.byOutcome.confirmed}</span>
                  <span className="text-sm text-neutral-500 dark:text-neutral-400">of {summary.total} · {confirmedPct}%</span>
                </p>
              </div>
              <dl className="flex w-full justify-between gap-4 text-left sm:w-auto sm:justify-start sm:gap-6 sm:text-right">
                <div>
                  <dt className="app-stat-label">Still to reach</dt>
                  <dd className="mt-1 text-xl font-semibold tabular-nums text-neutral-900 dark:text-neutral-50">{summary.open}</dd>
                </div>
                <div>
                  <dt className="app-stat-label">No caller</dt>
                  <dd className={cn('mt-1 text-xl font-semibold tabular-nums', summary.unassigned ? 'text-amber-700 dark:text-amber-300' : 'text-neutral-900 dark:text-neutral-50')}>
                    {summary.unassigned}
                  </dd>
                </div>
                <div>
                  <dt className="app-stat-label">Expected</dt>
                  <dd className="mt-1 text-xl font-semibold tabular-nums text-neutral-900 dark:text-neutral-50">{summary.expected}</dd>
                </div>
              </dl>
            </div>
            <SegmentedBar
              className="mt-5"
              label="Call outcomes"
              segments={outcomeSegments(summary)}
              selectedKey={isCallOutcome(outcomeFilter) ? outcomeFilter : null}
              onSelect={(key) => setOutcomeFilter((prev) => (prev === key ? 'all' : (key as CallOutcome)))}
            />
          </div>

        </section>
      ) : null}

      {data.canManage ? (
        <CallersBoard
          team={team.data}
          loading={team.isLoading}
          progress={callerProgress}
          nameOf={(id) => peopleById.get(id)?.full_name}
          unassignedOpen={unassignedOpen}
          callerFilter={callerFilter}
          onFilter={(value) => {
            setView('team')
            setCallerFilter(value)
            if (value !== 'all' && typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches) {
              document.getElementById('call-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }
          }}
          onSplit={() => setShareOpen(true)}
          onChanged={() => {
            void team.refetch()
            void refresh()
          }}
        />
      ) : null}

      <div className="mt-6 flex flex-col gap-3">
        {data.canManage ? (
          <div data-tour="calls-views" role="tablist" aria-label="Whose calls" className="inline-flex w-fit rounded-lg bg-neutral-200/60 p-1 dark:bg-neutral-800">
            {(
              [
                ['team', `Everyone · ${summary.total}`],
                ['mine', `My calls · ${myOpen} open`],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                role="tab"
                aria-selected={view === id}
                onClick={() => setView(id)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  view === id
                    ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-white'
                    : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        ) : (
          <div data-tour="calls-views" className="dashboard-panel flex flex-wrap items-center gap-4 p-4">
            <PhoneCall className="h-5 w-5 text-brand-600 dark:text-brand-400" aria-hidden />
            <p className="text-sm text-neutral-700 dark:text-neutral-300">
              <span className="font-semibold text-neutral-900 dark:text-neutral-50">{myOpen}</span> of {mine.length} still to call
            </p>
            <Meter className="max-w-xs flex-1" value={mine.length - myOpen} max={mine.length} tone={myOpen === 0 ? 'success' : 'brand'} label="Your progress" />
          </div>
        )}

        <div id="call-list" data-tour="calls-filters" className="scroll-mt-20 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, phone or residence"
              aria-label="Search registrants"
              className="h-10 w-full rounded-lg border border-neutral-200 bg-white pl-9 pr-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500"
            />
          </div>
          <select
            aria-label="Filter by outcome"
            value={outcomeFilter}
            onChange={(e) => setOutcomeFilter(e.target.value as OutcomeFilter)}
            className="h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-900 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
          >
            <option value="all">All outcomes</option>
            <option value="open">Still to reach</option>
            <option value="unconfirmed">Not called</option>
            <option value="confirmed">Confirmed</option>
            <option value="maybe">Not sure</option>
            <option value="unreachable">No answer</option>
            <option value="declined">Not coming</option>
          </select>
          {data.canManage && view === 'team' ? (
            <select
              aria-label="Filter by caller"
              value={callerFilter}
              onChange={(e) => setCallerFilter(e.target.value)}
              className="h-10 max-w-[14rem] rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-900 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
            >
              <option value="all">All callers</option>
              <option value="unassigned">No caller yet</option>
              {callerOptions.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          ) : null}
        </div>
        <div role="radiogroup" aria-label="New or returning" className="flex flex-wrap gap-2">
          {CALL_SEGMENTS.map((s) => (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={segment === s.id}
              onClick={() => setSegment(s.id)}
              title={s.description}
              className={cn(
                'h-9 rounded-full border px-3.5 text-[13px] font-medium transition-colors',
                segment === s.id
                  ? 'border-brand-600 bg-brand-600 text-white dark:border-brand-500 dark:bg-brand-600'
                  : 'border-neutral-200 bg-white text-neutral-700 hover:border-brand-300 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
              )}
            >
              {s.label} · {segmentCounts[s.id]}
            </button>
          ))}
        </div>
        <p className="text-[13px] text-neutral-500 dark:text-neutral-400" aria-live="polite">
          {visible.length} {visible.length === 1 ? 'person' : 'people'}
          {query || outcomeFilter !== 'all' || segment !== 'all' || (callerFilter !== 'all' && view === 'team') ? (
            <button
              type="button"
              className="ml-2 font-medium text-brand-700 hover:underline dark:text-brand-400"
              onClick={() => {
                setQuery('')
                setOutcomeFilter('all')
                setCallerFilter('all')
                setSegment('all')
              }}
            >
              Clear filters
            </button>
          ) : null}
        </p>
      </div>

      {view === 'mine' ? (
        visible.length === 0 ? (
          <EmptyState
            title={mine.length === 0 ? 'No one on your list yet' : 'All done here'}
            body={
              mine.length === 0
                ? 'When the camp team assigns people to you, they show up here with their numbers.'
                : 'Nobody matches these filters. Clear them to see your whole list.'
            }
          />
        ) : (
          <div data-tour="calls-list" className="mt-4 grid gap-3 lg:grid-cols-2">
            {visible.slice(0, limit).map((r) => (
              <CallCard
                key={r.id}
                registration={r}
                saving={savingId === r.id}
                onOutcome={(o, note) => void recordOutcome(r, o, note)}
                detailHref={data.canManage ? `/admin/camp-meeting/registrations/${r.id}` : undefined}
              />
            ))}
          </div>
        )
      ) : visible.length === 0 ? (
        <EmptyState title="No one matches" body="Try a different search or clear the filters." />
      ) : (
        <div className="dashboard-panel mt-4 overflow-hidden" data-tour="calls-list">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left dark:border-neutral-700">
                  <th className="w-10 px-4 py-3">
                    <Checkbox
                      aria-label="Select all shown"
                      checked={allVisibleSelected}
                      onCheckedChange={(v) =>
                        setSelected((prev) => {
                          const next = new Set(prev)
                          visible.forEach((r) => (v === true ? next.add(r.id) : next.delete(r.id)))
                          return next
                        })
                      }
                    />
                  </th>
                  <th className="app-overline px-2 py-3 font-medium">Person</th>
                  <th className="app-overline hidden px-3 py-3 font-medium md:table-cell">Caller</th>
                  <th className="app-overline px-3 py-3 font-medium">Outcome</th>
                  <th className="app-overline hidden px-3 py-3 font-medium lg:table-cell">Calls</th>
                  <th className="w-10 px-4 py-3"><span className="sr-only">Open</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700/70">
                {visible.slice(0, limit).map((r) => {
                  const caller = r.assigned_to ? peopleById.get(r.assigned_to) : undefined
                  const isSel = selected.has(r.id)
                  return (
                    <tr
                      key={r.id}
                      className={cn('transition-colors', isSel ? 'bg-brand-50/60 dark:bg-brand-950/30' : 'hover:bg-neutral-50 dark:hover:bg-neutral-700/30')}
                    >
                      <td className="px-4 py-3">
                        <Checkbox
                          aria-label={`Select ${r.full_name}`}
                          checked={isSel}
                          onCheckedChange={(v) =>
                            setSelected((prev) => {
                              const next = new Set(prev)
                              if (v === true) next.add(r.id)
                              else next.delete(r.id)
                              return next
                            })
                          }
                        />
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex items-center gap-3">
                          <PersonAvatar name={r.full_name} seed={r.id} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-neutral-900 dark:text-neutral-100">{r.full_name}</p>
                            <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                              <PhoneLink phone={r.phone} whatsapp={r.whatsapp} name={r.full_name} message={followUpMessage(r)} />
                              {r.residence ? <span className="hidden sm:inline"> · {r.residence}</span> : null}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden px-3 py-3 md:table-cell">
                        {r.assigned_to ? (
                          <span className="text-neutral-700 dark:text-neutral-300">{caller?.full_name ?? 'Former user'}</span>
                        ) : (
                          <span className="text-neutral-400 dark:text-neutral-500">Not assigned</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-col items-start gap-1">
                          <OutcomeBadge outcome={r.status === 'checked_in' ? 'confirmed' : effectiveOutcome(r)} />
                          {r.status === 'checked_in' ? <span className="text-xs text-emerald-700 dark:text-emerald-300">At camp</span> : null}
                          {r.status !== 'checked_in' && isSelfReported(r) ? (
                            <span className="text-xs font-medium text-brand-700 dark:text-brand-300">via their link</span>
                          ) : null}
                          {r.confirmation_note ? (
                            <span className="max-w-[16rem] truncate text-xs text-neutral-500 dark:text-neutral-400" title={r.confirmation_note}>“{r.confirmation_note}”</span>
                          ) : null}
                        </div>
                      </td>
                      <td className="hidden px-3 py-3 tabular-nums text-neutral-600 dark:text-neutral-400 lg:table-cell">
                        {r.call_attempts ?? 0}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <QuickContactButtons className="mr-1 sm:hidden" phone={r.phone} whatsapp={r.whatsapp} name={r.full_name} message={followUpMessage(r)} />
                        <Link
                          href={`/admin/camp-meeting/registrations/${r.id}`}
                          className="hidden h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 sm:inline-flex hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-white"
                          aria-label={`Open ${r.full_name}`}
                        >
                          <ArrowUpRight className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {visible.length > limit ? (
            <div className="border-t border-neutral-200 p-3 text-center dark:border-neutral-700">
              <Button variant="ghost" onClick={() => setLimit((l) => l + PAGE_SIZE * 2)}>
                Show more ({visible.length - limit} left)
              </Button>
            </div>
          ) : null}
        </div>
      )}

      {data.canManage && selected.size > 0 ? (
        <div className="fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 flex justify-center px-3 lg:bottom-4" role="region" aria-label="Selection actions">
          <div className="flex w-full max-w-xl flex-wrap items-center gap-2 rounded-2xl border border-neutral-200 bg-white/95 p-2 pl-4 shadow-pop backdrop-blur dark:border-white/10 dark:bg-neutral-900/95 sm:w-auto">
            <span className="mr-1 text-sm font-medium text-neutral-900 dark:text-neutral-100">
              <span className="tabular-nums">{selected.size}</span> selected
            </span>
            <Button size="sm" onClick={() => setAssignOpen(true)}>
              <UserPlus className="mr-1.5 h-4 w-4" aria-hidden />
              Assign caller
            </Button>
            {selectedRegs.some((r) => r.assigned_to) ? (
              <Button size="sm" variant="outline" onClick={() => void clearCaller()}>
                <UserMinus className="mr-1.5 h-4 w-4" aria-hidden />
                Remove caller
              </Button>
            ) : null}
            {data.canSms ? (
              <Button size="sm" variant="outline" onClick={() => setTextRegsOpen(true)}>
                <Send className="mr-1.5 h-4 w-4" aria-hidden />
                Text them
              </Button>
            ) : null}
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())} aria-label="Clear selection">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}

      {data.canManage ? (
        <>
          <AssignCallersDialog
            open={assignOpen}
            onOpenChange={setAssignOpen}
            registrationIds={Array.from(selected)}
            people={data.people}
            currentLoad={openLoad}
            campYearId={year.id}
            canSms={data.canSms}
            registrations={data.registrations}
            campYear={year.year}
            onAssigned={() => {
              setSelected(new Set())
              void refresh()
            }}
          />
          <ShareOutDialog
            open={shareOpen}
            onOpenChange={setShareOpen}
            yearId={yearParam}
            sessionLive={!!live.data}
            sessionPeople={team.data?.sessionPeople.length ?? 0}
            teamActive={(team.data?.team ?? []).filter((t) => t.active).length}
            counts={{ unassigned: unassignedOpen, open: summary.open }}
            canSms={data.canSms}
            onShared={(textLists) => {
              void refresh()
              void team.refetch()
              if (textLists) setTextListsOpen(true)
            }}
          />
          <TextCallListsDialog
            open={textListsOpen}
            onOpenChange={setTextListsOpen}
            registrations={regs}
            people={data.people}
            campYearId={year.id}
            campYear={year.year}
          />
          <TextRegistrantsDialog
            open={textRegsOpen}
            onOpenChange={setTextRegsOpen}
            registrations={selectedRegs}
            campYearId={year.id}
            campYear={year.year}
            senderId={data.me.id}
          />
        </>
      ) : null}
    </div>
  )
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-4 flex flex-col items-center rounded-xl border border-dashed border-neutral-300 px-6 py-14 text-center dark:border-neutral-700">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 dark:bg-white/[0.06] dark:text-neutral-400">
        <PhoneCall className="h-5 w-5" aria-hidden />
      </span>
      <p className="app-section-title mt-4">{title}</p>
      <p className="app-page-description mt-1 max-w-sm">{body}</p>
    </div>
  )
}

export default function CampCallsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <LoadingSpinner />
        </div>
      }
    >
      <CallsWorkspace />
    </Suspense>
  )
}
