'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2 flex items-center">
                <Calendar className="h-8 w-8 mr-3 text-primary" />
                Attendance Management
              </h1>
              <p className="text-slate-600">Track and manage church attendance</p>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="outline" onClick={exportAttendance}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6">
            <ErrorDisplay error={error instanceof Error ? error.message : String(error)} onRetry={() => window.location.reload()} />
          </div>
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Today</p>
                    <p className="text-2xl font-bold text-slate-900">{stats.today_attendance}</p>
                  </div>
                  <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">This Week</p>
                    <p className="text-2xl font-bold text-slate-900">{stats.weekly_attendance}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <BarChart3 className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">This Month</p>
                    <p className="text-2xl font-bold text-slate-900">{stats.monthly_attendance}</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Total</p>
                    <p className="text-2xl font-bold text-slate-900">{stats.total_attendance}</p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="records" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="records">Attendance Records</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="actions">Quick Actions</TabsTrigger>
          </TabsList>

          <TabsContent value="records" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Filter className="h-5 w-5 mr-2" />
                  Filters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="search">Search Members</Label>
                    <div className="relative mt-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="search"
                        placeholder="Search by name or ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="service-filter">Service Type</Label>
                    <Select value={serviceFilter} onValueChange={setServiceFilter}>
                      <SelectTrigger className="mt-1">
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
                  <div>
                    <Label htmlFor="date-filter">Date Range</Label>
                    <Select value={dateFilter} onValueChange={setDateFilter}>
                      <SelectTrigger className="mt-1">
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
              </CardContent>
            </Card>

            {/* Attendance Records */}
            <Card>
              <CardHeader>
                <CardTitle>Attendance Records</CardTitle>
                <CardDescription>
                  Showing {filteredAttendance.length} attendance records
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <LoadingSpinner />
                  </div>
                ) : filteredAttendance.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No attendance records found</p>
                    <p className="text-sm">Try adjusting your filters or date range</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredAttendance.map((record) => (
                      <div
                        key={record.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                            <Users className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-medium text-slate-900">
                              {record.member.full_name}
                            </h3>
                            <p className="text-sm text-slate-600">
                              {formatMembershipIdForDisplay(record.member.membership_id)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-slate-900">
                            {record.service_type}
                          </p>
                          <p className="text-sm text-slate-600">
                            {formatDateTime(record.check_in_time)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Attendance Trends</CardTitle>
                  <CardDescription>Weekly attendance patterns</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-slate-500">
                    <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Analytics coming soon</p>
                    <p className="text-sm">Charts and trends will be displayed here</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Service Popularity</CardTitle>
                  <CardDescription>Most attended service types</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-slate-500">
                    <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Service analytics coming soon</p>
                    <p className="text-sm">Popular services will be shown here</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="actions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Access attendance tools and features</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  <Button 
                    variant="outline" 
                    onClick={() => router.push('/attendance/scanner')}
                    className="h-24 flex-col space-y-2"
                  >
                    <QrCode className="h-6 w-6" />
                    <span>QR Scanner</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => router.push('/attendance/kiosk')}
                    className="h-24 flex-col space-y-2"
                  >
                    <Monitor className="h-6 w-6" />
                    <span>Kiosk Mode</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => router.push('/attendance/manual')}
                    className="h-24 flex-col space-y-2"
                  >
                    <CheckSquare className="h-6 w-6" />
                    <span>Manual Check-in</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => router.push('/attendance/bulk')}
                    className="h-24 flex-col space-y-2"
                  >
                    <Users className="h-6 w-6" />
                    <span>Bulk Attendance</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => router.push('/attendance/comprehensive')}
                    className="h-24 flex-col space-y-2"
                  >
                    <BarChart3 className="h-6 w-6" />
                    <span>Comprehensive</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
