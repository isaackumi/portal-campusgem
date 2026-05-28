'use server'

import type { AppUser, Attendance, DashboardStats, Group, GroupMembership, Member, Visitor } from '@/lib/types'
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

export async function loadMemberByUserId(userId: string): Promise<{
  data: Member | null
  error: string | null
}> {
  if (!isConvexDataSource()) {
    return { data: null, error: 'Convex is not configured' }
  }

  try {
    const { fetchMemberByUserIdFromConvex, fetchUserFromConvex } = await import('@/lib/convex/core-bridge')
    const member = await fetchMemberByUserIdFromConvex(userId)
    if (!member) return { data: null, error: null }
    const user = await fetchUserFromConvex(userId)
    if (user) return { data: { ...member, user }, error: null }
    return { data: member, error: null }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to load member by user',
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
    let groups = await fetchGroupsFromConvex(true)
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

export async function loadAllMembersSortedAction(): Promise<ApiResponse<AppUser[]>> {
  const base = await loadAllUsers()
  if (base.error || !base.data) return base
  const data = base.data
    .filter((u) => u.role !== 'visitor')
    .sort((a, b) => a.full_name.localeCompare(b.full_name))
  return { data, error: null, loading: false }
}

export async function createGroupAction(groupData: Partial<Group>): Promise<ApiResponse<Group>> {
  if (!isConvexDataSource()) {
    return { data: null, error: convexUnavailable(), loading: false }
  }
  try {
    const { createGroupInConvex } = await import('@/lib/convex/core-bridge')
    const data = await createGroupInConvex(groupData)
    return { data, error: null, loading: false }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to create group',
      loading: false,
    }
  }
}

export async function updateGroupAction(groupId: string, updates: Partial<Group>): Promise<ApiResponse<Group>> {
  if (!isConvexDataSource()) {
    return { data: null, error: convexUnavailable(), loading: false }
  }
  try {
    const { updateGroupInConvex } = await import('@/lib/convex/core-bridge')
    const data = await updateGroupInConvex(groupId, updates)
    return { data, error: null, loading: false }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to update group',
      loading: false,
    }
  }
}

export async function loadGroupByIdConvexAction(groupId: string): Promise<ApiResponse<Group>> {
  if (!isConvexDataSource()) {
    return { data: null, error: convexUnavailable(), loading: false }
  }
  try {
    const { fetchGroupFromConvex } = await import('@/lib/convex/core-bridge')
    const data = await fetchGroupFromConvex(groupId)
    return { data, error: null, loading: false }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to load group',
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

function convexUnavailable(): string {
  return 'Convex is not configured (set NEXT_PUBLIC_CONVEX_URL and CAMP_CONVEX_SERVER_SECRET on the server).'
}

export async function loadAttendanceHistoryAction(
  memberId?: string,
  limitCount: number = 50
): Promise<ApiResponse<Attendance[]>> {
  if (!isConvexDataSource()) {
    return { data: null, error: convexUnavailable(), loading: false }
  }
  try {
    const { listAttendanceFromConvex } = await import('@/lib/convex/core-bridge')
    const data = await listAttendanceFromConvex({ member_id: memberId, limit: limitCount })
    return { data, error: null, loading: false }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to load attendance',
      loading: false,
    }
  }
}

export type AttendanceRecordRow = {
  id: string
  member_id?: string
  service_date: string
  service_type?: string
  check_in_time: string
  status: string
  member: { full_name: string; membership_id: string }
}

export async function loadAttendanceRecordsAction(filters?: {
  service_date?: string
  service_type?: string
  member_id?: string
  limit?: number
  dateFilter?: string
  serviceFilter?: string
}): Promise<ApiResponse<AttendanceRecordRow[]>> {
  if (!isConvexDataSource()) {
    return { data: null, error: convexUnavailable(), loading: false }
  }
  try {
    const { listAttendanceFromConvex, fetchMemberFromConvex, fetchUserFromConvex } = await import(
      '@/lib/convex/core-bridge'
    )

    const serviceType =
      filters?.service_type ??
      (filters?.serviceFilter && filters.serviceFilter !== 'all' ? filters.serviceFilter : undefined)

    let rows = await listAttendanceFromConvex({
      member_id: filters?.member_id,
      service_date: filters?.service_date,
      service_type: serviceType as Attendance['service_type'] | undefined,
      limit: filters?.limit ?? 800,
    })

    const today = new Date().toISOString().split('T')[0]
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    const weekStartStr = weekStart.toISOString().split('T')[0]
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split('T')[0]

    switch (filters?.dateFilter) {
      case 'today':
        rows = rows.filter((r) => r.service_date === today)
        break
      case 'week':
        rows = rows.filter((r) => (r.service_date ?? '') >= weekStartStr)
        break
      case 'month':
        rows = rows.filter((r) => (r.service_date ?? '') >= monthStart)
        break
      default:
        break
    }

    const memberIds = Array.from(new Set(rows.map((r) => r.member_id).filter(Boolean) as string[]))
    const memberInfo = new Map<string, { full_name: string; membership_id: string }>()
    await Promise.all(
      memberIds.map(async (mid) => {
        const mem = await fetchMemberFromConvex(mid)
        if (!mem?.user_id) {
          memberInfo.set(mid, { full_name: '', membership_id: '' })
          return
        }
        const user = await fetchUserFromConvex(mem.user_id)
        memberInfo.set(mid, {
          full_name: user?.full_name ?? '',
          membership_id: user?.membership_id ?? '',
        })
      })
    )

    const data: AttendanceRecordRow[] = rows.map((r) => ({
      id: r.id,
      member_id: r.member_id,
      service_date: r.service_date,
      service_type: r.service_type,
      check_in_time: r.check_in_time,
      status: (r.metadata as { status?: string } | undefined)?.status ?? 'present',
      member: memberInfo.get(r.member_id ?? '') ?? { full_name: '', membership_id: '' },
    }))

    return { data, error: null, loading: false }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to load attendance records',
      loading: false,
    }
  }
}

export async function loadAttendanceStatsAction(): Promise<
  ApiResponse<{
    total_attendance: number
    today_attendance: number
    weekly_attendance: number
    monthly_attendance: number
  }>
> {
  if (!isConvexDataSource()) {
    return { data: null, error: convexUnavailable(), loading: false }
  }
  try {
    const { getAttendanceStatsFromConvex } = await import('@/lib/convex/core-bridge')
    const data = await getAttendanceStatsFromConvex()
    return { data, error: null, loading: false }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to load attendance stats',
      loading: false,
    }
  }
}

export async function loadVisitorsAction(): Promise<Visitor[]> {
  if (!isConvexDataSource()) return []
  try {
    const { listVisitorsFromConvex } = await import('@/lib/convex/core-bridge')
    return await listVisitorsFromConvex()
  } catch {
    return []
  }
}

export async function createVisitorAction(visitor: Partial<Visitor>): Promise<ApiResponse<Visitor>> {
  if (!isConvexDataSource()) {
    return { data: null, error: convexUnavailable(), loading: false }
  }
  try {
    const { createVisitorInConvex } = await import('@/lib/convex/core-bridge')
    const data = await createVisitorInConvex(visitor)
    return { data, error: null, loading: false }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to create visitor',
      loading: false,
    }
  }
}

export async function loadGroupMembersAction(groupId: string): Promise<ApiResponse<GroupMembership[]>> {
  if (!isConvexDataSource()) {
    return { data: null, error: convexUnavailable(), loading: false }
  }
  try {
    const { listGroupMembershipsFromConvex } = await import('@/lib/convex/core-bridge')
    const data = await listGroupMembershipsFromConvex(groupId)
    return { data, error: null, loading: false }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to load group members',
      loading: false,
    }
  }
}

export async function addUserToGroupAction(
  groupId: string,
  userId: string,
  role: GroupMembership['role'] = 'member'
): Promise<ApiResponse<GroupMembership>> {
  if (!isConvexDataSource()) {
    return { data: null, error: convexUnavailable(), loading: false }
  }
  try {
    const { addGroupMembershipForUserInConvex } = await import('@/lib/convex/core-bridge')
    const data = await addGroupMembershipForUserInConvex(groupId, userId, role)
    return { data, error: null, loading: false }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to add member to group',
      loading: false,
    }
  }
}

export async function removeGroupMemberAction(membershipId: string): Promise<ApiResponse<boolean>> {
  if (!isConvexDataSource()) {
    return { data: null, error: convexUnavailable(), loading: false }
  }
  try {
    const { deactivateGroupMembershipInConvex } = await import('@/lib/convex/core-bridge')
    await deactivateGroupMembershipInConvex(membershipId)
    return { data: true, error: null, loading: false }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to remove member',
      loading: false,
    }
  }
}

export async function removeUserFromGroupAction(
  groupId: string,
  userId: string
): Promise<ApiResponse<boolean>> {
  if (!isConvexDataSource()) {
    return { data: null, error: convexUnavailable(), loading: false }
  }
  try {
    const { removeGroupMembershipForUserInConvex } = await import('@/lib/convex/core-bridge')
    await removeGroupMembershipForUserInConvex(groupId, userId)
    return { data: true, error: null, loading: false }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to remove user from group',
      loading: false,
    }
  }
}

export async function updateGroupMembershipAction(
  membershipId: string,
  updates: Partial<GroupMembership>
): Promise<ApiResponse<GroupMembership>> {
  if (!isConvexDataSource()) {
    return { data: null, error: convexUnavailable(), loading: false }
  }
  try {
    const { patchGroupMembershipInConvex } = await import('@/lib/convex/core-bridge')
    const data = await patchGroupMembershipInConvex(membershipId, updates)
    return { data, error: null, loading: false }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to update membership',
      loading: false,
    }
  }
}

export async function deleteGroupAction(groupId: string): Promise<ApiResponse<boolean>> {
  if (!isConvexDataSource()) {
    return { data: null, error: convexUnavailable(), loading: false }
  }
  try {
    const { deleteGroupInConvex } = await import('@/lib/convex/core-bridge')
    await deleteGroupInConvex(groupId)
    return { data: true, error: null, loading: false }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to delete group',
      loading: false,
    }
  }
}

export async function deleteUserAction(userId: string): Promise<ApiResponse<boolean>> {
  if (!isConvexDataSource()) {
    return { data: null, error: convexUnavailable(), loading: false }
  }
  try {
    const { deleteUserInConvex } = await import('@/lib/convex/core-bridge')
    await deleteUserInConvex(userId)
    return { data: true, error: null, loading: false }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to delete user',
      loading: false,
    }
  }
}

export async function createMemberAction(memberData: Partial<Member>): Promise<ApiResponse<Member>> {
  if (!isConvexDataSource()) {
    return { data: null, error: convexUnavailable(), loading: false }
  }
  try {
    const { insertMemberInConvex, fetchUserFromConvex } = await import('@/lib/convex/core-bridge')
    const member = await insertMemberInConvex(memberData)
    if (member.user_id) {
      const user = await fetchUserFromConvex(member.user_id)
      if (user) return { data: { ...member, user }, error: null, loading: false }
    }
    return { data: member, error: null, loading: false }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to create member',
      loading: false,
    }
  }
}

export async function updateMemberAction(
  id: string,
  updates: Partial<Member>
): Promise<ApiResponse<Member>> {
  if (!isConvexDataSource()) {
    return { data: null, error: convexUnavailable(), loading: false }
  }
  try {
    const { patchMemberInConvex } = await import('@/lib/convex/core-bridge')
    const data = await patchMemberInConvex(id, updates)
    return { data, error: null, loading: false }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to update member',
      loading: false,
    }
  }
}

export async function loadUserByIdAction(userId: string): Promise<ApiResponse<AppUser>> {
  if (!isConvexDataSource()) {
    return { data: null, error: convexUnavailable(), loading: false }
  }
  try {
    const { fetchUserFromConvex } = await import('@/lib/convex/core-bridge')
    const data = await fetchUserFromConvex(userId)
    return { data, error: null, loading: false }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to load user',
      loading: false,
    }
  }
}

export async function loadUpcomingEventsAction(): Promise<
  ApiResponse<{ birthdays: Member[]; anniversaries: Member[] }>
> {
  if (!isConvexDataSource()) {
    return { data: null, error: convexUnavailable(), loading: false }
  }
  try {
    const { getUpcomingEventsFromConvex } = await import('@/lib/convex/core-bridge')
    const data = await getUpcomingEventsFromConvex()
    return { data, error: null, loading: false }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to load upcoming events',
      loading: false,
    }
  }
}

export async function loadAttendanceAnalyticsAction(filters: {
  timeRange?: string
  serviceType?: string
}): Promise<{
  data: {
    total_attendance: number
    average_attendance: number
    attendance_trend: 'up' | 'down' | 'stable'
    attendance_change_percentage: number
    service_breakdown: { service_type: string; count: number; percentage: number }[]
    daily_attendance: { date: string; count: number }[]
    weekly_attendance: { week: string; count: number }[]
    monthly_attendance: { month: string; count: number }[]
    attendance_by_gender: { gender: string; count: number }[]
  } | null
  error: string | null
}> {
  if (!isConvexDataSource()) {
    return { data: null, error: convexUnavailable() }
  }
  try {
    const { listAttendanceFromConvex } = await import('@/lib/convex/core-bridge')
    const now = new Date()
    let startDate = new Date()
    switch (filters.timeRange) {
      case '7d':
        startDate.setDate(now.getDate() - 7)
        break
      case '30d':
        startDate.setDate(now.getDate() - 30)
        break
      case '90d':
        startDate.setDate(now.getDate() - 90)
        break
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1)
        break
      default:
        startDate.setDate(now.getDate() - 30)
    }
    const startStr = startDate.toISOString().split('T')[0]
    const all = await listAttendanceFromConvex({ limit: 5000 })
    let filtered = all.filter((a) => (a.service_date ?? '') >= startStr)
    if (filters.serviceType && filters.serviceType !== 'all') {
      filtered = filtered.filter((a) => a.service_type === filters.serviceType)
    }
    const processedAnalytics = {
      total_attendance: filtered.length,
      average_attendance: 0,
      attendance_trend: 'stable' as const,
      attendance_change_percentage: 0,
      service_breakdown: [] as { service_type: string; count: number; percentage: number }[],
      daily_attendance: [] as { date: string; count: number }[],
      weekly_attendance: [] as { week: string; count: number }[],
      monthly_attendance: [] as { month: string; count: number }[],
      attendance_by_gender: [] as { gender: string; count: number }[],
    }
    return { data: processedAnalytics, error: null }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to fetch attendance analytics',
    }
  }
}
