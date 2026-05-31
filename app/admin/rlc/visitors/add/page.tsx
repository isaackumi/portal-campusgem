'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers'
import { createRlcVisitorAction } from '@/lib/actions/rlc'
import { RLC_SERVICES, RLC_VISITOR_SOURCES, RLC_SOURCE_LABELS } from '@/lib/constants/rlc'
import type { CreateVisitorForm } from '@/lib/types'
import { MemberMultiSelect, MemberSingleSelect } from '@/components/rlc/member-select'
import { RlcPageHeader } from '@/components/rlc/rlc-page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { useClientOnly } from '@/lib/hooks/use-client-only'

export default function AddRlcVisitorPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const isMounted = useClientOnly()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<CreateVisitorForm>({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    address: '',
    visit_date: '',
    service_attended: 'sunday_service',
    how_heard_about_church: '',
    invited_by_member_ids: [],
    assigned_follow_up_member_id: undefined,
    follow_up_notes: '',
    source: 'walk_in',
    gender: undefined,
    date_of_birth: '',
    occupation: '',
    marital_status: undefined,
  })

  useEffect(() => {
    if (isMounted && !form.visit_date) {
      setForm((f) => ({ ...f, visit_date: new Date().toISOString().split('T')[0] }))
    }
  }, [isMounted, form.visit_date])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.id) return
    if (!form.first_name.trim()) {
      toast({ variant: 'destructive', title: 'First name is required' })
      return
    }
    setLoading(true)
    const serviceLabel =
      RLC_SERVICES.find((s) => s.value === form.service_attended)?.label ?? form.service_attended
    const { data, error } = await createRlcVisitorAction(
      { ...form, service_attended: serviceLabel },
      user.id
    )
    setLoading(false)
    if (error || !data) {
      toast({ variant: 'destructive', title: 'Failed', description: error ?? 'Could not save visitor' })
      return
    }
    toast({ title: 'Visitor registered', description: `${form.first_name} added to RLC pipeline.` })
    router.push(`/admin/rlc/visitors/${data.id}`)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <RlcPageHeader
        title="Register RLC Visitor"
        subtitle="Capture complete visitor details for follow-up and conversion."
        backHref="/admin/rlc/visitors"
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Personal details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="first_name">First name *</Label>
              <Input
                id="first_name"
                required
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last name</Label>
              <Input
                id="last_name"
                value={form.last_name ?? ''}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={form.phone ?? ''}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email ?? ''}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={form.address ?? ''}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Gender</Label>
              <Select
                value={form.gender ?? 'none'}
                onValueChange={(v) => setForm({ ...form, gender: v === 'none' ? undefined : (v as CreateVisitorForm['gender']) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not specified</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date_of_birth">Date of birth</Label>
              <Input
                id="date_of_birth"
                type="date"
                value={form.date_of_birth ?? ''}
                onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="occupation">Occupation</Label>
              <Input
                id="occupation"
                value={form.occupation ?? ''}
                onChange={(e) => setForm({ ...form, occupation: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Marital status</Label>
              <Select
                value={form.marital_status ?? 'none'}
                onValueChange={(v) =>
                  setForm({
                    ...form,
                    marital_status: v === 'none' ? undefined : (v as CreateVisitorForm['marital_status']),
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not specified</SelectItem>
                  <SelectItem value="single">Single</SelectItem>
                  <SelectItem value="married">Married</SelectItem>
                  <SelectItem value="divorced">Divorced</SelectItem>
                  <SelectItem value="widowed">Widowed</SelectItem>
                  <SelectItem value="separated">Separated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Visit & source</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="visit_date">Visit date *</Label>
              <Input
                id="visit_date"
                type="date"
                required
                value={form.visit_date}
                onChange={(e) => setForm({ ...form, visit_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Service attended</Label>
              <Select
                value={form.service_attended ?? 'sunday_service'}
                onValueChange={(v) => setForm({ ...form, service_attended: v })}
              >
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
            <div className="space-y-2">
              <Label>How they heard about church</Label>
              <Input
                value={form.how_heard_about_church ?? ''}
                onChange={(e) => setForm({ ...form, how_heard_about_church: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Source</Label>
              <Select
                value={form.source ?? 'walk_in'}
                onValueChange={(v) => setForm({ ...form, source: v as CreateVisitorForm['source'] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RLC_VISITOR_SOURCES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {RLC_SOURCE_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sponsors & follow-up</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <MemberMultiSelect
              value={form.invited_by_member_ids ?? []}
              onChange={(ids) => setForm({ ...form, invited_by_member_ids: ids })}
            />
            <MemberSingleSelect
              value={form.assigned_follow_up_member_id}
              onChange={(id) => setForm({ ...form, assigned_follow_up_member_id: id })}
            />
            <div className="space-y-2">
              <Label htmlFor="follow_up_notes">Initial notes</Label>
              <Textarea
                id="follow_up_notes"
                value={form.follow_up_notes ?? ''}
                onChange={(e) => setForm({ ...form, follow_up_notes: e.target.value })}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.push('/admin/rlc/visitors')}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading} className="bg-rose-700 hover:bg-rose-800">
            {loading ? 'Saving…' : 'Register visitor'}
          </Button>
        </div>
      </form>
    </div>
  )
}
