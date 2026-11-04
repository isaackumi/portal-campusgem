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
import { memberStatusTone, roleTone } from '@/lib/ui/chip-tones'
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
import { cn, formatMembershipIdForDisplay, formatDateTime } from '@/lib/utils'
import { PageHeader } from '@/components/layout/page-header'
import { PersonAvatar, displayName } from '@/components/ui/person'
import { PhoneLink, QuickContactButtons } from '@/components/contact/phone-link'
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

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[400px] items-center justify-center">
          <LoadingSpinner />
        </div>
      </DashboardLayout>
    )
  }

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[400px] items-center justify-center">
          <Card className="w-full max-w-md">
            <CardContent className="p-6 text-center">
              <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500 dark:text-red-400" />
              <h2 className="app-section-title mb-2">Authentication required</h2>
              <p className="mb-4 text-neutral-600 dark:text-neutral-300">Please log in to access the manual check-in page.</p>
              <Button onClick={() => router.push('/auth')}>
                Go to Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  const currentService = serviceTypes.find((s) => s.value === serviceType)
  const dependantName = (d: Dependant) => [d.first_name, d.middle_name, d.last_name].filter(Boolean).join(' ')

  const dependantPicker = (member: MemberWithDependants) =>
    member.dependants && member.dependants.length > 0 ? (
      <fieldset>
        <legend className="app-overline mb-2">Include dependants</legend>
        <div className="space-y-1">
          {member.dependants.map((dependant) => (
            <label
              key={dependant.id}
              htmlFor={`dep-${member.id}-${dependant.id}`}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-2 hover:bg-neutral-100 dark:hover:bg-white/[0.04]"
            >
              <Checkbox
                id={`dep-${member.id}-${dependant.id}`}
                checked={selectedDependants.includes(dependant.id)}
                onCheckedChange={() => handleDependantToggle(dependant.id)}
              />
              <span className="min-w-0 flex-1 truncate text-sm text-neutral-800 dark:text-neutral-200">
                {dependantName(dependant)}{' '}
                <span className="capitalize text-neutral-500 dark:text-neutral-400">({dependant.relationship})</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
    ) : null

  const checkInLabel = loading
    ? 'Checking in…'
    : `Check in${selectedDependants.length ? ` + ${selectedDependants.length}` : ''}`

  return (
    <DashboardLayout>
      <div className={cn('space-y-4 sm:space-y-6', selectedMember && !checkInResult && 'pb-24 lg:pb-0')}>
        <PageHeader
          title="Manual check-in"
          description="Search and check in members by hand"
          className="mb-0"
          actions={
            <>
              <Button
                variant="outline"
                className="h-11 flex-1 sm:h-10 sm:flex-none"
                aria-expanded={showFilters}
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="mr-2 h-4 w-4" />
                Filters
                {roleFilter !== 'all' || statusFilter !== 'all' ? (
                  <Badge variant="brand" className="ml-2">
                    {(roleFilter !== 'all' ? 1 : 0) + (statusFilter !== 'all' ? 1 : 0)}
                  </Badge>
                ) : null}
              </Button>
              <Button variant="outline" className="h-11 flex-1 sm:h-10 sm:flex-none" onClick={resetForm}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Reset
              </Button>
            </>
          }
        />

        {checkInResult && (
          <div
            role="status"
            className="dashboard-panel space-y-3 p-4 ring-1 ring-inset ring-emerald-600/20 dark:ring-emerald-400/20 sm:p-5"
          >
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
              <CheckCircle className="h-5 w-5" />
              <h2 className="app-section-title text-emerald-700 dark:text-emerald-300">Checked in</h2>
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
              <dt className="text-neutral-500 dark:text-neutral-400">Member</dt>
              <dd className="min-w-0 truncate font-medium text-neutral-900 dark:text-neutral-100">
                {displayName(checkInResult.member.user?.full_name)}
              </dd>
              <dt className="text-neutral-500 dark:text-neutral-400">Service</dt>
              <dd className="text-neutral-900 dark:text-neutral-100">{checkInResult.service_type}</dd>
              <dt className="text-neutral-500 dark:text-neutral-400">Time</dt>
              <dd className="tabular-nums text-neutral-900 dark:text-neutral-100">{formatDateTime(checkInResult.timestamp)}</dd>
              {checkInResult.dependants.length > 0 && (
                <>
                  <dt className="text-neutral-500 dark:text-neutral-400">Dependants</dt>
                  <dd className="text-neutral-900 dark:text-neutral-100">
                    {checkInResult.dependants.map(dependantName).join(', ')}
                  </dd>
                </>
              )}
            </dl>
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <Button onClick={resetForm} className="h-11">
                Check in another
              </Button>
              <Button variant="outline" className="h-11" onClick={() => router.push('/attendance')}>
                View attendance
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
              <Input
                aria-label="Search members"
                placeholder="Name, membership ID, phone or email"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-11 pl-10 sm:h-10"
                enterKeyHint="search"
              />
            </div>
            <Select value={serviceType} onValueChange={setServiceType}>
              <SelectTrigger className="h-11 sm:h-10 sm:w-56" aria-label="Service">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {serviceTypes.map((service) => (
                  <SelectItem key={service.value} value={service.value}>
                    <span className="flex items-center">
                      <span className="mr-2">{service.icon}</span>
                      {service.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {showFilters && (
            <div className="grid grid-cols-2 gap-3 sm:max-w-md">
              <div>
                <Label htmlFor="role-filter" className="app-overline">Role</Label>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger id="role-filter" className="mt-1 h-11 sm:h-10">
                    <SelectValue placeholder="All roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All roles</SelectItem>
                    {uniqueRoles.map((role) => (
                      <SelectItem key={role} value={role || ''}>
                        {role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Unknown'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="status-filter" className="app-overline">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger id="status-filter" className="mt-1 h-11 sm:h-10">
                    <SelectValue placeholder="All statuses" />
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

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="dashboard-panel min-w-0 overflow-hidden">
            <div className="flex items-baseline justify-between gap-3 border-b border-neutral-200/80 px-4 py-3 dark:border-white/[0.06] sm:px-5">
              <h2 className="app-section-title">Members</h2>
              <p className="text-[13px] tabular-nums text-neutral-500 dark:text-neutral-400">{filteredMembers.length}</p>
            </div>
            {membersLoading ? (
              <div className="flex items-center justify-center py-10">
                <LoadingSpinner />
              </div>
            ) : membersError ? (
              <div className="p-4">
                <ErrorDisplay error={membersError} />
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Users className="mx-auto mb-3 h-10 w-10 text-neutral-400 dark:text-neutral-500" />
                <p className="font-medium text-neutral-900 dark:text-neutral-100">No members found</p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Try a different search or clear the filters.</p>
              </div>
            ) : (
              <ul className="divide-y divide-neutral-100 dark:divide-white/[0.06] lg:max-h-[36rem] lg:overflow-y-auto">
                {filteredMembers.map((member) => {
                  const selected = selectedMember?.id === member.id
                  return (
                    <li
                      key={member.id}
                      className={cn(
                        'transition-colors',
                        selected ? 'bg-brand-50/70 dark:bg-brand-400/10' : 'hover:bg-neutral-50 dark:hover:bg-white/[0.03]'
                      )}
                    >
                      <div
                        role="button"
                        tabIndex={0}
                        aria-pressed={selected}
                        onClick={() => {
                          if (selectedMember?.id !== member.id) setSelectedDependants([])
                          setSelectedMember(member)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            if (selectedMember?.id !== member.id) setSelectedDependants([])
                            setSelectedMember(member)
                          }
                        }}
                        className="flex min-h-14 cursor-pointer items-center gap-3 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500/40 sm:px-5"
                      >
                        <PersonAvatar name={member.user?.full_name} seed={member.id} />
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-center gap-2">
                            <p className="truncate font-medium text-neutral-900 dark:text-neutral-100">
                              {displayName(member.user?.full_name) || 'Unknown'}
                            </p>
                            {member.status && member.status !== 'active' ? (
                              <Badge variant={memberStatusTone(member.status)} className="capitalize">
                                {member.status}
                              </Badge>
                            ) : null}
                            {member.user?.role && member.user.role !== 'member' ? (
                              <Badge variant={roleTone(member.user.role)} className="hidden capitalize sm:inline-flex">
                                {member.user.role}
                              </Badge>
                            ) : null}
                          </div>
                          <div className="flex min-w-0 flex-wrap items-center gap-x-3 text-[13px] text-neutral-500 dark:text-neutral-400">
                            {member.user?.membership_id && (
                              <span className="font-mono">{formatMembershipIdForDisplay(member.user.membership_id)}</span>
                            )}
                            {member.user?.phone && (
                              <PhoneLink phone={member.user.phone} name={member.user.full_name} />
                            )}
                            {member.dependants && member.dependants.length > 0 && (
                              <span className="inline-flex items-center gap-1">
                                <UserPlus className="h-3 w-3" />
                                {member.dependants.length}
                              </span>
                            )}
                          </div>
                        </div>
                        {selected ? (
                          <CheckCircle className="h-5 w-5 shrink-0 text-brand-600 dark:text-brand-300" aria-hidden />
                        ) : null}
                      </div>
                      {selected && member.dependants && member.dependants.length > 0 ? (
                        <div className="px-4 pb-3 pl-16 lg:hidden">{dependantPicker(member)}</div>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <section className="dashboard-panel hidden p-5 lg:block lg:self-start">
            <h2 className="app-section-title mb-1 flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Check-in details
            </h2>
            <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
              {selectedMember ? 'Review and confirm' : 'Select a member first'}
            </p>
            {selectedMember ? (
              <div className="space-y-4">
                <div className="rounded-lg bg-neutral-50 p-4 ring-1 ring-inset ring-neutral-200/80 dark:bg-white/[0.04] dark:ring-white/[0.06]">
                  <div className="mb-3 flex items-center gap-3">
                    <PersonAvatar name={selectedMember.user?.full_name} seed={selectedMember.id} size="lg" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-neutral-900 dark:text-neutral-100">
                        {displayName(selectedMember.user?.full_name)}
                      </p>
                      <p className="font-mono text-[13px] text-neutral-500 dark:text-neutral-400">
                        {formatMembershipIdForDisplay(selectedMember.user?.membership_id || '')}
                      </p>
                    </div>
                    <QuickContactButtons phone={selectedMember.user?.phone} name={selectedMember.user?.full_name} />
                  </div>
                  <div className="space-y-1 text-sm text-neutral-600 dark:text-neutral-300">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5" />
                      {currentService?.icon} {currentService?.label}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5" />
                      {new Date().toLocaleString()}
                    </div>
                  </div>
                </div>

                {dependantPicker(selectedMember)}

                {error && (
                  <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-800 ring-1 ring-inset ring-red-600/15 dark:bg-red-400/10 dark:text-red-300 dark:ring-red-400/20">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}

                <Button onClick={handleCheckIn} disabled={loading} className="w-full" size="lg">
                  <UserCheck className="mr-2 h-4 w-4" />
                  {checkInLabel}
                </Button>
              </div>
            ) : (
              <div className="py-8 text-center">
                <User className="mx-auto mb-3 h-10 w-10 text-neutral-400 dark:text-neutral-500" />
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Pick someone from the list to check them in.</p>
              </div>
            )}
          </section>
        </div>

        {selectedMember && !checkInResult && (
          <div className="fixed inset-x-3 bottom-20 z-30 lg:hidden">
            <div className="flex items-center gap-3 rounded-xl border border-neutral-200/80 bg-white p-2 pl-3 shadow-lg dark:border-white/10 dark:bg-neutral-800">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {displayName(selectedMember.user?.full_name)}
                </p>
                <p className="truncate text-[13px] text-neutral-500 dark:text-neutral-400">
                  {error ? <span className="text-red-600 dark:text-red-300">{error}</span> : currentService?.label}
                </p>
              </div>
              <Button onClick={handleCheckIn} disabled={loading} className="h-11 shrink-0">
                <UserCheck className="mr-2 h-4 w-4" />
                {checkInLabel}
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
