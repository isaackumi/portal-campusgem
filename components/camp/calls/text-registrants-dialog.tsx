'use client'

import { useEffect, useState } from 'react'
import { Send } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { useBackgroundJobs } from '@/components/background-jobs'
import type { CampRegistration } from '@/lib/types'
import { CONFIRM_ATTENDANCE_SMS } from '@/lib/camp/call-campaign'
import { CONFIRM_LINK_PLACEHOLDER, personalizeCampMessage } from '@/lib/camp/sms-templates'
import { sampleConfirmLinkUrl } from '@/lib/camp/confirm-link'
import { smsSegmentInfo } from '@/lib/comms/sms-segments'
import { sendCampBulkSmsAction } from '@/lib/actions/camp'

/** Ask the selected registrants themselves whether they are still coming. */
export function TextRegistrantsDialog({
  open,
  onOpenChange,
  registrations,
  campYearId,
  campYear,
  senderId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  registrations: CampRegistration[]
  campYearId: string
  campYear?: number
  senderId: string
}) {
  const { toast } = useToast()
  const jobs = useBackgroundJobs()
  const [message, setMessage] = useState(CONFIRM_ATTENDANCE_SMS)

  useEffect(() => {
    if (open) setMessage(CONFIRM_ATTENDANCE_SMS)
  }, [open])

  const withPhone = registrations.filter((r) => r.phone?.trim())
  const sample = withPhone[0]
  const [origin, setOrigin] = useState('')
  useEffect(() => setOrigin(window.location.origin), [])
  const hasConfirmLink = CONFIRM_LINK_PLACEHOLDER.test(message)
  const preview = sample
    ? personalizeCampMessage(message, {
        fullName: sample.full_name,
        firstName: sample.first_name,
        campYear,
        confirmLink: origin ? sampleConfirmLinkUrl(origin) : null,
      })
    : message
  const segments = smsSegmentInfo(preview).segments

  function send() {
    const batchId = crypto.randomUUID()
    jobs.start({
      title: `Confirmation SMS to ${withPhone.length} registrant${withPhone.length === 1 ? '' : 's'}`,
      items: withPhone,
      chunkSize: 20,
      verb: 'texted',
      runChunk: async (chunk) => {
        const res = await sendCampBulkSmsAction({
          camp_year_id: campYearId,
          batch_id: batchId,
          sender_id: senderId,
          message_template: message,
          camp_year: campYear ?? null,
          recipients: chunk.map((r) => ({
            id: r.id,
            full_name: r.full_name,
            first_name: r.first_name,
            last_name: r.last_name,
            phone: r.phone,
            email: r.email,
            role: r.role,
            check_in_code: r.check_in_code,
          })),
          filter_criteria: { purpose: 'attendance_confirmation' },
        })
        if (res.error || !res.data) return { ok: 0, failed: chunk.length, errors: [res.error ?? 'Send failed'] }
        return { ok: res.data.success_count, failed: res.data.error_count, errors: res.data.errors }
      },
    })
    toast({ title: 'Sending in the background', description: 'You can keep working. Progress shows at the bottom of the screen.' })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="app-section-title">Text registrants</DialogTitle>
          <DialogDescription>
            {withPhone.length} of {registrations.length} selected have a phone number. Use {'{{firstName}}'} and {'{{campYear}}'} to personalise.
            {' '}{'{{confirmLink}}'} adds each person&apos;s own link to tap Yes / Not sure / No; answers show up here.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            aria-label="Message"
            className="w-full resize-y rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100"
          />
          <div>
            <p className="app-overline mb-2">
              Preview{sample ? ` for ${sample.full_name}` : ''} · {preview.length} characters · {segments} SMS
            </p>
            <p className="whitespace-pre-wrap rounded-2xl rounded-bl-md bg-neutral-100 px-4 py-3 text-[13px] leading-relaxed text-neutral-800 dark:bg-neutral-700/60 dark:text-neutral-100">
              {preview}
            </p>
            {!hasConfirmLink ? (
              <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                No {'{{confirmLink}}'} in this message. People cannot reply to the sender ID, so they will have no way to answer.
              </p>
            ) : null}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={send} disabled={!withPhone.length || !message.trim() || jobs.isRunning}>
            <Send className="mr-1.5 h-4 w-4" aria-hidden />
            Send to {withPhone.length}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
