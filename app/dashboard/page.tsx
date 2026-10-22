'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers'
import { useAllUsers } from '@/lib/hooks/use-data'
import { useUpcomingEvents } from '@/lib/hooks/use-data'
import { getActiveCampYear, getCampRegistrations } from '@/lib/actions/camp'
import { Button } from '@/components/ui/button'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { LoadingPage } from '@/components/ui/loading'
import { ErrorBoundary } from '@/components/error-boundary'
import { DashboardLayout } from '@/components/dashboard-layout'
import { OfflineSync } from '@/components/offline-sync'
import { DataTable } from '@/components/data-table/data-table'
import { getCamperDirectory } from '@/lib/actions/camp'
import type { CampCamperDirectoryRow, CampRegistration } from '@/lib/types'
import { BirthdayNotifications } from '@/components/birthday-notifications'
import type { ColumnDef } from '@tanstack/react-table'
import { ContactRowActions } from '@/components/contacts/contact-row-actions'
import { followUpBoardHref, summarizeFollowUpSla } from '@/lib/camp/follow-up-sla'
import { cn } from '@/lib/utils'
import { StatCard } from '@/components/ui/stat-card'
import {
  ArrowBottomRightIcon,
  ArrowRightIcon,
  ArrowTopRightIcon,
} from '@radix-ui/react-icons'

function DashboardContent() {
  const { user, loading: authLoading, can } = useAuth()
  const router = useRouter()
  const canSeeCamp = can('camp.view')
  const [campRows, setCampRows] = useState<CampCamperDirectoryRow[]>([])
  const [campLoading, setCampLoading] = useState(false)
  const [campError, setCampError] = useState<string | null>(null)
  const [myFollowUps, setMyFollowUps] = useState<CampRegistration[]>([])
  const [myFollowUpsLoading, setMyFollowUpsLoading] = useState(false)
  const [activeYearRegistrations, setActiveYearRegistrations] = useState<CampRegistration[]>([])
  const [activeCampYearId, setActiveCampYearId] = useState<string | null>(null)

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

  const userId = user?.id
  useEffect(() => {
    if (!userId || !canSeeCamp) return
    void loadCampDirectory()
    void loadMyFollowUps()
  }, [userId, canSeeCamp, loadCampDirectory, loadMyFollowUps])

  // Session ended (or never existed in this browser): go sign in instead of hanging.
  useEffect(() => {
    if (!authLoading && !user) router.replace('/auth?redirect=/dashboard')
  }, [authLoading, user, router])

  const campColumns = useMemo<ColumnDef<CampCamperDirectoryRow>[]>(
    () => [
      {
        accessorKey: 'full_name',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Contact" />,
        cell: ({ row }) => (
          <div className="min-w-[170px]">
            <p className="font-medium text-neutral-900 dark:text-neutral-100">{row.original.full_name}</p>
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
          return (
            <span className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              {status.replace('_', ' ')}
            </span>
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
          const tone =
            score >= 4
              ? 'bg-brand-600 text-white'
              : score >= 3
                ? 'bg-neutral-100 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-100'
                : 'bg-transparent text-neutral-600 dark:text-neutral-400 ring-1 ring-neutral-200 dark:ring-neutral-600'
          return (
            <span className={cn('inline-flex min-w-[2.5rem] justify-center rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums', tone)}>
              {score}/5
            </span>
          )
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
              userRole={row.original.user_role}
              latestRegistrationId={latest?.registration_id}
              showPromotions
              onPromoted={() => void loadCampDirectory()}
            />
          )
        },
      },
    ],
    [loadCampDirectory]
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

  // Render as soon as we know who the user is; each panel fills in as its data arrives.
  if (authLoading || !user) {
    return (
      <DashboardLayout>
        <LoadingPage title="Loading dashboard…" description="Getting your workspace ready." />
      </DashboardLayout>
    )
  }

  const greetingName = user.full_name?.split(' ')[0] || 'there'
  const todayLabel = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <DashboardLayout>
      <div className="dashboard-shell">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              Good day, {greetingName}
            </h1>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              {todayLabel}. Follow-ups, camp contacts, and today’s birthdays.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={() => router.push('/admin/camp-meeting/follow-up')}
            >
              Follow-up board
            </Button>
            <Button onClick={() => router.push('/admin/camp-meeting/registrations')}>
              Registrations
              <ArrowRightIcon className="ml-2 h-4 w-4" aria-hidden />
            </Button>
          </div>
        </div>

        <section aria-label="Key metrics" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Admins"
            value={usersLoading ? '…' : totalAdmins}
            sub="Accounts with admin access"
          />
          <StatCard
            label="Camp contacts"
            value={campRows.length}
            sub="Unique phone profiles"
          />
          <StatCard
            label="Linked"
            value={linkedContacts}
            sub="Matched to member accounts"
          />
          <StatCard
            label="My follow-ups"
            value={myFollowUpsLoading ? '…' : myPendingFollowUps}
            sub="Pending, assigned to you"
            tone={myPendingFollowUps > 0 ? 'warning' : 'default'}
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="dashboard-panel p-5 sm:p-6">
            <div className="mb-4 flex items-baseline justify-between gap-2">
              <h2 className="app-section-title text-base">Follow-up SLA</h2>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">Queue health</span>
            </div>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-700 pb-3">
                <span className="text-neutral-700 dark:text-neutral-300">Overdue</span>
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      followUpBoardHref({ sla: 'overdue', yearId: activeCampYearId ?? undefined })
                    )
                  }
                  className="cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
                  aria-label="Open overdue follow-ups"
                >
                  <span
                    className={cn(
                      'inline-flex min-w-[2rem] justify-center rounded-md px-2 py-0.5 text-sm font-semibold tabular-nums',
                      followUpSla.overdue > 10
                        ? 'bg-brand-600 text-white'
                        : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-100'
                    )}
                  >
                    {followUpSla.overdue}
                  </span>
                </button>
              </li>
              <li className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-700 pb-3">
                <span className="text-neutral-700 dark:text-neutral-300">Due soon</span>
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      followUpBoardHref({ sla: 'due_soon', yearId: activeCampYearId ?? undefined })
                    )
                  }
                  className="cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
                  aria-label="Open due-soon follow-ups"
                >
                  <span className="inline-flex min-w-[2rem] justify-center rounded-md bg-neutral-100 dark:bg-neutral-700 px-2 py-0.5 text-sm font-semibold tabular-nums text-neutral-800 dark:text-neutral-100">
                    {followUpSla.dueSoon}
                  </span>
                </button>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-neutral-700 dark:text-neutral-300">Healthy</span>
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      followUpBoardHref({ sla: 'healthy', yearId: activeCampYearId ?? undefined })
                    )
                  }
                  className="cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
                  aria-label="Open healthy follow-ups"
                >
                  <span className="inline-flex min-w-[2rem] justify-center rounded-md bg-neutral-100 dark:bg-neutral-700 px-2 py-0.5 text-sm font-semibold tabular-nums text-neutral-800 dark:text-neutral-100">
                    {followUpSla.healthy}
                  </span>
                </button>
              </li>
            </ul>
          </div>

          <div className="dashboard-panel p-5 sm:p-6">
            <div className="mb-4 flex items-baseline justify-between gap-2">
              <h2 className="app-section-title text-base">Staff load</h2>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">Pending by assignee</span>
            </div>
            {assignmentBalance.length === 0 ? (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">No pending assigned follow-ups yet.</p>
            ) : (
              <ul className="space-y-2.5">
                {assignmentBalance.map((item) => (
                  <li key={item.userId} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate text-neutral-800 dark:text-neutral-100">{item.name}</span>
                    <span className="shrink-0 tabular-nums font-semibold text-neutral-900 dark:text-neutral-100">{item.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="dashboard-panel p-5 sm:p-6">
            <div className="mb-4 flex items-baseline justify-between gap-2">
              <h2 className="app-section-title text-base">Registration mix</h2>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">New vs returning</span>
            </div>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center justify-between">
                <span className="text-neutral-700 dark:text-neutral-300">Last 7 days · new</span>
                <span className="inline-flex items-center gap-1 font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                  {trendSignals.newDelta > 0.5 ? (
                    <ArrowTopRightIcon className="h-3.5 w-3.5 text-neutral-500 dark:text-neutral-400" aria-hidden />
                  ) : trendSignals.newDelta < -0.5 ? (
                    <ArrowBottomRightIcon className="h-3.5 w-3.5 text-neutral-500 dark:text-neutral-400" aria-hidden />
                  ) : null}
                  {contactTrend.new7}
                </span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-neutral-700 dark:text-neutral-300">Last 7 days · returning</span>
                <span className="inline-flex items-center gap-1 font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                  {trendSignals.returningDelta > 0.5 ? (
                    <ArrowTopRightIcon className="h-3.5 w-3.5 text-neutral-500 dark:text-neutral-400" aria-hidden />
                  ) : trendSignals.returningDelta < -0.5 ? (
                    <ArrowBottomRightIcon className="h-3.5 w-3.5 text-neutral-500 dark:text-neutral-400" aria-hidden />
                  ) : null}
                  {contactTrend.returning7}
                </span>
              </li>
              <li className="flex items-center justify-between border-t border-neutral-100 dark:border-neutral-700 pt-3">
                <span className="text-neutral-700 dark:text-neutral-300">Last 30 days · new</span>
                <span className="font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">{contactTrend.new30}</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-neutral-700 dark:text-neutral-300">Last 30 days · returning</span>
                <span className="font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">{contactTrend.returning30}</span>
              </li>
            </ul>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="dashboard-panel p-5 sm:p-6">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="app-section-title text-base">My assigned follow-ups</h2>
                <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                  {myFollowUpsLoading
                    ? 'Loading…'
                    : `${myFollowUps.length} assigned · ${myPendingFollowUps} pending`}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              {myFollowUpsLoading ? (
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Loading…</p>
              ) : myFollowUps.length === 0 ? (
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Nothing assigned to you in the active camp year.</p>
              ) : (
                myFollowUps.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 border-b border-neutral-100 dark:border-neutral-700 py-2.5 last:border-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">{item.full_name}</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">{item.phone}</p>
                    </div>
                    <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                      {(item.follow_up_status ?? 'pending').replace('_', ' ')}
                    </span>
                  </div>
                ))
              )}
            </div>
            <Button
              variant="outline"
              className="mt-4 min-h-10 w-full cursor-pointer border-neutral-300 dark:border-neutral-600"
              onClick={() =>
                router.push(followUpBoardHref({ mine: true, yearId: activeCampYearId ?? undefined }))
              }
            >
              Open my follow-ups
            </Button>
          </div>

          <div className="dashboard-panel p-5 sm:p-6">
            <h2 className="app-section-title text-base">Shortcuts</h2>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Common admin paths</p>
            <div className="mt-4 grid gap-2">
              {[
                { href: '/admin/camp-meeting/follow-up', label: 'Follow-up board' },
                { href: '/admin/camp-meeting/directory', label: 'Camper directory' },
                { href: '/admin/camp-meeting/communications', label: 'Camp SMS / email' },
                { href: '/admin/birthdays', label: 'Birthday SMS' },
                { href: '/admin/users', label: 'User management' },
                { href: '/admin/admins', label: 'Admin management' },
              ].map((item) => (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => router.push(item.href)}
                  className="flex min-h-11 cursor-pointer items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 px-3 text-left text-sm font-medium text-neutral-800 transition-colors duration-150 hover:bg-white dark:border-neutral-700 dark:bg-neutral-900/40 dark:text-neutral-100 dark:hover:bg-neutral-700"
                >
                  {item.label}
                  <ArrowRightIcon className="h-4 w-4 text-neutral-400" aria-hidden />
                </button>
              ))}
            </div>
            <div className="mt-5 border-t border-neutral-100 dark:border-neutral-700 pt-4 text-sm text-neutral-600 dark:text-neutral-400">
              <p className="font-medium text-neutral-800 dark:text-neutral-100">Campus Gem Ministries</p>
              <p className="mt-1">Kokomlemle, Accra</p>
              <p>Sundays 7:00 AM & 9:00 AM</p>
            </div>
          </div>
        </section>

        <section className="dashboard-panel overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-neutral-200 dark:border-neutral-700 px-5 py-4 sm:px-6">
            <div>
              <h2 className="app-section-title text-base">Camp contacts</h2>
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                Searchable directory · {followUpCandidates} multi-year contacts need attention
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="min-h-10 cursor-pointer border-neutral-300 dark:border-neutral-600"
              onClick={() => void loadCampDirectory()}
              disabled={campLoading}
            >
              {campLoading ? 'Refreshing…' : 'Refresh'}
            </Button>
          </div>
          <div className="p-3 sm:p-4">
            {campError ? <p className="mb-3 px-2 text-sm text-red-600">{campError}</p> : null}
            <DataTable
              columns={campColumns}
              data={campRows}
              searchKey="full_name"
              searchPlaceholder="Search contact name…"
            />
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <BirthdayNotifications
              todayBirthdays={todayBirthdays}
              upcomingBirthdays={upcomingBirthdays}
            />
          </div>
          <div className="dashboard-panel p-5 sm:p-6">
            <h2 className="app-section-title text-base">Operations</h2>
            <p className="mt-1 mb-4 text-sm text-neutral-500 dark:text-neutral-400">Offline sync and system status</p>
            <OfflineSync />
          </div>
        </section>
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
