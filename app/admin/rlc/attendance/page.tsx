'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/components/providers'
import { loadRlcAttendanceAction, loadRlcMembersAction, loadRlcVisitorsAction, recordRlcAttendanceAction } from '@/lib/actions/rlc'
import { RLC_SERVICES } from '@/lib/constants/rlc'
import type { Attendance, Member, Visitor } from '@/lib/types'
import { PageContainer } from '@/components/layout/page-container'
import { RlcPageHeader } from '@/components/rlc/rlc-page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LoadingSpinner } from '@/components/ui/loading'
import { useToast } from '@/hooks/use-toast'
import { Calendar, QrCode } from 'lucide-react'

export default function RlcAttendancePage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0])
  const [serviceType, setServiceType] = useState('sunday_service')
  const [attendance, setAttendance] = useState<Attendance[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [visitors, setVisitors] = useState<Visitor[]>([])
  const [selectedMemberId, setSelectedMemberId] = useState<string>('')
  const [selectedVisitorId, setSelectedVisitorId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [recording, setRecording] = useState(false)

  async function reload() {
    const [a, m, v] = await Promise.all([
      loadRlcAttendanceAction({ serviceDate }),
      loadRlcMembersAction(),
      loadRlcVisitorsAction(),
    ])
    setAttendance(a.data ?? [])
    setMembers(m.data ?? [])
    setVisitors((v.data ?? []).filter((x) => x.is_active && !x.converted_to_member))
    setLoading(false)
  }

  useEffect(() => {
    reload()
  }, [serviceDate])

  async function checkIn() {
    if (!user?.id) return
    if (!selectedMemberId && !selectedVisitorId) {
      toast({ variant: 'destructive', title: 'Select a member or visitor' })
      return
    }
    setRecording(true)
    const { error } = await recordRlcAttendanceAction({
      memberId: selectedMemberId || undefined,
      visitorId: selectedVisitorId || undefined,
      serviceDate,
      serviceType: serviceType as Attendance['service_type'],
      createdBy: user.id,
    })
    setRecording(false)
    if (error) {
      toast({ variant: 'destructive', title: 'Check-in failed', description: error })
      return
    }
    toast({ title: 'Checked in' })
    setSelectedMemberId('')
    setSelectedVisitorId('')
    await reload()
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
        title="RLC Attendance"
        subtitle="Record Sunday and midweek attendance for RLC members and visitors."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/attendance/scanner">
                <QrCode className="mr-2 h-4 w-4" />
                QR Scanner
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/attendance/analytics">
                <Calendar className="mr-2 h-4 w-4" />
                All attendance analytics
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Manual check-in</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Service date</Label>
                <Input type="date" value={serviceDate} onChange={(e) => setServiceDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Service</Label>
                <Select value={serviceType} onValueChange={setServiceType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RLC_SERVICES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>RLC member</Label>
              <Select value={selectedMemberId || 'none'} onValueChange={(v) => {
                setSelectedMemberId(v === 'none' ? '' : v)
                if (v !== 'none') setSelectedVisitorId('')
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select member" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.user?.full_name ?? m.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Active visitor</Label>
              <Select value={selectedVisitorId || 'none'} onValueChange={(v) => {
                setSelectedVisitorId(v === 'none' ? '' : v)
                if (v !== 'none') setSelectedMemberId('')
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select visitor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {visitors.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.first_name} {v.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full bg-rose-700 hover:bg-rose-800" onClick={checkIn} disabled={recording}>
              {recording ? 'Recording…' : 'Check in'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              Today&apos;s RLC attendance ({attendance.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-96 space-y-2 overflow-y-auto">
            {attendance.length === 0 ? (
              <p className="text-sm text-muted-foreground">No check-ins for this date yet.</p>
            ) : (
              attendance.map((a) => (
                <div key={a.id} className="rounded-lg border px-3 py-2 text-sm">
                  <p className="font-medium">{a.member_id ? `Member ${a.member_id.slice(-6)}` : `Visitor ${a.visitor_id?.slice(-6)}`}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.service_type?.replace('_', ' ')} · {new Date(a.check_in_time).toLocaleTimeString()}
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
