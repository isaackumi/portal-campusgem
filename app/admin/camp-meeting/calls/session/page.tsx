'use client'

/**
 * The team's calling session: everyone on their phone, one shared queue. Tap "Next person" to get
 * someone nobody else is calling, call or WhatsApp them, tap what they said, and the next one comes
 * up. The board shows who is in the room and how the session is going, refreshed every few seconds.
 */
import { Suspense, useCallback, useState } from 'react'
import Link from 'next/link'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, History, MapPin, Pencil, Phone, PhoneCall, PhoneIncoming, Radio, SkipForward, Square, UserPlus, Users } from 'lucide-react'
import { useAuth } from '@/components/providers'
import { AccessDenied } from '@/components/auth/access-denied'
import { Button } from '@/components/ui/button'
import { Meter } from '@/components/ui/meter'
import { LoadingSpinner } from '@/components/ui/loading'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { telHref } from '@/lib/contact-links'
import { callOutcomeMeta, type CallOutcome } from '@/lib/camp/call-campaign'
import { CALL_SEGMENTS, type CallSegment } from '@/lib/calls/queue'
import {
  endCallSessionAction,
  getSessionStateAction,
  nextCallAction,
  recordSessionCallAction,
  setRegistrantNumberAction,
  setSessionSegmentAction,
  skipCallAction,
  startCallSessionAction,
  type CallTarget,
  type SessionState,
} from '@/lib/actions/call-center'
import { OutcomeBadge } from '@/components/camp/call-outcome'
import { CallFeedbackPanel } from '@/components/calls/call-feedback'
import { WhatsAppButton } from '@/components/calls/whatsapp-button'
import { useAfterCallPrompt } from '@/components/calls/use-after-call-prompt'
import { InviteTeamDialog } from '@/components/calls/invite-team-dialog'
import { FindPersonDialog, UpdateCallDialog } from '@/components/calls/update-call-dialog'
import { TshirtSizePicker } from '@/components/calls/tshirt-size-picker'

const SKIP_KEY = 'call-session-skipped'

function readSkipped(): string[] {
  try {
    return JSON.parse(sessionStorage.getItem(SKIP_KEY) ?? '[]') as string[]
  } catch {
    return []
  }
}

function ago(at: number): string {
  const mins = Math.round((Date.now() - at) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  return `${Math.round(mins / 60)} h ago`
}

function Session() {
  const { can } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [busy, setBusy] = useState<null | 'next' | 'save' | 'skip' | 'start' | 'end'>(null)
  const [done, setDone] = useState(false)
  const [segment, setSegment] = useState<CallSegment>('all')
  const [sameGender, setSameGender] = useState(true)
  const [confirmEnd, setConfirmEnd] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [updating, setUpdating] = useState<CallTarget | null>(null)
  const [findOpen, setFindOpen] = useState(false)
  const after = useAfterCallPrompt<CallTarget>()

  const state = useQuery({
    queryKey: ['call-session'],
    queryFn: async () => {
      const res = await getSessionStateAction(null)
      if (res.error || !res.data) throw new Error(res.error ?? 'Could not load the session')
      return res.data
    },
    // Live while the page is on screen; quiet in the background.
    refetchInterval: (q) => (q.state.data?.session ? 5000 : 20000),
    refetchIntervalInBackground: false,
  })
  const data = state.data
  const current = data?.current ?? null

  const setCurrent = useCallback(
    (target: CallTarget | null) => queryClient.setQueryData<SessionState>(['call-session'], (prev) => (prev ? { ...prev, current: target } : prev)),
    [queryClient]
  )

  const next = useCallback(async () => {
    setBusy('next')
    setDone(false)
    const res = await nextCallAction({ skip: readSkipped() })
    setBusy(null)
    if (res.error) {
      toast({ variant: 'destructive', title: 'No one loaded', description: res.error })
      return
    }
    setCurrent(res.data)
    if (res.done) setDone(true)
  }, [setCurrent, toast])

  async function record(target: CallTarget, outcome: Exclude<CallOutcome, 'unconfirmed'>, note: string) {
    setBusy('save')
    const res = await recordSessionCallAction({ registrationId: target.id, outcome, note })
    setBusy(null)
    if (res.error) {
      toast({ variant: 'destructive', title: 'Not saved', description: res.error })
      void state.refetch()
      return
    }
    after.dismiss()
    toast({ title: `${target.full_name.split(' ')[0]}: ${callOutcomeMeta(outcome).label.toLowerCase()}`, description: note || undefined })
    setCurrent(null)
    void next()
    void queryClient.invalidateQueries({ queryKey: ['call-board'] })
  }

  /** Going back to someone (they called back): saves without moving you on to the next person. */
  async function update(target: CallTarget, outcome: Exclude<CallOutcome, 'unconfirmed'>, note: string) {
    if (target.id === current?.id) {
      setUpdating(null)
      return record(target, outcome, note)
    }
    setBusy('save')
    const res = await recordSessionCallAction({ registrationId: target.id, outcome, note })
    setBusy(null)
    if (res.error) {
      toast({ variant: 'destructive', title: 'Not saved', description: res.error })
      return
    }
    setUpdating(null)
    toast({ title: `${target.full_name.split(' ')[0]} updated: ${callOutcomeMeta(outcome).label.toLowerCase()}`, description: note || undefined })
    void state.refetch()
    void queryClient.invalidateQueries({ queryKey: ['call-board'] })
  }

  async function skip(target: CallTarget) {
    setBusy('skip')
    try {
      sessionStorage.setItem(SKIP_KEY, JSON.stringify([...readSkipped().filter((id) => id !== target.id), target.id].slice(-200)))
    } catch {
      // Storage blocked: they may come round again sooner.
    }
    await skipCallAction({ registrationId: target.id })
    setBusy(null)
    setCurrent(null)
    void next()
  }

  async function newNumber(target: CallTarget, phone: string): Promise<string | null> {
    const res = await setRegistrantNumberAction({ registrationId: target.id, phone })
    if (res.error) return res.error
    setCurrent({ ...target, phone: res.phone ?? target.phone })
    toast({ title: 'New number saved', description: `Every text to ${target.full_name.split(' ')[0]} goes to ${res.phone} from now on.` })
    return null
  }

  async function start() {
    setBusy('start')
    const res = await startCallSessionAction({ segment, sameGender })
    setBusy(null)
    if (res.error) {
      toast({ variant: 'destructive', title: 'Could not start', description: res.error })
      return
    }
    try {
      sessionStorage.removeItem(SKIP_KEY)
    } catch {
      // Nothing to clear.
    }
    await state.refetch()
    // Started: the next thing is getting everyone in.
    setInviteOpen(true)
  }

  async function end() {
    if (!data?.session) return
    setBusy('end')
    const res = await endCallSessionAction({ sessionId: data.session.id })
    setBusy(null)
    setConfirmEnd(false)
    if (res.error) toast({ variant: 'destructive', title: 'Could not end', description: res.error })
    else toast({ title: 'Session ended', description: 'Thank you, team!' })
    void state.refetch()
  }

  async function changeSegment(next: CallSegment, gender = data?.session?.sameGender) {
    if (!data?.session) return
    const res = await setSessionSegmentAction({ sessionId: data.session.id, segment: next, sameGender: gender })
    if (res.error) toast({ variant: 'destructive', title: 'Not changed', description: res.error })
    else void state.refetch()
  }

  if (!can('camp.calls')) return <AccessDenied permission="camp.calls" />
  if (state.isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }
  if (state.error || !data) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="app-section-title">Couldn&apos;t open the session</p>
        <p className="app-page-description mt-2">{state.error instanceof Error ? state.error.message : 'Try again.'}</p>
        <Button className="mt-6" variant="outline" onClick={() => void state.refetch()}>Try again</Button>
      </div>
    )
  }

  const back = (
    <Link href={data.canManage ? '/admin/camp-meeting/calls' : '/admin/camp-meeting/calls/mine'} className="inline-flex h-10 items-center gap-1.5 text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white">
      <ArrowLeft className="h-4 w-4" aria-hidden />
      {data.canManage ? 'All calls' : 'My calls'}
    </Link>
  )

  // --- No session running ----------------------------------------------------------------------
  if (!data.session) {
    return (
      <div className="mx-auto max-w-xl pb-24">
        {back}
        <h1 className="app-page-title mt-2">Calling session</h1>
        {data.canManage ? (
          <section className="dashboard-panel mt-5 p-5">
            <p className="text-[15px] text-neutral-700 dark:text-neutral-300">
              Get the team together, start the session, and everyone opens this page on their phone. Each person taps <b>Next person</b> and gets someone nobody else is calling.
            </p>
            <p className="app-overline mt-5">Who to call</p>
            <div role="radiogroup" aria-label="Who to call" className="mt-2 grid gap-2">
              {CALL_SEGMENTS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  role="radio"
                  aria-checked={segment === s.id}
                  onClick={() => setSegment(s.id)}
                  className={cn(
                    'flex items-center justify-between gap-3 rounded-xl border p-4 text-left transition-colors',
                    segment === s.id
                      ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500 dark:border-brand-500 dark:bg-brand-950/40'
                      : 'border-neutral-200 hover:border-brand-300 dark:border-neutral-700 dark:hover:border-brand-700'
                  )}
                >
                  <span>
                    <span className="block font-semibold text-neutral-900 dark:text-neutral-50">{s.label}</span>
                    <span className="block text-[13px] text-neutral-600 dark:text-neutral-400">{s.description}</span>
                  </span>
                  <span className="shrink-0 text-xl font-semibold tabular-nums text-neutral-900 dark:text-neutral-50">{data.remaining[s.id]}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={sameGender}
              onClick={() => setSameGender((v) => !v)}
              className="mt-4 flex w-full items-center gap-3 rounded-xl border border-neutral-200 p-4 text-left hover:border-brand-300 dark:border-neutral-700 dark:hover:border-brand-700"
            >
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-neutral-900 dark:text-neutral-50">Men call men, women call women</span>
                <span className="block text-[13px] text-neutral-600 dark:text-neutral-400">&quot;Next person&quot; gives each caller their own first; nobody waits if none are left.</span>
              </span>
              <span className={cn('relative h-6 w-11 shrink-0 rounded-full transition-colors', sameGender ? 'bg-brand-600' : 'bg-neutral-300 dark:bg-neutral-600')} aria-hidden>
                <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-[left]', sameGender ? 'left-[22px]' : 'left-0.5')} />
              </span>
            </button>
            <Button className="mt-5 h-12 w-full text-[15px]" onClick={() => void start()} disabled={busy === 'start' || data.remaining[segment] === 0}>
              <Radio className="mr-2 h-4 w-4" aria-hidden />
              {busy === 'start' ? 'Starting…' : 'Start the session'}
            </Button>
          </section>
        ) : (
          <section className="dashboard-panel mt-5 p-5 text-center">
            <Users className="mx-auto h-8 w-8 text-neutral-400" aria-hidden />
            <p className="app-section-title mt-3">No session right now</p>
            <p className="app-page-description mt-1">When the camp team starts one, it opens here. Meanwhile your own list is ready.</p>
            <Button asChild className="mt-5 h-11">
              <Link href="/admin/camp-meeting/calls/mine">Open my calls</Link>
            </Button>
          </section>
        )}
      </div>
    )
  }

  // --- Live ------------------------------------------------------------------------------------
  const s = data.session
  const board = data.board
  const p = data.progress
  return (
    <div className="mx-auto max-w-5xl pb-28">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {back}
        <div className="flex gap-2">
          {/* Anyone in the session can bring others in: QR, link, share; managers can text the team. */}
          <Button className="h-10" onClick={() => setInviteOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" aria-hidden />
            Invite the team
          </Button>
          {data.canManage ? (
            <Button variant="outline" className="h-10" onClick={() => setConfirmEnd(true)}>
              <Square className="mr-2 h-3.5 w-3.5" aria-hidden />
              End
            </Button>
          ) : null}
        </div>
      </div>

      <header className="mt-2">
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75 motion-reduce:animate-none" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          Live{s.started_by_name ? ` · started by ${s.started_by_name.split(' ')[0]}` : ''} · {ago(s.started_at)}
        </p>
        <h1 className="app-page-title mt-1 break-words">{s.title}</h1>
      </header>

      <section className="dashboard-panel mt-4 p-4" aria-label="How the camp is going">
        <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm text-neutral-600 dark:text-neutral-300">
          <span>
            <span className="text-2xl font-semibold tabular-nums text-neutral-900 dark:text-neutral-50">{p.confirmed}</span> of {p.total} coming
          </span>
          <span className="tabular-nums">{data.remaining[s.segment]} left in {CALL_SEGMENTS.find((x) => x.id === s.segment)?.label.toLowerCase()} · {board?.calls ?? 0} calls this session</span>
        </div>
        <Meter className="mt-3 h-2" value={p.confirmed + p.declined} max={Math.max(1, p.total)} tone="brand" label="Answers so far" />
        {data.canManage ? (
          <div role="radiogroup" aria-label="Who the session calls" className="mt-3 flex flex-wrap gap-2">
            {CALL_SEGMENTS.map((x) => (
              <button
                key={x.id}
                type="button"
                role="radio"
                aria-checked={s.segment === x.id}
                onClick={() => void changeSegment(x.id)}
                className={cn(
                  'min-h-9 rounded-full border px-3.5 py-1 text-left text-[13px] font-medium',
                  s.segment === x.id
                    ? 'border-brand-600 bg-brand-600 text-white dark:border-brand-500 dark:bg-brand-600'
                    : 'border-neutral-200 text-neutral-700 hover:border-brand-300 dark:border-neutral-700 dark:text-neutral-300'
                )}
              >
                {x.label} · {data.remaining[x.id]}
              </button>
            ))}
            <button
              type="button"
              role="switch"
              aria-checked={s.sameGender}
              onClick={() => void changeSegment(s.segment, !s.sameGender)}
              className={cn(
                'min-h-9 rounded-full border px-3.5 py-1 text-left text-[13px] font-medium',
                s.sameGender
                  ? 'border-violet-600 bg-violet-600 text-white dark:border-violet-500 dark:bg-violet-600'
                  : 'border-neutral-200 text-neutral-700 hover:border-violet-300 dark:border-neutral-700 dark:text-neutral-300'
              )}
            >
              Men call men, women call women
            </button>
          </div>
        ) : null}
      </section>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-label="Your call" className="min-w-0">
          {current ? (
            <article className="dashboard-panel p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="app-overline">Your call</p>
                  <p className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="break-words text-xl font-semibold text-neutral-900 dark:text-neutral-50">{current.full_name}</span>
                    <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', current.is_new_registrant ? 'bg-brand-100 text-brand-800 dark:bg-brand-950/60 dark:text-brand-200' : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300')}>
                      {current.is_new_registrant ? 'First camp' : `Returning${current.times_attended ? ` · ${current.times_attended} camps` : ''}`}
                    </span>
                    <span className="sm:hidden">
                      <OutcomeBadge outcome={current.attendance_confirmation ?? 'unconfirmed'} />
                    </span>
                  </p>
                  <p className="mt-1 font-mono text-[17px] text-neutral-800 dark:text-neutral-100">{current.phone}</p>
                  <p className="mt-1 flex flex-wrap gap-x-3 text-[13px] text-neutral-500 dark:text-neutral-400">
                    {current.residence ? <span className="inline-flex min-w-0 items-start gap-1"><MapPin className="mt-0.5 h-3 w-3 shrink-0" aria-hidden /><span className="break-words">{current.residence}</span></span> : null}
                    {current.call_attempts ? <span>Called {current.call_attempts}× before</span> : <span>Not called yet</span>}
                  </p>
                  {current.confirmation_note ? <p className="mt-1.5 break-words text-[13px] text-neutral-700 dark:text-neutral-300">Last time: “{current.confirmation_note}”</p> : null}
                </div>
                <span className="hidden shrink-0 sm:block">
                  <OutcomeBadge outcome={current.attendance_confirmation ?? 'unconfirmed'} />
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {telHref(current.phone) ? (
                  <Button asChild className="h-14 text-base">
                    <a href={telHref(current.phone) ?? undefined} onClick={() => after.calling(current)}>
                      <Phone className="mr-2 h-5 w-5" aria-hidden />
                      Call
                    </a>
                  </Button>
                ) : (
                  <span />
                )}
                <WhatsAppButton person={current} className="h-14 text-base" />
              </div>
              <TshirtSizePicker registrationId={current.id} initial={current.tshirt_size} className="mt-4 border-t border-neutral-200 pt-4 dark:border-neutral-700" />
              <div className="mt-4 border-t border-neutral-200 pt-4 dark:border-neutral-700">
                <CallFeedbackPanel saving={busy === 'save'} onRecord={(o, n) => record(current, o, n)} onNewNumber={(ph) => newNumber(current, ph)} />
              </div>
              <Button variant="ghost" className="mt-3 h-11 w-full" onClick={() => void skip(current)} disabled={busy !== null}>
                <SkipForward className="mr-2 h-4 w-4" aria-hidden />
                Skip for now
              </Button>
            </article>
          ) : (
            <div className="dashboard-panel flex flex-col items-center p-6 text-center sm:p-8">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300">
                <PhoneCall className="h-6 w-6" aria-hidden />
              </span>
              {done ? (
                <>
                  <p className="app-section-title mt-4">No one left to call right now</p>
                  <p className="app-page-description mt-1 max-w-sm">Everyone is answered or being called. People who didn&apos;t pick up come back round after a while.</p>
                  <Button variant="outline" className="mt-5 h-12 px-6" onClick={() => void next()} disabled={busy === 'next'}>Check again</Button>
                </>
              ) : (
                <>
                  <p className="app-section-title mt-4">Ready when you are</p>
                  <p className="app-page-description mt-1 max-w-sm">You&apos;ll get someone nobody else is calling. When you tap what they said, the next person comes up.</p>
                  <Button className="mt-5 h-14 w-full max-w-xs text-base" onClick={() => void next()} disabled={busy === 'next'}>
                    {busy === 'next' ? 'Finding someone…' : 'Next person'}
                  </Button>
                </>
              )}
            </div>
          )}

          <section className="dashboard-panel mt-4 p-4" aria-labelledby="my-calls-title">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="my-calls-title" className="app-section-title flex items-center gap-2">
                <History className="h-4 w-4 text-brand-600 dark:text-brand-400" aria-hidden />
                Your calls
              </h2>
              <Button variant="outline" className="h-10" onClick={() => setFindOpen(true)}>
                <PhoneIncoming className="mr-2 h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
                Called back?
              </Button>
            </div>
            {board?.mine.length ? (
              <ul className="-mx-2 mt-2 divide-y divide-neutral-100 dark:divide-neutral-700/70">
                {board.mine.map(({ target, at }) => (
                  <li key={target.id}>
                    <button
                      type="button"
                      onClick={() => setUpdating(target)}
                      className="flex min-h-14 w-full items-start gap-3 rounded-lg px-2 py-2.5 text-left hover:bg-neutral-50 dark:hover:bg-white/[0.04]"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block break-words text-sm font-medium text-neutral-900 dark:text-neutral-100">{target.full_name}</span>
                        <span className="mt-0.5 line-clamp-2 break-words text-[12px] text-neutral-500 dark:text-neutral-400">
                          {ago(at)}
                          {target.confirmation_note ? ` · ${target.confirmation_note}` : ''}
                        </span>
                        <span className="mt-1.5 flex flex-wrap items-center gap-2">
                          <OutcomeBadge outcome={target.attendance_confirmation ?? 'unconfirmed'} />
                        </span>
                      </span>
                      <span className="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg px-2 text-[13px] font-medium text-brand-700 dark:text-brand-400">
                        <Pencil className="h-3.5 w-3.5" aria-hidden />
                        Update
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[13px] text-neutral-500 dark:text-neutral-400">
                People you call show here, so you can change what you recorded if they call back or reply on WhatsApp.
              </p>
            )}
          </section>
        </section>

        <aside className="grid min-w-0 content-start gap-4" aria-label="The team">
          <section className="dashboard-panel p-4">
            <h2 className="app-section-title flex items-center gap-2">
              <Users className="h-4 w-4" aria-hidden />
              In the session · {board?.present.length ?? 0}
            </h2>
            <ul className="mt-3 grid gap-2">
              {(board?.present ?? []).map((m) => (
                <li key={m.user_id} className="flex items-start justify-between gap-2 text-sm">
                  <span className="min-w-0 flex-1">
                    <span className="block break-words font-medium text-neutral-900 dark:text-neutral-100">{m.user_id === data.me.id ? 'You' : m.name}</span>
                    <span className="block break-words text-[12px] text-neutral-500 dark:text-neutral-400">{m.on ? `On ${m.on}` : 'Between calls'}</span>
                  </span>
                  <span className="shrink-0 text-right text-[12px] tabular-nums text-neutral-600 dark:text-neutral-300">
                    {m.calls} calls
                    <br />
                    <span className="text-emerald-700 dark:text-emerald-400">{m.confirmed} coming</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
          {board && board.recent.length ? (
            <section className="dashboard-panel p-4">
              <h2 className="app-section-title">Just now</h2>
              <ul className="mt-3 grid gap-2.5">
                {board.recent.map((r, i) => (
                  <li key={`${r.at}-${i}`} className="text-[13px]">
                    <span className="font-medium text-neutral-900 dark:text-neutral-100">{r.name}</span>{' '}
                    <span className="text-neutral-500 dark:text-neutral-400">· {callOutcomeMeta(r.outcome as CallOutcome).label.toLowerCase()} · {r.caller.split(' ')[0]}, {ago(r.at)}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </aside>
      </div>

      <Dialog open={!!after.prompt} onOpenChange={(v) => (!v ? after.dismiss() : null)}>
        <DialogContent>
          {after.prompt ? (
            <>
              <DialogHeader>
                <DialogTitle>How did it go with {after.prompt.full_name.split(' ')[0]}?</DialogTitle>
                <DialogDescription>Tap what happened, and the next person comes up.</DialogDescription>
              </DialogHeader>
              <CallFeedbackPanel
                saving={busy === 'save'}
                onRecord={(o, n) => (after.prompt ? record(after.prompt, o, n) : undefined)}
                onNewNumber={(ph) => (after.prompt ? newNumber(after.prompt, ph) : Promise.resolve(null))}
              />
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <InviteTeamDialog open={inviteOpen} onOpenChange={setInviteOpen} />

      <UpdateCallDialog target={updating} saving={busy === 'save'} onClose={() => setUpdating(null)} onRecord={(t, o, n) => void update(t, o, n)} onNewNumber={newNumber} />
      <FindPersonDialog
        open={findOpen}
        onOpenChange={setFindOpen}
        onPick={(t) => {
          setFindOpen(false)
          setUpdating(t)
        }}
      />

      <Dialog open={confirmEnd} onOpenChange={setConfirmEnd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>End the session for everyone?</DialogTitle>
            <DialogDescription>Callers finish the person they&apos;re on; nobody new is handed out. Everything recorded stays.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" className="h-11" onClick={() => setConfirmEnd(false)}>Keep going</Button>
            <Button variant="destructive" className="h-11" onClick={() => void end()} disabled={busy === 'end'}>{busy === 'end' ? 'Ending…' : 'End session'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function CallSessionPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <LoadingSpinner />
        </div>
      }
    >
      <Session />
    </Suspense>
  )
}
