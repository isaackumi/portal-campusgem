'use client'

import { useState } from 'react'
import { Check, HelpCircle, PhoneOff, Smartphone, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { CallOutcome } from '@/lib/camp/call-campaign'
import { CALL_FEEDBACK, feedbackNote, type CallFeedback } from '@/lib/calls/feedback'

type Outcome = Exclude<CallOutcome, 'unconfirmed'>

const MAIN: Array<{ id: Outcome; label: string; icon: typeof Check; tone: string }> = [
  { id: 'confirmed', label: 'Coming', icon: Check, tone: 'bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500' },
  { id: 'maybe', label: 'Not sure', icon: HelpCircle, tone: 'bg-amber-400 text-neutral-950 hover:bg-amber-300 dark:bg-amber-400 dark:hover:bg-amber-300' },
  { id: 'declined', label: 'Not coming', icon: X, tone: 'bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500' },
]

/**
 * What the person said, in one tap: the three answers, then quick feedback (Didn't answer, Texted on
 * WhatsApp…) that saves an outcome and a note together. An optional note goes with whichever is
 * tapped. "Wrong number" opens a field for the new one, saved for every text the system sends.
 */
export function CallFeedbackPanel({
  saving,
  onRecord,
  onNewNumber,
  compact,
}: {
  saving?: boolean
  onRecord: (outcome: Outcome, note: string) => void | Promise<void>
  onNewNumber?: (phone: string) => Promise<string | null>
  compact?: boolean
}) {
  const [note, setNote] = useState('')
  const [numberOpen, setNumberOpen] = useState(false)
  const [number, setNumber] = useState('')
  const [numberError, setNumberError] = useState<string | null>(null)
  const [numberSaving, setNumberSaving] = useState(false)

  function quick(feedback: CallFeedback) {
    if (feedback.asksForNumber && onNewNumber) setNumberOpen(true)
    void onRecord(feedback.outcome, feedbackNote(feedback, note))
    setNote('')
  }

  async function saveNumber() {
    if (!onNewNumber) return
    setNumberSaving(true)
    setNumberError(null)
    const error = await onNewNumber(number)
    setNumberSaving(false)
    if (error) setNumberError(error)
    else {
      setNumber('')
      setNumberOpen(false)
    }
  }

  return (
    <div className={cn('grid gap-3', saving && 'pointer-events-none opacity-60')} aria-busy={saving}>
      <div className="grid grid-cols-3 gap-2">
        {MAIN.map(({ id, label, icon: Icon, tone }) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              void onRecord(id, note.trim())
              setNote('')
            }}
            className={cn(
              'flex flex-col items-center justify-center gap-1 rounded-xl font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50',
              compact ? 'h-12 text-[13px]' : 'h-16 text-sm',
              tone
            )}
          >
            <Icon className="h-5 w-5" aria-hidden />
            {label}
          </button>
        ))}
      </div>
      <div>
        <p className="app-overline mb-1.5">Couldn&apos;t talk? Tap one</p>
        <div className="flex flex-wrap gap-2">
          {CALL_FEEDBACK.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => quick(f)}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3.5 text-[13px] font-medium text-neutral-800 transition-colors hover:border-brand-300 hover:bg-brand-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:border-brand-700 dark:hover:bg-brand-950/40"
            >
              {f.id === 'no-answer' || f.id === 'not-reachable' ? <PhoneOff className="h-3.5 w-3.5" aria-hidden /> : null}
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={300}
        placeholder="Note (optional)"
        aria-label="Note"
        className="h-11 w-full rounded-lg border border-neutral-200 bg-white px-3 text-[15px] text-neutral-900 placeholder:text-neutral-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500 sm:h-10 sm:text-sm"
      />
      {onNewNumber ? (
        numberOpen ? (
          <form
            className="grid gap-2 rounded-xl border border-brand-200 bg-brand-50/60 p-3 dark:border-brand-900 dark:bg-brand-950/30"
            onSubmit={(e) => {
              e.preventDefault()
              void saveNumber()
            }}
          >
            <label className="text-sm font-medium text-neutral-900 dark:text-neutral-100" htmlFor="new-number">
              Their new number
            </label>
            <div className="flex gap-2">
              <input
                id="new-number"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="024 123 4567"
                className="h-11 min-w-0 flex-1 rounded-lg border border-neutral-200 bg-white px-3 font-mono text-[15px] text-neutral-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
              />
              <Button type="submit" className="h-11" disabled={!number.trim() || numberSaving}>
                {numberSaving ? 'Saving…' : 'Save'}
              </Button>
            </div>
            {numberError ? <p className="text-[13px] text-red-700 dark:text-red-300">{numberError}</p> : null}
            <p className="text-xs text-neutral-600 dark:text-neutral-400">Every text from the church goes to this number from now on.</p>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setNumberOpen(true)}
            className="inline-flex w-fit items-center gap-1.5 text-[13px] font-medium text-brand-700 hover:underline dark:text-brand-400"
          >
            <Smartphone className="h-3.5 w-3.5" aria-hidden />
            They have a new number
          </button>
        )
      ) : null}
    </div>
  )
}
