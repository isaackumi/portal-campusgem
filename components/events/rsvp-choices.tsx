'use client'

import { Check, HelpCircle, Loader2, Minus, Plus, X } from 'lucide-react'
import { MAX_GUESTS, type RsvpResponse } from '@/lib/events/rsvp'
import { cn } from '@/lib/utils'

export const RSVP_CHOICES: Array<{ id: RsvpResponse; label: string; icon: typeof Check; style: string; active: string }> = [
  {
    id: 'yes',
    label: "Yes, I'm coming",
    icon: Check,
    style:
      'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 dark:border-emerald-500 dark:bg-emerald-500 dark:text-emerald-950 dark:hover:bg-emerald-400',
    active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  },
  {
    id: 'maybe',
    label: 'Maybe',
    icon: HelpCircle,
    style:
      'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200 dark:hover:bg-amber-500/20',
    active: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  },
  {
    id: 'no',
    label: "No, I can't come",
    icon: X,
    style:
      'border-slate-300 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:hover:bg-slate-800',
    active: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  },
]

/** Yes / Maybe / No buttons with a "+ guests" stepper. Yes is disabled when the event is full. */
export function RsvpChoices({
  guests,
  maxGuests,
  full,
  pending,
  busy,
  onGuests,
  onChoose,
  size = 'lg',
}: {
  guests: number
  maxGuests: number
  full: boolean
  pending: RsvpResponse | null
  busy: boolean
  onGuests: (n: number) => void
  onChoose: (r: RsvpResponse) => void
  size?: 'lg' | 'sm'
}) {
  const allowGuests = !full && maxGuests > 0
  return (
    <div>
      {allowGuests ? (
        <div className="mb-3 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
          <span className="text-sm text-slate-700 dark:text-slate-200">Bringing guests?</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="One fewer guest"
              disabled={guests <= 0 || busy}
              onClick={() => onGuests(guests - 1)}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <Minus className="h-4 w-4" aria-hidden />
            </button>
            <span className="w-8 text-center text-base font-semibold tabular-nums text-slate-900 dark:text-white" aria-live="polite">
              +{guests}
            </span>
            <button
              type="button"
              aria-label="One more guest"
              disabled={guests >= Math.min(maxGuests, MAX_GUESTS) || busy}
              onClick={() => onGuests(guests + 1)}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <Plus className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      ) : null}
      <div className={cn('flex flex-col gap-3', size === 'sm' && 'gap-2 sm:flex-row')}>
        {RSVP_CHOICES.map((choice) => {
          const Icon = choice.icon
          const disabled = busy || (choice.id === 'yes' && full)
          return (
            <button
              key={choice.id}
              type="button"
              disabled={disabled}
              onClick={() => onChoose(choice.id)}
              className={cn(
                'flex w-full items-center justify-center gap-2 rounded-xl border-2 font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:ring-offset-slate-900',
                size === 'lg' ? 'h-14 text-[17px]' : 'h-11 text-sm',
                choice.style
              )}
            >
              {pending === choice.id ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Icon className="h-5 w-5" aria-hidden />}
              {choice.id === 'yes' && full ? 'Event is full' : choice.id === 'yes' && guests > 0 ? `${choice.label} (+${guests})` : choice.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
