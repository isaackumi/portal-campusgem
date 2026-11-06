'use client'

import { useCallback } from 'react'
import { useAuth } from '@/components/providers'
import { useSmsPreview } from '@/components/comms/sms-preview'
import { previewBirthdaySmsAction, sendBirthdaySmsAction, type BirthdaySmsSendResult } from '@/lib/actions/birthdays'
import type { BirthdayEntry } from '@/lib/birthdays/upcoming-birthdays'
import type { CommsModule } from '@/lib/comms/types'

export type BirthdaySmsOutcome =
  | { status: 'cancelled' }
  | { status: 'error'; error: string }
  | { status: 'sent'; result: BirthdaySmsSendResult }

function whenLabel(days: number, date: string): string {
  if (days === 0) return 'Birthday today'
  if (days === 1) return `Birthday tomorrow (${date})`
  return `Birthday in ${days} days (${date})`
}

/**
 * Birthday texts: fetch the exact message each person will get (the server decides
 * "Happy Birthday" vs "in advance" from their date of birth), show it for review, and
 * only then send.
 */
export function useBirthdaySms() {
  const { user } = useAuth()
  const preview = useSmsPreview()

  return useCallback(
    async (entries: BirthdayEntry[], module: CommsModule, title = 'Birthday texts'): Promise<BirthdaySmsOutcome> => {
      if (!user?.id) return { status: 'error', error: 'Sign in again to send texts.' }
      const planned = await previewBirthdaySmsAction({ entries })
      if (planned.error || !planned.data) return { status: 'error', error: planned.error ?? 'Could not prepare the texts.' }

      const ok = planned.data.filter((r) => r.validPhone)
      const skipped = planned.data.length - ok.length
      if (ok.length === 0) return { status: 'error', error: 'None of these people has a valid mobile number.' }

      const early = ok.filter((r) => r.kind === 'advance').length
      const warnings: string[] = []
      if (early > 0) {
        warnings.push(
          early === ok.length
            ? `${early === 1 ? 'This birthday is' : 'These birthdays are'} not today, so the text says "Happy birthday in advance".`
            : `${early} of these birthdays are not today. They get the "Happy birthday in advance" text.`
        )
      }
      if (skipped > 0) warnings.push(`${skipped} ${skipped === 1 ? 'person has' : 'people have'} no valid mobile number and will be skipped.`)

      const confirmed = await preview({
        title,
        recipients: ok.map((r) => ({ name: r.name, phone: r.phone, message: r.body, note: whenLabel(r.daysUntil, r.birthdayDate) })),
        warnings,
      })
      if (!confirmed) return { status: 'cancelled' }

      const keep = new Set(ok.map((r) => r.id))
      const { data, error } = await sendBirthdaySmsAction({
        sender_id: user.id,
        module,
        entries: entries.filter((e) => keep.has(e.id)),
      })
      if (error || !data) return { status: 'error', error: error ?? 'Sending failed.' }
      return { status: 'sent', result: data }
    },
    [user?.id, preview]
  )
}
