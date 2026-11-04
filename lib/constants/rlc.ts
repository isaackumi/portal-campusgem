import type {
  AgeRange,
  RlcMembershipType,
  RlcPipelineStatus,
  RlcVisitorSource,
  VisitorFollowUpStatus,
} from '@/lib/types'

export const RLC_NAME = 'Redemption Light Chapel'
export const RLC_SHORT = 'RLC'

/** Audit id for kiosk / QR public visitor registrations (no signed-in user). */
export const PUBLIC_RLC_PERFORMED_BY = 'public:rlc-visitor-kiosk'

/** Audit id for public member self-registration. */
export const PUBLIC_RLC_MEMBER_PERFORMED_BY = 'public:rlc-member-join'

export const RLC_PUBLIC_VISIT_PATH = '/rlc/visit'
export const RLC_PUBLIC_JOIN_PATH = '/rlc/join'

export function getRlcPublicVisitUrl(origin?: string): string {
  const base =
    origin ??
    (typeof window !== 'undefined' ? window.location.origin : undefined) ??
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ??
    ''
  return `${base}${RLC_PUBLIC_VISIT_PATH}`
}

export function getRlcPublicJoinUrl(origin?: string): string {
  const base =
    origin ??
    (typeof window !== 'undefined' ? window.location.origin : undefined) ??
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ??
    ''
  return `${base}${RLC_PUBLIC_JOIN_PATH}`
}

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
  first_visit: 'border-transparent bg-sky-50 text-sky-800 ring-1 ring-inset ring-sky-600/20 dark:bg-sky-400/10 dark:text-sky-300 dark:ring-sky-400/20',
  follow_up: 'border-transparent bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/20',
  new_member: 'border-transparent bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20',
  full_member: 'border-transparent bg-brand-50 text-brand-800 ring-1 ring-inset ring-brand-600/20 dark:bg-brand-400/10 dark:text-brand-300 dark:ring-brand-400/20',
  inactive: 'border-transparent bg-neutral-100 text-neutral-600 ring-1 ring-inset ring-neutral-500/10 dark:bg-white/[0.06] dark:text-neutral-300 dark:ring-white/10',
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

export const RLC_AGE_RANGES: AgeRange[] = ['0_12', '13_17', '18_35', '36_59', '60_plus']

export const RLC_AGE_RANGE_LABELS: Record<AgeRange, string> = {
  '0_12': 'Child (0–12)',
  '13_17': 'Teen (13–17)',
  '18_35': 'Young adult (18–35)',
  '36_59': 'Adult (36–59)',
  '60_plus': 'Senior (60+)',
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
  'founder',
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
  founder: 'Founder',
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
