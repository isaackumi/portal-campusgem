'use client'

import { useState } from 'react'
import { Check, Copy, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  buildCampDailySummaryText,
  buildCampDailySummaryWhatsAppUrl,
  type CampDailySummaryInput,
} from '@/lib/camp/daily-summary'
import { copyToClipboard } from '@/lib/utils'

type Props = {
  input: CampDailySummaryInput
  /** compact = icon+label buttons only; card = preview + actions */
  variant?: 'compact' | 'card'
  className?: string
}

export function CampDailySummaryShare({ input, variant = 'compact', className }: Props) {
  const [copied, setCopied] = useState(false)
  const text = buildCampDailySummaryText(input)
  const whatsappHref = buildCampDailySummaryWhatsAppUrl(input)

  const handleCopy = async () => {
    try {
      await copyToClipboard(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      setCopied(false)
    }
  }

  const actions = (
    <div className={`flex flex-wrap gap-2 ${className ?? ''}`}>
      <Button type="button" variant="outline" size="sm" onClick={() => void handleCopy()} className="shadow-sm">
        {copied ? <Check className="mr-1.5 h-4 w-4 text-emerald-600" /> : <Copy className="mr-1.5 h-4 w-4" />}
        {copied ? 'Copied' : 'Copy daily summary'}
      </Button>
      <Button type="button" variant="outline" size="sm" asChild className="shadow-sm">
        <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
          <MessageCircle className="mr-1.5 h-4 w-4 text-emerald-600" />
          Share on WhatsApp
        </a>
      </Button>
    </div>
  )

  if (variant === 'compact') return actions

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Daily summary for WhatsApp</p>
          <p className="text-xs text-slate-500">Copy or share today’s new / returning registration counts</p>
        </div>
        {actions}
      </div>
      <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-700">
        {text}
      </pre>
    </div>
  )
}
