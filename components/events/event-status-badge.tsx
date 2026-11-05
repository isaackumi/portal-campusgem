import { Badge } from '@/components/ui/badge'
import type { EventStatus } from '@/lib/events/rsvp'

const TONE: Record<EventStatus, { label: string; variant: 'secondary' | 'success' | 'danger' }> = {
  draft: { label: 'Draft', variant: 'secondary' },
  published: { label: 'Published', variant: 'success' },
  cancelled: { label: 'Cancelled', variant: 'danger' },
}

export function EventStatusBadge({ status }: { status: EventStatus }) {
  const t = TONE[status]
  return <Badge variant={t.variant}>{t.label}</Badge>
}
