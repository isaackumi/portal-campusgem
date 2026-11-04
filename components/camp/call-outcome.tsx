import { Badge } from '@/components/ui/badge'
import type { Segment } from '@/components/ui/meter'
import {
  CALL_OUTCOMES,
  callOutcomeMeta,
  type CallCampaignSummary,
  type CallOutcome,
} from '@/lib/camp/call-campaign'
import { CheckCircle2, CircleDashed, HelpCircle, PhoneOff, XCircle } from 'lucide-react'

/** Status colours for call outcomes. Always shown with an icon and a label. */
export const OUTCOME_FILL: Record<CallOutcome, string> = {
  confirmed: 'bg-emerald-500 dark:bg-emerald-400',
  maybe: 'bg-amber-400 dark:bg-amber-400',
  unreachable: 'bg-neutral-400 dark:bg-neutral-500',
  declined: 'bg-red-500 dark:bg-red-400',
  unconfirmed: 'bg-neutral-300 dark:bg-neutral-600',
}

export const OUTCOME_ICON: Record<CallOutcome, typeof CheckCircle2> = {
  confirmed: CheckCircle2,
  maybe: HelpCircle,
  unreachable: PhoneOff,
  declined: XCircle,
  unconfirmed: CircleDashed,
}

export function OutcomeBadge({ outcome }: { outcome: CallOutcome | null | undefined }) {
  const meta = callOutcomeMeta(outcome)
  const Icon = OUTCOME_ICON[meta.id]
  return (
    <Badge variant={meta.id === 'unconfirmed' ? 'outline' : meta.tone}>
      <Icon className="h-3 w-3" aria-hidden />
      {meta.label}
    </Badge>
  )
}

/** Segments in reading order: settled yes, open, settled no, untouched. */
export function outcomeSegments(summary: CallCampaignSummary): Segment[] {
  const order: CallOutcome[] = ['confirmed', 'maybe', 'unreachable', 'declined', 'unconfirmed']
  return order.map((id) => ({
    key: id,
    label: CALL_OUTCOMES.find((o) => o.id === id)?.label ?? id,
    value: summary.byOutcome[id],
    className: OUTCOME_FILL[id],
  }))
}
