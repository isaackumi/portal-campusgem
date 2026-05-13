import { useState, useEffect, useCallback, useRef } from 'react'
import { useQuery, useInfiniteQuery, keepPreviousData } from '@tanstack/react-query'
import { dataService, ApiResponse, PaginatedResponse } from '@/lib/services/data-service'
import { AppUser, Member, Group, GroupMembership, Attendance, Visitor, DashboardStats } from '@/lib/types'

// Generic hook for data fetching
export function useApiData<T>(
  fetchFn: () => Promise<ApiResponse<T>>,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await fetchFn()
      
      if (result.error) {
        setError(result.error)
        setData(null)
      } else {
        setData(result.data)
        setError(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, dependencies)

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const refetch = useCallback(() => {
    fetchData()
  }, [fetchData])

  return { data, error, loading, refetch }
}

// Generic hook for paginated data
export function usePaginatedData<T>(
  fetchFn: (page: number, limit: number, search?: string, filter?: string) => Promise<PaginatedResponse<T>>,
  initialPage: number = 1,
  initialLimit: number = 20,
  initialSearch: string = '',
  initialFilter: string = ''
) {
  const fetchFnRef = useRef(fetchFn)
  fetchFnRef.current = fetchFn

  const [data, setData] = useState<T[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(initialPage)
  const [limit] = useState(initialLimit)
  const [search, setSearch] = useState(initialSearch)
  const [filter, setFilter] = useState(initialFilter)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async (pageNum: number = page, searchTerm: string = search, filterValue: string = filter) => {
    try {
      setLoading(true)
      setError(null)
      const result = await fetchFnRef.current(pageNum, limit, searchTerm, filterValue)
      
      if (result.error) {
        setError(result.error)
      } else {
        setData(result.data)
        setTotal(result.total)
        setHasMore(result.hasMore)
        setError(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }, [page, limit, search, filter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const refetch = useCallback(() => {
    fetchData()
  }, [fetchData])

  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      const nextPage = page + 1
      setPage(nextPage)
      fetchData(nextPage, search, filter)
    }
  }, [hasMore, loading, page, search, filter, fetchData])

  const searchData = useCallback((searchTerm: string) => {
    setSearch(searchTerm)
    setPage(1)
    fetchData(1, searchTerm, filter)
  }, [fetchData, filter])

  const filterData = useCallback((filterValue: string) => {
    setFilter(filterValue)
    setPage(1)
    fetchData(1, search, filterValue)
  }, [fetchData, search])

  return {
    data,
    total,
    page,
    hasMore,
    error,
    loading,
    refetch,
    loadMore,
    search: searchData,
    filter: filterData
  }
}

// Dashboard hooks
export function useDashboardStats() {
  return useApiData(() => dataService.getDashboardStats())
}

export function useUpcomingEvents() {
  return useApiData(() => dataService.getUpcomingEvents())
}

// Members hooks
export function useMembers(page: number = 1, limit: number = 20, search: string = '') {
  const query = useQuery({
    queryKey: ['members', page, limit, search],
    queryFn: async () => dataService.getMembers(page, limit, search),
    placeholderData: keepPreviousData,
    staleTime: 30_000
  })

  const data = query.data?.data ?? []
  const total = query.data?.total ?? 0
  const hasMore = page * limit < total

  return {
    data,
    total,
    hasMore,
    error: query.data?.error ?? (query.error ? (query.error as Error).message : null),
    loading: query.isLoading || query.isFetching,
    refetch: () => query.refetch(),
    loadMore: () => {},
    search: () => {},
    filter: () => {}
  }
}

export function useMember(id: string) {
  const query = useQuery({
    queryKey: ['member', id],
    queryFn: async () => dataService.getMember(id),
    enabled: Boolean(id),
    staleTime: 30_000
  })

  return {
    data: query.data?.data ?? null,
    error: query.data?.error ?? (query.error ? (query.error as Error).message : null),
    loading: query.isLoading || query.isFetching,
    refetch: () => query.refetch()
  }
}

export function useCreateMember() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createMember = useCallback(async (memberData: Partial<Member>) => {
    try {
      setLoading(true)
      setError(null)
      const result = await dataService.createMember(memberData)
      
      if (result.error) {
        setError(result.error)
        return null
      }
      
      return result.data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create member'
      setError(errorMessage)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return { createMember, loading, error }
}

export function useUpdateMember() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateMember = useCallback(async (id: string, updates: Partial<Member>) => {
    try {
      setLoading(true)
      setError(null)
      const result = await dataService.updateMember(id, updates)
      
      if (result.error) {
        setError(result.error)
        return null
      }
      
      return result.data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update member'
      setError(errorMessage)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return { updateMember, loading, error }
}

// Groups hooks
export function useGroups(page: number = 1, limit: number = 20, search: string = '', type: string = '') {
  return usePaginatedData(
    (pageNum, pageLimit, searchTerm, filterValue) => 
      dataService.getGroups(pageNum, pageLimit, searchTerm, filterValue),
    page,
    limit,
    search,
    type
  )
}

export function useGroup(id: string) {
  return useApiData(() => dataService.getGroup(id), [id])
}


// Group Memberships hooks
export function useGroupMembers(groupId: string) {
  return useApiData(() => dataService.getGroupMembers(groupId), [groupId])
}

export function useAddGroupMember() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addGroupMember = useCallback(async (groupId: string, memberId: string, role: string) => {
    try {
      setLoading(true)
      setError(null)
      const result = await dataService.addGroupMember(groupId, memberId, role)
      
      if (result.error) {
        setError(result.error)
        return null
      }
      
      return result.data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add group member'
      setError(errorMessage)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return { addGroupMember, loading, error }
}

export function useRemoveGroupMember() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const removeGroupMember = useCallback(async (membershipId: string) => {
    try {
      setLoading(true)
      setError(null)
      const result = await dataService.removeGroupMember(membershipId)
      
      if (result.error) {
        setError(result.error)
        return false
      }
      
      return result.data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove group member'
      setError(errorMessage)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  return { removeGroupMember, loading, error }
}

// Attendance hooks
export function useAttendanceHistory(memberId?: string, limit: number = 50) {
  return useApiData(() => dataService.getAttendanceHistory(memberId, limit), [memberId, limit])
}

export function useCreateAttendance() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createAttendance = useCallback(async (attendanceData: Partial<Attendance>) => {
    try {
      setLoading(true)
      setError(null)
      const result = await dataService.createAttendance(attendanceData)
      
      if (result.error) {
        setError(result.error)
        return null
      }
      
      return result.data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create attendance'
      setError(errorMessage)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return { createAttendance, loading, error }
}

// Visitors hooks
export function useVisitors(page: number = 1, limit: number = 20, search: string = '') {
  return usePaginatedData(
    (pageNum, pageLimit, searchTerm) => dataService.getVisitors(pageNum, pageLimit, searchTerm),
    page,
    limit,
    search
  )
}

export function useCreateVisitor() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createVisitor = useCallback(async (visitorData: Partial<Visitor>) => {
    try {
      setLoading(true)
      setError(null)
      const result = await dataService.createVisitor(visitorData)
      
      if (result.error) {
        setError(result.error)
        return null
      }
      
      return result.data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create visitor'
      setError(errorMessage)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return { createVisitor, loading, error }
}

// Attendance hooks
export function useAttendanceRecordsQuery(filters: {
  dateFilter?: string
  serviceFilter?: string
  limit?: number
} = {}) {
  return useQuery({
    queryKey: ['attendance-records', filters],
    queryFn: async () => {
      const result = await dataService.getAttendanceRecords(filters)
      if (result.error) throw new Error(result.error)
      return result.data
    },
    staleTime: 30_000,
  })
}

export function useAttendanceStatsQuery() {
  return useQuery({
    queryKey: ['attendance-stats'],
    queryFn: async () => {
      const result = await dataService.getAttendanceStats()
      if (result.error) throw new Error(result.error)
      return result.data
    },
    staleTime: 60_000,
  })
}

export function useAttendanceAnalyticsQuery(filters: {
  timeRange?: string
  serviceType?: string
} = {}) {
  return useQuery({
    queryKey: ['attendance-analytics', filters],
    queryFn: async () => {
      const result = await dataService.getAttendanceAnalytics(filters)
      if (result.error) throw new Error(result.error)
      return result.data
    },
    staleTime: 60_000,
  })
}

// User Management Hooks
export function useAllUsers() {
  return useApiData(() => dataService.getAllUsers())
}

export function useUserById(userId: string) {
  return useApiData(() => dataService.getUserById(userId), [userId])
}

export function useCreateUser() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createUser = useCallback(async (userData: Partial<AppUser>) => {
    try {
      setLoading(true)
      setError(null)
      const result = await dataService.createUser(userData)
      
      if (result.error) {
        setError(result.error)
        return null
      }
      
      return result.data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create user'
      setError(errorMessage)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return { createUser, loading, error }
}

export function useUpdateUser() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateUser = useCallback(async (userId: string, updates: Partial<AppUser>) => {
    try {
      setLoading(true)
      setError(null)
      const result = await dataService.updateUser(userId, updates)
      
      if (result.error) {
        setError(result.error)
        return null
      }
      
      return result.data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update user'
      setError(errorMessage)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return { updateUser, loading, error }
}

export function useDeleteUser() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deleteUser = useCallback(async (userId: string) => {
    try {
      setLoading(true)
      setError(null)
      const result = await dataService.deleteUser(userId)
      
      if (result.error) {
        setError(result.error)
        return false
      }
      
      return result.data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete user'
      setError(errorMessage)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  return { deleteUser, loading, error }
}

// Group Management Hooks
export function useGroupById(groupId: string) {
  return useApiData(() => dataService.getGroupByIdNew(groupId), [groupId])
}

export function useCreateGroup() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createGroup = useCallback(async (groupData: Partial<Group>) => {
    try {
      setLoading(true)
      setError(null)
      const result = await dataService.createGroupNew(groupData)
      
      if (result.error) {
        setError(result.error)
        return null
      }
      
      return result.data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create group'
      setError(errorMessage)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return { createGroup, loading, error }
}

export function useUpdateGroup() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateGroup = useCallback(async (groupId: string, updates: Partial<Group>) => {
    try {
      setLoading(true)
      setError(null)
      const result = await dataService.updateGroupNew(groupId, updates)
      
      if (result.error) {
        setError(result.error)
        return null
      }
      
      return result.data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update group'
      setError(errorMessage)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return { updateGroup, loading, error }
}

export function useDeleteGroup() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deleteGroup = useCallback(async (groupId: string) => {
    try {
      setLoading(true)
      setError(null)
      const result = await dataService.deleteGroupNew(groupId)
      
      if (result.error) {
        setError(result.error)
        return false
      }
      
      return result.data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete group'
      setError(errorMessage)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  return { deleteGroup, loading, error }
}

// Group Membership Management Hooks
export function useAddUserToGroup() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addUserToGroup = useCallback(async (groupId: string, userId: string, role: string = 'member') => {
    try {
      setLoading(true)
      setError(null)
      const result = await dataService.addUserToGroup(groupId, userId, role)
      
      if (result.error) {
        setError(result.error)
        return null
      }
      
      return result.data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add user to group'
      setError(errorMessage)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return { addUserToGroup, loading, error }
}

export function useRemoveUserFromGroup() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const removeUserFromGroup = useCallback(async (groupId: string, userId: string) => {
    try {
      setLoading(true)
      setError(null)
      const result = await dataService.removeUserFromGroup(groupId, userId)
      
      if (result.error) {
        setError(result.error)
        return false
      }
      
      return result.data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove user from group'
      setError(errorMessage)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  return { removeUserFromGroup, loading, error }
}

export function useUpdateGroupMembership() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateGroupMembership = useCallback(async (membershipId: string, updates: Partial<GroupMembership>) => {
    try {
      setLoading(true)
      setError(null)
      const result = await dataService.updateGroupMembership(membershipId, updates)
      
      if (result.error) {
        setError(result.error)
        return null
      }
      
      return result.data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update group membership'
      setError(errorMessage)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return { updateGroupMembership, loading, error }
}

// Utility hooks
export function useAllMembers() {
  return useApiData(() => dataService.getAllMembers())
}
