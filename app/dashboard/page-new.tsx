'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers'
import { useDashboardStats, useUpcomingEvents } from '@/lib/hooks/use-data'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingStats, LoadingGrid, LoadingPage } from '@/components/ui/loading'
import { ErrorDisplay, EmptyState } from '@/components/ui/error-display'
import { ErrorBoundary } from '@/components/error-boundary'
import { Demographics } from '@/lib/types'
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
  Plus
} from 'lucide-react'

function DashboardContent() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  // Data hooks
  const { data: stats, error: statsError, loading: statsLoading, refetch: refetchStats } = useDashboardStats()
  const { data: upcomingEvents, error: eventsError, loading: eventsLoading, refetch: refetchEvents } = useUpcomingEvents()

  // Show loading state
  if (authLoading || statsLoading) {
    return <LoadingPage title="Loading Dashboard..." description="Fetching your church data..." />
  }

  // Show error state
  if (statsError) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <ErrorDisplay
            error={statsError}
            onRetry={refetchStats}
            variant="page"
            title="Failed to load dashboard"
          />
        </div>
      </div>
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

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
              Dashboard
            </h1>
            <p className="text-gray-600">Welcome back, {user?.full_name || 'User'}!</p>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={() => router.push('/members/add')}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Member
            </Button>
            <Button variant="outline" onClick={() => router.push('/visitors/add')}>
              <Plus className="h-4 w-4 mr-2" />
              Add Visitor
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white shadow-sm border border-gray-100">
            <CardContent className="p-6">
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
                    {stats?.attendance_rate || 0}%
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

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Upcoming Events */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Calendar className="h-5 w-5 mr-2 text-blue-600" />
                    Upcoming Events
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => router.push('/members')}>
                    <Eye className="h-4 w-4 mr-1" />
                    View All
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2 text-green-600" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    className="h-20 flex-col space-y-2"
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
                    className="h-20 flex-col space-y-2"
                    onClick={() => router.push('/attendance/scanner')}
                  >
                    <BarChart3 className="h-6 w-6" />
                    <span>Take Attendance</span>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-20 flex-col space-y-2"
                    onClick={() => router.push('/visitors')}
                  >
                    <UserPlus className="h-6 w-6" />
                    <span>Manage Visitors</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-gray-600" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <EmptyState
                  title="No recent activity"
                  description="Activity will appear here as members interact with the system"
                  icon={<Activity className="h-12 w-12" />}
                />
              </CardContent>
            </Card>

            {/* Church Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPin className="h-5 w-5 mr-2 text-blue-600" />
                  Campus Gem Ministries
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <ErrorBoundary>
      <DashboardContent />
    </ErrorBoundary>
  )
}
