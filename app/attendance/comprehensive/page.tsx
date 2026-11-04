'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/providers'
import { DashboardLayout } from '@/components/dashboard-layout'
import { StatCard } from '@/components/ui/stat-card'
import { PageHeader } from '@/components/layout/page-header'
import { Meter } from '@/components/ui/meter'
import { displayName } from '@/components/ui/person'
import { PhoneLink, QuickContactButtons } from '@/components/contact/phone-link'
import { WhatsappLogo } from '@/components/icons/whatsapp-logo'
import { telHref, whatsAppChatHref } from '@/lib/contact-links'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, ScrollableTabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { LoadingSpinner } from '@/components/ui/loading'
import { ErrorDisplay } from '@/components/ui/error-display'
import { 
  Users, 
  UserCheck, 
  UserX, 
  MessageSquare,
  BarChart3,
  Calendar,
  Clock,
  Filter,
  Search,
  Send,
  Phone,
  Mail,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  PieChart,
  LineChart,
  MoreVertical
} from 'lucide-react'
import { enhancedAttendanceService, AttendanceStats } from '@/lib/services/enhanced-attendance-service'
import { AttendanceActivity } from '@/lib/types'
import { dataService } from '@/lib/services/data-service'
import { ServiceTypeMapper } from '@/lib/constants/service-types'
import { useToast } from '@/hooks/use-toast'
import { cn, formatDateTime } from '@/lib/utils'

interface Member {
  id: string
  full_name: string
  membership_id: string
  phone?: string
  email?: string
  gender?: 'male' | 'female'
  dob?: string
  departments?: string[]
  is_present?: boolean
  is_absentee?: boolean
}

interface AbsenteeMember {
  id: string
  member_id: string
  full_name: string
  membership_id: string
  phone?: string
  service_date: string
  service_type: string
  reason?: string
  follow_up_required: boolean
  follow_up_completed: boolean
  sms_sent: boolean
  created_at: string
}

export default function ComprehensiveAttendancePage() {
  const { user, loading: authLoading } = useAuth()
  const [members, setMembers] = useState<Member[]>([])
  const [absentees, setAbsentees] = useState<AbsenteeMember[]>([])
  const [stats, setStats] = useState<AttendanceStats | null>(null)
  const [recentActivity, setRecentActivity] = useState<AttendanceActivity[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Filters
  const [serviceType, setServiceType] = useState('sunday_service')
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0])
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [genderFilter, setGenderFilter] = useState('all')
  const [ageFilter, setAgeFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  
  // Selection
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [selectedAbsentees, setSelectedAbsentees] = useState<string[]>([])
  
  // Actions
  const [sendingSMS, setSendingSMS] = useState(false)
  const [recordingAttendance, setRecordingAttendance] = useState(false)
  
  const { toast } = useToast()

  const serviceTypes = ServiceTypeMapper.getOptions()

  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user, serviceDate, serviceType])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch members (Firebase/dataService)
      const all: typeof members = []
      let page = 1
      const limit = 200
      let hasMore = true
      while (hasMore) {
        const res = await dataService.getMembers(page, limit)
        if (res.error) throw new Error(res.error)
        const list = res.data ?? []
        for (const m of list) {
          all.push({
            id: m.id,
            full_name: m.user?.full_name ?? '',
            membership_id: m.user?.membership_id ?? '',
            phone: m.user?.phone,
            email: m.user?.email,
            gender: m.gender === 'other' ? undefined : m.gender,
            dob: m.dob,
            departments: []
          })
        }
        hasMore = list.length === limit
        page++
      }
      setMembers(all)

      // Fetch attendance stats
      const dateRange = {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
      }
      
      const statsData = await enhancedAttendanceService.getAttendanceStats(dateRange)
      setStats(statsData)

      // Fetch recent activity
      const activityData = await enhancedAttendanceService.getRecentActivity(10)
      setRecentActivity(activityData)

      // Fetch absentees for today (pass current member list)
      await fetchAbsentees(all)
    } catch (err) {
      console.error('Error fetching data:', err)
      setError('Failed to load attendance data')
    } finally {
      setLoading(false)
    }
  }

  const fetchAbsentees = async (membersList: Member[]) => {
    try {
      const { data: attendanceList } = await dataService.getAttendanceRecords({
        service_date: serviceDate,
        service_type: serviceType,
        limit: 5000
      })
      const presentMemberIds = new Set((attendanceList ?? []).map((r: any) => r.member_id))

      const absenteesList: AbsenteeMember[] = []
      for (const m of membersList) {
        if (presentMemberIds.has(m.id)) continue
        absenteesList.push({
          id: `absentee-${m.id}`,
          member_id: m.id,
          full_name: m.full_name,
          membership_id: m.membership_id,
          phone: m.phone,
          service_date: serviceDate,
          service_type: serviceType,
          follow_up_required: true,
          follow_up_completed: false,
          sms_sent: false,
          created_at: new Date().toISOString()
        })
      }
      setAbsentees(absenteesList)
    } catch (err) {
      console.error('Error fetching absentees:', err)
    }
  }

  const handleMemberSelect = (memberId: string) => {
    setSelectedMembers(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    )
  }

  const handleSelectAllMembers = () => {
    const filtered = getFilteredMembers()
    if (selectedMembers.length === filtered.length) {
      setSelectedMembers([])
    } else {
      setSelectedMembers(filtered.map(m => m.id))
    }
  }

  const handleAbsenteeSelect = (absenteeId: string) => {
    setSelectedAbsentees(prev => 
      prev.includes(absenteeId) 
        ? prev.filter(id => id !== absenteeId)
        : [...prev, absenteeId]
    )
  }

  const getFilteredMembers = (): Member[] => {
    return members.filter(member => {
      const matchesSearch = searchTerm === '' || 
        member.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.membership_id.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesDepartment = departmentFilter === 'all' || 
        member.departments?.includes(departmentFilter)

      const matchesGender = genderFilter === 'all' || member.gender === genderFilter

      const matchesAge = ageFilter === 'all' || 
        (ageFilter === 'adult' && getAgeCategory(member.dob) === 'adult') ||
        (ageFilter === 'child' && getAgeCategory(member.dob) === 'child')

      return matchesSearch && matchesDepartment && matchesGender && matchesAge
    })
  }

  const getAgeCategory = (dob?: string): 'adult' | 'child' => {
    if (!dob) return 'adult'
    const age = new Date().getFullYear() - new Date(dob).getFullYear()
    return age < 18 ? 'child' : 'adult'
  }

  const handleBulkAttendance = async () => {
    if (selectedMembers.length === 0) {
      toast({
        title: "No Selection",
        description: "Please select members to record attendance for.",
        variant: "destructive"
      })
      return
    }

    try {
      setRecordingAttendance(true)

      const result = await enhancedAttendanceService.recordBulkAttendance({
        member_ids: selectedMembers,
        service_date: serviceDate,
        service_type: serviceType,
        created_by: user?.id || 'admin',
        checked_in_by: user?.id || undefined,
        method: 'admin'
      })

      toast({
        title: "Attendance Recorded",
        description: `${result.successful} members checked in successfully. ${result.duplicates} duplicates prevented.`,
        variant: "default"
      })

      setSelectedMembers([])
      fetchData()
    } catch (err) {
      console.error('Error recording bulk attendance:', err)
      toast({
        title: "Error",
        description: "Failed to record attendance. Please try again.",
        variant: "destructive"
      })
    } finally {
      setRecordingAttendance(false)
    }
  }

  const handleMarkAbsentee = async (memberId: string) => {
    try {
      await enhancedAttendanceService.markAbsentee({
        member_id: memberId,
        service_date: serviceDate,
        service_type: serviceType,
        follow_up_required: true,
        created_by: user?.id || 'admin'
      })

      toast({
        title: "Absentee Marked",
        description: "Member marked as absent and follow-up scheduled.",
        variant: "default"
      })

      fetchAbsentees(members)
    } catch (err) {
      console.error('Error marking absentee:', err)
      toast({
        title: "Error",
        description: "Failed to mark absentee. Please try again.",
        variant: "destructive"
      })
    }
  }

  const handleSendAbsenteeSMS = async () => {
    if (selectedAbsentees.length === 0) {
      toast({
        title: "No Selection",
        description: "Please select absentees to send SMS to.",
        variant: "destructive"
      })
      return
    }

    try {
      setSendingSMS(true)
      let successCount = 0

      for (const absenteeId of selectedAbsentees) {
        const success = await enhancedAttendanceService.sendAbsenteeSMS(absenteeId)
        if (success) successCount++
      }

      toast({
        title: "SMS Sent",
        description: `SMS messages sent to ${successCount} absentees.`,
        variant: "default"
      })

      setSelectedAbsentees([])
      fetchAbsentees(members)
    } catch (err) {
      console.error('Error sending SMS:', err)
      toast({
        title: "Error",
        description: "Failed to send SMS messages. Please try again.",
        variant: "destructive"
      })
    } finally {
      setSendingSMS(false)
    }
  }

  const filteredMembers = getFilteredMembers()
  const uniqueDepartments = Array.from(new Set(members.flatMap(m => m.departments || [])))

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

  const allMembersSelected = selectedMembers.length === filteredMembers.length && filteredMembers.length > 0
  const activityIcon = (type: string) => {
    switch (type) {
      case 'check_in':
        return <UserCheck className="h-5 w-5 text-brand-600 dark:text-brand-300" />
      case 'bulk_attendance':
        return <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
      case 'absentee_marked':
        return <UserX className="h-5 w-5 text-red-600 dark:text-red-400" />
      case 'follow_up':
        return <MessageSquare className="h-5 w-5 text-violet-600 dark:text-violet-400" />
      default:
        return <Activity className="h-5 w-5 text-neutral-500 dark:text-neutral-400" />
    }
  }

  return (
    <DashboardLayout>
      <div className={cn('mx-auto max-w-7xl', selectedMembers.length > 0 && 'pb-24')}>
        <PageHeader
          title="Attendance desk"
          description="Record attendance by department, prevent duplicates and follow up absentees"
          className="mb-4 sm:mb-6"
        />

        {error && <ErrorDisplay error={error} onRetry={fetchData} variant="page" />}

        {stats && (
          <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard className="p-4 sm:p-5" label="Total attendance" value={stats.total_attendance} />
            <StatCard
              className="p-4 sm:p-5"
              label="Male / female"
              value={`${stats.male_attendance} / ${stats.female_attendance}`}
            />
            <StatCard
              className="p-4 sm:p-5"
              label="Adults / children"
              value={`${stats.adult_attendance} / ${stats.children_attendance}`}
            />
            <StatCard className="p-4 sm:p-5" label="Absentees" value={absentees.length} tone={absentees.length ? 'warning' : 'default'} />
          </div>
        )}

        <Tabs defaultValue="attendance" className="space-y-4 sm:space-y-6">
          <ScrollableTabsList>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="absentees">
              Absentees{absentees.length ? ` (${absentees.length})` : ''}
            </TabsTrigger>
            <TabsTrigger value="departments">Departments</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </ScrollableTabsList>

          <TabsContent value="attendance" className="space-y-4">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
                <div className="min-w-0 sm:w-44">
                  <Label htmlFor="cmp-date" className="app-overline">Date</Label>
                  <Input
                    id="cmp-date"
                    type="date"
                    value={serviceDate}
                    onChange={(e) => setServiceDate(e.target.value)}
                    className="mt-1 h-11 sm:h-10"
                  />
                </div>
                <div className="min-w-0 sm:w-52">
                  <Label htmlFor="cmp-service" className="app-overline">Service</Label>
                  <Select value={serviceType} onValueChange={setServiceType}>
                    <SelectTrigger id="cmp-service" className="mt-1 h-11 sm:h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {serviceTypes.map((service) => (
                        <SelectItem key={service.value} value={service.value}>
                          {service.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 min-w-0 sm:col-span-1 sm:w-48">
                  <Label htmlFor="cmp-dept" className="app-overline">Department</Label>
                  <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                    <SelectTrigger id="cmp-dept" className="mt-1 h-11 sm:h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All departments</SelectItem>
                      {uniqueDepartments.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-0 sm:w-32">
                  <Label htmlFor="cmp-gender" className="app-overline">Gender</Label>
                  <Select value={genderFilter} onValueChange={setGenderFilter}>
                    <SelectTrigger id="cmp-gender" className="mt-1 h-11 sm:h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-0 sm:w-32">
                  <Label htmlFor="cmp-age" className="app-overline">Age</Label>
                  <Select value={ageFilter} onValueChange={setAgeFilter}>
                    <SelectTrigger id="cmp-age" className="mt-1 h-11 sm:h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="adult">Adults</SelectItem>
                      <SelectItem value="child">Children</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
                <Input
                  aria-label="Search members"
                  placeholder="Search members"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-11 pl-10 sm:h-10"
                  enterKeyHint="search"
                />
              </div>
            </div>

            <section className="dashboard-panel overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-neutral-200/80 px-4 py-2 dark:border-white/[0.06] sm:px-5">
                <label className="flex min-h-11 cursor-pointer items-center gap-3">
                  <Checkbox
                    checked={allMembersSelected}
                    onCheckedChange={handleSelectAllMembers}
                    aria-label="Select all members"
                  />
                  <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Select all</span>
                </label>
                <p className="text-[13px] tabular-nums text-neutral-500 dark:text-neutral-400">
                  {selectedMembers.length} of {filteredMembers.length} selected
                </p>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <LoadingSpinner />
                </div>
              ) : filteredMembers.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <Users className="mx-auto mb-3 h-10 w-10 text-neutral-400 dark:text-neutral-500" />
                  <p className="text-neutral-500 dark:text-neutral-400">No members match these filters</p>
                </div>
              ) : (
                <ul className="divide-y divide-neutral-100 dark:divide-white/[0.06]">
                  {filteredMembers.map((member) => {
                    const selected = selectedMembers.includes(member.id)
                    const age = getAgeCategory(member.dob)
                    return (
                      <li
                        key={member.id}
                        className={cn(
                          'flex items-center gap-3 px-4 py-2 transition-colors sm:px-5',
                          selected ? 'bg-brand-50/70 dark:bg-brand-400/10' : 'hover:bg-neutral-50 dark:hover:bg-white/[0.03]'
                        )}
                      >
                        <label htmlFor={`cm-${member.id}`} className="flex min-h-14 min-w-0 flex-1 cursor-pointer items-center gap-3">
                          <Checkbox
                            id={`cm-${member.id}`}
                            checked={selected}
                            onCheckedChange={() => handleMemberSelect(member.id)}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium text-neutral-900 dark:text-neutral-100">
                              {displayName(member.full_name)}
                            </span>
                            <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-neutral-500 dark:text-neutral-400">
                              <span className="font-mono">{member.membership_id}</span>
                              <span className="capitalize">
                                {member.gender || 'Unknown'} · {age}
                              </span>
                            </span>
                            {member.departments && member.departments.length > 0 && (
                              <span className="mt-1 flex flex-wrap gap-1">
                                {member.departments.map((dept) => (
                                  <Badge key={dept} variant="outline">
                                    {dept}
                                  </Badge>
                                ))}
                              </span>
                            )}
                          </span>
                        </label>
                        {member.phone ? (
                          <PhoneLink
                            phone={member.phone}
                            name={member.full_name}
                            className="hidden text-[13px] text-neutral-600 dark:text-neutral-300 md:inline-flex"
                          />
                        ) : null}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0" aria-label={`Actions for ${member.full_name}`}>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            {telHref(member.phone) ? (
                              <DropdownMenuItem asChild className="min-h-11 gap-3">
                                <a href={telHref(member.phone)!}>
                                  <Phone className="h-4 w-4" /> Call
                                </a>
                              </DropdownMenuItem>
                            ) : null}
                            {whatsAppChatHref(member.phone) ? (
                              <DropdownMenuItem asChild className="min-h-11 gap-3">
                                <a href={whatsAppChatHref(member.phone)!} target="_blank" rel="noopener noreferrer">
                                  <WhatsappLogo className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> WhatsApp
                                </a>
                              </DropdownMenuItem>
                            ) : null}
                            <DropdownMenuItem className="min-h-11 gap-3" onSelect={() => handleMarkAbsentee(member.id)}>
                              <UserX className="h-4 w-4" /> Mark absent
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          </TabsContent>

          <TabsContent value="absentees" className="space-y-4">
            <section className="dashboard-panel overflow-hidden">
              <div className="flex flex-col gap-3 border-b border-neutral-200/80 px-4 py-3 dark:border-white/[0.06] sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div>
                  <h2 className="app-section-title">Absentees</h2>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Missed this service and need a follow-up</p>
                </div>
                <Button
                  className="h-11 w-full sm:h-10 sm:w-auto"
                  onClick={handleSendAbsenteeSMS}
                  disabled={selectedAbsentees.length === 0 || sendingSMS}
                >
                  {sendingSMS ? (
                    <>
                      <LoadingSpinner className="mr-2 h-4 w-4" />
                      Sending…
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send SMS ({selectedAbsentees.length})
                    </>
                  )}
                </Button>
              </div>
              {absentees.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <UserX className="mx-auto mb-3 h-10 w-10 text-neutral-400 dark:text-neutral-500" />
                  <p className="text-neutral-500 dark:text-neutral-400">No absentees for this service</p>
                </div>
              ) : (
                <ul className="divide-y divide-neutral-100 dark:divide-white/[0.06]">
                  {absentees.map((absentee) => (
                    <li key={absentee.id} className="flex items-start gap-3 px-4 py-3 sm:px-5">
                      <label htmlFor={`ab-${absentee.id}`} className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-start gap-3">
                        <Checkbox
                          id={`ab-${absentee.id}`}
                          className="mt-1"
                          checked={selectedAbsentees.includes(absentee.id)}
                          onCheckedChange={() => handleAbsenteeSelect(absentee.id)}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-neutral-900 dark:text-neutral-100">
                            {displayName(absentee.full_name)}
                          </span>
                          <span className="block font-mono text-[13px] text-neutral-500 dark:text-neutral-400">
                            {absentee.membership_id}
                          </span>
                          {absentee.reason && (
                            <span className="mt-1 block text-sm text-neutral-600 dark:text-neutral-300">
                              Reason: {absentee.reason}
                            </span>
                          )}
                          <span className="mt-1.5 flex flex-wrap gap-1.5">
                            <Badge variant={absentee.follow_up_completed ? 'success' : 'warning'}>
                              {absentee.follow_up_completed ? 'Followed up' : 'Follow-up pending'}
                            </Badge>
                            <Badge variant={absentee.sms_sent ? 'brand' : 'secondary'}>
                              {absentee.sms_sent ? 'SMS sent' : 'No SMS'}
                            </Badge>
                          </span>
                        </span>
                      </label>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <QuickContactButtons phone={absentee.phone} name={absentee.full_name} />
                        {absentee.phone ? (
                          <PhoneLink
                            phone={absentee.phone}
                            name={absentee.full_name}
                            className="hidden text-[13px] text-neutral-600 dark:text-neutral-300 sm:inline-flex"
                          />
                        ) : null}
                        {absentee.phone && !absentee.sms_sent && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9"
                            onClick={() => enhancedAttendanceService.sendAbsenteeSMS(absentee.id)}
                          >
                            <MessageSquare className="mr-1 h-4 w-4" />
                            SMS
                          </Button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </TabsContent>

          <TabsContent value="departments" className="space-y-4">
            {stats?.department_stats ? (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
                <section className="dashboard-panel p-4 sm:p-5">
                  <h2 className="app-section-title">By department</h2>
                  <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">Present out of members in each department</p>
                  <ul className="space-y-4">
                    {Object.entries(stats.department_stats).map(([dept, deptStats]) => {
                      const percentage = deptStats.total > 0 ? (deptStats.present / deptStats.total) * 100 : 0
                      return (
                        <li key={dept} className="space-y-1.5">
                          <div className="flex items-baseline justify-between gap-3 text-sm">
                            <span className="min-w-0 truncate font-medium text-neutral-900 dark:text-neutral-100">{dept}</span>
                            <span className="shrink-0 tabular-nums text-neutral-500 dark:text-neutral-400">
                              {deptStats.present}/{deptStats.total} · {percentage.toFixed(0)}%
                            </span>
                          </div>
                          <Meter value={deptStats.present} max={deptStats.total} label={`${dept} attendance`} />
                        </li>
                      )
                    })}
                  </ul>
                </section>

                <section className="dashboard-panel p-4 sm:p-5">
                  <h2 className="app-section-title mb-4">Duplicate prevention</h2>
                  <dl className="space-y-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-neutral-600 dark:text-neutral-300">Duplicates blocked</dt>
                      <dd className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
                        {stats.duplicate_prevention.blocked_duplicates}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-neutral-600 dark:text-neutral-300">Sessions monitored</dt>
                      <dd className="font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                        {stats.duplicate_prevention.sessions_checked}
                      </dd>
                    </div>
                  </dl>
                </section>
              </div>
            ) : (
              <div className="dashboard-panel px-4 py-10 text-center text-neutral-500 dark:text-neutral-400">
                No department data for this service yet.
              </div>
            )}
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            <section className="dashboard-panel overflow-hidden">
              <h2 className="app-section-title border-b border-neutral-200/80 px-4 py-3 dark:border-white/[0.06] sm:px-5">
                Recent activity
              </h2>
              {recentActivity.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <Activity className="mx-auto mb-3 h-10 w-10 text-neutral-400 dark:text-neutral-500" />
                  <p className="text-neutral-500 dark:text-neutral-400">No recent activity</p>
                </div>
              ) : (
                <ul className="divide-y divide-neutral-100 dark:divide-white/[0.06]">
                  {recentActivity.map((activity) => (
                    <li key={activity.id} className="flex items-start gap-3 px-4 py-3 sm:px-5">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-100 dark:bg-white/[0.06]">
                        {activityIcon(activity.type)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="break-words font-medium text-neutral-900 dark:text-neutral-100">{activity.description}</p>
                        <p className="flex flex-wrap items-center gap-x-2 text-[13px] text-neutral-500 dark:text-neutral-400">
                          <span>{activity.service_date}</span>
                          <span aria-hidden>·</span>
                          <span>{activity.service_type}</span>
                          <span aria-hidden className="sm:hidden">·</span>
                          <span className="tabular-nums sm:hidden">{new Date(activity.created_at).toLocaleTimeString()}</span>
                        </p>
                      </div>
                      <p className="hidden shrink-0 text-[13px] tabular-nums text-neutral-500 dark:text-neutral-400 sm:block">
                        {new Date(activity.created_at).toLocaleString()}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </TabsContent>
        </Tabs>

        {selectedMembers.length > 0 && (
          <div className="fixed inset-x-3 bottom-20 z-30 lg:bottom-4 lg:left-1/2 lg:right-auto lg:w-[28rem] lg:-translate-x-1/2">
            <div className="flex items-center gap-3 rounded-xl border border-neutral-200/80 bg-white p-2 pl-4 shadow-lg dark:border-white/10 dark:bg-neutral-800">
              <p className="min-w-0 flex-1 text-sm font-medium tabular-nums text-neutral-900 dark:text-neutral-100">
                {selectedMembers.length} selected
              </p>
              <Button
                variant="ghost"
                className="h-11 shrink-0 px-3"
                onClick={() => setSelectedMembers([])}
                aria-label="Clear selection"
              >
                <XCircle className="h-4 w-4" />
              </Button>
              <Button onClick={handleBulkAttendance} disabled={recordingAttendance} className="h-11 shrink-0">
                {recordingAttendance ? (
                  <>
                    <LoadingSpinner className="mr-2 h-4 w-4" />
                    Recording…
                  </>
                ) : (
                  <>
                    <UserCheck className="mr-2 h-4 w-4" />
                    Record attendance
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
