import type { OutreachStatus } from '@/lib/outreach/types'

/** Choices on the outreach form, and labels for statuses and outcomes. Pure. */

export const OUTREACH_LEVELS = ['100', '200', '300', '400', 'Graduate', 'Other'] as const

export const MINISTRY_INTERESTS = [
  'Singing / choir',
  'Playing an instrument',
  'Ushering',
  'Media & tech',
  'Prayer',
  'Evangelism',
  'Drama',
  'Teaching children',
  'Hospitality',
  'Other',
] as const

/** Halls and hostels at the University of Ghana, Legon (suggestions only; any text is fine). */
export const UG_HALLS = [
  'Legon Hall',
  'Commonwealth Hall',
  'Akuafo Hall',
  'Mensah Sarbah Hall',
  'Volta Hall',
  'Jean Nelson Aka Hall',
  'Elizabeth Frances Sey Hall',
  'Hilla Limann Hall',
  'Alexander Kwapong Hall',
  'International Students Hostel',
  'Jubilee Hall',
  'Pentagon Hostel',
  'Bani Hostel',
  'Evandy Hostel',
  'TF Hostel',
] as const

/** Hall suggestions for a campus, by short code. */
export function hallSuggestions(shortCode: string | null | undefined): readonly string[] {
  return (shortCode ?? '').trim().toUpperCase() === 'UG' ? UG_HALLS : []
}

export const OUTREACH_STATUS_LABELS: Record<OutreachStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  bible_study: 'Bible study',
  joined: 'Joined',
  not_interested: 'Not interested',
}

export const OUTREACH_STATUS_TONES: Record<OutreachStatus, 'brand' | 'secondary' | 'success' | 'warning' | 'danger'> = {
  new: 'brand',
  contacted: 'secondary',
  bible_study: 'warning',
  joined: 'success',
  not_interested: 'danger',
}

export const OUTREACH_OUTCOMES = ['reached', 'no_answer', 'wants_bible_study', 'not_interested', 'joined'] as const
export type OutreachOutcome = (typeof OUTREACH_OUTCOMES)[number]

export const OUTREACH_OUTCOME_LABELS: Record<OutreachOutcome, string> = {
  reached: 'Reached',
  no_answer: 'No answer',
  wants_bible_study: 'Wants Bible study',
  not_interested: 'Not interested',
  joined: 'Joined fellowship',
}

export function isOutreachOutcome(value: unknown): value is OutreachOutcome {
  return typeof value === 'string' && (OUTREACH_OUTCOMES as readonly string[]).includes(value)
}
