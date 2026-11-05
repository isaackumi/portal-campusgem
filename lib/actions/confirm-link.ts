'use server'

/**
 * Public tap-to-confirm attendance (`/c/<token>`). No sign-in: the token in the link
 * is the credential, so this entry point runs as the system and reveals nothing beyond
 * the registrant's first name and the camp.
 */
import { revalidatePath } from 'next/cache'
import { asSystem } from '@/lib/auth/action-guard'
import {
  SELF_REPORTED_BY,
  firstNameOf,
  isConfirmTokenFormat,
  isSelfReportOutcome,
  type SelfReportOutcome,
} from '@/lib/camp/confirm-link'

export type ConfirmLinkView = {
  firstName: string
  camp: { year: number; theme: string; start_date: string; end_date: string; venue: string | null }
  /** Their own earlier answer through the link, if any. */
  answer: SelfReportOutcome | null
  checkedIn: boolean
  /** Camp is over: answers are closed. */
  closed: boolean
}

function campEnded(endDate: string, now = new Date()): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(endDate)
  if (!m) return false
  const endOfDay = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + 1)
  return now.getTime() >= endOfDay
}

async function loadContext(token: string) {
  if (!isConfirmTokenFormat(token)) return null
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) return null
  const { fetchConfirmLinkContextFromConvex } = await import('@/lib/convex/camp-bridge')
  return fetchConfirmLinkContextFromConvex(token)
}

export async function getConfirmLinkViewAction(token: string): Promise<ConfirmLinkView | null> {
  return asSystem(async () => {
    try {
      const ctx = await loadContext(token)
      if (!ctx) return null
      return {
        firstName: firstNameOf(ctx),
        camp: ctx.camp,
        answer: isSelfReportOutcome(ctx.self_answer) ? ctx.self_answer : null,
        checkedIn: ctx.checked_in,
        closed: campEnded(ctx.camp.end_date),
      }
    } catch (error) {
      console.error('[confirm-link] lookup failed', error)
      return null
    }
  })
}

export async function submitConfirmLinkAction(input: {
  token: string
  outcome: SelfReportOutcome
  note?: string
}): Promise<{ ok: boolean; error: string | null }> {
  return asSystem(async () => {
    try {
      if (!isSelfReportOutcome(input.outcome)) return { ok: false, error: 'Choose an answer.' }
      const ctx = await loadContext(input.token)
      if (!ctx) return { ok: false, error: 'This link is not valid.' }
      if (campEnded(ctx.camp.end_date)) return { ok: false, error: 'Camp has ended, so answers are closed.' }
      if (ctx.checked_in) return { ok: true, error: null }

      const { recordCallOutcomeInConvex } = await import('@/lib/convex/camp-bridge')
      const note = input.note?.replace(/\s+/g, ' ').trim().slice(0, 300) || undefined
      await recordCallOutcomeInConvex({
        registration_id: ctx.registration_id,
        outcome: input.outcome,
        note,
        performed_by: SELF_REPORTED_BY,
        via_link: true,
      })
      try {
        revalidatePath('/admin/camp-meeting/calls')
      } catch {
        // not critical
      }
      return { ok: true, error: null }
    } catch (error) {
      console.error('[confirm-link] submit failed', error)
      return { ok: false, error: 'Something went wrong. Please try again.' }
    }
  })
}
