'use client'

import { useEffect, useState } from 'react'
import { Check, Copy, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  buildCampDailySummaryText,
  buildCampDailySummaryWhatsAppUrl,
  type CampDailySummaryInput,
} from '@/lib/camp/daily-summary'
import { getPublishedCampFormForYear } from '@/lib/actions/forms'
import { copyToClipboard } from '@/lib/utils'

type Props = {
  input: Omit<CampDailySummaryInput, 'registrationUrl'> & {
    registrationUrl?: string | null
  }
  /** When set and registrationUrl is missing, resolve the published form link. */
  yearId?: string
  /** compact = icon+label buttons only; card = preview + actions */
  variant?: 'compact' | 'card'
  className?: string
}

function absoluteRegistrationUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl
  if (typeof window === 'undefined') return pathOrUrl
  return `${window.location.origin}${pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`}`
}

export function CampDailySummaryShare({ input, yearId, variant = 'compact', className }: Props) {
  const [copied, setCopied] = useState(false)
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(
    input.registrationUrl ? absoluteRegistrationUrl(input.registrationUrl) : null
  )

  useEffect(() => {
    if (input.registrationUrl) {
      setResolvedUrl(absoluteRegistrationUrl(input.registrationUrl))
      return
    }
    if (!yearId) {
      setResolvedUrl(typeof window !== 'undefined' ? `${window.location.origin}/camp-meeting/register` : null)
      return
    }

    let cancelled = false
    void getPublishedCampFormForYear(yearId).then(({ data }) => {
      if (cancelled) return
      const path = data?.slug ? `/f/${data.slug}` : '/camp-meeting/register'
      setResolvedUrl(absoluteRegistrationUrl(path))
    })
    return () => {
      cancelled = true
    }
  }, [input.registrationUrl, yearId])

  const summaryInput: CampDailySummaryInput = {
    ...input,
    registrationUrl: resolvedUrl,
  }
  const text = buildCampDailySummaryText(summaryInput)
  const whatsappHref = buildCampDailySummaryWhatsAppUrl(summaryInput)

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
          <p className="text-xs text-slate-500">
            Includes today’s new / returning counts plus a registration link
          </p>
        </div>
        {actions}
      </div>
      <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-700">
        {text}
      </pre>
    </div>
  )
}
