'use server'

import { guard } from '@/lib/auth/action-guard'
import type { ApiResponse } from '@/lib/services/api-types'
import type { GroupSmsResult } from '@/lib/groups/send-group-sms'
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

export type { GroupSmsResult } from '@/lib/groups/send-group-sms'

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
  const { sendGroupSms } = await import('@/lib/groups/send-group-sms')
  return sendGroupSms(sender, input)
}

export type GroupOverview = import('@/lib/types').Group & {
  member_count: number
  leaders: Array<{ name: string; role: string; user_id?: string }>
}

/**
 * Groups index: every group (inactive too, for people who manage groups) with its active
 * member count and leaders, in one round trip.
 */
export async function loadGroupsOverviewAction(): Promise<ApiResponse<GroupOverview[]>> {
  const user = await guard('groups.view')
  try {
    const { fetchGroupsFromConvex, fetchGroupsOverviewFromConvex } = await import('@/lib/convex/core-bridge')
    const { hasPermission } = await import('@/lib/auth/roles')
    const manage = user ? hasPermission(user.role, 'groups.manage', user.permissions) : true
    const [groups, overview] = await Promise.all([fetchGroupsFromConvex(manage), fetchGroupsOverviewFromConvex()])
    const byId = new Map(overview.map((o) => [o.group_id, o]))
    const data = groups.map((g) => ({
      ...g,
      member_count: byId.get(g.id)?.member_count ?? 0,
      leaders: byId.get(g.id)?.leaders ?? [],
    }))
    return { data, error: null, loading: false }
  } catch (error: unknown) {
    return { data: null, error: error instanceof Error ? error.message : 'Could not load groups', loading: false }
  }
}
