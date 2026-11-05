'use client'

import { useState } from 'react'
import { Check, Copy, MessageSquare, Phone } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { WhatsappLogo } from '@/components/icons/whatsapp-logo'
import { telHref, whatsAppChatHref } from '@/lib/contact-links'
import { cn } from '@/lib/utils'

function smsHref(phone: string, message?: string | null): string | null {
  const tel = telHref(phone)
  if (!tel) return null
  const sms = tel.replace(/^tel:/, 'sms:')
  // "?&body=" is understood by both iOS and Android messaging apps.
  return message?.trim() ? `${sms}?&body=${encodeURIComponent(message.trim())}` : sms
}

/**
 * A phone number you can act on. Tap it for Call / WhatsApp / Text / Copy.
 * Use wherever a number is shown, so staff can reach people straight from their phone.
 */
export function PhoneLink({
  phone,
  name,
  className,
  mono = true,
  whatsapp,
  message,
}: {
  phone?: string | null
  /** Who the number belongs to, for the menu heading and screen readers. */
  name?: string | null
  className?: string
  mono?: boolean
  /** A separate WhatsApp number, when the person has one. */
  whatsapp?: string | null
  /** Pre-filled text for WhatsApp and SMS (the sender can still edit it). Calls can't carry one. */
  message?: string | null
}) {
  const [copied, setCopied] = useState(false)
  const number = phone?.trim()
  if (!number) return <span className={cn('text-neutral-400 dark:text-neutral-500', className)}>No phone</span>

  const tel = telHref(number)
  const wa = whatsAppChatHref(whatsapp?.trim() || number, message ?? undefined)
  const sms = smsHref(number, message)
  if (!tel) return <span className={cn(mono && 'font-mono', className)}>{number}</span>

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        onClick={(e) => e.stopPropagation()}
        aria-label={`Contact ${name ?? number}`}
        className={cn(
          '-mx-1 inline-flex min-h-[28px] items-center gap-1 rounded-md px-1 text-left underline decoration-neutral-300 decoration-dotted underline-offset-[3px] transition-colors hover:text-brand-600 hover:decoration-brand-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 dark:decoration-neutral-600 dark:hover:text-brand-300',
          mono && 'font-mono',
          className
        )}
      >
        {number}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuLabel className="truncate text-xs font-medium text-neutral-500 dark:text-neutral-400">
          {name ? `${name} · ` : ''}
          <span className="font-mono">{number}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="min-h-11 cursor-pointer gap-3">
          <a href={tel}>
            <Phone className="h-4 w-4 text-brand-600 dark:text-brand-300" aria-hidden />
            Call
          </a>
        </DropdownMenuItem>
        {wa ? (
          <DropdownMenuItem asChild className="min-h-11 cursor-pointer gap-3">
            <a href={wa} target="_blank" rel="noopener noreferrer">
              <WhatsappLogo className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              WhatsApp
            </a>
          </DropdownMenuItem>
        ) : null}
        {sms ? (
          <DropdownMenuItem asChild className="min-h-11 cursor-pointer gap-3">
            <a href={sms}>
              <MessageSquare className="h-4 w-4 text-sky-600 dark:text-sky-400" aria-hidden />
              Text message
            </a>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem
          className="min-h-11 cursor-pointer gap-3"
          onSelect={(e) => {
            e.preventDefault()
            void navigator.clipboard?.writeText(number).then(() => {
              setCopied(true)
              setTimeout(() => setCopied(false), 1500)
            })
          }}
        >
          {copied ? <Check className="h-4 w-4 text-emerald-600" aria-hidden /> : <Copy className="h-4 w-4 text-neutral-500" aria-hidden />}
          {copied ? 'Copied' : 'Copy number'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * One-tap round Call and WhatsApp buttons for list rows and cards (44px targets on touch).
 */
export function QuickContactButtons({
  phone,
  whatsapp,
  name,
  className,
  message,
}: {
  phone?: string | null
  whatsapp?: string | null
  name?: string | null
  className?: string
  /** Pre-filled WhatsApp text (the sender can still edit it). */
  message?: string | null
}) {
  const tel = telHref(phone)
  const wa = whatsAppChatHref(whatsapp?.trim() || phone, message ?? undefined)
  if (!tel && !wa) return null
  const base =
    'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 sm:h-9 sm:w-9'
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)} onClick={(e) => e.stopPropagation()}>
      {tel ? (
        <a
          href={tel}
          aria-label={`Call ${name ?? phone}`}
          title="Call"
          className={cn(base, 'bg-brand-50 text-brand-600 hover:bg-brand-100 dark:bg-brand-400/10 dark:text-brand-300 dark:hover:bg-brand-400/20')}
        >
          <Phone className="h-4 w-4" aria-hidden />
        </a>
      ) : null}
      {wa ? (
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`WhatsApp ${name ?? phone}`}
          title="WhatsApp"
          className={cn(base, 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-400/10 dark:text-emerald-400 dark:hover:bg-emerald-400/20')}
        >
          <WhatsappLogo className="h-4 w-4" />
        </a>
      ) : null}
    </span>
  )
}
