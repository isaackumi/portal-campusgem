'use client'

import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { OutreachForm } from '@/components/outreach/outreach-form'
import { submitPublicOutreachAction, type PublicOutreachCampus } from '@/lib/actions/outreach'

/** /o/<slug>: the student's own form, then a thank-you with "Add another person". */
export function PublicOutreachForm({ campus, by }: { campus: PublicOutreachCampus; by: string | null }) {
  const [done, setDone] = useState<{ name: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [round, setRound] = useState(0)

  if (done) {
    return (
      <div className="grid grid-cols-1 gap-5 py-4 text-center" role="status">
        <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600 dark:text-emerald-400" aria-hidden />
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Thank you{done.name ? `, ${done.name}` : ''}!
          </h1>
          <p className="mt-2 break-words text-base text-slate-600 dark:text-slate-300">
            It was lovely meeting you. The Campus GEM family at {campus.name} will be in touch soon.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => {
            setDone(null)
            setError(null)
            setRound((r) => r + 1)
            window.scrollTo({ top: 0 })
          }}
          className="h-14 w-full text-base"
        >
          Add another person
        </Button>
      </div>
    )
  }

  return (
    <div className="grid min-w-0 grid-cols-1 gap-6">
      <div className="min-w-0">
        <p className="app-overline">Campus GEM · {campus.label}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Nice to meet you</h1>
        <p className="mt-1 break-words text-[15px] text-slate-600 dark:text-slate-300">
          Leave your details so we can keep in touch. Only your name and number are needed.
        </p>
      </div>
      <OutreachForm
        formKey={round}
        mode="qr"
        campusShortCode={campus.short_code}
        submitLabel="Send"
        serverError={error}
        onSubmit={async (payload) => {
          setError(null)
          const res = await submitPublicOutreachAction(campus.key, payload, by)
          if (res.error || !res.data) {
            setError(res.error ?? 'Something went wrong. Please try again.')
            return {}
          }
          if (!res.data.ok) return res.data.errors
          setDone({ name: res.data.name })
          window.scrollTo({ top: 0 })
          return true
        }}
      />
    </div>
  )
}
