'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/components/providers'
import { getCamperDirectory } from '@/lib/actions/camp'
import { loadRlcMembersAction, loadRlcStatsAction, loadRlcVisitorsAction } from '@/lib/actions/rlc'
import { rlcFollowUpHref, summarizeRlcFollowUpSla } from '@/lib/rlc/follow-up-sla'
import { RlcCampBridgePanel } from '@/components/rlc/rlc-camp-bridge-panel'
import { RLC_NAME, RLC_ROLE_LABELS, RLC_ROLES } from '@/lib/constants/rlc'
import type { CampCamperDirectoryRow, Member, RlcStats, Visitor } from '@/lib/types'
import { PageContainer } from '@/components/layout/page-container'
import { RlcPageHeader } from '@/components/rlc/rlc-page-header'
import { StatCard } from '@/components/ui/stat-card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading'
import {
  BarChart3,
  Calendar,
  ChevronRight,
  Cake,
  Church,
  Printer,
  QrCode,
  TrendingUp,
  Upload,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react'

export default function RlcDashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<RlcStats | null>(null)
  const [visitors, setVisitors] = useState<Visitor[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [campRows, setCampRows] = useState<CampCamperDirectoryRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      loadRlcStatsAction(),
      loadRlcVisitorsAction(),
      loadRlcMembersAction(),
      getCamperDirectory(),
    ]).then(([s, v, m, c]) => {
      setStats(s.data ?? null)
      setVisitors(v.data ?? [])
      setMembers(m.data ?? [])
      setCampRows(c.data ?? [])
      setLoading(false)
    })
  }, [])

  const activeVisitors = useMemo(
    () => visitors.filter((row) => row.is_active !== false && !row.converted_to_member),
    [visitors]
  )
  const sla = useMemo(() => summarizeRlcFollowUpSla(activeVisitors), [activeVisitors])
  const myFollowUps = useMemo(
    () =>
      activeVisitors.filter(
        (row) =>
          row.assigned_follow_up_member_id === user?.id ||
          row.assigned_follow_up?.user_id === user?.id
      ),
    [activeVisitors, user?.id]
  )
  const convertQueue = useMemo(
    () =>
      activeVisitors.filter(
        (row) =>
          row.follow_up_status === 'completed' ||
          row.interested_in_membership ||
          row.pipeline_status === 'new_member'
      ),
    [activeVisitors]
  )
  const rosterCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const member of members) {
      for (const role of member.rlc_roles ?? []) {
        counts[role] = (counts[role] ?? 0) + 1
      }
    }
    return RLC_ROLES.filter((role) => (counts[role] ?? 0) > 0).slice(0, 8).map((role) => ({
      role,
      count: counts[role],
    }))
  }, [members])

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <PageContainer className="space-y-6 sm:space-y-8">
      <RlcPageHeader
        title="Mother church"
        subtitle={`Visitor pipeline, membership, attendance, and ministry records for ${RLC_NAME}.`}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/admin/rlc/attendance">
                <Calendar className="mr-2 h-4 w-4" />
                Attendance
              </Link>
            </Button>
            <Button asChild>
              <Link href="/admin/rlc/visitors/add">
                <UserPlus className="mr-2 h-4 w-4" />
                <span className="sm:hidden">Visitor</span>
                <span className="hidden sm:inline">Register visitor</span>
              </Link>
            </Button>
          </>
        }
      />

      <div data-tour="rlc-stats" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard className="p-4 sm:p-5" label="Active visitors" value={stats?.active_visitors ?? 0} href="/admin/rlc/visitors" />
        <StatCard
          className="p-4 sm:p-5"
          label="Pending follow-up"
          value={stats?.pending_follow_up ?? 0}
          tone={(stats?.pending_follow_up ?? 0) > 0 ? 'warning' : 'default'}
          href={rlcFollowUpHref({ status: 'pending' })}
        />
        <StatCard className="p-4 sm:p-5" label="RLC members" value={stats?.rlc_members ?? 0} href="/admin/rlc/members" />
        <StatCard
          className="p-4 sm:p-5"
          label="Conversion rate"
          value={`${stats?.conversion_rate ?? 0}%`}
          sub={`${stats?.converted_visitors ?? 0} converted`}
          href="/admin/rlc/analytics"
        />
      </div>

      <div data-tour="rlc-queues" className="grid gap-3 sm:gap-4 md:grid-cols-3">
        <section className="dashboard-panel p-4 sm:p-5">
          <p className="app-stat-label">Follow-up SLA</p>
          <h2 className="app-section-title">Queue health</h2>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              { href: rlcFollowUpHref({ sla: 'overdue' }), label: 'Overdue', count: sla.overdue, variant: 'danger' as const },
              { href: rlcFollowUpHref({ sla: 'due_soon' }), label: 'Due soon', count: sla.dueSoon, variant: 'warning' as const },
              { href: rlcFollowUpHref({ mine: true }), label: 'Mine', count: myFollowUps.length, variant: 'secondary' as const },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex min-h-11 flex-col items-start justify-center gap-1 rounded-lg px-2 py-1.5 text-sm text-neutral-700 transition-colors hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-white/[0.06]"
              >
                <span className="text-[13px]">{item.label}</span>
                <Badge variant={item.variant}>{item.count}</Badge>
              </Link>
            ))}
          </div>
        </section>
        <section className="dashboard-panel flex flex-col gap-3 p-4 sm:p-5">
          <div>
            <p className="app-stat-label">Ready to convert</p>
            <p className="app-stat-value">{convertQueue.length}</p>
          </div>
          <Button variant="outline" className="h-11 w-full sm:h-9 sm:w-auto sm:self-start" asChild>
            <Link href="/admin/rlc/visitors?pipeline=new_member">Open conversion queue</Link>
          </Button>
        </section>
        <section className="dashboard-panel flex flex-col gap-3 p-4 sm:p-5">
          <div>
            <p className="app-stat-label">Today / this week</p>
            <p className="app-stat-value">
              {stats?.today_attendance ?? 0}
              <span className="text-base font-normal text-neutral-500 dark:text-neutral-400"> / {stats?.week_attendance ?? 0}</span>
            </p>
          </div>
          <Button variant="outline" className="h-11 w-full sm:h-9 sm:w-auto sm:self-start" asChild>
            <Link href="/admin/rlc/attendance">Attendance + print</Link>
          </Button>
        </section>
      </div>

      <div data-tour="rlc-pipeline" className="grid gap-3 sm:gap-4 lg:grid-cols-2">
        <section className="dashboard-panel p-4 sm:p-5">
          <h2 className="app-section-title flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-neutral-400 dark:text-neutral-500" aria-hidden />
            Visitor pipeline
          </h2>
          <p className="app-meta">From first visit to full membership</p>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            {[
              ['First visit', stats?.pipeline_counts.first_visit ?? 0],
              ['Follow-up', stats?.pipeline_counts.follow_up ?? 0],
              ['New member', stats?.pipeline_counts.new_member ?? 0],
              ['Full member', stats?.pipeline_counts.full_member ?? 0],
            ].map(([label, count]) => (
              <div key={label} className="rounded-lg bg-neutral-50 px-3 py-2 text-center dark:bg-white/[0.04]">
                <p className="app-stat-value text-2xl">{count}</p>
                <p className="app-meta">{label}</p>
              </div>
            ))}
          </div>
        </section>

        <RlcCampBridgePanel campRows={campRows} visitors={visitors} members={members} />
      </div>

      <div data-tour="rlc-shortcuts" className="grid gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">
        {[
          { href: '/admin/rlc/visitors', icon: UserPlus, title: 'Visitors', desc: 'Full visitor records' },
          { href: '/admin/rlc/follow-up', icon: UserCheck, title: 'Follow-up', desc: 'Assign & track contacts' },
          { href: '/admin/rlc/members', icon: Users, title: 'Members', desc: 'Church member records' },
          { href: '/admin/rlc/roster', icon: Church, title: 'Ministry roster', desc: 'Ushers, choir, protocol' },
          { href: '/admin/rlc/attendance', icon: Calendar, title: 'Attendance', desc: 'Name / phone check-in + print' },
          { href: '/admin/rlc/birthdays', icon: Cake, title: 'Birthdays', desc: 'Upcoming member & visitor birthdays' },
          { href: '/admin/rlc/scan', icon: QrCode, title: 'Optional QR scan', desc: 'Camera only when needed' },
          { href: '/admin/rlc/visitors/print', icon: Printer, title: 'Welcome slips', desc: 'Print visitor QR cards' },
          { href: '/admin/rlc/analytics', icon: BarChart3, title: 'Analytics', desc: 'Conversion & sources' },
          { href: '/admin/rlc/import', icon: Upload, title: 'Import', desc: 'Bring in visitors from a sheet' },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="dashboard-panel flex min-h-[60px] items-center gap-3 p-3 transition-[box-shadow,border-color] hover:border-neutral-300 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 dark:hover:border-white/[0.12] sm:p-4"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-neutral-500 dark:text-neutral-400">
              <item.icon className="h-5 w-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="app-section-title block truncate">{item.title}</span>
              <span className="app-meta block truncate">{item.desc}</span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-neutral-400 dark:text-neutral-500" aria-hidden />
          </Link>
        ))}
      </div>

      {rosterCounts.length > 0 ? (
        <section className="dashboard-panel p-4 sm:p-5">
          <h2 className="app-section-title">Ministry snapshot</h2>
          <p className="app-meta">People currently tagged with RLC ministry roles</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {rosterCounts.map((row) => (
              <Badge key={row.role} variant="secondary">
                {RLC_ROLE_LABELS[row.role]} · {row.count}
              </Badge>
            ))}
          </div>
        </section>
      ) : null}
    </PageContainer>
  )
}
