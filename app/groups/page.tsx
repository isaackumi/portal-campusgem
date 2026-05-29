'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers'
import { useGroups } from '@/lib/hooks/use-data'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { LoadingGrid, LoadingStats, LoadingPage } from '@/components/ui/loading'
import { ErrorDisplay, EmptyState } from '@/components/ui/error-display'
import { ErrorBoundary } from '@/components/error-boundary'
import { DashboardLayout } from '@/components/dashboard-layout'
import { 
  Users, 
  Search, 
  Plus, 
  Download, 
  Calendar,
  MapPin,
  User,
  ArrowLeft,
  Settings,
  Eye,
  Edit,
  MoreHorizontal,
  Crown,
  Star,
  Filter
} from 'lucide-react'

function GroupsContent() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  
  // Data hooks
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  
  const { 
    data: groups, 
    total, 
    hasMore, 
    error, 
    loading, 
    refetch, 
    loadMore, 
    search, 
    filter 
  } = useGroups(currentPage, 20, searchTerm, filterType)

  // Handle search
  const handleSearch = (term: string) => {
    setSearchTerm(term)
    setCurrentPage(1)
    search(term)
  }

  // Handle filter
  const handleFilter = (type: string) => {
    setFilterType(type)
    setCurrentPage(1)
    filter(type === 'all' ? '' : type)
  }

  // Show loading state
  if (authLoading || loading) {
    return <LoadingPage title="Loading Groups..." description="Fetching groups and ministries..." />
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <ErrorDisplay
            error={error}
            onRetry={refetch}
            variant="page"
            title="Failed to load groups"
          />
        </div>
      </div>
    )
  }

  // Show nothing while redirecting
  if (!user) {
    return null
  }

  const getGroupTypeColor = (type: string) => {
    switch (type) {
      case 'ministry': return 'bg-purple-100 text-purple-800'
      case 'fellowship': return 'bg-blue-100 text-blue-800'
      case 'age_group': return 'bg-green-100 text-green-800'
      case 'special_interest': return 'bg-yellow-100 text-yellow-800'
      case 'leadership': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getGroupTypeIcon = (type: string) => {
    switch (type) {
      case 'ministry': return <Settings className="h-4 w-4" />
      case 'fellowship': return <Users className="h-4 w-4" />
      case 'age_group': return <User className="h-4 w-4" />
      case 'special_interest': return <Star className="h-4 w-4" />
      case 'leadership': return <Crown className="h-4 w-4" />
      default: return <Users className="h-4 w-4" />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Group statistics
  const groupStats = {
    total: total || 0,
    ministries: groups?.filter(g => g.group_type === 'ministry').length || 0,
    fellowships: groups?.filter(g => g.group_type === 'fellowship').length || 0,
    ageGroups: groups?.filter(g => g.group_type === 'age_group').length || 0
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center mb-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => router.push('/dashboard')}
                className="mr-3 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Dashboard
              </Button>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
              Groups & Ministries
            </h1>
            <p className="text-gray-600">
              {groupStats.total} total groups • Manage church groups, ministries, and fellowships
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" className="flex items-center">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => router.push('/groups/add')}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Group
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="bg-white shadow-sm border border-gray-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Total Groups</p>
                  <p className="text-2xl font-bold text-gray-900" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
                    {groupStats.total}
                  </p>
                </div>
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border border-gray-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Ministries</p>
                  <p className="text-2xl font-bold text-gray-900" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
                    {groupStats.ministries}
                  </p>
                </div>
                <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                  <Settings className="h-5 w-5 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border border-gray-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Fellowships</p>
                  <p className="text-2xl font-bold text-gray-900" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
                    {groupStats.fellowships}
                  </p>
                </div>
                <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                  <Users className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border border-gray-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Age Groups</p>
                  <p className="text-2xl font-bold text-gray-900" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
                    {groupStats.ageGroups}
                  </p>
                </div>
                <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center">
                  <User className="h-5 w-5 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search groups by name or description..."
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <select
                  value={filterType}
                  onChange={(e) => handleFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Types</option>
                  <option value="ministry">Ministry</option>
                  <option value="fellowship">Fellowship</option>
                  <option value="age_group">Age Group</option>
                  <option value="special_interest">Special Interest</option>
                  <option value="leadership">Leadership</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Groups Grid */}
        {loading ? (
          <LoadingGrid count={6} />
        ) : groups && groups.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.map((group) => (
              <Card key={group.id} className="bg-white shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        {getGroupTypeIcon(group.group_type)}
                      </div>
                      <Badge className={getGroupTypeColor(group.group_type)}>
                        {group.group_type.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => router.push(`/groups/${group.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => router.push(`/groups/${group.id}`)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardTitle className="text-lg">{group.name}</CardTitle>
                  {group.description && (
                    <p className="text-sm text-gray-600 mt-1">{group.description}</p>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Leaders */}
                  {(group.leader || group.co_leader) && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-2">Leadership</h4>
                      <div className="space-y-1">
                        {group.leader && (
                          <div className="flex items-center space-x-2">
                            <Crown className="h-3 w-3 text-yellow-600" />
                            <span className="text-sm">{group.leader.full_name}</span>
                          </div>
                        )}
                        {group.co_leader && (
                          <div className="flex items-center space-x-2">
                            <Star className="h-3 w-3 text-blue-600" />
                            <span className="text-sm">{group.co_leader.full_name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Meeting Information */}
                  {group.meeting_schedule && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>{group.meeting_schedule}</span>
                    </div>
                  )}

                  {group.meeting_location && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4" />
                      <span>{group.meeting_location}</span>
                    </div>
                  )}

                  {/* Member Limit */}
                  {group.max_members && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Capacity</span>
                      <span className="font-medium">{group.max_members} members</span>
                    </div>
                  )}

                  {/* Created Date */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Created</span>
                    <span className="font-medium">{formatDate(group.created_at)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {/* Load More Button */}
            {hasMore && (
              <div className="col-span-full text-center pt-4">
                <Button
                  variant="outline"
                  onClick={loadMore}
                  disabled={loading}
                >
                  {loading ? 'Loading...' : 'Load More'}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <EmptyState
            title="No groups found"
            description={searchTerm || filterType !== 'all' 
              ? 'Try adjusting your search or filter criteria.'
              : 'Get started by creating your first group.'
            }
            icon={<Users className="h-12 w-12" />}
            action={
              <Button 
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => router.push('/groups/add')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Group
              </Button>
            }
          />
        )}
      </div>
    </div>
  )
}

export default function GroupsPage() {
  return (
    <ErrorBoundary>
      <DashboardLayout>
        <GroupsContent />
      </DashboardLayout>
    </ErrorBoundary>
  )
}
