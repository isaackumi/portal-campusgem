'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/providers'
import { DashboardLayout } from '@/components/dashboard-layout'
import { StatCard } from '@/components/ui/stat-card'
import { PageHeader } from '@/components/layout/page-header'
import { PhoneLink, QuickContactButtons } from '@/components/contact/phone-link'
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
      pending: { variant: 'warning' as const, icon: Clock },
      sent: { variant: 'secondary' as const, icon: Send },
      delivered: { variant: 'success' as const, icon: CheckCircle },
      failed: { variant: 'danger' as const, icon: XCircle }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    const Icon = config.icon

    return (
      <Badge variant={config.variant}>
        <Icon className="h-3 w-3" aria-hidden />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const getTypeBadge = (type: string) => {
    const typeConfig = {
      birthday: { variant: 'brand' as const, icon: Calendar },
      anniversary: { variant: 'brand' as const, icon: Users },
      group: { variant: 'secondary' as const, icon: Users },
      event: { variant: 'secondary' as const, icon: Calendar },
      custom: { variant: 'outline' as const, icon: MessageSquare }
    }

    const config = typeConfig[type as keyof typeof typeConfig] || typeConfig.custom
    const Icon = config.icon

    return (
      <Badge variant={config.variant}>
        <Icon className="h-3 w-3" aria-hidden />
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
              <MessageSquare className="h-10 w-10 text-primary mx-auto mb-3" />
              <p className="text-neutral-700 dark:text-neutral-300">Please sign in to manage SMS communications.</p>
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
        <PageHeader
          title="SMS Management"
          description="Manage SMS communications for birthdays, anniversaries, groups, and events"
        />

        {error && (
          <ErrorDisplay
            error={error}
            onRetry={fetchData}
            variant="page"
          />
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-6">
            <StatCard className="p-4 sm:p-5" label="Total sent" value={stats.total_sent} />
            <StatCard className="p-4 sm:p-5" label="Delivered" value={stats.delivered} />

            <StatCard className="p-4 sm:p-5" label="Pending" value={stats.pending} />
            <StatCard className="p-4 sm:p-5" label="This month" value={stats.this_month} />
          </div>
        )}

        {/* Main Content */}
        <Tabs defaultValue="messages" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 sm:w-auto sm:inline-grid">
            <TabsTrigger value="messages">Messages</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Messages Tab */}
          <TabsContent value="messages" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
                  <div className="relative col-span-2 md:col-span-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 h-4 w-4 dark:text-neutral-400" />
                    <Input
                      type="search"
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

                  <Button onClick={handleSendTestMessage} variant="outline" className="col-span-2 h-11 md:col-span-1 md:h-10">
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
                    <MessageSquare className="h-12 w-12 text-neutral-400 mx-auto mb-4 dark:text-neutral-400" />
                    <p className="text-neutral-500 dark:text-neutral-400">No messages found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredMessages.map((message) => (
                      <div key={message.id} className="rounded-lg border p-3 transition-colors hover:bg-neutral-50 dark:border-white/10 dark:hover:bg-white/[0.06] sm:p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                              <h4 className="min-w-0 break-words font-medium text-neutral-900 dark:text-neutral-100">{message.recipient.name}</h4>
                              <PhoneLink phone={message.recipient.phone} name={message.recipient.name} className="text-sm text-neutral-500 dark:text-neutral-400" />
                              {message.recipient.membership_id && (
                                <Badge variant="outline" className="text-xs">
                                  {message.recipient.membership_id}
                                </Badge>
                              )}
                            </div>
                            <p className="mb-3 break-words text-neutral-700 dark:text-neutral-300">{message.message}</p>
                            <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
                              {getStatusBadge(message.status)}
                              {getTypeBadge(message.type)}
                              <span>•</span>
                              <span>{new Date(message.created_at).toLocaleString()}</span>
                            </div>
                          </div>
                          <QuickContactButtons phone={message.recipient.phone} name={message.recipient.name} />
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
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>SMS Templates</CardTitle>
                    <CardDescription>Manage SMS message templates</CardDescription>
                  </div>
                  <Button className="h-11 w-full sm:h-10 sm:w-auto">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Template
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {templates.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-neutral-400 mx-auto mb-4 dark:text-neutral-400" />
                    <p className="text-neutral-500 dark:text-neutral-400">No templates found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {templates.map((template) => (
                      <div key={template.id} className="rounded-lg border p-3 transition-colors hover:bg-neutral-50 dark:border-white/10 dark:hover:bg-white/[0.06] sm:p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium text-neutral-900 dark:text-neutral-100">{template.name}</h4>
                              {getTypeBadge(template.type)}
                            </div>
                            <p className="mb-3 break-words text-neutral-700 dark:text-neutral-300">{template.template}</p>
                            <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
                              <span>Variables: {template.variables.join(', ')}</span>
                              <span>•</span>
                              <span>Created: {new Date(template.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="h-10 flex-1 sm:h-8 sm:flex-none">Edit</Button>
                            <Button variant="outline" size="sm" className="h-10 flex-1 sm:h-8 sm:flex-none">Delete</Button>
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
                            <div className="h-2 w-16 rounded-full bg-neutral-200 dark:bg-white/10 sm:w-20">
                              <div
                                className="bg-primary h-2 rounded-full"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="text-sm text-neutral-500 w-12 text-right dark:text-neutral-400">
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
                      { status: 'delivered', label: 'Delivered', color: 'bg-emerald-600' },
                      { status: 'sent', label: 'Sent', color: 'bg-primary' },
                      { status: 'pending', label: 'Pending', color: 'bg-amber-500' },
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
                            <div className="h-2 w-16 rounded-full bg-neutral-200 dark:bg-white/10 sm:w-20">
                              <div
                                className={`${item.color} h-2 rounded-full`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="text-sm text-neutral-500 w-12 text-right dark:text-neutral-400">
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
