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
  updateRlcAttendanceAction,
} from '@/lib/actions/rlc'
import { RLC_NAME } from '@/lib/constants/rlc'
import {
  attendanceRosterToCsv,
  buildAttendanceRoster,
  downloadAttendanceCsv,
  filterAttendancePeople,
  memberToAttendancePerson,
  sessionCheckedKeys,
  splitAttendanceRoster,
  visitorToAttendancePerson,
  type RlcAttendancePerson,
  type RlcAttendanceRosterRow,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoadingSpinner } from '@/components/ui/loading'
import { Tabs, TabsContent, ScrollableTabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { CheckCircle, Download, Pencil, Printer, QrCode, Search, UserCheck, UserX } from 'lucide-react'

function RosterRow({
  row,
  variant,
  onEditNote,
  editingNoteId,
}: {
  row: RlcAttendanceRosterRow
  variant: 'present' | 'absent'
  onEditNote?: (row: RlcAttendanceRosterRow) => void
  editingNoteId?: string | null
}) {
  return (
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
        {variant === 'present' ? (
          <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
        ) : (
          <UserX className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
        )}
      </div>
      {variant === 'present' ? (
        <p className="mt-1 text-xs text-muted-foreground">
          {row.attendance.check_in_time
            ? new Date(row.attendance.check_in_time).toLocaleTimeString()
            : '—'}
          {row.attendance.method ? ` · ${row.attendance.method}` : ''}
        </p>
      ) : null}
      {row.attendance.notes ? (
        <p className="mt-2 rounded-md bg-amber-50 px-2 py-1.5 text-xs text-amber-950">
          {row.attendance.notes}
        </p>
      ) : variant === 'absent' ? (
        <p className="mt-2 text-xs italic text-muted-foreground">No note recorded</p>
      ) : null}
      {variant === 'absent' && onEditNote ? (
        <Button
          size="sm"
          variant="ghost"
          className="mt-2 h-8 px-2 text-xs text-rose-700"
          disabled={editingNoteId === row.attendance.id}
          onClick={() => onEditNote(row)}
        >
          <Pencil className="mr-1 h-3 w-3" />
          Edit note
        </Button>
      ) : null}
    </div>
  )
}

export default function RlcAttendancePage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0])
  const [serviceSelection, setServiceSelection] = useState<RlcServiceSelection>(defaultRlcServiceSelection())
  const [customServices, setCustomServices] = useState<RlcCustomService[]>([])
  const [creatingCustom, setCreatingCustom] = useState(false)
  const [query, setQuery] = useState('')
  const [absentQuery, setAbsentQuery] = useState('')
  const [attendance, setAttendance] = useState<Attendance[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [visitors, setVisitors] = useState<Visitor[]>([])
  const [loading, setLoading] = useState(true)
  const [recordingKey, setRecordingKey] = useState<string | null>(null)
  const [absentTarget, setAbsentTarget] = useState<RlcAttendancePerson | null>(null)
  const [absentNote, setAbsentNote] = useState('')
  const [editRow, setEditRow] = useState<RlcAttendanceRosterRow | null>(null)
  const [editNote, setEditNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)

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

  const absentSearchHits = useMemo(
    () => filterAttendancePeople(people, absentQuery, checkedKeys),
    [people, absentQuery, checkedKeys]
  )

  const roster = useMemo(
    () => buildAttendanceRoster(attendance, members, visitors, serviceSelection),
    [attendance, members, visitors, serviceSelection]
  )

  const { present, absentNoted } = useMemo(() => splitAttendanceRoster(roster), [roster])

  const implicitAbsentCount = Math.max(people.length - present.length - absentNoted.length, 0)

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
      status: 'present',
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

  async function confirmMarkAbsent() {
    if (!user?.id || !absentTarget) return
    setRecordingKey(absentTarget.key)
    const recordArgs = recordArgsFromSelection(serviceSelection)
    const { data, error } = await recordRlcAttendanceAction({
      memberId: absentTarget.memberId,
      visitorId: absentTarget.visitorId,
      serviceDate,
      ...recordArgs,
      method: 'admin',
      createdBy: user.id,
      status: 'absent',
      notes: absentNote.trim() || undefined,
    })
    setRecordingKey(null)
    if (error || !data) {
      toast({ variant: 'destructive', title: 'Could not mark absent', description: error ?? 'Try again' })
      return
    }
    toast({
      title: 'Marked absent',
      description: absentNote.trim()
        ? `${absentTarget.name} · note saved`
        : `${absentTarget.name} · no note added`,
    })
    setAbsentTarget(null)
    setAbsentNote('')
    setAbsentQuery('')
    await reload()
  }

  async function saveEditedNote() {
    if (!editRow) return
    setSavingNote(true)
    const { error } = await updateRlcAttendanceAction({
      attendanceId: editRow.attendance.id,
      notes: editNote.trim() || undefined,
      status: 'absent',
    })
    setSavingNote(false)
    if (error) {
      toast({ variant: 'destructive', title: 'Could not save note', description: error })
      return
    }
    toast({ title: 'Note updated', description: editRow.name })
    setEditRow(null)
    setEditNote('')
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
    toast({ title: 'CSV downloaded', description: `${roster.length} records for ${serviceLabel}` })
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
        subtitle="Check in present members and visitors, or mark someone absent with an optional note. Anyone not checked in is implicitly absent."
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

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-emerald-700">{present.length}</p>
            <p className="text-sm text-muted-foreground">Present (checked in)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-amber-700">{absentNoted.length}</p>
            <p className="text-sm text-muted-foreground">Absent with note</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-slate-600">{implicitAbsentCount}</p>
            <p className="text-sm text-muted-foreground">Implicitly absent (no record)</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="check-in" className="space-y-4">
        <ScrollableTabsList>
          <TabsTrigger value="check-in">
            <UserCheck className="mr-2 h-4 w-4 shrink-0" />
            Check in
          </TabsTrigger>
          <TabsTrigger value="absent">
            <UserX className="mr-2 h-4 w-4 shrink-0" />
            Mark absent with note
          </TabsTrigger>
        </ScrollableTabsList>

        <TabsContent value="check-in">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5 text-rose-700" />
                  Manual check-in
                </CardTitle>
                <CardDescription>
                  Type a name, phone number, RLC code, or membership ID. {checkedKeys.size} already
                  recorded for this service.
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
                      ? 'No matching members or visitors left to record.'
                      : 'Start typing to find someone.'}
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
                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                    Present · {serviceLabel}
                  </CardTitle>
                  <CardDescription>
                    {serviceDate} · {present.length} checked in
                  </CardDescription>
                </div>
                <Badge variant="secondary">{present.length}</Badge>
              </CardHeader>
              <CardContent className="max-h-[28rem] space-y-2 overflow-y-auto">
                {present.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No check-ins for this service yet.</p>
                ) : (
                  present.map((row) => (
                    <RosterRow key={row.attendance.id} row={row} variant="present" />
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="absent">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserX className="h-5 w-5 text-amber-700" />
                  Mark absent with note
                </CardTitle>
                <CardDescription>
                  Search someone who did not check in and record why they were absent (optional).
                  Everyone else without a record is implicitly absent.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  placeholder="Search name, phone, RLC-26-XXXX…"
                  value={absentQuery}
                  onChange={(e) => setAbsentQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && absentSearchHits[0]) {
                      e.preventDefault()
                      setAbsentTarget(absentSearchHits[0])
                      setAbsentNote('')
                    }
                  }}
                />
                {absentSearchHits.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {absentQuery.trim()
                      ? 'No matching people without a record for this service.'
                      : 'Search for a member or visitor to mark absent.'}
                  </p>
                ) : (
                  absentSearchHits.map((person) => (
                    <div
                      key={person.key}
                      className="flex items-center justify-between gap-3 rounded-lg border bg-white px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{person.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {person.kind === 'member' ? 'Member' : 'Visitor'}
                          {person.phone ? ` · ${person.phone}` : ''}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 border-amber-300 text-amber-900 hover:bg-amber-50"
                        disabled={recordingKey === person.key}
                        onClick={() => {
                          setAbsentTarget(person)
                          setAbsentNote('')
                        }}
                      >
                        Mark absent
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
                    <UserX className="h-5 w-5 text-amber-700" />
                    Absent (noted)
                  </CardTitle>
                  <CardDescription>
                    {serviceDate} · {absentNoted.length} with a recorded absence
                  </CardDescription>
                </div>
                <Badge variant="outline">{absentNoted.length}</Badge>
              </CardHeader>
              <CardContent className="max-h-[28rem] space-y-2 overflow-y-auto">
                {absentNoted.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No explicit absence notes yet. Use search to mark someone absent.
                  </p>
                ) : (
                  absentNoted.map((row) => (
                    <RosterRow
                      key={row.attendance.id}
                      row={row}
                      variant="absent"
                      editingNoteId={savingNote ? editRow?.attendance.id ?? null : null}
                      onEditNote={(target) => {
                        setEditRow(target)
                        setEditNote(target.attendance.notes ?? '')
                      }}
                    />
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog
        open={absentTarget != null}
        onOpenChange={(open) => {
          if (!open) {
            setAbsentTarget(null)
            setAbsentNote('')
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark absent</DialogTitle>
            <DialogDescription>
              {absentTarget?.name} · {serviceLabel} · {serviceDate}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="absent-note">Absence note (optional)</Label>
            <Textarea
              id="absent-note"
              placeholder="e.g. Travelling, sick, work commitment…"
              value={absentNote}
              onChange={(e) => setAbsentNote(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAbsentTarget(null)}>
              Cancel
            </Button>
            <Button
              className="bg-amber-700 hover:bg-amber-800"
              disabled={recordingKey === absentTarget?.key}
              onClick={() => void confirmMarkAbsent()}
            >
              Save absence
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editRow != null}
        onOpenChange={(open) => {
          if (!open) {
            setEditRow(null)
            setEditNote('')
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit absence note</DialogTitle>
            <DialogDescription>{editRow?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="edit-absent-note">Note</Label>
            <Textarea
              id="edit-absent-note"
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRow(null)}>
              Cancel
            </Button>
            <Button disabled={savingNote} onClick={() => void saveEditedNote()}>
              {savingNote ? 'Saving…' : 'Save note'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}
