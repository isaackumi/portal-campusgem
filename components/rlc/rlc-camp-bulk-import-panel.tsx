'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/components/providers'
import { getAllCampYears, getCampRegistrations } from '@/lib/actions/camp'
import {
  bulkImportCampToRlcAction,
  loadRlcMembersAction,
  loadRlcVisitorsAction,
} from '@/lib/actions/rlc'
import {
  buildCampBulkImportCandidates,
  filterCampBulkImportCandidates,
  type CampBulkImportCandidate,
} from '@/lib/rlc/camp-bulk-import'
import type { CampYear } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoadingSpinner } from '@/components/ui/loading'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Download, Search, Upload } from 'lucide-react'

export function RlcCampBulkImportPanel() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [campYears, setCampYears] = useState<CampYear[]>([])
  const [campYearId, setCampYearId] = useState('')
  const [candidates, setCandidates] = useState<CampBulkImportCandidate[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [onlyAvailable, setOnlyAvailable] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [importMode, setImportMode] = useState<'visitor' | 'member'>('visitor')
  const [importing, setImporting] = useState(false)

  const loadYears = useCallback(async () => {
    const { data, error } = await getAllCampYears()
    if (error) {
      toast({ variant: 'destructive', title: 'Could not load camp years', description: error })
      return
    }
    const years = data ?? []
    setCampYears(years)
    const active = years.find((year) => year.is_active) ?? years[0]
    if (active) setCampYearId(active.id)
  }, [toast])

  const loadCandidates = useCallback(async () => {
    if (!campYearId) {
      setCandidates([])
      setLoading(false)
      return
    }
    setLoading(true)
    const [regsResult, visitorsResult, membersResult] = await Promise.all([
      getCampRegistrations(campYearId),
      loadRlcVisitorsAction(),
      loadRlcMembersAction(),
    ])
    setLoading(false)

    if (regsResult.error) {
      toast({ variant: 'destructive', title: 'Could not load registrations', description: regsResult.error })
      setCandidates([])
      return
    }

    const rows = buildCampBulkImportCandidates(
      regsResult.data ?? [],
      visitorsResult.data ?? [],
      membersResult.data ?? []
    )
    setCandidates(rows)
    setSelectedIds(new Set())
  }, [campYearId, toast])

  useEffect(() => {
    void loadYears()
  }, [loadYears])

  useEffect(() => {
    void loadCandidates()
  }, [loadCandidates])

  const visibleRows = useMemo(
    () => filterCampBulkImportCandidates(candidates, { query, onlyAvailable }),
    [candidates, query, onlyAvailable]
  )

  const stats = useMemo(() => {
    const available = candidates.filter((row) => row.status === 'available').length
    const inRlc = candidates.length - available
    return { total: candidates.length, available, inRlc }
  }, [candidates])

  const allVisibleSelected =
    visibleRows.length > 0 && visibleRows.every((row) => selectedIds.has(row.registration.id))

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
    setSelectedIds(new Set(visibleRows.map((row) => row.registration.id)))
  }

  async function runBulkImport() {
    if (!user?.id || selectedIds.size === 0) return
    setImporting(true)
    const { data, error } = await bulkImportCampToRlcAction({
      campRegistrationIds: Array.from(selectedIds),
      performedBy: user.id,
      linkAsMember: importMode === 'member',
      rlcMembershipType: 'full_member',
    })
    setImporting(false)

    if (error || !data) {
      toast({ variant: 'destructive', title: 'Bulk import failed', description: error ?? 'Try again' })
      return
    }

    toast({
      title: 'Bulk import complete',
      description: `${data.imported} imported · ${data.skipped} skipped · ${data.failed.length} failed`,
    })

    if (data.failed.length > 0) {
      console.warn('RLC bulk import failures', data.failed)
    }

    await loadCandidates()
  }

  const selectedCampYear = campYears.find((year) => year.id === campYearId)

  return (
    <div className="space-y-6">
      <Card className="border-rose-100/80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-rose-700" />
            Bulk import from Camp Meeting
          </CardTitle>
          <CardDescription>
            Import many camp registrants into RLC at once. Pick a camp year, select people not yet in
            RLC, then import as visitors (follow-up pipeline) or direct members.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label>Camp year</Label>
            <Select value={campYearId} onValueChange={setCampYearId}>
              <SelectTrigger>
                <SelectValue placeholder="Select camp year" />
              </SelectTrigger>
              <SelectContent>
                {campYears.map((year) => (
                  <SelectItem key={year.id} value={year.id}>
                    Camp {year.year}
                    {year.is_active ? ' (active)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Card>
            <CardContent className="pt-6">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Registrations</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-2xl font-bold text-emerald-700">{stats.available}</p>
              <p className="text-sm text-muted-foreground">Ready to import</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-2xl font-bold text-slate-600">{stats.inRlc}</p>
              <p className="text-sm text-muted-foreground">Already in RLC</p>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3 flex-1">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search name, phone, role…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={onlyAvailable} onCheckedChange={(v) => setOnlyAvailable(v === true)} />
              Show only contacts not yet in RLC
            </label>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-2">
              <Label>Import as</Label>
              <Select value={importMode} onValueChange={(v) => setImportMode(v as 'visitor' | 'member')}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="visitor">Visitors (follow-up pipeline)</SelectItem>
                  <SelectItem value="member">Direct RLC members</SelectItem>
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
                  Import {selectedIds.size} selected
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {selectedCampYear ? (
            <p className="mb-4 text-xs text-muted-foreground">
              Camp Meeting {selectedCampYear.year} · {selectedCampYear.theme}
            </p>
          ) : null}

          {loading ? (
            <div className="flex min-h-[240px] items-center justify-center">
              <LoadingSpinner />
            </div>
          ) : visibleRows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {onlyAvailable
                ? 'Everyone from this camp year is already in RLC, or no registrations match your search.'
                : 'No registrations match your search.'}
            </p>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-3 rounded-lg border bg-slate-50 px-3 py-2 text-sm">
                <Checkbox
                  checked={allVisibleSelected}
                  onCheckedChange={(checked) => toggleAllVisible(checked === true)}
                />
                <span className="font-medium">
                  Select all visible ({visibleRows.length})
                </span>
              </div>

              <div className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
                {visibleRows.map((row) => {
                  const reg = row.registration
                  const checked = selectedIds.has(reg.id)
                  return (
                    <div
                      key={reg.id}
                      className="flex items-start gap-3 rounded-lg border px-3 py-2 text-sm"
                    >
                      <Checkbox
                        className="mt-1"
                        checked={checked}
                        disabled={row.status !== 'available'}
                        onCheckedChange={(value) => toggleRow(reg.id, value === true)}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{reg.full_name}</p>
                          {row.status === 'available' ? (
                            <Badge variant="outline">Not in RLC</Badge>
                          ) : row.status === 'rlc_member' ? (
                            <Badge variant="secondary">RLC member</Badge>
                          ) : (
                            <Badge variant="secondary">RLC visitor</Badge>
                          )}
                          {reg.is_new_registrant ? (
                            <Badge variant="outline">First timer</Badge>
                          ) : (
                            <Badge variant="outline">Returning</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {[reg.phone, reg.email, reg.role].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                      {row.status !== 'available' && row.linked_id ? (
                        <Button size="sm" variant="ghost" asChild>
                          <Link
                            href={
                              row.status === 'rlc_member'
                                ? `/admin/rlc/members/${row.linked_id}/edit`
                                : `/admin/rlc/visitors/${row.linked_id}`
                            }
                          >
                            View
                          </Link>
                        </Button>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
