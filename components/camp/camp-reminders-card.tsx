'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { BellRing, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { getCampRemindersStatusAction, setCampAutoRemindersAction } from '@/lib/actions/camp-reminders'
import { smsSegmentInfo } from '@/lib/comms/sms-segments'
import { cn } from '@/lib/utils'

function formatRun(iso: string | null): string | null {
  if (!iso) return null
  return new Date(iso).toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Accra',
  })
}

function people(n: number): string {
  return `${n} ${n === 1 ? 'person' : 'people'}`
}

/** Camp overview card: automatic 7-day / 1-day reminders, on/off, schedule and preview. */
export function CampRemindersCard({ yearId }: { yearId: string }) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [saving, setSaving] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const key = ['camp-reminders', yearId]
  const status = useQuery({
    queryKey: key,
    queryFn: async () => {
      const res = await getCampRemindersStatusAction(yearId)
      if (res.error) throw new Error(res.error)
      return res.data
    },
    staleTime: 60_000,
  })

  const data = status.data
  const enabled = data?.enabled ?? true

  async function toggle() {
    if (!data) return
    setSaving(true)
    const res = await setCampAutoRemindersAction(yearId, !enabled)
    setSaving(false)
    if (res.error) {
      toast({ variant: 'destructive', title: 'Could not update reminders', description: res.error })
      return
    }
    toast({ title: !enabled ? 'Automatic reminders on' : 'Automatic reminders off' })
    await queryClient.invalidateQueries({ queryKey: key })
  }

  const rows = data
    ? [
        { label: '7 days before', run: formatRun(data.sevenDay.runAt), count: data.sevenDay.count, sent: data.sevenDay.alreadySent, hint: 'Everyone not declined. Unconfirmed get a tap-to-confirm link.' },
        { label: 'Day before', run: formatRun(data.dayBefore.runAt), count: data.dayBefore.count, sent: data.dayBefore.alreadySent, hint: 'Confirmed and not sure.' },
      ]
    : []

  return (
    <section className="dashboard-panel flex flex-col p-5" data-tour="camp-reminders">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-500 dark:text-neutral-400">
            <BellRing className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="app-section-title">Automatic reminders</h2>
            <p className="mt-0.5 text-[13px] text-neutral-500 dark:text-neutral-400">
              Texts 7 days and 1 day before camp, at 08:00. Nobody is texted twice.
            </p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Automatic reminders"
          disabled={!data || saving}
          onClick={() => void toggle()}
          className={cn(
            'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 disabled:opacity-50',
            enabled ? 'bg-brand-600 dark:bg-brand-500' : 'bg-neutral-300 dark:bg-neutral-600'
          )}
        >
          <span
            className={cn(
              'inline-block h-5 w-5 rounded-full bg-white shadow transition-transform dark:bg-neutral-100',
              enabled ? 'translate-x-6' : 'translate-x-1'
            )}
          />
        </button>
      </div>

      <div className="mt-4 flex-1">
        {status.isLoading ? (
          <p className="text-[13px] text-neutral-500 dark:text-neutral-400">Loading…</p>
        ) : status.error ? (
          <p className="text-[13px] text-red-600 dark:text-red-400">{(status.error as Error).message}</p>
        ) : !data ? null : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={enabled ? 'success' : 'secondary'}>{enabled ? 'On' : 'Off'}</Badge>
              {!data.explicit ? (
                <span className="text-xs text-neutral-500 dark:text-neutral-400">On by default</span>
              ) : null}
              {!data.smsConfigured ? (
                <Badge variant="warning">SMS not configured</Badge>
              ) : null}
            </div>
            <ul className="mt-3 divide-y divide-neutral-100 dark:divide-neutral-800">
              {rows.map((row) => (
                <li key={row.label} className="flex items-start justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{row.label}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{row.hint}</p>
                  </div>
                  <div className="shrink-0 text-right text-[13px]">
                    {row.run && enabled ? (
                      <>
                        <p className="font-medium text-neutral-800 dark:text-neutral-200">{row.run}</p>
                        <p className="text-neutral-500 dark:text-neutral-400">{people(row.count)} now</p>
                      </>
                    ) : (
                      <p className="text-neutral-500 dark:text-neutral-400">{!enabled ? 'Paused' : 'Window passed'}</p>
                    )}
                    {row.sent > 0 ? (
                      <p className="text-emerald-700 dark:text-emerald-300">{row.sent} sent</p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              Counts use today&apos;s answers; they change as people confirm.
            </p>
            <Button variant="outline" size="sm" className="mt-3 h-11 w-full sm:h-8 sm:w-auto" onClick={() => setPreviewOpen(true)}>
              <Eye className="mr-1.5 h-4 w-4" aria-hidden />
              Preview texts
            </Button>
          </>
        )}
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="app-section-title">Reminder texts</DialogTitle>
            <DialogDescription>
              Exactly what goes out. Each person gets their own link; the one shown is a placeholder of the same length.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {data?.previews.map((p) => {
              const seg = smsSegmentInfo(p.text)
              return (
                <div key={p.kind}>
                  <p className="app-overline mb-1.5">
                    {p.label} · {people(p.count)}
                  </p>
                  <p className="whitespace-pre-wrap rounded-2xl rounded-bl-md bg-neutral-100 px-4 py-3 text-[13px] leading-relaxed text-neutral-800 dark:bg-neutral-700/60 dark:text-neutral-100">
                    {p.text}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    {p.text.length} characters · {seg.segments} SMS{p.count ? ` · shown for ${p.sampleName}` : ''}
                  </p>
                </div>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  )
}
