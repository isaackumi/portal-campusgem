'use client'

import { useEffect, useMemo, useState } from 'react'
import { MessageSquareText } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { PersonAvatar } from '@/components/ui/person'
import { useToast } from '@/hooks/use-toast'
import type { CampRegistration } from '@/lib/types'
import { buildCallListSms, isOpenCall } from '@/lib/camp/call-campaign'
import { sendCallListsBySmsAction, type CallBoardCaller } from '@/lib/actions/camp-calls'

/** Text each caller the names and numbers on their list. */
export function TextCallListsDialog({
  open,
  onOpenChange,
  registrations,
  people,
  campYearId,
  campYear,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  registrations: CampRegistration[]
  people: CallBoardCaller[]
  campYearId: string
  campYear?: number
}) {
  const { toast } = useToast()
  const [includeSettled, setIncludeSettled] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [sending, setSending] = useState(false)

  const lists = useMemo(() => {
    const byCaller = new Map<string, CampRegistration[]>()
    for (const r of registrations) {
      if (!r.assigned_to || r.status === 'cancelled') continue
      if (!includeSettled && !isOpenCall(r)) continue
      byCaller.set(r.assigned_to, [...(byCaller.get(r.assigned_to) ?? []), r])
    }
    const byId = new Map(people.map((p) => [p.id, p]))
    return Array.from(byCaller.entries())
      .map(([id, regs]) => ({ id, person: byId.get(id), regs }))
      .sort((a, b) => (a.person?.full_name ?? '').localeCompare(b.person?.full_name ?? ''))
  }, [registrations, people, includeSettled])

  useEffect(() => {
    if (open) setSelected(lists.map((l) => l.id))
    // Re-select everyone only when the dialog opens or the list basis changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, includeSettled])

  const sample = lists.find((l) => selected.includes(l.id))
  const sampleParts = sample
    ? buildCallListSms({
        callerName: sample.person?.full_name ?? 'Caller',
        campYear,
        entries: sample.regs.map((r) => ({ name: r.full_name, phone: r.phone, outcome: r.attendance_confirmation })),
        link: sample.person?.can_use_app ? `${typeof window !== 'undefined' ? window.location.origin : ''}/admin/camp-meeting/calls` : null,
      })
    : []

  async function send(dryRun: boolean) {
    setSending(true)
    try {
      const res = await sendCallListsBySmsAction({
        camp_year_id: campYearId,
        caller_ids: selected,
        include_settled: includeSettled,
        dry_run: dryRun,
      })
      if (res.error || !res.data) throw new Error(res.error ?? 'Nothing was sent')
      const { callers, messages, failed } = res.data
      toast({
        title: dryRun ? 'Test run finished' : 'Call lists sent',
        description: `${callers} caller${callers === 1 ? '' : 's'}, ${messages} message${messages === 1 ? '' : 's'}${dryRun ? ' (not actually sent)' : ''}.${
          failed.length ? ` Not sent to: ${failed.map((f) => `${f.caller} (${f.reason})`).join('; ')}` : ''
        }`,
        variant: failed.length && !callers ? 'destructive' : undefined,
      })
      if (!dryRun && callers > 0) onOpenChange(false)
    } catch (error) {
      toast({ variant: 'destructive', title: 'Could not text call lists', description: error instanceof Error ? error.message : 'Try again.' })
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="border-b border-neutral-200 px-6 pb-4 pt-6 dark:border-neutral-700">
          <DialogTitle className="app-section-title">Text callers their lists</DialogTitle>
          <DialogDescription>Each caller gets an SMS with the names and phone numbers they should call.</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <label className="flex cursor-pointer items-start gap-3 text-sm">
            <Checkbox checked={includeSettled} onCheckedChange={(v) => setIncludeSettled(v === true)} className="mt-0.5" />
            <span>
              <span className="block font-medium text-neutral-900 dark:text-neutral-100">Include people already settled</span>
              <span className="block text-[13px] text-neutral-500 dark:text-neutral-400">Off: only people still to reach (not called, not sure, no answer).</span>
            </span>
          </label>

          {lists.length === 0 ? (
            <p className="rounded-lg border border-dashed border-neutral-300 px-4 py-8 text-center text-sm text-neutral-500 dark:border-neutral-600 dark:text-neutral-400">
              No caller has open calls. Assign people first.
            </p>
          ) : (
            <ul className="divide-y divide-neutral-100 rounded-lg border border-neutral-200 dark:divide-neutral-700 dark:border-neutral-700">
              {lists.map((l) => {
                const checked = selected.includes(l.id)
                return (
                  <li key={l.id}>
                    <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) =>
                          setSelected((prev) => (v === true ? [...prev, l.id] : prev.filter((x) => x !== l.id)))
                        }
                      />
                      <PersonAvatar name={l.person?.full_name} seed={l.id} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                          {l.person?.full_name ?? 'Unknown caller'}
                        </span>
                        <span className="block truncate font-mono text-xs text-neutral-500 dark:text-neutral-400">
                          {l.person?.phone || 'No phone on profile'}
                        </span>
                      </span>
                      <Badge variant="secondary">{l.regs.length} to call</Badge>
                    </label>
                  </li>
                )
              })}
            </ul>
          )}

          {sampleParts.length > 0 ? (
            <div>
              <p className="app-overline mb-2">
                Preview for {sample?.person?.full_name ?? 'caller'}
                {sampleParts.length > 1 ? ` · ${sampleParts.length} messages` : ''}
              </p>
              <div className="space-y-2">
                {sampleParts.slice(0, 2).map((part, i) => (
                  <pre
                    key={i}
                    className="whitespace-pre-wrap rounded-2xl rounded-bl-md bg-neutral-100 px-4 py-3 font-sans text-[13px] leading-relaxed text-neutral-800 dark:bg-neutral-700/60 dark:text-neutral-100"
                  >
                    {part}
                  </pre>
                ))}
                {sampleParts.length > 2 ? (
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">+ {sampleParts.length - 2} more</p>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2 border-t border-neutral-200 px-6 py-4 dark:border-neutral-700">
          <Button variant="ghost" onClick={() => void send(true)} disabled={sending || selected.length === 0}>
            Test without sending
          </Button>
          <Button onClick={() => void send(false)} disabled={sending || selected.length === 0}>
            <MessageSquareText className="mr-1.5 h-4 w-4" aria-hidden />
            {sending ? 'Sending…' : `Text ${selected.length} caller${selected.length === 1 ? '' : 's'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
