import { ServiceTypeMapper } from '@/lib/constants/service-types'
import { AppUser, Member, Group, GroupMembership, Attendance, Visitor, DashboardStats } from '@/lib/types'
import type { ApiResponse, PaginatedResponse } from '@/lib/services/api-types'
import { invalidateMemberCache, invalidateGroupCache, invalidateAttendanceCache, invalidateVisitorCache } from '@/lib/utils/cache'
import type { AttendanceRecordRow } from '@/lib/actions/core-data'

export type { ApiResponse, PaginatedResponse } from '@/lib/services/api-types'

function isConvexDataSource(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_CONVEX_URL)
}

function notConfigured(context: string): string {
  return `${context}: Convex is not configured (NEXT_PUBLIC_CONVEX_URL).`
}

class DataService {
  private handleError(error: unknown, context: string): string {
    console.error(`Error in ${context}:`, error)
    if (error instanceof Error) return error.message
    if (typeof error === 'string') return error
    return 'An unexpected error occurred'
  }

  private async fetchData<T>(
    query: () => Promise<{ data: T | null; error: string | null }>,
    context: string
  ): Promise<ApiResponse<T>> {
    try {
      const result = await query()
      if (result.error) throw new Error(result.error)
      return { data: result.data, error: null, loading: false }
    } catch (error) {
      return { data: null, error: this.handleError(error, context), loading: false }
    }
  }

  private async fetchPaginatedData<T>(
    query: () => Promise<{ data: T[] | null; error: string | null; count: number | null }>,
    page: number,
    limit: number,
    context: string
  ): Promise<PaginatedResponse<T>> {
    try {
      const result = await query()
      if (result.error) throw new Error(result.error)
      const data = result.data || []
      const total = result.count || 0
      const hasMore = page * limit < total
      return { data, total, page, limit, hasMore, error: null, loading: false }
    } catch (error) {
      return {
        data: [],
        total: 0,
        page,
        limit,
        hasMore: false,
        error: this.handleError(error, context),
        loading: false,
      }
    }
  }

  async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    if (!isConvexDataSource()) {
      return { data: null, error: notConfigured('getDashboardStats'), loading: false }
    }
    try {
      const response = await fetch('/api/dashboard/stats', { cache: 'no-store' })
      const body = (await response.json()) as { stats?: DashboardStats; error?: string }
      if (!response.ok) {
        return { data: null, error: body.error ?? 'Failed to load dashboard stats', loading: false }
      }
      return { data: body.stats ?? null, error: null, loading: false }
    } catch {
      return { data: null, error: 'Failed to load dashboard stats', loading: false }
    }
  }

  async getMembers(page: number = 1, limit: number = 20, search?: string): Promise<PaginatedResponse<Member>> {
    if (!isConvexDataSource()) {
      return {
        data: [],
        total: 0,
        page,
        limit,
        hasMore: false,
        error: notConfigured('getMembers'),
        loading: false,
      }
    }
    const { loadMembersPage } = await import('@/lib/actions/core-data')
    return loadMembersPage(page, limit, search)
  }

  async getMember(id: string): Promise<ApiResponse<Member>> {
    if (!isConvexDataSource()) {
      return { data: null, error: notConfigured('getMember'), loading: false }
    }
    const { loadMemberById } = await import('@/lib/actions/core-data')
    const { data, error } = await loadMemberById(id)
    return { data, error, loading: false }
  }

  async createMember(memberData: Partial<Member>): Promise<ApiResponse<Member>> {
    if (!isConvexDataSource()) {
      return { data: null, error: notConfigured('createMember'), loading: false }
    }
    const { createMemberAction } = await import('@/lib/actions/core-data')
    return createMemberAction(memberData)
  }

  async updateMember(id: string, updates: Partial<Member>): Promise<ApiResponse<Member>> {
    if (!isConvexDataSource()) {
      return { data: null, error: notConfigured('updateMember'), loading: false }
    }
    const { updateMemberAction } = await import('@/lib/actions/core-data')
    const result = await updateMemberAction(id, updates)
    if (!result.error) invalidateMemberCache()
    return result
  }

  async getGroups(page: number = 1, limit: number = 20, search?: string, type?: string): Promise<PaginatedResponse<Group>> {
    if (!isConvexDataSource()) {
      return {
        data: [],
        total: 0,
        page,
        limit,
        hasMore: false,
        error: notConfigured('getGroups'),
        loading: false,
      }
    }
    const { loadGroupsPage } = await import('@/lib/actions/core-data')
    return loadGroupsPage(page, limit, search, type)
  }

  async getGroup(id: string): Promise<ApiResponse<Group>> {
    if (!isConvexDataSource()) {
      return { data: null, error: notConfigured('getGroup'), loading: false }
    }
    const { loadGroupById } = await import('@/lib/actions/core-data')
    const { data, error } = await loadGroupById(id)
    return { data, error, loading: false }
  }

  async createGroup(groupData: Partial<Group>): Promise<ApiResponse<Group>> {
    if (!isConvexDataSource()) {
      return { data: null, error: notConfigured('createGroup'), loading: false }
    }
    const { createGroupAction } = await import('@/lib/actions/core-data')
    const result = await createGroupAction(groupData)
    if (!result.error) invalidateGroupCache()
    return result
  }

  async updateGroup(id: string, updates: Partial<Group>): Promise<ApiResponse<Group>> {
    if (!isConvexDataSource()) {
      return { data: null, error: notConfigured('updateGroup'), loading: false }
    }
    const { updateGroupAction } = await import('@/lib/actions/core-data')
    const result = await updateGroupAction(id, updates)
    if (!result.error) invalidateGroupCache()
    return result
  }

  async getGroupMembers(groupId: string): Promise<ApiResponse<GroupMembership[]>> {
    if (!isConvexDataSource()) {
      return { data: null, error: notConfigured('getGroupMembers'), loading: false }
    }
    const { loadGroupMembersAction } = await import('@/lib/actions/core-data')
    return loadGroupMembersAction(groupId)
  }

  async addGroupMember(groupId: string, memberId: string, role: string): Promise<ApiResponse<GroupMembership>> {
    if (!isConvexDataSource()) {
      return { data: null, error: notConfigured('addGroupMember'), loading: false }
    }
    const { addUserToGroupAction } = await import('@/lib/actions/core-data')
    return addUserToGroupAction(groupId, memberId, role as GroupMembership['role'])
  }

  async removeGroupMember(membershipId: string): Promise<ApiResponse<boolean>> {
    if (!isConvexDataSource()) {
      return { data: null, error: notConfigured('removeGroupMember'), loading: false }
    }
    const { removeGroupMemberAction } = await import('@/lib/actions/core-data')
    return removeGroupMemberAction(membershipId)
  }

  async getAttendanceHistory(memberId?: string, limitCount: number = 50): Promise<ApiResponse<Attendance[]>> {
    if (!isConvexDataSource()) {
      return { data: null, error: notConfigured('getAttendanceHistory'), loading: false }
    }
    const { loadAttendanceHistoryAction } = await import('@/lib/actions/core-data')
    return loadAttendanceHistoryAction(memberId, limitCount)
  }

  async createAttendance(attendanceData: Partial<Attendance>): Promise<ApiResponse<Attendance>> {
    if (!isConvexDataSource()) {
      return { data: null, error: notConfigured('createAttendance'), loading: false }
    }
    const { saveAttendanceRecord } = await import('@/lib/actions/core-data')
    const { data, error } = await saveAttendanceRecord(attendanceData)
    if (data) invalidateAttendanceCache()
    return { data, error, loading: false }
  }

  async recordAttendance(data: {
    member_id: string
    service_date: string
    service_type: string
    check_in_time: string
    status?: string
    checked_in_by?: string
  }): Promise<ApiResponse<Attendance>> {
    if (!isConvexDataSource()) {
      return { data: null, error: notConfigured('recordAttendance'), loading: false }
    }
    const { saveAttendanceRecord } = await import('@/lib/actions/core-data')
    const serviceType = ServiceTypeMapper.toEnum(data.service_type)
    const { data: row, error } = await saveAttendanceRecord({
      member_id: data.member_id,
      service_date: data.service_date,
      service_type: serviceType,
      check_in_time: data.check_in_time,
      method: 'admin',
      checked_in_by: data.checked_in_by,
      metadata: data.status ? { status: data.status } : undefined,
    })
    if (row) invalidateAttendanceCache()
    return { data: row, error, loading: false }
  }

  async getAttendanceRecords(filters?: {
    service_date?: string
    service_type?: string
    member_id?: string
    limit?: number
    dateFilter?: string
    serviceFilter?: string
  }): Promise<ApiResponse<AttendanceRecordRow[]>> {
    if (!isConvexDataSource()) {
      return { data: null, error: notConfigured('getAttendanceRecords'), loading: false }
    }
    const { loadAttendanceRecordsAction } = await import('@/lib/actions/core-data')
    return loadAttendanceRecordsAction(filters)
  }

  async getAttendanceStats(): Promise<
    ApiResponse<{
      total_attendance: number
      today_attendance: number
      weekly_attendance: number
      monthly_attendance: number
    }>
  > {
    if (!isConvexDataSource()) {
      return { data: null, error: notConfigured('getAttendanceStats'), loading: false }
    }
    const { loadAttendanceStatsAction } = await import('@/lib/actions/core-data')
    return loadAttendanceStatsAction()
  }

  async getVisitors(page: number = 1, limit: number = 20, search?: string): Promise<PaginatedResponse<Visitor>> {
    if (!isConvexDataSource()) {
      return {
        data: [],
        total: 0,
        page,
        limit,
        hasMore: false,
        error: notConfigured('getVisitors'),
        loading: false,
      }
    }
    return this.fetchPaginatedData(async () => {
      const { loadVisitorsAction } = await import('@/lib/actions/core-data')
      let rows = await loadVisitorsAction()
      if (search?.trim()) {
        const s = search.toLowerCase()
        rows = rows.filter(
          (v) =>
            v.first_name.toLowerCase().includes(s) ||
            (v.last_name?.toLowerCase().includes(s) ?? false) ||
            (v.phone?.includes(search) ?? false)
        )
      }
      const total = rows.length
      const data = rows.slice((page - 1) * limit, page * limit)
      return { data, error: null, count: total }
    }, page, limit, 'getVisitors')
  }

  async createVisitor(visitorData: Partial<Visitor>): Promise<ApiResponse<Visitor>> {
    if (!isConvexDataSource()) {
      return { data: null, error: notConfigured('createVisitor'), loading: false }
    }
    const { createVisitorAction } = await import('@/lib/actions/core-data')
    const result = await createVisitorAction(visitorData)
    if (!result.error) invalidateVisitorCache()
    return result
  }

  async getUpcomingEvents(): Promise<ApiResponse<{ birthdays: Member[]; anniversaries: Member[] }>> {
    if (!isConvexDataSource()) {
      return { data: null, error: notConfigured('getUpcomingEvents'), loading: false }
    }
    const { loadUpcomingEventsAction } = await import('@/lib/actions/core-data')
    return loadUpcomingEventsAction()
  }

  async getAttendanceByMember(memberId: string, limitCount: number = 50): Promise<ApiResponse<Attendance[]>> {
    return this.getAttendanceHistory(memberId, limitCount)
  }

  async getAttendanceAnalytics(filters: { timeRange?: string; serviceType?: string } = {}): Promise<{
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
      return { data: null, error: notConfigured('getAttendanceAnalytics') }
    }
    const { loadAttendanceAnalyticsAction } = await import('@/lib/actions/core-data')
    return loadAttendanceAnalyticsAction(filters)
  }

  async createUser(userData: Partial<AppUser>): Promise<ApiResponse<AppUser>> {
    if (!isConvexDataSource()) {
      return { data: null, error: notConfigured('createUser'), loading: false }
    }
    const { createUserRecord } = await import('@/lib/actions/core-data')
    return createUserRecord(userData)
  }

  async updateUser(userId: string, updates: Partial<AppUser>): Promise<ApiResponse<AppUser>> {
    if (!isConvexDataSource()) {
      return { data: null, error: notConfigured('updateUser'), loading: false }
    }
    const { updateUserRecord } = await import('@/lib/actions/core-data')
    return updateUserRecord(userId, updates)
  }

  async deleteUser(userId: string): Promise<ApiResponse<boolean>> {
    if (!isConvexDataSource()) {
      return { data: null, error: notConfigured('deleteUser'), loading: false }
    }
    const { deleteUserAction } = await import('@/lib/actions/core-data')
    return deleteUserAction(userId)
  }

  async getAllUsers(): Promise<ApiResponse<AppUser[]>> {
    if (!isConvexDataSource()) {
      return { data: null, error: notConfigured('getAllUsers'), loading: false }
    }
    const { loadAllUsers } = await import('@/lib/actions/core-data')
    return loadAllUsers()
  }

  async getUserById(userId: string): Promise<ApiResponse<AppUser>> {
    if (!isConvexDataSource()) {
      return { data: null, error: notConfigured('getUserById'), loading: false }
    }
    const { loadUserByIdAction } = await import('@/lib/actions/core-data')
    return loadUserByIdAction(userId)
  }

  async createGroupNew(groupData: Partial<Group>): Promise<ApiResponse<Group>> {
    if (!isConvexDataSource()) {
      return { data: null, error: notConfigured('createGroupNew'), loading: false }
    }
    const { createGroupAction } = await import('@/lib/actions/core-data')
    const result = await createGroupAction(groupData)
    if (!result.error) invalidateGroupCache()
    return result
  }

  async updateGroupNew(groupId: string, updates: Partial<Group>): Promise<ApiResponse<Group>> {
    if (!isConvexDataSource()) {
      return { data: null, error: notConfigured('updateGroupNew'), loading: false }
    }
    const { updateGroupAction } = await import('@/lib/actions/core-data')
    const result = await updateGroupAction(groupId, updates)
    if (!result.error) invalidateGroupCache()
    return result
  }

  async deleteGroupNew(groupId: string): Promise<ApiResponse<boolean>> {
    if (!isConvexDataSource()) {
      return { data: null, error: notConfigured('deleteGroupNew'), loading: false }
    }
    const { deleteGroupAction } = await import('@/lib/actions/core-data')
    const result = await deleteGroupAction(groupId)
    if (!result.error) invalidateGroupCache()
    return result
  }

  async getGroupByIdNew(groupId: string): Promise<ApiResponse<Group>> {
    if (!isConvexDataSource()) {
      return { data: null, error: notConfigured('getGroupByIdNew'), loading: false }
    }
    const { loadGroupByIdConvexAction } = await import('@/lib/actions/core-data')
    return loadGroupByIdConvexAction(groupId)
  }

  async addUserToGroup(groupId: string, userId: string, role: string = 'member'): Promise<ApiResponse<GroupMembership>> {
    if (!isConvexDataSource()) {
      return { data: null, error: notConfigured('addUserToGroup'), loading: false }
    }
    const { addUserToGroupAction } = await import('@/lib/actions/core-data')
    return addUserToGroupAction(groupId, userId, role as GroupMembership['role'])
  }

  async removeUserFromGroup(groupId: string, userId: string): Promise<ApiResponse<boolean>> {
    if (!isConvexDataSource()) {
      return { data: null, error: notConfigured('removeUserFromGroup'), loading: false }
    }
    const { removeUserFromGroupAction } = await import('@/lib/actions/core-data')
    return removeUserFromGroupAction(groupId, userId)
  }

  async updateGroupMembership(
    membershipId: string,
    updates: Partial<GroupMembership>
  ): Promise<ApiResponse<GroupMembership>> {
    if (!isConvexDataSource()) {
      return { data: null, error: notConfigured('updateGroupMembership'), loading: false }
    }
    const { updateGroupMembershipAction } = await import('@/lib/actions/core-data')
    return updateGroupMembershipAction(membershipId, updates)
  }

  async getAllMembers(): Promise<ApiResponse<AppUser[]>> {
    if (!isConvexDataSource()) {
      return { data: null, error: notConfigured('getAllMembers'), loading: false }
    }
    const { loadAllMembersSortedAction } = await import('@/lib/actions/core-data')
    return loadAllMembersSortedAction()
  }
}

export const dataService = new DataService()
