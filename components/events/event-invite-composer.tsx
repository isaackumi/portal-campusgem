'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { useBackgroundJobs } from '@/components/background-jobs'
import { useSmsPreview } from '@/components/comms/sms-preview'
import { getCommsProviderStatusAction } from '@/lib/actions/comms'
import { sendEventInvitesAction } from '@/lib/actions/events'
import { personalizeMessage } from '@/lib/comms/recipients'
import { isValidSmsPhone } from '@/lib/comms/sms-client'
import { smsSegmentInfo } from '@/lib/comms/sms-segments'
import type { EventInvitee } from '@/lib/convex/events-bridge'
import {
  DEFAULT_INVITE_TEMPLATE,
  DEFAULT_REMINDER_TEMPLATE,
  type ChurchEvent,
  type InviteMode,
  inviteVariables,
  needsSend,
  sampleEventLinkUrl,
} from '@/lib/events/rsvp'
import { cn } from '@/lib/utils'

const PLACEHOLDERS = ['{{name}}', '{{event}}', '{{date}}', '{{location}}', '{{link}}'] as const

/**
 * Text personal RSVP links. "New invites" only goes to people never texted; "Reminder"
 * only to invited people who haven't answered. Runs as a background job in chunks of 20.
 * Render only for users with `sms.send` (the action checks it too).
 */
export function EventInviteComposer({
  event,
  rsvps,
  linkOrigin,
  onSent,
}: {
  event: ChurchEvent
  rsvps: EventInvitee[]
  linkOrigin: string
  onSent: () => void
}) {
  const { toast } = useToast()
  const jobs = useBackgroundJobs()
  const smsPreview = useSmsPreview()
  const [mode, setMode] = useState<InviteMode>('new')
  const [messages, setMessages] = useState<Record<InviteMode, string>>({
    new: DEFAULT_INVITE_TEMPLATE,
    reminder: DEFAULT_REMINDER_TEMPLATE,
  })
  const [dryRun, setDryRun] = useState(false)
  const [smsConfigured, setSmsConfigured] = useState<boolean | null>(null)
  const message = messages[mode]

  useEffect(() => {
    let alive = true
    getCommsProviderStatusAction()
      .then((res) => {
        if (alive) setSmsConfigured(res.data ? res.data.smsConfigured || res.data.forceMock : null)
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [])

  const { targets, noPhone, optedOut, counts } = useMemo(() => {
    const due = rsvps.filter((r) => needsSend(r, mode))
    return {
      targets: due.filter((r) => isValidSmsPhone(r.phone) && !r.sms_opt_out),
      noPhone: due.filter((r) => !isValidSmsPhone(r.phone)).length,
      optedOut: due.filter((r) => isValidSmsPhone(r.phone) && r.sms_opt_out).length,
      counts: {
        new: rsvps.filter((r) => needsSend(r, 'new')).length,
        reminder: rsvps.filter((r) => needsSend(r, 'reminder')).length,
      },
    }
  }, [rsvps, mode])

  const sample = targets[0]
  const preview = personalizeMessage(
    message,
    inviteVariables(event, sample?.name.split(' ')[0] ?? 'Ama', sampleEventLinkUrl(linkOrigin))
  )
  const segments = smsSegmentInfo(preview)
  const notConfigured = smsConfigured === false
  const effectiveDryRun = dryRun || notConfigured
  const missingLink = !message.includes('{{link}}')
  const notPublished = event.status !== 'published'

  function insert(token: string) {
    setMessages((m) => ({ ...m, [mode]: m[mode] && !m[mode].endsWith(' ') ? `${m[mode]} ${token}` : `${m[mode]}${token}` }))
  }

  async function send() {
    const body = message.trim()
    if (!body || targets.length === 0 || missingLink) return
    const count = targets.length
    const ok = await smsPreview({
      title: `${mode === 'new' ? 'Invitations' : 'Reminders'} for ${event.title}`,
      message: body,
      recipients: targets.map((r) => ({
        name: r.name,
        phone: r.phone,
        // Each person's RSVP link is made on the server, so {{link}} stays as a placeholder here.
        message: personalizeMessage(body, inviteVariables(event, r.name.split(' ')[0] ?? r.name, '{{link}}')),
      })),
      warnings: [
        ...(noPhone ? [`${noPhone} ${noPhone === 1 ? 'person has' : 'people have'} no valid phone and will be skipped.`] : []),
        ...(optedOut ? [`${optedOut} opted out (STOP) and will be skipped.`] : []),
        ...(effectiveDryRun ? ['Dry run: nothing will actually be sent.'] : []),
      ],
      sendLabel: effectiveDryRun ? `Dry run for ${count}` : undefined,
    })
    if (!ok) return
    const batchId = crypto.randomUUID()
    jobs.start({
      title: `${effectiveDryRun ? 'Dry run: ' : ''}${mode === 'new' ? 'Invites' : 'Reminders'} for ${event.title} (${count})`,
      verb: effectiveDryRun ? 'checked' : 'sent',
      items: targets,
      chunkSize: 20,
      runChunk: async (chunk) => {
        const res = await sendEventInvitesAction({
          event_id: event.id,
          rsvp_ids: chunk.map((r) => r.id),
          message: body,
          mode,
          batch_id: batchId,
          dry_run: effectiveDryRun,
        })
        if (res.error || !res.data) throw new Error(res.error ?? 'Send failed')
        const { success_count, error_count, errors, skipped } = res.data
        return {
          ok: success_count,
          failed: error_count + skipped,
          errors: skipped ? [...errors, `${skipped} skipped (already sent, no phone or opted out)`] : errors,
        }
      },
      onComplete: () => onSent(),
    })
    toast({
      title: effectiveDryRun ? 'Dry run started' : 'Sending in the background',
      description: 'Progress shows at the bottom of the screen.',
    })
  }

  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Who to text" className="inline-flex rounded-lg bg-neutral-100 p-1 dark:bg-white/[0.06]">
        {(['new', 'reminder'] as const).map((m) => (
          <button
            key={m}
            role="tab"
            type="button"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={cn(
              'h-9 rounded-md px-3 text-sm font-medium transition-colors',
              mode === m
                ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-800 dark:text-white'
                : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
            )}
          >
            {m === 'new' ? `New invites (${counts.new})` : `Reminder to non-responders (${counts.reminder})`}
          </button>
        ))}
      </div>

      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        <span className="font-medium text-neutral-900 dark:text-neutral-100">{targets.length}</span>{' '}
        {mode === 'new' ? 'not yet invited' : 'invited but not answered'} will be texted.
        {noPhone ? <span className="text-amber-700 dark:text-amber-300"> {noPhone} skipped with no valid mobile.</span> : null}
        {optedOut ? <span className="text-amber-700 dark:text-amber-300"> {optedOut} opted out (STOP).</span> : null}
      </p>

      {notPublished ? (
        <Notice>Publish the event before sending invitations.</Notice>
      ) : notConfigured ? (
        <Notice>SMS isn&apos;t set up on this server yet, so only a dry run is possible.</Notice>
      ) : null}

      <div>
        <Label htmlFor="event-message">Message</Label>
        <textarea
          id="event-message"
          value={message}
          onChange={(e) => setMessages((m) => ({ ...m, [mode]: e.target.value }))}
          maxLength={918}
          rows={4}
          className="mt-1.5 w-full resize-y rounded-xl border border-neutral-200 bg-white p-3 text-base text-neutral-900 placeholder:text-neutral-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500 sm:text-sm"
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-xs text-neutral-500 dark:text-neutral-400">Insert:</span>
          {PLACEHOLDERS.map((p) => (
            <Button key={p} type="button" variant="outline" size="sm" className="h-11 px-3 font-mono text-xs sm:h-8" onClick={() => insert(p)}>
              {p}
            </Button>
          ))}
        </div>
        {missingLink ? (
          <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">Include {'{{link}}'} so each person gets their RSVP link.</p>
        ) : null}
      </div>

      <div>
        <p className="app-overline mb-2">Preview{sample ? ` for ${sample.name}` : ''}</p>
        <p className="whitespace-pre-wrap break-words rounded-2xl rounded-bl-md bg-neutral-100 px-4 py-3 text-[13px] leading-relaxed text-neutral-800 dark:bg-neutral-700/60 dark:text-neutral-100">
          {preview}
        </p>
        <p
          className={cn(
            'mt-1.5 text-xs',
            segments.segments > 1 ? 'font-medium text-amber-700 dark:text-amber-300' : 'text-neutral-500 dark:text-neutral-400'
          )}
        >
          {segments.length} characters · {segments.segments} SMS per person
          {segments.encoding === 'UCS-2' ? ' · emoji or special characters shorten each SMS to 70' : ''}
          {targets.length > 0 && segments.segments > 0 ? ` · about ${segments.segments * targets.length} SMS in total` : ''}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
          <Checkbox checked={effectiveDryRun} disabled={notConfigured} onCheckedChange={(v) => setDryRun(v === true)} />
          <span>
            Dry run
            <span className="block text-xs text-neutral-500 dark:text-neutral-400">Check numbers without sending</span>
          </span>
        </label>
        <Button
          onClick={() => void send()}
          disabled={!message.trim() || missingLink || targets.length === 0 || jobs.isRunning || notPublished}
          className="h-11 w-full sm:h-10 sm:w-auto"
        >
          <Send className="mr-2 h-4 w-4" aria-hidden />
          {effectiveDryRun ? 'Dry run for' : 'Text'} {targets.length} {targets.length === 1 ? 'person' : 'people'}
        </Button>
      </div>
    </div>
  )
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </div>
  )
}
