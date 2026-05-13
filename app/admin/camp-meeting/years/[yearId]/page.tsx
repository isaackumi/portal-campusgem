'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  bulkPatchCampRegistrations,
  getCampRegistrations,
  getCampYearById,
  recordCampCommunication,
} from '@/lib/actions/camp'
import { loadAllUsers } from '@/lib/actions/core-data'
import type { AppUser, CampRegistration, CampYear } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { LoadingSpinner } from '@/components/ui/loading'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/components/providers'
import {
  ArrowLeft,
  BarChart3,
  MessageSquare,
  UserCheck,
  Users,
  Sparkles,
  Phone,
  Mail,
} from 'lucide-react'

type Segment = 'all' | 'new' | 'returning' | 'unassigned' | 'no_follow_up'

function buildInsights(registrations: CampRegistration[]) {
  const byRole = registrations.reduce<Record<string, number>>((acc, row) => {
    const key = row.role || 'Unknown'
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})

  return {
    total: registrations.length,
    checkedIn: registrations.filter((row) => row.status === 'checked_in').length,
    newRegistrants: registrations.filter((row) => row.is_new_registrant).length,
    returning: registrations.filter((row) => !row.is_new_registrant).length,
    paid: registrations.filter(
      (row) => row.payment_status === 'paid' || row.payment_status === 'confirmed'
    ).length,
    pendingFollowUp: registrations.filter(
      (row) => !row.follow_up_status || row.follow_up_status === 'pending'
    ).length,
    unassigned: registrations.filter((row) => !row.assigned_to).length,
    withPhone: registrations.filter((row) => row.phone?.trim()).length,
    withEmail: registrations.filter((row) => row.email?.trim()).length,
    byRole,
  }
}

export default function CampYearHubPage() {
  const params = useParams<{ yearId: string }>()
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useAuth()
  const yearId = params.yearId

  const [campYear, setCampYear] = useState<CampYear | null>(null)
  const [registrations, setRegistrations] = useState<CampRegistration[]>([])
  const [staff, setStaff] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [segment, setSegment] = useState<Segment>('all')
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [smsBody, setSmsBody] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [followUpStatus, setFollowUpStatus] = useState<'pending' | 'in_progress' | 'completed'>(
    'pending'
  )
  const [roundRobin, setRoundRobin] = useState(false)
  const [working, setWorking] = useState(false)

  useEffect(() => {
    void loadPage()
  }, [yearId])

  async function loadPage() {
    setLoading(true)
    try {
      const [{ data: year }, { data: rows }, usersResult] = await Promise.all([
        getCampYearById(yearId),
        getCampRegistrations(yearId),
        loadAllUsers(),
      ])
      setCampYear(year)
      setRegistrations(rows ?? [])
      const staffMembers = (usersResult.data ?? []).filter((member) =>
        ['admin', 'pastor', 'elder', 'finance_officer'].includes(member.role)
      )
      setStaff(staffMembers)
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'Failed to load year hub',
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setLoading(false)
    }
  }

  const insights = useMemo(() => buildInsights(registrations), [registrations])

  const filtered = useMemo(() => {
    return registrations.filter((row) => {
      const matchesSearch =
        !search.trim() ||
        row.full_name.toLowerCase().includes(search.toLowerCase()) ||
        row.phone?.includes(search) ||
        row.email?.toLowerCase().includes(search.toLowerCase())

      const matchesSegment =
        segment === 'all' ||
        (segment === 'new' && row.is_new_registrant) ||
        (segment === 'returning' && !row.is_new_registrant) ||
        (segment === 'unassigned' && !row.assigned_to) ||
        (segment === 'no_follow_up' &&
          (!row.follow_up_status || row.follow_up_status === 'pending'))

      return matchesSearch && matchesSegment
    })
  }, [registrations, search, segment])

  const selectedRows = useMemo(
    () => filtered.filter((row) => selectedIds.has(row.id)),
    [filtered, selectedIds]
  )

  function toggleAll(checked: boolean) {
    setSelectedIds(checked ? new Set(filtered.map((row) => row.id)) : new Set())
  }

  async function handleBulkAssign() {
    if (selectedRows.length === 0) return
    setWorking(true)
    try {
      if (roundRobin && staff.length > 0) {
        const grouped = new Map<string, string[]>()
        selectedRows.forEach((row, index) => {
          const staffMember = staff[index % staff.length]
          const bucket = grouped.get(staffMember.id) ?? []
          bucket.push(row.id)
          grouped.set(staffMember.id, bucket)
        })
        let updated = 0
        for (const [staffId, ids] of Array.from(grouped.entries())) {
          const result = await bulkPatchCampRegistrations({
            registration_ids: ids,
            assigned_to: staffId,
            follow_up_status: followUpStatus,
          })
          if (result.error) throw new Error(result.error)
          updated += result.updated
        }
        toast({ title: 'Assignments distributed', description: `${updated} campers assigned.` })
      } else {
        const result = await bulkPatchCampRegistrations({
          registration_ids: selectedRows.map((row) => row.id),
          assigned_to: assigneeId || undefined,
          follow_up_status: followUpStatus,
        })
        if (result.error) throw new Error(result.error)
        toast({ title: 'Assignments updated', description: `${result.updated} campers updated.` })
      }
      setSelectedIds(new Set())
      await loadPage()
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'Assignment failed',
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setWorking(false)
    }
  }

  async function handleBulkSms() {
    if (!user || selectedRows.length === 0 || !smsBody.trim() || !campYear) return
    setWorking(true)
    try {
      let sent = 0
      for (const row of selectedRows) {
        if (!row.phone?.trim()) continue
        const message = smsBody.split('{{name}}').join(row.full_name)
        await recordCampCommunication({
          camp_year_id: campYear.id,
          communication_type: 'sms',
          sender_id: user.id,
          recipient_type: 'individual',
          recipient_registration_id: row.id,
          recipient_phone: row.phone,
          message_body: message,
          status: 'sent',
          filter_criteria: { role: segment === 'all' ? undefined : segment },
        })
        sent += 1
      }
      toast({ title: 'SMS queued', description: `${sent} messages logged for delivery.` })
      setSmsBody('')
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'SMS failed',
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setWorking(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (!campYear) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Button variant="ghost" onClick={() => router.push('/admin/camp-meeting/years')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to camp years
        </Button>
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">Camp year not found.</CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Button variant="ghost" onClick={() => router.push('/admin/camp-meeting/years')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Camp years
          </Button>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-blue-600 p-3 text-white shadow-lg shadow-blue-600/20">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Camp {campYear.year} intelligence hub</h1>
              <p className="text-muted-foreground">{campYear.theme}</p>
            </div>
            {campYear.is_active ? <Badge>Active season</Badge> : <Badge variant="secondary">Historical season</Badge>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href={`/admin/camp-meeting/registrations?year=${campYear.id}`}>Registrations</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/admin/camp-meeting/analytics?year=${campYear.id}`}>Analytics</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/admin/camp-meeting/import?year=${campYear.id}`}>Import</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardDescription>Registrations</CardDescription><CardTitle className="text-3xl">{insights.total}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Checked in</CardDescription><CardTitle className="text-3xl">{insights.checkedIn}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Needs follow-up</CardDescription><CardTitle className="text-3xl">{insights.pendingFollowUp}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Unassigned</CardDescription><CardTitle className="text-3xl">{insights.unassigned}</CardTitle></CardHeader></Card>
      </div>

      <Tabs defaultValue="analysis" className="space-y-4">
        <TabsList>
          <TabsTrigger value="analysis"><BarChart3 className="mr-2 h-4 w-4" />Analysis</TabsTrigger>
          <TabsTrigger value="outreach"><MessageSquare className="mr-2 h-4 w-4" />Bulk SMS</TabsTrigger>
          <TabsTrigger value="assign"><UserCheck className="mr-2 h-4 w-4" />Assignments</TabsTrigger>
        </TabsList>

        <TabsContent value="analysis" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Role mix</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(insights.byRole).map(([role, count]) => (
                  <div key={role}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span>{role}</span>
                      <span>{count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-blue-600"
                        style={{ width: `${insights.total ? (count / insights.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Reachability</CardTitle></CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-blue-50 p-4"><Phone className="mb-2 h-5 w-5 text-blue-600" /><p className="text-2xl font-bold">{insights.withPhone}</p><p className="text-sm text-muted-foreground">With phone</p></div>
                <div className="rounded-xl bg-indigo-50 p-4"><Mail className="mb-2 h-5 w-5 text-indigo-600" /><p className="text-2xl font-bold">{insights.withEmail}</p><p className="text-sm text-muted-foreground">With email</p></div>
                <div className="rounded-xl bg-emerald-50 p-4"><Users className="mb-2 h-5 w-5 text-emerald-600" /><p className="text-2xl font-bold">{insights.newRegistrants}</p><p className="text-sm text-muted-foreground">First-time campers</p></div>
                <div className="rounded-xl bg-amber-50 p-4"><Users className="mb-2 h-5 w-5 text-amber-600" /><p className="text-2xl font-bold">{insights.returning}</p><p className="text-sm text-muted-foreground">Returning campers</p></div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="outreach" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bulk SMS to selected campers</CardTitle>
              <CardDescription>Use {'{{name}}'} to personalize each message.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea value={smsBody} onChange={(event) => setSmsBody(event.target.value)} rows={5} placeholder="Hi {{name}}, thank you for joining Camp..." />
              <Button onClick={handleBulkSms} disabled={working || selectedRows.length === 0 || !smsBody.trim()}>
                Send SMS to {selectedRows.length} selected
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assign" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Assign follow-up owners</CardTitle>
              <CardDescription>Distribute selected campers to pastors, elders, or admins.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Assignee</Label>
                <Select value={assigneeId} onValueChange={setAssigneeId} disabled={roundRobin}>
                  <SelectTrigger><SelectValue placeholder="Choose staff member" /></SelectTrigger>
                  <SelectContent>
                    {staff.map((member) => (
                      <SelectItem key={member.id} value={member.id}>{member.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Follow-up status</Label>
                <Select value={followUpStatus} onValueChange={(value) => setFollowUpStatus(value as typeof followUpStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 md:col-span-2">
                <Checkbox checked={roundRobin} onCheckedChange={(checked) => setRoundRobin(checked === true)} id="round-robin" />
                <Label htmlFor="round-robin">Distribute evenly across selected staff</Label>
              </div>
              <Button className="md:col-span-2" onClick={handleBulkAssign} disabled={working || selectedRows.length === 0}>
                Assign {selectedRows.length} selected campers
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Camper selection</CardTitle>
          <CardDescription>Filter, select, then run SMS or assignment actions above.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, phone, or email" className="max-w-sm" />
            <Select value={segment} onValueChange={(value) => setSegment(value as Segment)}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All campers</SelectItem>
                <SelectItem value="new">First-time</SelectItem>
                <SelectItem value="returning">Returning</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                <SelectItem value="no_follow_up">Needs follow-up</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => toggleAll(true)}>Select visible</Button>
            <Button variant="outline" onClick={() => toggleAll(false)}>Clear</Button>
          </div>
          <div className="max-h-[420px] space-y-2 overflow-y-auto">
            {filtered.map((row) => (
              <label key={row.id} className="flex cursor-pointer items-center justify-between rounded-lg border p-3 hover:bg-muted/40">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={selectedIds.has(row.id)}
                    onCheckedChange={(checked) => {
                      const next = new Set(selectedIds)
                      if (checked) next.add(row.id)
                      else next.delete(row.id)
                      setSelectedIds(next)
                    }}
                  />
                  <div>
                    <p className="font-medium">{row.full_name}</p>
                    <p className="text-sm text-muted-foreground">{row.phone || 'No phone'} · {row.role}</p>
                  </div>
                </div>
                <Badge variant="outline">{row.follow_up_status || 'pending'}</Badge>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
