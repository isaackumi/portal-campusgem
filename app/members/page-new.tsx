'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers'
import { useMembers } from '@/lib/hooks/use-data'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LoadingTable, LoadingStats, LoadingPage } from '@/components/ui/loading'
import { ErrorDisplay, EmptyState } from '@/components/ui/error-display'
import { ErrorBoundary } from '@/components/error-boundary'
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
  Filter,
  Phone,
  Mail,
  Copy,
  CheckCircle
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

function MembersContent() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  
  // Data hooks
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  
  const { 
    data: members, 
    total, 
    hasMore, 
    error, 
    loading, 
    refetch, 
    loadMore
  } = useMembers(currentPage, 20, searchTerm)

  // Handle search
  const handleSearch = (term: string) => {
    setSearchTerm(term)
    setCurrentPage(1)
    // Search is handled automatically by the useMembers hook
  }

  // Handle filter
  const handleFilter = (type: string) => {
    setFilterType(type)
    setCurrentPage(1)
    // Filter is handled automatically by the useMembers hook
  }

  // Copy membership ID to clipboard
  const copyMembershipId = (membershipId: string) => {
    navigator.clipboard.writeText(membershipId)
    toast({
      title: "Copied!",
      description: "Membership ID copied to clipboard"
    })
  }

  // Show loading state
  if (authLoading || loading) {
    return <LoadingPage title="Loading Members..." description="Fetching member data..." />
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="max-w-7xl mx-auto">
          <ErrorDisplay
            error={error}
            onRetry={refetch}
            variant="page"
            title="Failed to load members"
          />
        </div>
      </div>
    )
  }

  // Show nothing while redirecting
  if (!user) {
    return null
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800'
      case 'pastor': return 'bg-purple-100 text-purple-800'
      case 'elder': return 'bg-slate-100 text-slate-700'
      case 'finance_officer': return 'bg-green-100 text-green-800'
      case 'member': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getGenderColor = (gender: string) => {
    switch (gender) {
      case 'male': return 'bg-slate-100 text-slate-700'
      case 'female': return 'bg-pink-100 text-pink-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getAge = (dob: string) => {
    const today = new Date()
    const birthDate = new Date(dob)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    
    return age
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center mb-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => router.push('/dashboard')}
                className="mr-3 text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Dashboard
              </Button>
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              Members Management
            </h1>
            <p className="text-slate-600">
              {total} total members • Manage your church community
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" className="flex items-center">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button 
              className=""
              onClick={() => router.push('/members/add')}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Member
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="bg-white shadow-sm border border-slate-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Total Members</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {total}
                  </p>
                </div>
                <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border border-slate-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Active Members</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {members?.filter(m => m.user?.role === 'member').length || 0}
                  </p>
                </div>
                <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                  <User className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border border-slate-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Leadership</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {members?.filter(m => ['admin', 'pastor', 'elder'].includes(m.user?.role || '')).length || 0}
                  </p>
                </div>
                <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                  <Crown className="h-5 w-5 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border border-slate-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">New This Month</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {members?.filter(m => {
                      const created = new Date(m.created_at)
                      const now = new Date()
                      return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear()
                    }).length || 0}
                  </p>
                </div>
                <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center">
                  <Star className="h-5 w-5 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="members" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="members">All Members</TabsTrigger>
            <TabsTrigger value="groups">Groups</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="sms">SMS</TabsTrigger>
          </TabsList>

          {/* Members Tab */}
          <TabsContent value="members" className="space-y-6">
            {/* Search and Filters */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search members by name or membership ID..."
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
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                    >
                      <option value="all">All Roles</option>
                      <option value="admin">Admins</option>
                      <option value="pastor">Pastors</option>
                      <option value="elder">Elders</option>
                      <option value="finance_officer">Finance Officers</option>
                      <option value="member">Members</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Members Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Users className="h-5 w-5 mr-2" />
                    Members ({total})
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      <Filter className="h-4 w-4 mr-1" />
                      Filter
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-1" />
                      Export
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <LoadingTable rows={10} columns={6} />
                ) : members && members.length > 0 ? (
                  <div className="space-y-4">
                    {members.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
                            <User className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h3 className="font-medium text-slate-900">{member.user?.full_name}</h3>
                              <Badge className={getRoleColor(member.user?.role || '')}>
                                {member.user?.role?.replace('_', ' ')}
                              </Badge>
                              {member.gender && (
                                <Badge className={getGenderColor(member.gender)}>
                                  {member.gender}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-slate-500">
                              <span className="flex items-center">
                                <Copy className="h-3 w-3 mr-1" />
                                {member.user?.membership_id}
                              </span>
                              {member.dob && (
                                <span>Age: {getAge(member.dob)}</span>
                              )}
                              <span>Joined: {formatDate(member.created_at)}</span>
                            </div>
                            {(member.user?.phone || member.user?.email) && (
                              <div className="flex items-center space-x-4 text-sm text-slate-500 mt-1">
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
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyMembershipId(member.user?.membership_id || '')}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/members/${member.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/members/${member.id}`)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    
                    {/* Load More Button */}
                    {hasMore && (
                      <div className="text-center pt-4">
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
                    title="No members found"
                    description={searchTerm ? "Try adjusting your search criteria" : "Get started by adding your first member"}
                    icon={<Users className="h-12 w-12" />}
                    action={
                      <Button onClick={() => router.push('/members/add')}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Member
                      </Button>
                    }
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Groups Tab */}
          <TabsContent value="groups" className="space-y-6">
            <Card>
              <CardContent className="text-center py-12">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">Group Management</h3>
                <p className="text-slate-500 mb-4">Manage church groups and ministries</p>
                <Button onClick={() => router.push('/groups')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Go to Groups
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Attendance Tab */}
          <TabsContent value="attendance" className="space-y-6">
            <Card>
              <CardContent className="text-center py-12">
                <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">Attendance Management</h3>
                <p className="text-slate-500 mb-4">Track member attendance and services</p>
                <Button onClick={() => router.push('/attendance/scanner')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Take Attendance
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SMS Tab */}
          <TabsContent value="sms" className="space-y-6">
            <Card>
              <CardContent className="text-center py-12">
                <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">SMS Messaging</h3>
                <p className="text-slate-500 mb-4">Send messages to members and groups</p>
                <Button onClick={() => router.push('/groups')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Send SMS
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default function MembersPage() {
  return (
    <ErrorBoundary>
      <MembersContent />
    </ErrorBoundary>
  )
}
