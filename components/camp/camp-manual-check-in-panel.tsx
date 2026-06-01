'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { CampRegistration } from '@/lib/types'
import { campService } from '@/lib/services/camp-service'
import { resolveCampCheckInCode } from '@/lib/camp/check-in-code'
import {
  campRegistrationDisplayName,
  searchCampRegistrationsForManualCheckIn,
} from '@/lib/camp/manual-check-in-search'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading'
import { useToast } from '@/hooks/use-toast'
import { CheckCircle2, Search, UserCheck, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

type CampManualCheckInPanelProps = {
  campYearId: string
  registrations: CampRegistration[]
  performedByUserId?: string
  onCheckInComplete?: () => void
  className?: string
}

export function CampManualCheckInPanel({
  campYearId,
  registrations,
  performedByUserId,
  onCheckInComplete,
  className,
}: CampManualCheckInPanelProps) {
  const { toast } = useToast()
  const [query, setQuery] = useState('')
  const [checkingId, setCheckingId] = useState<string | null>(null)
  const [bulkChecking, setBulkChecking] = useState(false)

  const { results, mode } = useMemo(
    () => searchCampRegistrationsForManualCheckIn(registrations, query),
    [registrations, query]
  )

  const pendingResults = results.filter((r) => r.status !== 'checked_in')

  async function checkInOne(reg: CampRegistration) {
    if (reg.status === 'checked_in') {
      toast({
        title: 'Already checked in',
        description: `${campRegistrationDisplayName(reg)} is already in.`,
      })
      return
    }

    setCheckingId(reg.id)
    try {
      const { error } = await campService.updateRegistration(reg.id, {
        status: 'checked_in',
        updated_at: new Date().toISOString(),
      })
      if (error) throw new Error(error)

      if (performedByUserId) {
        await campService.addInteraction({
          registration_id: reg.id,
          performed_by: performedByUserId,
          interaction_type: 'status_change',
          notes: 'Checked in via manual check-in',
        })
      }

      toast({
        title: 'Checked in',
        description: campRegistrationDisplayName(reg),
      })
      onCheckInComplete?.()
    } catch (err: unknown) {
      toast({
        variant: 'destructive',
        title: 'Check-in failed',
        description: err instanceof Error ? err.message : 'Please try again.',
      })
    } finally {
      setCheckingId(null)
    }
  }

  async function checkInAllPending() {
    if (pendingResults.length === 0) return
    setBulkChecking(true)
    let ok = 0
    for (const reg of pendingResults) {
      try {
        const { error } = await campService.updateRegistration(reg.id, {
          status: 'checked_in',
          updated_at: new Date().toISOString(),
        })
        if (error) throw new Error(error)
        if (performedByUserId) {
          await campService.addInteraction({
            registration_id: reg.id,
            performed_by: performedByUserId,
            interaction_type: 'status_change',
            notes: 'Checked in via manual check-in (group)',
          })
        }
        ok++
      } catch {
        // continue with rest
      }
    }
    setBulkChecking(false)
    toast({
      title: ok === pendingResults.length ? 'Group check-in complete' : 'Partial check-in',
      description: `${ok} of ${pendingResults.length} checked in.`,
      variant: ok === pendingResults.length ? 'default' : 'destructive',
    })
    onCheckInComplete?.()
  }

  return (
    <Card className={cn('border-2', className)}>
      <CardHeader className="border-b bg-gray-50">
        <CardTitle className="flex items-center gap-2 text-lg">
          <UserCheck className="h-5 w-5" />
          Manual check-in
        </CardTitle>
        <CardDescription>
          Check in by camp code (e.g. GEM-26-K7M3), name, phone, guardian phone, or QR.
          Each registrant has their own code — one guardian number may list several people.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Camp code (GEM-26-XXXX), name, or phone…"
            className="min-h-11 pl-9 text-base"
            inputMode="search"
            autoComplete="off"
          />
        </div>

        {query.trim().length >= 2 ? (
          <>
            {mode === 'code' && results.length === 1 ? (
              <p className="rounded-lg border border-indigo-200 bg-indigo-50/80 px-3 py-2 text-sm text-indigo-900">
                Matched camp code{' '}
                <span className="font-mono font-semibold">{resolveCampCheckInCode(results[0]!)}</span>
              </p>
            ) : null}

            {mode === 'phone' && results.length > 1 ? (
              <div className="flex flex-col gap-2 rounded-lg border border-blue-200 bg-blue-50/80 p-3 text-sm text-blue-900 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-2">
                  <Users className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    <strong>{results.length} people</strong> share this contact number — check in
                    each person who arrived.
                  </span>
                </div>
                {pendingResults.length > 1 ? (
                  <Button
                    size="sm"
                    className="min-h-9 shrink-0"
                    disabled={bulkChecking}
                    onClick={() => void checkInAllPending()}
                  >
                    {bulkChecking ? (
                      <LoadingSpinner className="mr-2 h-4 w-4" />
                    ) : (
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                    )}
                    Check in all ({pendingResults.length})
                  </Button>
                ) : null}
              </div>
            ) : null}

            {results.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No registrations match. Try guardian phone or the camper&apos;s name.
              </p>
            ) : (
              <ul className="max-h-[min(420px,50vh)] space-y-2 overflow-y-auto">
                {results.map((reg) => {
                  const name = campRegistrationDisplayName(reg)
                  const checkedIn = reg.status === 'checked_in'
                  const guardian =
                    reg.parent_contact?.trim() &&
                    reg.parent_contact.trim() !== 'N/A' &&
                    reg.parent_contact !== reg.phone
                      ? reg.parent_contact
                      : null
                  const campCode = resolveCampCheckInCode(reg)

                  return (
                    <li
                      key={reg.id}
                      className={cn(
                        'flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between',
                        checkedIn ? 'border-green-200 bg-green-50/50' : 'border-gray-200 bg-white'
                      )}
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-gray-900">{name}</p>
                          <Badge variant="outline" className="text-xs">
                            {reg.role}
                          </Badge>
                          {checkedIn ? (
                            <Badge className="text-xs">Checked in</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              Not yet in
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                          {campCode ? (
                            <span className="font-mono font-semibold text-indigo-800">
                              Code: {campCode}
                            </span>
                          ) : null}
                          {reg.phone?.trim() ? <span>Camper phone: {reg.phone}</span> : null}
                          {guardian ? <span>Guardian phone: {guardian}</span> : null}
                          {reg.parent_name?.trim() && reg.parent_name !== 'N/A' ? (
                            <span>Guardian name: {reg.parent_name}</span>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Button variant="outline" size="sm" className="min-h-9" asChild>
                          <Link href={`/admin/camp-meeting/registrations/${reg.id}?year=${campYearId}`}>
                            View
                          </Link>
                        </Button>
                        <Button
                          size="sm"
                          className="min-h-9 min-w-[7rem]"
                          disabled={checkedIn || checkingId === reg.id || bulkChecking}
                          onClick={() => void checkInOne(reg)}
                        >
                          {checkingId === reg.id ? (
                            <LoadingSpinner className="h-4 w-4" />
                          ) : checkedIn ? (
                            'Done'
                          ) : (
                            'Check in'
                          )}
                        </Button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </>
        ) : (
          <p className="text-center text-sm text-muted-foreground py-4">
            Type at least 2 characters to search.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
