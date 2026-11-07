/**
 * One-tap feedback after a call: each saves an outcome and a note together, so a caller on a phone
 * records "Didn't answer" or "Texted on WhatsApp" with a single tap. Shown with the main outcomes
 * (Coming / Not sure / Not coming) on the call card and in the after-call prompt.
 */
import type { CallOutcome } from '@/lib/camp/call-campaign'

export type CallFeedback = {
  id: string
  label: string
  outcome: Exclude<CallOutcome, 'unconfirmed'>
  note: string
  /** Also offer to save a new number (the one called was wrong). */
  asksForNumber?: boolean
}

export const CALL_FEEDBACK: CallFeedback[] = [
  { id: 'no-answer', label: "Didn't answer", outcome: 'unreachable', note: "Didn't answer" },
  { id: 'not-reachable', label: 'Not reachable', outcome: 'unreachable', note: 'Not reachable (switched off or no network)' },
  { id: 'texted', label: 'Texted on WhatsApp', outcome: 'maybe', note: 'Texted on WhatsApp' },
  { id: 'awaiting', label: 'Awaiting WhatsApp reply', outcome: 'maybe', note: 'Awaiting reply on WhatsApp' },
  { id: 'call-back', label: 'Call back later', outcome: 'maybe', note: 'Asked to be called back later' },
  { id: 'wrong-number', label: 'Wrong number', outcome: 'unreachable', note: 'Wrong number', asksForNumber: true },
]

/** The note to save: the preset, plus anything the caller typed. */
export function feedbackNote(feedback: Pick<CallFeedback, 'note'>, typed?: string | null): string {
  const extra = typed?.trim()
  return extra ? `${feedback.note}. ${extra}` : feedback.note
}
