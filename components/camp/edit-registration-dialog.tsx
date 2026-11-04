'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { AlertTriangle, ExternalLink, Loader2 } from 'lucide-react'

import type { CampRegistration } from '@/lib/types'
import { campService } from '@/lib/services/camp-service'
import { useAuth } from '@/components/providers'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { isValidGhanaPhone, sanitizePhoneInput } from '@/lib/camp/phone'
import { CAMP_RESIDENCE_OPTIONS, CAMP_RESIDENCE_OTHER } from '@/lib/camp/residence-locations'
import { campRegistrationRoleOptions } from '@/lib/camp/registration-roles'
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

/* -------------------------------------------------------------------------- */
/* Options                                                                    */
/* -------------------------------------------------------------------------- */

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const AGE_BRACKETS = ['1-12', '13-19', '20-29', '30-39', '40-49', '50+'] as const

const EDUCATION_LEVELS = [
  'JHS 1', 'JHS 2', 'JHS 3', 'SHS 1', 'SHS 2', 'SHS 3', 'COMPLETED SHS',
  'LEVEL 100', 'LEVEL 200', 'LEVEL 300', 'LEVEL 400', 'GRADUATED', 'POSTGRADUATE',
] as const

const QUALIFICATIONS = ['JHS', 'SHS', 'University'] as const

const STATUSES: Array<{ value: CampRegistration['status']; label: string }> = [
  { value: 'registered', label: 'Registered' },
  { value: 'checked_in', label: 'Checked in' },
  { value: 'cancelled', label: 'Cancelled' },
]

const PAYMENT_STATUSES: Array<{ value: NonNullable<CampRegistration['payment_status']>; label: string }> = [
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'refunded', label: 'Refunded' },
]

/** Radix Select can't use "" as an item value. */
const NONE = '__none__'

/* -------------------------------------------------------------------------- */
/* Form model                                                                 */
/* -------------------------------------------------------------------------- */

type FormState = {
  first_name: string
  last_name: string
  sex: string
  birth_month: string
  birth_day: string
  birth_year: string
  age_bracket: string
  phone: string
  whatsapp: string
  email: string
  facebook_username: string
  address_school_work: string
  education_level: string
  highest_qualification: string
  residence: string
  camp_location: string
  times_attended: string
  is_new_registrant: boolean
  has_nhis_card: boolean
  nhis_card_expiry_date: string
  has_health_challenge: boolean
  health_challenges: string
  parent_name: string
  parent_contact: string
  role: string
  status: CampRegistration['status']
  payment_status: string
  payment_amount: string
  payment_reference: string
  payment_date: string
  registration_notes: string
}

type FieldKey = keyof FormState

const FIELD_LABELS: Record<FieldKey, string> = {
  first_name: 'First name',
  last_name: 'Last name',
  sex: 'Sex',
  birth_month: 'Birth month',
  birth_day: 'Birth day',
  birth_year: 'Birth year',
  age_bracket: 'Age bracket',
  phone: 'Phone',
  whatsapp: 'WhatsApp',
  email: 'Email',
  facebook_username: 'Facebook',
  address_school_work: 'School / work address',
  education_level: 'Education level',
  highest_qualification: 'Highest qualification',
  residence: 'Residence',
  camp_location: 'Location note',
  times_attended: 'Times attended',
  is_new_registrant: 'First timer',
  has_nhis_card: 'NHIS card',
  nhis_card_expiry_date: 'NHIS expiry',
  has_health_challenge: 'Health challenge',
  health_challenges: 'Health challenges',
  parent_name: 'Guardian name',
  parent_contact: 'Guardian phone',
  role: 'Camp role',
  status: 'Status',
  payment_status: 'Payment status',
  payment_amount: 'Amount',
  payment_reference: 'Payment reference',
  payment_date: 'Payment date',
  registration_notes: 'Comments',
}

/** Any stored date string → YYYY-MM-DD for <input type="date">, or '' if unparseable. */
function toDateInput(value?: string): string {
  const raw = value?.trim()
  if (!raw) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

function splitName(reg: CampRegistration): { first: string; last: string } {
  const first = reg.first_name?.trim()
  const last = reg.last_name?.trim()
  if (first || last) return { first: first ?? '', last: last ?? '' }
  const parts = (reg.full_name ?? '').trim().split(/\s+/).filter(Boolean)
  return { first: parts[0] ?? '', last: parts.slice(1).join(' ') }
}

function formFromRegistration(reg: CampRegistration): FormState {
  const { first, last } = splitName(reg)
  const iso = reg.date_of_birth?.trim() ?? ''
  const isoMatch = iso.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  const month = reg.birth_month ?? (isoMatch ? Number(isoMatch[2]) : undefined)
  const day = reg.birth_day ?? (isoMatch ? Number(isoMatch[3]) : undefined)
  return {
    first_name: first,
    last_name: last,
    sex: reg.sex ?? '',
    birth_month: month != null ? String(month) : '',
    birth_day: day != null ? String(day) : '',
    birth_year: isoMatch ? isoMatch[1] : '',
    age_bracket: reg.age_bracket ?? '',
    phone: reg.phone && reg.phone !== 'N/A' ? reg.phone : '',
    whatsapp: reg.whatsapp ?? '',
    email: reg.email?.trim() ?? '',
    facebook_username: reg.facebook_username ?? '',
    address_school_work: reg.address_school_work ?? '',
    education_level: reg.education_level ?? '',
    highest_qualification: reg.highest_qualification ?? '',
    residence: reg.residence ?? '',
    camp_location: reg.camp_location ?? '',
    times_attended: reg.times_attended != null ? String(reg.times_attended) : '',
    is_new_registrant: Boolean(reg.is_new_registrant),
    has_nhis_card: Boolean(reg.has_nhis_card),
    nhis_card_expiry_date: toDateInput(reg.nhis_card_expiry_date),
    has_health_challenge: Boolean(reg.has_health_challenge),
    health_challenges: (reg.health_challenges ?? []).join('\n'),
    parent_name: reg.parent_name ?? '',
    parent_contact: reg.parent_contact ?? '',
    role: reg.role?.trim() || 'Participant',
    status: reg.status ?? 'registered',
    payment_status: reg.payment_status ?? '',
    payment_amount: reg.payment_amount != null ? String(reg.payment_amount) : '',
    payment_reference: reg.payment_reference ?? '',
    payment_date: toDateInput(reg.payment_date),
    registration_notes: reg.registration_notes ?? '',
  }
}

function changedKeys(initial: FormState, current: FormState): FieldKey[] {
  return (Object.keys(initial) as FieldKey[]).filter((k) => initial[k] !== current[k])
}

function parseList(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function daysInMonth(month: number, year?: number): number {
  return new Date(year ?? 2000, month, 0).getDate()
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type BuildResult =
  | { ok: true; patch: Record<string, unknown> }
  | { ok: false; errors: Partial<Record<FieldKey, string>> }

/**
 * Turn the changed fields into a Convex patch. Only changed keys are sent.
 * A cleared optional field is sent as `null`, which removes it.
 */
function buildPatch(initial: FormState, form: FormState): BuildResult {
  const changed = new Set(changedKeys(initial, form))
  const errors: Partial<Record<FieldKey, string>> = {}
  const patch: Record<string, unknown> = {}

  const text = (key: FieldKey) => {
    if (changed.has(key)) patch[key] = String(form[key]).trim()
  }

  // Identity
  if (changed.has('first_name') || changed.has('last_name')) {
    const first = form.first_name.trim()
    const last = form.last_name.trim()
    if (!first) errors.first_name = 'First name is required.'
    patch.first_name = first
    patch.last_name = last
    patch.full_name = `${first} ${last}`.trim()
  }
  if (changed.has('sex')) patch.sex = form.sex || null

  if (changed.has('birth_month') || changed.has('birth_day') || changed.has('birth_year')) {
    const mRaw = form.birth_month.trim()
    const dRaw = form.birth_day.trim()
    const yRaw = form.birth_year.trim()
    const m = mRaw ? Number(mRaw) : NaN
    const d = dRaw ? Number(dRaw) : NaN
    const y = yRaw ? Number(yRaw) : undefined
    const thisYear = new Date().getFullYear()
    if (!mRaw && !dRaw) {
      if (initial.birth_month || initial.birth_day) {
        patch.birth_month = null
        patch.birth_day = null
        patch.date_of_birth = null
      } else if (yRaw) {
        errors.birth_day = 'Add the month and day too.'
      }
    } else if (!mRaw || !dRaw) {
      errors.birth_day = 'Enter both month and day.'
    } else if (!Number.isInteger(m) || m < 1 || m > 12) {
      errors.birth_month = 'Pick a month.'
    } else if (y !== undefined && (!Number.isInteger(y) || y < 1900 || y > thisYear)) {
      errors.birth_year = `Enter a year between 1900 and ${thisYear}, or leave it blank.`
    } else if (!Number.isInteger(d) || d < 1 || d > daysInMonth(m, y)) {
      errors.birth_day = `${MONTHS[m - 1]} has ${daysInMonth(m, y)} days.`
    } else {
      patch.birth_month = m
      patch.birth_day = d
      if (y !== undefined) {
        patch.date_of_birth = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      } else if (initial.birth_year) {
        // Year removed: drop the full date, keep month/day for recurring birthdays.
        patch.date_of_birth = ''
      }
    }
  }
  if (changed.has('age_bracket')) patch.age_bracket = form.age_bracket || null

  // Contact
  if (changed.has('phone')) {
    const raw = form.phone.trim()
    if (!raw) errors.phone = 'Phone number is required.'
    else if (!isValidGhanaPhone(raw)) errors.phone = 'Enter a valid Ghana number, e.g. 024 123 4567.'
    else patch.phone = sanitizePhoneInput(raw)
  }
  for (const key of ['whatsapp', 'parent_contact'] as const) {
    if (!changed.has(key)) continue
    const raw = form[key].trim()
    if (!raw) patch[key] = ''
    else if (!isValidGhanaPhone(raw)) errors[key] = 'Enter a valid Ghana number or leave it blank.'
    else patch[key] = sanitizePhoneInput(raw)
  }
  if (changed.has('email')) {
    const raw = form.email.trim()
    if (raw && !EMAIL_RE.test(raw)) errors.email = 'Enter a valid email address or leave it blank.'
    else patch.email = raw.toLowerCase()
  }
  if (changed.has('facebook_username')) {
    patch.facebook_username = form.facebook_username.trim().replace(/^@/, '')
  }

  // Background
  text('address_school_work')
  text('education_level')
  text('highest_qualification')
  text('residence')
  text('camp_location')
  if (changed.has('times_attended')) {
    const raw = form.times_attended.trim()
    const n = Number(raw)
    if (!raw) patch.times_attended = null
    else if (!Number.isInteger(n) || n < 0 || n > 200) errors.times_attended = 'Enter a whole number.'
    else patch.times_attended = n
  }
  if (changed.has('is_new_registrant')) patch.is_new_registrant = form.is_new_registrant

  // Health
  if (changed.has('has_nhis_card')) patch.has_nhis_card = form.has_nhis_card
  text('nhis_card_expiry_date')
  if (changed.has('has_health_challenge')) patch.has_health_challenge = form.has_health_challenge
  if (changed.has('health_challenges')) patch.health_challenges = parseList(form.health_challenges)

  // Guardian
  text('parent_name')

  // Camp
  if (changed.has('role')) {
    const role = form.role.trim()
    if (!role) errors.role = 'Pick or type a camp role.'
    else patch.role = role
  }
  if (changed.has('status')) patch.status = form.status

  // Payment
  if (changed.has('payment_status')) patch.payment_status = form.payment_status || null
  if (changed.has('payment_amount')) {
    const raw = form.payment_amount.trim()
    const n = Number(raw)
    if (!raw) patch.payment_amount = null
    else if (!Number.isFinite(n) || n < 0) errors.payment_amount = 'Enter an amount of 0 or more.'
    else patch.payment_amount = Math.round(n * 100) / 100
  }
  text('payment_reference')
  if (changed.has('payment_date')) {
    patch.payment_date = form.payment_date ? new Date(`${form.payment_date}T00:00:00.000Z`).toISOString() : ''
  }

  // Notes
  text('registration_notes')

  if (Object.keys(errors).length > 0) return { ok: false, errors }
  return { ok: true, patch }
}

/* -------------------------------------------------------------------------- */
/* Layout helpers                                                             */
/* -------------------------------------------------------------------------- */

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="space-y-3 border-t border-neutral-200 pt-5 first:border-t-0 first:pt-0 dark:border-neutral-700">
      <div>
        <h3 className="app-overline">{title}</h3>
        {description ? (
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{description}</p>
        ) : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  )
}

function Field({
  id,
  label,
  error,
  hint,
  wide,
  dirty,
  children,
}: {
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
        <Label htmlFor={id} className="text-neutral-800 dark:text-neutral-200">
          {label}
        </Label>
        {dirty ? (
          <span
            className="h-1.5 w-1.5 rounded-full bg-brand-500 dark:bg-brand-400"
            aria-label="Changed"
            title="Changed"
          />
        ) : null}
      </div>
      {children}
      {error ? (
        <p className="text-xs text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-neutral-500 dark:text-neutral-400">{hint}</p>
      ) : null}
    </div>
  )
}

function CheckField({
  id,
  label,
  description,
  checked,
  onChange,
  dirty,
}: {
  id: string
  label: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
  dirty?: boolean
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-3 rounded-lg border border-neutral-200 bg-white p-3 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900/40 dark:hover:bg-neutral-800"
    >
      <Checkbox id={id} checked={checked} onCheckedChange={(v) => onChange(v === true)} className="mt-0.5" />
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 text-sm font-medium text-neutral-900 dark:text-neutral-100">
          {label}
          {dirty ? <span className="h-1.5 w-1.5 rounded-full bg-brand-500 dark:bg-brand-400" aria-hidden /> : null}
        </span>
        {description ? (
          <span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">{description}</span>
        ) : null}
      </span>
    </label>
  )
}

/* -------------------------------------------------------------------------- */
/* Dialog                                                                     */
/* -------------------------------------------------------------------------- */

export type EditRegistrationDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The registration to edit. If omitted, it's loaded from `registrationId` when the dialog opens. */
  registration?: CampRegistration | null
  registrationId?: string
  onSaved?: (updated: CampRegistration) => void
}

export function EditRegistrationDialog({
  open,
  onOpenChange,
  registration,
  registrationId,
  onSaved,
}: EditRegistrationDialogProps) {
  const { toast } = useToast()
  const { user } = useAuth()

  const [loaded, setLoaded] = useState<CampRegistration | null>(registration ?? null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [initial, setInitial] = useState<FormState | null>(null)
  const [form, setForm] = useState<FormState | null>(null)
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({})
  const [saving, setSaving] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  const targetId = registration?.id ?? registrationId

  // Reset the form each time the dialog opens (or the record changes underneath it).
  useEffect(() => {
    if (!open) return
    setErrors({})
    setConfirmDiscard(false)
    setLoadError(null)
    if (registration) {
      const f = formFromRegistration(registration)
      setLoaded(registration)
      setInitial(f)
      setForm(f)
      return
    }
    if (!registrationId) return
    let cancelled = false
    setLoaded(null)
    setInitial(null)
    setForm(null)
    void campService.getRegistration(registrationId).then((res) => {
      if (cancelled) return
      if (!res.data) {
        setLoadError(res.error ?? 'Registration not found')
        return
      }
      const f = formFromRegistration(res.data)
      setLoaded(res.data)
      setInitial(f)
      setForm(f)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, registration?.id, registration?.updated_at, registrationId])

  const dirtyKeys = useMemo(() => (initial && form ? changedKeys(initial, form) : []), [initial, form])
  const dirtySet = useMemo(() => new Set(dirtyKeys), [dirtyKeys])
  const isDirty = dirtyKeys.length > 0

  function set<K extends FieldKey>(key: K, value: FormState[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev))
    setConfirmDiscard(false)
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }
  }

  function requestClose(nextOpen: boolean) {
    if (nextOpen) {
      onOpenChange(true)
      return
    }
    if (saving) return
    if (isDirty && !confirmDiscard) {
      setConfirmDiscard(true)
      return
    }
    setConfirmDiscard(false)
    onOpenChange(false)
  }

  async function handleSave() {
    if (!initial || !form || !loaded || !targetId) return
    const result = buildPatch(initial, form)
    if (!result.ok) {
      setErrors(result.errors)
      toast({
        variant: 'destructive',
        title: 'Check the highlighted fields',
        description: Object.values(result.errors)[0],
      })
      return
    }
    if (Object.keys(result.patch).length === 0) return

    setSaving(true)
    try {
      const res = await campService.updateRegistration(targetId, result.patch)
      if (res.error || !res.data) {
        toast({ variant: 'destructive', title: 'Could not save changes', description: res.error ?? 'Update failed' })
        return
      }
      const changedLabels = Array.from(new Set(dirtyKeys.map((k) => FIELD_LABELS[k])))
      if (user?.id) {
        // Audit trail on the registration timeline; failure here shouldn't block the save.
        void campService
          .addInteraction({
            registration_id: targetId,
            performed_by: user.id,
            interaction_type: 'note',
            notes: `Details edited: ${changedLabels.join(', ')}`,
          })
          .catch(() => undefined)
      }
      toast({
        title: 'Registration updated',
        description: `${res.data.full_name || 'Registrant'}: ${changedLabels.length} field${
          changedLabels.length === 1 ? '' : 's'
        } saved.`,
      })
      setConfirmDiscard(false)
      onSaved?.(res.data)
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

  const residenceIsListed = form ? CAMP_RESIDENCE_OPTIONS.includes(form.residence) : false
  const residenceSelect = !form
    ? ''
    : residenceIsListed
      ? form.residence
      : form.residence.trim()
        ? CAMP_RESIDENCE_OTHER
        : NONE
  const educationOptions =
    form?.education_level && !(EDUCATION_LEVELS as readonly string[]).includes(form.education_level)
      ? [form.education_level, ...EDUCATION_LEVELS]
      : [...EDUCATION_LEVELS]
  const qualificationOptions =
    form?.highest_qualification && !(QUALIFICATIONS as readonly string[]).includes(form.highest_qualification)
      ? [form.highest_qualification, ...QUALIFICATIONS]
      : [...QUALIFICATIONS]
  const roleOptions = campRegistrationRoleOptions(loaded?.role)
  const roleIsListed = form ? roleOptions.includes(form.role) : true

  const name = loaded ? loaded.full_name || `${loaded.first_name ?? ''} ${loaded.last_name ?? ''}`.trim() : ''

  return (
    <Dialog open={open} onOpenChange={requestClose}>
      <DialogContent
        className="flex max-w-3xl flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl sm:p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="border-b border-neutral-200 px-4 py-4 pr-12 text-left dark:border-neutral-700 sm:px-6">
          <DialogTitle className="text-neutral-900 dark:text-neutral-100">Edit registration</DialogTitle>
          <DialogDescription className="text-neutral-500 dark:text-neutral-400">
            {name ? (
              <>
                Correct any detail for <span className="font-medium text-neutral-700 dark:text-neutral-200">{name}</span>.
                {loaded?.check_in_code ? (
                  <>
                    {' '}
                    Code <span className="font-mono text-neutral-700 dark:text-neutral-200">{loaded.check_in_code}</span>.
                  </>
                ) : null}
              </>
            ) : (
              'Correct any detail on this camp registration.'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          {loadError ? (
            <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              {loadError}
            </p>
          ) : !form || !loaded ? (
            <div className="flex items-center justify-center py-16 text-neutral-500 dark:text-neutral-400">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              Loading registration…
            </div>
          ) : (
            <div className="space-y-6">
              {loaded.user_id ? (
                <div className="flex flex-col gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900/50 dark:text-neutral-300 sm:flex-row sm:items-center sm:justify-between">
                  <span>
                    Linked to a directory account. Edits here change this camp registration only.
                  </span>
                  <Link
                    href={`/admin/users/${loaded.user_id}`}
                    className="inline-flex shrink-0 items-center gap-1 font-medium text-brand-700 hover:underline dark:text-brand-400"
                  >
                    Open user profile <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                </div>
              ) : null}

              <Section title="Identity">
                <Field id="reg-first-name" label="First name" error={errors.first_name} dirty={dirtySet.has('first_name')}>
                  <Input
                    id="reg-first-name"
                    value={form.first_name}
                    onChange={(e) => set('first_name', e.target.value)}
                    autoComplete="off"
                  />
                </Field>
                <Field id="reg-last-name" label="Last name" error={errors.last_name} dirty={dirtySet.has('last_name')}>
                  <Input
                    id="reg-last-name"
                    value={form.last_name}
                    onChange={(e) => set('last_name', e.target.value)}
                    autoComplete="off"
                  />
                </Field>
                <Field id="reg-sex" label="Sex" dirty={dirtySet.has('sex')}>
                  <Select value={form.sex || NONE} onValueChange={(v) => set('sex', v === NONE ? '' : v)}>
                    <SelectTrigger id="reg-sex">
                      <SelectValue placeholder="Not recorded" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Not recorded</SelectItem>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field id="reg-age" label="Age bracket" dirty={dirtySet.has('age_bracket')}>
                  <Select value={form.age_bracket || NONE} onValueChange={(v) => set('age_bracket', v === NONE ? '' : v)}>
                    <SelectTrigger id="reg-age">
                      <SelectValue placeholder="Not recorded" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Not recorded</SelectItem>
                      {AGE_BRACKETS.map((b) => (
                        <SelectItem key={b} value={b}>
                          {b}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field
                  id="reg-birth-month"
                  label="Date of birth"
                  wide
                  error={errors.birth_month ?? errors.birth_day ?? errors.birth_year}
                  hint="Month and day drive birthday reminders. Year is optional."
                  dirty={dirtySet.has('birth_month') || dirtySet.has('birth_day') || dirtySet.has('birth_year')}
                >
                  <div className="grid grid-cols-[minmax(0,1fr)_4.5rem_5.5rem] gap-2">
                    <Select
                      value={form.birth_month || undefined}
                      onValueChange={(v) => set('birth_month', v)}
                    >
                      <SelectTrigger id="reg-birth-month" aria-label="Birth month">
                        <SelectValue placeholder="Month" />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((m, i) => (
                          <SelectItem key={m} value={String(i + 1)}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      aria-label="Birth day"
                      inputMode="numeric"
                      placeholder="Day"
                      value={form.birth_day}
                      onChange={(e) => set('birth_day', e.target.value.replace(/\D/g, '').slice(0, 2))}
                    />
                    <Input
                      aria-label="Birth year"
                      inputMode="numeric"
                      placeholder="Year"
                      value={form.birth_year}
                      onChange={(e) => set('birth_year', e.target.value.replace(/\D/g, '').slice(0, 4))}
                    />
                  </div>
                </Field>
              </Section>

              <Section title="Contact">
                <Field
                  id="reg-phone"
                  label="Phone"
                  error={errors.phone}
                  hint="Used for check-in and SMS."
                  dirty={dirtySet.has('phone')}
                >
                  <Input
                    id="reg-phone"
                    type="tel"
                    inputMode="tel"
                    value={form.phone}
                    onChange={(e) => set('phone', e.target.value)}
                    placeholder="024 123 4567"
                  />
                </Field>
                <Field id="reg-whatsapp" label="WhatsApp" error={errors.whatsapp} dirty={dirtySet.has('whatsapp')}>
                  <Input
                    id="reg-whatsapp"
                    type="tel"
                    inputMode="tel"
                    value={form.whatsapp}
                    onChange={(e) => set('whatsapp', e.target.value)}
                    placeholder="Same as phone if blank"
                  />
                </Field>
                <Field id="reg-email" label="Email" error={errors.email} dirty={dirtySet.has('email')}>
                  <Input
                    id="reg-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => set('email', e.target.value)}
                  />
                </Field>
                <Field id="reg-facebook" label="Facebook username" dirty={dirtySet.has('facebook_username')}>
                  <Input
                    id="reg-facebook"
                    value={form.facebook_username}
                    onChange={(e) => set('facebook_username', e.target.value)}
                  />
                </Field>
              </Section>

              <Section title="Background">
                <Field id="reg-residence" label="Residence / area" dirty={dirtySet.has('residence')}>
                  <Select
                    value={residenceSelect}
                    onValueChange={(v) => {
                      if (v === NONE) set('residence', '')
                      else if (v === CAMP_RESIDENCE_OTHER) set('residence', residenceIsListed || !form.residence ? CAMP_RESIDENCE_OTHER : form.residence)
                      else set('residence', v)
                    }}
                  >
                    <SelectTrigger id="reg-residence">
                      <SelectValue placeholder="Not recorded" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Not recorded</SelectItem>
                      {CAMP_RESIDENCE_OPTIONS.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {residenceSelect === CAMP_RESIDENCE_OTHER ? (
                    <Input
                      aria-label="Residence (other)"
                      className="mt-2"
                      placeholder="Type the town or area"
                      value={form.residence === CAMP_RESIDENCE_OTHER ? '' : form.residence}
                      onChange={(e) => set('residence', e.target.value || CAMP_RESIDENCE_OTHER)}
                    />
                  ) : null}
                </Field>
                <Field
                  id="reg-camp-location"
                  label="Location note"
                  hint="Where they are coming from or staying during camp."
                  dirty={dirtySet.has('camp_location')}
                >
                  <Input
                    id="reg-camp-location"
                    value={form.camp_location}
                    onChange={(e) => set('camp_location', e.target.value)}
                  />
                </Field>
                <Field id="reg-address" label="School / work address" wide dirty={dirtySet.has('address_school_work')}>
                  <Textarea
                    id="reg-address"
                    rows={2}
                    value={form.address_school_work}
                    onChange={(e) => set('address_school_work', e.target.value)}
                  />
                </Field>
                <Field id="reg-education" label="Education level" dirty={dirtySet.has('education_level')}>
                  <Select
                    value={form.education_level || NONE}
                    onValueChange={(v) => set('education_level', v === NONE ? '' : v)}
                  >
                    <SelectTrigger id="reg-education">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Not recorded</SelectItem>
                      {educationOptions.map((o) => (
                        <SelectItem key={o} value={o}>
                          {o}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field id="reg-qualification" label="Highest qualification" dirty={dirtySet.has('highest_qualification')}>
                  <Select
                    value={form.highest_qualification || NONE}
                    onValueChange={(v) => set('highest_qualification', v === NONE ? '' : v)}
                  >
                    <SelectTrigger id="reg-qualification">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Not recorded</SelectItem>
                      {qualificationOptions.map((o) => (
                        <SelectItem key={o} value={o}>
                          {o}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field
                  id="reg-times"
                  label="Times attended before"
                  error={errors.times_attended}
                  dirty={dirtySet.has('times_attended')}
                >
                  <Input
                    id="reg-times"
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={form.times_attended}
                    onChange={(e) => set('times_attended', e.target.value)}
                  />
                </Field>
                <div className="flex items-end">
                  <div className="w-full">
                    <CheckField
                      id="reg-new"
                      label="First-time camper"
                      description="Shown as First timer on lists and reports."
                      checked={form.is_new_registrant}
                      onChange={(v) => set('is_new_registrant', v)}
                      dirty={dirtySet.has('is_new_registrant')}
                    />
                  </div>
                </div>
              </Section>

              <Section title="Health">
                <CheckField
                  id="reg-nhis"
                  label="Has an NHIS card"
                  checked={form.has_nhis_card}
                  onChange={(v) => set('has_nhis_card', v)}
                  dirty={dirtySet.has('has_nhis_card')}
                />
                {form.has_nhis_card ? (
                  <Field id="reg-nhis-expiry" label="NHIS expiry date" dirty={dirtySet.has('nhis_card_expiry_date')}>
                    <Input
                      id="reg-nhis-expiry"
                      type="date"
                      value={form.nhis_card_expiry_date}
                      onChange={(e) => set('nhis_card_expiry_date', e.target.value)}
                    />
                  </Field>
                ) : (
                  <div className="hidden sm:block" />
                )}
                <CheckField
                  id="reg-health"
                  label="Has a health challenge"
                  checked={form.has_health_challenge}
                  onChange={(v) => set('has_health_challenge', v)}
                  dirty={dirtySet.has('has_health_challenge')}
                />
                {form.has_health_challenge ? (
                  <Field
                    id="reg-health-list"
                    label="Health challenges"
                    wide
                    hint="One per line (or separated by commas)."
                    dirty={dirtySet.has('health_challenges')}
                  >
                    <Textarea
                      id="reg-health-list"
                      rows={3}
                      value={form.health_challenges}
                      onChange={(e) => set('health_challenges', e.target.value)}
                      placeholder={'Asthma\nSickle cell'}
                    />
                  </Field>
                ) : null}
              </Section>

              <Section title="Parent / guardian">
                <Field id="reg-parent-name" label="Name" dirty={dirtySet.has('parent_name')}>
                  <Input
                    id="reg-parent-name"
                    value={form.parent_name}
                    onChange={(e) => set('parent_name', e.target.value)}
                  />
                </Field>
                <Field id="reg-parent-contact" label="Phone" error={errors.parent_contact} dirty={dirtySet.has('parent_contact')}>
                  <Input
                    id="reg-parent-contact"
                    type="tel"
                    inputMode="tel"
                    value={form.parent_contact}
                    onChange={(e) => set('parent_contact', e.target.value)}
                  />
                </Field>
              </Section>

              <Section title="Camp">
                <Field id="reg-role" label="Camp role" error={errors.role} dirty={dirtySet.has('role')}>
                  <Select
                    value={roleIsListed ? form.role : ''}
                    onValueChange={(v) => set('role', v)}
                  >
                    <SelectTrigger id="reg-role">
                      <SelectValue placeholder={form.role || 'Select role'} />
                    </SelectTrigger>
                    <SelectContent>
                      {roleOptions.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    aria-label="Custom camp role"
                    className="mt-2"
                    placeholder="Or type a custom role"
                    value={form.role}
                    onChange={(e) => set('role', e.target.value)}
                  />
                </Field>
                <Field id="reg-status" label="Registration status" dirty={dirtySet.has('status')}>
                  <Select
                    value={form.status}
                    onValueChange={(v) => set('status', v as CampRegistration['status'])}
                  >
                    <SelectTrigger id="reg-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </Section>

              <Section title="Payment">
                <Field id="reg-pay-status" label="Payment status" dirty={dirtySet.has('payment_status')}>
                  <Select
                    value={form.payment_status || NONE}
                    onValueChange={(v) => set('payment_status', v === NONE ? '' : v)}
                  >
                    <SelectTrigger id="reg-pay-status">
                      <SelectValue placeholder="Not recorded" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Not recorded</SelectItem>
                      {PAYMENT_STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field
                  id="reg-pay-amount"
                  label="Amount (₵)"
                  error={errors.payment_amount}
                  dirty={dirtySet.has('payment_amount')}
                >
                  <Input
                    id="reg-pay-amount"
                    type="number"
                    min={0}
                    step="0.01"
                    inputMode="decimal"
                    value={form.payment_amount}
                    onChange={(e) => set('payment_amount', e.target.value)}
                  />
                </Field>
                <Field id="reg-pay-ref" label="Reference" dirty={dirtySet.has('payment_reference')}>
                  <Input
                    id="reg-pay-ref"
                    value={form.payment_reference}
                    onChange={(e) => set('payment_reference', e.target.value)}
                    placeholder="MoMo or receipt reference"
                  />
                </Field>
                <Field id="reg-pay-date" label="Payment date" dirty={dirtySet.has('payment_date')}>
                  <Input
                    id="reg-pay-date"
                    type="date"
                    value={form.payment_date}
                    onChange={(e) => set('payment_date', e.target.value)}
                  />
                </Field>
              </Section>

              <Section title="Notes">
                <Field
                  id="reg-notes"
                  label="Comments from registration"
                  wide
                  dirty={dirtySet.has('registration_notes')}
                >
                  <Textarea
                    id="reg-notes"
                    rows={3}
                    value={form.registration_notes}
                    onChange={(e) => set('registration_notes', e.target.value)}
                  />
                </Field>
              </Section>
            </div>
          )}
        </div>

        <div className="border-t border-neutral-200 bg-white px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 dark:border-neutral-700 dark:bg-neutral-900 sm:px-6 sm:pb-3">
          {confirmDiscard ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-2 text-sm text-neutral-800 dark:text-neutral-200">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
                Discard {dirtyKeys.length} unsaved change{dirtyKeys.length === 1 ? '' : 's'}?
              </p>
              <div className="flex flex-col-reverse gap-2 sm:flex-row [&>button]:min-h-11 [&>button]:w-full sm:[&>button]:min-h-0 sm:[&>button]:w-auto">
                <Button variant="outline" onClick={() => setConfirmDiscard(false)}>
                  Keep editing
                </Button>
                <Button variant="destructive" onClick={() => requestClose(false)}>
                  Discard changes
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-h-5 text-sm text-neutral-500 dark:text-neutral-400">
                {isDirty ? (
                  <Badge variant="brand">
                    {dirtyKeys.length} unsaved change{dirtyKeys.length === 1 ? '' : 's'}
                  </Badge>
                ) : form ? (
                  'No changes yet'
                ) : null}
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row [&>button]:min-h-11 [&>button]:w-full sm:[&>button]:min-h-0 sm:[&>button]:w-auto">
                <Button variant="outline" onClick={() => requestClose(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button onClick={() => void handleSave()} disabled={!isDirty || saving || !form}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                      Saving…
                    </>
                  ) : (
                    'Save changes'
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
