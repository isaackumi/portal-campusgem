'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers'
import { getCamperDirectory } from '@/lib/actions/camp'
import { loadRlcMembersAction, loadRlcStatsAction, loadRlcVisitorsAction } from '@/lib/actions/rlc'
import { rlcFollowUpHref, summarizeRlcFollowUpSla } from '@/lib/rlc/follow-up-sla'
import { RlcCampBridgePanel } from '@/components/rlc/rlc-camp-bridge-panel'
import { RLC_NAME, RLC_ROLE_LABELS, RLC_ROLES } from '@/lib/constants/rlc'
import type { CampCamperDirectoryRow, Member, RlcStats, Visitor } from '@/lib/types'
import { PageContainer } from '@/components/layout/page-container'
import { RlcPageHeader } from '@/components/rlc/rlc-page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading'
import {
  BarChart3,
  Calendar,
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

function StatCard({
  title,
  value,
  hint,
  href,
}: {
  title: string
  value: number | string
  hint?: string
  href?: string
}) {
  const inner = (
    <Card className="border-rose-100/80 shadow-sm transition hover:border-rose-200">
      <CardHeader className="pb-2">
        <CardDescription className="app-stat-label normal-case tracking-normal text-slate-500">
          {title}
        </CardDescription>
        <p className="app-stat-value">{value}</p>
      </CardHeader>
      {hint ? (
        <CardContent className="pt-0">
          <p className="app-meta">{hint}</p>
        </CardContent>
      ) : null}
    </Card>
  )
  return href ? <Link href={href}>{inner}</Link> : inner
}

export default function RlcDashboardPage() {
  const router = useRouter()
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
    () => activeVisitors.filter((row) => row.assigned_follow_up_member_id === user?.id),
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
    <PageContainer className="space-y-8">
      <RlcPageHeader
        title="Mother Church Hub"
        subtitle={`Visitor pipeline, membership, attendance, and ministry records for ${RLC_NAME}.`}
        actions={
          <>
            <Button variant="outline" className="w-full sm:w-auto" asChild>
              <Link href="/admin/rlc/attendance">
                <Calendar className="mr-2 h-4 w-4" />
                Attendance
              </Link>
            </Button>
            <Button variant="outline" className="w-full sm:w-auto" asChild>
              <Link href="/admin/rlc/visitors/add">
                <UserPlus className="mr-2 h-4 w-4" />
                Register visitor
              </Link>
            </Button>
            <Button className="w-full bg-rose-700 hover:bg-rose-800 sm:w-auto" asChild>
              <Link href="/admin/rlc/import">
                <Upload className="mr-2 h-4 w-4" />
                Import
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Active visitors" value={stats?.active_visitors ?? 0} href="/admin/rlc/visitors" />
        <StatCard
          title="Pending follow-up"
          value={stats?.pending_follow_up ?? 0}
          href={rlcFollowUpHref({ status: 'pending' })}
        />
        <StatCard title="RLC members" value={stats?.rlc_members ?? 0} href="/admin/rlc/members" />
        <StatCard
          title="Conversion rate"
          value={`${stats?.conversion_rate ?? 0}%`}
          hint={`${stats?.converted_visitors ?? 0} converted`}
          href="/admin/rlc/analytics"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-rose-200">
          <CardHeader className="pb-2">
            <CardDescription>Follow-up SLA</CardDescription>
            <CardTitle>Queue health</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between text-sm">
            <Link href={rlcFollowUpHref({ sla: 'overdue' })} className="text-rose-700">
              Overdue <Badge variant="destructive">{sla.overdue}</Badge>
            </Link>
            <Link href={rlcFollowUpHref({ sla: 'due_soon' })} className="text-amber-700">
              Due soon <Badge variant="secondary">{sla.dueSoon}</Badge>
            </Link>
            <Link href={rlcFollowUpHref({ mine: true })} className="text-slate-700">
              Mine <Badge variant="outline">{myFollowUps.length}</Badge>
            </Link>
          </CardContent>
        </Card>
        <Card className="border-emerald-200">
          <CardHeader className="pb-2">
            <CardDescription>Ready to convert</CardDescription>
            <p className="app-stat-value">{convertQueue.length}</p>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/rlc/visitors?pipeline=new_member">Open conversion queue</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardDescription>Today / this week</CardDescription>
            <p className="app-stat-value">
              {stats?.today_attendance ?? 0}
              <span className="text-base font-normal text-muted-foreground">
                {' '}
                / {stats?.week_attendance ?? 0}
              </span>
            </p>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/rlc/attendance">Attendance + print</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-rose-100/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-rose-700" />
              Visitor pipeline
            </CardTitle>
            <CardDescription>From first visit to full membership</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ['First visit', stats?.pipeline_counts.first_visit ?? 0],
              ['Follow-up', stats?.pipeline_counts.follow_up ?? 0],
              ['New member', stats?.pipeline_counts.new_member ?? 0],
              ['Full member', stats?.pipeline_counts.full_member ?? 0],
            ].map(([label, count]) => (
              <div key={label} className="rounded-lg bg-rose-50/60 px-3 py-2 text-center">
                <p className="app-stat-value text-2xl">{count}</p>
                <p className="app-meta">{label}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <RlcCampBridgePanel campRows={campRows} visitors={visitors} members={members} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
        ].map((item) => (
          <Card
            key={item.href}
            className="cursor-pointer border-rose-100/80 transition hover:border-rose-300 hover:shadow-md"
            onClick={() => router.push(item.href)}
          >
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-100 text-rose-800">
                <item.icon className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>{item.title}</CardTitle>
                <CardDescription>{item.desc}</CardDescription>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      {rosterCounts.length > 0 ? (
        <Card className="border-rose-100/80">
          <CardHeader>
            <CardTitle>Ministry snapshot</CardTitle>
            <CardDescription>People currently tagged with RLC ministry roles</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {rosterCounts.map((row) => (
              <Badge key={row.role} variant="secondary">
                {RLC_ROLE_LABELS[row.role]} · {row.count}
              </Badge>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </PageContainer>
  )
}
