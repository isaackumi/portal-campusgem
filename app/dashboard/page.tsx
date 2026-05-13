'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers'
import { useDashboardStats, useUpcomingEvents } from '@/lib/hooks/use-data'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingStats, LoadingGrid, LoadingPage } from '@/components/ui/loading'
import { ErrorDisplay, EmptyState } from '@/components/ui/error-display'
import { ErrorBoundary } from '@/components/error-boundary'
import { DashboardLayout } from '@/components/dashboard-layout'
import { OfflineSync } from '@/components/offline-sync'
import { Demographics } from '@/lib/types'
import { FoldableCard } from '@/components/foldable-card'
import { BirthdayNotifications } from '@/components/birthday-notifications'
import {
  Users,
  Calendar,
  TrendingUp,
  UserPlus,
  ArrowRight,
  Cake,
  Heart,
  BarChart3,
  PieChart,
  Activity,
  Clock,
  MapPin,
  Eye,
  Plus,
  MessageSquare
} from 'lucide-react'

function DashboardContent() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  // Data hooks
  const { data: stats, error: statsError, loading: statsLoading, refetch: refetchStats } = useDashboardStats()
  const { data: upcomingEvents, error: eventsError, loading: eventsLoading, refetch: refetchEvents } = useUpcomingEvents()

  // Birthday notifications logic
  const getTodayBirthdays = () => {
    if (!upcomingEvents?.birthdays) return []

    const today = new Date()
    const todayStr = `${today.getMonth() + 1}-${today.getDate()}`

    return upcomingEvents.birthdays.filter((member: any) => {
      if (!member.dob) return false
      const birthday = new Date(member.dob)
      const birthdayStr = `${birthday.getMonth() + 1}-${birthday.getDate()}`
      return birthdayStr === todayStr
    }).map((member: any) => ({
      id: member.id,
      name: member.user?.full_name || 'Unknown',
      dob: member.dob,
      phone: member.user?.phone,
      email: member.user?.email,
      role: member.user?.role,
      membership_id: member.user?.membership_id
    }))
  }

  const getUpcomingBirthdays = () => {
    if (!upcomingEvents?.birthdays) return []

    const today = new Date()
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)

    return upcomingEvents.birthdays.filter((member: any) => {
      if (!member.dob) return false
      const birthday = new Date(member.dob)
      const thisYearBirthday = new Date(today.getFullYear(), birthday.getMonth(), birthday.getDate())

      if (thisYearBirthday < today) {
        thisYearBirthday.setFullYear(today.getFullYear() + 1)
      }

      return thisYearBirthday > today && thisYearBirthday <= nextWeek
    }).map((member: any) => ({
      id: member.id,
      name: member.user?.full_name || 'Unknown',
      dob: member.dob,
      phone: member.user?.phone,
      email: member.user?.email,
      role: member.user?.role,
      membership_id: member.user?.membership_id
    }))
  }

  const todayBirthdays = getTodayBirthdays()
  const upcomingBirthdays = getUpcomingBirthdays()

  // Show loading state
  if (authLoading || statsLoading) {
    return (
      <DashboardLayout>
        <LoadingPage title="Loading Dashboard..." description="Fetching your church data..." />
      </DashboardLayout>
    )
  }

  // Show error state
  if (statsError) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto">
          <ErrorDisplay
            error={statsError}
            onRetry={refetchStats}
            variant="page"
            title="Failed to load dashboard"
          />
        </div>
      </DashboardLayout>
    )
  }

  // Show nothing while redirecting
  if (!user) {
    return null
  }

  const calculateDemographics = (members: any[]): Demographics => {
    const today = new Date()
    const gender = { male: 0, female: 0 }
    const ageGroups = {
      '0-17': 0, '18-25': 0, '26-35': 0, '36-50': 0, '51-65': 0, '65+': 0
    }
    const maritalStatus: { [key: string]: number } = {}
    const groups: { [key: string]: number } = {}

    members.forEach(member => {
      if (member.gender === 'male') gender.male++
      else if (member.gender === 'female') gender.female++

      if (member.dob) {
        const age = today.getFullYear() - new Date(member.dob).getFullYear()
        if (age <= 17) ageGroups['0-17']++
        else if (age <= 25) ageGroups['18-25']++
        else if (age <= 35) ageGroups['26-35']++
        else if (age <= 50) ageGroups['36-50']++
        else if (age <= 65) ageGroups['51-65']++
        else ageGroups['65+']++
      }

      const status = member.user?.marital_status || 'unknown'
      maritalStatus[status] = (maritalStatus[status] || 0) + 1

      if (member.dob) {
        const age = today.getFullYear() - new Date(member.dob).getFullYear()
        if (age <= 17) { groups['Children'] = (groups['Children'] || 0) + 1 }
        else if (age <= 35) { groups['Youth'] = (groups['Youth'] || 0) + 1 }
        else if (member.gender === 'male') { groups['Men Fellowship'] = (groups['Men Fellowship'] || 0) + 1 }
        else { groups['Women Fellowship'] = (groups['Women Fellowship'] || 0) + 1 }
      }
    })

    return { gender, ageGroups, maritalStatus, groups }
  }

  const getUpcomingEventDays = (dateString: string, type: 'birthday' | 'anniversary'): number | null => {
    try {
      // Use a consistent date to prevent hydration mismatch
      const today = new Date()
      const eventDate = new Date(dateString)
      const currentYear = today.getFullYear()

      const thisYearEvent = new Date(eventDate)
      thisYearEvent.setFullYear(currentYear)

      if (thisYearEvent < today) {
        thisYearEvent.setFullYear(currentYear + 1)
      }

      const diffTime = thisYearEvent.getTime() - today.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      return diffDays >= 0 ? diffDays : null
    } catch (error) {
      return null
    }
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric'
    })
  }

  // Calculate demographics - for now using placeholder data
  // TODO: Fetch actual members data for accurate demographics
  const demographics = calculateDemographics([])

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
              Dashboard
            </h1>
            <p className="text-gray-600">Welcome back, {user?.full_name || 'User'}!</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Button variant="outline" onClick={() => router.push('/members/add')} className="w-full sm:w-auto">
              <UserPlus className="h-4 w-4 mr-2" />
              Add Member
            </Button>
            <Button variant="outline" onClick={() => router.push('/visitors/add')} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Add Visitor
            </Button>
          </div>
        </div>

        {/* Take Attendance - Prominent Button */}
        <div className="mb-6 sm:mb-8">
          <Card className="bg-gradient-to-r from-blue-600 to-blue-700 border-0 shadow-lg">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-white">
                      Take Attendance
                    </h3>
                    <p className="text-blue-100 text-sm sm:text-base">
                      Record today's service attendance quickly and easily
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <Button
                    size="lg"
                    className="bg-white text-blue-600 hover:bg-blue-50 font-semibold shadow-md hover:shadow-lg transition-all duration-200 w-full sm:w-auto"
                    onClick={() => router.push('/attendance/manual')}
                  >
                    <Calendar className="h-5 w-5 mr-2" />
                    Manual Check-in
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white/30 text-white hover:bg-white/10 font-semibold w-full sm:w-auto"
                    onClick={() => router.push('/attendance/scanner')}
                  >
                    <Activity className="h-5 w-5 mr-2" />
                    QR Scanner
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Today's Attendance Stats */}
        <div className="mb-6 sm:mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600">Today's Attendance</p>
                    <p className="text-2xl font-bold text-green-800">{stats?.today_attendance || 0}</p>
                    <p className="text-xs text-green-600">Members present</p>
                  </div>
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <Users className="h-5 w-5 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600">Attendance Rate</p>
                    <p className="text-2xl font-bold text-blue-800">{stats?.attendance_rate || 0}%</p>
                    <p className="text-xs text-blue-600">This week</p>
                  </div>
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600">Upcoming Birthdays</p>
                    <p className="text-2xl font-bold text-purple-800">{stats?.upcoming_birthdays || 0}</p>
                    <p className="text-xs text-purple-600">This month</p>
                  </div>
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card className="bg-white shadow-sm border border-gray-100">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Total Members</p>
                  <p className="text-3xl font-bold text-gray-900" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
                    {stats?.total_members || 0}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Active members</p>
                </div>
                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border border-gray-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Groups & Ministries</p>
                  <p className="text-3xl font-bold text-gray-900" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
                    {stats?.groups_count || 0}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Active groups</p>
                </div>
                <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border border-gray-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Recent Attendance</p>
                  <p className="text-3xl font-bold text-gray-900" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
                    {stats?.today_attendance || 0}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Last 30 days</p>
                </div>
                <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border border-gray-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Recent Visitors</p>
                  <p className="text-3xl font-bold text-gray-900" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
                    {stats?.recent_visitors || 0}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Last 30 days</p>
                </div>
                <div className="w-12 h-12 bg-yellow-50 rounded-lg flex items-center justify-center">
                  <UserPlus className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 sm:gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6 sm:space-y-8">
            {/* Birthday Notifications */}
            <BirthdayNotifications
              todayBirthdays={todayBirthdays}
              upcomingBirthdays={upcomingBirthdays}
            />

            {/* Upcoming Events - Foldable */}
            <FoldableCard
              title="Upcoming Events"
              description="Birthdays and anniversaries in the next 30 days"
              icon={<Calendar className="h-5 w-5 text-blue-600" />}
              badge={upcomingEvents?.birthdays?.length || upcomingEvents?.anniversaries?.length ?
                <Badge variant="secondary">{((upcomingEvents?.birthdays?.length || 0) + (upcomingEvents?.anniversaries?.length || 0))} events</Badge> : null
              }
              defaultExpanded={true}
            >
              {eventsLoading ? (
                <LoadingGrid count={3} />
              ) : eventsError ? (
                <ErrorDisplay error={eventsError} onRetry={refetchEvents} />
              ) : (
                <div className="space-y-4">
                  {/* Birthdays */}
                  {upcomingEvents?.birthdays && upcomingEvents.birthdays.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-3 flex items-center">
                        <Cake className="h-4 w-4 mr-2" />
                        Upcoming Birthdays
                      </h4>
                      <div className="space-y-2">
                        {upcomingEvents.birthdays.slice(0, 5).map((member, index) => {
                          const daysUntil = getUpcomingEventDays(member.dob!, 'birthday')
                          return (
                            <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                  <Cake className="h-4 w-4 text-blue-600" />
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">{member.user?.full_name}</p>
                                  <p className="text-sm text-gray-500">{formatDate(member.dob!)}</p>
                                </div>
                              </div>
                              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                                {daysUntil === 0 ? 'Today' : `${daysUntil} day${daysUntil === 1 ? '' : 's'}`}
                              </Badge>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Anniversaries */}
                  {upcomingEvents?.anniversaries && upcomingEvents.anniversaries.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-3 flex items-center">
                        <Heart className="h-4 w-4 mr-2" />
                        Upcoming Anniversaries
                      </h4>
                      <div className="space-y-2">
                        {upcomingEvents.anniversaries.slice(0, 5).map((member, index) => {
                          const daysUntil = getUpcomingEventDays(member.user?.anniversary_date!, 'anniversary')
                          return (
                            <div key={index} className="flex items-center justify-between p-3 bg-pink-50 rounded-lg">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center">
                                  <Heart className="h-4 w-4 text-pink-600" />
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">{member.user?.full_name}</p>
                                  <p className="text-sm text-gray-500">{formatDate(member.user?.anniversary_date!)}</p>
                                </div>
                              </div>
                              <Badge variant="secondary" className="bg-pink-100 text-pink-800">
                                {daysUntil === 0 ? 'Today' : `${daysUntil} day${daysUntil === 1 ? '' : 's'}`}
                              </Badge>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {(!upcomingEvents?.birthdays?.length && !upcomingEvents?.anniversaries?.length) && (
                    <EmptyState
                      title="No upcoming events"
                      description="No birthdays or anniversaries in the next 30 days"
                      icon={<Calendar className="h-12 w-12" />}
                    />
                  )}
                </div>
              )}
            </FoldableCard>

            {/* Attendance Analytics Section */}
            <FoldableCard
              title="Attendance Analytics"
              description="Recent attendance patterns and demographics"
              icon={<Activity className="h-5 w-5 text-green-600" />}
              badge={<Badge variant="secondary">Analytics</Badge>}
              defaultExpanded={false}
            >
              <div className="space-y-6">
                {/* Gender Distribution in Attendance */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Attendance by Gender</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Male</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{
                              width: `${stats?.male_attendance && stats?.female_attendance
                                ? (stats.male_attendance / (stats.male_attendance + stats.female_attendance)) * 100
                                : 0}%`
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium w-8">{stats?.male_attendance || 0}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Female</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-pink-600 h-2 rounded-full"
                            style={{
                              width: `${stats?.male_attendance && stats?.female_attendance
                                ? (stats.female_attendance / (stats.male_attendance + stats.female_attendance)) * 100
                                : 0}%`
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium w-8">{stats?.female_attendance || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Age Distribution in Attendance */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Attendance by Age Group</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Adults</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-600 h-2 rounded-full"
                            style={{
                              width: `${stats?.adult_attendance && stats?.children_attendance
                                ? (stats.adult_attendance / (stats.adult_attendance + stats.children_attendance)) * 100
                                : 0}%`
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium w-8">{stats?.adult_attendance || 0}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Children</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-purple-600 h-2 rounded-full"
                            style={{
                              width: `${stats?.adult_attendance && stats?.children_attendance
                                ? (stats.children_attendance / (stats.adult_attendance + stats.children_attendance)) * 100
                                : 0}%`
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium w-8">{stats?.children_attendance || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Attendance Rate */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Attendance Rate</h4>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Last 30 Days</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-indigo-600 h-2 rounded-full"
                          style={{ width: `${stats?.attendance_rate || 0}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-12">{stats?.attendance_rate || 0}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </FoldableCard>

            {/* Demographics Section */}
            <FoldableCard
              title="Demographics & Analytics"
              description="Member distribution and insights"
              icon={<BarChart3 className="h-5 w-5 text-blue-600" />}
              badge={<Badge variant="secondary">Demographics</Badge>}
              defaultExpanded={false}
            >
              <div className="space-y-6">
                {/* Gender Distribution */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Gender Distribution</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Male</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ 
                              width: `${(demographics.gender.male + demographics.gender.female) > 0 
                                ? (demographics.gender.male / (demographics.gender.male + demographics.gender.female) * 100) 
                                : 0}%` 
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium w-8">{demographics.gender.male}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Female</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-pink-600 h-2 rounded-full"
                            style={{ 
                              width: `${(demographics.gender.male + demographics.gender.female) > 0 
                                ? (demographics.gender.female / (demographics.gender.male + demographics.gender.female) * 100) 
                                : 0}%` 
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium w-8">{demographics.gender.female}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Age Distribution */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Age Distribution</h4>
                  <div className="space-y-2">
                    {Object.entries(demographics.ageGroups).map(([ageGroup, count]) => {
                      const maxCount = Math.max(...Object.values(demographics.ageGroups), 1)
                      return (
                        <div key={ageGroup} className="flex items-center justify-between">
                          <span className="text-sm">{ageGroup} years</span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-green-600 h-2 rounded-full"
                                style={{ width: `${(count / maxCount) * 100}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium w-8">{count}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Church Groups */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Church Groups</h4>
                  {Object.keys(demographics.groups).length === 0 ? (
                    <p className="text-sm text-gray-500">No group data available</p>
                  ) : (
                    <div className="space-y-2">
                      {Object.entries(demographics.groups).slice(0, 5).map(([group, count]) => {
                        const maxCount = Math.max(...Object.values(demographics.groups), 1)
                        return (
                          <div key={group} className="flex items-center justify-between">
                            <span className="text-sm">{group}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-purple-600 h-2 rounded-full"
                                  style={{ width: `${(count / maxCount) * 100}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium w-6">{count}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Marital Status */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Marital Status</h4>
                  {Object.keys(demographics.maritalStatus).length === 0 ? (
                    <p className="text-sm text-gray-500">No marital status data available</p>
                  ) : (
                    <div className="space-y-2">
                      {Object.entries(demographics.maritalStatus).map(([status, count]) => {
                        const maxCount = Math.max(...Object.values(demographics.maritalStatus), 1)
                        return (
                          <div key={status} className="flex items-center justify-between">
                            <span className="text-sm capitalize">{status}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-20 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-indigo-600 h-2 rounded-full"
                                  style={{ width: `${(count / maxCount) * 100}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium w-8">{count}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </FoldableCard>

            {/* Quick Actions */}
            <FoldableCard
              title="Quick Actions"
              description="Common tasks and shortcuts"
              icon={<Activity className="h-5 w-5 text-green-600" />}
              badge={<Badge variant="secondary">Actions</Badge>}
              defaultExpanded={true}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <Button
                  variant="outline"
                  className="h-16 sm:h-20 flex-col space-y-2"
                  onClick={() => router.push('/members')}
                >
                  <Users className="h-6 w-6" />
                  <span>Manage Members</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-20 flex-col space-y-2"
                  onClick={() => router.push('/groups')}
                >
                  <Calendar className="h-6 w-6" />
                  <span>Manage Groups</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-16 sm:h-20 flex-col space-y-2"
                  onClick={() => router.push('/attendance/scanner')}
                >
                  <BarChart3 className="h-6 w-6" />
                  <span>Take Attendance</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-16 sm:h-20 flex-col space-y-2"
                  onClick={() => router.push('/visitors')}
                >
                  <UserPlus className="h-6 w-6" />
                  <span>Manage Visitors</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-16 sm:h-20 flex-col space-y-2"
                  onClick={() => router.push('/celebrations')}
                >
                  <Cake className="h-6 w-6" />
                  <span>Birthdays & Anniversaries</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-16 sm:h-20 flex-col space-y-2"
                  onClick={() => router.push('/sms')}
                >
                  <MessageSquare className="h-6 w-6" />
                  <span>SMS Management</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-16 sm:h-20 flex-col space-y-2"
                  onClick={() => router.push('/attendance/analytics')}
                >
                  <BarChart3 className="h-6 w-6" />
                  <span>Attendance Analytics</span>
                </Button>
              </div>
            </FoldableCard>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Recent Activity */}
            <FoldableCard
              title="Recent Activity"
              description="Latest system activity"
              icon={<Clock className="h-5 w-5 text-gray-600" />}
              badge={<Badge variant="secondary">Activity</Badge>}
              defaultExpanded={false}
            >
              <EmptyState
                title="No recent activity"
                description="Activity will appear here as members interact with the system"
                icon={<Activity className="h-12 w-12" />}
              />
            </FoldableCard>

            {/* Church Info */}
            <FoldableCard
              title="Campus Gem Ministries"
              description="Church information and contact details"
              icon={<MapPin className="h-5 w-5 text-blue-600" />}
              badge={<Badge variant="secondary">Info</Badge>}
              defaultExpanded={true}
            >
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-500">Location</p>
                  <p className="text-sm text-gray-900">Odorkor Area, Gbawe CP District</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Services</p>
                  <p className="text-sm text-gray-900">Sundays 7:00 AM & 9:00 AM</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Contact</p>
                  <p className="text-sm text-gray-900">+233 XX XXX XXXX</p>
                </div>
              </div>

              <Button variant="outline" className="w-full" onClick={() => router.push('/groups')}>
                <Eye className="h-4 w-4 mr-2" />
                View All Groups
              </Button>
            </FoldableCard>

            {/* Offline Sync Status */}
            <OfflineSync />
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default function DashboardPage() {
  return (
    <ErrorBoundary>
      <DashboardContent />
    </ErrorBoundary>
  )
}
