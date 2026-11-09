/**
 * Campus outreach contact: how a call / WhatsApp outcome moves the status. Pure; the Convex
 * mutation applies it to the contact as it is *now* (never a status worked out from a stale copy),
 * and lib/outreach/logic.ts re-exports it for the app.
 *
 *   new ──reached──▶ contacted        any ──wants Bible study──▶ bible_study
 *   any ──not interested──▶ not_interested     any ──joined──▶ joined
 *
 * `joined` is sticky: an outcome never moves someone out of it (only an explicit status change
 * by a person, setStatusWithSecret, can).
 */
export type OutreachContactStatus = 'new' | 'contacted' | 'bible_study' | 'joined' | 'not_interested'
export type OutreachContactOutcome = 'reached' | 'no_answer' | 'wants_bible_study' | 'not_interested' | 'joined'

/** The status after an outcome, or undefined when the outcome leaves the status as it is. */
export function statusAfterOutcome(current: OutreachContactStatus, outcome: OutreachContactOutcome): OutreachContactStatus | undefined {
  if (current === 'joined' && outcome !== 'joined') return undefined
  switch (outcome) {
    case 'reached':
      return current === 'new' ? 'contacted' : undefined
    case 'no_answer':
      return undefined
    case 'wants_bible_study':
      return current === 'bible_study' ? undefined : 'bible_study'
    case 'not_interested':
      return current === 'not_interested' ? undefined : 'not_interested'
    case 'joined':
      return current === 'joined' ? undefined : 'joined'
  }
}

/** Closed contacts: nothing more to follow up. */
export function isClosedOutreachStatus(status: OutreachContactStatus): boolean {
  return status === 'joined' || status === 'not_interested'
}

export function isOutreachOutcome(value: unknown): value is OutreachContactOutcome {
  return value === 'reached' || value === 'no_answer' || value === 'wants_bible_study' || value === 'not_interested' || value === 'joined'
}
