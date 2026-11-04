'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/providers'
import { DashboardLayout } from '@/components/dashboard-layout'
import { StatCard } from '@/components/ui/stat-card'
import { Checkbox } from '@/components/ui/checkbox'
import { PhoneLink, QuickContactButtons } from '@/components/contact/phone-link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading'
import { ErrorDisplay } from '@/components/ui/error-display'
import { Cake, Heart, Send, Mail, Search } from 'lucide-react'
import { dataService } from '@/lib/services/data-service'
import { useQuery } from '@tanstack/react-query'
import { smsService } from '@/lib/services/sms-service'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

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
        <div className="mx-auto max-w-md py-12 text-center">
          <Cake className="mx-auto mb-3 h-10 w-10 text-neutral-400 dark:text-neutral-500" />
          <p className="text-sm text-neutral-700 dark:text-neutral-300">Please sign in to view birthdays and anniversaries.</p>
        </div>
      </DashboardLayout>
    )
  }

  const allSelected = filteredMembers.length > 0 && selectedMembers.length === filteredMembers.length
  const timeTabs: { value: string; label: string }[] = [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This week' },
    { value: 'month', label: 'This month' },
    { value: 'all', label: 'All' },
  ]

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-6 pb-24 lg:pb-0">
        {/* Header */}
        <div>
          <h1 className="app-page-title">Birthdays &amp; anniversaries</h1>
          <p className="app-page-description mt-1">Celebrate your people and send greetings by SMS</p>
        </div>

        {error && (
          <ErrorDisplay
            error={error}
            onRetry={() => window.location.reload()}
            variant="page"
          />
        )}

        {stats && (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard label="Birthdays today" value={stats.today_birthdays} />
            <StatCard label="Anniversaries today" value={stats.today_anniversaries} />
            <StatCard label="This week" value={stats.this_week_birthdays + stats.this_week_anniversaries} />
            <StatCard label="This month" value={stats.this_month_birthdays + stats.this_month_anniversaries} />
          </div>
        )}

        {/* Filters */}
        <div className="space-y-3">
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Period">
            {timeTabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={timeFilter === tab.value}
                onClick={() => setTimeFilter(tab.value)}
                className={cn(
                  'inline-flex min-h-10 shrink-0 items-center whitespace-nowrap rounded-full border px-4 text-sm font-medium transition-colors',
                  timeFilter === tab.value
                    ? 'border-brand-600 bg-brand-600 text-white dark:border-brand-500 dark:bg-brand-500'
                    : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 dark:border-white/10 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:border-white/20'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
              <Input
                type="search"
                placeholder="Search name or membership ID"
                aria-label="Search celebrations"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-11 pl-10 sm:h-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-11 sm:h-10 sm:w-44" aria-label="Filter by type">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Birthdays and anniversaries</SelectItem>
                <SelectItem value="birthday">Birthdays</SelectItem>
                <SelectItem value="anniversary">Anniversaries</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={handleSendSMS}
              disabled={selectedMembers.length === 0 || sendingSMS}
              className="hidden sm:inline-flex"
            >
              {sendingSMS ? <LoadingSpinner size="sm" className="mr-2" /> : <Send className="mr-2 h-4 w-4" />}
              {sendingSMS ? 'Sending…' : `Send SMS (${selectedMembers.length})`}
            </Button>
          </div>
        </div>

        {/* List */}
        <section className="dashboard-panel overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-neutral-200/80 px-4 py-2 dark:border-white/[0.06] sm:px-5">
            <h2 className="app-section-title">
              Celebrations <span className="tabular-nums text-neutral-500 dark:text-neutral-400">({filteredMembers.length})</span>
            </h2>
            {filteredMembers.length > 0 ? (
              <Button variant="ghost" size="sm" onClick={handleSelectAll} className="h-11 sm:h-9">
                {allSelected ? 'Deselect all' : 'Select all'}
              </Button>
            ) : null}
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <LoadingSpinner />
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <Cake className="mx-auto mb-3 h-10 w-10 text-neutral-300 dark:text-neutral-600" />
              <p className="text-sm text-neutral-500 dark:text-neutral-400">No celebrations in this period</p>
            </div>
          ) : (
            <ul className="divide-y divide-neutral-100 dark:divide-white/[0.06]">
              {filteredMembers.map((member) => {
                const selected = selectedMembers.includes(member.id)
                const checkboxId = `celebration-${member.id}`
                return (
                  <li
                    key={member.id}
                    className={cn(
                      'flex items-start gap-3 px-4 py-3 transition-colors sm:items-center sm:px-5',
                      selected && 'bg-brand-50/50 dark:bg-brand-400/[0.06]'
                    )}
                  >
                    <label htmlFor={checkboxId} className="-m-2 flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center sm:m-0 sm:h-auto sm:w-auto">
                      <Checkbox
                        id={checkboxId}
                        checked={selected}
                        onCheckedChange={() => handleSelectMember(member.id)}
                        aria-label={`Select ${member.name}`}
                      />
                    </label>
                    <span
                      className={cn(
                        'hidden h-9 w-9 shrink-0 items-center justify-center rounded-full sm:flex',
                        member.type === 'birthday'
                          ? 'bg-brand-50 text-brand-600 dark:bg-brand-400/10 dark:text-brand-300'
                          : 'bg-rose-50 text-rose-600 dark:bg-rose-400/10 dark:text-rose-300'
                      )}
                      aria-hidden
                    >
                      {member.type === 'birthday' ? <Cake className="h-4 w-4" /> : <Heart className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="min-w-0 truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                          {member.name}
                          {member.type === 'anniversary' && member.spouse_name ? (
                            <span className="font-normal text-neutral-500 dark:text-neutral-400"> &amp; {member.spouse_name}</span>
                          ) : null}
                        </p>
                        <Badge variant={member.type === 'birthday' ? 'brand' : 'secondary'}>
                          {member.type === 'birthday' ? 'Birthday' : 'Anniversary'}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-[13px] text-neutral-600 dark:text-neutral-400">
                        {new Date(member.celebration_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        {' · '}
                        {member.type === 'birthday'
                          ? `turning ${member.age}`
                          : `${member.years_married} years married`}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[13px] text-neutral-500 dark:text-neutral-400">
                        {member.phone ? <PhoneLink phone={member.phone} name={member.name} /> : null}
                        {member.membership_id ? <span className="font-mono">{member.membership_id}</span> : null}
                        {member.email ? (
                          <span className="hidden min-w-0 items-center gap-1 md:inline-flex">
                            <Mail className="h-3 w-3 shrink-0" aria-hidden />
                            <span className="truncate">{member.email}</span>
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <QuickContactButtons phone={member.phone} name={member.name} className="shrink-0" />
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* Phone: selection bar above the bottom tab bar */}
        {selectedMembers.length > 0 ? (
          <div className="fixed inset-x-4 bottom-20 z-30 flex items-center gap-2 rounded-xl border border-neutral-200/80 bg-white/95 p-2 shadow-lg backdrop-blur dark:border-white/10 dark:bg-neutral-900/95 sm:hidden">
            <Button variant="ghost" onClick={() => setSelectedMembers([])} className="h-11 px-3">
              Clear
            </Button>
            <Button onClick={handleSendSMS} disabled={sendingSMS} className="h-11 flex-1">
              {sendingSMS ? <LoadingSpinner size="sm" className="mr-2" /> : <Send className="mr-2 h-4 w-4" />}
              {sendingSMS ? 'Sending…' : `Send SMS (${selectedMembers.length})`}
            </Button>
          </div>
        ) : null}
      </div>
    </DashboardLayout>
  )
}
