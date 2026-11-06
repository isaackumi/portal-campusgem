'use client'

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { smsSegmentInfo } from '@/lib/comms/sms-segments'
import { cn } from '@/lib/utils'

/**
 * Every SMS send in the app goes through this check first: who it goes to, the exact text
 * (per person when it is personalised), and how many SMS it costs. Nothing is sent until
 * the person presses the send button here.
 *
 *   const preview = useSmsPreview()
 *   if (!(await preview({ title: 'Text UEW', message, recipients }))) return
 *   await sendAction(...)
 */
export type SmsPreviewRecipient = {
  name?: string | null
  phone?: string | null
  /** The exact text this person gets, when it differs per person. */
  message?: string | null
  /** Short note shown next to the name, e.g. "birthday in 3 days". */
  note?: string | null
}

export type SmsPreviewRequest = {
  /** What is being sent, e.g. "Birthday texts". */
  title?: string
  /** The shared message (or template) when recipients don't carry their own text. */
  message?: string | null
  recipients?: SmsPreviewRecipient[]
  /** When the list is built on the server, how many people it will go to. */
  recipientCount?: number
  /** Plain description of who it goes to, e.g. "Everyone in UEW with a phone". */
  audience?: string
  /** Things to double-check, shown in amber above the buttons. */
  warnings?: string[]
  sendLabel?: string
}

type Pending = SmsPreviewRequest & { resolve: (ok: boolean) => void }

const SmsPreviewContext = createContext<((req: SmsPreviewRequest) => Promise<boolean>) | null>(null)

/** Fill the common placeholders the way the senders do, for a realistic preview. */
export function fillSmsPlaceholders(template: string, vars: { name?: string | null; firstName?: string | null }): string {
  const full = vars.name?.trim() || ''
  const first = vars.firstName?.trim() || full.split(/\s+/)[0] || ''
  if (!full && !first) return template
  return template
    .replace(/\{\{\s*(full_?name|fullName)\s*\}\}/gi, full || first)
    .replace(/\{\{\s*(first_?name|firstName)\s*\}\}/gi, first)
    .replace(/\{\{\s*name\s*\}\}/gi, first || full)
}

const PLACEHOLDER = /\{\{\s*[a-zA-Z_]+\s*\}\}/

export function SmsPreviewProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null)
  const [selected, setSelected] = useState(0)
  const pendingRef = useRef<Pending | null>(null)

  const preview = useCallback((req: SmsPreviewRequest) => {
    // A second request while one is open cancels the first.
    pendingRef.current?.resolve(false)
    return new Promise<boolean>((resolve) => {
      const next = { ...req, resolve }
      pendingRef.current = next
      setSelected(0)
      setPending(next)
    })
  }, [])

  const close = useCallback((ok: boolean) => {
    pendingRef.current?.resolve(ok)
    pendingRef.current = null
    setPending(null)
  }, [])

  const view = useMemo(() => {
    if (!pending) return null
    const recipients = (pending.recipients ?? []).filter((r) => r.name || r.phone || r.message)
    const count = pending.recipientCount ?? recipients.length
    const shared = pending.message?.trim() ?? ''
    const textFor = (r?: SmsPreviewRecipient) => (r?.message?.trim() ? r.message.trim() : shared)
    const current = recipients[selected]
    const text = textFor(current)
    const perPerson = recipients.length > 0 && recipients.some((r) => r.message?.trim())
    const totalSms = recipients.length
      ? recipients.reduce((n, r) => n + smsSegmentInfo(textFor(r)).segments, 0) +
        Math.max(0, count - recipients.length) * smsSegmentInfo(shared).segments
      : count * smsSegmentInfo(shared).segments
    const info = smsSegmentInfo(text)
    return { recipients, count, text, perPerson, totalSms, info, current, hasPlaceholders: PLACEHOLDER.test(text) }
  }, [pending, selected])

  return (
    <SmsPreviewContext.Provider value={preview}>
      {children}
      <Dialog open={Boolean(pending)} onOpenChange={(open) => !open && close(false)}>
        {pending && view ? (
          <DialogContent className="max-h-[92dvh] max-w-lg overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Check before sending</DialogTitle>
              <DialogDescription>
                {pending.title ? `${pending.title}. ` : ''}
                Nothing is sent until you press send.
              </DialogDescription>
            </DialogHeader>

            <dl className="grid grid-cols-3 gap-2 text-sm">
              <div className="rounded-lg bg-neutral-100 px-3 py-2 dark:bg-white/[0.06]">
                <dt className="text-xs text-neutral-500 dark:text-neutral-400">People</dt>
                <dd className="font-semibold tabular-nums text-neutral-900 dark:text-white">{view.count}</dd>
              </div>
              <div className="rounded-lg bg-neutral-100 px-3 py-2 dark:bg-white/[0.06]">
                <dt className="text-xs text-neutral-500 dark:text-neutral-400">SMS each</dt>
                <dd className="font-semibold tabular-nums text-neutral-900 dark:text-white">{view.info.segments || 0}</dd>
              </div>
              <div className="rounded-lg bg-neutral-100 px-3 py-2 dark:bg-white/[0.06]">
                <dt className="text-xs text-neutral-500 dark:text-neutral-400">SMS in total</dt>
                <dd className="font-semibold tabular-nums text-neutral-900 dark:text-white">{view.totalSms}</dd>
              </div>
            </dl>

            {pending.audience ? (
              <p className="text-sm text-neutral-700 dark:text-neutral-300">
                <span className="text-neutral-500 dark:text-neutral-400">To: </span>
                {pending.audience}
              </p>
            ) : null}

            <div>
              <p className="mb-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                {view.perPerson && view.current?.name ? `What ${view.current.name} will get` : 'The message'}
              </p>
              <div className="whitespace-pre-wrap break-words rounded-xl border border-neutral-200 bg-white p-3 text-[15px] leading-relaxed text-neutral-900 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-100">
                {view.text || <span className="text-neutral-400">(empty message)</span>}
              </div>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                {view.info.length} characters · {view.info.encoding === 'GSM-7' ? 'standard text' : 'contains emoji or special characters (shorter SMS)'}
                {view.hasPlaceholders ? ' · words in {{ }} are filled in for each person' : ''}
              </p>
            </div>

            {view.recipients.length > 0 ? (
              <div>
                <p className="mb-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                  {view.perPerson ? 'Tap a name to see their message' : 'Going to'}
                </p>
                <ul className="max-h-44 divide-y divide-neutral-100 overflow-y-auto rounded-xl border border-neutral-200 dark:divide-white/[0.06] dark:border-white/10">
                  {view.recipients.map((r, i) => (
                    <li key={`${r.phone ?? ''}-${i}`}>
                      <button
                        type="button"
                        disabled={!view.perPerson}
                        onClick={() => setSelected(i)}
                        className={cn(
                          'flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm',
                          view.perPerson && 'hover:bg-neutral-50 dark:hover:bg-white/[0.04]',
                          view.perPerson && i === selected && 'bg-neutral-100 dark:bg-white/[0.06]'
                        )}
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-neutral-900 dark:text-neutral-100">{r.name || 'No name'}</span>
                          {r.note ? <span className="block truncate text-xs text-neutral-500 dark:text-neutral-400">{r.note}</span> : null}
                        </span>
                        <span className="shrink-0 font-mono text-xs text-neutral-500 dark:text-neutral-400">{r.phone}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {pending.warnings?.length ? (
              <ul className="space-y-1.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200">
                {pending.warnings.map((w) => (
                  <li key={w} className="flex gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    {w}
                  </li>
                ))}
              </ul>
            ) : null}

            <DialogFooter className="gap-2 sm:gap-2">
              {/* Focus starts on "Go back" so Enter never sends by accident. */}
              <Button type="button" variant="outline" className="h-11" autoFocus onClick={() => close(false)}>
                Go back
              </Button>
              <Button type="button" className="h-11" disabled={view.count === 0 || !view.text} onClick={() => close(true)}>
                {pending.sendLabel ?? `Send to ${view.count} ${view.count === 1 ? 'person' : 'people'}`}
              </Button>
            </DialogFooter>
          </DialogContent>
        ) : null}
      </Dialog>
    </SmsPreviewContext.Provider>
  )
}

/** Ask for a review of an SMS before sending. Resolves true only when the person confirms. */
export function useSmsPreview(): (req: SmsPreviewRequest) => Promise<boolean> {
  const ctx = useContext(SmsPreviewContext)
  if (!ctx) throw new Error('useSmsPreview must be used inside SmsPreviewProvider')
  return ctx
}
