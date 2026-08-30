'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/components/providers'
import { bulkConvertRlcVisitorsToMembersAction, loadRlcVisitorsAction } from '@/lib/actions/rlc'
import {
  RLC_MEMBERSHIP_TYPE_LABELS,
  RLC_PIPELINE_COLORS,
  RLC_PIPELINE_LABELS,
  RLC_FOLLOW_UP_LABELS,
  RLC_SOURCE_LABELS,
} from '@/lib/constants/rlc'
import type { RlcMembershipType, RlcPipelineStatus, Visitor } from '@/lib/types'
import { PageContainer } from '@/components/layout/page-container'
import { RlcPageHeader } from '@/components/rlc/rlc-page-header'
import { RlcVisitorRowActions } from '@/components/rlc/rlc-visitor-row-actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoadingSpinner } from '@/components/ui/loading'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Download, UserPlus, Users } from 'lucide-react'
import { ContactActions } from '@/components/contact/contact-actions'
import { RlcPublicVisitShare } from '@/components/rlc/rlc-public-visit-share'
import { useToast } from '@/hooks/use-toast'

export default function RlcVisitorsPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[400px] items-center justify-center">Loading…</div>}>
      <RlcVisitorsContent />
    </Suspense>
  )
}

function RlcVisitorsContent() {
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { toast } = useToast()
  const pipelineParam = searchParams.get('pipeline') as RlcPipelineStatus | null
  const [visitors, setVisitors] = useState<Visitor[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [pipelineFilter, setPipelineFilter] = useState<string>(pipelineParam ?? 'all')
  const [statusFilter, setStatusFilter] = useState<string>('active')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [membershipType, setMembershipType] = useState<RlcMembershipType>('full_member')
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    const includeInactive = statusFilter === 'archived' || statusFilter === 'all'
    loadRlcVisitorsAction({ include_inactive: includeInactive }).then(({ data }) => {
      setVisitors(data ?? [])
      setLoading(false)
      setSelectedIds(new Set())
    })
  }, [statusFilter])

  const reload = () => {
    const includeInactive = statusFilter === 'archived' || statusFilter === 'all'
    loadRlcVisitorsAction({ include_inactive: includeInactive }).then(({ data }) => {
      setVisitors(data ?? [])
    })
  }

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return visitors.filter((v) => {
      if (statusFilter === 'active' && (v.is_active === false || v.converted_to_member)) return false
      if (statusFilter === 'converted' && !v.converted_to_member) return false
      if (statusFilter === 'archived' && v.is_active !== false) return false
      if (pipelineFilter !== 'all' && (v.pipeline_status ?? 'first_visit') !== pipelineFilter) return false
      if (!needle) return true
      const hay = [v.first_name, v.last_name, v.phone, v.email, v.check_in_code]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(needle)
    })
  }, [visitors, query, pipelineFilter, statusFilter])

  const importableFiltered = useMemo(
    () => filtered.filter((v) => !v.converted_to_member),
    [filtered]
  )
  const allVisibleSelected =
    importableFiltered.length > 0 && importableFiltered.every((v) => selectedIds.has(v.id))

  function toggleRow(id: string, checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function toggleAllVisible(checked: boolean) {
    if (!checked) {
      setSelectedIds(new Set())
      return
    }
    setSelectedIds(new Set(importableFiltered.map((v) => v.id)))
  }

  async function runBulkImport() {
    if (!user?.id || selectedIds.size === 0) return
    if (
      !confirm(
        `Import ${selectedIds.size} visitor${selectedIds.size === 1 ? '' : 's'} as ${RLC_MEMBERSHIP_TYPE_LABELS[membershipType].toLowerCase()}s?`
      )
    ) {
      return
    }
    setImporting(true)
    const { data, error } = await bulkConvertRlcVisitorsToMembersAction({
      visitorIds: Array.from(selectedIds),
      performedBy: user.id,
      rlcMembershipType: membershipType,
    })
    setImporting(false)
    if (error || !data) {
      toast({ variant: 'destructive', title: 'Bulk import failed', description: error })
      return
    }
    toast({
      title: 'Bulk import complete',
      description: `${data.imported} imported · ${data.skipped} skipped · ${data.failed.length} failed`,
    })
    setSelectedIds(new Set())
    reload()
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
        title="RLC Visitors"
        subtitle="Track every visitor from first visit through membership."
        actions={
          <>
            <Button variant="outline" className="w-full sm:w-auto" asChild>
              <Link href="/admin/rlc/members#import-visitors">
                <Users className="mr-2 h-4 w-4" />
                Import as members
              </Link>
            </Button>
            <Button variant="outline" className="w-full sm:w-auto" asChild>
              <Link href="/admin/rlc/visitors/print">Print slips</Link>
            </Button>
            <Button variant="outline" className="w-full sm:w-auto" asChild>
              <Link href="/admin/rlc/visitors/qr">QR code</Link>
            </Button>
            <Button asChild className="w-full bg-rose-700 hover:bg-rose-800 sm:w-auto">
              <Link href="/admin/rlc/visitors/add">
                <UserPlus className="mr-2 h-4 w-4" />
                Register Visitor
              </Link>
            </Button>
          </>
        }
      />

      <RlcPublicVisitShare className="mb-6" />

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Input placeholder="Search name, phone, email, or check-in code…" value={query} onChange={(e) => setQuery(e.target.value)} />
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
            <SelectItem value="archived">Archived</SelectItem>
            <SelectItem value="all">All records</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {importableFiltered.length > 0 ? (
        <Card className="border-rose-100/80">
          <CardContent className="flex flex-col gap-3 py-4 lg:flex-row lg:items-center lg:justify-between">
            <label className="flex items-center gap-3 text-sm">
              <Checkbox
                checked={allVisibleSelected}
                onCheckedChange={(checked) => toggleAllVisible(checked === true)}
              />
              <span className="font-medium">Select all visible ({importableFiltered.length})</span>
            </label>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="space-y-1.5">
                <Label className="text-xs">Import as</Label>
                <Select
                  value={membershipType}
                  onValueChange={(v) => setMembershipType(v as RlcMembershipType)}
                >
                  <SelectTrigger className="sm:w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(RLC_MEMBERSHIP_TYPE_LABELS) as RlcMembershipType[]).map((key) => (
                      <SelectItem key={key} value={key}>
                        {RLC_MEMBERSHIP_TYPE_LABELS[key]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="bg-rose-700 hover:bg-rose-800"
                disabled={importing || selectedIds.size === 0}
                onClick={() => void runBulkImport()}
              >
                {importing ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Importing…
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Import {selectedIds.size} as members
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

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
                  <div className="flex min-w-0 items-start gap-3">
                    {!v.converted_to_member ? (
                      <Checkbox
                        className="mt-1"
                        checked={selectedIds.has(v.id)}
                        onCheckedChange={(value) => toggleRow(v.id, value === true)}
                      />
                    ) : null}
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
                      {v.check_in_code ? ` · ${v.check_in_code}` : ''}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <ContactActions phone={v.phone} email={v.email} compact size="sm" />
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
                  </div>
                  <RlcVisitorRowActions visitor={v} onDeleted={reload} />
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </PageContainer>
  )
}
