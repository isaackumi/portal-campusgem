'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { loadRlcStatsAction } from '@/lib/actions/rlc'
import { rlcFollowUpHref } from '@/lib/rlc/follow-up-sla'
import { RLC_NAME } from '@/lib/constants/rlc'
import type { RlcStats } from '@/lib/types'
import { PageContainer } from '@/components/layout/page-container'
import { RlcPageHeader } from '@/components/rlc/rlc-page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading'
import {
  BarChart3,
  Calendar,
  Church,
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
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-3xl tabular-nums">{value}</CardTitle>
      </CardHeader>
      {hint ? (
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground">{hint}</p>
        </CardContent>
      ) : null}
    </Card>
  )
  return href ? <Link href={href}>{inner}</Link> : inner
}

export default function RlcDashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<RlcStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRlcStatsAction().then(({ data }) => {
      setStats(data ?? null)
      setLoading(false)
    })
  }, [])

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
        subtitle={`Visitor pipeline, membership, attendance, and analytics for ${RLC_NAME}.`}
        actions={
          <>
            <Button variant="outline" className="w-full sm:w-auto" asChild>
              <Link href="/admin/rlc/visitors/qr">Visitor QR</Link>
            </Button>
            <Button variant="outline" className="w-full sm:w-auto" asChild>
              <Link href="/admin/rlc/visitors/add">
                <UserPlus className="mr-2 h-4 w-4" />
                Register Visitor
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

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-rose-100/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
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
                <p className="text-2xl font-semibold tabular-nums">{count}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-rose-100/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5 text-rose-700" />
              RLC attendance
            </CardTitle>
            <CardDescription>Sunday and midweek services</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-slate-50 px-3 py-2">
              <p className="text-2xl font-semibold">{stats?.today_attendance ?? 0}</p>
              <p className="text-xs text-muted-foreground">Today</p>
            </div>
            <div className="rounded-lg bg-slate-50 px-3 py-2">
              <p className="text-2xl font-semibold">{stats?.week_attendance ?? 0}</p>
              <p className="text-xs text-muted-foreground">This week</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { href: '/admin/rlc/visitors', icon: UserPlus, title: 'Visitors', desc: 'Pipeline & registration' },
          { href: '/admin/rlc/follow-up', icon: UserCheck, title: 'Follow-up board', desc: 'Assign & track contacts' },
          { href: '/admin/rlc/members', icon: Users, title: 'Members', desc: 'Full & associate members' },
          { href: '/admin/rlc/import', icon: Upload, title: 'Import', desc: 'Campus Gem & camp directory' },
          { href: '/admin/rlc/analytics', icon: BarChart3, title: 'Analytics', desc: 'Conversion & sources' },
          { href: '/admin/rlc/attendance', icon: Calendar, title: 'Attendance', desc: 'Check-in & records' },
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
                <CardTitle className="text-base">{item.title}</CardTitle>
                <CardDescription>{item.desc}</CardDescription>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card className="border-dashed border-rose-200 bg-rose-50/30">
        <CardContent className="flex items-center gap-4 py-6">
          <Church className="h-8 w-8 text-rose-700" />
          <div>
            <p className="font-medium text-slate-900">Production-ready visitor lifecycle</p>
            <p className="text-sm text-muted-foreground">
              Track sponsors, follow-up assignees, complete member profiles on conversion, and tie attendance to RLC.
            </p>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  )
}
