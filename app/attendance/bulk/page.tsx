'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { formatMembershipIdForDisplay, formatDateTime } from '@/lib/utils'

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

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2 flex items-center">
                <Users className="h-8 w-8 mr-3 text-primary" />
                Bulk Attendance
              </h1>
              <p className="text-slate-600">Check in multiple members at once for service attendance</p>
            </div>
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>

          {/* Service Type Selection */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Service Type</CardTitle>
              <CardDescription>Select the type of service for attendance</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={serviceType} onValueChange={setServiceType}>
                <SelectTrigger className="w-full">
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
            </CardContent>
          </Card>
        </div>

        {error && (
          <div className="mb-6">
            <ErrorDisplay error={error} onRetry={fetchMembers} />
          </div>
        )}

        {bulkResult ? (
          /* Success Result */
          <Card className={bulkResult.failed === 0 ? "border-green-200 bg-green-50" : "border-yellow-200 bg-yellow-50"}>
            <CardHeader>
              <CardTitle className={`flex items-center ${bulkResult.failed === 0 ? 'text-green-800' : 'text-yellow-800'}`}>
                <CheckCircle className="h-5 w-5 mr-2" />
                Bulk Check-in Complete
              </CardTitle>
              <CardDescription className={bulkResult.failed === 0 ? 'text-green-600' : 'text-yellow-600'}>
                {bulkResult.failed === 0 ? 'All members checked in successfully' : 'Check-in completed with some issues'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-white p-4 rounded-lg border border-slate-200">
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                    <span className="text-slate-600">Service:</span>
                    <span className="ml-2 font-medium">{bulkResult.service_type}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-gray-400" />
                    <span className="text-slate-600">Time:</span>
                    <span className="ml-2 font-medium">
                      {formatDateTime(bulkResult.timestamp)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center p-3 bg-green-100 rounded-lg">
                    <div className="text-2xl font-bold text-green-800">{bulkResult.successful}</div>
                    <div className="text-sm text-green-600">Successful</div>
                  </div>
                  <div className="text-center p-3 bg-red-100 rounded-lg">
                    <div className="text-2xl font-bold text-red-800">{bulkResult.failed}</div>
                    <div className="text-sm text-red-600">Failed</div>
                  </div>
                </div>

                {bulkResult.errors.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium text-slate-900 mb-2">Errors:</h4>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {bulkResult.errors.map((error, index) => (
                        <div key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                          {error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Button 
                onClick={handleNewBulkCheckIn}
                className="w-full"
                variant="outline"
              >
                Perform Another Bulk Check-in
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Enhanced Search and Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Search className="h-5 w-5 mr-2 text-primary" />
                    Member Selection
                  </div>
                  <div className="text-sm text-slate-600">
                    {selectedMembers.size} members selected ({getTotalSelectedCount()} total attendees)
                  </div>
                </CardTitle>
                <CardDescription>
                  Search and select members for bulk attendance check-in
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search Bar */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <Label htmlFor="search">Search Members</Label>
                    <div className="relative mt-1">
                      {getSearchTypeIcon(searchType)}
                      <Input
                        id="search"
                        placeholder={`Search by ${searchType === 'all' ? 'name, ID, phone, or email' : searchType}...`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="sm:w-48">
                    <Label htmlFor="search-type">Search Type</Label>
                    <Select value={searchType} onValueChange={(value: any) => setSearchType(value)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Fields</SelectItem>
                        <SelectItem value="name">Name Only</SelectItem>
                        <SelectItem value="id">ID Only</SelectItem>
                        <SelectItem value="phone">Phone Only</SelectItem>
                        <SelectItem value="email">Email Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
                  <Button
                    variant="outline"
                    onClick={() => setShowFilters(!showFilters)}
                    className="w-full sm:w-auto"
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                    {showFilters ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
                  </Button>
                  
                  {(searchTerm || roleFilter !== 'all' || statusFilter !== 'all') && (
                    <Button
                      variant="ghost"
                      onClick={clearFilters}
                      className="w-full sm:w-auto"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Clear Filters
                    </Button>
                  )}

                  <div className="flex-1 flex justify-end">
                    <Button
                      variant="outline"
                      onClick={handleSelectAll}
                      size="sm"
                    >
                      {paginatedMembers.every(member => selectedMembers.has(member.id)) ? 'Deselect Page' : 'Select Page'}
                    </Button>
                  </div>
                </div>

                {/* Advanced Filters */}
                {showFilters && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                    <div>
                      <Label htmlFor="role-filter">Role Filter</Label>
                      <Select value={roleFilter} onValueChange={setRoleFilter}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Roles</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="pastor">Pastor</SelectItem>
                          <SelectItem value="elder">Elder</SelectItem>
                          <SelectItem value="finance_officer">Finance Officer</SelectItem>
                          <SelectItem value="member">Member</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="status-filter">Status Filter</Label>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="visitor">Visitor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* Results Summary */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-sm text-slate-600">
                  <div>
                    Showing {startIndex + 1}-{Math.min(endIndex, filteredMembers.length)} of {filteredMembers.length} members
                    {searchTerm && (
                      <span className="ml-2 text-primary">
                        (filtered by "{searchTerm}")
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="items-per-page" className="text-xs">Per page:</Label>
                    <Select value={itemsPerPage.toString()} onValueChange={(value) => handleItemsPerPageChange(parseInt(value))}>
                      <SelectTrigger className="w-20 h-8">
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
                </div>
              </CardContent>
            </Card>

            {/* Members List */}
            <Card>
              <CardHeader>
                <CardTitle>Members ({filteredMembers.length})</CardTitle>
                <CardDescription>
                  Select members and their dependants for attendance
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <LoadingSpinner />
                  </div>
                ) : paginatedMembers.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No members found</p>
                    {searchTerm && (
                      <p className="text-sm">Try adjusting your search terms</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {paginatedMembers.map((member) => {
                      const isSelected = selectedMembers.has(member.id)
                      const memberDependants = selectedDependants.get(member.id) || []
                      
                      return (
                        <div
                          key={member.id}
                          className={`p-4 border rounded-lg transition-colors ${
                            isSelected
                              ? 'border-slate-900 bg-slate-50'
                              : 'border-slate-200 hover:border-gray-300 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-start space-x-3">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handleMemberToggle(member.id)}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-medium text-slate-900">
                                      {member.full_name}
                                    </h3>
                                    {member.role && (
                                      <Badge variant="secondary" className="text-xs">
                                        {member.role}
                                      </Badge>
                                    )}
                                    {member.status && (
                                      <Badge 
                                        variant={member.status === 'active' ? 'default' : 'outline'} 
                                        className="text-xs"
                                      >
                                        {member.status}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-4 text-sm text-slate-600">
                                    <span className="flex items-center">
                                      <Hash className="h-3 w-3 mr-1" />
                                      {formatMembershipIdForDisplay(member.membership_id)}
                                    </span>
                                    {member.phone && (
                                      <span className="flex items-center">
                                        <Phone className="h-3 w-3 mr-1" />
                                        {member.phone}
                                      </span>
                                    )}
                                    {member.email && (
                                      <span className="flex items-center">
                                        <Mail className="h-3 w-3 mr-1" />
                                        {member.email}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {isSelected && (
                                  <div className="flex items-center text-primary">
                                    <UserCheck className="h-4 w-4 mr-1" />
                                    <span className="text-xs font-medium">Selected</span>
                                  </div>
                                )}
                              </div>

                              {/* Dependants */}
                              {isSelected && member.dependants && member.dependants.length > 0 && (
                                <div className="mt-3 pl-6 border-l-2 border-slate-200">
                                  <h4 className="text-sm font-medium text-slate-700 mb-2">
                                    Include Dependants:
                                  </h4>
                                  <div className="space-y-2">
                                    {member.dependants.map((dependant) => (
                                      <div key={dependant.id} className="flex items-center space-x-2">
                                        <Checkbox
                                          id={`${member.id}-${dependant.id}`}
                                          checked={memberDependants.includes(dependant.id)}
                                          onCheckedChange={() => handleDependantToggle(member.id, dependant.id)}
                                        />
                                        <Label
                                          htmlFor={`${member.id}-${dependant.id}`}
                                          className="text-sm font-normal cursor-pointer"
                                        >
                                          Dependant ({dependant.relationship})
                                        </Label>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t">
                    <div className="text-sm text-slate-600">
                      Page {currentPage} of {totalPages}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      
                      {/* Page Numbers */}
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          
                          return (
                            <Button
                              key={pageNum}
                              variant={currentPage === pageNum ? "default" : "outline"}
                              size="sm"
                              onClick={() => handlePageChange(pageNum)}
                              className="w-8 h-8 p-0"
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Action Button */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-600">
                    {selectedMembers.size > 0 ? (
                      <>
                        <span className="font-medium">{selectedMembers.size}</span> members selected
                        {getTotalSelectedCount() > selectedMembers.size && (
                          <> + <span className="font-medium">{getTotalSelectedCount() - selectedMembers.size}</span> dependants</>
                        )}
                      </>
                    ) : (
                      'No members selected'
                    )}
                  </div>
                  <Button 
                    onClick={handleBulkCheckIn}
                    disabled={loading || selectedMembers.size === 0}
                    className="min-w-32"
                  >
                    {loading ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Check In Selected
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick Actions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Navigate to other attendance features</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button 
                variant="outline" 
                onClick={() => router.push('/attendance/scanner')}
                className="h-20 flex-col space-y-2"
              >
                <User className="h-6 w-6" />
                <span>QR Scanner</span>
              </Button>
              <Button 
                variant="outline" 
                onClick={() => router.push('/attendance/kiosk')}
                className="h-20 flex-col space-y-2"
              >
                <Users className="h-6 w-6" />
                <span>Kiosk Mode</span>
              </Button>
              <Button 
                variant="outline" 
                onClick={() => router.push('/attendance/manual')}
                className="h-20 flex-col space-y-2"
              >
                <UserCheck className="h-6 w-6" />
                <span>Manual Check-in</span>
              </Button>
              <Button 
                variant="outline" 
                onClick={() => router.push('/attendance')}
                className="h-20 flex-col space-y-2"
              >
                <Calendar className="h-6 w-6" />
                <span>View Attendance</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
