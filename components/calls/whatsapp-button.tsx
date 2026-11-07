'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MessageCircle, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { whatsAppChatHref } from '@/lib/contact-links'
import { cn } from '@/lib/utils'
import type { TemplateAudience } from '@/lib/calls/templates'
import { useCallTemplates, useFillTemplate } from './use-call-templates'

/**
 * WhatsApp with a ready message: tap, pick one of the templates (each shown filled in for this
 * person), and WhatsApp opens with it typed, ready to change or send. `onSent` lets the call card
 * offer "Texted on WhatsApp" straight after.
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
  const [open, setOpen] = useState(false)
  const { templates, canEdit } = useCallTemplates(audience)
  const fill = useFillTemplate()
  const number = person.whatsapp || person.phone
  if (!number) return null

  function openChat(text?: string) {
    const href = whatsAppChatHref(number, text)
    if (href) window.open(href, '_blank', 'noopener,noreferrer')
    setOpen(false)
    onSent?.()
  }

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
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Message {person.full_name.split(/\s+/)[0]} on WhatsApp</DialogTitle>
            <DialogDescription>Pick a message. WhatsApp opens with it typed, so you can change it before sending.</DialogDescription>
          </DialogHeader>
          <ul className="-mx-1 grid gap-2">
            {templates.map((t) => {
              const text = fill(t, person)
              return (
                <li key={t.key}>
                  <button
                    type="button"
                    onClick={() => openChat(text)}
                    className="w-full rounded-xl border border-neutral-200 bg-white p-3 text-left transition-colors hover:border-brand-300 hover:bg-brand-50/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 dark:border-neutral-700 dark:bg-neutral-800/60 dark:hover:border-brand-700 dark:hover:bg-brand-950/30"
                  >
                    <span className="block text-sm font-semibold text-neutral-900 dark:text-neutral-50">{t.name}</span>
                    <span className="mt-1 line-clamp-3 block text-[13px] leading-snug text-neutral-600 dark:text-neutral-300">{text}</span>
                  </button>
                </li>
              )
            })}
          </ul>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button type="button" variant="ghost" onClick={() => openChat()}>
              Open chat without a message
            </Button>
            {canEdit ? (
              <Link href="/admin/camp-meeting/calls/templates" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline dark:text-brand-400">
                <Pencil className="h-3.5 w-3.5" aria-hidden />
                Edit messages
              </Link>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
