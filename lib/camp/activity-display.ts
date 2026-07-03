import type { CampActivity } from '@/lib/types'

export function mapRawCampActivity(doc: Record<string, unknown>): CampActivity | null {
  if (!doc || typeof doc !== 'object') return null
  const id = String(doc._id ?? doc.id ?? '')
  if (!id) return null
  const ct = doc._creationTime as number | undefined
  const ut = doc.updated_at as number | undefined
  const iso = (t?: number) => (t != null ? new Date(t).toISOString() : '')
  return {
    id,
    camp_year_id: String(doc.camp_year_id ?? ''),
    title: String(doc.title ?? 'Session'),
    description: doc.description != null ? String(doc.description) : undefined,
    activity_type: (doc.activity_type as CampActivity['activity_type']) ?? 'session',
    date: String(doc.date ?? ''),
    start_time: String(doc.start_time ?? ''),
    end_time: String(doc.end_time ?? ''),
    location: doc.location != null ? String(doc.location) : undefined,
    venue: doc.venue != null ? String(doc.venue) : undefined,
    capacity: doc.capacity != null ? Number(doc.capacity) : undefined,
    assigned_staff: doc.assigned_staff != null ? String(doc.assigned_staff) : undefined,
    status: (doc.status as CampActivity['status']) ?? 'scheduled',
    attendance_count: doc.attendance_count != null ? Number(doc.attendance_count) : 0,
    notes: doc.notes != null ? String(doc.notes) : undefined,
    metadata: doc.metadata as Record<string, unknown> | undefined,
    created_at: iso(ct) || new Date().toISOString(),
    updated_at: iso(ut) || iso(ct) || new Date().toISOString(),
    created_by: doc.created_by != null ? String(doc.created_by) : undefined,
  }
}

export function formatCampActivityLabel(activity: CampActivity): string {
  const dateLabel = activity.date
    ? new Date(`${activity.date}T12:00:00`).toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
    : ''
  const time = activity.start_time?.slice(0, 5) ?? ''
  return [activity.title, dateLabel, time].filter(Boolean).join(' · ')
}

export function sortCampActivities(activities: CampActivity[]): CampActivity[] {
  return [...activities].sort((a, b) => {
    const dateCmp = (a.date || '').localeCompare(b.date || '')
    if (dateCmp !== 0) return dateCmp
    return (a.start_time || '').localeCompare(b.start_time || '')
  })
}

export function suggestCampActivityId(activities: CampActivity[]): string | null {
  const sorted = sortCampActivities(activities)
  if (!sorted.length) return null
  const today = new Date().toISOString().split('T')[0]
  const todayOnes = sorted.filter((a) => a.date === today)
  const pool = todayOnes.length ? todayOnes : sorted
  const inProgress = pool.find((a) => a.status === 'in_progress')
  if (inProgress) return inProgress.id
  const scheduled = pool.find((a) => a.status === 'scheduled')
  return scheduled?.id ?? pool[0]?.id ?? null
}
