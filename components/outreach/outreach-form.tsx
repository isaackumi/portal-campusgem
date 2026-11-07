'use client'

import { useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { LoadingSpinner } from '@/components/ui/loading'
import { cn } from '@/lib/utils'
import { hallSuggestions, MINISTRY_INTERESTS, OUTREACH_LEVELS } from '@/lib/outreach/options'
import { validateOutreachAnswers, type OutreachField } from '@/lib/outreach/validate'
import type { OutreachAnswers, OutreachResidence } from '@/lib/outreach/types'

/**
 * The outreach form, shared by the public QR page (/o/<slug>, the student fills it) and the
 * signed-in "Add a person" / Edit sheet (a GEM member fills it). One scrollable page with a
 * sticky submit bar; errors show next to each field. The server validates again.
 */

export type OutreachFormValues = {
  full_name: string
  phone: string
  whatsappSame: boolean
  whatsapp: string
  student_id: string
  level: string
  programme: string
  residence: OutreachResidence | ''
  hall: string
  room: string
  area: string
  ministry_interests: string[]
  ministry_other: string
  bible_study: 'yes' | 'no' | ''
  prayer_request: string
}

export const EMPTY_OUTREACH_FORM: OutreachFormValues = {
  full_name: '',
  phone: '',
  whatsappSame: true,
  whatsapp: '',
  student_id: '',
  level: '',
  programme: '',
  residence: '',
  hall: '',
  room: '',
  area: '',
  ministry_interests: [],
  ministry_other: '',
  bible_study: '',
  prayer_request: '',
}

function localPhone(phone: string | undefined): string {
  if (!phone) return ''
  return /^\+233\d{9}$/.test(phone) ? `0${phone.slice(4)}` : phone
}

/** Form values from a saved contact (Edit). */
export function outreachFormFrom(a: Partial<OutreachAnswers>): OutreachFormValues {
  return {
    full_name: a.full_name ?? '',
    phone: localPhone(a.phone),
    whatsappSame: !a.whatsapp || a.whatsapp === a.phone,
    whatsapp: a.whatsapp && a.whatsapp !== a.phone ? localPhone(a.whatsapp) : '',
    student_id: a.student_id ?? '',
    level: a.level ?? '',
    programme: a.programme ?? '',
    residence: a.residence ?? '',
    hall: a.hall ?? '',
    room: a.room ?? '',
    area: a.area ?? '',
    ministry_interests: a.ministry_interests ?? [],
    ministry_other: a.ministry_other ?? '',
    bible_study: a.bible_study ?? '',
    prayer_request: a.prayer_request ?? '',
  }
}

/** What goes to the server action. */
export function outreachPayload(v: OutreachFormValues) {
  return {
    full_name: v.full_name,
    phone: v.phone,
    whatsapp: v.whatsappSame ? '' : v.whatsapp,
    student_id: v.student_id,
    level: v.level || undefined,
    programme: v.programme,
    residence: v.residence || undefined,
    hall: v.hall,
    room: v.room,
    area: v.area,
    ministry_interests: v.ministry_interests,
    ministry_other: v.ministry_other,
    bible_study: v.bible_study || undefined,
    prayer_request: v.prayer_request,
  }
}

export type OutreachFormErrors = Partial<Record<OutreachField, string>>

const FIELD_ORDER: OutreachField[] = ['full_name', 'phone', 'whatsapp', 'student_id', 'level', 'programme', 'hall', 'room', 'area', 'ministry_other', 'prayer_request']

export function OutreachForm({
  mode,
  campusShortCode,
  initial,
  submitLabel,
  againLabel,
  onSubmit,
  serverError,
  formKey,
}: {
  /** `qr`: the student fills it ("you"). `member`: a GEM member fills it for someone. */
  mode: 'qr' | 'member'
  campusShortCode?: string | null
  initial?: OutreachFormValues
  submitLabel: string
  /** Second button (member mode): "Save and add another". */
  againLabel?: string
  /** Return field errors to show them inline; resolve true when saved. */
  onSubmit: (payload: ReturnType<typeof outreachPayload>, again: boolean) => Promise<OutreachFormErrors | true>
  serverError?: string | null
  /** Change to reset the form. */
  formKey?: number
}) {
  return (
    <OutreachFormInner
      key={formKey ?? 0}
      mode={mode}
      campusShortCode={campusShortCode}
      initial={initial}
      submitLabel={submitLabel}
      againLabel={againLabel}
      onSubmit={onSubmit}
      serverError={serverError}
    />
  )
}

function OutreachFormInner({
  mode,
  campusShortCode,
  initial,
  submitLabel,
  againLabel,
  onSubmit,
  serverError,
}: Omit<Parameters<typeof OutreachForm>[0], 'formKey'>) {
  const uid = useId()
  const formRef = useRef<HTMLFormElement>(null)
  const [v, setV] = useState<OutreachFormValues>(initial ?? EMPTY_OUTREACH_FORM)
  const [errors, setErrors] = useState<OutreachFormErrors>({})
  const [busy, setBusy] = useState<null | 'save' | 'again'>(null)
  const halls = hallSuggestions(campusShortCode)
  const you = mode === 'qr'

  function set<K extends keyof OutreachFormValues>(key: K, value: OutreachFormValues[K]) {
    setV((prev) => ({ ...prev, [key]: value }))
    if (errors[key as OutreachField]) setErrors((e) => ({ ...e, [key]: undefined }))
  }

  function toggleInterest(item: string) {
    set('ministry_interests', v.ministry_interests.includes(item) ? v.ministry_interests.filter((x) => x !== item) : [...v.ministry_interests, item])
  }

  function focusFirst(errs: OutreachFormErrors) {
    const first = FIELD_ORDER.find((f) => errs[f])
    if (!first) return
    const el = formRef.current?.querySelector<HTMLElement>(`[data-field="${first}"]`)
    el?.focus()
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }

  async function submit(again: boolean, e?: FormEvent) {
    e?.preventDefault()
    if (busy) return
    const payload = outreachPayload(v)
    const local = validateOutreachAnswers(payload)
    if (!local.ok) {
      setErrors(local.errors)
      focusFirst(local.errors)
      return
    }
    setBusy(again ? 'again' : 'save')
    try {
      const res = await onSubmit(payload, again)
      if (res !== true) {
        setErrors(res)
        focusFirst(res)
      }
    } finally {
      setBusy(null)
    }
  }

  const id = (name: string) => `${uid}-${name}`

  return (
    <form ref={formRef} onSubmit={(e) => submit(false, e)} noValidate className="grid min-w-0 grid-cols-1 gap-7">
      <Section title={you ? 'You' : 'Who you met'}>
        <Field id={id('name')} label={you ? 'Your full name' : 'Full name'} required error={errors.full_name}>
          <Input
            id={id('name')}
            data-field="full_name"
            autoComplete={you ? 'name' : 'off'}
            autoCapitalize="words"
            value={v.full_name}
            onChange={(e) => set('full_name', e.target.value)}
            aria-invalid={Boolean(errors.full_name)}
            className={inputClass(errors.full_name)}
          />
        </Field>
        <Field id={id('phone')} label="Call number" required error={errors.phone}>
          <Input
            id={id('phone')}
            data-field="phone"
            type="tel"
            inputMode="tel"
            autoComplete={you ? 'tel' : 'off'}
            placeholder="024XXXXXXX"
            value={v.phone}
            onChange={(e) => set('phone', e.target.value)}
            aria-invalid={Boolean(errors.phone)}
            className={cn(inputClass(errors.phone), 'font-mono')}
          />
        </Field>
        <label
          htmlFor={id('wa-same')}
          className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-1 text-[15px] text-neutral-800 dark:text-neutral-200"
        >
          <input
            id={id('wa-same')}
            type="checkbox"
            checked={v.whatsappSame}
            onChange={(e) => set('whatsappSame', e.target.checked)}
            className="h-5 w-5 shrink-0 rounded border-neutral-300 accent-brand-600 dark:border-white/20"
          />
          WhatsApp is the same number
        </label>
        {!v.whatsappSame ? (
          <Field id={id('wa')} label="WhatsApp number" error={errors.whatsapp}>
            <Input
              id={id('wa')}
              data-field="whatsapp"
              type="tel"
              inputMode="tel"
              placeholder="024XXXXXXX"
              value={v.whatsapp}
              onChange={(e) => set('whatsapp', e.target.value)}
              aria-invalid={Boolean(errors.whatsapp)}
              className={cn(inputClass(errors.whatsapp), 'font-mono')}
            />
          </Field>
        ) : null}
        <Field id={id('sid')} label="Student ID" hint="Optional" error={errors.student_id}>
          <Input
            id={id('sid')}
            data-field="student_id"
            inputMode="numeric"
            autoComplete="off"
            value={v.student_id}
            onChange={(e) => set('student_id', e.target.value)}
            className={cn(inputClass(errors.student_id), 'font-mono')}
          />
        </Field>
      </Section>

      <Section title="Studies">
        <div className="grid min-w-0 grid-cols-1 gap-2">
          <p id={id('level-label')} className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
            Level
          </p>
          <div role="radiogroup" aria-labelledby={id('level-label')} data-field="level" tabIndex={-1} className="flex flex-wrap gap-2">
            {OUTREACH_LEVELS.map((level) => (
              <Chip key={level} role="radio" selected={v.level === level} onClick={() => set('level', v.level === level ? '' : level)}>
                {level}
              </Chip>
            ))}
          </div>
          <FieldError message={errors.level} />
        </div>
        <Field id={id('prog')} label="Programme" error={errors.programme}>
          <Input
            id={id('prog')}
            data-field="programme"
            placeholder="e.g. BSc Computer Science"
            value={v.programme}
            onChange={(e) => set('programme', e.target.value)}
            className={inputClass(errors.programme)}
          />
        </Field>
      </Section>

      <Section title={you ? 'Where you live' : 'Where they live'}>
        <div role="radiogroup" aria-label="Where they live" className="grid grid-cols-2 gap-1 rounded-xl bg-neutral-100 p-1 dark:bg-white/[0.06]">
          {(
            [
              ['hall', 'Hall / hostel'],
              ['non_resident', 'Non-resident'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={v.residence === value}
              onClick={() => set('residence', v.residence === value ? '' : value)}
              className={cn(
                'min-h-12 rounded-lg px-2 text-[15px] font-semibold transition-colors',
                v.residence === value
                  ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-800 dark:text-white'
                  : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {v.residence === 'hall' ? (
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_6.5rem] gap-3">
            <Field id={id('hall')} label="Hall or hostel" error={errors.hall}>
              <Input
                id={id('hall')}
                data-field="hall"
                list={halls.length ? id('halls') : undefined}
                autoComplete="off"
                value={v.hall}
                onChange={(e) => set('hall', e.target.value)}
                className={inputClass(errors.hall)}
              />
              {halls.length ? (
                <datalist id={id('halls')}>
                  {halls.map((h) => (
                    <option key={h} value={h} />
                  ))}
                </datalist>
              ) : null}
            </Field>
            <Field id={id('room')} label="Room" error={errors.room}>
              <Input
                id={id('room')}
                data-field="room"
                autoComplete="off"
                value={v.room}
                onChange={(e) => set('room', e.target.value)}
                className={inputClass(errors.room)}
              />
            </Field>
          </div>
        ) : null}
        {v.residence === 'non_resident' ? (
          <Field id={id('area')} label={you ? 'Area you live in' : 'Area they live in'} error={errors.area}>
            <Input
              id={id('area')}
              data-field="area"
              placeholder="e.g. Madina, East Legon"
              value={v.area}
              onChange={(e) => set('area', e.target.value)}
              className={inputClass(errors.area)}
            />
          </Field>
        ) : null}
      </Section>

      <Section title="Ministry">
        <div className="grid min-w-0 grid-cols-1 gap-2">
          <p id={id('min-label')} className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
            What can {you ? 'you' : 'they'} do in our ministry?
            <span className="ml-1 font-normal text-neutral-500 dark:text-neutral-400">Pick any</span>
          </p>
          <div role="group" aria-labelledby={id('min-label')} className="flex flex-wrap gap-2">
            {MINISTRY_INTERESTS.map((item) => (
              <Chip key={item} selected={v.ministry_interests.includes(item)} onClick={() => toggleInterest(item)}>
                {item}
              </Chip>
            ))}
          </div>
        </div>
        {v.ministry_interests.includes('Other') ? (
          <Field id={id('other')} label="Other" error={errors.ministry_other}>
            <Input
              id={id('other')}
              data-field="ministry_other"
              placeholder="What else?"
              value={v.ministry_other}
              onChange={(e) => set('ministry_other', e.target.value)}
              className={inputClass(errors.ministry_other)}
            />
          </Field>
        ) : null}
        <div className="grid min-w-0 grid-cols-1 gap-2">
          <p id={id('bs-label')} className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
            Would {you ? 'you' : 'they'} like to do Bible study with us?
          </p>
          <div role="radiogroup" aria-labelledby={id('bs-label')} className="grid grid-cols-2 gap-3">
            {(
              [
                ['yes', 'Yes'],
                ['no', 'No'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={v.bible_study === value}
                onClick={() => set('bible_study', v.bible_study === value ? '' : value)}
                className={cn(
                  'flex min-h-14 items-center justify-center gap-2 rounded-xl border text-base font-semibold transition-colors',
                  v.bible_study === value
                    ? 'border-brand-600 bg-brand-600 text-white dark:border-brand-500 dark:bg-brand-500'
                    : 'border-neutral-200 bg-white text-neutral-800 hover:border-neutral-300 dark:border-white/10 dark:bg-white/[0.03] dark:text-neutral-100 dark:hover:border-white/20'
                )}
              >
                {v.bible_study === value ? <Check className="h-5 w-5" aria-hidden /> : null}
                {label}
              </button>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Prayer request">
        <Field id={id('prayer')} label={you ? 'Anything we can pray with you about?' : 'Anything to pray about?'} hint="Optional" error={errors.prayer_request}>
          <Textarea
            id={id('prayer')}
            data-field="prayer_request"
            rows={3}
            value={v.prayer_request}
            onChange={(e) => set('prayer_request', e.target.value)}
            className="min-h-24 text-base sm:text-base"
          />
        </Field>
      </Section>

      <div
        className={cn(
          'sticky z-10 -mx-5 -mb-5 grid grid-cols-1 gap-2 border-t border-neutral-200/80 bg-white px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 dark:border-white/[0.08] dark:bg-neutral-900 sm:-mx-6 sm:-mb-6 sm:px-6',
          // In a sheet the scroll area has bottom padding: pull the bar down over it so nothing shows beneath.
          you ? 'bottom-0' : 'bottom-[calc(-1.25rem-env(safe-area-inset-bottom))] sm:-bottom-6'
        )}
      >
        {serverError ? (
          <p className="text-sm text-red-700 dark:text-red-300" role="alert">
            {serverError}
          </p>
        ) : null}
        {Object.values(errors).some(Boolean) ? (
          <p className="text-sm text-red-700 dark:text-red-300" role="alert">
            Check the fields marked in red.
          </p>
        ) : null}
        <div className={cn('grid gap-2', againLabel ? 'grid-cols-2' : 'grid-cols-1')}>
          {againLabel ? (
            <Button type="button" variant="outline" onClick={() => submit(true)} disabled={busy !== null} className="h-12 whitespace-normal px-3 text-base leading-tight">
              {busy === 'again' ? <LoadingSpinner size="sm" className="mr-2" /> : null}
              {againLabel}
            </Button>
          ) : null}
          <Button type="submit" disabled={busy !== null} className="h-12 whitespace-normal px-3 text-base leading-tight">
            {busy === 'save' ? <LoadingSpinner size="sm" className="mr-2" /> : null}
            {submitLabel}
          </Button>
        </div>
      </div>
    </form>
  )
}

function inputClass(error?: string) {
  return cn('h-12 text-base sm:h-12 sm:text-base', error && 'border-red-400 dark:border-red-400/60')
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="grid min-w-0 grid-cols-1 gap-4">
      <legend className="app-overline mb-3">{title}</legend>
      {children}
    </fieldset>
  )
}

function Field({
  id,
  label,
  hint,
  required,
  error,
  children,
}: {
  id: string
  label: string
  hint?: string
  required?: boolean
  error?: string
  children: ReactNode
}) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
        {label}
        {required ? <span className="text-red-600 dark:text-red-400" aria-hidden> *</span> : null}
        {hint ? <span className="ml-1 font-normal text-neutral-500 dark:text-neutral-400">{hint}</span> : null}
      </label>
      {children}
      <FieldError message={error} />
    </div>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-sm text-red-700 dark:text-red-300">{message}</p>
}

export function Chip({
  selected,
  onClick,
  children,
  role,
}: {
  selected: boolean
  onClick: () => void
  children: ReactNode
  role?: 'radio'
}) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={role === 'radio' ? selected : undefined}
      aria-pressed={role === 'radio' ? undefined : selected}
      onClick={onClick}
      className={cn(
        'inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-[15px] font-medium transition-colors',
        selected
          ? 'border-brand-600 bg-brand-600 text-white dark:border-brand-500 dark:bg-brand-500'
          : 'border-neutral-200 bg-white text-neutral-800 hover:border-neutral-300 dark:border-white/10 dark:bg-white/[0.03] dark:text-neutral-100 dark:hover:border-white/20'
      )}
    >
      {selected ? <Check className="h-4 w-4" aria-hidden /> : null}
      {children}
    </button>
  )
}
