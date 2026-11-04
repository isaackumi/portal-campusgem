'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, ScrollableTabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader } from '@/components/layout/page-header'
import { StatCard } from '@/components/ui/stat-card'
import { PersonAvatar, displayName } from '@/components/ui/person'
import { LoadingSpinner } from '@/components/ui/loading'
import { ErrorDisplay } from '@/components/ui/error-display'
import { 
  Calendar, 
  Users, 
  BarChart3,
  TrendingUp,
  TrendingDown,
  QrCode,
  Monitor,
  CheckSquare,
  ArrowLeft,
  Download,
  Filter,
  Search
} from 'lucide-react'
import { useAttendanceRecordsQuery, useAttendanceStatsQuery } from '@/lib/hooks/use-data'
import { dataService } from '@/lib/services/data-service'
import { formatDateTime, formatMembershipIdForDisplay } from '@/lib/utils'

interface AttendanceRecord {
  id: string
  member_id: string
  service_date: string
  service_type: string
  check_in_time: string
  status: string
  member: {
    full_name: string
    membership_id: string
  }
}

interface AttendanceStats {
  total_attendance: number
  today_attendance: number
  weekly_attendance: number
  monthly_attendance: number
  attendance_trend: number
  popular_service: string
}

export default function AttendancePage() {
  const { user, loading: authLoading } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [serviceFilter, setServiceFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('today')
  const router = useRouter()

  const { data: attendance, isLoading: attendanceLoading, error: attendanceError } = useAttendanceRecordsQuery({
    dateFilter,
    serviceFilter,
    limit: 100
  })

  const { data: stats, isLoading: statsLoading, error: statsError } = useAttendanceStatsQuery()

  const loading = attendanceLoading || statsLoading
  const error = attendanceError || statsError

  const serviceTypes = [
    { value: 'all', label: 'All Services' },
    { value: 'sunday_service', label: 'Sunday Service' },
    { value: 'midweek_service', label: 'Midweek Service' },
    { value: 'prayer_meeting', label: 'Prayer Meeting' },
    { value: 'youth_service', label: 'Youth Service' },
    { value: 'children_service', label: 'Children Service' },
    { value: 'special_event', label: 'Special Event' }
  ]

  const dateFilters = [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'all', label: 'All Time' }
  ]

  // Filter attendance based on search term
  const filteredAttendance = attendance?.filter(record => {
    if (!searchTerm) return true
    const member = record.member
    return member?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           member?.membership_id?.toLowerCase().includes(searchTerm.toLowerCase())
  }) || []

  const exportAttendance = () => {
    const csvContent = [
      ['Date', 'Service Type', 'Member Name', 'Membership ID', 'Check-in Time'].join(','),
      ...filteredAttendance.map(record => [
        record.service_date,
        record.service_type,
        record.member.full_name,
        record.member.membership_id,
        new Date(record.check_in_time).toLocaleString()
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `attendance-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
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

  const quickActions = [
    { href: '/attendance/scanner', label: 'QR scanner', icon: QrCode },
    { href: '/attendance/kiosk', label: 'Kiosk mode', icon: Monitor },
    { href: '/attendance/manual', label: 'Manual check-in', icon: CheckSquare },
    { href: '/attendance/bulk', label: 'Bulk attendance', icon: Users },
    { href: '/attendance/comprehensive', label: 'Comprehensive', icon: BarChart3 },
  ]

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl">
        <PageHeader
          title="Attendance"
          description="Track and manage church attendance"
          actions={
            <>
              <Button className="h-11 flex-1 sm:h-10 sm:flex-none" onClick={() => router.push('/attendance/manual')}>
                <CheckSquare className="mr-2 h-4 w-4" />
                Check in
              </Button>
              <Button variant="outline" className="h-11 flex-1 sm:h-10 sm:flex-none" onClick={exportAttendance}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </>
          }
        />

        {error && (
          <div className="mb-6">
            <ErrorDisplay error={error instanceof Error ? error.message : String(error)} onRetry={() => window.location.reload()} />
          </div>
        )}

        {stats && (
          <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard className="p-4 sm:p-5" label="Today" value={stats.today_attendance} icon={Users} />
            <StatCard className="p-4 sm:p-5" label="This week" value={stats.weekly_attendance} icon={BarChart3} />
            <StatCard className="p-4 sm:p-5" label="This month" value={stats.monthly_attendance} icon={TrendingUp} />
            <StatCard className="p-4 sm:p-5" label="All time" value={stats.total_attendance} icon={Calendar} />
          </div>
        )}

        <Tabs defaultValue="records" className="space-y-6">
          <ScrollableTabsList>
            <TabsTrigger value="records">Records</TabsTrigger>
            <TabsTrigger value="actions">Check-in tools</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </ScrollableTabsList>

          <TabsContent value="records" className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative min-w-0 flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
                <Input
                  id="search"
                  aria-label="Search members"
                  placeholder="Search by name or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-11 pl-10 sm:h-10"
                />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:flex sm:w-auto">
                <Select value={serviceFilter} onValueChange={setServiceFilter}>
                  <SelectTrigger className="h-11 sm:h-10 sm:w-48" aria-label="Service type">
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
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="h-11 sm:h-10 sm:w-40" aria-label="Date range">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dateFilters.map((filter) => (
                      <SelectItem key={filter.value} value={filter.value}>
                        {filter.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="dashboard-panel overflow-hidden">
              <div className="flex items-baseline justify-between gap-3 border-b border-neutral-200/80 px-4 py-3 dark:border-white/[0.06] sm:px-5">
                <h2 className="app-section-title">Check-ins</h2>
                <p className="text-[13px] tabular-nums text-neutral-500 dark:text-neutral-400">
                  {filteredAttendance.length} records
                </p>
              </div>
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <LoadingSpinner />
                </div>
              ) : filteredAttendance.length === 0 ? (
                <div className="px-4 py-10 text-center text-neutral-500 dark:text-neutral-400">
                  <Calendar className="mx-auto mb-2 h-8 w-8 opacity-50" />
                  <p className="font-medium text-neutral-700 dark:text-neutral-300">No attendance records found</p>
                  <p className="text-sm">Try a different service or date range.</p>
                </div>
              ) : (
                <ul className="divide-y divide-neutral-100 dark:divide-white/[0.06]">
                  {filteredAttendance.map((record) => (
                    <li
                      key={record.id}
                      className="flex min-h-11 items-center gap-3 px-4 py-3 sm:px-5"
                    >
                      <PersonAvatar name={record.member?.full_name} seed={record.member_id} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                          {displayName(record.member?.full_name)}
                        </p>
                        <p className="truncate text-[13px] text-neutral-500 dark:text-neutral-400">
                          <span className="font-mono">{formatMembershipIdForDisplay(record.member?.membership_id)}</span>
                          <span className="sm:hidden"> · {formatServiceType(record.service_type)}</span>
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="hidden text-sm font-medium text-neutral-900 dark:text-neutral-100 sm:block">
                          {formatServiceType(record.service_type)}
                        </p>
                        <p className="text-[13px] tabular-nums text-neutral-500 dark:text-neutral-400">
                          {formatDateTime(record.check_in_time)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </TabsContent>

          <TabsContent value="actions">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {quickActions.map(({ href, label, icon: Icon }) => (
                <Button
                  key={href}
                  variant="outline"
                  onClick={() => router.push(href)}
                  className="h-24 flex-col gap-2 whitespace-normal text-center"
                >
                  <Icon className="h-6 w-6 text-brand-600 dark:text-brand-300" />
                  <span>{label}</span>
                </Button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="dashboard-panel px-4 py-10 text-center text-neutral-500 dark:text-neutral-400">
              <BarChart3 className="mx-auto mb-2 h-8 w-8 opacity-50" />
              <p className="font-medium text-neutral-700 dark:text-neutral-300">Trends and service breakdowns</p>
              <p className="mb-4 text-sm">See weekly patterns and the most attended services.</p>
              <Button variant="outline" className="h-11 sm:h-10" onClick={() => router.push('/attendance/analytics')}>
                Open analytics
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}

function formatServiceType(value?: string | null): string {
  if (!value) return ''
  return value.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())
}
