import type { GroupMembership } from '@/lib/types'
import { GROUP_MEMBERSHIP_ROLE_LABELS, getGroupTypeLabel } from '@/lib/constants/groups'
import { csvDate, slugForFilename, textCell, toCsv } from '@/lib/csv'

/** Leaders first, then by name: the order people expect a roster in. */
const ROLE_ORDER: Record<GroupMembership['role'], number> = {
  leader: 0,
  co_leader: 1,
  executive: 2,
  volunteer: 3,
  member: 4,
}

export function groupMembersToCsv(memberships: GroupMembership[]): string {
  const rows = [...memberships]
    .map((row) => ({ row, user: row.member?.user }))
    .sort(
      (a, b) =>
        (ROLE_ORDER[a.row.role] ?? 9) - (ROLE_ORDER[b.row.role] ?? 9) ||
        (a.user?.full_name ?? '').localeCompare(b.user?.full_name ?? '')
    )
    .map(({ row, user }) => [
      user?.full_name?.trim() || 'Unknown member',
      textCell(user?.membership_id),
      GROUP_MEMBERSHIP_ROLE_LABELS[row.role] ?? row.role,
      textCell(user?.phone),
      textCell(user?.whatsapp && user.whatsapp !== user.phone ? user.whatsapp : ''),
      user?.email ?? '',
      csvDate(row.joined_date || row.created_at),
    ])

  return toCsv(
    ['Name', 'Membership ID', 'Role in group', 'Phone', 'WhatsApp', 'Email', 'Joined'],
    rows
  )
}

export type GroupSummaryRow = {
  name: string
  group_type: string
  is_active: boolean
  leader_name?: string
  leader_phone?: string
  co_leader_name?: string
  member_count: number
  max_members?: number
  meeting_schedule?: string
  meeting_location?: string
  description?: string
  created_at?: string
}

export function groupsSummaryToCsv(groups: GroupSummaryRow[]): string {
  return toCsv(
    [
      'Group',
      'Type',
      'Status',
      'Leader',
      'Leader phone',
      'Co-leader',
      'Members',
      'Capacity',
      'Meets',
      'Location',
      'Description',
      'Created',
    ],
    groups.map((g) => [
      g.name,
      getGroupTypeLabel(g.group_type),
      g.is_active ? 'Active' : 'Inactive',
      g.leader_name ?? '',
      textCell(g.leader_phone),
      g.co_leader_name ?? '',
      g.member_count,
      g.max_members ?? '',
      g.meeting_schedule ?? '',
      g.meeting_location ?? '',
      g.description ?? '',
      csvDate(g.created_at),
    ])
  )
}

export function groupExportFilename(name: string, now = new Date()): string {
  return `${slugForFilename(name)}-${now.toISOString().slice(0, 10)}.csv`
}
