'use client'

import {
  RLC_FOLLOW_UP_LABELS,
  RLC_PIPELINE_LABELS,
  RLC_SERVICES,
  RLC_SOURCE_LABELS,
  RLC_VISITOR_SOURCES,
} from '@/lib/constants/rlc'
import type { CreateVisitorForm } from '@/lib/types'
import { MemberSingleSelect } from '@/components/rlc/member-select'
import { RlcSponsorMultiSelect } from '@/components/rlc/rlc-sponsor-multi-select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

const EMPTY_MEMBER_IDS: string[] = []

type Props = {
  form: CreateVisitorForm
  onChange: (form: CreateVisitorForm) => void
  showPipelineFields?: boolean
  /** Public kiosk omits staff-only follow-up assignment fields. */
  publicMode?: boolean
}

export function RlcVisitorForm({ form, onChange, showPipelineFields, publicMode }: Props) {
  return (
    <div className="space-y-6">
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
              onChange={(e) => onChange({ ...form, first_name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="last_name">Last name</Label>
            <Input
              id="last_name"
              value={form.last_name ?? ''}
              onChange={(e) => onChange({ ...form, last_name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={form.phone ?? ''}
              onChange={(e) => onChange({ ...form, phone: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={form.email ?? ''}
              onChange={(e) => onChange({ ...form, email: e.target.value })}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={form.address ?? ''}
              onChange={(e) => onChange({ ...form, address: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Gender</Label>
            <Select
              value={form.gender ?? 'none'}
              onValueChange={(v) =>
                onChange({ ...form, gender: v === 'none' ? undefined : (v as CreateVisitorForm['gender']) })
              }
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
              onChange={(e) => onChange({ ...form, date_of_birth: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="occupation">Occupation</Label>
            <Input
              id="occupation"
              value={form.occupation ?? ''}
              onChange={(e) => onChange({ ...form, occupation: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Marital status</Label>
            <Select
              value={form.marital_status ?? 'none'}
              onValueChange={(v) =>
                onChange({
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
              onChange={(e) => onChange({ ...form, visit_date: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Service attended</Label>
            <Select
              value={form.service_attended ?? 'sunday_service'}
              onValueChange={(v) => onChange({ ...form, service_attended: v })}
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
              onChange={(e) => onChange({ ...form, how_heard_about_church: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Source</Label>
            <Select
              value={form.source ?? 'walk_in'}
              onValueChange={(v) => onChange({ ...form, source: v as CreateVisitorForm['source'] })}
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
          <CardTitle>{publicMode ? 'Who invited you?' : 'Sponsors & follow-up'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <RlcSponsorMultiSelect
            label={publicMode ? 'Member or friend who brought you' : 'Members who brought visitor'}
            value={form.invited_by_member_ids ?? EMPTY_MEMBER_IDS}
            onChange={(ids) => onChange({ ...form, invited_by_member_ids: ids })}
          />
          {!publicMode ? (
            <>
              <MemberSingleSelect
                value={form.assigned_follow_up_member_id}
                onChange={(id) => onChange({ ...form, assigned_follow_up_member_id: id })}
              />
              <div className="space-y-2">
                <Label htmlFor="follow_up_notes">Notes</Label>
                <Textarea
                  id="follow_up_notes"
                  value={form.follow_up_notes ?? ''}
                  onChange={(e) => onChange({ ...form, follow_up_notes: e.target.value })}
                  rows={3}
                />
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="follow_up_notes">Anything else we should know? (optional)</Label>
              <Textarea
                id="follow_up_notes"
                value={form.follow_up_notes ?? ''}
                onChange={(e) => onChange({ ...form, follow_up_notes: e.target.value })}
                rows={2}
                placeholder="Prayer requests, how you heard about us, etc."
              />
            </div>
          )}
          {showPipelineFields ? (
            <>
              <div className="space-y-2">
                <Label>Follow-up status</Label>
                <Select
                  value={form.follow_up_status ?? 'pending'}
                  onValueChange={(v) =>
                    onChange({ ...form, follow_up_status: v as CreateVisitorForm['follow_up_status'] })
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
                  value={form.pipeline_status ?? 'first_visit'}
                  onValueChange={(v) =>
                    onChange({ ...form, pipeline_status: v as CreateVisitorForm['pipeline_status'] })
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
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
