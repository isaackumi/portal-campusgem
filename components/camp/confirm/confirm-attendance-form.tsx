'use client'

import { useState, useTransition } from 'react'
import { CalendarDays, Check, HelpCircle, Loader2, MapPin, X } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { submitConfirmLinkAction, type ConfirmLinkView } from '@/lib/actions/confirm-link'
import { SELF_REPORT_CHOICES, type SelfReportOutcome } from '@/lib/camp/confirm-link'
import { formatCampDate } from '@/lib/camp/camp-reminders'
import { cn } from '@/lib/utils'

const CHOICE_STYLE: Record<SelfReportOutcome, { icon: typeof Check; button: string; badge: string }> = {
  confirmed: {
    icon: Check,
    button:
      'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 dark:border-emerald-500 dark:bg-emerald-500 dark:text-emerald-950 dark:hover:bg-emerald-400',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  },
  maybe: {
    icon: HelpCircle,
    button:
      'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200 dark:hover:bg-amber-500/20',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  },
  declined: {
    icon: X,
    button:
      'border-slate-300 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:hover:bg-slate-800',
    badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  },
}

function dateRange(start: string, end: string): string {
  const year = /^(\d{4})/.exec(end || start)?.[1] ?? ''
  if (!end || end.slice(0, 10) === start.slice(0, 10)) return `${formatCampDate(start)} ${year}`.trim()
  return `${formatCampDate(start)} – ${formatCampDate(end)} ${year}`.trim()
}

export function ConfirmAttendanceForm({ token, view }: { token: string; view: ConfirmLinkView }) {
  const [answer, setAnswer] = useState<SelfReportOutcome | null>(view.answer)
  const [editing, setEditing] = useState(view.answer == null)
  const [pending, setPending] = useState<SelfReportOutcome | null>(null)
  const [noteOpen, setNoteOpen] = useState(false)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function choose(outcome: SelfReportOutcome) {
    setError(null)
    setPending(outcome)
    startTransition(async () => {
      const res = await submitConfirmLinkAction({ token, outcome, note: note.trim() || undefined })
      setPending(null)
      if (!res.ok) {
        setError(res.error ?? 'Something went wrong. Please try again.')
        return
      }
      setAnswer(outcome)
      setEditing(false)
      setNote('')
      setNoteOpen(false)
    })
  }

  const chosen = answer ? SELF_REPORT_CHOICES.find((c) => c.id === answer) : null
  const campName = `Eagles Camp Meeting ${view.camp.year}`

  return (
    <div>
      <p className="app-overline">You&apos;re invited</p>
      <h1 className="app-page-title mt-1 text-[26px] leading-tight text-slate-900 dark:text-white">
        Hi {view.firstName}!
      </h1>
      <div className="mt-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
        <p className="text-[17px] font-semibold tracking-tight text-slate-900 dark:text-white">{campName}</p>
        {view.camp.theme ? (
          <p className="mt-0.5 text-sm italic text-slate-600 dark:text-slate-300">{view.camp.theme}</p>
        ) : null}
        <ul className="mt-3 space-y-1.5 text-sm text-slate-700 dark:text-slate-200">
          <li className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" aria-hidden />
            {dateRange(view.camp.start_date, view.camp.end_date)}
          </li>
          {view.camp.venue ? (
            <li className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" aria-hidden />
              {view.camp.venue}
            </li>
          ) : null}
        </ul>
      </div>

      {view.checkedIn ? (
        <p className="mt-6 rounded-xl bg-emerald-50 p-4 text-[15px] text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200">
          You&apos;re checked in at camp. Welcome, and God bless you!
        </p>
      ) : view.closed ? (
        <p className="mt-6 text-[15px] text-slate-600 dark:text-slate-300">
          Camp has ended. Thank you, and see you next year!
        </p>
      ) : !editing && chosen ? (
        <div className="mt-6 text-center" role="status" aria-live="polite">
          <span
            className={cn(
              'mx-auto flex h-14 w-14 items-center justify-center rounded-full',
              CHOICE_STYLE[chosen.id].badge
            )}
          >
            {(() => {
              const Icon = CHOICE_STYLE[chosen.id].icon
              return <Icon className="h-7 w-7" aria-hidden />
            })()}
          </span>
          <p className="mt-3 text-lg font-semibold text-slate-900 dark:text-white">Thank you!</p>
          <p className="mt-1 text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">
            Your answer: <span className="font-semibold text-slate-900 dark:text-white">{chosen.label}</span>. {chosen.thanks}
          </p>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="mt-5 inline-flex h-11 items-center rounded-lg px-4 text-[15px] font-medium text-brand-700 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-500/10"
          >
            Change my answer
          </button>
        </div>
      ) : (
        <div className="mt-6">
          <h2 className="app-section-title text-slate-900 dark:text-white">Are you coming?</h2>
          <div className="mt-3 flex flex-col gap-3">
            {SELF_REPORT_CHOICES.map((choice) => {
              const style = CHOICE_STYLE[choice.id]
              const Icon = style.icon
              const busy = pending === choice.id
              return (
                <button
                  key={choice.id}
                  type="button"
                  disabled={isPending}
                  onClick={() => choose(choice.id)}
                  aria-pressed={answer === choice.id}
                  className={cn(
                    'flex h-14 w-full items-center justify-center gap-2 rounded-xl border-2 text-[17px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 disabled:opacity-60',
                    style.button
                  )}
                >
                  {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Icon className="h-5 w-5" aria-hidden />}
                  {choice.label}
                </button>
              )
            })}
          </div>

          {noteOpen ? (
            <div className="mt-4">
              <label htmlFor="confirm-note" className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Note for the camp team (optional)
              </label>
              <Textarea
                id="confirm-note"
                value={note}
                maxLength={300}
                rows={3}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. I'll arrive on the second day"
                className="mt-1.5"
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Then tap your answer above.</p>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setNoteOpen(true)}
              className="mt-4 inline-flex h-11 items-center text-[15px] font-medium text-brand-700 hover:underline dark:text-brand-300"
            >
              Add a note (optional)
            </button>
          )}

          {error ? (
            <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          ) : null}
          {answer && editing ? (
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="mt-2 block text-sm text-slate-500 hover:underline dark:text-slate-400"
            >
              Keep my answer ({SELF_REPORT_CHOICES.find((c) => c.id === answer)?.label})
            </button>
          ) : null}
        </div>
      )}
    </div>
  )
}
