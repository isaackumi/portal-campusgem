'use client'

import { useState } from 'react'
import type React from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers'
import { DashboardLayout } from '@/components/dashboard-layout'
import { PageHeader } from '@/components/layout/page-header'
import { StatCard } from '@/components/ui/stat-card'
import { Meter } from '@/components/ui/meter'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, ScrollableTabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { cn } from '@/lib/utils'

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
            <h2 className="app-section-title mb-2">Authentication required</h2>
            <p className="mb-4 text-neutral-600 dark:text-neutral-300">Please log in to view attendance analytics.</p>
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

  const rangeLabel = timeRanges.find((r) => r.value === timeRange)?.label ?? ''
  const pretty = (v: string) => v.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())
  const peak = processedAnalytics.service_breakdown[0]?.service_type
  const change = processedAnalytics.attendance_change_percentage

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        <PageHeader
          title="Attendance analytics"
          description="Patterns and trends in church attendance"
          className="mb-0"
          actions={
            <Button variant="outline" className="h-11 w-full sm:h-10 sm:w-auto" onClick={() => window.print()}>
              <Download className="mr-2 h-4 w-4" />
              Export report
            </Button>
          }
        />

        <div className="grid grid-cols-2 gap-3 sm:flex">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="h-11 sm:h-10 sm:w-44" aria-label="Time range">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              {timeRanges.map((range) => (
                <SelectItem key={range.value} value={range.value}>
                  {range.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={serviceType} onValueChange={setServiceType}>
            <SelectTrigger className="h-11 sm:h-10 sm:w-52" aria-label="Service type">
              <SelectValue placeholder="Service type" />
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

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard className="p-4 sm:p-5" label="Total attendance" value={processedAnalytics.total_attendance} sub={rangeLabel} icon={Users} />
          <StatCard className="p-4 sm:p-5" label="Average per day" value={processedAnalytics.average_attendance} sub="Per service day" icon={Calendar} />
          <StatCard
            className="p-4 sm:p-5"
            label="Change"
            value={`${change > 0 ? '+' : ''}${change}%`}
            sub="vs previous period"
            icon={processedAnalytics.attendance_trend === 'down' ? TrendingDown : processedAnalytics.attendance_trend === 'up' ? TrendingUp : Activity}
            tone={processedAnalytics.attendance_trend === 'down' ? 'danger' : processedAnalytics.attendance_trend === 'up' ? 'success' : 'default'}
          />
          <StatCard
            className="p-4 sm:p-5"
            label="Peak service"
            value={<span className="block truncate text-lg sm:text-xl">{peak ? pretty(peak) : 'N/A'}</span>}
            sub="Most attended"
            icon={Target}
          />
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <ScrollableTabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
          </ScrollableTabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Panel title="By service" description="Attendance by service type">
                {processedAnalytics.service_breakdown.length > 0 ? (
                  <ul className="space-y-3">
                    {processedAnalytics.service_breakdown.map((service: any, index: number) => (
                      <li key={index} className="space-y-1.5">
                        <div className="flex items-baseline justify-between gap-3 text-sm">
                          <span className="min-w-0 truncate font-medium text-neutral-900 dark:text-neutral-100">
                            {pretty(String(service.service_type))}
                          </span>
                          <span className="shrink-0 tabular-nums text-neutral-500 dark:text-neutral-400">{service.count}</span>
                        </div>
                        <Meter value={Number(service.percentage) || 0} max={100} label={`${service.service_type} share`} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Empty />
                )}
              </Panel>

              <Panel title="By gender" description="Attendance by gender">
                {processedAnalytics.attendance_by_gender.length > 0 ? (
                  <Rows rows={processedAnalytics.attendance_by_gender.map((g: any) => [String(g.gender), `${g.count}`])} capitalize />
                ) : (
                  <Empty />
                )}
              </Panel>
            </div>
          </TabsContent>

          <TabsContent value="trends">
            <Panel title="Last 7 days" description="Daily attendance in the selected period">
              {processedAnalytics.daily_attendance.length > 0 ? (
                <Rows rows={processedAnalytics.daily_attendance.slice(-7).map((d: any) => [String(d.date), `${d.count} attendees`])} />
              ) : (
                <Empty />
              )}
            </Panel>
          </TabsContent>

          <TabsContent value="breakdown">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Panel title="Weekly" description="Last four weeks">
                {processedAnalytics.weekly_attendance.length > 0 ? (
                  <Rows rows={processedAnalytics.weekly_attendance.slice(-4).map((w: any) => [`Week ${w.week}`, `${w.count} attendees`])} />
                ) : (
                  <Empty />
                )}
              </Panel>
              <Panel title="Monthly" description="Last three months">
                {processedAnalytics.monthly_attendance.length > 0 ? (
                  <Rows rows={processedAnalytics.monthly_attendance.slice(-3).map((m: any) => [String(m.month), `${m.count} attendees`])} />
                ) : (
                  <Empty />
                )}
              </Panel>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}

function Panel({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="dashboard-panel p-4 sm:p-5">
      <h2 className="app-section-title">{title}</h2>
      <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">{description}</p>
      {children}
    </section>
  )
}

function Rows({ rows, capitalize }: { rows: [string, string][]; capitalize?: boolean }) {
  return (
    <ul className="divide-y divide-neutral-100 dark:divide-white/[0.06]">
      {rows.map(([label, value], i) => (
        <li key={i} className="flex min-h-11 items-center justify-between gap-3 text-sm">
          <span className={cn('min-w-0 truncate font-medium text-neutral-900 dark:text-neutral-100', capitalize && 'capitalize')}>
            {label}
          </span>
          <span className="shrink-0 tabular-nums text-neutral-500 dark:text-neutral-400">{value}</span>
        </li>
      ))}
    </ul>
  )
}

function Empty() {
  return <p className="py-6 text-center text-sm text-neutral-500 dark:text-neutral-400">No data for this period yet.</p>
}
