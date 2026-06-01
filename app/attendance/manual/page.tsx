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
  Search,
  UserCheck, 
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Filter,
  Phone,
  Mail,
  MapPin,
  User,
  UserPlus,
  RefreshCw,
  X
} from 'lucide-react'
import { useMembers } from '@/lib/hooks/use-data'
import { dataService } from '@/lib/services/data-service'
import { useToast } from '@/hooks/use-toast'
import { formatMembershipIdForDisplay, formatDateTime } from '@/lib/utils'
import { ServiceTypeMapper } from '@/lib/constants/service-types'
import { Member, Dependant } from '@/lib/types'

interface MemberWithDependants extends Member {
  dependants?: Dependant[]
}

interface CheckInResult {
  member: MemberWithDependants
  dependants: Dependant[]
  service_type: string
  timestamp: string
}

export default function ManualCheckInPage() {
  const { user, loading: authLoading } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMember, setSelectedMember] = useState<MemberWithDependants | null>(null)
  const [selectedDependants, setSelectedDependants] = useState<string[]>([])
  const [serviceType, setServiceType] = useState('sunday_service')
  
  // Debug serviceType changes
  useEffect(() => {
    console.log('🔍 ServiceType state changed to:', serviceType)
  }, [serviceType])
  const [loading, setLoading] = useState(false)
  const [checkInResult, setCheckInResult] = useState<CheckInResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const { data: members, total, hasMore, error: membersError, loading: membersLoading } = useMembers(1, 100, searchTerm)

  const serviceTypes = ServiceTypeMapper.getOptions()
  console.log('🔍 ServiceTypes options:', serviceTypes)

  // Filter members based on search and filters
  const filteredMembers = useMemo(() => {
    if (!members) return []
    
    return members.filter(member => {
      const matchesSearch = searchTerm === '' || 
        member.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.user?.membership_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.user?.phone?.includes(searchTerm) ||
        member.user?.email?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesRole = roleFilter === 'all' || member.user?.role === roleFilter
      const matchesStatus = statusFilter === 'all' || member.status === statusFilter
      
      return matchesSearch && matchesRole && matchesStatus
    })
  }, [members, searchTerm, roleFilter, statusFilter])

  // Get unique roles for filter
  const uniqueRoles = useMemo(() => {
    if (!members) return []
    const roles = members.map(m => m.user?.role).filter(Boolean)
    return Array.from(new Set(roles))
  }, [members])

  const handleDependantToggle = (dependantId: string) => {
    setSelectedDependants(prev =>
      prev.includes(dependantId)
        ? prev.filter(id => id !== dependantId)
        : [...prev, dependantId]
    )
  }

  const handleCheckIn = async () => {
    if (!selectedMember) return

    try {
      setLoading(true)
      setError(null)

      console.log('🔍 Manual Check-in - serviceType:', serviceType)
      console.log('🔍 Manual Check-in - serviceTypes:', serviceTypes)

      const serviceLabel = serviceTypes.find(s => s.value === serviceType)?.label || 'Sunday Service'
      const checkInTime = new Date().toISOString()
      const serviceDate = new Date().toISOString().split('T')[0]

      // Record attendance for main member
      console.log('🔍 Before mapping - serviceType:', serviceType)
      const mappedServiceType = ServiceTypeMapper.toEnum(serviceType)
      console.log('🔍 After mapping - mappedServiceType:', mappedServiceType)
      
      const { error: memberError } = await dataService.recordAttendance({
          member_id: selectedMember.id,
          service_date: serviceDate,
        service_type: mappedServiceType, // Professional mapping
          check_in_time: checkInTime,
          status: 'present',
        checked_in_by: user?.id || ''
        })

      if (memberError) throw new Error(memberError)

      // Record attendance for selected dependants
      const selectedDependantObjects = selectedMember.dependants?.filter(d => 
        selectedDependants.includes(d.id)
      ) || []

      if (selectedDependantObjects.length > 0) {
        for (const dependant of selectedDependantObjects) {
            const { error: dependantError } = await dataService.recordAttendance({
          member_id: dependant.id,
          service_date: serviceDate,
              service_type: mappedServiceType, // Use the same mapped value
          check_in_time: checkInTime,
          status: 'present',
              checked_in_by: user?.id || ''
            })

          if (dependantError) throw new Error(dependantError)
        }
      }

      setCheckInResult({
        member: selectedMember,
        dependants: selectedDependantObjects,
        service_type: serviceLabel, // This is for display, so label is correct
        timestamp: checkInTime
      })

      toast({
        title: "Check-in Successful",
        description: `${selectedMember.user?.full_name || 'Member'} has been checked in successfully.`,
        variant: "default"
      })
    } catch (err) {
      console.error('Error checking in member:', err)
      setError(err instanceof Error ? err.message : 'Failed to check in member')
      toast({
        title: "Check-in Failed",
        description: "There was an error processing the check-in.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setSelectedMember(null)
    setSelectedDependants([])
    setCheckInResult(null)
    setError(null)
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800'
      case 'pastor': return 'bg-purple-100 text-purple-800'
      case 'elder': return 'bg-yellow-100 text-yellow-800'
      case 'member': return 'bg-slate-100 text-slate-700'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'inactive': return 'bg-red-100 text-red-800'
      case 'visitor': return 'bg-slate-100 text-slate-700'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <LoadingSpinner />
        </div>
      </DashboardLayout>
    )
  }

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Card className="w-full max-w-md">
            <CardContent className="p-6 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-slate-900 mb-2">Authentication Required</h2>
              <p className="text-slate-600 mb-4">Please log in to access the manual check-in page.</p>
              <Button onClick={() => router.push('/auth')}>
                Go to Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
            <div>
            <h1 className="text-3xl font-bold text-slate-900">Manual Check-in</h1>
            <p className="text-slate-600 mt-2">Search and check in members manually</p>
            </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
            <Button
              variant="outline"
              onClick={resetForm}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by name, membership ID, phone, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
          </div>

              {/* Filters */}
              {showFilters && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                  <div>
                    <Label htmlFor="role-filter">Role</Label>
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        {uniqueRoles.map(role => (
                          <SelectItem key={role} value={role || ''}>
                            {role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Unknown'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="status-filter">Status</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="visitor">Visitor</SelectItem>
                      </SelectContent>
                    </Select>
                </div>

                  <div>
                    <Label htmlFor="service-type">Service Type</Label>
                    <Select value={serviceType} onValueChange={(value) => {
                      console.log('🔍 Select onValueChange called with:', value)
                      console.log('🔍 Available serviceTypes:', serviceTypes)
                      console.log('🔍 Selected serviceType object:', serviceTypes.find(s => s.value === value))
                      setServiceType(value)
                    }}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {serviceTypes.map(service => {
                          console.log('🔍 Rendering SelectItem:', { value: service.value, label: service.label })
                          return (
                            <SelectItem key={service.value} value={service.value}>
                              <span className="flex items-center">
                                <span className="mr-2">{service.icon}</span>
                                {service.label}
                              </span>
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

        {/* Results */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Members List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Members ({filteredMembers.length})
                </CardTitle>
                <CardDescription>
                Select a member to check in
                </CardDescription>
              </CardHeader>
            <CardContent>
              {membersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <LoadingSpinner />
                  </div>
              ) : membersError ? (
                <ErrorDisplay error={membersError} />
              ) : filteredMembers.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No members found</h3>
                  <p className="text-slate-600">Try adjusting your search or filters.</p>
                </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredMembers.map((member) => (
                        <div
                          key={member.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                            selectedMember?.id === member.id
                              ? 'border-slate-900 bg-slate-50'
                          : 'hover:bg-slate-50'
                          }`}
                      onClick={() => setSelectedMember(member)}
                        >
                          <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                              <h3 className="font-medium text-slate-900">
                              {member.user?.full_name || 'Unknown'}
                              </h3>
                            <Badge className={getRoleColor(member.user?.role || '')}>
                              {member.user?.role}
                            </Badge>
                            <Badge className={getStatusColor(member.status)}>
                              {member.status}
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-slate-500">
                            {member.user?.membership_id && (
                              <span className="flex items-center">
                                <User className="h-3 w-3 mr-1" />
                                {formatMembershipIdForDisplay(member.user.membership_id)}
                              </span>
                            )}
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
                            </div>
                            {member.dependants && member.dependants.length > 0 && (
                            <div className="mt-2 text-sm text-slate-600">
                              <UserPlus className="h-3 w-3 inline mr-1" />
                                {member.dependants.length} dependant(s)
                              </div>
                            )}
                        </div>
                        {selectedMember?.id === member.id && (
                          <CheckCircle className="h-5 w-5 text-primary" />
                    )}
                      </div>
                    </div>
                  ))}
                  </div>
                )}
              </CardContent>
            </Card>

          {/* Check-in Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                <UserCheck className="h-5 w-5 mr-2" />
                  Check-in Details
                </CardTitle>
                <CardDescription>
                {selectedMember ? 'Review and confirm check-in' : 'Select a member first'}
                </CardDescription>
              </CardHeader>
            <CardContent>
                {selectedMember ? (
                <div className="space-y-4">
                  {/* Selected Member Info */}
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <h3 className="font-medium text-slate-900 mb-2">
                      {selectedMember.user?.full_name}
                      </h3>
                    <div className="space-y-1 text-sm text-slate-600">
                      <div className="flex items-center">
                        <User className="h-3 w-3 mr-2" />
                        ID: {formatMembershipIdForDisplay(selectedMember.user?.membership_id || '')}
                      </div>
                      {selectedMember.user?.phone && (
                        <div className="flex items-center">
                          <Phone className="h-3 w-3 mr-2" />
                          {selectedMember.user.phone}
                        </div>
                      )}
                      <div className="flex items-center">
                        <Calendar className="h-3 w-3 mr-2" />
                        {serviceTypes.find(s => s.value === serviceType)?.icon} {serviceTypes.find(s => s.value === serviceType)?.label}
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-3 w-3 mr-2" />
                        {new Date().toLocaleString()}
                        </div>
                      </div>
                    </div>

                  {/* Dependants Selection */}
                    {selectedMember.dependants && selectedMember.dependants.length > 0 && (
                      <div>
                        <Label className="text-sm font-medium">Include Dependants</Label>
                        <div className="mt-2 space-y-2">
                          {selectedMember.dependants.map((dependant) => (
                            <div key={dependant.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={dependant.id}
                                checked={selectedDependants.includes(dependant.id)}
                                onCheckedChange={() => handleDependantToggle(dependant.id)}
                              />
                            <Label htmlFor={dependant.id} className="text-sm">
                              {dependant.first_name} {dependant.middle_name} {dependant.last_name} ({dependant.relationship})
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Error Display */}
                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center">
                        <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
                        <span className="text-sm text-red-800">{error}</span>
                      </div>
                    </div>
                  )}

                  {/* Check-in Button */}
                    <Button 
                      onClick={handleCheckIn}
                      disabled={loading}
                      className="w-full"
                    size="lg"
                    >
                      {loading ? (
                        <>
                        <LoadingSpinner className="h-4 w-4 mr-2" />
                        Processing...
                        </>
                      ) : (
                        <>
                        <UserCheck className="h-4 w-4 mr-2" />
                        Check In Member
                        </>
                      )}
                    </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No Member Selected</h3>
                  <p className="text-slate-600">Select a member from the list to proceed with check-in.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

        {/* Success Result */}
        {checkInResult && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-6">
              <div className="flex items-center mb-4">
                <CheckCircle className="h-6 w-6 text-green-600 mr-2" />
                <h3 className="text-lg font-semibold text-green-800">Check-in Successful!</h3>
              </div>
              <div className="space-y-2 text-sm">
                <p><strong>Member:</strong> {checkInResult.member.user?.full_name}</p>
                <p><strong>Service:</strong> {checkInResult.service_type}</p>
                <p><strong>Time:</strong> {formatDateTime(checkInResult.timestamp)}</p>
                {checkInResult.dependants.length > 0 && (
                  <p><strong>Dependants:</strong> {checkInResult.dependants.map(d => `${d.first_name} ${d.middle_name} ${d.last_name}`).join(', ')}</p>
                )}
              </div>
              <div className="mt-4 flex space-x-2">
                <Button onClick={resetForm} variant="outline">
                  Check In Another
              </Button>
                <Button onClick={() => router.push('/attendance')}>
                  View Attendance
              </Button>
            </div>
          </CardContent>
        </Card>
        )}
      </div>
    </DashboardLayout>
  )
}