'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  buildRlcPhoneIndex,
  campBridgeYearOptions,
  campContactsNotInRlc,
  filterCampBridgeRows,
} from '@/lib/rlc/camp-bridge'
import type { CampCamperDirectoryRow, Member, Visitor } from '@/lib/types'
import { FoldableCard } from '@/components/foldable-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { UserCheck } from 'lucide-react'

type RlcCampBridgePanelProps = {
  campRows: CampCamperDirectoryRow[]
  visitors: Visitor[]
  members: Member[]
}

export function RlcCampBridgePanel({ campRows, visitors, members }: RlcCampBridgePanelProps) {
  const [query, setQuery] = useState('')
  const [campYear, setCampYear] = useState('all')

  const rlcPhones = useMemo(() => buildRlcPhoneIndex(visitors, members), [visitors, members])

  const missingRows = useMemo(
    () => campContactsNotInRlc(campRows, rlcPhones),
    [campRows, rlcPhones]
  )

  const yearOptions = useMemo(() => campBridgeYearOptions(missingRows), [missingRows])

  const filteredRows = useMemo(
    () => filterCampBridgeRows(missingRows, { query, campYear }),
    [missingRows, query, campYear]
  )

  return (
    <FoldableCard
      className="border-rose-100/80"
      title="Camp contacts not yet in RLC"
      description="Camp registrants who are not visitors or members at Redemption Light yet"
      icon={<UserCheck className="h-5 w-5 text-rose-700" />}
      badge={
        <Badge variant={missingRows.length > 0 ? 'secondary' : 'outline'}>
          {missingRows.length} not in RLC
        </Badge>
      }
      defaultExpanded={false}
    >
      {missingRows.length === 0 ? (
        <p className="text-sm text-muted-foreground">All camp contacts are already in RLC.</p>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="rlc-camp-bridge-search">Search</Label>
              <Input
                id="rlc-camp-bridge-search"
                placeholder="Name, phone, or email…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Camp year</Label>
              <Select value={campYear} onValueChange={setCampYear}>
                <SelectTrigger>
                  <SelectValue placeholder="All camp years" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All camp years</SelectItem>
                  {yearOptions.map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      Camp {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Showing {filteredRows.length} of {missingRows.length} contacts
          </p>

          {filteredRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No contacts match your filters.</p>
          ) : (
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {filteredRows.map((row) => {
                const latestYear = row.years[0]
                return (
                  <div
                    key={row.phone_key}
                    className="flex items-center justify-between gap-3 rounded-lg border border-rose-100/80 bg-white px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{row.full_name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {row.phone}
                        {row.email ? ` · ${row.email}` : ''}
                      </p>
                      {latestYear ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Camp {latestYear.year}
                          {row.registration_count > 1 ? ` · ${row.registration_count} registrations` : ''}
                        </p>
                      ) : null}
                    </div>
                    <Button size="sm" variant="outline" className="shrink-0" asChild>
                      <Link
                        href={`/admin/rlc/import?q=${encodeURIComponent(row.phone || row.full_name)}`}
                      >
                        Import
                      </Link>
                    </Button>
                  </div>
                )
              })}
            </div>
          )}

          <Button variant="ghost" size="sm" className="px-0 text-rose-700" asChild>
            <Link href="/admin/rlc/import?tab=camp-bulk">Bulk import from camp</Link>
          </Button>
          <Button variant="ghost" size="sm" className="px-0 text-rose-700" asChild>
            <Link href="/admin/rlc/import">Open full import search</Link>
          </Button>
        </div>
      )}
    </FoldableCard>
  )
}
