'use client'

/**
 * My calls: the list a caller is texted a link to. Made for a phone: each person with big Call and
 * WhatsApp buttons, one-tap feedback, and "How did it go?" when they come back from a call.
 */
import { Suspense, useMemo, useState } from 'react'
import Link from 'next/link'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, MapPin, Phone, PhoneCall, Radio, RefreshCw, Smartphone } from 'lucide-react'
import { useAuth } from '@/components/providers'
import { AccessDenied } from '@/components/auth/access-denied'
import { Button } from '@/components/ui/button'
import { Meter } from '@/components/ui/meter'
import { LoadingSpinner } from '@/components/ui/loading'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { telHref } from '@/lib/contact-links'
import type { CampRegistration } from '@/lib/types'
import { effectiveOutcome, isOpenCall, type CallOutcome } from '@/lib/camp/call-campaign'
import { getCallBoardAction, recordCallOutcomeAction, type CallBoardData } from '@/lib/actions/camp-calls'
import { getLiveSessionInfoAction, getMySmsNumberAction, setMySmsNumberAction, setRegistrantNumberAction } from '@/lib/actions/call-center'
import { OutcomeBadge } from '@/components/camp/call-outcome'
import { CallFeedbackPanel } from '@/components/calls/call-feedback'
import { WhatsAppButton } from '@/components/calls/whatsapp-button'
import { useAfterCallPrompt } from '@/components/calls/use-after-call-prompt'

type Show = 'open' | 'done' | 'all'

function relative(iso?: string): string | null {
  if (!iso) return null
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (Number.isNaN(mins)) return null
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.round(mins / 60)
  return hours < 24 ? `${hours} h ago` : `${Math.round(hours / 24)} d ago`
}

function MyCalls() {
  const { can } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [show, setShow] = useState<Show>('open')
  const [openId, setOpenId] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const after = useAfterCallPrompt<CampRegistration>()

  const board = useQuery({
    queryKey: ['call-board', 'active'],
    queryFn: async () => {
      const res = await getCallBoardAction(null)
      if (res.error || !res.data) throw new Error(res.error ?? 'Could not load your list')
      return res.data
    },
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  })
  const live = useQuery({
    queryKey: ['call-session-live'],
    queryFn: async () => (await getLiveSessionInfoAction(null)).data,
    refetchInterval: 30_000,
  })

  const data = board.data
  const mine = useMemo(() => (data ? data.registrations.filter((r) => r.assigned_to === data.me.id && r.status !== 'cancelled') : []), [data])
  const open = mine.filter(isOpenCall)
  const shown = useMemo(() => {
    const list = show === 'open' ? mine.filter(isOpenCall) : show === 'done' ? mine.filter((r) => !isOpenCall(r)) : mine
    return [...list].sort((a, b) => (a.call_attempts ?? 0) - (b.call_attempts ?? 0) || a.full_name.localeCompare(b.full_name))
  }, [mine, show])

  async function record(reg: CampRegistration, outcome: Exclude<CallOutcome, 'unconfirmed'>, note: string) {
    setSavingId(reg.id)
    queryClient.setQueryData<CallBoardData>(['call-board', 'active'], (prev) =>
      prev
        ? {
            ...prev,
            registrations: prev.registrations.map((r) =>
              r.id === reg.id
                ? { ...r, attendance_confirmation: outcome, confirmation_note: note || r.confirmation_note, call_attempts: (r.call_attempts ?? 0) + 1, last_called_at: new Date().toISOString() }
                : r
            ),
          }
        : prev
    )
    const res = await recordCallOutcomeAction({ registration_id: reg.id, outcome, note })
    setSavingId(null)
    if (res.error) {
      toast({ variant: 'destructive', title: 'Not saved', description: res.error })
      void queryClient.invalidateQueries({ queryKey: ['call-board'] })
      return
    }
    setOpenId(null)
    after.dismiss()
    toast({ title: `${reg.full_name.split(' ')[0]}: saved`, description: note || undefined })
  }

  async function newNumber(reg: CampRegistration, phone: string): Promise<string | null> {
    const res = await setRegistrantNumberAction({ registrationId: reg.id, phone })
    if (res.error) return res.error
    toast({ title: 'New number saved', description: `${reg.full_name.split(' ')[0]} gets every text on ${res.phone} from now on.` })
    void queryClient.invalidateQueries({ queryKey: ['call-board'] })
    return null
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
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="app-section-title">Couldn&apos;t load your list</p>
        <p className="app-page-description mt-2">{board.error instanceof Error ? board.error.message : 'Try again.'}</p>
        <Button className="mt-6" variant="outline" onClick={() => void board.refetch()}>Try again</Button>
      </div>
    )
  }

  const done = mine.length - open.length

  return (
    <div className="mx-auto max-w-2xl pb-28">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="app-overline">{data.year ? `Camp meeting ${data.year.year}` : 'Calls'}</p>
          <h1 className="app-page-title mt-1">My calls</h1>
        </div>
        <Button variant="outline" size="icon" className="h-11 w-11 shrink-0" onClick={() => void board.refetch()} disabled={board.isFetching} aria-label="Refresh">
          <RefreshCw className={cn('h-4 w-4', board.isFetching && 'animate-spin')} aria-hidden />
        </Button>
      </header>

      <section className="dashboard-panel mt-4 p-4" aria-label="Your progress">
        <p className="flex items-baseline justify-between gap-3 text-sm text-neutral-600 dark:text-neutral-300">
          <span>
            <span className="text-2xl font-semibold tabular-nums text-neutral-900 dark:text-neutral-50">{done}</span> of {mine.length} done
          </span>
          <span className="tabular-nums">{open.length} to call</span>
        </p>
        <Meter className="mt-3 h-2" value={done} max={Math.max(1, mine.length)} tone={open.length === 0 && mine.length > 0 ? 'success' : 'brand'} label="Your progress" />
      </section>

      {live.data ? (
        <Link
          href="/admin/camp-meeting/calls/session"
          className="mt-3 flex items-center gap-3 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-emerald-900 transition-colors hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100 dark:hover:bg-emerald-950/60"
        >
          <Radio className="h-5 w-5 shrink-0 animate-pulse motion-reduce:animate-none" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">The team is calling together now</span>
            <span className="block text-sm opacity-80">Join the session to take people from the shared list.</span>
          </span>
          <ArrowRight className="h-5 w-5 shrink-0" aria-hidden />
        </Link>
      ) : null}

      <div role="tablist" aria-label="Show" className="mt-5 grid grid-cols-3 rounded-xl bg-neutral-200/60 p-1 dark:bg-neutral-800">
        {(
          [
            ['open', `To call · ${open.length}`],
            ['done', `Done · ${done}`],
            ['all', `All · ${mine.length}`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={show === id}
            onClick={() => setShow(id)}
            className={cn(
              'h-10 rounded-lg text-sm font-medium transition-colors',
              show === id ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-white' : 'text-neutral-600 dark:text-neutral-400'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {mine.length === 0 ? (
        <Empty title="No one on your list yet" body="When the camp team gives you people to call, they show up here with their numbers. You'll get a text too." />
      ) : shown.length === 0 ? (
        <Empty title={show === 'open' ? 'All called. Thank you!' : 'Nothing here yet'} body={show === 'open' ? 'Everyone on your list has an answer. Check Done to see them.' : 'Calls you finish show up here.'} />
      ) : (
        <ul className="mt-4 grid gap-3">
          {shown.map((r) => {
            const lastCalled = relative(r.last_called_at)
            const expanded = openId === r.id
            const tel = telHref(r.phone)
            return (
              <li key={r.id} className="dashboard-panel p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="text-[17px] font-semibold text-neutral-900 dark:text-neutral-50">{r.full_name}</span>
                      <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', r.is_new_registrant ? 'bg-brand-100 text-brand-800 dark:bg-brand-950/60 dark:text-brand-200' : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300')}>
                        {r.is_new_registrant ? 'New' : 'Returning'}
                      </span>
                    </p>
                    <p className="mt-1 font-mono text-[15px] text-neutral-700 dark:text-neutral-200">{r.phone}</p>
                    <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[13px] text-neutral-500 dark:text-neutral-400">
                      {r.residence ? (
                        <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" aria-hidden />{r.residence}</span>
                      ) : null}
                      {r.call_attempts ? <span>{r.call_attempts} call{r.call_attempts === 1 ? '' : 's'}{lastCalled ? `, last ${lastCalled}` : ''}</span> : null}
                    </p>
                    {r.confirmation_note ? <p className="mt-1.5 text-[13px] text-neutral-700 dark:text-neutral-300">“{r.confirmation_note}”</p> : null}
                  </div>
                  <OutcomeBadge outcome={effectiveOutcome(r)} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {tel ? (
                    <Button asChild className="h-12 text-[15px]">
                      <a href={tel} onClick={() => after.calling(r)}>
                        <Phone className="mr-2 h-4 w-4" aria-hidden />
                        Call
                      </a>
                    </Button>
                  ) : (
                    <span />
                  )}
                  <WhatsAppButton person={r} onSent={() => setOpenId(r.id)} />
                </div>
                <button
                  type="button"
                  onClick={() => setOpenId(expanded ? null : r.id)}
                  aria-expanded={expanded}
                  className="mt-2 h-11 w-full rounded-lg text-sm font-medium text-brand-700 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-950/40"
                >
                  {expanded ? 'Close' : isOpenCall(r) ? 'Update after the call' : 'Change the answer'}
                </button>
                {expanded ? (
                  <div className="mt-2 border-t border-neutral-200 pt-3 dark:border-neutral-700">
                    <CallFeedbackPanel saving={savingId === r.id} onRecord={(o, n) => record(r, o, n)} onNewNumber={(p) => newNumber(r, p)} />
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}

      <MySmsNumber />

      <Dialog open={!!after.prompt} onOpenChange={(v) => (!v ? after.dismiss() : null)}>
        <DialogContent>
          {after.prompt ? (
            <>
              <DialogHeader>
                <DialogTitle>How did it go with {after.prompt.full_name.split(' ')[0]}?</DialogTitle>
                <DialogDescription>Tap what happened. It updates your list and the camp team straight away.</DialogDescription>
              </DialogHeader>
              <CallFeedbackPanel
                saving={savingId === after.prompt.id}
                onRecord={(o, n) => (after.prompt ? record(after.prompt, o, n) : undefined)}
                onNewNumber={(p) => (after.prompt ? newNumber(after.prompt, p) : Promise.resolve(null))}
              />
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}

/** Where this caller gets their list and other texts: their own number, or a new one. */
function MySmsNumber() {
  const { toast } = useToast()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mine = useQuery({ queryKey: ['my-sms-number'], queryFn: async () => (await getMySmsNumberAction()).data })

  async function save() {
    setSaving(true)
    setError(null)
    const res = await setMySmsNumberAction({ phone: value })
    setSaving(false)
    if (res.error) {
      setError(res.error)
      return
    }
    setEditing(false)
    toast({ title: 'Number saved', description: 'Your texts from the church go there from now on.' })
    void mine.refetch()
  }

  return (
    <section className="dashboard-panel mt-8 p-4" aria-label="Your number for texts">
      <div className="flex items-start gap-3">
        <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-neutral-500" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-neutral-900 dark:text-neutral-50">Your number for texts</p>
          <p className="mt-0.5 text-[13px] text-neutral-600 dark:text-neutral-400">
            Your call list and other texts from the church go to <span className="font-mono text-neutral-900 dark:text-neutral-100">{mine.data?.sms || '…'}</span>.
            {mine.data && mine.data.sms !== mine.data.account ? ' You still sign in with the number on your account.' : ''}
          </p>
          {editing ? (
            <form
              className="mt-3 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                void save()
              }}
            >
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="024 123 4567"
                aria-label="New number for texts"
                className="h-11 min-w-0 flex-1 rounded-lg border border-neutral-200 bg-white px-3 font-mono text-[15px] text-neutral-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
              />
              <Button type="submit" className="h-11" disabled={!value.trim() || saving}>{saving ? 'Saving…' : 'Save'}</Button>
            </form>
          ) : (
            <Button variant="outline" className="mt-3 h-10" onClick={() => setEditing(true)}>Use another number</Button>
          )}
          {error ? <p className="mt-2 text-[13px] text-red-700 dark:text-red-300">{error}</p> : null}
        </div>
      </div>
    </section>
  )
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-4 flex flex-col items-center rounded-xl border border-dashed border-neutral-300 px-6 py-12 text-center dark:border-neutral-700">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 dark:bg-white/[0.06] dark:text-neutral-400">
        <PhoneCall className="h-5 w-5" aria-hidden />
      </span>
      <p className="app-section-title mt-4">{title}</p>
      <p className="app-page-description mt-1 max-w-sm">{body}</p>
    </div>
  )
}

export default function MyCallsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <LoadingSpinner />
        </div>
      }
    >
      <MyCalls />
    </Suspense>
  )
}
