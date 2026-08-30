'use client'

import { RLC_MEMBERSHIP_TYPES, RLC_MEMBERSHIP_TYPE_LABELS, RLC_ROLE_LABELS, RLC_ROLES } from '@/lib/constants/rlc'
import type { CreateRlcMemberForm, RlcRole } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

type Props = {
  form: CreateRlcMemberForm
  onChange: (form: CreateRlcMemberForm) => void
}

export function emptyRlcMemberForm(): CreateRlcMemberForm {
  return {
    first_name: '',
    middle_name: '',
    last_name: '',
    phone: '',
    secondary_phone: '',
    whatsapp: '',
    whatsapp_same_as_phone: true,
    email: '',
    occupation: '',
    place_of_work: '',
    school_or_workplace: '',
    address: '',
    hometown: '',
    area_of_residence: '',
    gender: undefined,
    dob: '',
    marital_status: undefined,
    spouse_name: '',
    children_count: undefined,
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relation: '',
    notes: '',
    rlc_roles: ['member'],
    rlc_membership_type: 'full_member',
  }
}

export function RlcCreateMemberForm({ form, onChange }: Props) {
  function toggleRole(role: RlcRole, checked: boolean) {
    const current = form.rlc_roles ?? []
    onChange({
      ...form,
      rlc_roles: checked
        ? current.includes(role)
          ? current
          : [...current, role]
        : current.filter((r) => r !== role),
    })
  }

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
            <Label htmlFor="middle_name">Middle name</Label>
            <Input
              id="middle_name"
              value={form.middle_name ?? ''}
              onChange={(e) => onChange({ ...form, middle_name: e.target.value })}
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
            <Label htmlFor="gender">Gender</Label>
            <Select
              value={form.gender ?? ''}
              onValueChange={(value) =>
                onChange({ ...form, gender: value as CreateRlcMemberForm['gender'] })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="dob">Date of birth</Label>
            <Input
              id="dob"
              type="date"
              value={form.dob ?? ''}
              onChange={(e) => onChange({ ...form, dob: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="marital_status">Marital status</Label>
            <Select
              value={form.marital_status ?? ''}
              onValueChange={(value) =>
                onChange({
                  ...form,
                  marital_status: value as CreateRlcMemberForm['marital_status'],
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
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
          <CardTitle>Contact</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone *</Label>
            <Input
              id="phone"
              required
              value={form.phone}
              onChange={(e) => {
                const phone = e.target.value
                onChange({
                  ...form,
                  phone,
                  whatsapp: form.whatsapp_same_as_phone !== false ? phone : form.whatsapp,
                })
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="whatsapp">WhatsApp number</Label>
            <Input
              id="whatsapp"
              disabled={form.whatsapp_same_as_phone !== false}
              value={form.whatsapp_same_as_phone !== false ? form.phone : (form.whatsapp ?? '')}
              onChange={(e) => onChange({ ...form, whatsapp: e.target.value })}
            />
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Checkbox
                checked={form.whatsapp_same_as_phone !== false}
                onCheckedChange={(checked) =>
                  onChange({
                    ...form,
                    whatsapp_same_as_phone: checked === true,
                    whatsapp: checked === true ? form.phone : form.whatsapp,
                  })
                }
              />
              Same as phone
            </label>
          </div>
          <div className="space-y-2">
            <Label htmlFor="secondary_phone">Secondary phone</Label>
            <Input
              id="secondary_phone"
              value={form.secondary_phone ?? ''}
              onChange={(e) => onChange({ ...form, secondary_phone: e.target.value })}
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
            <Label htmlFor="area_of_residence">Area of residence</Label>
            <Input
              id="area_of_residence"
              value={form.area_of_residence ?? ''}
              onChange={(e) => onChange({ ...form, area_of_residence: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hometown">Hometown</Label>
            <Input
              id="hometown"
              value={form.hometown ?? ''}
              onChange={(e) => onChange({ ...form, hometown: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Work</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="occupation">Occupation</Label>
            <Input
              id="occupation"
              value={form.occupation ?? ''}
              onChange={(e) => onChange({ ...form, occupation: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="place_of_work">Place of work</Label>
            <Input
              id="place_of_work"
              value={form.place_of_work ?? ''}
              onChange={(e) => onChange({ ...form, place_of_work: e.target.value })}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="school_or_workplace">School or workplace</Label>
            <Input
              id="school_or_workplace"
              value={form.school_or_workplace ?? ''}
              onChange={(e) => onChange({ ...form, school_or_workplace: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Family & emergency</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="spouse_name">Spouse name</Label>
            <Input
              id="spouse_name"
              value={form.spouse_name ?? ''}
              onChange={(e) => onChange({ ...form, spouse_name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="children_count">Number of children</Label>
            <Input
              id="children_count"
              type="number"
              min={0}
              value={form.children_count ?? ''}
              onChange={(e) =>
                onChange({
                  ...form,
                  children_count: e.target.value === '' ? undefined : Number(e.target.value),
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emergency_contact_name">Emergency contact name</Label>
            <Input
              id="emergency_contact_name"
              value={form.emergency_contact_name ?? ''}
              onChange={(e) => onChange({ ...form, emergency_contact_name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emergency_contact_phone">Emergency contact phone</Label>
            <Input
              id="emergency_contact_phone"
              value={form.emergency_contact_phone ?? ''}
              onChange={(e) => onChange({ ...form, emergency_contact_phone: e.target.value })}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="emergency_contact_relation">Relation</Label>
            <Input
              id="emergency_contact_relation"
              value={form.emergency_contact_relation ?? ''}
              onChange={(e) => onChange({ ...form, emergency_contact_relation: e.target.value })}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              rows={3}
              value={form.notes ?? ''}
              onChange={(e) => onChange({ ...form, notes: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>RLC membership</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Membership type</Label>
            <Select
              value={form.rlc_membership_type ?? 'full_member'}
              onValueChange={(value) =>
                onChange({
                  ...form,
                  rlc_membership_type: value as CreateRlcMemberForm['rlc_membership_type'],
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RLC_MEMBERSHIP_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {RLC_MEMBERSHIP_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Ministry roles</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {RLC_ROLES.filter((role) => role !== 'visitor').map((role) => (
                <label key={role} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={(form.rlc_roles ?? []).includes(role)}
                    onCheckedChange={(checked) => toggleRole(role, checked === true)}
                  />
                  {RLC_ROLE_LABELS[role]}
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
