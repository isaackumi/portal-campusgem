'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/providers'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading'
import { ErrorDisplay } from '@/components/ui/error-display'
import {
  MessageSquare,
  Send,
  Users,
  Calendar,
  BarChart3,
  Plus,
  Phone,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  History,
  FileText,
  Filter,
  Search
} from 'lucide-react'
import { smsService, SMSMessage, SMSTemplate, SMSStats } from '@/lib/services/sms-service'
import { useToast } from '@/hooks/use-toast'

export default function SMSPage() {
  const { user, loading: authLoading } = useAuth()
  const [messages, setMessages] = useState<SMSMessage[]>([])
  const [templates, setTemplates] = useState<SMSTemplate[]>([])
  const [stats, setStats] = useState<SMSStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const { toast } = useToast()

  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [messagesData, templatesData, statsData] = await Promise.all([
        smsService.getMessages({ limit: 50 }),
        smsService.getTemplates(),
        smsService.getStats()
      ])

      setMessages(messagesData.messages)
      setTemplates(templatesData)
      setStats(statsData)
    } catch (err) {
      console.error('Error fetching SMS data:', err)
      setError('Failed to load SMS data')
    } finally {
      setLoading(false)
    }
  }

  const handleSendTestMessage = async () => {
    try {
      await smsService.sendMessage({
        recipient: {
          name: 'Test User',
          phone: '+233241234567',
          membership_id: 'EA-2024-TEST'
        },
        message: 'This is a test message from Campus Gem Ministries SMS system.',
        type: 'custom',
        created_by: user?.id || 'admin'
      })

      toast({
        title: "Test Message Sent",
        description: "Test SMS has been queued for sending.",
        variant: "default"
      })

      fetchData() // Refresh data
    } catch (err) {
      console.error('Error sending test message:', err)
      toast({
        title: "Error",
        description: "Failed to send test message.",
        variant: "destructive"
      })
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      sent: { color: 'bg-blue-100 text-blue-800', icon: Send },
      delivered: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      failed: { color: 'bg-red-100 text-red-800', icon: XCircle }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    const Icon = config.icon

    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const getTypeBadge = (type: string) => {
    const typeConfig = {
      birthday: { color: 'bg-pink-100 text-pink-800', icon: Calendar },
      anniversary: { color: 'bg-red-100 text-red-800', icon: Users },
      group: { color: 'bg-purple-100 text-purple-800', icon: Users },
      event: { color: 'bg-blue-100 text-blue-800', icon: Calendar },
      custom: { color: 'bg-gray-100 text-gray-800', icon: MessageSquare }
    }

    const config = typeConfig[type as keyof typeof typeConfig] || typeConfig.custom
    const Icon = config.icon

    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Badge>
    )
  }

  const filteredMessages = messages.filter(message => {
    const matchesSearch = searchTerm === '' ||
      message.recipient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.recipient.phone.includes(searchTerm) ||
      message.message.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || message.status === statusFilter
    const matchesType = typeFilter === 'all' || message.type === typeFilter

    return matchesSearch && matchesStatus && matchesType
  })

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
        <div className="max-w-7xl mx-auto py-12">
          <Card>
            <CardContent className="p-8 text-center">
              <MessageSquare className="h-10 w-10 text-blue-600 mx-auto mb-3" />
              <p className="text-gray-700">Please sign in to manage SMS communications.</p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
            <MessageSquare className="h-8 w-8 mr-3 text-blue-600" />
            SMS Management
          </h1>
          <p className="text-gray-600">Manage SMS communications for birthdays, anniversaries, groups, and events</p>
        </div>

        {error && (
          <ErrorDisplay
            error={error}
            onRetry={fetchData}
            variant="page"
          />
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Sent</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total_sent}</p>
                  </div>
                  <Send className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Delivered</p>
                    <p className="text-2xl font-bold text-green-600">{stats.delivered}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pending</p>
                    <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                  </div>
                  <Clock className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">This Month</p>
                    <p className="text-2xl font-bold text-purple-600">{stats.this_month}</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content */}
        <Tabs defaultValue="messages" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="messages">Messages</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Messages Tab */}
          <TabsContent value="messages" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search messages..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="birthday">Birthday</SelectItem>
                      <SelectItem value="anniversary">Anniversary</SelectItem>
                      <SelectItem value="group">Group</SelectItem>
                      <SelectItem value="event">Event</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button onClick={handleSendTestMessage} variant="outline">
                    <Send className="h-4 w-4 mr-2" />
                    Send Test
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Messages List */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Messages</CardTitle>
                <CardDescription>View and manage SMS messages</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <LoadingSpinner />
                  </div>
                ) : filteredMessages.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No messages found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredMessages.map((message) => (
                      <div key={message.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium text-gray-900">{message.recipient.name}</h4>
                              <Phone className="h-4 w-4 text-gray-400" />
                              <span className="text-sm text-gray-500">{message.recipient.phone}</span>
                              {message.recipient.membership_id && (
                                <Badge variant="outline" className="text-xs">
                                  {message.recipient.membership_id}
                                </Badge>
                              )}
                            </div>
                            <p className="text-gray-700 mb-3">{message.message}</p>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              {getStatusBadge(message.status)}
                              {getTypeBadge(message.type)}
                              <span>•</span>
                              <span>{new Date(message.created_at).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>SMS Templates</CardTitle>
                    <CardDescription>Manage SMS message templates</CardDescription>
                  </div>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Template
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {templates.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No templates found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {templates.map((template) => (
                      <div key={template.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium text-gray-900">{template.name}</h4>
                              {getTypeBadge(template.type)}
                            </div>
                            <p className="text-gray-700 mb-3">{template.template}</p>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <span>Variables: {template.variables.join(', ')}</span>
                              <span>•</span>
                              <span>Created: {new Date(template.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm">Edit</Button>
                            <Button variant="outline" size="sm">Delete</Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Message Types</CardTitle>
                  <CardDescription>Distribution of message types</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {['birthday', 'anniversary', 'group', 'event', 'custom'].map((type) => {
                      const count = messages.filter(m => m.type === type).length
                      const percentage = messages.length > 0 ? (count / messages.length) * 100 : 0

                      return (
                        <div key={type} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getTypeBadge(type)}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{count}</span>
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="text-sm text-gray-500 w-12 text-right">
                              {percentage.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Delivery Status</CardTitle>
                  <CardDescription>Message delivery statistics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { status: 'delivered', label: 'Delivered', color: 'bg-green-600' },
                      { status: 'sent', label: 'Sent', color: 'bg-blue-600' },
                      { status: 'pending', label: 'Pending', color: 'bg-yellow-600' },
                      { status: 'failed', label: 'Failed', color: 'bg-red-600' }
                    ].map((item) => {
                      const count = messages.filter(m => m.status === item.status).length
                      const percentage = messages.length > 0 ? (count / messages.length) * 100 : 0

                      return (
                        <div key={item.status} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getStatusBadge(item.status)}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{count}</span>
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div
                                className={`${item.color} h-2 rounded-full`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="text-sm text-gray-500 w-12 text-right">
                              {percentage.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
