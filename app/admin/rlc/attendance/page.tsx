'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/components/providers'
import {
  loadRlcAttendanceAction,
  loadRlcCustomServicesAction,
  createRlcCustomServiceAction,
  loadRlcMembersAction,
  loadRlcVisitorsAction,
  recordRlcAttendanceAction,
} from '@/lib/actions/rlc'
import { RLC_NAME } from '@/lib/constants/rlc'
import {
  attendanceRosterToCsv,
  buildAttendanceRoster,
  downloadAttendanceCsv,
  filterAttendancePeople,
  memberToAttendancePerson,
  sessionCheckedKeys,
  visitorToAttendancePerson,
  type RlcAttendancePerson,
} from '@/lib/rlc/attendance-roster'
import {
  defaultRlcServiceSelection,
  printQueryFromSelection,
  recordArgsFromSelection,
  rlcServiceSelectionLabel,
  type RlcServiceSelection,
} from '@/lib/rlc/service-selection'
import type { Attendance, Member, RlcCustomService, Visitor } from '@/lib/types'
import { PageContainer } from '@/components/layout/page-container'
import { RlcPageHeader } from '@/components/rlc/rlc-page-header'
import { RlcServiceSelect } from '@/components/rlc/rlc-service-select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoadingSpinner } from '@/components/ui/loading'
import { useToast } from '@/hooks/use-toast'
import { CheckCircle, Download, Printer, QrCode, Search, UserCheck } from 'lucide-react'

export default function RlcAttendancePage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0])
  const [serviceSelection, setServiceSelection] = useState<RlcServiceSelection>(defaultRlcServiceSelection())
  const [customServices, setCustomServices] = useState<RlcCustomService[]>([])
  const [creatingCustom, setCreatingCustom] = useState(false)
  const [query, setQuery] = useState('')
  const [attendance, setAttendance] = useState<Attendance[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [visitors, setVisitors] = useState<Visitor[]>([])
  const [loading, setLoading] = useState(true)
  const [recordingKey, setRecordingKey] = useState<string | null>(null)

  const reload = useCallback(async () => {
    const [a, m, v, custom] = await Promise.all([
      loadRlcAttendanceAction({ serviceDate }),
      loadRlcMembersAction(),
      loadRlcVisitorsAction(),
      loadRlcCustomServicesAction(),
    ])
    setAttendance(a.data ?? [])
    setMembers(m.data ?? [])
    setVisitors((v.data ?? []).filter((x) => x.is_active !== false && !x.converted_to_member))
    setCustomServices(custom.data ?? [])
    setLoading(false)
  }, [serviceDate])

  useEffect(() => {
    void reload()
  }, [reload])

  const checkedKeys = useMemo(
    () => sessionCheckedKeys(attendance, serviceSelection),
    [attendance, serviceSelection]
  )

  const people = useMemo(() => {
    const list: RlcAttendancePerson[] = [
      ...members.map(memberToAttendancePerson),
      ...visitors.map(visitorToAttendancePerson),
    ]
    return list.sort((a, b) => a.name.localeCompare(b.name))
  }, [members, visitors])

  const searchHits = useMemo(
    () => filterAttendancePeople(people, query, checkedKeys),
    [people, query, checkedKeys]
  )

  const roster = useMemo(
    () => buildAttendanceRoster(attendance, members, visitors, serviceSelection),
    [attendance, members, visitors, serviceSelection]
  )

  const serviceLabel = useMemo(() => rlcServiceSelectionLabel(serviceSelection), [serviceSelection])

  const printHref = useMemo(() => {
    const params = printQueryFromSelection(serviceSelection)
    params.set('date', serviceDate)
    return `/admin/rlc/attendance/print?${params.toString()}`
  }, [serviceDate, serviceSelection])

  async function handleCreateCustom(name: string) {
    if (!user?.id) {
      toast({ variant: 'destructive', title: 'Sign in required' })
      return null
    }
    setCreatingCustom(true)
    const { data, error } = await createRlcCustomServiceAction({ name, createdBy: user.id })
    setCreatingCustom(false)
    if (error || !data) {
      toast({ variant: 'destructive', title: 'Could not save service', description: error ?? 'Try again' })
      return null
    }
    setCustomServices((prev) => {
      const next = prev.filter((row) => row.id !== data.id)
      return [data, ...next]
    })
    toast({ title: 'Other service saved', description: data.name })
    return data
  }

  async function checkIn(person: RlcAttendancePerson) {
    if (!user?.id) {
      toast({ variant: 'destructive', title: 'Sign in required' })
      return
    }
    setRecordingKey(person.key)
    const recordArgs = recordArgsFromSelection(serviceSelection)
    const { data, error } = await recordRlcAttendanceAction({
      memberId: person.memberId,
      visitorId: person.visitorId,
      serviceDate,
      ...recordArgs,
      method: 'admin',
      createdBy: user.id,
    })
    setRecordingKey(null)
    if (error || !data) {
      toast({ variant: 'destructive', title: 'Check-in failed', description: error ?? 'Try again' })
      return
    }
    toast({
      title: data.already_checked_in ? 'Already checked in' : 'Checked in',
      description: `${person.name} · ${serviceLabel}`,
    })
    setQuery('')
    await reload()
  }

  function handleDownloadCsv() {
    const csv = attendanceRosterToCsv(roster, {
      serviceDate,
      serviceLabel,
      churchName: RLC_NAME,
    })
    const stamp = `${serviceDate}-${serviceSelection.kind === 'custom' ? serviceSelection.customServiceId : serviceSelection.serviceType}`
    downloadAttendanceCsv(`rlc-attendance-${stamp}.csv`, csv)
    toast({ title: 'CSV downloaded', description: `${roster.length} people for ${serviceLabel}` })
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <PageContainer className="space-y-6">
      <RlcPageHeader
        title="RLC Attendance"
        subtitle="Search by name, phone, membership ID, or check-in code. QR scan is optional."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href={printHref} target="_blank">
                <Printer className="mr-2 h-4 w-4" />
                Print
              </Link>
            </Button>
            <Button variant="outline" onClick={handleDownloadCsv} disabled={roster.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Download CSV
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin/rlc/scan">
                <QrCode className="mr-2 h-4 w-4" />
                Optional QR scan
              </Link>
            </Button>
          </>
        }
      />

      <Card className="border-rose-100/80">
        <CardHeader>
          <CardTitle>Service</CardTitle>
          <CardDescription>Attendance is tracked separately for each service on a date.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="space-y-2 sm:max-w-xs">
            <Label htmlFor="service-date">Service date</Label>
            <Input
              id="service-date"
              type="date"
              value={serviceDate}
              onChange={(e) => setServiceDate(e.target.value)}
            />
          </div>
          <RlcServiceSelect
            selection={serviceSelection}
            onChange={setServiceSelection}
            customServices={customServices}
            onCreateCustom={handleCreateCustom}
            creatingCustom={creatingCustom}
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-rose-700" />
              Manual check-in
            </CardTitle>
            <CardDescription>
              Type a name, phone number, RLC code, or membership ID. {checkedKeys.size} already in this service.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              autoFocus
              placeholder="Search name, phone, RLC-26-XXXX, membership ID…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchHits[0]) {
                  e.preventDefault()
                  void checkIn(searchHits[0])
                }
              }}
            />
            {searchHits.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {query.trim()
                  ? 'No matching members or visitors left to check in.'
                  : 'Start typing to find someone, or browse suggestions below.'}
              </p>
            ) : (
              searchHits.map((person) => (
                <div
                  key={person.key}
                  className="flex items-center justify-between gap-3 rounded-lg border bg-white px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{person.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {person.kind === 'member' ? 'Member' : 'Visitor'}
                      {person.phone ? ` · ${person.phone}` : ''}
                      {person.code ? ` · ${person.code}` : ''}
                      {person.membershipId ? ` · ${person.membershipId}` : ''}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="shrink-0 bg-rose-700 hover:bg-rose-800"
                    disabled={recordingKey === person.key}
                    onClick={() => void checkIn(person)}
                  >
                    {recordingKey === person.key ? '…' : 'Check in'}
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-rose-700" />
                {serviceLabel}
              </CardTitle>
              <CardDescription>
                {serviceDate} · {roster.length} checked in
              </CardDescription>
            </div>
            <Badge variant="secondary">{roster.length}</Badge>
          </CardHeader>
          <CardContent className="max-h-[28rem] space-y-2 overflow-y-auto">
            {roster.length === 0 ? (
              <p className="text-sm text-muted-foreground">No check-ins for this service yet.</p>
            ) : (
              roster.map((row) => (
                <div key={row.attendance.id} className="rounded-lg border px-3 py-2 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium">{row.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {row.kind === 'member' ? 'Member' : row.kind === 'visitor' ? 'Visitor' : 'Unknown'}
                        {row.phone ? ` · ${row.phone}` : ''}
                        {row.code ? ` · ${row.code}` : ''}
                      </p>
                    </div>
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {row.attendance.check_in_time
                      ? new Date(row.attendance.check_in_time).toLocaleTimeString()
                      : '—'}
                    {row.attendance.method ? ` · ${row.attendance.method}` : ''}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}
