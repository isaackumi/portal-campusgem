'use server'

import type { AppUser, Attendance, DashboardStats, Group, Member } from '@/lib/types'
import type { ApiResponse, PaginatedResponse } from '@/lib/services/api-types'
import { generateMembershipId, normalizeMembershipId } from '@/lib/membershipId'

function isConvexDataSource(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_CONVEX_URL)
}

function paginate<T>(items: T[], page: number, limit: number): PaginatedResponse<T> {
  const total = items.length
  const data = items.slice((page - 1) * limit, page * limit)
  return {
    data,
    total,
    page,
    limit,
    hasMore: page * limit < total,
    error: null,
    loading: false,
  }
}

function matchesMemberSearch(member: Member, user: AppUser | undefined, search: string): boolean {
  const searchLower = search.toLowerCase()
  const fullName = user?.full_name?.toLowerCase() ?? ''
  const membershipId = user?.membership_id?.toLowerCase() ?? ''
  const phone = user?.phone ?? ''
  const email = user?.email?.toLowerCase() ?? ''
  return (
    fullName.includes(searchLower) ||
    membershipId.includes(searchLower) ||
    phone.includes(search) ||
    email.includes(searchLower)
  )
}

async function attachUsersToMembers(members: Member[]): Promise<Member[]> {
  if (members.length === 0) return members
  const { fetchUserFromConvex } = await import('@/lib/convex/core-bridge')
  const userIds = Array.from(new Set(members.map((m) => m.user_id).filter(Boolean)))
  const users = await Promise.all(userIds.map((id) => fetchUserFromConvex(id)))
  const userMap = new Map<string, AppUser>()
  users.forEach((user) => {
    if (user) userMap.set(user.id, user)
  })
  return members.map((member) => {
    const user = userMap.get(member.user_id)
    if (!user) return member
    return { ...member, user }
  })
}

export async function loadMembersPage(
  page: number,
  limit: number,
  search?: string
): Promise<PaginatedResponse<Member>> {
  if (!isConvexDataSource()) {
    return {
      data: [],
      total: 0,
      page,
      limit,
      hasMore: false,
      error: 'Convex is not configured',
      loading: false,
    }
  }

  try {
    const { fetchMembersFromConvex } = await import('@/lib/convex/core-bridge')
    let members = await fetchMembersFromConvex()

    if (search?.trim()) {
      const { fetchUserFromConvex } = await import('@/lib/convex/core-bridge')
      const userIds = Array.from(new Set(members.map((m) => m.user_id).filter(Boolean)))
      const users = await Promise.all(userIds.map((id) => fetchUserFromConvex(id)))
      const userMap = new Map<string, AppUser>()
      users.forEach((user) => {
        if (user) userMap.set(user.id, user)
      })
      members = members.filter((member) =>
        matchesMemberSearch(member, userMap.get(member.user_id), search.trim())
      )
    }

    const pageResult = paginate(members, page, limit)
    pageResult.data = await attachUsersToMembers(pageResult.data)
    return pageResult
  } catch (error: unknown) {
    return {
      data: [],
      total: 0,
      page,
      limit,
      hasMore: false,
      error: error instanceof Error ? error.message : 'Failed to load members',
      loading: false,
    }
  }
}

export async function loadMemberById(id: string): Promise<{
  data: Member | null
  error: string | null
}> {
  if (!isConvexDataSource()) {
    return { data: null, error: 'Convex is not configured' }
  }

  try {
    const { fetchMemberFromConvex, fetchUserFromConvex } = await import('@/lib/convex/core-bridge')
    const member = await fetchMemberFromConvex(id)
    if (!member) return { data: null, error: null }
    if (member.user_id) {
      const user = await fetchUserFromConvex(member.user_id)
      if (user) return { data: { ...member, user }, error: null }
    }
    return { data: member, error: null }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to load member',
    }
  }
}

export async function loadDashboardStats(): Promise<{
  data: DashboardStats | null
  error: string | null
}> {
  if (!isConvexDataSource()) {
    return { data: null, error: 'Convex is not configured' }
  }

  try {
    const { fetchDashboardStatsFromConvex } = await import('@/lib/convex/core-bridge')
    const data = await fetchDashboardStatsFromConvex()
    return { data, error: null }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to load dashboard stats',
    }
  }
}

export async function loadGroupsPage(
  page: number,
  limit: number,
  search?: string,
  type?: string
): Promise<PaginatedResponse<Group>> {
  if (!isConvexDataSource()) {
    return {
      data: [],
      total: 0,
      page,
      limit,
      hasMore: false,
      error: 'Convex is not configured',
      loading: false,
    }
  }

  try {
    const { fetchGroupsFromConvex } = await import('@/lib/convex/core-bridge')
    let groups = await fetchGroupsFromConvex()
    if (type && type !== 'all') {
      groups = groups.filter((group) => group.group_type === type)
    }
    if (search?.trim()) {
      const s = search.toLowerCase()
      groups = groups.filter(
        (group) =>
          group.name.toLowerCase().includes(s) ||
          (group.description?.toLowerCase().includes(s) ?? false)
      )
    }
    return paginate(groups, page, limit)
  } catch (error: unknown) {
    return {
      data: [],
      total: 0,
      page,
      limit,
      hasMore: false,
      error: error instanceof Error ? error.message : 'Failed to load groups',
      loading: false,
    }
  }
}

export async function loadGroupById(id: string): Promise<{ data: Group | null; error: string | null }> {
  if (!isConvexDataSource()) {
    return { data: null, error: 'Convex is not configured' }
  }

  try {
    const { fetchGroupFromConvex } = await import('@/lib/convex/core-bridge')
    const data = await fetchGroupFromConvex(id)
    return { data, error: null }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to load group',
    }
  }
}

export async function loadAllUsers(): Promise<ApiResponse<AppUser[]>> {
  if (!isConvexDataSource()) {
    return { data: null, error: 'Convex is not configured', loading: false }
  }

  try {
    const { fetchUsersFromConvex } = await import('@/lib/convex/core-bridge')
    const data = await fetchUsersFromConvex()
    return { data, error: null, loading: false }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to load users',
      loading: false,
    }
  }
}

export async function updateUserRecord(
  userId: string,
  updates: Partial<AppUser>
): Promise<ApiResponse<AppUser>> {
  if (!isConvexDataSource()) {
    return { data: null, error: 'Convex is not configured', loading: false }
  }

  try {
    const { updateUserInConvex } = await import('@/lib/convex/core-bridge')
    const data = await updateUserInConvex(userId, updates)
    return { data, error: null, loading: false }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to update user',
      loading: false,
    }
  }
}

export async function createUserRecord(userData: Partial<AppUser>): Promise<ApiResponse<AppUser>> {
  if (!isConvexDataSource()) {
    return { data: null, error: 'Convex is not configured', loading: false }
  }

  if (!userData.full_name?.trim() || !userData.phone?.trim()) {
    return { data: null, error: 'Name and phone are required', loading: false }
  }

  const membershipId = normalizeMembershipId(
    userData.membership_id?.trim() ||
      generateMembershipId(userData.phone.trim(), userData.join_year ?? new Date().getFullYear())
  )

  try {
    const { bootstrapUserInConvex } = await import('@/lib/convex/core-bridge')
    const data = await bootstrapUserInConvex({
      full_name: userData.full_name.trim(),
      phone: userData.phone.trim(),
      role: userData.role ?? 'member',
      email: userData.email,
      membership_id: membershipId,
      auth_uid: userData.auth_uid ?? crypto.randomUUID(),
      join_year: userData.join_year,
    })
    return { data, error: null, loading: false }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to create user',
      loading: false,
    }
  }
}

export async function saveAttendanceRecord(
  attendanceData: Partial<Attendance>
): Promise<{ data: Attendance | null; error: string | null }> {
  if (!isConvexDataSource()) {
    return { data: null, error: 'Convex is not configured' }
  }

  try {
    const { recordAttendanceInConvex } = await import('@/lib/convex/core-bridge')
    const data = await recordAttendanceInConvex(attendanceData)
    return { data, error: null }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to record attendance',
    }
  }
}
