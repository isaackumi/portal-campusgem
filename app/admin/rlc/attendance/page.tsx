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
  buildAttendancePeople,
  buildAttendanceRoster,
  downloadAttendanceCsv,
  filterAttendancePeople,
  groupPresentMembersByMembershipType,
  presentMemberSectionLabel,
  sessionCheckedKeys,
  splitAttendanceRoster,
  summarizeAttendancePresent,
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
import { RlcAttendanceCalendarView } from '@/components/rlc/rlc-attendance-calendar-view'
import { RlcCheckInSearchHit } from '@/components/rlc/rlc-check-in-search-hit'
import { RlcPageHeader } from '@/components/rlc/rlc-page-header'
import { RlcServiceSelect } from '@/components/rlc/rlc-service-select'
import { Badge } from '@/components/ui/badge'
import { PhoneLink } from '@/components/contact/phone-link'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { useRlcOptimisticCheckIn } from '@/hooks/use-rlc-optimistic-check-in'
import { useToast } from '@/hooks/use-toast'
import {
  CalendarDays,
  CheckCircle,
  Download,
  MoreHorizontal,
  Pencil,
  Printer,
  QrCode,
  Search,
  Trash2,
  UserCheck,
  UserX,
} from 'lucide-react'

function RosterRow({
  row,
  variant,
  onEditNote,
  onRemove,
  editingNoteId,
  removingId,
}: {
  row: RlcAttendanceRosterRow
  variant: 'present' | 'absent'
  onEditNote?: (row: RlcAttendanceRosterRow) => void
  onRemove?: (row: RlcAttendanceRosterRow) => void
  editingNoteId?: string | null
  removingId?: string | null
}) {
  return (
    <div key={row.attendance.id} className="rounded-lg border px-3 py-2 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="break-words font-medium">{row.name}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            <Badge
              variant="outline"
              className={
                row.kind === 'visitor'
                  ? 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-300'
                  : row.kind === 'member'
                    ? 'border-brand-200 bg-brand-50 text-brand-800 dark:border-brand-400/20 dark:bg-brand-400/10 dark:text-brand-300'
                    : ''
              }
            >
              {row.kind === 'member' ? 'Member' : row.kind === 'visitor' ? 'Visitor' : 'Unknown'}
            </Badge>
            {row.phone ? <PhoneLink phone={row.phone} name={row.name} className="text-xs text-muted-foreground" /> : null}
            {row.code ? <span className="font-mono text-xs text-muted-foreground">{row.code}</span> : null}
          </div>
        </div>
        {variant === 'present' ? (
          <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-300" />
        ) : (
          <UserX className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
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
        <p className="mt-2 rounded-md bg-amber-50 px-2 py-1.5 text-xs text-amber-950 dark:bg-amber-400/10 dark:text-amber-300">
          {row.attendance.notes}
        </p>
      ) : variant === 'absent' ? (
        <p className="mt-2 text-xs italic text-muted-foreground">No note recorded</p>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-1">
        {onEditNote ? (
          <Button
            size="sm"
            variant="ghost"
            className="h-10 px-3 text-xs text-brand-700 dark:text-brand-300 sm:h-8 sm:px-2"
            disabled={editingNoteId === row.attendance.id}
            onClick={() => onEditNote(row)}
          >
            <Pencil className="mr-1 h-3 w-3" />
            {variant === 'absent' ? 'Edit' : 'Change'}
          </Button>
        ) : null}
        {onRemove ? (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2 text-xs text-red-700 dark:text-red-300"
            disabled={removingId === row.attendance.id}
            onClick={() => onRemove(row)}
          >
            <Trash2 className="mr-1 h-3 w-3" />
            {removingId === row.attendance.id ? 'Removing…' : 'Remove'}
          </Button>
        ) : null}
      </div>
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
  const [allVisitors, setAllVisitors] = useState<Visitor[]>([])
  const [visitors, setVisitors] = useState<Visitor[]>([])
  const [loading, setLoading] = useState(true)
  const [recordingKey, setRecordingKey] = useState<string | null>(null)
  const [absentTarget, setAbsentTarget] = useState<RlcAttendancePerson | null>(null)
  const [absentNote, setAbsentNote] = useState('')
  const [editRow, setEditRow] = useState<RlcAttendanceRosterRow | null>(null)
  const [editNote, setEditNote] = useState('')
  const [editStatus, setEditStatus] = useState<'present' | 'absent'>('present')
  const [savingNote, setSavingNote] = useState(false)
  const [removeRow, setRemoveRow] = useState<RlcAttendanceRosterRow | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [pageView, setPageView] = useState<'register' | 'calendar'>('register')

  const reload = useCallback(async () => {
    const [a, m, v, custom] = await Promise.all([
      loadRlcAttendanceAction({ serviceDate }),
      loadRlcMembersAction(),
      loadRlcVisitorsAction({ include_inactive: true }),
      loadRlcCustomServicesAction(),
    ])
    setAttendance(a.data ?? [])
    setMembers(m.data ?? [])
    setAllVisitors(v.data ?? [])
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

  const people = useMemo(
    () => buildAttendancePeople(members, visitors),
    [members, visitors]
  )

  const searchHits = useMemo(
    () => filterAttendancePeople(people, query, checkedKeys),
    [people, query, checkedKeys]
  )

  const absentSearchHits = useMemo(
    () => filterAttendancePeople(people, absentQuery, checkedKeys),
    [people, absentQuery, checkedKeys]
  )

  const roster = useMemo(
    () => buildAttendanceRoster(attendance, members, allVisitors, serviceSelection),
    [attendance, members, allVisitors, serviceSelection]
  )

  const { present, absentNoted } = useMemo(() => splitAttendanceRoster(roster), [roster])
  const summary = useMemo(() => summarizeAttendancePresent(present), [present])
  const presentVisitors = useMemo(
    () => present.filter((row) => row.kind === 'visitor'),
    [present]
  )
  const presentMembers = useMemo(
    () => present.filter((row) => row.kind !== 'visitor'),
    [present]
  )
  const presentMemberGroups = useMemo(
    () => groupPresentMembersByMembershipType(present),
    [present]
  )

  const implicitAbsentCount = Math.max(people.length - present.length - absentNoted.length, 0)

  const serviceLabel = useMemo(() => rlcServiceSelectionLabel(serviceSelection), [serviceSelection])

  const { checkIn, removeFromSession, pendingKeys, lastCheckedIn } = useRlcOptimisticCheckIn({
    userId: user?.id,
    serviceDate,
    serviceSelection,
    setAttendance,
    toast,
    onCheckedIn: () => setQuery(''),
  })

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

  async function confirmMarkAbsent() {
    if (!user?.id || !absentTarget) return
    setRecordingKey(absentTarget.key)
    const recordArgs = recordArgsFromSelection(serviceSelection)
    const { data, error } = await recordRlcAttendanceAction({
      memberId: absentTarget.kind === 'member' ? absentTarget.memberId : undefined,
      visitorId: absentTarget.kind === 'visitor' ? absentTarget.visitorId : undefined,
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
      status: editStatus,
    })
    setSavingNote(false)
    if (error) {
      toast({ variant: 'destructive', title: 'Could not save record', description: error })
      return
    }
    toast({
      title: editStatus === 'present' ? 'Marked present' : 'Attendance updated',
      description: editRow.name,
    })
    setEditRow(null)
    setEditNote('')
    await reload()
  }

  async function confirmRemoveAttendance() {
    if (!removeRow) return
    const row = removeRow.attendance
    setRemovingId(row.id)
    const { error } = await removeFromSession(row)
    setRemovingId(null)
    if (error) {
      toast({ variant: 'destructive', title: 'Could not remove', description: error })
      await reload()
      return
    }
    toast({ title: 'Attendance removed', description: `${removeRow.name} is no longer recorded for this service.` })
    setRemoveRow(null)
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

  function openSessionFromCalendar(date: string, selection: RlcServiceSelection) {
    setServiceDate(date)
    setServiceSelection(selection)
    setPageView('register')
  }

  return (
    <PageContainer className="space-y-6">
      <RlcPageHeader
        title="RLC Attendance"
        subtitle={
          pageView === 'calendar'
            ? 'Browse attendance by month. Each colored marker is a service session — click a day for details or open the register.'
            : 'Check in present members and visitors, or mark someone absent with an optional note. Anyone not checked in is implicitly absent.'
        }
        actions={
          pageView === 'register' ? (
            <>
              <Button variant="outline" asChild>
                <Link href={printHref} target="_blank">
                  <Printer className="mr-2 h-4 w-4" />
                  Print
                </Link>
              </Button>
              <Button variant="outline" className="hidden sm:inline-flex" onClick={handleDownloadCsv} disabled={roster.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                Download CSV
              </Button>
              <Button variant="outline" className="hidden sm:inline-flex" asChild>
                <Link href="/admin/rlc/scan">
                  <QrCode className="mr-2 h-4 w-4" />
                  Optional QR scan
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="sm:hidden">
                    <MoreHorizontal className="mr-2 h-4 w-4" />
                    More
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem className="min-h-11" disabled={roster.length === 0} onClick={handleDownloadCsv}>
                    <Download className="mr-2 h-4 w-4" />
                    Download CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="min-h-11">
                    <Link href="/admin/rlc/scan">
                      <QrCode className="mr-2 h-4 w-4" />
                      Optional QR scan
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : null
        }
      />

      <Tabs
        value={pageView}
        onValueChange={(value) => setPageView(value as 'register' | 'calendar')}
        className="space-y-6"
      >
        <ScrollableTabsList>
          <TabsTrigger value="register">
            <UserCheck className="mr-2 h-4 w-4 shrink-0" />
            Register
          </TabsTrigger>
          <TabsTrigger value="calendar">
            <CalendarDays className="mr-2 h-4 w-4 shrink-0" />
            Calendar
          </TabsTrigger>
        </ScrollableTabsList>

        <TabsContent value="calendar">
          <RlcAttendanceCalendarView onOpenSession={openSessionFromCalendar} />
        </TabsContent>

        <TabsContent value="register" className="flex flex-col gap-4 sm:gap-6">
      <Card className="border-brand-100/80 dark:border-brand-400/20">
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

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { value: summary.present, label: 'Present', hint: 'Checked in', cls: 'text-emerald-700 dark:text-emerald-300' },
          { value: absentNoted.length, label: 'Absent', hint: 'With a note', cls: 'text-amber-700 dark:text-amber-300' },
          { value: implicitAbsentCount, label: 'No record', hint: 'Implicitly absent', cls: 'text-neutral-600 dark:text-neutral-300' },
        ].map((stat) => (
          <div key={stat.label} className="dashboard-panel p-3 sm:p-5">
            <p className={`app-stat-value ${stat.cls}`}>{stat.value}</p>
            <p className="app-stat-label">{stat.label}</p>
            <p className="hidden text-xs text-muted-foreground sm:block">{stat.hint}</p>
          </div>
        ))}
      </div>
      <section className="dashboard-panel order-last p-4 sm:p-5 lg:order-none">
        <h2 className="app-section-title">Who came</h2>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
          {[
            ['Members present', summary.members],
            ['Visitors present', summary.visitors],
            ['Males', summary.male],
            ['Females', summary.female],
            ['Children (0–12)', summary.children],
            ['Teens (13–17)', summary.teens],
            ['Adults (18+)', summary.youngAdults + summary.adults + summary.seniors],
            ['Gender not specified', summary.genderUnspecified],
          ].map(([label, value]) => (
            <div key={label as string} className="min-w-0">
              <dt className="app-stat-label truncate">{label}</dt>
              <dd className="text-xl font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-muted-foreground">
          Age missing: {summary.ageUnspecified}
          {summary.otherGender > 0 ? ` · Other gender: ${summary.otherGender}` : ''}. Gender and age come from
          member/visitor profiles; update records so these counts fill in.
        </p>
      </section>

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
                  <Search className="h-5 w-5 text-brand-700 dark:text-brand-300" />
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
                  type="search"
                  className="h-11 text-base sm:h-10 sm:text-sm"
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
                {lastCheckedIn ? (
                  <p className="flex items-center gap-1.5 text-sm text-emerald-700 dark:text-emerald-300">
                    <CheckCircle className="h-4 w-4 shrink-0" />
                    Checked in {lastCheckedIn}
                  </p>
                ) : null}
                {searchHits.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {query.trim()
                      ? 'No matching members or visitors left to record.'
                      : 'Start typing to find someone.'}
                  </p>
                ) : (
                  searchHits.map((person) => (
                    <RlcCheckInSearchHit
                      key={person.key}
                      person={person}
                      pending={pendingKeys.has(person.key)}
                      onCheckIn={(p) => void checkIn(p)}
                    />
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
                    Present · {serviceLabel}
                  </CardTitle>
                  <CardDescription>
                    {serviceDate} · {present.length} checked in · {presentVisitors.length} visitors ·{' '}
                    {presentMembers.length} members
                  </CardDescription>
                </div>
                <Badge variant="secondary">{present.length}</Badge>
              </CardHeader>
              <CardContent className="space-y-2 lg:max-h-[28rem] lg:overflow-y-auto">
                {present.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No check-ins for this service yet.</p>
                ) : (
                  <>
                    {presentVisitors.length > 0 ? (
                      <div className="space-y-2">
                        <p className="app-overline text-sky-800 dark:text-sky-300">
                          Visitors ({presentVisitors.length})
                        </p>
                        {presentVisitors.map((row) => (
                          <RosterRow
                            key={row.attendance.id}
                            row={row}
                            variant="present"
                            removingId={removingId}
                            onEditNote={(target) => {
                              setEditRow(target)
                              setEditNote(target.attendance.notes ?? '')
                              setEditStatus('present')
                            }}
                            onRemove={setRemoveRow}
                          />
                        ))}
                      </div>
                    ) : null}
                    {presentMemberGroups.map((group) => (
                      <div key={group.type} className="space-y-2">
                        <p className="app-overline text-brand-800 dark:text-brand-300">
                          {presentMemberSectionLabel(group.type)} ({group.rows.length})
                        </p>
                        {group.rows.map((row) => (
                          <RosterRow
                            key={row.attendance.id}
                            row={row}
                            variant="present"
                            removingId={removingId}
                            onEditNote={(target) => {
                              setEditRow(target)
                              setEditNote(target.attendance.notes ?? '')
                              setEditStatus('present')
                            }}
                            onRemove={setRemoveRow}
                          />
                        ))}
                      </div>
                    ))}
                  </>
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
                  <UserX className="h-5 w-5 text-amber-700 dark:text-amber-300" />
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
                      className="flex min-h-14 items-center justify-between gap-3 rounded-lg border bg-white px-3 py-2 dark:bg-neutral-800/60"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{person.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          <span className="font-medium text-sky-800 dark:text-sky-300">
                            {person.kind === 'visitor' ? 'Visitor' : 'Member'}
                          </span>
                          {person.phone ? <span className="font-mono"> · {person.phone}</span> : ''}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-10 shrink-0 sm:h-8 border-amber-300 text-amber-900 hover:bg-amber-50 dark:border-amber-400/20 dark:text-amber-300 dark:hover:bg-amber-400/10"
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
                    <UserX className="h-5 w-5 text-amber-700 dark:text-amber-300" />
                    Absent (noted)
                  </CardTitle>
                  <CardDescription>
                    {serviceDate} · {absentNoted.length} with a recorded absence
                  </CardDescription>
                </div>
                <Badge variant="outline">{absentNoted.length}</Badge>
              </CardHeader>
              <CardContent className="space-y-2 lg:max-h-[28rem] lg:overflow-y-auto">
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
                      removingId={removingId}
                      onEditNote={(target) => {
                        setEditRow(target)
                        setEditNote(target.attendance.notes ?? '')
                        setEditStatus('absent')
                      }}
                      onRemove={setRemoveRow}
                    />
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
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
            <DialogTitle>Edit attendance</DialogTitle>
            <DialogDescription>
              {editRow?.name} · change status or notes. Use Remove to undo a mistaken record.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Status</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={editStatus === 'present' ? 'default' : 'outline'}
                  className={editStatus === 'present' ? 'bg-brand-700 hover:bg-brand-800' : ''}
                  onClick={() => setEditStatus('present')}
                >
                  Present
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={editStatus === 'absent' ? 'default' : 'outline'}
                  className={editStatus === 'absent' ? 'bg-amber-700 hover:bg-amber-800' : ''}
                  onClick={() => setEditStatus('absent')}
                >
                  Absent
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-absent-note">Note (optional)</Label>
              <Textarea
                id="edit-absent-note"
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRow(null)}>
              Cancel
            </Button>
            <Button disabled={savingNote} onClick={() => void saveEditedNote()}>
              {savingNote ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={removeRow != null}
        onOpenChange={(open) => {
          if (!open) setRemoveRow(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove attendance?</DialogTitle>
            <DialogDescription>
              {removeRow?.name} will no longer be recorded for {serviceLabel} on {serviceDate}. You can
              check them in again later if needed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveRow(null)}>
              Keep record
            </Button>
            <Button
              variant="destructive"
              disabled={removingId === removeRow?.attendance.id}
              onClick={() => void confirmRemoveAttendance()}
            >
              {removingId ? 'Removing…' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}
