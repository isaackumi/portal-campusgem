'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { getPublishedFormBySlug, submitFormResponse } from '@/lib/actions/forms'
import { lookupFormProfileByPhone } from '@/lib/actions/form-profile-lookup'
import { formatResponseValue } from '@/lib/forms/analytics'
import {
  PublicFormFieldInput,
  PublicFormQuestionBlock,
} from '@/components/forms/public-form-field'
import {
  PublicFormDocument,
  PublicFormLoadingState,
  PublicFormNotFound,
  PublicFormPageShell,
  PublicFormPhoneLookup,
  PublicFormReviewActions,
  PublicFormReviewRow,
  PublicFormSubmitBar,
  PublicFormSuccess,
} from '@/components/forms/public-form-layout'
import type { ChurchForm, ChurchFormField } from '@/lib/types'
import { isValidPhone } from '@/lib/phone'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

type Step = 'fill' | 'review'

function findPhoneField(fields: ChurchFormField[]): ChurchFormField | undefined {
  return fields.find((field) => field.field_type === 'phone' || field.prefill_key === 'phone')
}

export default function PublicFormPage() {
  const params = useParams<{ slug: string }>()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [step, setStep] = useState<Step>('fill')
  const [form, setForm] = useState<ChurchForm | null>(null)
  const [fields, setFields] = useState<ChurchFormField[]>([])
  const [values, setValues] = useState<Record<string, unknown>>({})
  const [lookupPhone, setLookupPhone] = useState('')
  const [profileName, setProfileName] = useState<string | null>(null)
  const [alreadySubmitted, setAlreadySubmitted] = useState(false)
  const [submittedAt, setSubmittedAt] = useState<string | null>(null)

  const phoneField = useMemo(() => findPhoneField(fields), [fields])
  const showPhoneStep = Boolean(form?.enable_profile_lookup || phoneField)
  const visibleFields = useMemo(
    () => fields.filter((field) => field.id !== phoneField?.id),
    [fields, phoneField]
  )

  useEffect(() => {
    void loadForm()
  }, [params.slug])

  async function loadForm() {
    setLoading(true)
    const { data, error } = await getPublishedFormBySlug(params.slug)
    if (error || !data) {
      toast({ variant: 'destructive', title: 'Form unavailable', description: error ?? 'This form is not published.' })
      setLoading(false)
      return
    }
    setForm(data.form)
    setFields(data.fields)
    setLoading(false)
  }

  function getRespondentPhone(): string {
    if (phoneField) return String(values[phoneField.id] ?? '').trim()
    return lookupPhone.trim()
  }

  function setRespondentPhone(phone: string) {
    if (phoneField) setFieldValue(phoneField.id, phone)
    else setLookupPhone(phone)
  }

  function setFieldValue(fieldId: string, value: unknown) {
    setValues((current) => ({ ...current, [fieldId]: value }))
  }

  function toggleCheckboxOption(fieldId: string, option: string, checked: boolean) {
    setValues((current) => {
      const existing = Array.isArray(current[fieldId]) ? (current[fieldId] as string[]) : []
      const next = checked ? Array.from(new Set([...existing, option])) : existing.filter((item) => item !== option)
      return { ...current, [fieldId]: next }
    })
  }

  async function handleLookup() {
    if (!form) return
    const phone = getRespondentPhone()
    if (!isValidPhone(phone)) {
      toast({ variant: 'destructive', title: 'Invalid phone', description: 'Enter a valid Ghana mobile number.' })
      return
    }

    setLookupLoading(true)
    const result = await lookupFormProfileByPhone(form.slug, phone, values)
    setLookupLoading(false)

    if (result.error) {
      toast({ variant: 'destructive', title: 'Lookup failed', description: result.error })
      return
    }

    setAlreadySubmitted(result.already_submitted)
    setSubmittedAt(result.submitted_at ?? null)

    if (result.already_submitted) {
      toast({
        variant: 'destructive',
        title: 'Already submitted',
        description: result.submitted_at
          ? `You submitted this form on ${new Date(result.submitted_at).toLocaleDateString()}.`
          : 'This phone number already has a submission for this form.',
      })
      return
    }

    if (!result.found || !result.values) {
      setProfileName(null)
      toast({ title: 'No record found', description: 'Continue filling the form — you can still submit.' })
      return
    }

    setValues(result.values)
    if (!phoneField) setLookupPhone(phone)
    setProfileName(result.display_name ?? null)
    toast({
      title: 'Details loaded',
      description:
        result.filledCount && result.filledCount > 0
          ? `We prefilled ${result.filledCount} field${result.filledCount === 1 ? '' : 's'}. Review and edit anything below.`
          : 'Record found — review the form and edit as needed.',
    })
  }

  function validateRequired(): string | null {
    if (showPhoneStep && form?.enable_profile_lookup) {
      const phone = getRespondentPhone()
      if (!isValidPhone(phone)) {
        return 'Phone number is required (use a valid Ghana mobile number)'
      }
    }

    for (const field of fields) {
      const value = values[field.id]
      const isEmpty =
        value == null ||
        value === '' ||
        (Array.isArray(value) && value.length === 0) ||
        (field.field_type === 'checkbox' && value !== true && !(Array.isArray(value) && value.length > 0))

      if (field.required && isEmpty) return `${field.label} is required`

      if (field.field_type === 'radio' && field.required && (field.options ?? []).length === 0) {
        return `${field.label} needs answer choices in the form editor`
      }
    }
    return null
  }

  function goToReview() {
    const error = validateRequired()
    if (error) {
      toast({ variant: 'destructive', title: 'Missing information', description: error })
      return
    }

    const phone = getRespondentPhone()
    if (form && isValidPhone(phone)) {
      void lookupFormProfileByPhone(form.slug, phone, values).then((result) => {
        setAlreadySubmitted(result.already_submitted)
        setSubmittedAt(result.submitted_at ?? null)
        if (result.already_submitted) {
          toast({
            variant: 'destructive',
            title: 'Already submitted',
            description: 'This phone number has already submitted this form.',
          })
          return
        }
        setStep('review')
      })
      return
    }

    setStep('review')
  }

  async function handleSubmit() {
    if (!form) return
    if (alreadySubmitted) {
      toast({
        variant: 'destructive',
        title: 'Cannot submit again',
        description: 'This phone number already submitted this form.',
      })
      return
    }

    const phone = getRespondentPhone()
    if (form.enable_profile_lookup && !isValidPhone(phone)) {
      toast({
        variant: 'destructive',
        title: 'Phone required',
        description: 'Enter a valid Ghana phone number before submitting.',
      })
      return
    }

    setSubmitting(true)
    const emailField = fields.find((f) => f.field_type === 'email')
    const nameField = fields.find((f) => f.prefill_key === 'full_name' || f.label.toLowerCase().includes('name'))

    const { error } = await submitFormResponse({
      slug: form.slug,
      values,
      respondent_phone: phone || undefined,
      respondent_email: emailField ? String(values[emailField.id] ?? '') : undefined,
      respondent_name: nameField ? String(values[nameField.id] ?? '') : profileName ?? undefined,
    })
    setSubmitting(false)

    if (error) {
      toast({ variant: 'destructive', title: 'Submission failed', description: error })
      return
    }

    setSubmitted(true)
  }

  const phoneInputValue = phoneField ? String(values[phoneField.id] ?? '') : lookupPhone
  const phoneLookupLabel = phoneField?.label ?? 'Phone number'
  const phoneLookupDescription =
    phoneField?.description ||
    (form?.enable_profile_lookup
      ? 'Enter your Ghana mobile number to load your details and prevent duplicate submissions.'
      : 'Optional — used to find your existing records.')
  const phoneLookupRequired = Boolean(phoneField?.required || form?.enable_profile_lookup)

  if (loading) return <PublicFormLoadingState />
  if (!form) return <PublicFormNotFound />
  if (submitted) return <PublicFormSuccess title={form.title} />

  if (step === 'review') {
    const reviewPhone = getRespondentPhone()
    return (
      <PublicFormPageShell>
        <PublicFormDocument step="review" form={form}>
          {reviewPhone && !phoneField ? (
            <PublicFormReviewRow label="Phone number" value={reviewPhone} />
          ) : null}
          {fields.map((field) => (
            <PublicFormReviewRow
              key={field.id}
              label={field.label}
              value={formatResponseValue(values[field.id])}
            />
          ))}
        </PublicFormDocument>
        <PublicFormReviewActions
          onEdit={() => setStep('fill')}
          onSubmit={() => void handleSubmit()}
          submitting={submitting}
          disabled={alreadySubmitted}
        />
      </PublicFormPageShell>
    )
  }

  return (
    <PublicFormPageShell>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          goToReview()
        }}
      >
        <PublicFormDocument step="fill" form={form}>
          {showPhoneStep ? (
            <PublicFormPhoneLookup
              label={phoneLookupLabel}
              description={phoneLookupDescription}
              required={phoneLookupRequired}
              value={phoneInputValue}
              onChange={setRespondentPhone}
              onLookup={() => void handleLookup()}
              lookupLoading={lookupLoading}
              profileName={profileName}
              alreadySubmitted={alreadySubmitted}
              submittedAt={submittedAt}
            />
          ) : null}

          {visibleFields.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-slate-500">No questions yet.</p>
          ) : (
            visibleFields.map((field, index) => (
              <PublicFormQuestionBlock
                key={field.id}
                field={field}
                isLast={index === visibleFields.length - 1}
              >
                <PublicFormFieldInput
                  field={field}
                  value={values[field.id]}
                  onChange={(value) => setFieldValue(field.id, value)}
                  onToggleCheckbox={(option, checked) => toggleCheckboxOption(field.id, option, checked)}
                />
              </PublicFormQuestionBlock>
            ))
          )}
        </PublicFormDocument>

        <PublicFormSubmitBar>
          <Button type="submit" className="h-11 w-full" disabled={alreadySubmitted}>
            Continue to review
          </Button>
        </PublicFormSubmitBar>
      </form>
    </PublicFormPageShell>
  )
}
