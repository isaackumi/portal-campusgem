'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, MessageCircle, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { whatsAppChatHref } from '@/lib/contact-links'
import { cn } from '@/lib/utils'
import { deleteMyMessageAction } from '@/lib/actions/call-center'
import { TEMPLATE_LIMITS, TEMPLATE_VARIABLES, type CallTemplate, type TemplateAudience } from '@/lib/calls/templates'
import { useToast } from '@/hooks/use-toast'
import { SaveMyMessage } from './save-my-message'
import { useCallTemplates, useFillTemplate } from './use-call-templates'

/** The details a caller is most likely to add to a message. */
const QUICK_DETAILS = TEMPLATE_VARIABLES.filter((v) => ['firstName', 'callerName', 'campYear', 'campDates', 'venue'].includes(v.key))

/**
 * WhatsApp with a ready message: tap, pick one of the messages (each shown filled in for this
 * person), and WhatsApp opens with it typed. "Edit" or "Write your own" lets the caller change the
 * words first and keep them as their own message for next time. `onSent` lets the call card offer
 * "Texted on WhatsApp" straight after.
 */
export function WhatsAppButton({
  person,
  audience = 'camp',
  className,
  size = 'default',
  onSent,
}: {
  person: { full_name: string; first_name?: string | null; phone?: string | null; whatsapp?: string | null }
  audience?: TemplateAudience
  className?: string
  size?: 'default' | 'compact'
  onSent?: () => void
}) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<string | null>(null)
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const { templates, canEdit } = useCallTemplates(audience, 'whatsapp')
  const fill = useFillTemplate()
  const number = person.whatsapp || person.phone
  if (!number) return null

  function openChat(text?: string) {
    const href = whatsAppChatHref(number, text)
    if (href) window.open(href, '_blank', 'noopener,noreferrer')
    setOpen(false)
    setDraft(null)
    onSent?.()
  }

  function insert(key: string) {
    if (draft === null) return
    const el = bodyRef.current
    const token = `{{${key}}}`
    const start = el?.selectionStart ?? draft.length
    const end = el?.selectionEnd ?? start
    setDraft(draft.slice(0, start) + token + draft.slice(end))
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(start + token.length, start + token.length)
    })
  }

  async function remove(t: CallTemplate) {
    if (!window.confirm(`Delete “${t.name}”?`)) return
    const res = await deleteMyMessageAction({ key: t.key })
    if (res.error) toast({ variant: 'destructive', title: 'Not deleted', description: res.error })
    else void queryClient.invalidateQueries({ queryKey: ['call-templates'] })
  }

  const firstName = person.full_name.split(/\s+/)[0]

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        className={cn(size === 'compact' ? 'h-9' : 'h-12 text-[15px] sm:h-10 sm:text-sm', className)}
      >
        <MessageCircle className="mr-2 h-4 w-4" aria-hidden />
        WhatsApp
      </Button>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v)
          if (!v) setDraft(null)
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          {draft === null ? (
            <>
              <DialogHeader>
                <DialogTitle>Message {firstName} on WhatsApp</DialogTitle>
                <DialogDescription>Tap a message to open WhatsApp with it typed. Use Edit to change the words first.</DialogDescription>
              </DialogHeader>
              <ul className="-mx-1 grid gap-2">
                {templates.map((t) => {
                  const text = fill(t, person)
                  return (
                    <li key={t.key} className="rounded-xl border border-neutral-200 bg-white transition-colors hover:border-brand-300 dark:border-neutral-700 dark:bg-neutral-800/60 dark:hover:border-brand-700">
                      <button
                        type="button"
                        onClick={() => openChat(text)}
                        className="w-full rounded-t-xl p-3 pb-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
                      >
                        <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                          {t.name}
                          {t.mine ? <Badge variant="brand">Yours</Badge> : null}
                        </span>
                        <span className="mt-1 block whitespace-pre-line break-words text-[13px] leading-snug text-neutral-600 dark:text-neutral-300">{text}</span>
                      </button>
                      <div className="flex justify-end gap-1 px-2 pb-1.5">
                        {t.mine ? (
                          <Button type="button" size="sm" variant="ghost" className="h-9 text-neutral-500 dark:text-neutral-400" onClick={() => void remove(t)} aria-label={`Delete ${t.name}`}>
                            <Trash2 className="h-3.5 w-3.5" aria-hidden />
                          </Button>
                        ) : null}
                        <Button type="button" size="sm" variant="ghost" className="h-9" onClick={() => setDraft(t.body)}>
                          <Pencil className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                          Edit
                        </Button>
                      </div>
                    </li>
                  )
                })}
              </ul>
              <Button type="button" variant="outline" className="h-11" onClick={() => setDraft('Hi {{firstName}}, ')}>
                <Plus className="mr-2 h-4 w-4" aria-hidden />
                Write your own
              </Button>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Button type="button" variant="ghost" onClick={() => openChat()}>
                  Open chat without a message
                </Button>
                {canEdit ? (
                  <Link href="/admin/camp-meeting/calls/templates" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline dark:text-brand-400">
                    <Pencil className="h-3.5 w-3.5" aria-hidden />
                    Team messages
                  </Link>
                ) : null}
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <button type="button" onClick={() => setDraft(null)} className="-ml-1 inline-flex h-9 w-fit items-center gap-1 px-1 text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white">
                  <ArrowLeft className="h-4 w-4" aria-hidden />
                  All messages
                </button>
                <DialogTitle>Your message to {firstName}</DialogTitle>
                <DialogDescription>Tap a detail to add it; it fills in for whoever you send it to.</DialogDescription>
              </DialogHeader>
              <textarea
                ref={bodyRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={TEMPLATE_LIMITS.body}
                rows={5}
                aria-label="Message"
                className="w-full resize-y rounded-lg border border-neutral-200 bg-white p-3 text-[15px] leading-relaxed text-neutral-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100"
              />
              <div className="flex flex-wrap gap-1.5" aria-label="Details you can add">
                {QUICK_DETAILS.map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => insert(v.key)}
                    className="h-8 rounded-full border border-neutral-200 bg-neutral-50 px-3 text-[12px] font-medium text-neutral-700 hover:border-brand-300 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                  >
                    + {v.label}
                  </button>
                ))}
              </div>
              <div className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-950/30">
                <p className="app-overline">What {firstName} gets</p>
                <p className="mt-1 whitespace-pre-line break-words text-[14px] leading-relaxed text-neutral-800 dark:text-neutral-100">{fill({ body: draft }, person) || '…'}</p>
              </div>
              <SaveMyMessage body={draft} channel="any" canShare={canEdit} />
              <Button type="button" className="h-12 text-base" onClick={() => openChat(fill({ body: draft }, person))} disabled={!draft.trim()}>
                <MessageCircle className="mr-2 h-5 w-5" aria-hidden />
                Open in WhatsApp
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
