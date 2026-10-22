'use client'

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers'
import { useAllUsers, useUpcomingEvents } from '@/lib/hooks/use-data'
import { useCampRegistrations } from '@/lib/hooks/use-camp'
import { getCamperDirectory } from '@/lib/actions/camp'
import { Button } from '@/components/ui/button'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { LoadingPage } from '@/components/ui/loading'
import { ErrorBoundary } from '@/components/error-boundary'
import { DashboardLayout } from '@/components/dashboard-layout'
import { OfflineSync } from '@/components/offline-sync'
import { DataTable } from '@/components/data-table/data-table'
import type { CampCamperDirectoryRow } from '@/lib/types'
import { BirthdayNotifications } from '@/components/birthday-notifications'
import type { ColumnDef } from '@tanstack/react-table'
import { ContactRowActions } from '@/components/contacts/contact-row-actions'
import { followUpBoardHref, summarizeFollowUpSla } from '@/lib/camp/follow-up-sla'
import { birthdayPartsFromDob, daysUntilNextBirthday } from '@/lib/birthdays/upcoming-birthdays'
import { cn } from '@/lib/utils'
import { StatCard } from '@/components/ui/stat-card'
import { PersonLabel, displayName } from '@/components/ui/person'
import {
  AlarmClock,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Cake,
  CalendarClock,
  ClipboardCheck,
  HeartHandshake,
  QrCode,
  Send,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react'
import { canAccessPath } from '@/lib/auth/roles'
import { DashboardHero, type StickyNoteAction } from '@/components/dashboard/dashboard-hero'
import { CustomiseCardsButton, useDashboardLayout } from '@/components/dashboard/customise-cards'
import { TodoCard, type TodoItem } from '@/components/dashboard/todo-card'
import { DashboardPanel, PanelList } from '@/components/dashboard/panel'
import type { Permission } from '@/lib/auth/roles'

type DashboardCardId =
  | 'sla'
  | 'staff'
  | 'mix'
  | 'myfollow'
  | 'shortcuts'
  | 'contacts'
  | 'birthdays'
  | 'operations'

const DASHBOARD_CARDS: Array<{ id: DashboardCardId; label: string }> = [
  { id: 'sla', label: 'Follow-up health' },
  { id: 'staff', label: 'Staff load' },
  { id: 'mix', label: 'Registration mix' },
  { id: 'myfollow', label: 'My follow-ups' },
  { id: 'shortcuts', label: 'Shortcuts' },
  { id: 'birthdays', label: 'Birthdays' },
  { id: 'contacts', label: 'Camp contacts' },
  { id: 'operations', label: 'Offline sync' },
]
const DEFAULT_CARD_ORDER = DASHBOARD_CARDS.map((card) => card.id)
const CAMP_CARDS: DashboardCardId[] = ['sla', 'staff', 'mix', 'myfollow', 'contacts']
/** Cards that need the full width of the grid. */
const WIDE_CARDS: DashboardCardId[] = ['contacts']

const STICKY_NOTES: Array<StickyNoteAction & { permission: Permission }> = [
  { permission: 'members.manage', href: '/members/add', lines: ['Add a', 'member'], icon: UserPlus, tone: 'rose' },
  { permission: 'attendance.record', href: '/attendance/manual', lines: ['Take', 'attendance'], icon: ClipboardCheck, tone: 'sage' },
  { permission: 'camp.manage', href: '/admin/camp-meeting/scan', lines: ['Camp', 'check-in'], icon: QrCode, tone: 'apricot' },
  { permission: 'sms.send', href: '/admin/communications', lines: ['Send a', 'message'], icon: Send, tone: 'sky' },
  { permission: 'rlc.manage', href: '/admin/rlc/visitors/add', lines: ['Welcome a', 'visitor'], icon: HeartHandshake, tone: 'lemon' },
  { permission: 'celebrations.view', href: '/celebrations', lines: ['Celebrate', 'birthdays'], icon: Cake, tone: 'lilac' },
]

const SHORTCUTS = [
  { href: '/admin/camp-meeting/follow-up', label: 'Follow-up board' },
  { href: '/admin/camp-meeting/directory', label: 'Camper directory' },
  { href: '/admin/camp-meeting/communications', label: 'Camp SMS / email' },
  { href: '/admin/birthdays', label: 'Birthday SMS' },
  { href: '/admin/users', label: 'User management' },
  { href: '/admin/admins', label: 'Access & roles' },
]

const DAY_MS = 24 * 60 * 60 * 1000

/** "3 follow-ups", "1 follow-up". */
function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`
}

/** "in_progress" → "In progress". */
function statusLabel(status: string): string {
  const text = status.replace(/_/g, ' ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** 1–5: repeat campers, unlinked contacts and anyone not yet checked in rank higher. */
function followUpScore(row: CampCamperDirectoryRow): number {
  let score = row.registration_count > 1 ? 2 : 1
  if (!row.user_id) score += 2
  if (row.years[0]?.status !== 'checked_in') score += 1
  return score
}

function scoreTone(score: number): BadgeProps['variant'] {
  if (score >= 4) return 'brand'
  if (score >= 3) return 'secondary'
  return 'outline'
}

/** Birthday people whose next birthday is `minDays`–`maxDays` away (0 = today). */
function birthdaysWithin(birthdays: any[] | undefined, minDays: number, maxDays: number) {
  return (birthdays ?? [])
    .filter((member) => {
      if (birthdayPartsFromDob(member.dob).month == null) return false
      const days = daysUntilNextBirthday(member.dob)
      return days >= minDays && days <= maxDays
    })
    .map((member) => ({
      id: member.id,
      name: member.user?.full_name || 'Unknown',
      dob: member.dob,
      phone: member.user?.phone,
      email: member.user?.email,
      role: member.user?.role,
      membership_id: member.user?.membership_id,
    }))
}

function TrendValue({ value, delta }: { value: number; delta: number }) {
  const Icon = delta > 0.5 ? ArrowUpRight : delta < -0.5 ? ArrowDownRight : null
  return (
    <span className="inline-flex items-center gap-1">
      {Icon ? <Icon className="h-3.5 w-3.5 text-neutral-400" aria-hidden /> : null}
      {value}
    </span>
  )
}

function DashboardContent() {
  const { user, loading: authLoading, can } = useAuth()
  const router = useRouter()
  const canSeeCamp = can('camp.view')
  const {
    order: cardOrder,
    hidden: hiddenCards,
    visible: visibleCards,
    toggle: toggleCard,
    move: moveCard,
    reset: resetCards,
  } = useDashboardLayout<DashboardCardId>('cg-dashboard-cards-v1', DEFAULT_CARD_ORDER)
  const available = DEFAULT_CARD_ORDER.filter((id) => canSeeCamp || !CAMP_CARDS.includes(id))
  const [campRows, setCampRows] = useState<CampCamperDirectoryRow[]>([])
  const [campLoading, setCampLoading] = useState(false)
  const [campError, setCampError] = useState<string | null>(null)

  const { data: allUsers, loading: usersLoading } = useAllUsers()
  const { data: upcomingEvents } = useUpcomingEvents()
  // Same cached query as the header's camp chip, so the active year is fetched once.
  const {
    registrations: activeYearRegistrations,
    campYear,
    loading: registrationsLoading,
  } = useCampRegistrations(undefined, { enabled: canSeeCamp })

  const loadCampDirectory = useCallback(async () => {
    setCampLoading(true)
    const { data, error } = await getCamperDirectory()
    setCampRows(data)
    setCampError(error)
    setCampLoading(false)
  }, [])

  const userId = user?.id
  useEffect(() => {
    if (!userId || !canSeeCamp) return
    void loadCampDirectory()
  }, [userId, canSeeCamp, loadCampDirectory])

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
          <PersonLabel name={row.original.full_name} detail={row.original.phone} className="min-w-[200px]" />
        ),
      },
      {
        accessorKey: 'email',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
        cell: ({ row }) => (
          <span className="text-sm text-neutral-600 dark:text-neutral-400">{row.original.email || '—'}</span>
        ),
      },
      {
        id: 'latest_year',
        accessorFn: (row) => row.years[0]?.year ?? 0,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Latest year" />,
        cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.years[0]?.year ?? '—'}</span>,
      },
      {
        id: 'latest_status',
        accessorFn: (row) => row.years[0]?.status ?? 'registered',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Latest status" />,
        cell: ({ row }) => (
          <Badge variant="secondary">{statusLabel(row.original.years[0]?.status ?? 'registered')}</Badge>
        ),
      },
      {
        accessorKey: 'registration_count',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Registrations" />,
        cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.registration_count}</span>,
      },
      {
        id: 'follow_up_score',
        accessorFn: followUpScore,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Priority" />,
        cell: ({ row }) => {
          const score = followUpScore(row.original)
          return (
            <Badge variant={scoreTone(score)} className="min-w-[2.75rem] justify-center">
              {score}/5
            </Badge>
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

  const myFollowUps = useMemo(
    () => (userId ? activeYearRegistrations.filter((item) => item.assigned_to === userId) : []),
    [activeYearRegistrations, userId]
  )
  const myPendingFollowUps = myFollowUps.filter((item) => item.follow_up_status !== 'completed').length
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
    const names = new Map((allUsers ?? []).map((u) => [u.id, u.full_name]))
    return Object.entries(counts)
      .map(([id, count]) => ({ id, count, name: names.get(id) ?? 'Unknown' }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
  }, [activeYearRegistrations, allUsers])

  const contactTrend = useMemo(() => {
    const now = Date.now()
    const trend = { new7: 0, returning7: 0, new30: 0, returning30: 0 }
    for (const reg of activeYearRegistrations) {
      const ageDays = (now - new Date(reg.created_at).getTime()) / DAY_MS
      if (!Number.isFinite(ageDays) || ageDays > 30) continue
      if (reg.is_new_registrant) trend.new30 += 1
      else trend.returning30 += 1
      if (ageDays <= 7) {
        if (reg.is_new_registrant) trend.new7 += 1
        else trend.returning7 += 1
      }
    }
    return trend
  }, [activeYearRegistrations])

  const totalAdmins = useMemo(
    () => (allUsers ?? []).filter((item) => item.role === 'admin').length,
    [allUsers]
  )
  const todayBirthdays = useMemo(() => birthdaysWithin(upcomingEvents?.birthdays, 0, 0), [upcomingEvents?.birthdays])
  const upcomingBirthdays = useMemo(() => birthdaysWithin(upcomingEvents?.birthdays, 1, 7), [upcomingEvents?.birthdays])

  // Render as soon as we know who the user is; each panel fills in as its data arrives.
  if (authLoading || !user) {
    return (
      <DashboardLayout>
        <LoadingPage title="Loading dashboard…" description="Getting your workspace ready." />
      </DashboardLayout>
    )
  }

  const greetingName = user.full_name?.split(' ')[0] || 'there'
  const yearId = campYear?.id
  const pending = (value: number) => (registrationsLoading ? '…' : value)

  const stickyNotes = STICKY_NOTES.filter((note) => can(note.permission)).slice(0, 5)

  const kpis: Array<{ label: string; value: ReactNode; sub: string; tone?: 'default' | 'warning' | 'success' }> = canSeeCamp
    ? [
        { label: 'Camp registrations', value: pending(activeYearRegistrations.length), sub: 'Active camp year' },
        { label: 'Camp contacts', value: campLoading ? '…' : campRows.length, sub: `${linkedContacts} linked to members` },
        {
          label: 'Overdue follow-ups',
          value: pending(followUpSla.overdue),
          sub: followUpSla.overdue > 0 ? 'Past their follow-up window' : 'Queue is healthy',
          tone: followUpSla.overdue > 0 ? 'warning' : 'success',
        },
        {
          label: 'My follow-ups',
          value: pending(myPendingFollowUps),
          sub: 'Pending, assigned to you',
          tone: myPendingFollowUps > 0 ? 'warning' : 'default',
        },
      ]
    : [
        { label: 'People', value: usersLoading ? '…' : (allUsers ?? []).length, sub: 'In the church directory' },
        { label: 'Administrators', value: usersLoading ? '…' : totalAdmins, sub: 'Accounts with admin access' },
        { label: 'Birthdays today', value: todayBirthdays.length, sub: 'Members celebrating today' },
        { label: 'Birthdays this week', value: upcomingBirthdays.length, sub: 'Next 7 days' },
      ]

  const unassignedCount = activeYearRegistrations.filter(
    (reg) => !reg.assigned_to && reg.follow_up_status !== 'completed'
  ).length
  const todoItems = [
    canSeeCamp && followUpSla.overdue > 0 && {
      id: 'overdue',
      icon: AlarmClock,
      text: `${plural(followUpSla.overdue, 'follow-up')} ${followUpSla.overdue === 1 ? 'is' : 'are'} overdue`,
      actionLabel: 'Open board',
      href: followUpBoardHref({ sla: 'overdue', yearId }),
      urgent: true,
    },
    canSeeCamp && myPendingFollowUps > 0 && {
      id: 'mine',
      icon: UserCheck,
      text: `${plural(myPendingFollowUps, 'follow-up')} assigned to you`,
      actionLabel: 'Review',
      href: followUpBoardHref({ mine: true, yearId }),
    },
    canSeeCamp && followUpSla.dueSoon > 0 && {
      id: 'due-soon',
      icon: CalendarClock,
      text: `${plural(followUpSla.dueSoon, 'follow-up')} due soon`,
      actionLabel: 'Plan',
      href: followUpBoardHref({ sla: 'due_soon', yearId }),
    },
    can('camp.manage') && unassignedCount > 0 && {
      id: 'unassigned',
      icon: Users,
      text: `${plural(unassignedCount, 'camp registrant')} ${unassignedCount === 1 ? 'has' : 'have'} no follow-up owner`,
      actionLabel: 'Assign',
      href: followUpBoardHref({ yearId }),
    },
    can('celebrations.view') && todayBirthdays.length > 0 && {
      id: 'birthdays',
      icon: Cake,
      text: `${plural(todayBirthdays.length, 'birthday')} today`,
      actionLabel: 'Send wishes',
      href: '/celebrations',
    },
  ].filter(Boolean) as TodoItem[]

  const cards: Record<DashboardCardId, ReactNode> = {
    sla: (
      <DashboardPanel title="Follow-up health" meta="Active camp year">
        <PanelList
          rows={[
            {
              key: 'overdue',
              label: 'Overdue',
              value: followUpSla.overdue,
              tone: followUpSla.overdue > 0 ? 'warning' : 'secondary',
              href: followUpBoardHref({ sla: 'overdue', yearId }),
            },
            {
              key: 'due-soon',
              label: 'Due soon',
              value: followUpSla.dueSoon,
              tone: 'secondary',
              href: followUpBoardHref({ sla: 'due_soon', yearId }),
            },
            {
              key: 'healthy',
              label: 'On track',
              value: followUpSla.healthy,
              tone: 'success',
              href: followUpBoardHref({ sla: 'healthy', yearId }),
            },
          ]}
        />
      </DashboardPanel>
    ),
    staff: (
      <DashboardPanel title="Staff load" meta="Pending by assignee">
        <PanelList
          empty="No pending assigned follow-ups yet."
          rows={assignmentBalance.map((item) => ({
            key: item.id,
            label: displayName(item.name),
            value: item.count,
            person: { name: item.name, seed: item.id },
          }))}
        />
      </DashboardPanel>
    ),
    mix: (
      <DashboardPanel title="Registration mix" meta="New vs returning">
        <PanelList
          rows={[
            {
              key: 'new7',
              label: 'New',
              detail: 'Last 7 days',
              value: <TrendValue value={contactTrend.new7} delta={contactTrend.new7 - contactTrend.new30 / 4} />,
            },
            {
              key: 'returning7',
              label: 'Returning',
              detail: 'Last 7 days',
              value: (
                <TrendValue
                  value={contactTrend.returning7}
                  delta={contactTrend.returning7 - contactTrend.returning30 / 4}
                />
              ),
            },
            { key: 'new30', label: 'New', detail: 'Last 30 days', value: contactTrend.new30 },
            { key: 'returning30', label: 'Returning', detail: 'Last 30 days', value: contactTrend.returning30 },
          ]}
        />
      </DashboardPanel>
    ),
    myfollow: (
      <DashboardPanel
        title="My follow-ups"
        meta={registrationsLoading ? 'Loading…' : `${myFollowUps.length} assigned · ${myPendingFollowUps} pending`}
      >
        <PanelList
          empty={registrationsLoading ? 'Loading…' : 'Nothing assigned to you in the active camp year.'}
          rows={myFollowUps.slice(0, 5).map((item) => ({
            key: item.id,
            label: displayName(item.full_name),
            detail: item.phone,
            person: { name: item.full_name },
            value: statusLabel(item.follow_up_status ?? 'pending'),
            tone: item.follow_up_status === 'completed' ? 'success' : 'secondary',
          }))}
        />
        <Button asChild variant="outline" size="sm" className="my-3 w-full">
          <Link href={followUpBoardHref({ mine: true, yearId })}>Open my follow-ups</Link>
        </Button>
      </DashboardPanel>
    ),
    shortcuts: (
      <DashboardPanel title="Shortcuts" meta="Common admin paths">
        <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {SHORTCUTS.filter((item) => canAccessPath(user.role, item.href, user.permissions)).map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="group -mx-2 flex min-h-11 items-center justify-between rounded-lg px-2 text-sm text-neutral-700 transition-colors hover:bg-neutral-50 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800/60 dark:hover:text-white"
              >
                {item.label}
                <ArrowRight
                  className="h-4 w-4 text-neutral-300 transition-transform group-hover:translate-x-0.5 group-hover:text-neutral-500 dark:text-neutral-600"
                  aria-hidden
                />
              </Link>
            </li>
          ))}
        </ul>
      </DashboardPanel>
    ),
    contacts: (
      <DashboardPanel
        title="Camp contacts"
        flush
        action={
          <Button variant="outline" size="sm" onClick={() => void loadCampDirectory()} disabled={campLoading}>
            {campLoading ? 'Refreshing…' : 'Refresh'}
          </Button>
        }
      >
        <p className="px-3 pb-1 pt-1 text-[13px] text-neutral-500 dark:text-neutral-400">
          {plural(followUpCandidates, 'multi-year contact')} {followUpCandidates === 1 ? 'needs' : 'need'} attention
        </p>
        {campError ? <p className="px-3 pb-2 text-sm text-red-600 dark:text-red-400">{campError}</p> : null}
        <DataTable
          columns={campColumns}
          data={campRows}
          searchKey="full_name"
          searchPlaceholder="Search contact name…"
          renderMobileRow={(row) => {
            const score = followUpScore(row)
            return (
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <PersonLabel
                    name={row.full_name}
                    detail={[row.phone, row.years[0]?.year].filter(Boolean).join(' · ')}
                  />
                  <div className="ml-12 mt-2 flex flex-wrap gap-1.5">
                    <Badge variant="secondary">{statusLabel(row.years[0]?.status ?? 'registered')}</Badge>
                    <Badge variant={scoreTone(score)}>Priority {score}/5</Badge>
                  </div>
                </div>
                <ContactRowActions
                  contactName={row.full_name}
                  phone={row.phone}
                  email={row.email}
                  userId={row.user_id}
                  userRole={row.user_role}
                  latestRegistrationId={row.years[0]?.registration_id}
                  showPromotions
                  onPromoted={() => void loadCampDirectory()}
                />
              </div>
            )
          }}
        />
      </DashboardPanel>
    ),
    birthdays: <BirthdayNotifications todayBirthdays={todayBirthdays} upcomingBirthdays={upcomingBirthdays} />,
    operations: <OfflineSync />,
  }

  const shown = visibleCards.filter((id) => available.includes(id))

  return (
    <DashboardLayout>
      <div className="dashboard-shell">
        <DashboardHero
          firstName={greetingName}
          notes={stickyNotes}
          actions={
            <CustomiseCardsButton
              options={DASHBOARD_CARDS.filter((card) => available.includes(card.id))}
              order={cardOrder}
              hidden={hiddenCards}
              onToggle={toggleCard}
              onMove={moveCard}
              onReset={resetCards}
            />
          }
        />

        <section aria-label="Key figures" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          {kpis.map((kpi) => (
            <StatCard key={kpi.label} label={kpi.label} value={kpi.value} sub={kpi.sub} tone={kpi.tone} />
          ))}
        </section>

        <TodoCard items={todoItems} loading={campLoading || registrationsLoading} />

        {shown.length > 0 && (
          <div className="grid gap-4 lg:grid-cols-2">
            {shown.map((id) => (
              <div key={id} className={cn('min-w-0 [&>*]:h-full', WIDE_CARDS.includes(id) && 'lg:col-span-2')}>
                {cards[id]}
              </div>
            ))}
          </div>
        )}
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
