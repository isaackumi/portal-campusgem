'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading'
import { ErrorDisplay } from '@/components/ui/error-display'
import { 
  Users, 
  ArrowLeft, 
  Search,
  CheckCircle,
  Calendar,
  Clock,
  User,
  UserCheck,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  Phone,
  Mail,
  Hash,
  UserPlus,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { dataService } from '@/lib/services/data-service'
import { useToast } from '@/hooks/use-toast'
import { cn, formatMembershipIdForDisplay, formatDateTime } from '@/lib/utils'
import { PageHeader } from '@/components/layout/page-header'
import { displayName } from '@/components/ui/person'
import { PhoneLink, QuickContactButtons } from '@/components/contact/phone-link'

interface Member {
  id: string
  full_name: string
  membership_id: string
  phone?: string
  email?: string
  role?: string
  status?: string
  dependants?: Array<{
    id: string
    relationship: string
  }>
}

interface BulkCheckInResult {
  successful: number
  failed: number
  errors: string[]
  service_type: string
  timestamp: string
}

export default function BulkAttendancePage() {
  const { user, loading: authLoading } = useAuth()
  const [members, setMembers] = useState<Member[]>([])
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set())
  const [selectedDependants, setSelectedDependants] = useState<Map<string, string[]>>(new Map())
  const [searchTerm, setSearchTerm] = useState('')
  const [searchType, setSearchType] = useState<'all' | 'name' | 'id' | 'phone' | 'email'>('all')
  const [serviceType, setServiceType] = useState('sunday_service')
  const [loading, setLoading] = useState(false)
  const [bulkResult, setBulkResult] = useState<BulkCheckInResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)
  const [showFilters, setShowFilters] = useState(false)
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const router = useRouter()
  const { toast } = useToast()

  const serviceTypes = [
    { value: 'sunday_service', label: 'Sunday Service' },
    { value: 'midweek_service', label: 'Midweek Service' },
    { value: 'prayer_meeting', label: 'Prayer Meeting' },
    { value: 'youth_service', label: 'Youth Service' },
    { value: 'children_service', label: 'Children Service' },
    { value: 'special_event', label: 'Special Event' }
  ]

  useEffect(() => {
    if (user) {
      fetchMembers()
    }
  }, [user])

  // Enhanced search and filtering logic
  const filteredMembers = useMemo(() => {
    let filtered = members

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim()
      filtered = filtered.filter(member => {
        switch (searchType) {
          case 'name':
            return member.full_name.toLowerCase().includes(searchLower)
          case 'id':
            return member.membership_id.toLowerCase().includes(searchLower)
          case 'phone':
            return member.phone?.includes(searchTerm) || false
          case 'email':
            return member.email?.toLowerCase().includes(searchLower) || false
          case 'all':
          default:
            return (
              member.full_name.toLowerCase().includes(searchLower) ||
              member.membership_id.toLowerCase().includes(searchLower) ||
              member.phone?.includes(searchTerm) ||
              member.email?.toLowerCase().includes(searchLower)
            )
        }
      })
    }

    // Apply role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(member => member.role === roleFilter)
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(member => member.status === statusFilter)
    }

    return filtered
  }, [members, searchTerm, searchType, roleFilter, statusFilter])

  // Pagination logic
  const totalPages = Math.ceil(filteredMembers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedMembers = filteredMembers.slice(startIndex, endIndex)

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, searchType, roleFilter, statusFilter])

  const fetchMembers = async () => {
    try {
      setLoading(true)
      setError(null)

      const all: Member[] = []
      let page = 1
      const limit = 100
      let hasMore = true
      while (hasMore) {
        const res = await dataService.getMembers(page, limit)
        if (res.error) throw new Error(res.error)
        const list = res.data ?? []
        all.push(...list.map(m => ({
          id: m.id,
          full_name: m.user?.full_name ?? '',
          membership_id: m.user?.membership_id ?? '',
          phone: m.user?.phone,
          email: m.user?.email,
          role: m.user?.role,
          status: m.status,
          dependants: (m.dependants ?? []).map(d => ({ id: d.id, relationship: d.relationship }))
        })))
        hasMore = list.length === limit
        page++
      }

      setMembers(all)
    } catch (err) {
      console.error('Error fetching members:', err)
      setError('Failed to load members')
    } finally {
      setLoading(false)
    }
  }

  const handleMemberToggle = (memberId: string) => {
    const newSelected = new Set(selectedMembers)
    if (newSelected.has(memberId)) {
      newSelected.delete(memberId)
      // Also remove dependants for this member
      const newDependants = new Map(selectedDependants)
      newDependants.delete(memberId)
      setSelectedDependants(newDependants)
    } else {
      newSelected.add(memberId)
    }
    setSelectedMembers(newSelected)
  }

  const handleDependantToggle = (memberId: string, dependantId: string) => {
    const newDependants = new Map(selectedDependants)
    const memberDependants = newDependants.get(memberId) || []
    
    if (memberDependants.includes(dependantId)) {
      const filtered = memberDependants.filter(id => id !== dependantId)
      if (filtered.length === 0) {
        newDependants.delete(memberId)
      } else {
        newDependants.set(memberId, filtered)
      }
    } else {
      newDependants.set(memberId, [...memberDependants, dependantId])
    }
    
    setSelectedDependants(newDependants)
  }

  const handleSelectAll = () => {
    const currentPageMemberIds = new Set(paginatedMembers.map(m => m.id))
    const allCurrentPageSelected = paginatedMembers.every(member => selectedMembers.has(member.id))
    
    if (allCurrentPageSelected) {
      // Deselect all on current page
      const newSelected = new Set(selectedMembers)
      paginatedMembers.forEach(member => {
        newSelected.delete(member.id)
        // Also remove dependants for this member
        const newDependants = new Map(selectedDependants)
        newDependants.delete(member.id)
        setSelectedDependants(newDependants)
      })
      setSelectedMembers(newSelected)
    } else {
      // Select all on current page
      const newSelected = new Set(selectedMembers)
      paginatedMembers.forEach(member => {
        newSelected.add(member.id)
      })
      setSelectedMembers(newSelected)
    }
  }

  const handleBulkCheckIn = async () => {
    if (selectedMembers.size === 0) {
      toast({
        title: "No Members Selected",
        description: "Please select at least one member to check in.",
        variant: "destructive"
      })
      return
    }

    try {
      setLoading(true)
      setError(null)

      const serviceLabel = serviceTypes.find(s => s.value === serviceType)?.label || 'Sunday Service'
      const checkInTime = new Date().toISOString()
      const serviceDate = new Date().toISOString().split('T')[0]

      const attendanceRecords = []
      const errors: string[] = []
      let successful = 0
      let failed = 0

      // Process main members
      for (const memberId of Array.from(selectedMembers)) {
        try {
          const { error: memberError } = await dataService.recordAttendance({
            member_id: memberId,
            service_date: serviceDate,
            service_type: serviceType,
            check_in_time: checkInTime,
            status: 'present',
            checked_in_by: user?.id
          })

          if (memberError) throw new Error(memberError)
          successful++

          // Process dependants for this member
          const memberDependants = selectedDependants.get(memberId) || []
          for (const dependantId of memberDependants) {
            try {
              const { error: dependantError } = await dataService.recordAttendance({
                member_id: dependantId,
                service_date: serviceDate,
                service_type: serviceType,
                check_in_time: checkInTime,
                status: 'present',
                checked_in_by: user?.id
              })
              if (dependantError) throw new Error(dependantError)
              successful++
            } catch (err) {
              failed++
              errors.push(`Dependant check-in failed: ${err}`)
            }
          }
        } catch (err) {
          failed++
          const member = members.find(m => m.id === memberId)
          errors.push(`Member ${member?.full_name || memberId} check-in failed: ${err}`)
        }
      }

      setBulkResult({
        successful,
        failed,
        errors,
        service_type: serviceLabel,
        timestamp: checkInTime
      })

      toast({
        title: "Bulk Check-in Complete",
        description: `${successful} members checked in successfully. ${failed} failed.`,
        variant: successful > 0 ? "default" : "destructive"
      })

      // Clear selections after successful check-in
      if (failed === 0) {
        setSelectedMembers(new Set())
        setSelectedDependants(new Map())
      }
    } catch (err) {
      console.error('Error in bulk check-in:', err)
      setError('Failed to perform bulk check-in. Please try again.')
      toast({
        title: "Bulk Check-in Failed",
        description: "There was an error processing the bulk check-in.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleNewBulkCheckIn = () => {
    setSelectedMembers(new Set())
    setSelectedDependants(new Map())
    setBulkResult(null)
    setSearchTerm('')
  }

  const getTotalSelectedCount = () => {
    let total = selectedMembers.size
    selectedDependants.forEach(dependantIds => {
      total += dependantIds.length
    })
    return total
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items)
    setCurrentPage(1)
  }

  const clearFilters = () => {
    setSearchTerm('')
    setSearchType('all')
    setRoleFilter('all')
    setStatusFilter('all')
    setCurrentPage(1)
  }

  const getSearchTypeIcon = (type: string) => {
    switch (type) {
      case 'name': return <User className="h-4 w-4" />
      case 'id': return <Hash className="h-4 w-4" />
      case 'phone': return <Phone className="h-4 w-4" />
      case 'email': return <Mail className="h-4 w-4" />
      default: return <Search className="h-4 w-4" />
    }
  }

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner />
        </div>
      </DashboardLayout>
    )
  }

  if (!user) {
    return null
  }

  const serviceLabel = (value: string) => serviceTypes.find((s) => s.value === value)?.label ?? value
  const totalSelected = getTotalSelectedCount()
  const pageAllSelected = paginatedMembers.length > 0 && paginatedMembers.every((member) => selectedMembers.has(member.id))
  const filtersActive = Boolean(searchTerm) || roleFilter !== 'all' || statusFilter !== 'all'

  return (
    <DashboardLayout>
      <div className={cn('mx-auto max-w-7xl', !bulkResult && selectedMembers.size > 0 && 'pb-24')}>
        <PageHeader
          title="Bulk attendance"
          description="Check in many members at once"
          className="mb-4 sm:mb-6"
          actions={
            <Button variant="outline" className="hidden sm:inline-flex" onClick={() => router.push('/attendance')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Attendance
            </Button>
          }
        />

        {error && (
          <div className="mb-6">
            <ErrorDisplay error={error} onRetry={fetchMembers} />
          </div>
        )}

        {bulkResult ? (
          <div
            role="status"
            className={cn(
              'dashboard-panel space-y-4 p-4 ring-1 ring-inset sm:p-5',
              bulkResult.failed === 0
                ? 'ring-emerald-600/20 dark:ring-emerald-400/20'
                : 'ring-amber-600/20 dark:ring-amber-400/20'
            )}
          >
            <div
              className={cn(
                'flex items-center gap-2',
                bulkResult.failed === 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'
              )}
            >
              {bulkResult.failed === 0 ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
              <h2 className={cn('app-section-title', bulkResult.failed === 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300')}>
                {bulkResult.failed === 0 ? 'Everyone checked in' : 'Done, with some problems'}
              </h2>
            </div>

            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
              <dt className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
                <Calendar className="h-4 w-4" /> Service
              </dt>
              <dd className="text-neutral-900 dark:text-neutral-100">{serviceLabel(bulkResult.service_type)}</dd>
              <dt className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
                <Clock className="h-4 w-4" /> Time
              </dt>
              <dd className="tabular-nums text-neutral-900 dark:text-neutral-100">{formatDateTime(bulkResult.timestamp)}</dd>
            </dl>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-emerald-50 p-3 text-center ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-400/10 dark:ring-emerald-400/20">
                <div className="app-stat-value text-emerald-800 dark:text-emerald-200">{bulkResult.successful}</div>
                <div className="text-sm text-emerald-700 dark:text-emerald-300">Checked in</div>
              </div>
              <div className="rounded-lg bg-red-50 p-3 text-center ring-1 ring-inset ring-red-600/15 dark:bg-red-400/10 dark:ring-red-400/20">
                <div className="app-stat-value text-red-800 dark:text-red-200">{bulkResult.failed}</div>
                <div className="text-sm text-red-700 dark:text-red-300">Failed</div>
              </div>
            </div>

            {bulkResult.errors.length > 0 && (
              <div>
                <p className="app-overline mb-2">Errors</p>
                <ul className="max-h-40 space-y-1 overflow-y-auto">
                  {bulkResult.errors.map((err, index) => (
                    <li key={index} className="break-words rounded bg-red-50 p-2 text-sm text-red-700 dark:bg-red-400/10 dark:text-red-300">
                      {err}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid gap-2 sm:flex">
              <Button onClick={handleNewBulkCheckIn} className="h-11">
                Start another bulk check-in
              </Button>
              <Button variant="outline" className="h-11" onClick={() => router.push('/attendance')}>
                View attendance
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-3">
              <Select value={serviceType} onValueChange={setServiceType}>
                <SelectTrigger className="h-11 w-full sm:max-w-xs" aria-label="Service type">
                  <SelectValue placeholder="Select service type" />
                </SelectTrigger>
                <SelectContent>
                  {serviceTypes.map((service) => (
                    <SelectItem key={service.value} value={service.value}>
                      {service.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative min-w-0 flex-1">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500">
                    {getSearchTypeIcon(searchType)}
                  </span>
                  <Input
                    id="search"
                    aria-label="Search members"
                    placeholder={`Search by ${searchType === 'all' ? 'name, ID, phone or email' : searchType}`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-11 pl-10 sm:h-10"
                    enterKeyHint="search"
                  />
                </div>
                <div className="grid grid-cols-[1fr_auto] gap-2 sm:flex">
                  <Select value={searchType} onValueChange={(value: any) => setSearchType(value)}>
                    <SelectTrigger className="h-11 sm:h-10 sm:w-40" aria-label="Search in">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All fields</SelectItem>
                      <SelectItem value="name">Name only</SelectItem>
                      <SelectItem value="id">ID only</SelectItem>
                      <SelectItem value="phone">Phone only</SelectItem>
                      <SelectItem value="email">Email only</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    onClick={() => setShowFilters(!showFilters)}
                    className="h-11 sm:h-10"
                    aria-expanded={showFilters}
                  >
                    <Filter className="h-4 w-4 sm:mr-2" />
                    <span className="sr-only sm:not-sr-only">Filters</span>
                    {showFilters ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {showFilters && (
                <div className="grid grid-cols-2 gap-3 rounded-lg bg-neutral-50 p-3 ring-1 ring-inset ring-neutral-200/80 dark:bg-white/[0.04] dark:ring-white/[0.06] sm:max-w-lg">
                  <div>
                    <Label htmlFor="role-filter" className="app-overline">Role</Label>
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                      <SelectTrigger id="role-filter" className="mt-1 h-11 sm:h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All roles</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="pastor">Pastor</SelectItem>
                        <SelectItem value="elder">Elder</SelectItem>
                        <SelectItem value="finance_officer">Finance officer</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="status-filter" className="app-overline">Status</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger id="status-filter" className="mt-1 h-11 sm:h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="visitor">Visitor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            <section className="dashboard-panel overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200/80 px-4 py-2 dark:border-white/[0.06] sm:px-5">
                <label className="flex min-h-11 cursor-pointer items-center gap-3">
                  <Checkbox
                    checked={pageAllSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label={pageAllSelected ? 'Deselect this page' : 'Select this page'}
                  />
                  <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    {pageAllSelected ? 'Deselect page' : 'Select page'}
                  </span>
                </label>
                <p className="text-[13px] tabular-nums text-neutral-500 dark:text-neutral-400">
                  {filteredMembers.length === 0
                    ? '0 members'
                    : `${startIndex + 1}–${Math.min(endIndex, filteredMembers.length)} of ${filteredMembers.length}`}
                  {filtersActive ? (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="ml-2 inline-flex min-h-11 items-center gap-1 font-medium text-brand-600 hover:underline dark:text-brand-300"
                    >
                      <X className="h-3.5 w-3.5" /> Clear
                    </button>
                  ) : null}
                </p>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <LoadingSpinner />
                </div>
              ) : paginatedMembers.length === 0 ? (
                <div className="px-4 py-10 text-center text-neutral-500 dark:text-neutral-400">
                  <User className="mx-auto mb-2 h-8 w-8 opacity-50" />
                  <p className="font-medium text-neutral-700 dark:text-neutral-300">No members found</p>
                  {searchTerm && <p className="text-sm">Try a different search.</p>}
                </div>
              ) : (
                <ul className="divide-y divide-neutral-100 dark:divide-white/[0.06]">
                  {paginatedMembers.map((member) => {
                    const isSelected = selectedMembers.has(member.id)
                    const memberDependants = selectedDependants.get(member.id) || []

                    return (
                      <li
                        key={member.id}
                        className={cn(
                          'transition-colors',
                          isSelected ? 'bg-brand-50/70 dark:bg-brand-400/10' : 'hover:bg-neutral-50 dark:hover:bg-white/[0.03]'
                        )}
                      >
                        <div className="flex min-h-14 items-center gap-3 px-4 py-2 sm:px-5">
                          <label
                            htmlFor={`m-${member.id}`}
                            className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 py-1"
                          >
                            <Checkbox
                              id={`m-${member.id}`}
                              checked={isSelected}
                              onCheckedChange={() => handleMemberToggle(member.id)}
                            />
                            <span className="min-w-0 flex-1">
                              <span className="flex min-w-0 items-center gap-2">
                                <span className="truncate font-medium text-neutral-900 dark:text-neutral-100">
                                  {displayName(member.full_name)}
                                </span>
                                {member.status && member.status !== 'active' && (
                                  <Badge variant="outline" className="capitalize">
                                    {member.status}
                                  </Badge>
                                )}
                                {member.role && member.role !== 'member' && (
                                  <Badge variant="secondary" className="hidden capitalize sm:inline-flex">
                                    {member.role.replace(/_/g, ' ')}
                                  </Badge>
                                )}
                              </span>
                              <span className="block truncate font-mono text-[13px] text-neutral-500 dark:text-neutral-400">
                                {formatMembershipIdForDisplay(member.membership_id)}
                                {member.email ? (
                                  <span className="hidden font-sans md:inline"> · {member.email}</span>
                                ) : null}
                              </span>
                            </span>
                          </label>
                          {member.phone ? (
                            <PhoneLink
                              phone={member.phone}
                              name={member.full_name}
                              className="hidden text-[13px] text-neutral-600 dark:text-neutral-300 md:inline-flex"
                            />
                          ) : null}
                          <QuickContactButtons phone={member.phone} name={member.full_name} className="md:hidden" />
                        </div>

                        {isSelected && member.dependants && member.dependants.length > 0 && (
                          <fieldset className="px-4 pb-3 pl-12 sm:px-5 sm:pl-14">
                            <legend className="app-overline mb-1">Include dependants</legend>
                            {member.dependants.map((dependant) => (
                              <label
                                key={dependant.id}
                                htmlFor={`${member.id}-${dependant.id}`}
                                className="flex min-h-11 cursor-pointer items-center gap-3"
                              >
                                <Checkbox
                                  id={`${member.id}-${dependant.id}`}
                                  checked={memberDependants.includes(dependant.id)}
                                  onCheckedChange={() => handleDependantToggle(member.id, dependant.id)}
                                />
                                <span className="text-sm capitalize text-neutral-700 dark:text-neutral-300">
                                  {dependant.relationship}
                                </span>
                              </label>
                            ))}
                          </fieldset>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200/80 px-4 py-3 dark:border-white/[0.06] sm:px-5">
                <div className="flex items-center gap-2 text-[13px] text-neutral-500 dark:text-neutral-400">
                  <Label htmlFor="items-per-page" className="text-[13px] font-normal">Per page</Label>
                  <Select value={itemsPerPage.toString()} onValueChange={(value) => handleItemsPerPageChange(parseInt(value))}>
                    <SelectTrigger id="items-per-page" className="h-10 w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="min-w-16 text-center text-sm tabular-nums text-neutral-600 dark:text-neutral-300">
                      {currentPage} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      aria-label="Next page"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {!bulkResult && selectedMembers.size > 0 && (
          <div className="fixed inset-x-3 bottom-20 z-30 lg:bottom-4 lg:left-1/2 lg:right-auto lg:w-[32rem] lg:-translate-x-1/2">
            <div className="flex items-center gap-3 rounded-xl border border-neutral-200/80 bg-white p-2 pl-4 shadow-lg dark:border-white/10 dark:bg-neutral-800">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium tabular-nums text-neutral-900 dark:text-neutral-100">
                  {selectedMembers.size} selected
                  {totalSelected > selectedMembers.size ? ` + ${totalSelected - selectedMembers.size} dependants` : ''}
                </p>
                <p className="truncate text-[13px] text-neutral-500 dark:text-neutral-400">{serviceLabel(serviceType)}</p>
              </div>
              <Button
                variant="ghost"
                className="h-11 shrink-0 px-3"
                onClick={() => {
                  setSelectedMembers(new Set())
                  setSelectedDependants(new Map())
                }}
                aria-label="Clear selection"
              >
                <X className="h-4 w-4" />
              </Button>
              <Button onClick={handleBulkCheckIn} disabled={loading} className="h-11 shrink-0">
                {loading ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Saving…
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Check in
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
