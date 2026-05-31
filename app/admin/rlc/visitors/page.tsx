'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { loadRlcVisitorsAction } from '@/lib/actions/rlc'
import {
  RLC_PIPELINE_COLORS,
  RLC_PIPELINE_LABELS,
  RLC_FOLLOW_UP_LABELS,
  RLC_SOURCE_LABELS,
} from '@/lib/constants/rlc'
import type { RlcPipelineStatus, Visitor } from '@/lib/types'
import { RlcPageHeader } from '@/components/rlc/rlc-page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { LoadingSpinner } from '@/components/ui/loading'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Eye, Phone, UserPlus } from 'lucide-react'

export default function RlcVisitorsPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[400px] items-center justify-center">Loading…</div>}>
      <RlcVisitorsContent />
    </Suspense>
  )
}

function RlcVisitorsContent() {
  const searchParams = useSearchParams()
  const pipelineParam = searchParams.get('pipeline') as RlcPipelineStatus | null
  const [visitors, setVisitors] = useState<Visitor[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [pipelineFilter, setPipelineFilter] = useState<string>(pipelineParam ?? 'all')
  const [statusFilter, setStatusFilter] = useState<string>('active')

  useEffect(() => {
    loadRlcVisitorsAction().then(({ data }) => {
      setVisitors(data ?? [])
      setLoading(false)
    })
  }, [])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return visitors.filter((v) => {
      if (statusFilter === 'active' && (!v.is_active || v.converted_to_member)) return false
      if (statusFilter === 'converted' && !v.converted_to_member) return false
      if (pipelineFilter !== 'all' && (v.pipeline_status ?? 'first_visit') !== pipelineFilter) return false
      if (!needle) return true
      const hay = [v.first_name, v.last_name, v.phone, v.email].filter(Boolean).join(' ').toLowerCase()
      return hay.includes(needle)
    })
  }, [visitors, query, pipelineFilter, statusFilter])

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
        title="RLC Visitors"
        subtitle="Track every visitor from first visit through membership."
        actions={
          <Button asChild className="bg-rose-700 hover:bg-rose-800">
            <Link href="/admin/rlc/visitors/add">
              <UserPlus className="mr-2 h-4 w-4" />
              Register Visitor
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input placeholder="Search name, phone, email…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <Select value={pipelineFilter} onValueChange={setPipelineFilter}>
          <SelectTrigger className="sm:w-44">
            <SelectValue placeholder="Pipeline" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stages</SelectItem>
            {Object.entries(RLC_PIPELINE_LABELS).map(([k, label]) => (
              <SelectItem key={k} value={k}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active pipeline</SelectItem>
            <SelectItem value="converted">Converted</SelectItem>
            <SelectItem value="all">All records</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">No visitors match your filters.</CardContent>
          </Card>
        ) : (
          filtered.map((v) => {
            const pipeline = v.pipeline_status ?? 'first_visit'
            return (
              <Card key={v.id} className="border-rose-100/80">
                <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-900">
                        {v.first_name} {v.last_name}
                      </p>
                      <Badge className={RLC_PIPELINE_COLORS[pipeline]}>{RLC_PIPELINE_LABELS[pipeline]}</Badge>
                      {v.follow_up_status ? (
                        <Badge variant="outline">{RLC_FOLLOW_UP_LABELS[v.follow_up_status]}</Badge>
                      ) : null}
                      {v.source ? (
                        <Badge variant="secondary">{RLC_SOURCE_LABELS[v.source]}</Badge>
                      ) : null}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Visit {v.visit_date}
                      {v.service_attended ? ` · ${v.service_attended}` : ''}
                    </p>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {v.phone ? (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {v.phone}
                        </span>
                      ) : null}
                      {v.invited_by_members && v.invited_by_members.length > 0 ? (
                        <span>
                          Brought by:{' '}
                          {v.invited_by_members.map((m) => m.user?.full_name).filter(Boolean).join(', ')}
                        </span>
                      ) : null}
                      {v.assigned_follow_up?.user?.full_name ? (
                        <span>Follow-up: {v.assigned_follow_up.user.full_name}</span>
                      ) : null}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/admin/rlc/visitors/${v.id}`}>
                      <Eye className="mr-2 h-4 w-4" />
                      View
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
