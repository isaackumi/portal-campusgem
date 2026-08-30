'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/components/providers'
import { bulkConvertRlcVisitorsToMembersAction, loadRlcVisitorsAction } from '@/lib/actions/rlc'
import { RLC_MEMBERSHIP_TYPE_LABELS, RLC_PIPELINE_LABELS } from '@/lib/constants/rlc'
import type { RlcMembershipType, Visitor } from '@/lib/types'
import { ConvertVisitorToMemberDialog } from '@/components/rlc/convert-visitor-to-member-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoadingSpinner } from '@/components/ui/loading'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Download, Users } from 'lucide-react'

type Props = {
  onImported?: () => void
}

export function ImportVisitorToMemberPanel({ onImported }: Props) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [visitors, setVisitors] = useState<Visitor[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [membershipType, setMembershipType] = useState<RlcMembershipType>('full_member')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selected, setSelected] = useState<Visitor | null>(null)

  function reload() {
    loadRlcVisitorsAction({ include_inactive: false }).then(({ data }) => {
      setVisitors((data ?? []).filter((v) => !v.converted_to_member && v.is_active !== false))
      setLoading(false)
      setSelectedIds(new Set())
    })
  }

  useEffect(() => {
    reload()
  }, [])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return visitors
    return visitors.filter((v) => {
      const hay = [v.first_name, v.last_name, v.phone, v.email, v.check_in_code]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(needle)
    })
  }, [visitors, query])

  const allVisibleSelected =
    filtered.length > 0 && filtered.every((v) => selectedIds.has(v.id))

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
    setSelectedIds(new Set(filtered.map((v) => v.id)))
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
    if (data.failed.length > 0) {
      console.warn('Visitor bulk import failures', data.failed)
    }
    reload()
    onImported?.()
  }

  return (
    <>
      <Card id="import-visitors" className="border-rose-100/80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Users className="h-5 w-5 text-rose-700" />
            Bulk import from visitors
          </CardTitle>
          <CardDescription>
            Select one or many RLC visitors and add them as members without re-entering their
            details.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <Input
              placeholder="Search visitors by name, phone, or check-in code…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="space-y-1.5">
                <Label className="text-xs">Membership type</Label>
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
                type="button"
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
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading visitors…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {query.trim()
                ? 'No matching visitors who are not already members.'
                : 'No active visitors to import.'}
            </p>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-3 rounded-lg border bg-slate-50 px-3 py-2 text-sm">
                <Checkbox
                  checked={allVisibleSelected}
                  onCheckedChange={(checked) => toggleAllVisible(checked === true)}
                />
                <span className="font-medium">Select all visible ({filtered.length})</span>
              </div>
              <ul className="max-h-80 divide-y overflow-y-auto rounded-md border bg-white">
                {filtered.map((v) => (
                  <li key={v.id} className="flex items-start gap-3 px-3 py-3">
                    <Checkbox
                      className="mt-1"
                      checked={selectedIds.has(v.id)}
                      onCheckedChange={(value) => toggleRow(v.id, value === true)}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">
                          {v.first_name} {v.last_name}
                        </p>
                        <Badge variant="outline">
                          {RLC_PIPELINE_LABELS[v.pipeline_status ?? 'first_visit']}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground sm:text-sm">
                        {[v.phone, v.visit_date ? `Visit ${v.visit_date}` : null]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                      onClick={() => {
                        setSelected(v)
                        setDialogOpen(true)
                      }}
                    >
                      Add one
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <ConvertVisitorToMemberDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setSelected(null)
        }}
        visitor={selected}
        onSuccess={() => {
          setSelected(null)
          reload()
          onImported?.()
        }}
      />
    </>
  )
}
