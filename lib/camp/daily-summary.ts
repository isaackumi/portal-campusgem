import type { LiveRegistrationPulse } from '@/lib/camp/analytics'
import { whatsAppShareHref } from '@/lib/contact-links'

export type CampDailySummaryInput = {
  year: number
  theme?: string | null
  total: number
  newRegistrants: number
  returning: number
  pulse: LiveRegistrationPulse
  now?: Date
}

/** Human date for WhatsApp / clipboard (e.g. Wednesday, 9 September 2026). */
export function formatCampSummaryDate(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

/** Plain-text daily registration blurb for copy / WhatsApp. */
export function buildCampDailySummaryText(input: CampDailySummaryInput): string {
  const now = input.now ?? new Date()
  const title = input.theme?.trim()
    ? `Camp Meeting ${input.year} — ${input.theme.trim()}`
    : `Camp Meeting ${input.year}`

  const lines = [
    `*${title}*`,
    `Daily registration update · ${formatCampSummaryDate(now)}`,
    '',
    `*Today:* ${input.pulse.today} registration${input.pulse.today === 1 ? '' : 's'}`,
    `• New (first-timers): ${input.pulse.todayNew}`,
    `• Returning: ${input.pulse.todayReturning}`,
    '',
    `*Season total:* ${input.total}`,
    `• New: ${input.newRegistrants}`,
    `• Returning: ${input.returning}`,
    '',
    `Last 7 days: ${input.pulse.last7Days} (new ${input.pulse.last7New} · returning ${input.pulse.last7Returning})`,
    `Avg / day: ${input.pulse.avgPerDay}`,
  ]

  if (input.pulse.peakDay && input.pulse.peakDayCount > 0) {
    lines.push(`Peak day so far: ${input.pulse.peakDayCount} on ${input.pulse.peakDay}`)
  }

  return lines.join('\n')
}

export function buildCampDailySummaryWhatsAppUrl(input: CampDailySummaryInput): string {
  return whatsAppShareHref(buildCampDailySummaryText(input))
}
