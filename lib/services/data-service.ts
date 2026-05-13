import { db } from '@/lib/firebase/client'
import { ServiceTypeMapper } from '@/lib/constants/service-types'
import { AppUser, Member, Group, GroupMembership, Attendance, Visitor, DashboardStats } from '@/lib/types'
import type { ApiResponse, PaginatedResponse } from '@/lib/services/api-types'
import { cache, cacheKeys, cacheTTL, invalidateMemberCache, invalidateGroupCache, invalidateAttendanceCache, invalidateVisitorCache } from '@/lib/utils/cache'
import { toMember, toAppUser, toAttendance, toGroup, toFirestoreAttendance } from '@/lib/firebase/mappers'
import {
  collection,
  doc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  getCountFromServer,
  type QueryConstraint,
} from 'firebase/firestore'

export type { ApiResponse, PaginatedResponse } from '@/lib/services/api-types'

function isConvexDataSource(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_CONVEX_URL)
}

class DataService {
  private get membersRef() {
    return collection(db, 'members')
  }
  private get usersRef() {
    return collection(db, 'users')
  }
  private get attendanceRef() {
    return collection(db, 'attendance')
  }
  private get groupsRef() {
    return collection(db, 'groups')
  }
  private get visitorsRef() {
    return collection(db, 'visitors')
  }
  private get groupMembershipsRef() {
    return collection(db, 'groupMemberships')
  }

  // Generic error handler
  private handleError(error: any, context: string): string {
    console.error(`Error in ${context}:`, error)
    console.error('Error type:', typeof error)
    console.error('Error keys:', error ? Object.keys(error) : 'No keys')
    
    if (error?.message) {
      return error.message
    }
    
    if (error?.details) {
      return error.details
    }
    
    if (error?.hint) {
      return error.hint
    }
    
    if (typeof error === 'string') {
      return error
    }
    
    if (error && typeof error === 'object') {
      return JSON.stringify(error)
    }
    
    return 'An unexpected error occurred'
  }

  // Generic data fetcher with loading states
  private async fetchData<T>(
    query: () => Promise<{ data: T | null; error: any }>,
    context: string
  ): Promise<ApiResponse<T>> {
    try {
      const result = await query()
      
      if (result.error) {
        throw result.error
      }
      
      return {
        data: result.data,
        error: null,
        loading: false
      }
    } catch (error) {
      return {
        data: null,
        error: this.handleError(error, context),
        loading: false
      }
    }
  }

  // Generic paginated data fetcher
  private async fetchPaginatedData<T>(
    query: () => Promise<{ data: T[] | null; error: any; count: number | null }>,
    page: number = 1,
    limit: number = 20,
    context: string
  ): Promise<PaginatedResponse<T>> {
    try {
      const result = await query()
      
      if (result.error) {
        throw result.error
      }
      
      const data = result.data || []
      const total = result.count || 0
      const hasMore = (page * limit) < total
      
      return {
        data,
        total,
        page,
        limit,
        hasMore,
        error: null,
        loading: false
      }
    } catch (error) {
      return {
        data: [],
        total: 0,
        page,
        limit,
        hasMore: false,
        error: this.handleError(error, context),
        loading: false
      }
    }
  }

  // Dashboard Data
  async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    if (isConvexDataSource()) {
      try {
        const response = await fetch('/api/dashboard/stats', { cache: 'no-store' })
        const body = (await response.json()) as { stats?: DashboardStats; error?: string }
        if (!response.ok) {
          return {
            data: null,
            error: body.error ?? 'Failed to load dashboard stats',
            loading: false,
          }
        }
        return { data: body.stats ?? null, error: null, loading: false }
      } catch {
        return { data: null, error: 'Failed to load dashboard stats', loading: false }
      }
    }

    const cacheKey = cacheKeys.dashboardStats()
    const cached = cache.get<DashboardStats>(cacheKey)
    
    if (cached) {
      return { data: cached, error: null, loading: false }
    }

    return this.fetchData(async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const today = new Date().toISOString().split('T')[0]

      const [membersSnap, groupsSnap, attendanceSnap, visitorsSnap] = await Promise.all([
        getDocs(query(this.membersRef, where('status', '==', 'active'))),
        getDocs(query(this.groupsRef, where('isActive', '==', true))),
        getDocs(query(this.attendanceRef, where('serviceDate', '>=', thirtyDaysAgo))),
        getDocs(query(this.visitorsRef, where('visitDate', '>=', thirtyDaysAgo)))
      ])

      const totalMembers = membersSnap.size
      const totalGroups = groupsSnap.size
      const recentAttendance = attendanceSnap.size
      const recentVisitors = visitorsSnap.size

      const todayAttendance = attendanceSnap.docs.filter(d => d.data().serviceDate === today).length

      // Resolve member refs for gender/age (sample from attendance)
      let maleAttendance = 0
      let femaleAttendance = 0
      let adultAttendance = 0
      let childrenAttendance = 0
      const memberIds = new Set(
        attendanceSnap.docs.map(d => {
          const v = d.data().memberId
          return typeof v === 'string' ? v : v?.id
        }).filter(Boolean) as string[]
      )
      if (memberIds.size > 0) {
        const memberSnaps = await Promise.all(
          Array.from(memberIds).slice(0, 200).map((id: string) => getDoc(doc(this.membersRef, id)))
        )
        memberSnaps.forEach(mSnap => {
          const m = mSnap.data()
          if (!m) return
          if (m.gender === 'male') maleAttendance++
          if (m.gender === 'female') femaleAttendance++
          if (m.dob) {
            const age = new Date().getFullYear() - new Date(m.dob).getFullYear()
            if (age >= 18) adultAttendance++
            else childrenAttendance++
          }
        })
      }

      const stats: DashboardStats = {
        total_members: totalMembers,
        active_members: totalMembers,
        visitors: recentVisitors,
        today_attendance: todayAttendance,
        weekly_attendance: recentAttendance,
        monthly_donations: 0,
        pending_pledges: 0,
        prayer_requests: 0,
        upcoming_birthdays: 0,
        upcoming_anniversaries: 0,
        groups_count: totalGroups,
        recent_visitors: recentVisitors,
        attendance_rate: totalMembers > 0 ? Math.round((recentAttendance / totalMembers) * 100) : 0,
        visitor_conversion_rate: recentVisitors > 0 ? Math.round((recentVisitors / (recentVisitors + totalMembers)) * 100) : 0,
        male_attendance: maleAttendance,
        female_attendance: femaleAttendance,
        adult_attendance: adultAttendance,
        children_attendance: childrenAttendance,
        total_attendance: recentAttendance
      }

      cache.set(cacheKey, stats, cacheTTL.MEDIUM)
      return { data: stats, error: null }
    }, 'getDashboardStats')
  }

  // Members Data
  async getMembers(page: number = 1, limit: number = 20, search?: string): Promise<PaginatedResponse<Member>> {
    if (isConvexDataSource()) {
      const { loadMembersPage } = await import('@/lib/actions/core-data')
      return loadMembersPage(page, limit, search)
    }

    try {
      // Skip cache in development to prevent heavy caching issues
      const isDevelopment = process.env.NODE_ENV === 'development'
      const cacheKey = cacheKeys.members(page, limit, search)
      
      if (!isDevelopment) {
        const cached = cache.get<{ data: Member[]; total: number }>(cacheKey)
        
        if (cached) {
          const hasMore = (page * limit) < cached.total
          return {
            data: cached.data,
            total: cached.total,
            page,
            limit,
            hasMore,
            error: null,
            loading: false
          }
        }
      }

      console.log('Fetching members with params:', { page, limit, search })

      return this.fetchPaginatedData(async () => {
        const membersSnap = await getDocs(
          query(
            this.membersRef,
            where('status', '==', 'active'),
            orderBy('createdAt', 'desc')
          )
        )

        let members: Member[] = membersSnap.docs.map(doc => toMember(doc.id, doc.data()))

        if (search && members.length > 0) {
          const searchLower = search.toLowerCase()
          const userIds = Array.from(new Set(members.map(m => m.user_id).filter(Boolean)))
          const userSnaps = await Promise.all(userIds.map(uid => getDoc(doc(this.usersRef, uid))))
          const userMap = new Map<string, AppUser>()
          userSnaps.forEach(snap => {
            if (snap.exists()) userMap.set(snap.id, toAppUser(snap.id, snap.data()!))
          })
          members = members.filter(m => {
            const user = userMap.get(m.user_id)
            const fullName = user?.full_name?.toLowerCase() || ''
            const membershipId = user?.membership_id?.toLowerCase() || ''
            const phone = user?.phone || ''
            const email = user?.email?.toLowerCase() || ''
            return fullName.includes(searchLower) || membershipId.includes(searchLower) || phone.includes(search) || email.includes(searchLower)
          })
        }

        const totalCount = members.length
        const paginatedData = members.slice((page - 1) * limit, page * limit)

        if (paginatedData.length > 0) {
          const userIds = Array.from(new Set(paginatedData.map(m => m.user_id).filter(Boolean)))
          const userSnaps = await Promise.all(userIds.map(uid => getDoc(doc(this.usersRef, uid))))
          const userMap = new Map<string, AppUser>()
          userSnaps.forEach(snap => {
            if (snap.exists()) userMap.set(snap.id, toAppUser(snap.id, snap.data()!))
          })
          paginatedData.forEach(m => {
            (m as Member & { user?: AppUser }).user = userMap.get(m.user_id)
          })
        }

        if (paginatedData && !isDevelopment) {
          cache.set(cacheKey, { data: paginatedData, total: totalCount }, cacheTTL.MEDIUM)
        }
        return { data: paginatedData, error: null, count: totalCount }
      }, page, limit, 'getMembers')
    } catch (error) {
      console.error('Error in getMembers:', error)
      return {
        data: [],
        total: 0,
        page,
        limit,
        hasMore: false,
        error: this.handleError(error, 'getMembers'),
        loading: false
      }
    }
  }

  async getMember(id: string): Promise<ApiResponse<Member>> {
    if (isConvexDataSource()) {
      const { loadMemberById } = await import('@/lib/actions/core-data')
      const { data, error } = await loadMemberById(id)
      return { data, error, loading: false }
    }

    return this.fetchData(async () => {
      const memberSnap = await getDoc(doc(this.membersRef, id))
      if (!memberSnap.exists()) {
        return { data: null, error: null }
      }
      const member = toMember(memberSnap.id, memberSnap.data()!)
      const userId = member.user_id
      if (userId) {
        const userSnap = await getDoc(doc(this.usersRef, userId))
        if (userSnap.exists()) (member as Member & { user?: AppUser }).user = toAppUser(userSnap.id, userSnap.data()!)
      }
      return { data: member, error: null }
    }, 'getMember')
  }

  async createMember(memberData: Partial<Member>): Promise<ApiResponse<Member>> {
    return this.fetchData(async () => {
      const data: Record<string, unknown> = {
        userId: memberData.user_id,
        dob: memberData.dob,
        gender: memberData.gender,
        address: memberData.address,
        emergencyContacts: memberData.emergency_contacts ?? [],
        profilePhoto: memberData.profile_photo,
        documents: memberData.documents ?? [],
        status: memberData.status ?? 'active',
        notes: memberData.notes,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }
      const ref = await addDoc(this.membersRef, data)
      invalidateMemberCache()
      const member = toMember(ref.id, { ...data, createdAt: new Date(), updatedAt: new Date() })
      if (member.user_id) {
        const userSnap = await getDoc(doc(this.usersRef, member.user_id))
        if (userSnap.exists()) (member as Member & { user?: AppUser }).user = toAppUser(userSnap.id, userSnap.data()!)
      }
      return { data: member, error: null }
    }, 'createMember')
  }

  async updateMember(id: string, updates: Partial<Member>): Promise<ApiResponse<Member>> {
    return this.fetchData(async () => {
      const firestoreUpdates: Record<string, unknown> = {
        updatedAt: serverTimestamp(),
      }
      if (updates.user_id !== undefined) firestoreUpdates.userId = updates.user_id
      if (updates.dob !== undefined) firestoreUpdates.dob = updates.dob
      if (updates.gender !== undefined) firestoreUpdates.gender = updates.gender
      if (updates.address !== undefined) firestoreUpdates.address = updates.address
      if (updates.emergency_contacts !== undefined) firestoreUpdates.emergencyContacts = updates.emergency_contacts
      if (updates.profile_photo !== undefined) firestoreUpdates.profilePhoto = updates.profile_photo
      if (updates.documents !== undefined) firestoreUpdates.documents = updates.documents
      if (updates.status !== undefined) firestoreUpdates.status = updates.status
      if (updates.notes !== undefined) firestoreUpdates.notes = updates.notes
      await updateDoc(doc(this.membersRef, id), firestoreUpdates)
      const memberSnap = await getDoc(doc(this.membersRef, id))
      const member = toMember(memberSnap.id, memberSnap.data()!)
      const userSnap = member.user_id ? await getDoc(doc(this.usersRef, member.user_id)) : null
      if (userSnap?.exists()) (member as Member & { user?: AppUser }).user = toAppUser(userSnap.id, userSnap.data()!)
      return { data: member, error: null }
    }, 'updateMember')
  }

  // Groups Data
  async getGroups(page: number = 1, limit: number = 20, search?: string, type?: string): Promise<PaginatedResponse<Group>> {
    if (isConvexDataSource()) {
      const { loadGroupsPage } = await import('@/lib/actions/core-data')
      return loadGroupsPage(page, limit, search, type)
    }

    return this.fetchPaginatedData(async () => {
      const q = type
        ? query(this.groupsRef, where('isActive', '==', true), where('groupType', '==', type), orderBy('name', 'asc'))
        : query(this.groupsRef, where('isActive', '==', true), orderBy('name', 'asc'))
      const snap = await getDocs(q)
      let groups = snap.docs.map(d => toGroup(d.id, d.data()))
      if (search) {
        const s = search.toLowerCase()
        groups = groups.filter(g => (g.name?.toLowerCase().includes(s)) || (g.description?.toLowerCase().includes(s)))
      }
      const total = groups.length
      const data = groups.slice((page - 1) * limit, page * limit)
      return { data, error: null, count: total }
    }, page, limit, 'getGroups')
  }

  async getGroup(id: string): Promise<ApiResponse<Group>> {
    if (isConvexDataSource()) {
      const { loadGroupById } = await import('@/lib/actions/core-data')
      const { data, error } = await loadGroupById(id)
      return { data, error, loading: false }
    }

    return this.fetchData(async () => {
      const snap = await getDoc(doc(this.groupsRef, id))
      if (!snap.exists()) return { data: null, error: null }
      const data = toGroup(snap.id, snap.data()!)
      return { data, error: null }
    }, 'getGroup')
  }

  async createGroup(groupData: Partial<Group>): Promise<ApiResponse<Group>> {
    return this.fetchData(async () => {
      const ref = await addDoc(this.groupsRef, {
        name: groupData.name,
        description: groupData.description,
        groupType: groupData.group_type ?? 'ministry',
        leaderId: groupData.leader_id,
        coLeaderId: groupData.co_leader_id,
        meetingSchedule: groupData.meeting_schedule,
        meetingLocation: groupData.meeting_location,
        maxMembers: groupData.max_members,
        isOpen: groupData.is_open,
        requiresApproval: groupData.requires_approval,
        isActive: groupData.is_active ?? true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      const snap = await getDoc(ref)
      const data = toGroup(snap.id, snap.data()!)
      return { data, error: null }
    }, 'createGroup')
  }

  async updateGroup(id: string, updates: Partial<Group>): Promise<ApiResponse<Group>> {
    return this.fetchData(async () => {
      const u: Record<string, unknown> = { updatedAt: serverTimestamp() }
      if (updates.name !== undefined) u.name = updates.name
      if (updates.description !== undefined) u.description = updates.description
      if (updates.group_type !== undefined) u.groupType = updates.group_type
      if (updates.leader_id !== undefined) u.leaderId = updates.leader_id
      if (updates.co_leader_id !== undefined) u.coLeaderId = updates.co_leader_id
      if (updates.meeting_schedule !== undefined) u.meetingSchedule = updates.meeting_schedule
      if (updates.meeting_location !== undefined) u.meetingLocation = updates.meeting_location
      if (updates.max_members !== undefined) u.maxMembers = updates.max_members
      if (updates.is_open !== undefined) u.isOpen = updates.is_open
      if (updates.requires_approval !== undefined) u.requiresApproval = updates.requires_approval
      if (updates.is_active !== undefined) u.isActive = updates.is_active
      await updateDoc(doc(this.groupsRef, id), u)
      const snap = await getDoc(doc(this.groupsRef, id))
      const data = toGroup(snap.id, snap.data()!)
      return { data, error: null }
    }, 'updateGroup')
  }

  // Group Memberships
  async getGroupMembers(groupId: string): Promise<ApiResponse<GroupMembership[]>> {
    return this.fetchData(async () => {
      const snap = await getDocs(
        query(
          this.groupMembershipsRef,
          where('groupId', '==', groupId),
          where('isActive', '==', true),
          orderBy('joinedDate', 'desc')
        )
      )
      const data = snap.docs.map(d => {
        const x = d.data()
        return {
          id: d.id,
          group_id: x.groupId ?? d.id,
          member_id: x.memberId ?? '',
          role: x.role ?? 'member',
          joined_date: typeof x.joinedDate?.toDate === 'function' ? x.joinedDate.toDate().toISOString() : x.joinedDate ?? '',
          is_active: x.isActive ?? true,
          created_at: typeof x.createdAt?.toDate === 'function' ? x.createdAt.toDate().toISOString() : x.createdAt ?? '',
        } as GroupMembership
      })
      return { data, error: null }
    }, 'getGroupMembers')
  }

  async addGroupMember(groupId: string, memberId: string, role: string): Promise<ApiResponse<GroupMembership>> {
    return this.fetchData(async () => {
      const ref = await addDoc(this.groupMembershipsRef, {
        groupId,
        memberId,
        role,
        joinedDate: new Date().toISOString(),
        isActive: true,
        createdAt: serverTimestamp(),
      })
      const snap = await getDoc(ref)
      const x = snap.data()!
      const data: GroupMembership = {
        id: snap.id,
        group_id: groupId,
        member_id: memberId,
        role: role as GroupMembership['role'],
        joined_date: x.joinedDate ?? new Date().toISOString(),
        is_active: true,
        created_at: typeof x.createdAt?.toDate === 'function' ? x.createdAt.toDate().toISOString() : '',
      }
      return { data, error: null }
    }, 'addGroupMember')
  }

  async removeGroupMember(membershipId: string): Promise<ApiResponse<boolean>> {
    return this.fetchData(async () => {
      await updateDoc(doc(this.groupMembershipsRef, membershipId), { isActive: false, updatedAt: serverTimestamp() })
      return { data: true, error: null }
    }, 'removeGroupMember')
  }

  // Attendance Data
  async getAttendanceHistory(memberId?: string, limitCount: number = 50): Promise<ApiResponse<Attendance[]>> {
    return this.fetchData(async () => {
      const q = memberId
        ? query(this.attendanceRef, where('memberId', '==', memberId), orderBy('serviceDate', 'desc'), limit(limitCount))
        : query(this.attendanceRef, orderBy('serviceDate', 'desc'), limit(limitCount))
      const snap = await getDocs(q)
      const data = snap.docs.map(d => toAttendance(d.id, d.data()))
      return { data, error: null }
    }, 'getAttendanceHistory')
  }

  async createAttendance(attendanceData: Partial<Attendance>): Promise<ApiResponse<Attendance>> {
    if (isConvexDataSource()) {
      const { saveAttendanceRecord } = await import('@/lib/actions/core-data')
      const { data, error } = await saveAttendanceRecord(attendanceData)
      if (data) invalidateAttendanceCache()
      return { data, error, loading: false }
    }

    return this.fetchData(async () => {
      const payload = { ...toFirestoreAttendance(attendanceData), createdAt: serverTimestamp() }
      const ref = await addDoc(this.attendanceRef, payload)
      invalidateAttendanceCache()
      const created = { id: ref.id, ...payload, createdAt: new Date() }
      const data = toAttendance(ref.id, created)
      return { data, error: null }
    }, 'createAttendance')
  }

  async recordAttendance(data: {
    member_id: string
    service_date: string
    service_type: string
    check_in_time: string
    status?: string
    checked_in_by?: string
  }): Promise<ApiResponse<any>> {
    return this.fetchData(async () => {
      const serviceType = ServiceTypeMapper.toEnum(data.service_type)
      const ref = await addDoc(this.attendanceRef, {
        memberId: data.member_id,
        serviceDate: data.service_date,
        serviceType,
        checkInTime: data.check_in_time,
        method: 'admin',
        status: data.status ?? 'present',
        checkedInBy: data.checked_in_by,
        createdAt: serverTimestamp(),
      })
      invalidateAttendanceCache()
      const snap = await getDoc(ref)
      const result = toAttendance(snap.id, snap.data()!)
      return { data: result, error: null }
    }, 'recordAttendance')
  }

  async getAttendanceRecords(filters?: {
    service_date?: string
    service_type?: string
    member_id?: string
    limit?: number
  }): Promise<ApiResponse<any[]>> {
    return this.fetchData(async () => {
      const constraints: QueryConstraint[] = [orderBy('checkInTime', 'desc')]
      if (filters?.service_date) constraints.push(where('serviceDate', '==', filters.service_date))
      if (filters?.service_type) constraints.push(where('serviceType', '==', filters.service_type))
      if (filters?.member_id) constraints.push(where('memberId', '==', filters.member_id))
      if (filters?.limit) constraints.push(limit(filters.limit))
      const snap = await getDocs(query(this.attendanceRef, ...constraints))
      const data = snap.docs.map(d => {
        const x = d.data()
        return {
          id: d.id,
          member_id: x.memberId,
          service_date: x.serviceDate,
          service_type: x.serviceType,
          check_in_time: typeof x.checkInTime?.toDate === 'function' ? x.checkInTime.toDate().toISOString() : x.checkInTime,
        }
      })
      return { data, error: null }
    }, 'getAttendanceRecords')
  }

  async getAttendanceStats(): Promise<ApiResponse<{
    total_attendance: number
    today_attendance: number
    weekly_attendance: number
    monthly_attendance: number
  }>> {
    return this.fetchData(async () => {
      const now = new Date()
      const today = now.toISOString().split('T')[0]
      const weekStart = new Date(now)
      weekStart.setDate(weekStart.getDate() - weekStart.getDay())
      const weekStartStr = weekStart.toISOString().split('T')[0]
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      const [totalSnap, todaySnap, weekSnap, monthSnap] = await Promise.all([
        getCountFromServer(query(this.attendanceRef)),
        getCountFromServer(query(this.attendanceRef, where('serviceDate', '==', today))),
        getCountFromServer(query(this.attendanceRef, where('serviceDate', '>=', weekStartStr))),
        getCountFromServer(query(this.attendanceRef, where('serviceDate', '>=', monthStart))),
      ])
      const stats = {
        total_attendance: totalSnap.data().count,
        today_attendance: todaySnap.data().count,
        weekly_attendance: weekSnap.data().count,
        monthly_attendance: monthSnap.data().count,
      }
      return { data: stats, error: null }
    }, 'getAttendanceStats')
  }

  // Visitors Data
  async getVisitors(page: number = 1, limit: number = 20, search?: string): Promise<PaginatedResponse<Visitor>> {
    return this.fetchPaginatedData(async () => {
      const snap = await getDocs(query(this.visitorsRef, orderBy('visitDate', 'desc')))
      let docs = snap.docs
      if (search) {
        const s = search.toLowerCase()
        docs = docs.filter(d => {
          const x = d.data()
          return (x.firstName ?? '').toLowerCase().includes(s) || (x.lastName ?? '').toLowerCase().includes(s) || (x.phone ?? '').includes(search)
        })
      }
      const total = docs.length
      const data = docs.slice((page - 1) * limit, page * limit).map(d => {
        const x = d.data()
        return {
          id: d.id,
          first_name: x.firstName ?? x.first_name ?? '',
          last_name: x.lastName ?? x.last_name,
          phone: x.phone,
          email: x.email,
          address: x.address,
          visit_date: typeof x.visitDate?.toDate === 'function' ? x.visitDate.toDate().toISOString().split('T')[0] : x.visitDate ?? '',
          follow_up_completed: x.followUpCompleted ?? false,
          converted_to_member: x.convertedToMember ?? false,
          is_active: x.isActive ?? true,
          created_at: typeof x.createdAt?.toDate === 'function' ? x.createdAt.toDate().toISOString() : '',
        } as Visitor
      })
      return { data, error: null, count: total }
    }, page, limit, 'getVisitors')
  }

  async createVisitor(visitorData: Partial<Visitor>): Promise<ApiResponse<Visitor>> {
    return this.fetchData(async () => {
      const ref = await addDoc(this.visitorsRef, {
        firstName: visitorData.first_name,
        lastName: visitorData.last_name,
        phone: visitorData.phone,
        email: visitorData.email,
        address: visitorData.address,
        visitDate: visitorData.visit_date ?? new Date().toISOString().split('T')[0],
        followUpCompleted: visitorData.follow_up_completed ?? false,
        convertedToMember: visitorData.converted_to_member ?? false,
        isActive: visitorData.is_active ?? true,
        createdAt: serverTimestamp(),
      })
      const snap = await getDoc(ref)
      const x = snap.data()!
      const createdStr = typeof x.createdAt?.toDate === 'function' ? x.createdAt.toDate().toISOString() : ''
      const data: Visitor = {
        id: snap.id,
        first_name: x.firstName ?? '',
        last_name: x.lastName,
        phone: x.phone,
        email: x.email,
        address: x.address,
        visit_date: x.visitDate ?? '',
        follow_up_completed: x.followUpCompleted ?? false,
        converted_to_member: x.convertedToMember ?? false,
        is_active: x.isActive ?? true,
        created_at: createdStr,
        updated_at: createdStr,
      }
      return { data, error: null }
    }, 'createVisitor')
  }

  // Upcoming Events
  async getUpcomingEvents(): Promise<ApiResponse<{ birthdays: Member[]; anniversaries: Member[] }>> {
    if (isConvexDataSource()) {
      return {
        data: { birthdays: [], anniversaries: [] },
        error: null,
        loading: false,
      }
    }

    return this.fetchData(async () => {
      const snap = await getDocs(query(this.membersRef, where('status', '==', 'active')))
      const members: Member[] = []
      for (const d of snap.docs) {
        const m = toMember(d.id, d.data())
        if (!m.dob) continue
        const userSnap = m.user_id ? await getDoc(doc(this.usersRef, m.user_id)) : null
        if (userSnap?.exists()) (m as Member & { user?: AppUser }).user = toAppUser(userSnap.id, userSnap.data()!)
        members.push(m)
      }
      const upcomingBirthdays = members.filter(m => {
        const days = this.getUpcomingEventDays(m.dob!, 'birthday')
        return days !== null && days <= 30
      })
      const upcomingAnniversaries = members.filter(m => {
        const user = (m as Member & { user?: AppUser }).user
        if (user?.marital_status !== 'married' || !user?.anniversary_date) return false
        const days = this.getUpcomingEventDays(user.anniversary_date, 'anniversary')
        return days !== null && days <= 30
      })
      return {
        data: {
          birthdays: upcomingBirthdays.sort((a, b) => (this.getUpcomingEventDays(a.dob!, 'birthday') ?? 999) - (this.getUpcomingEventDays(b.dob!, 'birthday') ?? 999)),
          anniversaries: upcomingAnniversaries.sort((a, b) => (this.getUpcomingEventDays((a as Member & { user?: AppUser }).user?.anniversary_date!, 'anniversary') ?? 999) - (this.getUpcomingEventDays((b as Member & { user?: AppUser }).user?.anniversary_date!, 'anniversary') ?? 999))
        },
        error: null
      }
    }, 'getUpcomingEvents')
  }

  async getAttendanceByMember(memberId: string, limitCount: number = 50): Promise<ApiResponse<Attendance[]>> {
    return this.fetchData(async () => {
      const snap = await getDocs(
        query(
          this.attendanceRef,
          where('memberId', '==', memberId),
          orderBy('serviceDate', 'desc'),
          limit(limitCount)
        )
      )
      const data = snap.docs.map(d => toAttendance(d.id, d.data()))
      return { data, error: null }
    }, 'getAttendanceByMember')
  }

  private getUpcomingEventDays(dateString: string, type: 'birthday' | 'anniversary'): number | null {
    try {
      const today = new Date()
      const eventDate = new Date(dateString)
      const currentYear = today.getFullYear()
      
      // Set the event date to this year
      const thisYearEvent = new Date(eventDate)
      thisYearEvent.setFullYear(currentYear)
      
      // If the event has already passed this year, set it to next year
      if (thisYearEvent < today) {
        thisYearEvent.setFullYear(currentYear + 1)
      }
      
      const diffTime = thisYearEvent.getTime() - today.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      return diffDays >= 0 ? diffDays : null
    } catch (error) {
      return null
    }
  }



  async getAttendanceAnalytics(filters: {
    timeRange?: string
    serviceType?: string
  } = {}): Promise<{ data: any, error: string | null }> {
    try {
      // Calculate date range
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

      const q = filters.serviceType && filters.serviceType !== 'all'
        ? query(
            this.attendanceRef,
            where('serviceDate', '>=', startDate.toISOString().split('T')[0]),
            where('serviceType', '==', filters.serviceType)
          )
        : query(this.attendanceRef, where('serviceDate', '>=', startDate.toISOString().split('T')[0]))
      const attendanceSnap = await getDocs(q)
      const attendanceData = attendanceSnap.docs.map(d => d.data())

      // Process analytics data (simplified version)
      const processedAnalytics = {
        total_attendance: attendanceData?.length || 0,
        average_attendance: 0,
        attendance_trend: 'stable' as const,
        attendance_change_percentage: 0,
        service_breakdown: [],
        daily_attendance: [],
        weekly_attendance: [],
        monthly_attendance: [],
        attendance_by_gender: []
      }

      return { data: processedAnalytics, error: null }
    } catch (error) {
      console.error('Error fetching attendance analytics:', error)
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Failed to fetch attendance analytics'
      }
    }
  }

  // User Management Methods
  async createUser(userData: Partial<AppUser>): Promise<ApiResponse<AppUser>> {
    if (isConvexDataSource()) {
      const { createUserRecord } = await import('@/lib/actions/core-data')
      return createUserRecord(userData)
    }

    return this.fetchData(async () => {
      const data = {
        authUid: userData.auth_uid || this.generateUUID(),
        fullName: userData.full_name ?? '',
        membershipId: userData.membership_id,
        phone: userData.phone,
        email: userData.email,
        role: userData.role ?? 'member',
        joinYear: userData.join_year ?? new Date().getFullYear(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }
      const ref = await addDoc(this.usersRef, data)
      await addDoc(this.membersRef, { userId: ref.id, status: 'active', createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
      const user = toAppUser(ref.id, { ...data, createdAt: new Date(), updatedAt: new Date() })
      return { data: user, error: null }
    }, 'createUser')
  }

  async updateUser(userId: string, updates: Partial<AppUser>): Promise<ApiResponse<AppUser>> {
    if (isConvexDataSource()) {
      const { updateUserRecord } = await import('@/lib/actions/core-data')
      return updateUserRecord(userId, updates)
    }

    return this.fetchData(async () => {
      const u: Record<string, unknown> = { updatedAt: serverTimestamp() }
      if (updates.full_name !== undefined) u.fullName = updates.full_name
      if (updates.membership_id !== undefined) u.membershipId = updates.membership_id
      if (updates.phone !== undefined) u.phone = updates.phone
      if (updates.email !== undefined) u.email = updates.email
      if (updates.role !== undefined) u.role = updates.role
      if (updates.join_year !== undefined) u.joinYear = updates.join_year
      await updateDoc(doc(this.usersRef, userId), u)
      const snap = await getDoc(doc(this.usersRef, userId))
      const data = toAppUser(snap.id, snap.data()!)
      return { data, error: null }
    }, 'updateUser')
  }

  async deleteUser(userId: string): Promise<ApiResponse<boolean>> {
    return this.fetchData(async () => {
      const membersSnap = await getDocs(query(this.membersRef, where('userId', '==', userId)))
      for (const d of membersSnap.docs) await deleteDoc(d.ref)
      await deleteDoc(doc(this.usersRef, userId))
      return { data: true, error: null }
    }, 'deleteUser')
  }

  async getAllUsers(): Promise<ApiResponse<AppUser[]>> {
    if (isConvexDataSource()) {
      const { loadAllUsers } = await import('@/lib/actions/core-data')
      return loadAllUsers()
    }

    return this.fetchData(async () => {
      const snap = await getDocs(query(this.usersRef, orderBy('createdAt', 'desc')))
      const data = snap.docs.map(d => toAppUser(d.id, d.data()))
      return { data, error: null }
    }, 'getAllUsers')
  }

  async getUserById(userId: string): Promise<ApiResponse<AppUser>> {
    return this.fetchData(async () => {
      const snap = await getDoc(doc(this.usersRef, userId))
      if (!snap.exists()) return { data: null, error: null }
      const data = toAppUser(snap.id, snap.data()!)
      return { data, error: null }
    }, 'getUserById')
  }

  // Group Management Methods (updated to avoid duplicates)
  async createGroupNew(groupData: Partial<Group>): Promise<ApiResponse<Group>> {
    if (isConvexDataSource()) {
      const { createGroupInConvex } = await import('@/lib/convex/core-bridge')
      const data = await createGroupInConvex(groupData)
      return { data, error: null, loading: false }
    }

    return this.fetchData(async () => {
      const ref = await addDoc(this.groupsRef, {
        name: groupData.name,
        description: groupData.description,
        groupType: groupData.group_type ?? 'ministry',
        leaderId: groupData.leader_id,
        coLeaderId: groupData.co_leader_id,
        meetingSchedule: groupData.meeting_schedule,
        meetingLocation: groupData.meeting_location,
        maxMembers: groupData.max_members,
        isOpen: groupData.is_open,
        requiresApproval: groupData.requires_approval,
        isActive: groupData.is_active ?? true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      const snap = await getDoc(ref)
      const data = toGroup(snap.id, snap.data()!)
      return { data, error: null }
    }, 'createGroupNew')
  }

  async updateGroupNew(groupId: string, updates: Partial<Group>): Promise<ApiResponse<Group>> {
    if (isConvexDataSource()) {
      const { updateGroupInConvex } = await import('@/lib/convex/core-bridge')
      const data = await updateGroupInConvex(groupId, updates)
      return { data, error: null, loading: false }
    }

    return this.fetchData(async () => {
      const u: Record<string, unknown> = { updatedAt: serverTimestamp() }
      if (updates.name !== undefined) u.name = updates.name
      if (updates.description !== undefined) u.description = updates.description
      if (updates.group_type !== undefined) u.groupType = updates.group_type
      if (updates.leader_id !== undefined) u.leaderId = updates.leader_id
      if (updates.co_leader_id !== undefined) u.coLeaderId = updates.co_leader_id
      if (updates.meeting_schedule !== undefined) u.meetingSchedule = updates.meeting_schedule
      if (updates.meeting_location !== undefined) u.meetingLocation = updates.meeting_location
      if (updates.max_members !== undefined) u.maxMembers = updates.max_members
      if (updates.is_open !== undefined) u.isOpen = updates.is_open
      if (updates.requires_approval !== undefined) u.requiresApproval = updates.requires_approval
      if (updates.is_active !== undefined) u.isActive = updates.is_active
      await updateDoc(doc(this.groupsRef, groupId), u)
      const snap = await getDoc(doc(this.groupsRef, groupId))
      const data = toGroup(snap.id, snap.data()!)
      return { data, error: null }
    }, 'updateGroupNew')
  }

  async deleteGroupNew(groupId: string): Promise<ApiResponse<boolean>> {
    const membershipsSnap = await getDocs(query(this.groupMembershipsRef, where('groupId', '==', groupId)))
    for (const d of membershipsSnap.docs) await deleteDoc(d.ref)
    await deleteDoc(doc(this.groupsRef, groupId))
    return this.fetchData(async () => ({ data: true, error: null }), 'deleteGroupNew')
  }

  async getGroupByIdNew(groupId: string): Promise<ApiResponse<Group>> {
    if (isConvexDataSource()) {
      const { fetchGroupFromConvex } = await import('@/lib/convex/core-bridge')
      const data = await fetchGroupFromConvex(groupId)
      return { data, error: null, loading: false }
    }

    return this.fetchData(async () => {
      const snap = await getDoc(doc(this.groupsRef, groupId))
      if (!snap.exists()) return { data: null, error: null }
      const data = toGroup(snap.id, snap.data()!)
      return { data, error: null }
    }, 'getGroupByIdNew')
  }

  // Group Membership Management
  async addUserToGroup(groupId: string, userId: string, role: string = 'member'): Promise<ApiResponse<GroupMembership>> {
    return this.fetchData(async () => {
      const ref = await addDoc(this.groupMembershipsRef, {
        groupId,
        userId,
        role,
        joinedAt: new Date().toISOString(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      const snap = await getDoc(ref)
      const x = snap.data()!
      const data: GroupMembership = {
        id: snap.id,
        group_id: groupId,
        member_id: userId,
        role: role as GroupMembership['role'],
        joined_date: x.joinedAt ?? '',
        is_active: true,
        created_at: typeof x.createdAt?.toDate === 'function' ? x.createdAt.toDate().toISOString() : '',
      }
      return { data, error: null }
    }, 'addUserToGroup')
  }

  async removeUserFromGroup(groupId: string, userId: string): Promise<ApiResponse<boolean>> {
    return this.fetchData(async () => {
      const snap = await getDocs(
        query(
          this.groupMembershipsRef,
          where('groupId', '==', groupId),
          where('userId', '==', userId)
        )
      )
      for (const d of snap.docs) await deleteDoc(d.ref)
      return { data: true, error: null }
    }, 'removeUserFromGroup')
  }

  async updateGroupMembership(membershipId: string, updates: Partial<GroupMembership>): Promise<ApiResponse<GroupMembership>> {
    return this.fetchData(async () => {
      const u: Record<string, unknown> = { updatedAt: serverTimestamp() }
      if (updates.role !== undefined) u.role = updates.role
      if (updates.is_active !== undefined) u.isActive = updates.is_active
      await updateDoc(doc(this.groupMembershipsRef, membershipId), u)
      const snap = await getDoc(doc(this.groupMembershipsRef, membershipId))
      const x = snap.data()!
      const data: GroupMembership = {
        id: snap.id,
        group_id: x.groupId,
        member_id: x.memberId ?? x.userId,
        role: x.role ?? 'member',
        joined_date: typeof x.joinedDate?.toDate === 'function' ? x.joinedDate.toDate().toISOString().split('T')[0] : x.joinedDate ?? '',
        is_active: x.isActive ?? true,
        created_at: typeof x.createdAt?.toDate === 'function' ? x.createdAt.toDate().toISOString() : '',
      }
      return { data, error: null }
    }, 'updateGroupMembership')
  }

  // Utility methods
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }

  async getAllMembers(): Promise<ApiResponse<AppUser[]>> {
    return this.fetchData(async () => {
      const snap = await getDocs(query(this.usersRef, orderBy('fullName', 'asc')))
      const data = snap.docs.map(d => toAppUser(d.id, d.data())).filter(u => u.role !== 'visitor')
      return { data, error: null }
    }, 'getAllMembers')
  }
}

// Export singleton instance
export const dataService = new DataService()
