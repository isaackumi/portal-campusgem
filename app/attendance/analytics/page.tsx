'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LoadingSpinner } from '@/components/ui/loading'
import { ErrorDisplay } from '@/components/ui/error-display'
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Users,
  Calendar,
  Clock,
  Target,
  Award,
  Activity,
  PieChart,
  LineChart,
  Download,
  Filter,
  RefreshCw
} from 'lucide-react'
import { useAttendanceAnalyticsQuery } from '@/lib/hooks/use-data'
import { formatDateTime, formatMembershipIdForDisplay } from '@/lib/utils'

interface AttendanceAnalytics {
  total_attendance: number
  average_attendance: number
  attendance_trend: 'up' | 'down' | 'stable'
  attendance_change_percentage: number
  service_breakdown: {
    service_type: string
    count: number
    percentage: number
  }[]
  daily_attendance: {
    date: string
    count: number
  }[]
  weekly_attendance: {
    week: string
    count: number
  }[]
  monthly_attendance: {
    month: string
    count: number
  }[]
  attendance_by_gender: {
    gender: string
    count: number
  }[]
}

export default function AttendanceAnalyticsPage() {
  const { user, loading: authLoading } = useAuth()
  const [timeRange, setTimeRange] = useState('30d')
  const [serviceType, setServiceType] = useState('all')
  const router = useRouter()

  const { data: analytics, isLoading: loading, error } = useAttendanceAnalyticsQuery({
    timeRange,
    serviceType
  })

  // Process analytics data (simplified version for now)
  const processedAnalytics = analytics || {
    total_attendance: 0,
    average_attendance: 0,
    attendance_trend: 'stable' as const,
    attendance_change_percentage: 0,
    service_breakdown: [],
    daily_attendance: [],
    weekly_attendance: [],
    monthly_attendance: [],
    attendance_by_gender: []
  }

  const timeRanges = [
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' },
    { value: '1y', label: 'Last Year' }
  ]

  const serviceTypes = [
    { value: 'all', label: 'All Services' },
    { value: 'sunday_service', label: 'Sunday Service' },
    { value: 'midweek_service', label: 'Midweek Service' },
    { value: 'prayer_meeting', label: 'Prayer Meeting' },
    { value: 'youth_service', label: 'Youth Service' },
    { value: 'children_service', label: 'Children Service' },
    { value: 'special_event', label: 'Special Event' }
  ]

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
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Authentication Required</h2>
            <p className="text-slate-600 mb-4">Please log in to view attendance analytics.</p>
            <Button onClick={() => router.push('/auth')}>
              Go to Login
            </Button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner />
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout>
        <ErrorDisplay 
          title="Failed to load analytics"
          error={error instanceof Error ? error.message : String(error)}
        />
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
            <h1 className="text-3xl font-bold text-slate-900">Attendance Analytics</h1>
            <p className="text-slate-600 mt-1">
              Comprehensive insights into church attendance patterns and trends
            </p>
            </div>
          <div className="mt-4 sm:mt-0 flex gap-2">
            <Button variant="outline" onClick={() => window.print()}>
                <Download className="h-4 w-4 mr-2" />
              Export Report
              </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Time Range</label>
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select time range" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeRanges.map(range => (
                      <SelectItem key={range.value} value={range.value}>
                        {range.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Service Type</label>
                <Select value={serviceType} onValueChange={setServiceType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select service type" />
                  </SelectTrigger>
                  <SelectContent>
                    {serviceTypes.map(service => (
                      <SelectItem key={service.value} value={service.value}>
                        {service.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

            {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Attendance</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{processedAnalytics.total_attendance}</div>
              <p className="text-xs text-muted-foreground">
                {timeRange === '7d' ? 'Last 7 days' : 
                 timeRange === '30d' ? 'Last 30 days' :
                 timeRange === '90d' ? 'Last 90 days' : 'Last year'}
              </p>
                </CardContent>
              </Card>
              <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Daily</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{processedAnalytics.average_attendance}</div>
              <p className="text-xs text-muted-foreground">
                Per service day
              </p>
                </CardContent>
              </Card>
              <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Trend</CardTitle>
              {processedAnalytics.attendance_trend === 'up' ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : processedAnalytics.attendance_trend === 'down' ? (
                <TrendingDown className="h-4 w-4 text-red-600" />
              ) : (
                <Activity className="h-4 w-4 text-primary" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {processedAnalytics.attendance_change_percentage > 0 ? '+' : ''}
                {processedAnalytics.attendance_change_percentage}%
                      </div>
              <p className="text-xs text-muted-foreground">
                vs previous period
              </p>
                </CardContent>
              </Card>
              <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Peak Service</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {processedAnalytics.service_breakdown.length > 0 
                  ? processedAnalytics.service_breakdown[0].service_type 
                  : 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground">
                Most attended
              </p>
                </CardContent>
              </Card>
            </div>

        {/* Analytics Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
              </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Service Breakdown</CardTitle>
                  <CardDescription>
                    Attendance distribution by service type
                  </CardDescription>
                    </CardHeader>
                    <CardContent>
                  {processedAnalytics.service_breakdown.length > 0 ? (
                    <div className="space-y-2">
                      {processedAnalytics.service_breakdown.map((service: any, index: number) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-sm font-medium">{service.service_type}</span>
                              <div className="flex items-center gap-2">
                                <div className="w-20 bg-gray-200 rounded-full h-2">
                                  <div 
                                    className="bg-primary h-2 rounded-full" 
                                style={{ width: `${service.percentage}%` }}
                                  />
                                </div>
                            <span className="text-sm text-slate-600">{service.count}</span>
                              </div>
                            </div>
                      ))}
                      </div>
                  ) : (
                    <p className="text-slate-500 text-center py-4">No data available</p>
                  )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Gender Distribution</CardTitle>
                  <CardDescription>
                    Attendance breakdown by gender
                  </CardDescription>
                    </CardHeader>
                    <CardContent>
                  {processedAnalytics.attendance_by_gender.length > 0 ? (
                    <div className="space-y-2">
                      {processedAnalytics.attendance_by_gender.map((gender: any, index: number) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-sm font-medium capitalize">{gender.gender}</span>
                          <span className="text-sm text-slate-600">{gender.count}</span>
                                </div>
                      ))}
                              </div>
                  ) : (
                    <p className="text-slate-500 text-center py-4">No data available</p>
                  )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

          <TabsContent value="trends" className="space-y-4">
                  <Card>
                    <CardHeader>
                <CardTitle>Daily Attendance Trends</CardTitle>
                <CardDescription>
                  Attendance patterns over the selected time period
                </CardDescription>
                    </CardHeader>
                    <CardContent>
                {processedAnalytics.daily_attendance.length > 0 ? (
                      <div className="space-y-2">
                    {processedAnalytics.daily_attendance.slice(-7).map((day: any, index: number) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{day.date}</span>
                        <span className="text-sm text-slate-600">{day.count} attendees</span>
                          </div>
                        ))}
                      </div>
                ) : (
                  <p className="text-slate-500 text-center py-4">No data available</p>
                )}
                    </CardContent>
                  </Card>
              </TabsContent>

          <TabsContent value="breakdown" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                  <CardTitle>Weekly Breakdown</CardTitle>
                  <CardDescription>
                    Attendance by week
                  </CardDescription>
                  </CardHeader>
                  <CardContent>
                  {processedAnalytics.weekly_attendance.length > 0 ? (
                    <div className="space-y-2">
                      {processedAnalytics.weekly_attendance.slice(-4).map((week: any, index: number) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-sm font-medium">Week {week.week}</span>
                          <span className="text-sm text-slate-600">{week.count} attendees</span>
                              </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-center py-4">No data available</p>
                  )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                  <CardTitle>Monthly Breakdown</CardTitle>
                  <CardDescription>
                    Attendance by month
                  </CardDescription>
                  </CardHeader>
                  <CardContent>
                  {processedAnalytics.monthly_attendance.length > 0 ? (
                    <div className="space-y-2">
                      {processedAnalytics.monthly_attendance.slice(-3).map((month: any, index: number) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-sm font-medium">{month.month}</span>
                          <span className="text-sm text-slate-600">{month.count} attendees</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-center py-4">No data available</p>
                  )}
                  </CardContent>
                </Card>
            </div>
              </TabsContent>
            </Tabs>
      </div>
    </DashboardLayout>
  )
}