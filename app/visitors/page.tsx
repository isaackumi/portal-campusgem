'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { dataService } from '@/lib/services/data-service'
import { useQuery } from '@tanstack/react-query'
import { Visitor } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import { DashboardLayout } from '@/components/dashboard-layout'
import { 
  Users, 
  Search, 
  Plus, 
  Download, 
  Phone,
  Mail,
  MapPin,
  Calendar,
  ArrowLeft,
  UserPlus,
  CheckCircle,
  Circle,
  Eye,
  Edit,
  MoreHorizontal,
  User
} from 'lucide-react'

export default function VisitorsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [visitors, setVisitors] = useState<Visitor[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth')
    }
  }, [user, authLoading, router])

  const visitorsQuery = useQuery({
    queryKey: ['visitors', user?.id],
    queryFn: async () => dataService.getVisitors(1, 200),
    enabled: Boolean(user),
    staleTime: 30_000
  })

  useEffect(() => {
    if (visitorsQuery.data?.data) {
      setVisitors(visitorsQuery.data.data as unknown as Visitor[])
    }
  }, [visitorsQuery.data])

  const filteredVisitors = visitors.filter(visitor => {
    const matchesSearch = searchTerm === '' || 
      visitor.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      visitor.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      visitor.phone?.includes(searchTerm)
    
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'converted' && visitor.converted_to_member) ||
      (filterStatus === 'followup' && !visitor.follow_up_completed) ||
      (filterStatus === 'recent' && new Date(visitor.visit_date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
    
    return matchesSearch && matchesStatus
  })

  const getStatusColor = (visitor: Visitor) => {
    if (visitor.converted_to_member) return 'bg-green-100 text-green-800'
    if (!visitor.follow_up_completed) return 'bg-yellow-100 text-yellow-800'
    if (new Date(visitor.visit_date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) return 'bg-slate-100 text-slate-700'
    return 'bg-gray-100 text-gray-800'
  }

  const getStatusText = (visitor: Visitor) => {
    if (visitor.converted_to_member) return 'Converted'
    if (!visitor.follow_up_completed) return 'Needs Follow-up'
    if (new Date(visitor.visit_date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) return 'Recent'
    return 'Active'
  }

  // Show loading state
  if (authLoading || visitorsQuery.isLoading || visitorsQuery.isFetching) {
    return (
      <DashboardLayout>
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
      </DashboardLayout>
    )
  }

  // Show nothing while redirecting
  if (!user) {
    return null
  }

  return (
    <DashboardLayout>
    <div className="min-h-screen bg-slate-50">
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
              Visitor Management
            </h1>
            <p className="text-slate-600">Track and manage church visitors</p>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" className="flex items-center">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button 
              className=""
              onClick={() => router.push('/visitors/add')}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Visitor
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="bg-white shadow-sm border border-slate-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Total Visitors</p>
                  <p className="text-2xl font-bold text-slate-900">{visitors.length}</p>
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
                  <p className="text-xs font-medium text-slate-500 mb-1">Recent Visitors</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {visitors.filter(v => new Date(v.visit_date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length}
                  </p>
                  <p className="text-xs text-slate-600 mt-1">Last 30 days</p>
                </div>
                <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border border-slate-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Converted</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {visitors.filter(v => v.converted_to_member).length}
                  </p>
                  <p className="text-xs text-green-600 mt-1">To members</p>
                </div>
                <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border border-slate-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Need Follow-up</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {visitors.filter(v => !v.follow_up_completed).length}
                  </p>
                  <p className="text-xs text-red-600 mt-1">Pending</p>
                </div>
                <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                  <Circle className="h-5 w-5 text-red-600" />
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
                    placeholder="Search visitors by name or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="all">All Visitors</option>
                  <option value="recent">Recent (30 days)</option>
                  <option value="followup">Needs Follow-up</option>
                  <option value="converted">Converted to Members</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Visitors List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>
                Visitors ({filteredVisitors.length})
              </span>
              <Badge variant="outline" className="text-sm">
                {visitors.length} total
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredVisitors.length > 0 ? (
              <div className="space-y-4">
                {filteredVisitors.map((visitor) => (
                  <div key={visitor.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-slate-800 to-slate-950 rounded-full flex items-center justify-center">
                        <User className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">
                          {visitor.first_name} {visitor.last_name}
                        </h3>
                        <div className="flex items-center space-x-4 mt-1">
                          {visitor.phone && (
                            <div className="flex items-center text-xs text-slate-500">
                              <Phone className="h-3 w-3 mr-1" />
                              {visitor.phone}
                            </div>
                          )}
                          {visitor.email && (
                            <div className="flex items-center text-xs text-slate-500">
                              <Mail className="h-3 w-3 mr-1" />
                              {visitor.email}
                            </div>
                          )}
                          <div className="flex items-center text-xs text-slate-500">
                            <Calendar className="h-3 w-3 mr-1" />
                            {formatDate(visitor.visit_date)}
                          </div>
                          {visitor.address && (
                            <div className="flex items-center text-xs text-slate-500">
                              <MapPin className="h-3 w-3 mr-1" />
                              {visitor.address.split(',')[0]}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          {visitor.service_attended && (
                            <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">
                              {visitor.service_attended}
                            </span>
                          )}
                          {visitor.invited_by && (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                              Invited by {visitor.invited_by.user?.full_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge className={getStatusColor(visitor)}>
                        {getStatusText(visitor)}
                      </Badge>
                      <div className="flex items-center space-x-1">
                        <Button variant="ghost" size="sm" onClick={() => router.push(`/admin/rlc/visitors/${visitor.id}`)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => router.push(`/admin/rlc/visitors/${visitor.id}/edit`)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No visitors found</h3>
                <p className="text-slate-500 mb-4">
                  {searchTerm || filterStatus !== 'all' 
                    ? 'Try adjusting your search or filter criteria.'
                    : 'Get started by adding your first visitor.'
                  }
                </p>
                <Button className="">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Visitor
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
    </DashboardLayout>
  )
}
