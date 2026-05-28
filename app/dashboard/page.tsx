'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers'
import { useAllUsers } from '@/lib/hooks/use-data'
import { useDashboardStats, useUpcomingEvents } from '@/lib/hooks/use-data'
import { getActiveCampYear, getCampRegistrations } from '@/lib/actions/camp'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { LoadingPage } from '@/components/ui/loading'
import { ErrorDisplay } from '@/components/ui/error-display'
import { ErrorBoundary } from '@/components/error-boundary'
import { DashboardLayout } from '@/components/dashboard-layout'
import { OfflineSync } from '@/components/offline-sync'
import { DataTable } from '@/components/data-table/data-table'
import { getCamperDirectory } from '@/lib/actions/camp'
import type { CampCamperDirectoryRow, CampRegistration } from '@/lib/types'
import { FoldableCard } from '@/components/foldable-card'
import { BirthdayNotifications } from '@/components/birthday-notifications'
import type { ColumnDef } from '@tanstack/react-table'
import { ContactRowActions } from '@/components/contacts/contact-row-actions'
import { followUpBoardHref, summarizeFollowUpSla } from '@/lib/camp/follow-up-sla'
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  ClipboardList,
  MapPin,
  Phone,
  Users,
} from 'lucide-react'

function DashboardContent() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [campRows, setCampRows] = useState<CampCamperDirectoryRow[]>([])
  const [campLoading, setCampLoading] = useState(false)
  const [campError, setCampError] = useState<string | null>(null)
  const [myFollowUps, setMyFollowUps] = useState<CampRegistration[]>([])
  const [myFollowUpsLoading, setMyFollowUpsLoading] = useState(false)
  const [activeYearRegistrations, setActiveYearRegistrations] = useState<CampRegistration[]>([])
  const [activeCampYearId, setActiveCampYearId] = useState<string | null>(null)

  const { data: stats, error: statsError, loading: statsLoading, refetch: refetchStats } = useDashboardStats()
  const { data: allUsers, loading: usersLoading } = useAllUsers()
  const { data: upcomingEvents } = useUpcomingEvents()

  const loadCampDirectory = useCallback(async () => {
    setCampLoading(true)
    const { data, error } = await getCamperDirectory()
    setCampRows(data)
    setCampError(error)
    setCampLoading(false)
  }, [])

  const loadMyFollowUps = useCallback(async () => {
    if (!user?.id) return
    setMyFollowUpsLoading(true)
    const { data: activeYear } = await getActiveCampYear()
    if (!activeYear) {
      setMyFollowUps([])
      setActiveYearRegistrations([])
      setActiveCampYearId(null)
      setMyFollowUpsLoading(false)
      return
    }
    setActiveCampYearId(activeYear.id)
    const { data } = await getCampRegistrations(activeYear.id)
    const yearRegistrations = data ?? []
    setActiveYearRegistrations(yearRegistrations)
    const mine = yearRegistrations.filter((item) => item.assigned_to === user.id)
    setMyFollowUps(mine)
    setMyFollowUpsLoading(false)
  }, [user?.id])

  useEffect(() => {
    if (!user) return
    void loadCampDirectory()
    void loadMyFollowUps()
  }, [user, loadCampDirectory, loadMyFollowUps])

  const campColumns = useMemo<ColumnDef<CampCamperDirectoryRow>[]>(
    () => [
      {
        accessorKey: 'full_name',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Contact" />,
        cell: ({ row }) => (
          <div className="min-w-[170px]">
            <p className="font-medium text-gray-900">{row.original.full_name}</p>
            <p className="text-xs text-muted-foreground">{row.original.phone}</p>
          </div>
        ),
      },
      {
        accessorKey: 'email',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.email || '—'}</span>,
      },
      {
        id: 'latest_year',
        accessorFn: (row) => row.years[0]?.year ?? 0,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Latest year" />,
        cell: ({ row }) => <span className="text-sm font-medium">{row.original.years[0]?.year ?? '—'}</span>,
      },
      {
        id: 'latest_status',
        accessorFn: (row) => row.years[0]?.status ?? 'registered',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Latest status" />,
        cell: ({ row }) => {
          const status = row.original.years[0]?.status ?? 'registered'
          const variant = status === 'checked_in' ? 'default' : 'secondary'
          return (
            <Badge variant={variant} className="capitalize">
              {status.replace('_', ' ')}
            </Badge>
          )
        },
      },
      {
        accessorKey: 'registration_count',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Registrations" />,
        cell: ({ row }) => <span className="text-sm font-medium">{row.original.registration_count}</span>,
      },
      {
        id: 'follow_up_score',
        accessorFn: (row) => {
          const latestStatus = row.years[0]?.status
          let score = row.registration_count > 1 ? 2 : 1
          if (!row.user_id) score += 2
          if (latestStatus !== 'checked_in') score += 1
          return score
        },
        header: ({ column }) => <DataTableColumnHeader column={column} title="Priority" />,
        cell: ({ row }) => {
          const latestStatus = row.original.years[0]?.status
          let score = row.original.registration_count > 1 ? 2 : 1
          if (!row.original.user_id) score += 2
          if (latestStatus !== 'checked_in') score += 1
          const tone = score >= 4 ? 'destructive' : score >= 3 ? 'secondary' : 'outline'
          return <Badge variant={tone}>{score}/5</Badge>
        },
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const latest = row.original.years[0]
          return (
            <ContactRowActions
              contactName={row.original.full_name}
              phone={row.original.phone}
              email={row.original.email}
              userId={row.original.user_id}
              latestRegistrationId={latest?.registration_id}
            />
          )
        },
      },
    ],
    []
  )

  const followUpCandidates = useMemo(
    () => campRows.filter((row) => row.registration_count > 1).length,
    [campRows]
  )

  const linkedContacts = useMemo(() => campRows.filter((row) => !!row.user_id).length, [campRows])
  const myPendingFollowUps = useMemo(
    () => myFollowUps.filter((item) => !item.follow_up_status || item.follow_up_status !== 'completed').length,
    [myFollowUps]
  )
  const followUpSla = useMemo(
    () => summarizeFollowUpSla(activeYearRegistrations),
    [activeYearRegistrations]
  )
  const assignmentBalance = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const reg of activeYearRegistrations) {
      if (!reg.assigned_to || reg.follow_up_status === 'completed') continue
      counts[reg.assigned_to] = (counts[reg.assigned_to] ?? 0) + 1
    }
    return Object.entries(counts)
      .map(([userId, count]) => ({
        userId,
        count,
        name: (allUsers ?? []).find((u) => u.id === userId)?.full_name ?? 'Unknown',
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
  }, [activeYearRegistrations, allUsers])
  const contactTrend = useMemo(() => {
    const now = Date.now()
    const dayMs = 24 * 60 * 60 * 1000
    let new7 = 0
    let returning7 = 0
    let new30 = 0
    let returning30 = 0
    for (const reg of activeYearRegistrations) {
      const createdAt = new Date(reg.created_at).getTime()
      if (!Number.isFinite(createdAt)) continue
      const ageDays = (now - createdAt) / dayMs
      if (ageDays <= 30) {
        if (reg.is_new_registrant) new30 += 1
        else returning30 += 1
      }
      if (ageDays <= 7) {
        if (reg.is_new_registrant) new7 += 1
        else returning7 += 1
      }
    }
    return { new7, returning7, new30, returning30 }
  }, [activeYearRegistrations])
  const trendSignals = useMemo(() => {
    const newWeeklyBaseline = contactTrend.new30 / 4 || 0
    const returningWeeklyBaseline = contactTrend.returning30 / 4 || 0
    const newDelta = contactTrend.new7 - newWeeklyBaseline
    const returningDelta = contactTrend.returning7 - returningWeeklyBaseline
    return { newDelta, returningDelta }
  }, [contactTrend])
  const totalAdmins = useMemo(
    () => (allUsers ?? []).filter((item) => item.role === 'admin').length,
    [allUsers]
  )

  const todayBirthdays = useMemo(() => {
    if (!upcomingEvents?.birthdays) return []
    const today = new Date()
    const key = `${today.getMonth() + 1}-${today.getDate()}`
    return upcomingEvents.birthdays
      .filter((member: any) => {
        if (!member.dob) return false
        const d = new Date(member.dob)
        return `${d.getMonth() + 1}-${d.getDate()}` === key
      })
      .map((member: any) => ({
        id: member.id,
        name: member.user?.full_name || 'Unknown',
        dob: member.dob,
        phone: member.user?.phone,
        email: member.user?.email,
        role: member.user?.role,
        membership_id: member.user?.membership_id,
      }))
  }, [upcomingEvents?.birthdays])

  const upcomingBirthdays = useMemo(() => {
    if (!upcomingEvents?.birthdays) return []
    const today = new Date()
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
    return upcomingEvents.birthdays
      .filter((member: any) => {
        if (!member.dob) return false
        const d = new Date(member.dob)
        const thisYear = new Date(today.getFullYear(), d.getMonth(), d.getDate())
        if (thisYear < today) thisYear.setFullYear(today.getFullYear() + 1)
        return thisYear > today && thisYear <= nextWeek
      })
      .map((member: any) => ({
        id: member.id,
        name: member.user?.full_name || 'Unknown',
        dob: member.dob,
        phone: member.user?.phone,
        email: member.user?.email,
        role: member.user?.role,
        membership_id: member.user?.membership_id,
      }))
  }, [upcomingEvents?.birthdays])

  if (authLoading || statsLoading) {
    return (
      <DashboardLayout>
        <LoadingPage title="Loading Dashboard..." description="Preparing member and follow-up data..." />
      </DashboardLayout>
    )
  }

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

  if (!user) return null

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-6 rounded-2xl border border-slate-200/70 bg-white/70 p-4 shadow-sm backdrop-blur-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Member Tracking & Follow-up</h1>
            <p className="mt-1 text-sm text-gray-600">
              A workflow-first dashboard for contacts, registration history, and follow-up.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => router.push('/admin/camp-meeting/follow-up')}>
              <ClipboardList className="mr-2 h-4 w-4" />
              Follow-up board
            </Button>
            <Button onClick={() => router.push('/admin/camp-meeting/registrations')}>
              Registration queue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
            <CardHeader className="pb-2">
              <CardDescription>Total admins</CardDescription>
              <CardTitle className="text-3xl">{usersLoading ? '...' : totalAdmins}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <Users className="mr-1 inline h-4 w-4" />
              Accounts with admin role
            </CardContent>
          </Card>
          <Card className="border-violet-200 bg-gradient-to-br from-violet-50 to-white">
            <CardHeader className="pb-2">
              <CardDescription>Camp contacts</CardDescription>
              <CardTitle className="text-3xl">{campRows.length}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <Phone className="mr-1 inline h-4 w-4" />
              Unique phone-based profiles
            </CardContent>
          </Card>
          <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
            <CardHeader className="pb-2">
              <CardDescription>Linked contacts</CardDescription>
              <CardTitle className="text-3xl">{linkedContacts}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Matched to member accounts
            </CardContent>
          </Card>
          <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white">
            <CardHeader className="pb-2">
              <CardDescription>My pending follow-ups</CardDescription>
              <CardTitle className="text-3xl">{myFollowUpsLoading ? '...' : myPendingFollowUps}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Assigned to you in active camp year
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="border-rose-200 bg-gradient-to-br from-rose-50 to-white">
            <CardHeader className="pb-2">
              <CardDescription>Follow-up SLA</CardDescription>
              <CardTitle className="text-base">Queue health</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-rose-700">Overdue</span>
                <div className="flex items-center gap-1">
                  {followUpSla.overdue > 10 ? <AlertTriangle className="h-4 w-4 text-rose-600" /> : null}
                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        followUpBoardHref({ sla: 'overdue', yearId: activeCampYearId ?? undefined })
                      )
                    }
                    className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                    aria-label="Open overdue follow-ups"
                  >
                    <Badge variant={followUpSla.overdue > 10 ? 'destructive' : 'secondary'}>{followUpSla.overdue}</Badge>
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-amber-700">Due soon</span>
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      followUpBoardHref({ sla: 'due_soon', yearId: activeCampYearId ?? undefined })
                    )
                  }
                  className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                  aria-label="Open in-progress follow-ups"
                >
                  <Badge variant={followUpSla.dueSoon > 15 ? 'destructive' : 'secondary'}>{followUpSla.dueSoon}</Badge>
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-emerald-700">Healthy</span>
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      followUpBoardHref({ sla: 'healthy', yearId: activeCampYearId ?? undefined })
                    )
                  }
                  className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                  aria-label="Open completed follow-ups"
                >
                  <Badge variant="outline">{followUpSla.healthy}</Badge>
                </button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-cyan-200 bg-gradient-to-br from-cyan-50 to-white">
            <CardHeader className="pb-2">
              <CardDescription>Assignment balance</CardDescription>
              <CardTitle className="text-base">Pending load by staff</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {assignmentBalance.length === 0 ? (
                <p className="text-sm text-muted-foreground">No pending assigned follow-ups yet.</p>
              ) : (
                assignmentBalance.map((item) => (
                  <div key={item.userId} className="flex items-center justify-between text-sm">
                    <span className="truncate pr-2">{item.name}</span>
                    <Badge variant="secondary">{item.count}</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-lime-200 bg-gradient-to-br from-lime-50 to-white">
            <CardHeader className="pb-2">
              <CardDescription>New vs returning trend</CardDescription>
              <CardTitle className="text-base">Registration mix</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span>Last 7 days (new)</span>
                <div className="flex items-center gap-1">
                  {trendSignals.newDelta > 0.5 ? (
                    <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                  ) : trendSignals.newDelta < -0.5 ? (
                    <ArrowDownRight className="h-4 w-4 text-rose-600" />
                  ) : null}
                  <button
                    type="button"
                    onClick={() => router.push('/admin/camp-meeting/registrations')}
                    className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300"
                    aria-label="Open registrations for new contacts"
                  >
                    <Badge variant="outline">{contactTrend.new7}</Badge>
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span>Last 7 days (returning)</span>
                <div className="flex items-center gap-1">
                  {trendSignals.returningDelta > 0.5 ? (
                    <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                  ) : trendSignals.returningDelta < -0.5 ? (
                    <ArrowDownRight className="h-4 w-4 text-rose-600" />
                  ) : null}
                  <button
                    type="button"
                    onClick={() => router.push('/admin/camp-meeting/registrations')}
                    className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300"
                    aria-label="Open registrations for returning contacts"
                  >
                    <Badge variant="outline">{contactTrend.returning7}</Badge>
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span>Last 30 days (new)</span>
                <Badge variant="secondary">{contactTrend.new30}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Last 30 days (returning)</span>
                <Badge variant="secondary">{contactTrend.returning30}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50 to-white">
            <CardHeader>
              <CardTitle>My assigned follow-ups</CardTitle>
              <CardDescription>
                {myFollowUpsLoading
                  ? 'Loading assignments...'
                  : `${myFollowUps.length} assigned • ${myPendingFollowUps} pending`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {myFollowUpsLoading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : myFollowUps.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No follow-ups currently assigned to your admin account.
                </p>
              ) : (
                myFollowUps.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-md border bg-white px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">{item.full_name}</p>
                      <p className="text-xs text-muted-foreground">{item.phone}</p>
                    </div>
                    <Badge variant={item.follow_up_status === 'completed' ? 'default' : 'secondary'}>
                      {(item.follow_up_status ?? 'pending').replace('_', ' ')}
                    </Badge>
                  </div>
                ))
              )}
              <Button
                variant="outline"
                className="w-full"
                onClick={() =>
                  router.push(
                    followUpBoardHref({ mine: true, yearId: activeCampYearId ?? undefined })
                  )
                }
              >
                Open my follow-ups
              </Button>
            </CardContent>
          </Card>

          <Card className="border-fuchsia-200 bg-gradient-to-br from-fuchsia-50 to-white">
            <CardHeader>
              <CardTitle>Admin access setup</CardTitle>
              <CardDescription>Make a member an admin so they can log in and manage the system.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-700">
              <p>
                Go to <span className="font-medium">User Management</span>, edit the user, and set <span className="font-medium">Role = Admin</span>.
              </p>
              <p>
                For quick admin provisioning, use <span className="font-medium">Admin Management</span> to create/edit admins directly.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => router.push('/admin/users')}>
                  Open User Management
                </Button>
                <Button onClick={() => router.push('/admin/admins')}>Open Admin Management</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="overflow-hidden border-slate-200 shadow-sm">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-gradient-to-r from-slate-50 to-blue-50 p-3">
              <div>
                <CardTitle>Camp Contacts & Registrations</CardTitle>
                <CardDescription>
                  Expanded searchable table for member tracing, registration history, and follow-up triage.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-blue-200 bg-white text-blue-700 hover:bg-blue-50"
                onClick={() => void loadCampDirectory()}
                disabled={campLoading}
              >
                {campLoading ? 'Refreshing...' : 'Refresh table'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 bg-white">
            {campError ? <p className="text-sm text-red-600">{campError}</p> : null}
            <DataTable
              columns={campColumns}
              data={campRows}
              searchKey="full_name"
              searchPlaceholder="Search contact name..."
            />
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <BirthdayNotifications todayBirthdays={todayBirthdays} upcomingBirthdays={upcomingBirthdays} />
          </div>
          <div className="space-y-6">
            <FoldableCard
              title="Follow-up Shortcuts"
              description="Jump straight into outreach actions"
              icon={<CheckCircle2 className="h-5 w-5 text-green-600" />}
              badge={<Badge variant="secondary">Actions</Badge>}
              defaultExpanded={true}
            >
              <div className="grid gap-2">
                <Button variant="outline" className="justify-start" onClick={() => router.push('/admin/camp-meeting/follow-up')}>
                  Open follow-up board
                </Button>
                <Button variant="outline" className="justify-start" onClick={() => router.push('/admin/camp-meeting/directory')}>
                  Open full camper directory
                </Button>
                <Button variant="outline" className="justify-start" onClick={() => router.push('/admin/camp-meeting/communications')}>
                  Send SMS / email follow-up
                </Button>
                <Button variant="outline" className="justify-start" onClick={() => router.push('/admin/camp-meeting/registrations')}>
                  View all registrations
                </Button>
              </div>
            </FoldableCard>

            <FoldableCard
              title="Campus Gem Ministries"
              description="Church information"
              icon={<MapPin className="h-5 w-5 text-blue-600" />}
              badge={<Badge variant="secondary">Info</Badge>}
              defaultExpanded={true}
            >
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-500">Location</p>
                  <p className="text-sm text-gray-900">Kokomlemle, Accra</p>
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
            </FoldableCard>

            <FoldableCard
              title="Operations"
              description="System health and sync"
              icon={<Calendar className="h-5 w-5 text-gray-600" />}
              badge={<Badge variant="secondary">Status</Badge>}
              defaultExpanded={false}
            >
              <OfflineSync />
            </FoldableCard>
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
