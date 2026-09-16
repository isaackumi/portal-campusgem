'use client'

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
import { LoadingSpinner } from '@/components/ui/loading'

type CampSmsReviewDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  /** Single recipient name, or a short bulk label e.g. "Room A — 8 campers" */
  recipientName: string
  recipientPhone?: string | null
  /** When > 1, treats this as a bulk send review */
  recipientCount?: number
  /** Optional sample names shown under the count */
  sampleRecipientNames?: string[]
  previewBody: string
  previewLabel?: string
  sending?: boolean
  confirmLabel?: string
  onConfirm: () => void
}

export function CampSmsReviewDialog({
  open,
  onOpenChange,
  title,
  description = 'Confirm the message before it is sent. Nothing goes out until you confirm.',
  recipientName,
  recipientPhone,
  recipientCount = 1,
  sampleRecipientNames = [],
  previewBody,
  previewLabel,
  sending = false,
  confirmLabel,
  onConfirm,
}: CampSmsReviewDialogProps) {
  const isBulk = recipientCount > 1
  const resolvedConfirm =
    confirmLabel ?? (isBulk ? `Confirm send to ${recipientCount}` : 'Confirm send')
  const canSend = Boolean(previewBody.trim()) && (isBulk || Boolean(recipientPhone?.trim()))

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!sending) onOpenChange(next)
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{recipientName || 'Recipient'}</Badge>
            {isBulk ? (
              <Badge variant="outline">{recipientCount} recipients</Badge>
            ) : recipientPhone ? (
              <Badge variant="outline" className="font-mono">
                {recipientPhone}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-amber-800">
                No phone
              </Badge>
            )}
          </div>

          {isBulk && sampleRecipientNames.length > 0 ? (
            <p className="text-xs leading-relaxed text-slate-600">
              Includes {sampleRecipientNames.slice(0, 6).join(', ')}
              {sampleRecipientNames.length > 6
                ? `, +${sampleRecipientNames.length - 6} more`
                : ''}
              .
            </p>
          ) : null}

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
              {previewLabel ?? (isBulk ? 'Sample message (personalized per person)' : 'Message to send')}
            </p>
            <p className="whitespace-pre-wrap leading-relaxed text-slate-900">
              {previewBody || '—'}
            </p>
            <p className="mt-2 text-xs tabular-nums text-slate-500">
              {previewBody.length} characters
              {previewBody.length > 160 ? ' · may split into multiple SMS' : ''}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            className="min-h-11 cursor-pointer"
            disabled={sending}
            onClick={() => onOpenChange(false)}
          >
            Back
          </Button>
          <Button
            type="button"
            className="min-h-11 cursor-pointer"
            disabled={sending || !canSend}
            aria-busy={sending}
            onClick={onConfirm}
          >
            {sending ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Sending…
              </>
            ) : (
              resolvedConfirm
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
