'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/components/providers'
import {
  addRlcInteractionAction,
  convertRlcVisitorAction,
  deleteRlcVisitorAction,
  loadRlcInteractionsAction,
  loadRlcVisitorAction,
  updateRlcVisitorAction,
} from '@/lib/actions/rlc'
import {
  RLC_FOLLOW_UP_LABELS,
  RLC_MEMBERSHIP_TYPE_LABELS,
  RLC_PIPELINE_COLORS,
  RLC_PIPELINE_LABELS,
  RLC_SOURCE_LABELS,
} from '@/lib/constants/rlc'
import { generateRlcMembershipId } from '@/lib/membershipId'
import { serviceSelectValueToLabel, visitorToForm } from '@/lib/rlc/visitor-form'
import type { ConvertRlcVisitorForm, CreateVisitorForm, RlcInteraction, Visitor } from '@/lib/types'
import { MemberMultiSelect, MemberSingleSelect } from '@/components/rlc/member-select'
import { RlcPageHeader } from '@/components/rlc/rlc-page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { LoadingSpinner } from '@/components/ui/loading'
import { useToast } from '@/hooks/use-toast'
import { CheckCircle2, MessageSquare, Pencil, Trash2, UserCheck } from 'lucide-react'

const EMPTY_MEMBER_IDS: string[] = []

export default function RlcVisitorDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const id = String(params.id)

  const [visitor, setVisitor] = useState<Visitor | null>(null)
  const [interactions, setInteractions] = useState<RlcInteraction[]>([])
  const [loading, setLoading] = useState(true)
  const [note, setNote] = useState('')
  const [converting, setConverting] = useState(false)
  const [showConvert, setShowConvert] = useState(false)
  const [convertForm, setConvertForm] = useState<ConvertRlcVisitorForm>({
    rlc_membership_type: 'visitor_converted',
    holy_ghost_baptism: false,
  })

  async function reload() {
    const [{ data: v }, { data: ints }] = await Promise.all([
      loadRlcVisitorAction(id),
      loadRlcInteractionsAction(id),
    ])
    setVisitor(v ?? null)
    setInteractions(ints ?? [])
    if (v) {
      setConvertForm((f) => ({
        ...f,
        full_name: [v.first_name, v.last_name].filter(Boolean).join(' '),
        phone: v.phone,
        email: v.email,
        address: v.address,
        dob: v.date_of_birth,
        gender: v.gender,
        occupation: v.occupation,
        marital_status: v.marital_status,
        membership_id: generateRlcMembershipId(v.phone),
      }))
    }
  }

  useEffect(() => {
    reload().finally(() => setLoading(false))
  }, [id])

  async function saveAssignment(form: Partial<CreateVisitorForm>) {
    if (!visitor || !user?.id) return
    const base = visitorToForm(visitor)
    const payload: CreateVisitorForm = {
      ...base,
      ...form,
      service_attended: serviceSelectValueToLabel(base.service_attended),
    }
    const { error } = await updateRlcVisitorAction(id, payload, user.id)
    if (error) {
      toast({ variant: 'destructive', title: 'Update failed', description: error })
      return
    }
    toast({ title: 'Saved' })
    await reload()
  }

  async function logNote() {
    if (!user?.id || !note.trim()) return
    const { error } = await addRlcInteractionAction({
      visitorId: id,
      performedBy: user.id,
      interactionType: 'note',
      notes: note.trim(),
      pipelineStatus: 'follow_up',
    })
    if (error) {
      toast({ variant: 'destructive', title: 'Failed', description: error })
      return
    }
    setNote('')
    toast({ title: 'Note logged' })
    await reload()
  }

  async function handleConvert(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.id) return
    setConverting(true)
    const { data, error } = await convertRlcVisitorAction(id, convertForm, user.id)
    setConverting(false)
    if (error || !data) {
      toast({ variant: 'destructive', title: 'Conversion failed', description: error })
      return
    }
    toast({ title: 'Member created', description: 'Visitor converted to RLC member.' })
    router.push('/admin/rlc/members')
  }

  async function archiveVisitor() {
    if (!user?.id || !visitor) return
    const name = [visitor.first_name, visitor.last_name].filter(Boolean).join(' ')
    if (!confirm(`Archive ${name}? They will be hidden from the active pipeline.`)) return
    const { error } = await deleteRlcVisitorAction(id, user.id, false)
    if (error) {
      toast({ variant: 'destructive', title: 'Archive failed', description: error })
      return
    }
    toast({ title: 'Visitor archived' })
    router.push('/admin/rlc/visitors')
  }

  async function permanentDelete() {
    if (!user?.id || !visitor) return
    const name = [visitor.first_name, visitor.last_name].filter(Boolean).join(' ')
    if (
      !confirm(
        `Permanently delete ${name}? This removes the record and all follow-up history. This cannot be undone.`
      )
    ) {
      return
    }
    const { error } = await deleteRlcVisitorAction(id, user.id, true)
    if (error) {
      toast({ variant: 'destructive', title: 'Delete failed', description: error })
      return
    }
    toast({ title: 'Visitor deleted' })
    router.push('/admin/rlc/visitors')
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (!visitor) {
    return <p className="text-center text-muted-foreground">Visitor not found.</p>
  }

  const pipeline = visitor.pipeline_status ?? 'first_visit'

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <RlcPageHeader
        title={`${visitor.first_name} ${visitor.last_name ?? ''}`.trim()}
        subtitle={`Visit ${visitor.visit_date}${visitor.service_attended ? ` · ${visitor.service_attended}` : ''}`}
        backHref="/admin/rlc/visitors"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" asChild>
              <Link href={`/admin/rlc/visitors/${id}/edit`}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>
            {!visitor.converted_to_member ? (
              <>
                <Button className="bg-rose-700 hover:bg-rose-800" onClick={() => setShowConvert(true)}>
                  <UserCheck className="mr-2 h-4 w-4" />
                  Convert to member
                </Button>
                {visitor.is_active !== false ? (
                  <Button variant="outline" onClick={archiveVisitor}>
                    Archive
                  </Button>
                ) : null}
                <Button variant="destructive" onClick={permanentDelete}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </>
            ) : (
              <Badge className="bg-emerald-100 text-emerald-800">
                <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                Converted
              </Badge>
            )}
          </div>
        }
      >
        <div className="flex flex-wrap gap-2">
          <Badge className={RLC_PIPELINE_COLORS[pipeline]}>{RLC_PIPELINE_LABELS[pipeline]}</Badge>
          {visitor.follow_up_status ? (
            <Badge variant="outline">{RLC_FOLLOW_UP_LABELS[visitor.follow_up_status]}</Badge>
          ) : null}
          {visitor.source ? <Badge variant="secondary">{RLC_SOURCE_LABELS[visitor.source]}</Badge> : null}
        </div>
      </RlcPageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Contact & profile</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
              {[
                ['Phone', visitor.phone],
                ['Email', visitor.email],
                ['Address', visitor.address],
                ['Gender', visitor.gender],
                ['Date of birth', visitor.date_of_birth],
                ['Occupation', visitor.occupation],
                ['Marital status', visitor.marital_status],
                ['How heard', visitor.how_heard_about_church],
              ].map(([label, value]) =>
                value ? (
                  <div key={label}>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="font-medium">{value}</p>
                  </div>
                ) : null
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Follow-up timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Textarea
                  placeholder="Log a call, visit, or note…"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                />
                <Button type="button" variant="outline" className="shrink-0" onClick={logNote}>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Log
                </Button>
              </div>
              <div className="space-y-3">
                {interactions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No interactions yet.</p>
                ) : (
                  interactions.map((i) => (
                    <div key={i.id} className="rounded-lg border bg-slate-50/80 px-3 py-2 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="outline">{i.interaction_type.replace('_', ' ')}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(i.created_at).toLocaleString()}
                        </span>
                      </div>
                      {i.notes ? <p className="mt-2 whitespace-pre-wrap">{i.notes}</p> : null}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {showConvert && !visitor.converted_to_member ? (
            <Card className="border-emerald-200">
              <CardHeader>
                <CardTitle>Complete member profile</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleConvert} className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Full name</Label>
                    <Input
                      value={convertForm.full_name ?? ''}
                      onChange={(e) => setConvertForm({ ...convertForm, full_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>RLC membership ID</Label>
                    <Input
                      value={convertForm.membership_id ?? ''}
                      onChange={(e) => setConvertForm({ ...convertForm, membership_id: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Membership type</Label>
                    <Select
                      value={convertForm.rlc_membership_type ?? 'visitor_converted'}
                      onValueChange={(v) =>
                        setConvertForm({
                          ...convertForm,
                          rlc_membership_type: v as ConvertRlcVisitorForm['rlc_membership_type'],
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(RLC_MEMBERSHIP_TYPE_LABELS).map(([k, label]) => (
                          <SelectItem key={k} value={k}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      value={convertForm.phone ?? ''}
                      onChange={(e) => setConvertForm({ ...convertForm, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      value={convertForm.email ?? ''}
                      onChange={(e) => setConvertForm({ ...convertForm, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Address</Label>
                    <Input
                      value={convertForm.address ?? ''}
                      onChange={(e) => setConvertForm({ ...convertForm, address: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Date of baptism</Label>
                    <Input
                      type="date"
                      value={convertForm.date_of_baptism ?? ''}
                      onChange={(e) => setConvertForm({ ...convertForm, date_of_baptism: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Previous church</Label>
                    <Input
                      value={convertForm.previous_church ?? ''}
                      onChange={(e) => setConvertForm({ ...convertForm, previous_church: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Emergency contact name</Label>
                    <Input
                      value={convertForm.emergency_contact_name ?? ''}
                      onChange={(e) =>
                        setConvertForm({ ...convertForm, emergency_contact_name: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Emergency contact phone</Label>
                    <Input
                      value={convertForm.emergency_contact_phone ?? ''}
                      onChange={(e) =>
                        setConvertForm({ ...convertForm, emergency_contact_phone: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={convertForm.notes ?? ''}
                      onChange={(e) => setConvertForm({ ...convertForm, notes: e.target.value })}
                    />
                  </div>
                  <div className="flex gap-2 sm:col-span-2">
                    <Button type="button" variant="outline" onClick={() => setShowConvert(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={converting} className="bg-emerald-700 hover:bg-emerald-800">
                      {converting ? 'Converting…' : 'Complete conversion'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Sponsors</CardTitle>
            </CardHeader>
            <CardContent>
              <MemberMultiSelect
                value={visitor.invited_by_member_ids ?? EMPTY_MEMBER_IDS}
                onChange={(ids) => saveAssignment({ invited_by_member_ids: ids })}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Follow-up assignee</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <MemberSingleSelect
                value={visitor.assigned_follow_up_member_id}
                onChange={(mid) => saveAssignment({ assigned_follow_up_member_id: mid })}
              />
              <div className="space-y-2">
                <Label>Follow-up status</Label>
                <Select
                  value={visitor.follow_up_status ?? 'pending'}
                  onValueChange={(v) =>
                    saveAssignment({ follow_up_status: v as CreateVisitorForm['follow_up_status'] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(RLC_FOLLOW_UP_LABELS).map(([k, label]) => (
                      <SelectItem key={k} value={k}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Pipeline stage</Label>
                <Select
                  value={pipeline}
                  onValueChange={(v) =>
                    saveAssignment({ pipeline_status: v as CreateVisitorForm['pipeline_status'] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(RLC_PIPELINE_LABELS).map(([k, label]) => (
                      <SelectItem key={k} value={k}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {visitor.converted_member_id ? (
            <Card>
              <CardContent className="py-4">
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/admin/rlc/members">View RLC members</Link>
                </Button>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  )
}
