import type {
  RlcMembershipType,
  RlcPipelineStatus,
  RlcVisitorSource,
  VisitorFollowUpStatus,
} from '@/lib/types'

export const RLC_NAME = 'Redemption Light Chapel'
export const RLC_SHORT = 'RLC'

export const RLC_PIPELINE_STATUSES: RlcPipelineStatus[] = [
  'first_visit',
  'follow_up',
  'new_member',
  'full_member',
  'inactive',
]

export const RLC_PIPELINE_LABELS: Record<RlcPipelineStatus, string> = {
  first_visit: 'First Visit',
  follow_up: 'Follow-up',
  new_member: 'New Member',
  full_member: 'Full Member',
  inactive: 'Inactive',
}

export const RLC_PIPELINE_COLORS: Record<RlcPipelineStatus, string> = {
  first_visit: 'bg-sky-100 text-sky-800',
  follow_up: 'bg-amber-100 text-amber-800',
  new_member: 'bg-emerald-100 text-emerald-800',
  full_member: 'bg-indigo-100 text-indigo-800',
  inactive: 'bg-slate-100 text-slate-600',
}

export const RLC_FOLLOW_UP_STATUSES: VisitorFollowUpStatus[] = ['pending', 'in_progress', 'completed']

export const RLC_FOLLOW_UP_LABELS: Record<VisitorFollowUpStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
}

export const RLC_VISITOR_SOURCES: RlcVisitorSource[] = [
  'walk_in',
  'camp',
  'campus_gem',
  'corporate_gem',
  'referral',
  'other',
]

export const RLC_SOURCE_LABELS: Record<RlcVisitorSource, string> = {
  walk_in: 'Walk-in',
  camp: 'Camp Meeting',
  campus_gem: 'Campus Gem',
  corporate_gem: 'Corporate Gem',
  referral: 'Referral',
  other: 'Other',
}

export const RLC_MEMBERSHIP_TYPES: RlcMembershipType[] = [
  'full_member',
  'associate',
  'visitor_converted',
]

export const RLC_MEMBERSHIP_TYPE_LABELS: Record<RlcMembershipType, string> = {
  full_member: 'Full Member',
  associate: 'Associate Member',
  visitor_converted: 'Converted Visitor',
}

export const RLC_SERVICES = [
  { value: 'sunday_service', label: 'Sunday Service' },
  { value: 'midweek_service', label: 'Midweek Service' },
  { value: 'prayer_meeting', label: 'Prayer Meeting' },
  { value: 'youth_service', label: 'Youth Service' },
  { value: 'children_service', label: "Children's Service" },
  { value: 'special_event', label: 'Special Event' },
] as const

/** Ministry and membership roles at RLC — a person may hold several at once. */
export const RLC_ROLES = [
  'visitor',
  'member',
  'associate',
  'full_member',
  'pastor',
  'assistant_pastor',
  'elder',
  'deacon',
  'music_director',
  'choir_director',
  'worship_leader',
  'usher',
  'media',
  'protocol',
  'youth_leader',
  'children_ministry',
  'evangelism',
  'intercessor',
  'finance',
  'administration',
] as const satisfies readonly import('@/lib/types').RlcRole[]

export const RLC_ROLE_LABELS: Record<(typeof RLC_ROLES)[number], string> = {
  visitor: 'Visitor',
  member: 'Member',
  associate: 'Associate',
  full_member: 'Full Member',
  pastor: 'Pastor',
  assistant_pastor: 'Assistant Pastor',
  elder: 'Elder',
  deacon: 'Deacon',
  music_director: 'Music Director',
  choir_director: 'Choir Director',
  worship_leader: 'Worship Leader',
  usher: 'Usher',
  media: 'Media / Tech',
  protocol: 'Protocol',
  youth_leader: 'Youth Leader',
  children_ministry: "Children's Ministry",
  evangelism: 'Evangelism',
  intercessor: 'Intercessor',
  finance: 'Finance',
  administration: 'Administration',
}

export function mergeRlcRoles(existing: string[] | undefined, incoming: string[]): string[] {
  return Array.from(new Set([...(existing ?? []), ...incoming]))
}

export function formatRlcRoles(roles: string[] | undefined): string {
  if (!roles?.length) return ''
  return roles.map((r) => RLC_ROLE_LABELS[r as keyof typeof RLC_ROLE_LABELS] ?? r).join(', ')
}
