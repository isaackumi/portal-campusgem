'use server'

import { guard } from '@/lib/auth/action-guard'
import type { ApiResponse } from '@/lib/services/api-types'
import type { AppUser, Member } from '@/lib/types'
import type { CommsRecipient, SendCommsResult } from '@/lib/comms/types'
import type { GroupSummaryRow } from '@/lib/groups/export'

function isConvexDataSource(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_CONVEX_URL)
}

function failure<T>(error: unknown, fallback: string): ApiResponse<T> {
  return { data: null, error: error instanceof Error ? error.message : fallback, loading: false }
}

/**
 * One row per group (leader, member count, schedule…) for the Groups list "Export".
 * Applies the same search / type filter as the list page.
 */
export async function exportGroupsSummaryAction(params?: {
  search?: string
  type?: string
}): Promise<ApiResponse<GroupSummaryRow[]>> {
  await guard('groups.view')
  if (!isConvexDataSource()) {
    return { data: null, error: 'Database is not configured.', loading: false }
  }
  try {
    const { fetchGroupsFromConvex, fetchUsersFromConvex, listGroupMembershipsFromConvex } =
      await import('@/lib/convex/core-bridge')

    let groups = await fetchGroupsFromConvex(true)
    if (params?.type && params.type !== 'all') {
      groups = groups.filter((g) => g.group_type === params.type)
    }
    const needle = params?.search?.trim().toLowerCase()
    if (needle) {
      groups = groups.filter(
        (g) => g.name.toLowerCase().includes(needle) || (g.description?.toLowerCase().includes(needle) ?? false)
      )
    }

    const [users, counts] = await Promise.all([
      fetchUsersFromConvex(),
      Promise.all(groups.map((g) => listGroupMembershipsFromConvex(g.id).then((rows) => rows.length))),
    ])
    const userById = new Map(users.map((u) => [u.id, u]))

    const data = groups.map((g, index): GroupSummaryRow => {
      const leader = g.leader_id ? userById.get(g.leader_id) : undefined
      const coLeader = g.co_leader_id ? userById.get(g.co_leader_id) : undefined
      return {
        name: g.name,
        group_type: g.group_type,
        is_active: g.is_active,
        leader_name: leader?.full_name,
        leader_phone: leader?.phone,
        co_leader_name: coLeader?.full_name,
        member_count: counts[index] ?? 0,
        max_members: g.max_members,
        meeting_schedule: g.meeting_schedule,
        meeting_location: g.meeting_location,
        description: g.description,
        created_at: g.created_at,
      }
    })
    return { data, error: null, loading: false }
  } catch (error: unknown) {
    return failure(error, 'Failed to export groups')
  }
}

export type GroupSmsResult = SendCommsResult & {
  /** Members in the chunk with no usable phone number (not sent, not logged). */
  skipped: number
}

/**
 * Text members of one group. The client sends member ids in small chunks (background
 * job); recipients are re-resolved here, so only real members of this group are texted,
 * and the sender is the signed-in user. {{name}} / {{full_name}} / {{membership_id}}
 * are filled in per member by `sendCommunications`.
 */
export async function sendGroupSmsAction(input: {
  group_id: string
  member_ids: string[]
  message: string
  batch_id?: string
  dry_run?: boolean
}): Promise<ApiResponse<GroupSmsResult>> {
  const sender = await guard('sms.send')
  if (!sender) return { data: null, error: 'Sign in again to send messages.', loading: false }
  if (!isConvexDataSource()) {
    return { data: null, error: 'Database is not configured.', loading: false }
  }
  const message = input.message?.trim()
  if (!message) return { data: null, error: 'Message is required', loading: false }
  if (!input.group_id || !input.member_ids?.length) {
    return { data: null, error: 'No recipients', loading: false }
  }
  if (input.member_ids.length > 100) {
    return { data: null, error: 'Send at most 100 recipients per request', loading: false }
  }

  try {
    const { fetchGroupFromConvex, fetchMemberFromConvex, fetchUserFromConvex, listGroupMembershipsFromConvex } =
      await import('@/lib/convex/core-bridge')
    const { memberToRecipient } = await import('@/lib/comms/recipients')
    const { isValidSmsPhone } = await import('@/lib/comms/sms-client')
    const { sendCommunications } = await import('@/lib/comms/send')

    const [group, memberships] = await Promise.all([
      fetchGroupFromConvex(input.group_id),
      listGroupMembershipsFromConvex(input.group_id),
    ])
    if (!group) return { data: null, error: 'Group not found', loading: false }

    const inGroup = new Set(memberships.map((m) => m.member_id))
    const wanted = Array.from(new Set(input.member_ids)).filter((id) => inGroup.has(id))

    const profiles = (await Promise.all(wanted.map((id) => fetchMemberFromConvex(id)))).filter(
      (p): p is Member => p != null
    )
    const users = await Promise.all(profiles.map((p) => (p.user_id ? fetchUserFromConvex(p.user_id) : null)))

    const recipients: CommsRecipient[] = []
    let skipped = input.member_ids.length - wanted.length
    profiles.forEach((profile, index) => {
      const user = users[index] as AppUser | null
      const recipient = memberToRecipient({ ...profile, user: user ?? undefined }, 'church')
      if (recipient && isValidSmsPhone(recipient.phone)) recipients.push(recipient)
      else skipped++
    })
    skipped += wanted.length - profiles.length

    if (recipients.length === 0) {
      return {
        data: { batch_id: input.batch_id ?? '', success_count: 0, error_count: 0, errors: [], records: [], skipped },
        error: null,
        loading: false,
      }
    }

    const result = await sendCommunications({
      module: 'church',
      channel: 'sms',
      audience_type: 'group',
      sender_id: sender.id,
      message_body: message,
      recipients,
      batch_id: input.batch_id,
      dry_run: Boolean(input.dry_run),
      filter_criteria: { group_id: group.id },
      metadata: { group_id: group.id, group_name: group.name },
    })
    // Records can be large; the client only needs the counts.
    return { data: { ...result, records: [], skipped }, error: null, loading: false }
  } catch (error: unknown) {
    return failure(error, 'Failed to send messages')
  }
}
