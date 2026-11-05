'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { useBackgroundJobs } from '@/components/background-jobs'
import { getCommsProviderStatusAction } from '@/lib/actions/comms'
import { sendGroupSmsAction } from '@/lib/actions/groups'
import { memberToRecipient, personalizeMessage } from '@/lib/comms/recipients'
import { isValidSmsPhone } from '@/lib/comms/sms-client'
import { smsSegmentInfo } from '@/lib/comms/sms-segments'
import type { CommsRecipient } from '@/lib/comms/types'
import type { GroupMembership } from '@/lib/types'

const PLACEHOLDERS = [
  { token: '{{name}}', label: 'First name' },
  { token: '{{full_name}}', label: 'Full name' },
] as const

type Target = { memberId: string; recipient: CommsRecipient }

/**
 * Compose and send an SMS to everyone in a group. Sends run as a background job in
 * chunks of 20; members without a valid Ghana mobile are skipped and counted.
 * Render only for users with `sms.send` (the server action checks it too).
 */
export function GroupSmsComposer({
  groupId,
  groupName,
  memberships,
}: {
  groupId: string
  groupName: string
  memberships: GroupMembership[]
}) {
  const { toast } = useToast()
  const jobs = useBackgroundJobs()
  const [message, setMessage] = useState('')
  const [dryRun, setDryRun] = useState(false)
  const [smsConfigured, setSmsConfigured] = useState<boolean | null>(null)

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

  const { targets, skipped } = useMemo(() => {
    const targets: Target[] = []
    const skipped: string[] = []
    for (const row of memberships) {
      const recipient = row.member ? memberToRecipient(row.member, 'church') : null
      if (recipient && isValidSmsPhone(recipient.phone)) {
        targets.push({ memberId: row.member_id, recipient })
      } else {
        skipped.push(row.member?.user?.full_name?.trim() || 'Unknown member')
      }
    }
    return { targets, skipped }
  }, [memberships])

  const sample = targets[0]?.recipient
  const preview = sample
    ? personalizeMessage(message, {
        name: sample.name.split(' ')[0] ?? sample.name,
        full_name: sample.name,
        ...(sample.variables ?? {}),
      })
    : message
  const segments = smsSegmentInfo(preview)
  const notConfigured = smsConfigured === false
  const effectiveDryRun = dryRun || notConfigured

  function insert(token: string) {
    setMessage((current) => (current && !current.endsWith(' ') ? `${current} ${token}` : `${current}${token}`))
  }

  function send() {
    const body = message.trim()
    if (!body || targets.length === 0) return
    const count = targets.length
    if (
      !effectiveDryRun &&
      !window.confirm(`Text ${count} member${count === 1 ? '' : 's'} of ${groupName}? This sends real SMS.`)
    ) {
      return
    }

    const batchId = crypto.randomUUID()
    jobs.start({
      title: `${effectiveDryRun ? 'Dry run: ' : ''}SMS to ${groupName} (${count})`,
      verb: effectiveDryRun ? 'checked' : 'sent',
      items: targets,
      chunkSize: 20,
      runChunk: async (chunk) => {
        const res = await sendGroupSmsAction({
          group_id: groupId,
          member_ids: chunk.map((t) => t.memberId),
          message: body,
          batch_id: batchId,
          dry_run: effectiveDryRun,
        })
        if (res.error || !res.data) throw new Error(res.error ?? 'Send failed')
        const { success_count, error_count, errors, skipped: serverSkipped } = res.data
        return {
          ok: success_count,
          failed: error_count + serverSkipped,
          errors: serverSkipped ? [...errors, `${serverSkipped} skipped: no valid phone`] : errors,
        }
      },
    })

    toast({
      title: effectiveDryRun ? 'Dry run started' : 'Sending in the background',
      description:
        skipped.length > 0
          ? `${count} will be texted. ${skipped.length} skipped with no valid mobile number.`
          : 'You can keep working. Progress shows at the bottom of the screen.',
    })
    if (!effectiveDryRun) setMessage('')
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        <span className="font-medium text-neutral-900 dark:text-neutral-100">{targets.length}</span> of{' '}
        {memberships.length} member{memberships.length === 1 ? '' : 's'} have a valid mobile number.
        {skipped.length > 0 ? (
          <span className="text-amber-700 dark:text-amber-300">
            {' '}
            {skipped.length} will be skipped: {skipped.slice(0, 4).join(', ')}
            {skipped.length > 4 ? ` and ${skipped.length - 4} more` : ''}.
          </span>
        ) : null}
      </p>

      {notConfigured ? (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>SMS isn&apos;t set up on this server yet, so only a dry run is possible (numbers are checked, nothing is sent).</span>
        </div>
      ) : null}

      <div>
        <Label htmlFor="group-message">Message</Label>
        <textarea
          id="group-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Hello {{name}}, …"
          maxLength={918}
          rows={5}
          className="mt-1.5 w-full resize-y rounded-xl border border-neutral-200 bg-white p-3 text-base text-neutral-900 placeholder:text-neutral-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500 sm:text-sm"
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-xs text-neutral-500 dark:text-neutral-400">Personalise:</span>
          {PLACEHOLDERS.map((p) => (
            <Button
              key={p.token}
              type="button"
              variant="outline"
              size="sm"
              className="h-11 px-3 text-xs sm:h-8"
              onClick={() => insert(p.token)}
            >
              <span className="font-mono">{p.token}</span>
              <span className="sr-only"> ({p.label})</span>
            </Button>
          ))}
        </div>
      </div>

      {message.trim() ? (
        <div>
          <p className="app-overline mb-2">
            Preview{sample ? ` for ${sample.name}` : ''}
          </p>
          <p className="whitespace-pre-wrap break-words rounded-2xl rounded-bl-md bg-neutral-100 px-4 py-3 text-[13px] leading-relaxed text-neutral-800 dark:bg-neutral-700/60 dark:text-neutral-100">
            {preview}
          </p>
          <p
            className={
              segments.segments > 1
                ? 'mt-1.5 text-xs font-medium text-amber-700 dark:text-amber-300'
                : 'mt-1.5 text-xs text-neutral-500 dark:text-neutral-400'
            }
          >
            {segments.length} characters · {segments.segments} SMS per person
            {segments.encoding === 'UCS-2' ? ' · emoji or special characters shorten each SMS to 70' : ''}
            {targets.length > 0 && segments.segments > 0 ? ` · about ${segments.segments * targets.length} SMS in total` : ''}
          </p>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
          <Checkbox
            checked={effectiveDryRun}
            disabled={notConfigured}
            onCheckedChange={(value) => setDryRun(value === true)}
            aria-describedby="group-dry-run-hint"
          />
          <span>
            Dry run
            <span id="group-dry-run-hint" className="block text-xs text-neutral-500 dark:text-neutral-400">
              Check numbers and personalisation without sending
            </span>
          </span>
        </label>
        <Button
          onClick={send}
          disabled={!message.trim() || targets.length === 0 || jobs.isRunning}
          className="h-11 w-full sm:h-10 sm:w-auto"
        >
          <Send className="mr-2 h-4 w-4" aria-hidden />
          {effectiveDryRun ? 'Dry run for' : 'Send to'} {targets.length} member{targets.length === 1 ? '' : 's'}
        </Button>
      </div>
    </div>
  )
}
