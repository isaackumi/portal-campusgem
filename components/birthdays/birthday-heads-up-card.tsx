'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/components/providers'
import { useSmsPreview } from '@/components/comms/sms-preview'
import { PhoneLink } from '@/components/contact/phone-link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading'
import { useToast } from '@/hooks/use-toast'
import { previewBirthdayHeadsUpAction, sendBirthdayHeadsUpNowAction } from '@/lib/actions/birthday-heads-up'

/**
 * Birthdays exactly one week away, with phone and where each person belongs, for planning
 * flyers. Admins also get this list by text every morning.
 */
export function BirthdayHeadsUpCard() {
  const { can } = useAuth()
  const { toast } = useToast()
  const preview = useSmsPreview()
  const [sending, setSending] = useState(false)
  const { data, isLoading, error } = useQuery({
    queryKey: ['birthday-heads-up'],
    queryFn: async () => {
      const res = await previewBirthdayHeadsUpAction(7)
      if (res.error) throw new Error(res.error)
      return res.data
    },
    staleTime: 5 * 60_000,
  })

  async function textAdminsNow() {
    if (!data) return
    const ok = await preview({
      title: 'Birthday heads-up to admins',
      recipients: data.admins.map((a) => ({ name: a.name, phone: a.phone })),
      message: data.texts.join('\n\n'),
      warnings: [
        ...(data.texts.length > 1 ? [`The list is long, so it goes as ${data.texts.length} separate texts to each admin.`] : []),
        'Admins already get this automatically every morning. Only send it now if they missed it.',
      ],
    })
    if (!ok) return
    setSending(true)
    const res = await sendBirthdayHeadsUpNowAction()
    setSending(false)
    toast(
      res.error || !res.data
        ? { variant: 'destructive', title: 'Not sent', description: res.error ?? 'Unknown error' }
        : { title: `Sent ${res.data.sent} text${res.data.sent === 1 ? '' : 's'}`, description: res.data.failed ? `${res.data.failed} failed` : undefined }
    )
  }

  return (
    <section className="dashboard-panel p-4 sm:p-5" aria-labelledby="heads-up-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 id="heads-up-title" className="app-section-title">
            Birthdays in one week{data?.date ? `: ${data.date}` : ''}
          </h2>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Time to prepare a flyer. Admins get this list by text every morning; the birthday text itself goes out on the day.
          </p>
        </div>
        {data && data.due.length > 0 && can('sms.send') ? (
          <Button variant="outline" className="h-11 shrink-0 sm:h-10" disabled={sending || data.admins.length === 0} onClick={() => void textAdminsNow()}>
            {sending ? 'Sending…' : 'Text admins now'}
          </Button>
        ) : null}
      </div>

      <div className="mt-4">
        {isLoading ? (
          <div className="flex justify-center py-6">
            <LoadingSpinner size="sm" />
          </div>
        ) : error ? (
          <p className="text-sm text-red-600 dark:text-red-400">{error instanceof Error ? error.message : 'Could not load'}</p>
        ) : !data || data.due.length === 0 ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">No birthdays exactly one week from today.</p>
        ) : (
          <ul className="divide-y divide-neutral-100 dark:divide-white/[0.06]">
            {data.due.map((p) => (
              <li key={`${p.name}-${p.phone ?? ''}`} className="flex flex-col gap-1.5 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate font-medium text-neutral-900 dark:text-neutral-100">
                    {p.name}
                    {p.ageTurning ? <span className="font-normal text-neutral-500 dark:text-neutral-400"> · turns {p.ageTurning}</span> : null}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {p.tags.map((t) => (
                      <Badge key={t} variant="secondary" className="font-normal">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
                <PhoneLink phone={p.phone} name={p.name} className="text-sm" />
              </li>
            ))}
          </ul>
        )}
        {data && data.due.length > 0 && data.admins.length === 0 ? (
          <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">
            No admin has a valid mobile number, so nobody gets this by text yet.
          </p>
        ) : null}
      </div>
    </section>
  )
}
