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
import { PageContainer } from '@/components/layout/page-container'
import { RlcPageHeader } from '@/components/rlc/rlc-page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/loading'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { AlertCircle, Eye } from 'lucide-react'
import { PhoneLink, QuickContactButtons } from '@/components/contact/phone-link'

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
      if (assignedFilter !== 'all') {
        const matchesAssignee =
          v.assigned_follow_up_member_id === assignedFilter ||
          v.assigned_follow_up?.user_id === assignedFilter ||
          v.assigned_follow_up?.id === assignedFilter
        if (!matchesAssignee) return false
      }
      if (slaFilter !== 'all') {
        const bucket = classifyRlcFollowUpSla(v)
        if (bucket !== slaFilter) return false
      }
      return true
    })
  }, [visitors, statusFilter, slaFilter, assignedFilter])

  function slaVariant(bucket: RlcFollowUpSlaBucket) {
    if (bucket === 'overdue') return 'danger' as const
    if (bucket === 'due_soon') return 'warning' as const
    if (bucket === 'healthy') return 'success' as const
    return 'secondary' as const
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <PageContainer>
      <RlcPageHeader
        title="RLC Follow-up Board"
        subtitle="Assign members, track SLA, and move visitors toward membership."
      />

      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
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
          <SelectTrigger className="w-full sm:w-40">
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
          <SelectTrigger className="col-span-2 w-full sm:w-52">
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

      <p className="app-meta">
        {filtered.length} visitor{filtered.length === 1 ? '' : 's'}
      </p>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No visitors match these filters.
            </CardContent>
          </Card>
        ) : null}
        {filtered.map((v) => {
          const sla = classifyRlcFollowUpSla(v)
          const pipeline = v.pipeline_status ?? 'first_visit'
          const name = [v.first_name, v.last_name].filter(Boolean).join(' ')
          return (
            <Card key={v.id} className={cn(sla === 'overdue' && 'border-red-200 dark:border-red-400/30')}>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/admin/rlc/visitors/${v.id}`}
                      className="min-w-0 break-words font-semibold text-neutral-900 hover:text-brand-700 dark:text-neutral-100 dark:hover:text-brand-300"
                    >
                      {name}
                    </Link>
                    <QuickContactButtons phone={v.phone} name={name} className="-mt-1 sm:hidden" />
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant={slaVariant(sla)}>
                      {sla === 'overdue' ? <AlertCircle className="h-3 w-3" aria-hidden /> : null}
                      {sla.replace('_', ' ')}
                    </Badge>
                    <Badge className={RLC_PIPELINE_COLORS[pipeline]}>{RLC_PIPELINE_LABELS[pipeline]}</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 text-sm text-neutral-600 dark:text-neutral-400">
                    <PhoneLink phone={v.phone} name={name} />
                    <span>· Visit {v.visit_date}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Follow-up: {v.assigned_follow_up?.user?.full_name ?? 'Unassigned'} ·{' '}
                    {RLC_FOLLOW_UP_LABELS[v.follow_up_status ?? 'pending']}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <QuickContactButtons phone={v.phone} name={name} className="hidden sm:inline-flex" />
                  <Button variant="outline" size="sm" className="h-10 flex-1 sm:h-8 sm:flex-none" asChild>
                    <Link href={`/admin/rlc/visitors/${v.id}`}>
                      <Eye className="mr-2 h-4 w-4" />
                      Open
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </PageContainer>
  )
}

export default function RlcFollowUpPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <FollowUpContent />
    </Suspense>
  )
}
