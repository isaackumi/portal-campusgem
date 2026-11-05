'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { AlertTriangle, ExternalLink, Loader2 } from 'lucide-react'

import type { AppUser, Congregation, Member, MemberStatus, UserRole } from '@/lib/types'
import { dataService } from '@/lib/services/data-service'
import { updateSecondaryPhone, updateUserAccess } from '@/lib/actions/access'
import { ROLE_LABELS, USER_ROLES } from '@/lib/auth/roles'
import { isValidPhone } from '@/lib/phone'
import { parseIsoDob, MEMBER_DOB_PLACEHOLDER_YEAR } from '@/lib/camp/birthday'
import { useAuth } from '@/components/providers'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const MARITAL: Array<{ value: NonNullable<AppUser['marital_status']>; label: string }> = [
  { value: 'single', label: 'Single' },
  { value: 'married', label: 'Married' },
  { value: 'divorced', label: 'Divorced' },
  { value: 'widowed', label: 'Widowed' },
  { value: 'separated', label: 'Separated' },
]

const MEMBER_STATUSES: Array<{ value: MemberStatus; label: string }> = [
  { value: 'active', label: 'Active' },
  { value: 'visitor', label: 'Visitor' },
  { value: 'transferred', label: 'Transferred' },
  { value: 'inactive', label: 'Inactive' },
]

const CONGREGATIONS: Array<{ value: Congregation; label: string }> = [
  { value: 'campus_gem', label: 'Campus Gem' },
  { value: 'rlc', label: 'RLC' },
  { value: 'both', label: 'Both' },
]

const GENDERS: Array<{ value: NonNullable<Member['gender']>; label: string }> = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
]

const NONE = '__none__'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/* -------------------------------------------------------------------------- */
/* Form model                                                                 */
/* -------------------------------------------------------------------------- */

type UserForm = {
  full_name: string
  first_name: string
  middle_name: string
  last_name: string
  phone: string
  secondary_phone: string
  whatsapp: string
  email: string
  membership_id: string
  join_year: string
  role: UserRole
  marital_status: string
  spouse_name: string
  anniversary_date: string
  children_count: string
  occupation: string
  place_of_work: string
  emergency_contact_name: string
  emergency_contact_phone: string
  emergency_contact_relation: string
}

type MemberForm = {
  dob_month: string
  dob_day: string
  dob_year: string
  gender: string
  status: string
  congregation: string
  is_visitor: boolean
  address: string
  hometown: string
  area_of_residence: string
  school_or_workplace: string
  date_of_baptism: string
  holy_ghost_baptism: boolean
  date_of_holy_ghost_baptism: string
  previous_church: string
  reason_for_leaving: string
  special_skills: string
  interests: string
  notes: string
}

type Form = { user: UserForm; member: MemberForm }
type ErrorKey = keyof UserForm | keyof MemberForm
type Errors = Partial<Record<ErrorKey, string>>

function dateInput(value?: string): string {
  const raw = value?.trim()
  if (!raw) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10)
}

function userForm(u: AppUser): UserForm {
  return {
    full_name: u.full_name ?? '',
    first_name: u.first_name ?? '',
    middle_name: u.middle_name ?? '',
    last_name: u.last_name ?? '',
    phone: u.phone ?? '',
    secondary_phone: u.secondary_phone ?? '',
    whatsapp: u.whatsapp ?? '',
    email: u.email ?? '',
    membership_id: u.membership_id ?? '',
    join_year: u.join_year ? String(u.join_year) : '',
    role: u.role,
    marital_status: u.marital_status ?? '',
    spouse_name: u.spouse_name ?? '',
    anniversary_date: dateInput(u.anniversary_date),
    children_count: u.children_count != null ? String(u.children_count) : '',
    occupation: u.occupation ?? '',
    place_of_work: u.place_of_work ?? '',
    emergency_contact_name: u.emergency_contact_name ?? '',
    emergency_contact_phone: u.emergency_contact_phone ?? '',
    emergency_contact_relation: u.emergency_contact_relation ?? '',
  }
}

function memberForm(m: Member | null): MemberForm {
  const dob = parseIsoDob(m?.dob)
  return {
    dob_month: dob.month != null ? String(dob.month) : '',
    dob_day: dob.day != null ? String(dob.day) : '',
    dob_year: dob.year != null && dob.year !== MEMBER_DOB_PLACEHOLDER_YEAR ? String(dob.year) : '',
    gender: m?.gender ?? '',
    status: m?.status ?? '',
    congregation: m?.congregation ?? '',
    is_visitor: Boolean(m?.is_visitor),
    address: m?.address ?? '',
    hometown: m?.hometown ?? '',
    area_of_residence: m?.area_of_residence ?? '',
    school_or_workplace: m?.school_or_workplace ?? '',
    date_of_baptism: dateInput(m?.date_of_baptism),
    holy_ghost_baptism: Boolean(m?.holy_ghost_baptism),
    date_of_holy_ghost_baptism: dateInput(m?.date_of_holy_ghost_baptism),
    previous_church: m?.previous_church ?? '',
    reason_for_leaving: m?.reason_for_leaving ?? '',
    special_skills: (m?.special_skills ?? []).join(', '),
    interests: (m?.interests ?? []).join(', '),
    notes: m?.notes ?? '',
  }
}

function diff<T extends Record<string, unknown>>(a: T, b: T): Array<keyof T> {
  return (Object.keys(a) as Array<keyof T>).filter((k) => a[k] !== b[k])
}

function list(value: string): string[] {
  return value.split(/[\n,]/).map((s) => s.trim()).filter(Boolean)
}

/* -------------------------------------------------------------------------- */
/* Layout helpers                                                             */
/* -------------------------------------------------------------------------- */

function Section({ title, description, action, children }: {
  title: string
  description?: ReactNode
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="space-y-3 border-t border-neutral-200 pt-5 first:border-t-0 first:pt-0 dark:border-neutral-700">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="app-overline">{title}</h3>
          {description ? (
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  )
}

function Field({ id, label, error, hint, wide, dirty, children }: {
  id: string
  label: string
  error?: string
  hint?: string
  wide?: boolean
  dirty?: boolean
  children: ReactNode
}) {
  return (
    <div className={cn('space-y-1.5', wide && 'sm:col-span-2')}>
      <div className="flex items-center gap-1.5">
        <Label htmlFor={id} className="text-neutral-800 dark:text-neutral-200">{label}</Label>
        {dirty ? (
          <span className="h-1.5 w-1.5 rounded-full bg-brand-500 dark:bg-brand-400" aria-label="Changed" title="Changed" />
        ) : null}
      </div>
      {children}
      {error ? (
        <p className="text-xs text-red-600 dark:text-red-400" role="alert">{error}</p>
      ) : hint ? (
        <p className="text-xs text-neutral-500 dark:text-neutral-400">{hint}</p>
      ) : null}
    </div>
  )
}

function CheckField({ id, label, checked, onChange, dirty }: {
  id: string
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  dirty?: boolean
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900/40 dark:hover:bg-neutral-800"
    >
      <Checkbox id={id} checked={checked} onCheckedChange={(v) => onChange(v === true)} />
      <span className="flex items-center gap-1.5 text-sm font-medium text-neutral-900 dark:text-neutral-100">
        {label}
        {dirty ? <span className="h-1.5 w-1.5 rounded-full bg-brand-500 dark:bg-brand-400" aria-hidden /> : null}
      </span>
    </label>
  )
}

/* -------------------------------------------------------------------------- */
/* Dialog                                                                     */
/* -------------------------------------------------------------------------- */

export type EditUserDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  onSaved?: (user: AppUser) => void
}

/**
 * Edit every stored field of a person: the user account, their access (role and
 * secondary sign-in phone, via the access actions) and the linked member profile.
 */
export function EditUserDialog({ open, onOpenChange, userId, onSaved }: EditUserDialogProps) {
  const { toast } = useToast()
  const { user: actor, can } = useAuth()
  const canManageUsers = can('users.manage')
  const canManageAdmins = can('admins.manage')
  const canManageMembers = can('members.manage')

  const [person, setPerson] = useState<AppUser | null>(null)
  const [member, setMember] = useState<Member | null>(null)
  const [initial, setInitial] = useState<Form | null>(null)
  const [form, setForm] = useState<Form | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Errors>({})
  const [saving, setSaving] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  useEffect(() => {
    if (!open || !userId) return
    let cancelled = false
    setPerson(null)
    setMember(null)
    setInitial(null)
    setForm(null)
    setErrors({})
    setLoadError(null)
    setConfirmDiscard(false)
    void Promise.all([dataService.getUserById(userId), dataService.getMemberByUserId(userId)]).then(
      ([userRes, memberRes]) => {
        if (cancelled) return
        if (!userRes.data) {
          setLoadError(userRes.error ?? 'User not found')
          return
        }
        const f: Form = { user: userForm(userRes.data), member: memberForm(memberRes.data ?? null) }
        setPerson(userRes.data)
        setMember(memberRes.data ?? null)
        setInitial(f)
        setForm(f)
      }
    )
    return () => {
      cancelled = true
    }
  }, [open, userId])

  const userDirty = useMemo(() => (initial && form ? diff(initial.user, form.user) : []), [initial, form])
  const memberDirty = useMemo(() => (initial && form ? diff(initial.member, form.member) : []), [initial, form])
  const dirty = useMemo(() => new Set<string>([...userDirty, ...memberDirty] as string[]), [userDirty, memberDirty])
  const dirtyCount = dirty.size
  const isDirty = dirtyCount > 0

  function clearError(key: ErrorKey) {
    if (!errors[key]) return
    setErrors((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  function setUser<K extends keyof UserForm>(key: K, value: UserForm[K]) {
    setConfirmDiscard(false)
    clearError(key)
    setForm((prev) => {
      if (!prev) return prev
      const user = { ...prev.user, [key]: value }
      // Editing the name parts keeps the display name in step.
      if (key === 'first_name' || key === 'middle_name' || key === 'last_name') {
        const joined = [user.first_name, user.middle_name, user.last_name].map((s) => s.trim()).filter(Boolean).join(' ')
        if (joined) user.full_name = joined
      }
      return { ...prev, user }
    })
  }

  function setMemberField<K extends keyof MemberForm>(key: K, value: MemberForm[K]) {
    setConfirmDiscard(false)
    clearError(key)
    setForm((prev) => (prev ? { ...prev, member: { ...prev.member, [key]: value } } : prev))
  }

  function requestClose(nextOpen: boolean) {
    if (nextOpen) return onOpenChange(true)
    if (saving) return
    if (isDirty && !confirmDiscard) {
      setConfirmDiscard(true)
      return
    }
    setConfirmDiscard(false)
    onOpenChange(false)
  }

  function validate(f: Form): Errors {
    const e: Errors = {}
    const u = f.user
    const changed = new Set<string>(dirty)
    if (!u.full_name.trim()) e.full_name = 'Name is required.'
    if (changed.has('phone')) {
      if (!u.phone.trim()) e.phone = 'Phone is required — it is their sign-in number.'
      else if (!isValidPhone(u.phone)) e.phone = 'Enter a valid Ghana number, e.g. 024 123 4567.'
    }
    if (changed.has('secondary_phone') && u.secondary_phone.trim() && !isValidPhone(u.secondary_phone)) {
      e.secondary_phone = 'Enter a valid Ghana number or leave it blank.'
    }
    if (changed.has('whatsapp') && u.whatsapp.trim() && !isValidPhone(u.whatsapp)) {
      e.whatsapp = 'Enter a valid Ghana number or leave it blank.'
    }
    if (changed.has('emergency_contact_phone') && u.emergency_contact_phone.trim() && !isValidPhone(u.emergency_contact_phone)) {
      e.emergency_contact_phone = 'Enter a valid Ghana number or leave it blank.'
    }
    if (changed.has('email') && u.email.trim() && !EMAIL_RE.test(u.email.trim())) {
      e.email = 'Enter a valid email address or leave it blank.'
    }
    if (changed.has('membership_id') && !u.membership_id.trim()) e.membership_id = 'Membership ID is required.'
    if (changed.has('join_year')) {
      const y = Number(u.join_year)
      if (!Number.isInteger(y) || y < 1950 || y > new Date().getFullYear() + 1) e.join_year = 'Enter a valid year.'
    }
    if (changed.has('children_count') && u.children_count.trim()) {
      const n = Number(u.children_count)
      if (!Number.isInteger(n) || n < 0 || n > 30) e.children_count = 'Enter a whole number.'
    }
    const m = f.member
    if (changed.has('dob_month') || changed.has('dob_day') || changed.has('dob_year')) {
      const hasAny = m.dob_month || m.dob_day.trim()
      if (hasAny) {
        const mo = Number(m.dob_month)
        const d = Number(m.dob_day)
        const y = m.dob_year.trim() ? Number(m.dob_year) : undefined
        const thisYear = new Date().getFullYear()
        if (!m.dob_month || !m.dob_day.trim()) e.dob_day = 'Enter both month and day.'
        else if (y !== undefined && (!Number.isInteger(y) || y < 1900 || y > thisYear)) e.dob_year = `Enter a year between 1900 and ${thisYear}.`
        else if (!Number.isInteger(d) || d < 1 || d > new Date(y ?? 2000, mo, 0).getDate()) e.dob_day = 'That day does not exist in this month.'
      } else if (initial?.member.dob_month) {
        e.dob_day = 'Birthday can be corrected but not removed.'
      }
    }
    return e
  }

  async function handleSave() {
    if (!form || !initial || !person) return
    const found = validate(form)
    if (Object.keys(found).length > 0) {
      setErrors(found)
      toast({ variant: 'destructive', title: 'Check the highlighted fields', description: Object.values(found)[0] })
      return
    }

    const u = form.user
    const changedUser = new Set<keyof UserForm>(userDirty)
    const failures: string[] = []
    let latest: AppUser = person
    setSaving(true)
    try {
      // 1. Profile fields (never role — that goes through updateUserAccess below).
      const profile: Partial<AppUser> = {}
      const textKeys = [
        'full_name', 'first_name', 'middle_name', 'last_name', 'whatsapp', 'email', 'membership_id',
        'spouse_name', 'anniversary_date', 'occupation', 'place_of_work',
        'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relation',
      ] as const
      for (const key of textKeys) {
        if (changedUser.has(key)) (profile as Record<string, unknown>)[key] = u[key].trim()
      }
      if (changedUser.has('phone')) profile.phone = u.phone.trim()
      if (changedUser.has('join_year')) profile.join_year = Number(u.join_year)
      if (changedUser.has('marital_status')) {
        profile.marital_status = (u.marital_status || undefined) as AppUser['marital_status']
      }
      if (changedUser.has('children_count')) {
        profile.children_count = u.children_count.trim() ? Number(u.children_count) : undefined
      }
      if (Object.keys(profile).length > 0) {
        const res = await dataService.updateUser(person.id, profile)
        if (res.error || !res.data) {
          failures.push(`Profile: ${res.error ?? 'update failed'}`)
        } else {
          latest = res.data
        }
      }

      // 2. Secondary sign-in phone (access change).
      if (changedUser.has('secondary_phone')) {
        const res = await updateSecondaryPhone(person.id, u.secondary_phone)
        if (res.error || !res.data) failures.push(`Secondary phone: ${res.error ?? 'update failed'}`)
        else latest = res.data
      }

      // 3. Role — the single path for access changes. Keep existing extra grants.
      if (changedUser.has('role')) {
        // Texts sign-in details only when the new role gives more access.
        const res = await updateUserAccess(person.id, u.role, person.permissions ?? [], { notify: true })
        if (res.error || !res.data) failures.push(`Role: ${res.error ?? 'update failed'}`)
        else latest = res.data
        if (res.sms && !res.sms.sent) failures.push(`Sign-in text: ${res.sms.error ?? 'not sent'}`)
      }

      // 4. Member profile.
      if (memberDirty.length > 0) {
        const mf = form.member
        const changedMember = new Set<keyof MemberForm>(memberDirty)
        const patch: Partial<Member> = {}
        const dobChanged = changedMember.has('dob_month') || changedMember.has('dob_day') || changedMember.has('dob_year')
        if (dobChanged && mf.dob_month && mf.dob_day.trim()) {
          const year = mf.dob_year.trim() ? Number(mf.dob_year) : MEMBER_DOB_PLACEHOLDER_YEAR
          patch.dob = `${year}-${mf.dob_month.padStart(2, '0')}-${mf.dob_day.trim().padStart(2, '0')}`
        }
        if (member) {
          const text = [
            'address', 'hometown', 'area_of_residence', 'school_or_workplace', 'date_of_baptism',
            'date_of_holy_ghost_baptism', 'previous_church', 'reason_for_leaving', 'notes',
          ] as const
          for (const key of text) {
            if (changedMember.has(key)) (patch as Record<string, unknown>)[key] = mf[key].trim()
          }
          if (changedMember.has('gender') && mf.gender) patch.gender = mf.gender as Member['gender']
          if (changedMember.has('status') && mf.status) patch.status = mf.status as MemberStatus
          if (changedMember.has('congregation') && mf.congregation) patch.congregation = mf.congregation as Congregation
          if (changedMember.has('is_visitor')) patch.is_visitor = mf.is_visitor
          if (changedMember.has('holy_ghost_baptism')) patch.holy_ghost_baptism = mf.holy_ghost_baptism
          if (changedMember.has('special_skills')) patch.special_skills = list(mf.special_skills)
          if (changedMember.has('interests')) patch.interests = list(mf.interests)
          if (Object.keys(patch).length > 0) {
            const res = await dataService.updateMember(member.id, patch)
            if (res.error) failures.push(`Member profile: ${res.error}`)
          }
        } else if (patch.dob) {
          const res = await dataService.createMember({ user_id: person.id, dob: patch.dob, status: 'active' })
          if (res.error) failures.push(`Member profile: ${res.error}`)
        }
      }

      if (failures.length > 0) {
        toast({
          variant: 'destructive',
          title: failures.length === dirtyCount ? 'Could not save changes' : 'Some changes were not saved',
          description: failures.join(' · '),
        })
        // Keep the dialog open so the admin can fix and retry; reload what did save.
        onSaved?.(latest)
        return
      }
      toast({
        title: 'Changes saved',
        description: `${latest.full_name}: ${dirtyCount} field${dirtyCount === 1 ? '' : 's'} updated.`,
      })
      setConfirmDiscard(false)
      onSaved?.(latest)
      onOpenChange(false)
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'Could not save changes',
        description: error instanceof Error ? error.message : 'Update failed',
      })
    } finally {
      setSaving(false)
    }
  }

  const isSelf = actor?.id === person?.id
  const u = form?.user
  const m = form?.member

  return (
    <Dialog open={open} onOpenChange={requestClose}>
      <DialogContent
        className="flex max-w-3xl flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl sm:p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="border-b border-neutral-200 px-4 py-4 pr-12 text-left dark:border-neutral-700 sm:px-6">
          <DialogTitle className="text-neutral-900 dark:text-neutral-100">Edit person</DialogTitle>
          <DialogDescription className="text-neutral-500 dark:text-neutral-400">
            {person ? (
              <>
                <span className="font-medium text-neutral-700 dark:text-neutral-200">{person.full_name}</span>
                {person.membership_id ? (
                  <>
                    {' · '}
                    <span className="font-mono text-neutral-700 dark:text-neutral-200">{person.membership_id}</span>
                  </>
                ) : null}
              </>
            ) : (
              'Account, access and member profile.'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          {loadError ? (
            <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              {loadError}
            </p>
          ) : !u || !m || !person ? (
            <div className="flex items-center justify-center py-16 text-neutral-500 dark:text-neutral-400">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              Loading…
            </div>
          ) : (
            <div className="space-y-6">
              <Section title="Name">
                <Field id="u-full-name" label="Display name" wide error={errors.full_name} dirty={dirty.has('full_name')}
                  hint="Shown across the app. Updates automatically when you edit the parts below.">
                  <Input id="u-full-name" value={u.full_name} onChange={(e) => setUser('full_name', e.target.value)} />
                </Field>
                <Field id="u-first" label="First name" dirty={dirty.has('first_name')}>
                  <Input id="u-first" value={u.first_name} onChange={(e) => setUser('first_name', e.target.value)} />
                </Field>
                <Field id="u-middle" label="Middle name" dirty={dirty.has('middle_name')}>
                  <Input id="u-middle" value={u.middle_name} onChange={(e) => setUser('middle_name', e.target.value)} />
                </Field>
                <Field id="u-last" label="Last name" dirty={dirty.has('last_name')}>
                  <Input id="u-last" value={u.last_name} onChange={(e) => setUser('last_name', e.target.value)} />
                </Field>
              </Section>

              <Section title="Contact">
                <Field id="u-phone" label="Main phone" error={errors.phone} hint="Their sign-in number." dirty={dirty.has('phone')}>
                  <Input id="u-phone" type="tel" inputMode="tel" value={u.phone} onChange={(e) => setUser('phone', e.target.value)} />
                </Field>
                <Field id="u-whatsapp" label="WhatsApp" error={errors.whatsapp} dirty={dirty.has('whatsapp')}>
                  <Input id="u-whatsapp" type="tel" inputMode="tel" value={u.whatsapp} onChange={(e) => setUser('whatsapp', e.target.value)} />
                </Field>
                <Field id="u-email" label="Email" error={errors.email} dirty={dirty.has('email')}>
                  <Input id="u-email" type="email" value={u.email} onChange={(e) => setUser('email', e.target.value)} />
                </Field>
              </Section>

              <Section title="Membership">
                <Field id="u-membership" label="Membership ID" error={errors.membership_id} dirty={dirty.has('membership_id')}
                  hint="Also used to sign in.">
                  <Input id="u-membership" className="font-mono" value={u.membership_id}
                    onChange={(e) => setUser('membership_id', e.target.value.toUpperCase())} />
                </Field>
                <Field id="u-join" label="Join year" error={errors.join_year} dirty={dirty.has('join_year')}>
                  <Input id="u-join" inputMode="numeric" value={u.join_year}
                    onChange={(e) => setUser('join_year', e.target.value.replace(/\D/g, '').slice(0, 4))} />
                </Field>
              </Section>

              {canManageUsers ? (
                <Section
                  title="Access"
                  description="Role and secondary sign-in phone. Extra permissions are managed in Access & roles."
                  action={
                    <Link href="/admin/admins" className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-brand-700 hover:underline dark:text-brand-400">
                      Access & roles <ExternalLink className="h-3 w-3" aria-hidden />
                    </Link>
                  }
                >
                  <Field id="u-role" label="Role" error={errors.role} dirty={dirty.has('role')}
                    hint={person.permissions?.length ? `${person.permissions.length} extra permission(s) are kept.` : undefined}>
                    <Select value={u.role} onValueChange={(v) => setUser('role', v as UserRole)}>
                      <SelectTrigger id="u-role"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {USER_ROLES.map((r) => (
                          <SelectItem
                            key={r}
                            value={r}
                            disabled={
                              (r === 'admin' && !canManageAdmins && person.role !== 'admin') ||
                              (person.role === 'admin' && !canManageAdmins && r !== 'admin') ||
                              (isSelf && person.role === 'admin' && r !== 'admin')
                            }
                          >
                            {ROLE_LABELS[r]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field id="u-secondary" label="Secondary phone" error={errors.secondary_phone} dirty={dirty.has('secondary_phone')}
                    hint="Also signs in, e.g. a number they changed to.">
                    <Input id="u-secondary" type="tel" inputMode="tel" value={u.secondary_phone}
                      onChange={(e) => setUser('secondary_phone', e.target.value)} />
                  </Field>
                </Section>
              ) : null}

              <Section title="Personal">
                <Field id="u-marital" label="Marital status" dirty={dirty.has('marital_status')}>
                  <Select value={u.marital_status || NONE} onValueChange={(v) => setUser('marital_status', v === NONE ? '' : v)}>
                    <SelectTrigger id="u-marital"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Not recorded</SelectItem>
                      {MARITAL.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field id="u-spouse" label="Spouse name" dirty={dirty.has('spouse_name')}>
                  <Input id="u-spouse" value={u.spouse_name} onChange={(e) => setUser('spouse_name', e.target.value)} />
                </Field>
                <Field id="u-anniversary" label="Wedding anniversary" dirty={dirty.has('anniversary_date')}>
                  <Input id="u-anniversary" type="date" value={u.anniversary_date} onChange={(e) => setUser('anniversary_date', e.target.value)} />
                </Field>
                <Field id="u-children" label="Number of children" error={errors.children_count} dirty={dirty.has('children_count')}>
                  <Input id="u-children" type="number" min={0} inputMode="numeric" value={u.children_count}
                    onChange={(e) => setUser('children_count', e.target.value)} />
                </Field>
                <Field id="u-occupation" label="Occupation" dirty={dirty.has('occupation')}>
                  <Input id="u-occupation" value={u.occupation} onChange={(e) => setUser('occupation', e.target.value)} />
                </Field>
                <Field id="u-work" label="Place of work" dirty={dirty.has('place_of_work')}>
                  <Input id="u-work" value={u.place_of_work} onChange={(e) => setUser('place_of_work', e.target.value)} />
                </Field>
              </Section>

              <Section title="Emergency contact">
                <Field id="u-ec-name" label="Name" dirty={dirty.has('emergency_contact_name')}>
                  <Input id="u-ec-name" value={u.emergency_contact_name} onChange={(e) => setUser('emergency_contact_name', e.target.value)} />
                </Field>
                <Field id="u-ec-relation" label="Relationship" dirty={dirty.has('emergency_contact_relation')}>
                  <Input id="u-ec-relation" value={u.emergency_contact_relation}
                    onChange={(e) => setUser('emergency_contact_relation', e.target.value)} placeholder="e.g. Mother" />
                </Field>
                <Field id="u-ec-phone" label="Phone" error={errors.emergency_contact_phone} dirty={dirty.has('emergency_contact_phone')}>
                  <Input id="u-ec-phone" type="tel" inputMode="tel" value={u.emergency_contact_phone}
                    onChange={(e) => setUser('emergency_contact_phone', e.target.value)} />
                </Field>
              </Section>

              <Section
                title="Member profile"
                description={
                  member
                    ? 'Directory details used for birthdays, groups and reports.'
                    : 'No member profile yet. Adding a birthday creates one; the other fields appear after that.'
                }
              >
                <Field id="u-dob-month" label="Birthday" wide dirty={dirty.has('dob_month') || dirty.has('dob_day') || dirty.has('dob_year')}
                  error={errors.dob_month ?? errors.dob_day ?? errors.dob_year}
                  hint={`Month and day are required; year is optional (stored as ${MEMBER_DOB_PLACEHOLDER_YEAR} until known).`}>
                  <div className="grid grid-cols-[1fr_5rem_6rem] gap-2">
                    <Select value={m.dob_month || undefined} onValueChange={(v) => setMemberField('dob_month', v)} disabled={!canManageMembers}>
                      <SelectTrigger id="u-dob-month" aria-label="Birth month"><SelectValue placeholder="Month" /></SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((name, i) => <SelectItem key={name} value={String(i + 1)}>{name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input aria-label="Birth day" inputMode="numeric" placeholder="Day" value={m.dob_day} disabled={!canManageMembers}
                      onChange={(e) => setMemberField('dob_day', e.target.value.replace(/\D/g, '').slice(0, 2))} />
                    <Input aria-label="Birth year" inputMode="numeric" placeholder="Year" value={m.dob_year} disabled={!canManageMembers}
                      onChange={(e) => setMemberField('dob_year', e.target.value.replace(/\D/g, '').slice(0, 4))} />
                  </div>
                </Field>

                {member ? (
                  <>
                    <Field id="u-gender" label="Gender" dirty={dirty.has('gender')}>
                      <Select value={m.gender || undefined} onValueChange={(v) => setMemberField('gender', v)} disabled={!canManageMembers}>
                        <SelectTrigger id="u-gender"><SelectValue placeholder="Not recorded" /></SelectTrigger>
                        <SelectContent>
                          {GENDERS.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field id="u-status" label="Member status" dirty={dirty.has('status')}>
                      <Select value={m.status || undefined} onValueChange={(v) => setMemberField('status', v)} disabled={!canManageMembers}>
                        <SelectTrigger id="u-status"><SelectValue placeholder="Not recorded" /></SelectTrigger>
                        <SelectContent>
                          {MEMBER_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field id="u-congregation" label="Congregation" dirty={dirty.has('congregation')}>
                      <Select value={m.congregation || undefined} onValueChange={(v) => setMemberField('congregation', v)} disabled={!canManageMembers}>
                        <SelectTrigger id="u-congregation"><SelectValue placeholder="Not recorded" /></SelectTrigger>
                        <SelectContent>
                          {CONGREGATIONS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </Field>
                    <div className="flex items-end">
                      <div className="w-full">
                        <CheckField id="u-visitor" label="Still a visitor" checked={m.is_visitor}
                          onChange={(v) => setMemberField('is_visitor', v)} dirty={dirty.has('is_visitor')} />
                      </div>
                    </div>
                    <Field id="u-address" label="Address" wide dirty={dirty.has('address')}>
                      <Textarea id="u-address" rows={2} value={m.address} disabled={!canManageMembers}
                        onChange={(e) => setMemberField('address', e.target.value)} />
                    </Field>
                    <Field id="u-hometown" label="Hometown" dirty={dirty.has('hometown')}>
                      <Input id="u-hometown" value={m.hometown} disabled={!canManageMembers} onChange={(e) => setMemberField('hometown', e.target.value)} />
                    </Field>
                    <Field id="u-area" label="Area of residence" dirty={dirty.has('area_of_residence')}>
                      <Input id="u-area" value={m.area_of_residence} disabled={!canManageMembers}
                        onChange={(e) => setMemberField('area_of_residence', e.target.value)} />
                    </Field>
                    <Field id="u-school" label="School or workplace" wide dirty={dirty.has('school_or_workplace')}>
                      <Input id="u-school" value={m.school_or_workplace} disabled={!canManageMembers}
                        onChange={(e) => setMemberField('school_or_workplace', e.target.value)} />
                    </Field>
                  </>
                ) : null}
              </Section>

              {member ? (
                <Section title="Faith journey">
                  <Field id="u-baptism" label="Water baptism date" dirty={dirty.has('date_of_baptism')}>
                    <Input id="u-baptism" type="date" value={m.date_of_baptism} disabled={!canManageMembers}
                      onChange={(e) => setMemberField('date_of_baptism', e.target.value)} />
                  </Field>
                  <div className="flex items-end">
                    <div className="w-full">
                      <CheckField id="u-hg" label="Baptised in the Holy Ghost" checked={m.holy_ghost_baptism}
                        onChange={(v) => setMemberField('holy_ghost_baptism', v)} dirty={dirty.has('holy_ghost_baptism')} />
                    </div>
                  </div>
                  {m.holy_ghost_baptism ? (
                    <Field id="u-hg-date" label="Holy Ghost baptism date" dirty={dirty.has('date_of_holy_ghost_baptism')}>
                      <Input id="u-hg-date" type="date" value={m.date_of_holy_ghost_baptism} disabled={!canManageMembers}
                        onChange={(e) => setMemberField('date_of_holy_ghost_baptism', e.target.value)} />
                    </Field>
                  ) : null}
                  <Field id="u-prev-church" label="Previous church" dirty={dirty.has('previous_church')}>
                    <Input id="u-prev-church" value={m.previous_church} disabled={!canManageMembers}
                      onChange={(e) => setMemberField('previous_church', e.target.value)} />
                  </Field>
                  <Field id="u-leaving" label="Reason for leaving" wide dirty={dirty.has('reason_for_leaving')}>
                    <Input id="u-leaving" value={m.reason_for_leaving} disabled={!canManageMembers}
                      onChange={(e) => setMemberField('reason_for_leaving', e.target.value)} />
                  </Field>
                  <Field id="u-skills" label="Special skills" hint="Separate with commas." dirty={dirty.has('special_skills')}>
                    <Input id="u-skills" value={m.special_skills} disabled={!canManageMembers}
                      onChange={(e) => setMemberField('special_skills', e.target.value)} />
                  </Field>
                  <Field id="u-interests" label="Interests" hint="Separate with commas." dirty={dirty.has('interests')}>
                    <Input id="u-interests" value={m.interests} disabled={!canManageMembers}
                      onChange={(e) => setMemberField('interests', e.target.value)} />
                  </Field>
                  <Field id="u-notes" label="Notes" wide dirty={dirty.has('notes')}>
                    <Textarea id="u-notes" rows={3} value={m.notes} disabled={!canManageMembers}
                      onChange={(e) => setMemberField('notes', e.target.value)} />
                  </Field>
                </Section>
              ) : null}
            </div>
          )}
        </div>

        <div className="border-t border-neutral-200 bg-white px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 dark:border-neutral-700 dark:bg-neutral-800 sm:px-6 sm:pb-3">
          {confirmDiscard ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-2 text-sm text-neutral-800 dark:text-neutral-200">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
                Discard {dirtyCount} unsaved change{dirtyCount === 1 ? '' : 's'}?
              </p>
              <div className="grid grid-cols-2 gap-2 sm:flex">
                <Button variant="outline" className="h-11 sm:h-10" onClick={() => setConfirmDiscard(false)}>Keep editing</Button>
                <Button variant="destructive" className="h-11 sm:h-10" onClick={() => requestClose(false)}>Discard</Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className={cn('min-h-5 text-sm text-neutral-500 dark:text-neutral-400', !isDirty && 'hidden sm:block')}>
                {isDirty ? (
                  <Badge variant="brand">{dirtyCount} unsaved change{dirtyCount === 1 ? '' : 's'}</Badge>
                ) : form ? 'No changes yet' : null}
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex">
                <Button variant="outline" className="h-11 sm:h-10" onClick={() => requestClose(false)} disabled={saving}>Cancel</Button>
                <Button className="h-11 sm:h-10" onClick={() => void handleSave()} disabled={!isDirty || saving || !form}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                      Saving…
                    </>
                  ) : 'Save changes'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
