'use client'

import Link from 'next/link'
import { RLC_MEMBERSHIP_TYPES, RLC_MEMBERSHIP_TYPE_LABELS, RLC_ROLE_LABELS, RLC_ROLES } from '@/lib/constants/rlc'
import type { Member, RlcMembershipType, RlcRole } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { formatMembershipIdForDisplay } from '@/lib/membershipId'
import { cn } from '@/lib/utils'
import {
  BadgeCheck,
  ExternalLink,
  Hash,
  Mail,
  Phone,
  QrCode,
  Shield,
  UserRound,
} from 'lucide-react'

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

const MEMBERSHIP_TYPE_HINTS: Record<RlcMembershipType, string> = {
  full_member: 'Regular RLC member in good standing.',
  associate: 'Connected to RLC but not yet a full member.',
  visitor_converted: 'Previously a visitor who joined RLC.',
}

type RlcMemberFormProps = {
  member: Member
  form: RlcMemberFormState
  onChange: (form: RlcMemberFormState) => void
}

function memberInitials(member: Member): string {
  const name = member.user?.full_name?.trim() ?? ''
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase()
  if (parts[0]) return parts[0].slice(0, 2).toUpperCase()
  return 'RL'
}

function DirectoryField({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: typeof Phone
  label: string
  value?: string | null
  mono?: boolean
}) {
  if (!value?.trim()) return null
  return (
    <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-rose-700/70" aria-hidden />
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={cn('truncate text-sm font-medium text-slate-900', mono && 'font-mono text-xs')}>
          {value}
        </p>
      </div>
    </div>
  )
}

function RlcMemberDirectorySummary({ member }: { member: Member }) {
  const name = member.user?.full_name?.trim() || 'Member'
  const membershipId = member.user?.membership_id
    ? formatMembershipIdForDisplay(member.user.membership_id)
    : null

  return (
    <Card className="border-slate-200/80 bg-slate-50/40">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-rose-100 text-base font-semibold text-rose-800"
            aria-hidden
          >
            {memberInitials(member)}
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-lg">{name}</CardTitle>
            <CardDescription className="mt-1">
              Name, phone, and email are managed in the main member directory — not on this page.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <DirectoryField icon={Hash} label="Membership ID" value={membershipId} mono />
        <DirectoryField icon={Phone} label="Phone" value={member.user?.phone} />
        <DirectoryField icon={Mail} label="Email" value={member.user?.email} />
        <DirectoryField icon={QrCode} label="Check-in code" value={member.check_in_code} mono />
        <Link
          href={`/members/${member.id}`}
          className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 transition-colors hover:border-rose-200 hover:bg-rose-50/50 hover:text-rose-900"
        >
          <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
          Update contact details in directory
        </Link>
      </CardContent>
    </Card>
  )
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

  const selectedRoleCount = form.rlcRoles.length

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-start">
      <div className="space-y-6">
        <Card className="border-rose-200/80 shadow-sm">
          <CardHeader className="space-y-3 border-b border-rose-100/80 bg-rose-50/30 pb-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-rose-700 hover:bg-rose-700">Step 1</Badge>
              <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800">
                You can edit this
              </Badge>
            </div>
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Shield className="h-5 w-5 text-rose-700" aria-hidden />
                RLC membership type
              </CardTitle>
              <CardDescription className="mt-1.5">
                Choose how this person is classified at Redemption Light Chapel.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 pt-5 sm:grid-cols-1">
            {RLC_MEMBERSHIP_TYPES.map((type) => {
              const selected = form.rlcMembershipType === type
              return (
                <label
                  key={type}
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition-colors',
                    selected
                      ? 'border-rose-600 bg-rose-50/80 ring-1 ring-rose-600/20'
                      : 'border-slate-200 bg-white hover:border-rose-200 hover:bg-rose-50/30'
                  )}
                >
                  <input
                    type="radio"
                    name="rlc-membership-type"
                    className="sr-only"
                    checked={selected}
                    onChange={() => onChange({ ...form, rlcMembershipType: type })}
                  />
                  <span
                    className={cn(
                      'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
                      selected ? 'border-rose-600 bg-rose-600' : 'border-slate-300 bg-white'
                    )}
                    aria-hidden
                  >
                    {selected ? <span className="h-2 w-2 rounded-full bg-white" /> : null}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-900">
                      {RLC_MEMBERSHIP_TYPE_LABELS[type]}
                    </span>
                    <span className="mt-0.5 block text-sm text-muted-foreground">
                      {MEMBERSHIP_TYPE_HINTS[type]}
                    </span>
                  </span>
                </label>
              )
            })}
          </CardContent>
        </Card>

        <Card className="border-rose-200/80 shadow-sm">
          <CardHeader className="space-y-3 border-b border-rose-100/80 bg-rose-50/30 pb-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-rose-700 hover:bg-rose-700">Step 2</Badge>
              <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800">
                You can edit this
              </Badge>
              <Badge variant="secondary">{selectedRoleCount} selected</Badge>
            </div>
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <UserRound className="h-5 w-5 text-rose-700" aria-hidden />
                Ministry roles
              </CardTitle>
              <CardDescription className="mt-1.5">
                Select every role this person holds. Keep <strong className="font-medium text-slate-800">Member</strong>{' '}
                checked unless they are staff-only.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-5">
            <div className="grid gap-2 sm:grid-cols-2">
              {RLC_ROLES.map((role) => {
                const checked = form.rlcRoles.includes(role)
                return (
                  <label
                    key={role}
                    className={cn(
                      'flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors',
                      checked
                        ? 'border-rose-300 bg-rose-50/70'
                        : 'border-slate-200 bg-white hover:border-rose-200 hover:bg-rose-50/40'
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) => toggleRole(role, v === true)}
                      className="mt-0.5"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium leading-snug text-slate-900">
                        {RLC_ROLE_LABELS[role]}
                      </span>
                      {role === 'member' ? (
                        <span className="mt-0.5 block text-xs text-muted-foreground">Required for most people</span>
                      ) : null}
                    </span>
                  </label>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-6">
        <RlcMemberDirectorySummary member={member} />
        <Card className="border-dashed border-slate-200 bg-white/80">
          <CardContent className="flex gap-3 pt-6 text-sm text-muted-foreground">
            <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
            <p>
              Changes here only affect RLC membership type and ministry roles. Attendance and check-in codes stay
              linked to this profile.
            </p>
          </CardContent>
        </Card>
      </aside>
    </div>
  )
}
