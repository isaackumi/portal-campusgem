'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/components/providers'
import { loadRlcVisitorsAction } from '@/lib/actions/rlc'
import { dataService } from '@/lib/services/data-service'
import {
  RLC_FOLLOW_UP_LABELS,
  RLC_PIPELINE_COLORS,
  RLC_PIPELINE_LABELS,
} from '@/lib/constants/rlc'
import { classifyRlcFollowUpSla, type RlcFollowUpSlaBucket } from '@/lib/rlc/follow-up-sla'
import type { AppUser, Visitor } from '@/lib/types'
import { RlcPageHeader } from '@/components/rlc/rlc-page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/loading'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { AlertCircle, Eye } from 'lucide-react'

const SLA_FILTERS = ['all', 'overdue', 'due_soon', 'healthy'] as const

function FollowUpContent() {
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const mineOnly = searchParams.get('mine') === '1'
  const [visitors, setVisitors] = useState<Visitor[]>([])
  const [members, setMembers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [slaFilter, setSlaFilter] = useState<string>('all')
  const [assignedFilter, setAssignedFilter] = useState<string>('all')

  useEffect(() => {
    if (mineOnly && user?.id) setAssignedFilter(user.id)
  }, [mineOnly, user?.id])

  useEffect(() => {
    Promise.all([loadRlcVisitorsAction(), dataService.getAllUsers()]).then(([vRes, uRes]) => {
      setVisitors((vRes.data ?? []).filter((v) => v.is_active && !v.converted_to_member))
      setMembers(uRes.data ?? [])
      setLoading(false)
    })
  }, [])

  const filtered = useMemo(() => {
    return visitors.filter((v) => {
      if (statusFilter !== 'all' && (v.follow_up_status ?? 'pending') !== statusFilter) return false
      if (assignedFilter !== 'all' && v.assigned_follow_up_member_id !== assignedFilter) return false
      if (slaFilter !== 'all') {
        const bucket = classifyRlcFollowUpSla(v)
        if (bucket !== slaFilter) return false
      }
      return true
    })
  }, [visitors, statusFilter, slaFilter, assignedFilter])

  function slaBadge(bucket: RlcFollowUpSlaBucket) {
    if (bucket === 'overdue') return 'bg-red-100 text-red-800'
    if (bucket === 'due_soon') return 'bg-amber-100 text-amber-800'
    if (bucket === 'healthy') return 'bg-emerald-100 text-emerald-800'
    return 'bg-slate-100 text-slate-600'
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <RlcPageHeader
        title="RLC Follow-up Board"
        subtitle="Assign members, track SLA, and move visitors toward membership."
      />

      <div className="flex flex-wrap gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.entries(RLC_FOLLOW_UP_LABELS).map(([k, label]) => (
              <SelectItem key={k} value={k}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={slaFilter} onValueChange={setSlaFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="SLA" />
          </SelectTrigger>
          <SelectContent>
            {SLA_FILTERS.map((s) => (
              <SelectItem key={s} value={s}>
                {s === 'all' ? 'All SLA' : s.replace('_', ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={assignedFilter} onValueChange={setAssignedFilter}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Assignee" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All assignees</SelectItem>
            {members.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {filtered.map((v) => {
          const sla = classifyRlcFollowUpSla(v)
          const pipeline = v.pipeline_status ?? 'first_visit'
          return (
            <Card key={v.id} className={cn('border-rose-100/80', sla === 'overdue' && 'border-red-200')}>
              <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">
                      {v.first_name} {v.last_name}
                    </span>
                    <Badge className={RLC_PIPELINE_COLORS[pipeline]}>{RLC_PIPELINE_LABELS[pipeline]}</Badge>
                    <Badge className={slaBadge(sla)}>{sla.replace('_', ' ')}</Badge>
                    {sla === 'overdue' ? <AlertCircle className="h-4 w-4 text-red-600" /> : null}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {v.phone ?? 'No phone'} · Visit {v.visit_date}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Follow-up: {v.assigned_follow_up?.user?.full_name ?? 'Unassigned'} ·{' '}
                    {RLC_FOLLOW_UP_LABELS[v.follow_up_status ?? 'pending']}
                  </p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/admin/rlc/visitors/${v.id}`}>
                    <Eye className="mr-2 h-4 w-4" />
                    Open
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

export default function RlcFollowUpPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <FollowUpContent />
    </Suspense>
  )
}
