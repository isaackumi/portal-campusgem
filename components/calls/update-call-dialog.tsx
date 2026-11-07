'use client'

/**
 * Going back to someone: change what was recorded (they called back, the WhatsApp reply came),
 * and "Called back?" to find anyone by name or number. Neither changes who you're calling next.
 */
import { useEffect, useState } from 'react'
import { Phone, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { OutcomeBadge } from '@/components/camp/call-outcome'
import { CallFeedbackPanel } from '@/components/calls/call-feedback'
import { WhatsAppButton } from '@/components/calls/whatsapp-button'
import { telHref } from '@/lib/contact-links'
import type { CallOutcome } from '@/lib/camp/call-campaign'
import { findCallTargetsAction, type CallTarget } from '@/lib/actions/call-center'

export function UpdateCallDialog({
  target,
  saving,
  onClose,
  onRecord,
  onNewNumber,
}: {
  target: CallTarget | null
  saving: boolean
  onClose: () => void
  onRecord: (target: CallTarget, outcome: Exclude<CallOutcome, 'unconfirmed'>, note: string) => void
  onNewNumber: (target: CallTarget, phone: string) => Promise<string | null>
}) {
  return (
    <Dialog open={!!target} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        {target ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex flex-wrap items-center gap-2">
                {target.full_name}
                <OutcomeBadge outcome={target.attendance_confirmation ?? 'unconfirmed'} />
              </DialogTitle>
              <DialogDescription>
                <span className="font-mono">{target.phone}</span>
                {target.confirmation_note ? <> · Last time: &ldquo;{target.confirmation_note}&rdquo;</> : null}
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-2">
              {telHref(target.phone) ? (
                <Button asChild variant="outline" className="h-12">
                  <a href={telHref(target.phone) ?? undefined}>
                    <Phone className="mr-2 h-4 w-4" aria-hidden />
                    Call
                  </a>
                </Button>
              ) : (
                <span />
              )}
              <WhatsAppButton person={target} className="h-12" />
            </div>
            <p className="app-overline mt-1">What did they say?</p>
            <CallFeedbackPanel saving={saving} onRecord={(o, n) => onRecord(target, o, n)} onNewNumber={(ph) => onNewNumber(target, ph)} />
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

export function FindPersonDialog({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPick: (target: CallTarget) => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CallTarget[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    if (!open) {
      setQuery('')
      setResults([])
      return
    }
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      return
    }
    let stale = false
    setSearching(true)
    const t = setTimeout(async () => {
      const res = await findCallTargetsAction({ query: q })
      if (stale) return
      setSearching(false)
      setResults(res.data ?? [])
    }, 250)
    return () => {
      stale = true
      clearTimeout(t)
    }
  }, [query, open])

  const q = query.trim()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Someone called back?</DialogTitle>
          <DialogDescription>Type their name or the number that called you, then record what they said.</DialogDescription>
        </DialogHeader>
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            inputMode="search"
            placeholder="Name or phone number"
            aria-label="Name or phone number"
            className="h-12 w-full rounded-lg border border-neutral-200 bg-white pl-9 pr-3 text-[16px] text-neutral-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
          />
        </label>
        <ul className="-mx-1 grid max-h-[50vh] gap-0.5 overflow-y-auto" aria-live="polite">
          {results.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => onPick(r)}
                className="flex min-h-12 w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-neutral-50 dark:hover:bg-white/[0.04]"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">{r.full_name}</span>
                  <span className="block truncate font-mono text-xs text-neutral-500 dark:text-neutral-400">{r.phone}</span>
                </span>
                <OutcomeBadge outcome={r.attendance_confirmation ?? 'unconfirmed'} />
              </button>
            </li>
          ))}
          {q.length >= 2 && !searching && results.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-neutral-500 dark:text-neutral-400">No one in this camp&apos;s list matches.</li>
          ) : null}
          {searching ? <li className="px-3 py-4 text-center text-sm text-neutral-500 dark:text-neutral-400">Searching…</li> : null}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
