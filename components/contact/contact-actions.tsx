'use client'

import { Phone, Mail, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { mailtoHref, telHref, whatsAppChatHref } from '@/lib/contact-links'
import { WhatsappLogo } from '@/components/icons/whatsapp-logo'

type ContactActionsProps = {
  phone?: string | null
  email?: string | null
  className?: string
  size?: 'sm' | 'default'
  /** Show icon-only buttons on narrow screens */
  compact?: boolean
}

export function ContactActions({
  phone,
  email,
  className,
  size = 'sm',
  compact = false,
}: ContactActionsProps) {
  const tel = telHref(phone)
  const wa = whatsAppChatHref(phone)
  const mail = mailtoHref(email)

  if (!tel && !wa && !mail) return null

  const labelClass = compact ? 'sr-only sm:not-sr-only' : undefined

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {tel ? (
        <Button variant="outline" size={size} className="min-h-9 gap-1.5" asChild>
          <a href={tel}>
            <Phone className="h-3.5 w-3.5 shrink-0" />
            <span className={labelClass}>Call</span>
          </a>
        </Button>
      ) : null}
      {wa ? (
        <Button
          variant="outline"
          size={size}
          className="min-h-9 gap-1.5 border-emerald-200 text-emerald-800 hover:bg-emerald-50"
          asChild
        >
          <a href={wa} target="_blank" rel="noopener noreferrer">
            <WhatsappLogo className="h-3.5 w-3.5 shrink-0" />
            <span className={labelClass}>WhatsApp</span>
          </a>
        </Button>
      ) : null}
      {mail ? (
        <Button variant="outline" size={size} className="min-h-9 gap-1.5" asChild>
          <a href={mail}>
            <Mail className="h-3.5 w-3.5 shrink-0" />
            <span className={labelClass}>Email</span>
          </a>
        </Button>
      ) : null}
      {!wa && phone ? (
        <span className="text-xs text-muted-foreground sm:hidden">
          <MessageCircle className="mr-1 inline h-3 w-3" />
          {phone}
        </span>
      ) : null}
    </div>
  )
}
