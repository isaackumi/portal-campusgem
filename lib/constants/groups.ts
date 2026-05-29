import type { Group, GroupMembership } from '@/lib/types'

/** Convex-backed group kinds used for campuses, events, and legacy ministries. */
export const GROUP_TYPES = [
  { value: 'campus', label: 'Campus fellowship', description: 'University or campus chapter (leaders, executives, members)' },
  {
    value: 'corporate_gem',
    label: 'Corporate Gem',
    description: 'Graduates and workers — executives, leaders, members, and activities',
  },
  { value: 'activity', label: 'General activity / event', description: 'Church-wide events (Love feat, fun fair, outreach, etc.)' },
  { value: 'ministry', label: 'Ministry', description: 'Ongoing ministry team' },
  { value: 'fellowship', label: 'Fellowship', description: 'Smaller fellowship group' },
  { value: 'age_group', label: 'Age group', description: 'Age-based fellowship' },
  { value: 'special_interest', label: 'Special interest', description: 'Interest-based group' },
  { value: 'leadership', label: 'Leadership', description: 'Leadership / executive council' },
] as const satisfies ReadonlyArray<{ value: Group['group_type']; label: string; description: string }>

export type GroupTypeValue = (typeof GROUP_TYPES)[number]['value']

export const GROUP_TYPE_LABELS: Record<GroupTypeValue, string> = Object.fromEntries(
  GROUP_TYPES.map((t) => [t.value, t.label])
) as Record<GroupTypeValue, string>

export const GROUP_MEMBERSHIP_ROLES = [
  { value: 'leader', label: 'Leader' },
  { value: 'co_leader', label: 'Co-leader' },
  { value: 'executive', label: 'Executive' },
  { value: 'member', label: 'Member' },
  { value: 'volunteer', label: 'Volunteer' },
] as const satisfies ReadonlyArray<{ value: GroupMembership['role']; label: string }>

export const GROUP_MEMBERSHIP_ROLE_LABELS: Record<GroupMembership['role'], string> = Object.fromEntries(
  GROUP_MEMBERSHIP_ROLES.map((r) => [r.value, r.label])
) as Record<GroupMembership['role'], string>

/** Suggested campus names — admins can pick or type their own. */
export const CAMPUS_NAME_SUGGESTIONS = [
  'University of Ghana (Legon)',
  'University of Education, Winneba',
  'Accra Technical University',
  'University of Cape Coast',
  'KNUST — Kwame Nkrumah University of Science and Technology',
  'University for Development Studies',
  'Central University',
  'Ashesi University',
] as const

export const ACTIVITY_NAME_SUGGESTIONS = [
  'Love Feat',
  'Fun Fair',
  'Outreach',
  'Youth Week',
  'Workers Conference',
] as const

export function getGroupTypeLabel(type: string | undefined): string {
  if (!type) return 'Group'
  return GROUP_TYPE_LABELS[type as GroupTypeValue] ?? type.replace(/_/g, ' ')
}

export function getGroupTypeBadgeClass(type: string | undefined): string {
  switch (type) {
    case 'campus':
      return 'bg-indigo-100 text-indigo-800'
    case 'corporate_gem':
      return 'bg-violet-100 text-violet-900'
    case 'activity':
      return 'bg-amber-100 text-amber-900'
    case 'ministry':
      return 'bg-blue-100 text-blue-800'
    case 'fellowship':
      return 'bg-emerald-100 text-emerald-800'
    case 'leadership':
      return 'bg-purple-100 text-purple-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}
