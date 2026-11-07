'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, Check, MessageSquareText, Shuffle, Sparkles, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { applyShareAction, previewShareAction, type SharePlan, type ShareScope, type ShareSource } from '@/lib/actions/call-center'

/**
 * Share out the calls, no assigning by hand: pick who calls (the session's people or the call team),
 * who gets a call, and the rules (men to men, women to women; each caller's New / Returning). The
 * preview shows every caller's share before anything changes; Shuffle again tries another draw.
 */
export function ShareOutDialog({
  open,
  onOpenChange,
  yearId,
  sessionLive,
  sessionPeople,
  teamActive,
  counts,
  canSms,
  onShared,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  yearId?: string | null
  sessionLive: boolean
  sessionPeople: number
  teamActive: number
  /** Open calls without a caller, and all open calls (for the choice's labels). */
  counts?: { unassigned: number; open: number }
  canSms?: boolean
  /** After sharing: e.g. offer to text each caller their list. */
  onShared?: (textLists: boolean) => void
}) {
  const { toast } = useToast()
  const [source, setSource] = useState<ShareSource>(sessionLive ? 'session' : 'team')
  const [scope, setScope] = useState<ShareScope>('unassigned')
  const [sameGender, setSameGender] = useState(true)
  const [matchTakes, setMatchTakes] = useState(true)
  const [plan, setPlan] = useState<SharePlan | null>(null)
  const [busy, setBusy] = useState<null | 'preview' | 'apply'>(null)
  const [error, setError] = useState<string | null>(null)
  const [shared, setShared] = useState<{ assigned: number; callers: number } | null>(null)

  useEffect(() => {
    if (!open) return
    setSource(sessionLive && sessionPeople > 0 ? 'session' : 'team')
    setPlan(null)
    setShared(null)
    setError(null)
  }, [open, sessionLive, sessionPeople])

  // Any change to the choices makes the old preview out of date.
  useEffect(() => setPlan(null), [source, scope, sameGender, matchTakes])

  async function preview(seed?: number) {
    setBusy('preview')
    setError(null)
    const res = await previewShareAction({ yearId, source, scope, sameGender, matchTakes, seed })
    setBusy(null)
    if (res.error || !res.data) setError(res.error ?? 'Could not plan the share.')
    else setPlan(res.data)
  }

  async function apply() {
    if (!plan) return
    setBusy('apply')
    const res = await applyShareAction({ yearId, source, scope, sameGender, matchTakes, seed: plan.seed })
    setBusy(null)
    if (res.error || !res.data) {
      toast({ variant: 'destructive', title: 'Not shared', description: res.error ?? 'Try again.' })
      return
    }
    setShared(res.data)
    toast({ title: `Shared ${res.data.assigned} calls among ${res.data.callers}` })
  }

  const top = plan ? Math.max(1, ...plan.callers.map((c) => c.total)) : 1
  const option = (active: boolean, disabled?: boolean) =>
    cn(
      'flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors',
      disabled
        ? 'cursor-not-allowed border-neutral-200 opacity-50 dark:border-neutral-800'
        : active
          ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500 dark:border-brand-500 dark:bg-brand-950/40'
          : 'border-neutral-200 hover:border-brand-300 dark:border-neutral-700 dark:hover:border-brand-700'
    )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-brand-600 dark:text-brand-400" aria-hidden />
            Share out the calls
          </DialogTitle>
          <DialogDescription>Shared at random but evenly, following your rules. Check the preview, then share.</DialogDescription>
        </DialogHeader>

        {shared ? (
          <div className="grid gap-4 py-2 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              <Check className="h-6 w-6" aria-hidden />
            </span>
            <p className="app-section-title">
              {shared.assigned} calls shared among {shared.callers} {shared.callers === 1 ? 'caller' : 'callers'}
            </p>
            <p className="app-page-description">They see them now under My calls. Text them so they know.</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              {canSms ? (
                <Button
                  className="h-11"
                  onClick={() => {
                    onOpenChange(false)
                    onShared?.(true)
                  }}
                >
                  <MessageSquareText className="mr-2 h-4 w-4" aria-hidden />
                  Text each caller their list
                </Button>
              ) : null}
              <Button
                variant="outline"
                className="h-11"
                onClick={() => {
                  onOpenChange(false)
                  onShared?.(false)
                }}
              >
                Done
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-5">
            <fieldset className="grid gap-2">
              <legend className="app-overline mb-1.5">Who calls</legend>
              <button type="button" className={option(source === 'session', !sessionLive || sessionPeople === 0)} disabled={!sessionLive || sessionPeople === 0} onClick={() => setSource('session')}>
                <Users className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                <span>
                  <span className="block font-semibold text-neutral-900 dark:text-neutral-50">People in the session · {sessionPeople}</span>
                  <span className="block text-[13px] text-neutral-600 dark:text-neutral-400">{sessionLive ? 'Everyone who has joined right now.' : 'No session is running.'}</span>
                </span>
              </button>
              <button type="button" className={option(source === 'team', teamActive === 0)} disabled={teamActive === 0} onClick={() => setSource('team')}>
                <Users className="mt-0.5 h-5 w-5 shrink-0 text-brand-600 dark:text-brand-400" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-neutral-900 dark:text-neutral-50">The call team · {teamActive}</span>
                  <span className="block text-[13px] text-neutral-600 dark:text-neutral-400">
                    Everyone you&apos;ve added to the call center.{' '}
                    <Link href="/admin/camp-meeting/calls/team" className="font-medium text-brand-700 underline-offset-2 hover:underline dark:text-brand-400" onClick={() => onOpenChange(false)}>
                      {teamActive ? 'Edit the team' : 'Add people'}
                    </Link>
                  </span>
                </span>
              </button>
            </fieldset>

            <fieldset className="grid gap-2">
              <legend className="app-overline mb-1.5">Who gets a call</legend>
              <button type="button" className={option(scope === 'unassigned')} onClick={() => setScope('unassigned')}>
                <span>
                  <span className="block font-semibold text-neutral-900 dark:text-neutral-50">Only people without a caller{counts ? ` · ${counts.unassigned}` : ''}</span>
                  <span className="block text-[13px] text-neutral-600 dark:text-neutral-400">Lists callers already have stay as they are.</span>
                </span>
              </button>
              <button type="button" className={option(scope === 'open')} onClick={() => setScope('open')}>
                <span>
                  <span className="block font-semibold text-neutral-900 dark:text-neutral-50">Everyone not answered yet{counts ? ` · ${counts.open}` : ''}</span>
                  <span className="block text-[13px] text-neutral-600 dark:text-neutral-400">A fresh share: people may move to a different caller.</span>
                </span>
              </button>
            </fieldset>

            <fieldset className="grid gap-2">
              <legend className="app-overline mb-1.5">Rules</legend>
              <Toggle checked={sameGender} onChange={setSameGender} title="Men call men, women call women" body="When both are known. Anyone else goes to whoever is free." />
              <Toggle checked={matchTakes} onChange={setMatchTakes} title="Follow each caller's New / Returning choice" body="Set on the call team: some take first-time campers, others returning ones." />
            </fieldset>

            {error ? <p className="rounded-lg bg-red-50 p-3 text-[13px] text-red-800 dark:bg-red-950/40 dark:text-red-200">{error}</p> : null}

            {plan ? (
              <section aria-label="Preview" className="grid gap-3 rounded-xl border border-neutral-200 p-3 dark:border-neutral-700">
                <p className="text-sm text-neutral-700 dark:text-neutral-300">
                  <span className="font-semibold text-neutral-900 dark:text-neutral-50">{plan.people - plan.unplaced}</span> of {plan.people} shared among {plan.callers.filter((c) => c.total > 0).length}
                </p>
                <ul className="grid max-h-64 gap-2.5 overflow-y-auto pr-1">
                  {plan.callers.map((c) => (
                    <li key={c.id} className="grid gap-1">
                      <div className="flex items-baseline justify-between gap-2 text-sm">
                        <span className="truncate font-medium text-neutral-900 dark:text-neutral-100">{c.name}</span>
                        <span className="shrink-0 tabular-nums text-neutral-700 dark:text-neutral-300">
                          +{c.total}
                          {c.alreadyOpen ? <span className="text-neutral-400"> ({c.alreadyOpen} had)</span> : null}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                        <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-violet-500" style={{ width: `${(c.total / top) * 100}%` }} />
                      </div>
                      {c.total ? (
                        <p className="flex flex-wrap gap-1.5 text-[11px] font-medium">
                          {c.male ? <span className="rounded-full bg-sky-100 px-2 py-0.5 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300">{c.male} men</span> : null}
                          {c.female ? <span className="rounded-full bg-rose-100 px-2 py-0.5 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300">{c.female} women</span> : null}
                          {c.newcomers ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">{c.newcomers} new</span> : null}
                          {c.returning ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-900 dark:bg-amber-500/15 dark:text-amber-300">{c.returning} returning</span> : null}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
                {plan.relaxed.gender || plan.relaxed.takes || plan.unplaced ? (
                  <ul className="grid gap-1 rounded-lg bg-amber-50 p-2.5 text-[13px] text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                    {plan.relaxed.gender ? <li className="flex gap-2"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />{plan.relaxed.gender} went to a caller of the other gender: nobody of theirs was free.</li> : null}
                    {plan.relaxed.takes ? <li className="flex gap-2"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />{plan.relaxed.takes} went outside a caller&apos;s New / Returning choice.</li> : null}
                    {plan.unplaced ? <li className="flex gap-2"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />{plan.unplaced} not shared: every caller is at their limit.</li> : null}
                  </ul>
                ) : null}
              </section>
            ) : null}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              {plan ? (
                <>
                  <Button variant="outline" className="h-11" onClick={() => void preview()} disabled={busy !== null}>
                    <Shuffle className="mr-2 h-4 w-4" aria-hidden />
                    Shuffle again
                  </Button>
                  <Button className="h-11" onClick={() => void apply()} disabled={busy !== null || plan.people - plan.unplaced === 0}>
                    {busy === 'apply' ? 'Sharing…' : `Share out ${plan.people - plan.unplaced} calls`}
                  </Button>
                </>
              ) : (
                <Button className="h-11" onClick={() => void preview()} disabled={busy !== null}>
                  {busy === 'preview' ? 'Working it out…' : 'Preview the share'}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Toggle({ checked, onChange, title, body }: { checked: boolean; onChange: (v: boolean) => void; title: string; body: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center gap-3 rounded-xl border border-neutral-200 p-3 text-left hover:border-brand-300 dark:border-neutral-700 dark:hover:border-brand-700"
    >
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-neutral-900 dark:text-neutral-50">{title}</span>
        <span className="block text-[13px] text-neutral-600 dark:text-neutral-400">{body}</span>
      </span>
      <span className={cn('relative h-6 w-11 shrink-0 rounded-full transition-colors', checked ? 'bg-brand-600' : 'bg-neutral-300 dark:bg-neutral-600')} aria-hidden>
        <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-[left]', checked ? 'left-[22px]' : 'left-0.5')} />
      </span>
    </button>
  )
}
