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
  Cake, 
  Heart, 
  MessageSquare, 
  Send, 
  Calendar,
  Users,
  Phone,
  Mail,
  Clock,
  CheckCircle,
  AlertCircle,
  Filter,
  Search,
  Plus,
  Bell
} from 'lucide-react'
import { dataService } from '@/lib/services/data-service'
import { useQuery } from '@tanstack/react-query'
import { smsService } from '@/lib/services/sms-service'
import { useToast } from '@/hooks/use-toast'
import { formatDateTime } from '@/lib/utils'

interface CelebrationMember {
  id: string
  name: string
  membership_id: string
  phone?: string
  email?: string
  celebration_date: string
  type: 'birthday' | 'anniversary'
  spouse_name?: string
  age?: number
  years_married?: number
  is_sms_sent: boolean
  is_email_sent: boolean
}

interface CelebrationStats {
  today_birthdays: number
  today_anniversaries: number
  this_week_birthdays: number
  this_week_anniversaries: number
  this_month_birthdays: number
  this_month_anniversaries: number
  sms_sent_today: number
  emails_sent_today: number
}

export default function CelebrationsPage() {
  const { user, loading: authLoading } = useAuth()
  const [members, setMembers] = useState<CelebrationMember[]>([])
  const [stats, setStats] = useState<CelebrationStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [timeFilter, setTimeFilter] = useState('today')
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [sendingSMS, setSendingSMS] = useState(false)
  const { toast } = useToast()

  const celebrationsQuery = useQuery({
    queryKey: ['celebrations', timeFilter, user?.id],
    queryFn: async () => dataService.getUpcomingEvents(),
    enabled: Boolean(user),
    staleTime: 30_000
  })

  useEffect(() => {
    try {
      setLoading(celebrationsQuery.isLoading || celebrationsQuery.isFetching)
      setError(null)
      const today = new Date()
      const startOfWeek = new Date(today)
      startOfWeek.setDate(today.getDate() - today.getDay())
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6)
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)

      const birthdays = celebrationsQuery.data?.data?.birthdays || []
      const anniversaries = celebrationsQuery.data?.data?.anniversaries || []

      const celebrations: CelebrationMember[] = []
      birthdays.forEach((m: any) => {
        const user = Array.isArray(m.user) ? m.user[0] : m.user
        if (!user || !m.dob) return
        const birthday = m.dob.split('-').slice(1).join('-')
        const thisYearBirthday = `${today.getFullYear()}-${birthday}`
        const nextYearBirthday = `${today.getFullYear() + 1}-${birthday}`
        const celebrationDate = new Date(thisYearBirthday) < today ? nextYearBirthday : thisYearBirthday
        const age = today.getFullYear() - new Date(m.dob).getFullYear()
        celebrations.push({
          id: `${m.id}-birthday`,
          name: user.full_name,
          membership_id: user.membership_id,
          phone: user.phone,
          email: user.email,
          celebration_date: celebrationDate,
          type: 'birthday',
          age,
          is_sms_sent: false,
          is_email_sent: false
        })
      })

      anniversaries.forEach((m: any) => {
        const user = Array.isArray(m.user) ? m.user[0] : m.user
        if (!user || !user.anniversary_date) return
        const anniversary = user.anniversary_date.split('-').slice(1).join('-')
        const thisYearAnniversary = `${today.getFullYear()}-${anniversary}`
        const nextYearAnniversary = `${today.getFullYear() + 1}-${anniversary}`
        const celebrationDate = new Date(thisYearAnniversary) < today ? nextYearAnniversary : thisYearAnniversary
        const yearsMarried = today.getFullYear() - new Date(user.anniversary_date).getFullYear()
        celebrations.push({
          id: `${m.id}-anniversary`,
          name: user.full_name,
          membership_id: user.membership_id,
          phone: user.phone,
          email: user.email,
          celebration_date: celebrationDate,
          type: 'anniversary',
          spouse_name: user.spouse_name,
          years_married: yearsMarried,
          is_sms_sent: false,
          is_email_sent: false
        })
      })

      const filtered = celebrations.filter((c) => {
        const date = new Date(c.celebration_date)
        switch (timeFilter) {
          case 'today':
            return date.toDateString() === today.toDateString()
          case 'week':
            return date >= startOfWeek && date <= endOfWeek
          case 'month':
            return date >= startOfMonth && date <= endOfMonth
          default:
            return true
        }
      })

      setMembers(filtered)

      const stats: CelebrationStats = {
        today_birthdays: celebrations.filter(c => new Date(c.celebration_date).toDateString() === today.toDateString() && c.type === 'birthday').length,
        today_anniversaries: celebrations.filter(c => new Date(c.celebration_date).toDateString() === today.toDateString() && c.type === 'anniversary').length,
        this_week_birthdays: celebrations.filter(c => new Date(c.celebration_date) >= startOfWeek && new Date(c.celebration_date) <= endOfWeek && c.type === 'birthday').length,
        this_week_anniversaries: celebrations.filter(c => new Date(c.celebration_date) >= startOfWeek && new Date(c.celebration_date) <= endOfWeek && c.type === 'anniversary').length,
        this_month_birthdays: celebrations.filter(c => new Date(c.celebration_date) >= startOfMonth && new Date(c.celebration_date) <= endOfMonth && c.type === 'birthday').length,
        this_month_anniversaries: celebrations.filter(c => new Date(c.celebration_date) >= startOfMonth && new Date(c.celebration_date) <= endOfMonth && c.type === 'anniversary').length,
        sms_sent_today: 0,
        emails_sent_today: 0
      }
      setStats(stats)
    } catch (e) {
      setError('Failed to load celebration data')
    }
  }, [celebrationsQuery.isLoading, celebrationsQuery.isFetching, celebrationsQuery.data, timeFilter, user])

  const handleSelectMember = (memberId: string) => {
    setSelectedMembers(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    )
  }

  const handleSelectAll = () => {
    const filtered = filteredMembers
    if (selectedMembers.length === filtered.length) {
      setSelectedMembers([])
    } else {
      setSelectedMembers(filtered.map(m => m.id))
    }
  }

  const handleSendSMS = async () => {
    if (selectedMembers.length === 0) {
      toast({
        title: "No Selection",
        description: "Please select members to send SMS to.",
        variant: "destructive"
      })
      return
    }

    try {
      setSendingSMS(true)

      const selectedCelebrations = members.filter(m => selectedMembers.includes(m.id))
      const birthdayMembers = selectedCelebrations.filter(m => m.type === 'birthday')
      const anniversaryMembers = selectedCelebrations.filter(m => m.type === 'anniversary')

      const smsPromises = []

      if (birthdayMembers.length > 0) {
        smsPromises.push(smsService.sendBirthdayMessages(
          birthdayMembers.map(m => ({
            name: m.name,
            phone: m.phone || '',
            membership_id: m.membership_id
          }))
        ))
      }

      if (anniversaryMembers.length > 0) {
        smsPromises.push(smsService.sendAnniversaryMessages(
          anniversaryMembers.map(m => ({
            name: m.name,
            spouse_name: m.spouse_name || 'Spouse',
            phone: m.phone || '',
            membership_id: m.membership_id
          }))
        ))
      }

      await Promise.all(smsPromises)

      toast({
        title: "SMS Sent Successfully",
        description: `SMS messages sent to ${selectedMembers.length} members.`,
        variant: "default"
      })

      setSelectedMembers([])
      // Data will refresh automatically via React Query
    } catch (err) {
      console.error('Error sending SMS:', err)
      toast({
        title: "SMS Failed",
        description: "Failed to send SMS messages. Please try again.",
        variant: "destructive"
      })
    } finally {
      setSendingSMS(false)
    }
  }

  const filteredMembers = members.filter(member => {
    const matchesSearch = searchTerm === '' || 
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.membership_id.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesType = typeFilter === 'all' || member.type === typeFilter

    return matchesSearch && matchesType
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
              <Cake className="h-10 w-10 text-pink-600 mx-auto mb-3" />
              <p className="text-slate-700">Please sign in to view Birthdays & Anniversaries.</p>
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
          <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center">
            <Cake className="h-8 w-8 mr-3 text-pink-600" />
            Birthdays & Anniversaries
          </h1>
          <p className="text-slate-600">Manage birthday and anniversary celebrations with SMS notifications</p>
        </div>

        {error && (
          <ErrorDisplay
            error={error}
            onRetry={() => window.location.reload()}
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
                    <p className="text-sm font-medium text-slate-600">Today's Birthdays</p>
                    <p className="text-2xl font-bold text-pink-600">{stats.today_birthdays}</p>
                  </div>
                  <Cake className="h-8 w-8 text-pink-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Today's Anniversaries</p>
                    <p className="text-2xl font-bold text-red-600">{stats.today_anniversaries}</p>
                  </div>
                  <Heart className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">This Week</p>
                    <p className="text-2xl font-bold text-primary">{stats.this_week_birthdays + stats.this_week_anniversaries}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">This Month</p>
                    <p className="text-2xl font-bold text-purple-600">{stats.this_month_birthdays + stats.this_month_anniversaries}</p>
                  </div>
                  <Users className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters and Actions */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search members..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="birthday">Birthdays</SelectItem>
                  <SelectItem value="anniversary">Anniversaries</SelectItem>
                </SelectContent>
              </Select>

              <Select value={timeFilter} onValueChange={setTimeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>

              <Button 
                onClick={handleSendSMS} 
                disabled={selectedMembers.length === 0 || sendingSMS}
                className="w-full"
              >
                {sendingSMS ? (
                  <>
                    <LoadingSpinner className="h-4 w-4 mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send SMS ({selectedMembers.length})
                  </>
                )}
              </Button>
            </div>

            {selectedMembers.length > 0 && (
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg">
                <p className="text-sm text-slate-700">
                  {selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''} selected
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setSelectedMembers([])}
                >
                  Clear Selection
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Members List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Celebrations</CardTitle>
                <CardDescription>Birthdays and anniversaries for the selected period</CardDescription>
              </div>
              <Button variant="outline" onClick={handleSelectAll}>
                {selectedMembers.length === filteredMembers.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="text-center py-8">
                <Cake className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-slate-500">No celebrations found for the selected period</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredMembers.map((member) => (
                  <div 
                    key={member.id} 
                    className={`border rounded-lg p-4 hover:bg-slate-50 transition-colors ${
                      selectedMembers.includes(member.id) ? 'bg-slate-50 border-slate-200' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <input
                          type="checkbox"
                          checked={selectedMembers.includes(member.id)}
                          onChange={() => handleSelectMember(member.id)}
                          className="h-4 w-4 text-primary rounded"
                        />
                        
                        <div className="flex items-center gap-3">
                          {member.type === 'birthday' ? (
                            <Cake className="h-6 w-6 text-pink-600" />
                          ) : (
                            <Heart className="h-6 w-6 text-red-600" />
                          )}
                          
                          <div>
                            <h4 className="font-medium text-slate-900">{member.name}</h4>
                            <p className="text-sm text-slate-500">{member.membership_id}</p>
                            {member.type === 'anniversary' && member.spouse_name && (
                              <p className="text-sm text-slate-500">& {member.spouse_name}</p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-medium text-slate-900">
                            {new Date(member.celebration_date).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </p>
                          <p className="text-sm text-slate-500">
                            {member.type === 'birthday' 
                              ? `${member.age} years old`
                              : `${member.years_married} years married`
                            }
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {member.phone && (
                            <div className="flex items-center gap-1 text-sm text-slate-500">
                              <Phone className="h-4 w-4" />
                              <span>{member.phone}</span>
                            </div>
                          )}
                          
                          {member.email && (
                            <div className="flex items-center gap-1 text-sm text-slate-500">
                              <Mail className="h-4 w-4" />
                              <span>{member.email}</span>
                            </div>
                          )}

                          <Badge variant={member.type === 'birthday' ? 'default' : 'secondary'}>
                            {member.type === 'birthday' ? 'Birthday' : 'Anniversary'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

