'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers'
import { useMembers } from '@/lib/hooks/use-data'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { PersonAvatar, displayName } from '@/components/ui/person'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LoadingSpinner } from '@/components/ui/loading'
import { ErrorDisplay, EmptyState } from '@/components/ui/error-display'
import { DashboardLayout } from '@/components/dashboard-layout'
import { StatCard } from '@/components/ui/stat-card'
import { PhoneLink, QuickContactButtons } from '@/components/contact/phone-link'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MemberRowActions } from '@/components/members/member-row-actions'
import { CampusBadge } from '@/components/campus/campus-badge'
import { loadCampusTagsAction, type CampusTag } from '@/lib/actions/campuses'
import { 
  Users,
  Search,
  Plus,
  Download,
  Filter,
  Calendar,
  MapPin,
  Copy,
  RefreshCw,
  X,
  ChevronDown,
  SortAsc,
  SortDesc,
  MoreHorizontal,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { formatMembershipIdForDisplay } from '@/lib/utils'

interface MemberFilters {
  search: string
  role: string
  status: string
  joinYear: string
  /** 'all', 'none' (no campus) or a campus group id */
  campus: string
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
    campus: 'all',
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

  // Campus tags: one call for the whole directory (member id → campus).
  const [campusTags, setCampusTags] = useState<{
    campuses: Array<{ id: string; label: string; name: string; key: string }>
    byMember: Record<string, CampusTag>
  } | null>(null)
  useEffect(() => {
    if (!user) return
    let alive = true
    loadCampusTagsAction()
      .then((res) => {
        if (alive && res.data) setCampusTags(res.data)
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [user])
  const campusOf = (memberId: string) => campusTags?.byMember[memberId]

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

    // Campus filter
    if (filters.campus !== 'all' && campusTags) {
      filtered = filtered.filter(member => {
        const tag = campusTags.byMember[member.id]
        return filters.campus === 'none' ? !tag : tag?.group_id === filters.campus
      })
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
  }, [members, filters, campusTags])

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
      campus: 'all',
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
            onRetry={() => refetch()}
            variant="page"
            title="Failed to load members"
          />
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
            <h2 className="mb-2 text-2xl font-bold text-neutral-900 dark:text-neutral-100">Authentication Required</h2>
            <p className="mb-4 text-neutral-600 dark:text-neutral-400">Please log in to view members.</p>
            <Button onClick={() => router.push('/auth')}>
              Go to Login
            </Button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const hasActiveFilters =
    !!filters.search || filters.role !== 'all' || filters.status !== 'all' || filters.joinYear !== 'all' || filters.campus !== 'all'

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <h1 className="app-page-title">Members</h1>
            <p className="app-page-description mt-1">
              Manage church members and their information
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={refetch}
              disabled={loading}
              className="hidden sm:inline-flex"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" onClick={() => window.print()} className="hidden sm:inline-flex">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button data-tour="members-add" onClick={() => router.push('/members/add')} className="h-11 flex-1 sm:h-10 sm:flex-none">
              <Plus className="mr-2 h-4 w-4" />
              Add member
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-11 w-11 sm:hidden" aria-label="More actions">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem className="min-h-11" onClick={() => refetch()}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </DropdownMenuItem>
                <DropdownMenuItem className="min-h-11" onClick={() => window.print()}>
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <section aria-label="Member totals" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <StatCard label="Total members" value={total} sub="Active members" />
          <StatCard
            label="New this year"
            value={members?.filter(m => m.user?.join_year === new Date().getFullYear()).length || 0}
            sub={`Joined in ${new Date().getFullYear()}`}
          />
          <StatCard
            label="Elders"
            value={members?.filter(m => m.user?.role === 'elder').length || 0}
            sub="Church leadership"
          />
          <StatCard
            label="Pastors"
            value={members?.filter(m => m.user?.role === 'pastor').length || 0}
            sub="Church leadership"
          />
        </section>

        {/* Search and filters */}
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1" data-tour="members-search">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
              <Input
                type="search"
                placeholder="Search by name or membership ID"
                value={filters.search}
                onChange={(e) => handleSearch(e.target.value)}
                className="h-11 pl-10 sm:h-10"
                aria-label="Search members"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                data-tour="members-filters"
                onClick={() => setShowFilters(!showFilters)}
                aria-expanded={showFilters}
                className="h-11 flex-1 sm:h-10 sm:flex-none"
              >
                <Filter className="mr-2 h-4 w-4" />
                Filters
                <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </Button>
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters} className="h-11 flex-1 sm:h-10 sm:flex-none">
                  <X className="mr-2 h-4 w-4" />
                  Clear
                </Button>
              )}
            </div>
          </div>

          {showFilters && (
            <div className="dashboard-panel grid grid-cols-2 gap-3 p-4 lg:grid-cols-5">
              <div>
                <label className="app-stat-label mb-1.5 block">Role</label>
                <Select value={filters.role} onValueChange={(value) => handleFilterChange('role', value)}>
                  <SelectTrigger className="h-11 sm:h-10">
                    <SelectValue placeholder="All roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All roles</SelectItem>
                    {uniqueRoles.map(role => (
                      <SelectItem key={role} value={role || ''}>
                        {(role || '').charAt(0).toUpperCase() + (role || '').slice(1).replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="app-stat-label mb-1.5 block">Status</label>
                <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                  <SelectTrigger className="h-11 sm:h-10">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="transferred">Transferred</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="app-stat-label mb-1.5 block">Join year</label>
                <Select value={filters.joinYear} onValueChange={(value) => handleFilterChange('joinYear', value)}>
                  <SelectTrigger className="h-11 sm:h-10">
                    <SelectValue placeholder="All years" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All years</SelectItem>
                    {uniqueJoinYears.map(year => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="app-stat-label mb-1.5 block">Campus</label>
                <Select value={filters.campus} onValueChange={(value) => handleFilterChange('campus', value)}>
                  <SelectTrigger className="h-11 sm:h-10" aria-label="Campus">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {(campusTags?.campuses ?? []).map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                    ))}
                    <SelectItem value="none">No campus</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="app-stat-label mb-1.5 block">Sort by</label>
                <div className="flex gap-2">
                  <Select value={filters.sortBy} onValueChange={(value) => handleFilterChange('sortBy', value)}>
                    <SelectTrigger className="h-11 min-w-0 flex-1 sm:h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="join_date">Join date</SelectItem>
                      <SelectItem value="membership_id">Membership ID</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-11 w-11 shrink-0 sm:h-10 sm:w-10"
                    aria-label={filters.sortOrder === 'asc' ? 'Sort descending' : 'Sort ascending'}
                    onClick={() => handleFilterChange('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
                  >
                    {filters.sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Members list */}
        <section className="dashboard-panel overflow-hidden" data-tour="members-list">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-neutral-200/80 px-4 py-3 dark:border-white/[0.06] sm:px-5">
            <h2 className="app-section-title">
              Members <span className="tabular-nums text-neutral-500 dark:text-neutral-400">({filteredMembers.length})</span>
            </h2>
            {hasActiveFilters ? (
              <p className="min-w-0 truncate text-[13px] text-neutral-500 dark:text-neutral-400">
                {[
                  filters.search && `“${filters.search}”`,
                  filters.role !== 'all' && `Role: ${filters.role.replace(/_/g, ' ')}`,
                  filters.status !== 'all' && `Status: ${filters.status}`,
                  filters.joinYear !== 'all' && `Year: ${filters.joinYear}`,
                  filters.campus !== 'all' &&
                    `Campus: ${filters.campus === 'none' ? 'none' : campusTags?.campuses.find(c => c.id === filters.campus)?.label ?? ''}`,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            ) : null}
          </div>
          {filteredMembers.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title="No members found"
                description={hasActiveFilters
                  ? 'Try adjusting your search or filter criteria.'
                  : members?.length === 0
                    ? 'No members have been added yet.'
                    : 'No members match your current filters.'
                }
                icon={<Users className="h-12 w-12 text-neutral-400 dark:text-neutral-500" />}
                action={
                  <div className="flex flex-col gap-2 sm:flex-row">
                    {hasActiveFilters && (
                      <Button variant="outline" onClick={clearFilters} className="h-11 sm:h-10">
                        Clear filters
                      </Button>
                    )}
                    <Button onClick={() => router.push('/members/add')} className="h-11 sm:h-10">
                      <Plus className="mr-2 h-4 w-4" />
                      Add member
                    </Button>
                  </div>
                }
              />
            </div>
          ) : (
            <ul className="divide-y divide-neutral-100 dark:divide-white/[0.06]">
              {filteredMembers.map((member) => {
                const name = displayName(member.user?.full_name)
                return (
                  <li key={member.id} className="flex items-start gap-3 px-4 py-3 sm:items-center sm:px-5">
                    <Link
                      href={`/members/${member.id}`}
                      className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
                      aria-label={`Open ${name}`}
                    >
                      <PersonAvatar name={member.user?.full_name} seed={member.id} size="lg" />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <Link
                          href={`/members/${member.id}`}
                          className="min-w-0 max-w-full truncate text-sm font-semibold text-neutral-900 hover:text-brand-600 dark:text-neutral-100 dark:hover:text-brand-300"
                        >
                          {name}
                        </Link>
                        <Badge variant="secondary" className="capitalize">
                          {(member.user?.role || 'member').replace(/_/g, ' ')}
                        </Badge>
                        {campusOf(member.id) ? (
                          <CampusBadge label={campusOf(member.id)!.label} name={campusOf(member.id)!.name} />
                        ) : null}
                        {member.status !== 'active' ? (
                          <Badge variant="secondary" className="capitalize">
                            {member.status}
                          </Badge>
                        ) : null}
                        {member.user?.marital_status && (
                          <Badge variant="outline" className="hidden capitalize sm:inline-flex">
                            {member.user.marital_status}
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[13px] text-neutral-500 dark:text-neutral-400">
                        {member.user?.membership_id ? (
                          <button
                            type="button"
                            onClick={() => copyMembershipId(member.user!.membership_id!)}
                            className="inline-flex min-h-[28px] items-center gap-1 font-mono hover:text-neutral-800 dark:hover:text-neutral-200"
                            aria-label="Copy membership ID"
                          >
                            {formatMembershipIdForDisplay(member.user.membership_id)}
                            <Copy className="h-3 w-3" aria-hidden />
                          </button>
                        ) : null}
                        {member.user?.phone ? (
                          <PhoneLink
                            phone={member.user.phone}
                            whatsapp={member.user.whatsapp}
                            name={name}
                          />
                        ) : null}
                        {member.user?.join_year && (
                          <span className="hidden items-center sm:inline-flex">
                            <Calendar className="mr-1 h-3 w-3" aria-hidden />
                            Joined {member.user.join_year}
                          </span>
                        )}
                        {member.address && (
                          <span className="hidden min-w-0 items-center md:inline-flex">
                            <MapPin className="mr-1 h-3 w-3 shrink-0" aria-hidden />
                            <span className="truncate">{member.address}</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <QuickContactButtons
                        phone={member.user?.phone}
                        whatsapp={member.user?.whatsapp}
                        name={name}
                        className="hidden min-[400px]:inline-flex"
                      />
                      <MemberRowActions
                        memberId={member.id}
                        userId={member.user_id}
                        displayName={member.user?.full_name || 'Member'}
                        membershipId={member.user?.membership_id}
                        rlcRoles={member.rlc_roles}
                        phone={member.user?.phone}
                        whatsapp={member.user?.whatsapp}
                        email={member.user?.email}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </DashboardLayout>
  )
}
