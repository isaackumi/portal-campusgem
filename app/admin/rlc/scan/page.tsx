'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { useAuth } from '@/components/providers'
import {
  createRlcCustomServiceAction,
  loadRlcAttendanceAction,
  loadRlcCustomServicesAction,
  loadRlcMembersAction,
  loadRlcVisitorsAction,
  recordRlcAttendanceAction,
  resolveRlcScanAction,
} from '@/lib/actions/rlc'
import {
  buildAttendancePeople,
  filterAttendancePeople,
  memberToAttendancePerson,
  sessionCheckedKeys,
  visitorToAttendancePerson,
  type RlcAttendancePerson,
} from '@/lib/rlc/attendance-roster'
import {
  defaultRlcServiceSelection,
  recordArgsFromSelection,
  rlcServiceSelectionLabel,
  type RlcServiceSelection,
} from '@/lib/rlc/service-selection'
import type { Attendance, Member, RlcCustomService, Visitor } from '@/lib/types'
import { PageContainer } from '@/components/layout/page-container'
import { RlcPageHeader } from '@/components/rlc/rlc-page-header'
import { RlcServiceSelect } from '@/components/rlc/rlc-service-select'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { LoadingSpinner } from '@/components/ui/loading'
import { useToast } from '@/hooks/use-toast'
import { Camera, CheckCircle, Search } from 'lucide-react'

export default function RlcScanPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0])
  const [serviceSelection, setServiceSelection] = useState<RlcServiceSelection>(defaultRlcServiceSelection())
  const [customServices, setCustomServices] = useState<RlcCustomService[]>([])
  const [creatingCustom, setCreatingCustom] = useState(false)
  const [query, setQuery] = useState('')
  const [cameraOpen, setCameraOpen] = useState(false)
  const [visitors, setVisitors] = useState<Visitor[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [attendance, setAttendance] = useState<Attendance[]>([])
  const [loading, setLoading] = useState(true)
  const [recordingKey, setRecordingKey] = useState<string | null>(null)
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)
  const lastScannedRef = useRef<string | null>(null)

  const serviceLabel = useMemo(() => rlcServiceSelectionLabel(serviceSelection), [serviceSelection])

  const loadAll = useCallback(async () => {
    const [a, m, v, custom] = await Promise.all([
      loadRlcAttendanceAction({ serviceDate }),
      loadRlcMembersAction(),
      loadRlcVisitorsAction(),
      loadRlcCustomServicesAction(),
    ])
    setAttendance(a.data ?? [])
    setMembers(m.data ?? [])
    setVisitors((v.data ?? []).filter((row) => row.is_active !== false))
    setCustomServices(custom.data ?? [])
    setLoading(false)
  }, [serviceDate])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  useEffect(() => {
    if (!cameraOpen) {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {})
        scannerRef.current = null
      }
      return
    }

    const element = document.getElementById('rlc-reader')
    if (!element || scannerRef.current) return

    const scanner = new Html5QrcodeScanner(
      'rlc-reader',
      { fps: 10, qrbox: { width: 240, height: 240 } },
      false
    )
    scanner.render(
      (decoded) => void onScan(decoded),
      () => undefined
    )
    scannerRef.current = scanner
    return () => {
      scanner.clear().catch(() => {})
      if (scannerRef.current === scanner) scannerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraOpen, serviceDate, serviceSelection])

  const checkedKeys = useMemo(
    () => sessionCheckedKeys(attendance, serviceSelection),
    [attendance, serviceSelection]
  )

  const people = useMemo(() => buildAttendancePeople(members, visitors), [members, visitors])

  const searchHits = useMemo(
    () => filterAttendancePeople(people, query, checkedKeys),
    [people, query, checkedKeys]
  )

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

  async function checkIn(person: RlcAttendancePerson, method: Attendance['method'] = 'admin') {
    if (!user?.id) {
      toast({ variant: 'destructive', title: 'Sign in required' })
      return
    }
    setRecordingKey(person.key)
    const recordArgs = recordArgsFromSelection(serviceSelection)
    const { data, error } = await recordRlcAttendanceAction({
      memberId: person.kind === 'member' ? person.memberId : undefined,
      visitorId: person.kind === 'visitor' ? person.visitorId : undefined,
      serviceDate,
      ...recordArgs,
      method,
      createdBy: user.id,
    })
    setRecordingKey(null)
    if (error || !data) {
      toast({ variant: 'destructive', title: 'Check-in failed', description: error ?? 'Try again' })
      return
    }
    toast({
      title: data.already_checked_in ? 'Already in this service' : 'Checked in',
      description: person.name,
    })
    setQuery('')
    await loadAll()
  }

  async function onScan(decodedText: string) {
    if (lastScannedRef.current === decodedText) return
    lastScannedRef.current = decodedText
    const { data, error } = await resolveRlcScanAction(decodedText)
    if (error || !data) {
      toast({
        variant: 'destructive',
        title: 'Not found',
        description: 'This QR or code is not on the RLC list.',
      })
      setTimeout(() => {
        lastScannedRef.current = null
      }, 2500)
      return
    }
    if (data.type === 'visitor' && data.visitor) {
      await checkIn(visitorToAttendancePerson(data.visitor), 'qr')
    } else if (data.type === 'member' && data.member) {
      await checkIn(memberToAttendancePerson(data.member), 'qr')
    }
    setTimeout(() => {
      lastScannedRef.current = null
    }, 2500)
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
        title="RLC check-in (optional QR)"
        subtitle="Prefer manual search by name or phone. Open the camera only when you need QR slips."
        actions={
          <Button variant="outline" asChild>
            <Link href="/admin/rlc/attendance">Full attendance + print</Link>
          </Button>
        }
      />

      <Card className="border-rose-100">
        <CardHeader>
          <CardTitle>Active service</CardTitle>
          <CardDescription>
            {checkedKeys.size} already checked into {serviceLabel}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Input type="date" value={serviceDate} onChange={(e) => setServiceDate(e.target.value)} />
          <RlcServiceSelect
            selection={serviceSelection}
            onChange={setServiceSelection}
            customServices={customServices}
            onCreateCustom={handleCreateCustom}
            creatingCustom={creatingCustom}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Manual lookup
          </CardTitle>
          <CardDescription>Search name, phone, RLC code, or membership ID.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            autoFocus
            placeholder="Name, phone, RLC-26-XXXX, membership ID…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchHits[0]) {
                e.preventDefault()
                void checkIn(searchHits[0])
              }
            }}
          />
          {searchHits.map((person) => (
            <div key={person.key} className="flex items-center justify-between gap-2 rounded-lg border p-3">
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
                disabled={recordingKey === person.key}
                onClick={() => void checkIn(person)}
              >
                {recordingKey === person.key ? '…' : 'Check in'}
              </Button>
            </div>
          ))}
          {searchHits.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {query.trim() ? 'No matches left to check in.' : 'Type to find people for this service.'}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              QR camera (optional)
            </CardTitle>
            <CardDescription>Only needed if you are scanning printed slips.</CardDescription>
          </div>
          <Button
            variant={cameraOpen ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setCameraOpen((open) => !open)}
          >
            {cameraOpen ? 'Close camera' : 'Open camera'}
          </Button>
        </CardHeader>
        {cameraOpen ? (
          <CardContent>
            <div id="rlc-reader" className="w-full" />
          </CardContent>
        ) : null}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Checked in ({checkedKeys.size})</CardTitle>
        </CardHeader>
        <CardContent className="max-h-64 space-y-2 overflow-y-auto text-sm">
          {people.filter((p) => checkedKeys.has(p.key)).length === 0 ? (
            <p className="text-muted-foreground">Nobody checked into this service yet.</p>
          ) : (
            people
              .filter((p) => checkedKeys.has(p.key))
              .map((p) => (
                <div key={p.key} className="flex items-center gap-2 rounded border px-3 py-2">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                  <span className="font-medium">{p.name}</span>
                  <span className="text-xs text-muted-foreground">{p.kind}</span>
                </div>
              ))
          )}
        </CardContent>
      </Card>
    </PageContainer>
  )
}
