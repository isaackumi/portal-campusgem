'use client'

import { RLC_MEMBERSHIP_TYPES, RLC_MEMBERSHIP_TYPE_LABELS, RLC_ROLE_LABELS, RLC_ROLES } from '@/lib/constants/rlc'
import type { Member, RlcMembershipType, RlcRole } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatMembershipIdForDisplay } from '@/lib/membershipId'

export type RlcMemberFormState = {
  rlcMembershipType: RlcMembershipType
  rlcRoles: RlcRole[]
}

export function memberToRlcForm(member: Member): RlcMemberFormState {
  return {
    rlcMembershipType: member.rlc_membership_type ?? 'full_member',
    rlcRoles: (member.rlc_roles?.length ? member.rlc_roles : ['member']) as RlcRole[],
  }
}

type RlcMemberFormProps = {
  member: Member
  form: RlcMemberFormState
  onChange: (form: RlcMemberFormState) => void
}

export function RlcMemberForm({ member, form, onChange }: RlcMemberFormProps) {
  function toggleRole(role: RlcRole, checked: boolean) {
    onChange({
      ...form,
      rlcRoles: checked
        ? form.rlcRoles.includes(role)
          ? form.rlcRoles
          : [...form.rlcRoles, role]
        : form.rlcRoles.filter((r) => r !== role),
    })
  }

  return (
    <div className="space-y-6">
      <Card className="border-rose-100/80">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Contact details come from the main directory profile.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p className="font-medium">{member.user?.full_name ?? 'Member'}</p>
          <p className="text-muted-foreground">
            {member.user?.membership_id ? formatMembershipIdForDisplay(member.user.membership_id) : ''}
            {member.user?.phone ? ` · ${member.user.phone}` : ''}
            {member.user?.email ? ` · ${member.user.email}` : ''}
          </p>
          {member.check_in_code ? (
            <p className="text-muted-foreground">Check-in code: {member.check_in_code}</p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-rose-100/80">
        <CardHeader>
          <CardTitle>RLC membership</CardTitle>
          <CardDescription>Membership type and ministry roles at Redemption Light Chapel.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Membership type</Label>
            <Select
              value={form.rlcMembershipType}
              onValueChange={(value) =>
                onChange({ ...form, rlcMembershipType: value as RlcMembershipType })
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
              {RLC_ROLES.map((role) => (
                <label
                  key={role}
                  className="flex cursor-pointer items-start gap-2 rounded-lg border p-3 hover:bg-rose-50/50"
                >
                  <Checkbox
                    checked={form.rlcRoles.includes(role)}
                    onCheckedChange={(v) => toggleRole(role, v === true)}
                  />
                  <p className="text-sm font-medium leading-snug">{RLC_ROLE_LABELS[role]}</p>
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
