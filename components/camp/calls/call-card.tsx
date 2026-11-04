'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MapPin, MessageCircle, Phone, StickyNote } from 'lucide-react'
import type { CampRegistration } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { PersonAvatar } from '@/components/ui/person'
import { cn } from '@/lib/utils'
import { CALL_OUTCOMES, effectiveOutcome, type CallOutcome } from '@/lib/camp/call-campaign'
import { OUTCOME_ICON, OutcomeBadge } from '@/components/camp/call-outcome'
import { PhoneLink } from '@/components/contact/phone-link'

const OUTCOME_BUTTON: Record<Exclude<CallOutcome, 'unconfirmed'>, string> = {
  confirmed:
    'border-emerald-200 text-emerald-700 hover:bg-emerald-50 data-[active=true]:border-emerald-600 data-[active=true]:bg-emerald-600 data-[active=true]:text-white dark:border-emerald-900 dark:text-emerald-300 dark:hover:bg-emerald-950/50 dark:data-[active=true]:border-emerald-500 dark:data-[active=true]:bg-emerald-600 dark:data-[active=true]:text-white',
  maybe:
    'border-amber-200 text-amber-800 hover:bg-amber-50 data-[active=true]:border-amber-500 data-[active=true]:bg-amber-400 data-[active=true]:text-neutral-950 dark:border-amber-900 dark:text-amber-300 dark:hover:bg-amber-950/50 dark:data-[active=true]:border-amber-400 dark:data-[active=true]:bg-amber-400 dark:data-[active=true]:text-neutral-950',
  unreachable:
    'border-neutral-200 text-neutral-700 hover:bg-neutral-50 data-[active=true]:border-neutral-600 data-[active=true]:bg-neutral-600 data-[active=true]:text-white dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-700/60 dark:data-[active=true]:border-neutral-400 dark:data-[active=true]:bg-neutral-500 dark:data-[active=true]:text-white',
  declined:
    'border-red-200 text-red-700 hover:bg-red-50 data-[active=true]:border-red-600 data-[active=true]:bg-red-600 data-[active=true]:text-white dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/50 dark:data-[active=true]:border-red-500 dark:data-[active=true]:bg-red-600 dark:data-[active=true]:text-white',
}

function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`
}

function whatsappHref(phone: string): string {
  let digits = phone.replace(/\D/g, '')
  if (digits.startsWith('0')) digits = `233${digits.slice(1)}`
  return `https://wa.me/${digits}`
}

function relative(iso?: string): string | null {
  if (!iso) return null
  const ms = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(ms)) return null
  const mins = Math.round(ms / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.round(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

export function CallCard({
  registration,
  callerName,
  saving,
  onOutcome,
  detailHref,
}: {
  registration: CampRegistration
  callerName?: string | null
  saving: boolean
  onOutcome: (outcome: CallOutcome, note: string) => void
  detailHref?: string
}) {
  const outcome = effectiveOutcome(registration)
  const [noteOpen, setNoteOpen] = useState(false)
  const [note, setNote] = useState('')
  const attempts = registration.call_attempts ?? 0
  const lastCalled = relative(registration.last_called_at)

  return (
    <article
      className={cn(
        'dashboard-panel flex flex-col gap-4 p-4 transition-opacity sm:p-5',
        saving && 'opacity-60'
      )}
      aria-busy={saving}
    >
      <header className="flex items-start gap-3">
        <PersonAvatar name={registration.full_name} seed={registration.id} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {detailHref ? (
              <Link href={detailHref} className="truncate text-[15px] font-semibold text-neutral-900 hover:underline dark:text-neutral-50">
                {registration.full_name}
              </Link>
            ) : (
              <h3 className="truncate text-[15px] font-semibold text-neutral-900 dark:text-neutral-50">{registration.full_name}</h3>
            )}
            <OutcomeBadge outcome={outcome} />
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[13px] text-neutral-500 dark:text-neutral-400">
            <PhoneLink className="text-neutral-700 dark:text-neutral-200" phone={registration.phone} whatsapp={registration.whatsapp} name={registration.full_name} />
            {registration.residence ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" aria-hidden />
                {registration.residence}
              </span>
            ) : null}
            <span>{registration.is_new_registrant ? 'First camp' : 'Returning'}</span>
            {callerName ? <span>Caller: {callerName}</span> : null}
          </p>
          {attempts > 0 || registration.confirmation_note ? (
            <p className="mt-1.5 text-[13px] text-neutral-500 dark:text-neutral-400">
              {attempts > 0 ? `${attempts} call${attempts === 1 ? '' : 's'}${lastCalled ? `, last ${lastCalled}` : ''}` : null}
              {attempts > 0 && registration.confirmation_note ? ' · ' : null}
              {registration.confirmation_note ? (
                <span className="text-neutral-700 dark:text-neutral-300">“{registration.confirmation_note}”</span>
              ) : null}
            </p>
          ) : null}
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {registration.phone ? (
          <>
            <Button asChild size="sm" className="h-11 flex-1 sm:h-8 sm:flex-none">
              <a href={telHref(registration.phone)}>
                <Phone className="mr-1.5 h-4 w-4" aria-hidden />
                Call
              </a>
            </Button>
            <Button asChild size="sm" variant="outline" className="h-11 flex-1 sm:h-8 sm:flex-none">
              <a href={whatsappHref(registration.whatsapp || registration.phone)} target="_blank" rel="noreferrer">
                <MessageCircle className="mr-1.5 h-4 w-4" aria-hidden />
                WhatsApp
              </a>
            </Button>
          </>
        ) : null}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setNoteOpen((v) => !v)}
          aria-expanded={noteOpen}
          className="h-11 w-full sm:h-8 sm:w-auto"
        >
          <StickyNote className="mr-1.5 h-4 w-4" aria-hidden />
          {noteOpen ? 'Hide note' : 'Add note'}
        </Button>
      </div>

      {noteOpen ? (
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          maxLength={500}
          placeholder="e.g. Coming on Friday, needs a lower bunk"
          aria-label={`Note for ${registration.full_name}`}
          className="w-full resize-none rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder:text-neutral-500"
        />
      ) : null}

      <div>
        <p className="app-overline mb-2">After the call</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {CALL_OUTCOMES.filter((o) => o.id !== 'unconfirmed').map((o) => {
            const Icon = OUTCOME_ICON[o.id]
            return (
              <button
                key={o.id}
                type="button"
                disabled={saving}
                data-active={outcome === o.id}
                title={o.description}
                onClick={() => {
                  onOutcome(o.id, note)
                  setNote('')
                  setNoteOpen(false)
                }}
                className={cn(
                  'inline-flex h-11 items-center justify-center gap-1.5 whitespace-nowrap sm:h-10 rounded-lg border bg-transparent px-2 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30 disabled:opacity-50',
                  OUTCOME_BUTTON[o.id as Exclude<CallOutcome, 'unconfirmed'>]
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {o.action}
              </button>
            )
          })}
        </div>
      </div>
    </article>
  )
}
