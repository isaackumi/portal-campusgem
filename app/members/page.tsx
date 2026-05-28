'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers'
import { useMembers } from '@/lib/hooks/use-data'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LoadingSpinner } from '@/components/ui/loading'
import { ErrorDisplay, EmptyState } from '@/components/ui/error-display'
import { DashboardLayout } from '@/components/dashboard-layout'
import { MemberRowActions } from '@/components/members/member-row-actions'
import { 
  Users, 
  Search, 
  Plus, 
  Download, 
  Filter,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Copy,
  CheckCircle,
  User,
  Crown,
  Star,
  RefreshCw,
  X,
  ChevronDown,
  SortAsc,
  SortDesc,
  Eye,
  Edit
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { formatMembershipIdForDisplay } from '@/lib/utils'

interface MemberFilters {
  search: string
  role: string
  status: string
  joinYear: string
  sortBy: string
  sortOrder: 'asc' | 'desc'
}

export default function MembersPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  
  // State management
  const [filters, setFilters] = useState<MemberFilters>({
    search: '',
    role: 'all',
    status: 'all',
    joinYear: 'all',
    sortBy: 'name',
    sortOrder: 'asc'
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])

  // Data fetching with improved error handling
  const { 
    data: members, 
    total, 
    hasMore, 
    error, 
    loading, 
    refetch
  } = useMembers(currentPage, 50, filters.search)

  // Debug logging
  console.log('Members page state:', { 
    membersLength: members?.length, 
    total, 
    error, 
    loading,
    currentPage,
    searchTerm: filters.search
  })

  // Filter and sort members client-side for better UX
  const filteredMembers = useMemo(() => {
    if (!members) return []
    
    let filtered = [...members]
    
    // Role filter
    if (filters.role !== 'all') {
      filtered = filtered.filter(member => member.user?.role === filters.role)
    }
    
    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(member => member.status === filters.status)
    }
    
    // Join year filter
    if (filters.joinYear !== 'all') {
      filtered = filtered.filter(member => member.user?.join_year?.toString() === filters.joinYear)
    }
    
    // Sort
    filtered.sort((a, b) => {
      let aValue: any, bValue: any
      
      switch (filters.sortBy) {
        case 'name':
          aValue = a.user?.full_name || ''
          bValue = b.user?.full_name || ''
          break
        case 'join_date':
          aValue = new Date(a.user?.created_at || 0)
          bValue = new Date(b.user?.created_at || 0)
          break
        case 'membership_id':
          aValue = a.user?.membership_id || ''
          bValue = b.user?.membership_id || ''
          break
        default:
          aValue = a.user?.full_name || ''
          bValue = b.user?.full_name || ''
      }
      
      if (filters.sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })
    
    return filtered
  }, [members, filters])

  // Get unique values for filter options
  const uniqueRoles = useMemo(() => {
    if (!members) return []
    const roles = members.map(m => m.user?.role).filter(Boolean)
    return Array.from(new Set(roles))
  }, [members])

  const uniqueJoinYears = useMemo(() => {
    if (!members) return []
    const years = members.map(m => m.user?.join_year).filter(Boolean) as number[]
    return Array.from(new Set(years)).sort((a, b) => (b || 0) - (a || 0))
  }, [members])

  // Handlers
  const handleFilterChange = (key: keyof MemberFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setCurrentPage(1)
  }

  const handleSearch = (value: string) => {
    setFilters(prev => ({ ...prev, search: value }))
    setCurrentPage(1)
  }

  const clearFilters = () => {
    setFilters({
      search: '',
      role: 'all',
      status: 'all',
      joinYear: 'all',
      sortBy: 'name',
      sortOrder: 'asc'
    })
    setCurrentPage(1)
  }

  const copyMembershipId = (membershipId: string) => {
    navigator.clipboard.writeText(membershipId)
    toast({
      title: "Copied!",
      description: "Membership ID copied to clipboard"
    })
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800'
      case 'elder': return 'bg-purple-100 text-purple-800'
      case 'deacon': return 'bg-blue-100 text-blue-800'
      case 'member': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'inactive': return 'bg-gray-100 text-gray-800'
      case 'transferred': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Loading state
  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner />
        </div>
      </DashboardLayout>
    )
  }

  // Error state
  if (error) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto">
          <ErrorDisplay
            error={error}
            onRetry={() => {
              console.log('Retrying members fetch...')
              refetch()
            }}
            variant="page"
            title="Failed to load members"
          />
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="text-sm font-medium text-yellow-800">Debug Information</h3>
            <p className="text-sm text-yellow-700 mt-1">
              Error: {error}
            </p>
            <p className="text-sm text-yellow-700 mt-1">
              This might be due to database connection issues or missing data.
            </p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // Unauthenticated state
  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication Required</h2>
            <p className="text-gray-600 mb-4">Please log in to view members.</p>
            <Button onClick={() => router.push('/auth')}>
              Go to Login
            </Button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Members</h1>
            <p className="text-gray-600 mt-1">
              Manage church members and their information
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex gap-2">
            <Button variant="outline" onClick={refetch} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" onClick={() => window.print()}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button onClick={() => router.push('/members/add')}>
              <Plus className="h-4 w-4 mr-2" />
              Add Member
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{total}</div>
              <p className="text-xs text-muted-foreground">
                Active members
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">New This Year</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {members?.filter(m => m.user?.join_year === new Date().getFullYear()).length || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Joined in {new Date().getFullYear()}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Elders</CardTitle>
              <Crown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {members?.filter(m => m.user?.role === 'elder').length || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Church leadership
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pastors</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {members?.filter(m => m.user?.role === 'pastor').length || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Church leadership
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Search & Filter Members</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                  <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                </Button>
                {(filters.search || filters.role !== 'all' || filters.status !== 'all' || filters.joinYear !== 'all') && (
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-2" />
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by name or membership ID..."
                value={filters.search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
                <div>
                  <label className="text-sm font-medium mb-2 block">Role</label>
                  <Select value={filters.role} onValueChange={(value) => handleFilterChange('role', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All roles" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      {uniqueRoles.map(role => (
                        <SelectItem key={role} value={role || ''}>
                          {(role || '').charAt(0).toUpperCase() + (role || '').slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Status</label>
                  <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="transferred">Transferred</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Join Year</label>
                  <Select value={filters.joinYear} onValueChange={(value) => handleFilterChange('joinYear', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All years" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Years</SelectItem>
                      {uniqueJoinYears.map(year => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Sort By</label>
                  <div className="flex gap-2">
                    <Select value={filters.sortBy} onValueChange={(value) => handleFilterChange('sortBy', value)}>
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="name">Name</SelectItem>
                        <SelectItem value="join_date">Join Date</SelectItem>
                        <SelectItem value="membership_id">Membership ID</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleFilterChange('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
                    >
                      {filters.sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Members List */}
        <Card>
          <CardHeader>
            <CardTitle>Members ({filteredMembers.length})</CardTitle>
            <CardDescription>
              {filters.search && `Search results for "${filters.search}"`}
              {filters.role !== 'all' && ` • Role: ${filters.role}`}
              {filters.status !== 'all' && ` • Status: ${filters.status}`}
              {filters.joinYear !== 'all' && ` • Year: ${filters.joinYear}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredMembers.length === 0 ? (
              <EmptyState
                title="No members found"
                description={filters.search || filters.role !== 'all' || filters.status !== 'all' || filters.joinYear !== 'all' 
                  ? "Try adjusting your search or filter criteria."
                  : members?.length === 0 
                    ? "No members have been added yet."
                    : "No members match your current filters."
                }
                icon={<Users className="h-12 w-12 text-gray-400" />}
                action={
                  <div className="flex gap-2">
                    {(filters.search || filters.role !== 'all' || filters.status !== 'all' || filters.joinYear !== 'all') && (
                      <Button variant="outline" onClick={clearFilters}>
                        Clear Filters
                      </Button>
                    )}
                    <Button onClick={() => router.push('/members/add')}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Member
                    </Button>
                  </div>
                }
              />
            ) : (
              <div className="space-y-4">
                {filteredMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-medium text-gray-900">
                            {member.user?.full_name || 'Unknown'}
                          </h3>
                          <Badge className={getRoleColor(member.user?.role || '')}>
                            {member.user?.role || 'member'}
                          </Badge>
                          <Badge className={getStatusColor(member.status)}>
                            {member.status}
                          </Badge>
                          {member.user?.marital_status && (
                            <Badge variant="outline" className="text-xs">
                              {member.user.marital_status}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-500 mb-2">
                          <span className="flex items-center">
                            <Copy className="h-3 w-3 mr-1" />
                            {formatMembershipIdForDisplay(member.user?.membership_id || '')}
                          </span>
                          {member.user?.phone && (
                            <span className="flex items-center">
                              <Phone className="h-3 w-3 mr-1" />
                              {member.user.phone}
                            </span>
                          )}
                          {member.user?.email && (
                            <span className="flex items-center">
                              <Mail className="h-3 w-3 mr-1" />
                              {member.user.email}
                            </span>
                          )}
                          {member.user?.join_year && (
                            <span className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              Joined {member.user.join_year}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 text-xs text-gray-400">
                          {member.address && (
                            <span className="flex items-center">
                              <MapPin className="h-3 w-3 mr-1" />
                              {member.address}
                            </span>
                          )}
                          {member.dob && (
                            <span className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              Born {new Date(member.dob).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <MemberRowActions
                      memberId={member.id}
                      userId={member.user_id}
                      displayName={member.user?.full_name || 'Member'}
                      membershipId={member.user?.membership_id}
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}