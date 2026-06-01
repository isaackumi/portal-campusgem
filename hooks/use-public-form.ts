'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { submitFormResponse } from '@/lib/actions/forms'
import { lookupFormProfileByPhone } from '@/lib/actions/form-profile-lookup'
import type { ChurchForm, ChurchFormField } from '@/lib/types'
import { isValidPhone } from '@/lib/phone'
import { useToast } from '@/hooks/use-toast'
import { normalizeFormDisplayMode } from '@/lib/forms/display-mode'
import {
  findWhatsappField,
  shouldDefaultWhatsappSameAsPhone,
} from '@/lib/forms/whatsapp-phone'
import { validateFieldWithContext, prepareAndValidateSubmitValues } from '@/lib/forms/public-form-validation'
import { formHasProfileLookup, isCampMeetingRegistrationForm } from '@/lib/forms/profile-lookup'
import type { RespondentLocation } from '@/lib/actions/reverse-geocode'

export type ClassicStep = 'fill' | 'review'

function findPhoneField(fields: ChurchFormField[]): ChurchFormField | undefined {
  return fields.find((field) => field.field_type === 'phone' || field.prefill_key === 'phone')
}

export type UsePublicFormInput = {
  form: ChurchForm
  fields: ChurchFormField[]
  campusGroupName?: string | null
  campYearLabel?: string | null
  previewMode?: boolean
}

export function usePublicForm({
  form,
  fields,
  campusGroupName = null,
  campYearLabel = null,
  previewMode = false,
}: UsePublicFormInput) {
  const router = useRouter()
  const { toast } = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [classicStep, setClassicStep] = useState<ClassicStep>('fill')
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const initial: Record<string, unknown> = {}
    if (campusGroupName) {
      const universityField = fields.find((field) => field.prefill_key === 'university')
      if (universityField) initial[universityField.id] = campusGroupName
    }
    return initial
  })
  const [lookupPhone, setLookupPhone] = useState('')
  const [profileName, setProfileName] = useState<string | null>(null)
  const [alreadySubmitted, setAlreadySubmitted] = useState(false)
  const [submittedAt, setSubmittedAt] = useState<string | null>(null)
  const [respondentLocation, setRespondentLocation] = useState<RespondentLocation | null>(null)
  const [whatsappSameAsPhone, setWhatsappSameAsPhone] = useState(true)

  const profileLookupEnabled = formHasProfileLookup(form)
  const isCampForm = isCampMeetingRegistrationForm(form)
  const phoneField = useMemo(() => findPhoneField(fields), [fields])
  const whatsappField = useMemo(() => findWhatsappField(fields), [fields])
  const isStepped = normalizeFormDisplayMode(form.display_mode) === 'stepped'
  const phoneFieldEarly = phoneField != null && phoneField.sort_order <= 3
  const showPhoneStep = Boolean(
    phoneField &&
      (isStepped || ((profileLookupEnabled || phoneField.required) && phoneFieldEarly))
  )
  const visibleFields = useMemo(() => {
    const sorted = [...fields].sort((a, b) => a.sort_order - b.sort_order)
    return sorted.filter((field) => !(showPhoneStep && field.id === phoneField?.id))
  }, [fields, phoneField, showPhoneStep])

  useEffect(() => {
    const phone = phoneField ? String(values[phoneField.id] ?? '').trim() : lookupPhone.trim()
    if (shouldDefaultWhatsappSameAsPhone(values, fields, phone)) {
      setWhatsappSameAsPhone(true)
    }
  }, [values, fields, phoneField, lookupPhone])

  const getRespondentPhone = useCallback((): string => {
    if (phoneField) return String(values[phoneField.id] ?? '').trim()
    return lookupPhone.trim()
  }, [phoneField, values, lookupPhone])

  const setRespondentPhone = useCallback(
    (phone: string) => {
      if (phoneField) {
        setValues((current) => ({ ...current, [phoneField.id]: phone }))
      } else {
        setLookupPhone(phone)
      }
    },
    [phoneField]
  )

  const setFieldValue = useCallback((fieldId: string, value: unknown) => {
    setValues((current) => ({ ...current, [fieldId]: value }))
  }, [])

  const toggleCheckboxOption = useCallback((fieldId: string, option: string, checked: boolean) => {
    setValues((current) => {
      const existing = Array.isArray(current[fieldId]) ? (current[fieldId] as string[]) : []
      const next = checked
        ? Array.from(new Set([...existing, option]))
        : existing.filter((item) => item !== option)
      return { ...current, [fieldId]: next }
    })
  }, [])

  const blockedSubmitMessage = useCallback(
    (alreadyRegisteredThisYear?: boolean) => {
      if (alreadyRegisteredThisYear && isCampForm) {
        return 'This phone number is already registered for this Camp Meeting.'
      }
      if (submittedAt) {
        return `You submitted this form on ${new Date(submittedAt).toLocaleDateString()}.`
      }
      return 'This phone number already has a submission for this form.'
    },
    [isCampForm, submittedAt]
  )

  const handleLookup = useCallback(async () => {
    const phone = getRespondentPhone()
    if (!isValidPhone(phone)) {
      toast({ variant: 'destructive', title: 'Invalid phone', description: 'Enter a valid Ghana mobile number.' })
      return
    }

    if (previewMode) {
      toast({
        title: 'Preview mode',
        description: 'Phone lookup is disabled in preview — continue filling the form.',
      })
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
        title: result.already_registered_this_year ? 'Already registered' : 'Already submitted',
        description: blockedSubmitMessage(result.already_registered_this_year),
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
  }, [blockedSubmitMessage, form.slug, getRespondentPhone, phoneField, previewMode, toast, values])

  const validationContext = useMemo(
    () => ({
      phone: getRespondentPhone(),
      whatsappSameAsPhone,
      whatsappFieldId: whatsappField?.id,
    }),
    [getRespondentPhone, whatsappSameAsPhone, whatsappField?.id]
  )

  const validateRequired = useCallback((): string | null => {
    const phone = getRespondentPhone()
    const { error } = prepareAndValidateSubmitValues({
      fields,
      values,
      phone,
      whatsappSameAsPhone,
      requirePhoneLookup: showPhoneStep && profileLookupEnabled,
    })
    return error
  }, [fields, getRespondentPhone, profileLookupEnabled, showPhoneStep, values, whatsappSameAsPhone])

  const validateSingleField = useCallback(
    (field: ChurchFormField): string | null =>
      validateFieldWithContext(field, values, validationContext),
    [values, validationContext]
  )

  const syncWhatsappFromPhone = useCallback(() => {
    if (!whatsappField || !whatsappSameAsPhone) return
    const phone = getRespondentPhone()
    if (phone) setFieldValue(whatsappField.id, phone)
  }, [getRespondentPhone, setFieldValue, whatsappField, whatsappSameAsPhone])

  const goToReview = useCallback(() => {
    const error = validateRequired()
    if (error) {
      toast({ variant: 'destructive', title: 'Missing information', description: error })
      return false
    }

    const phone = getRespondentPhone()
    if (!previewMode && isValidPhone(phone)) {
      void lookupFormProfileByPhone(form.slug, phone, values).then((result) => {
        setAlreadySubmitted(result.already_submitted)
        setSubmittedAt(result.submitted_at ?? null)
        if (result.already_submitted) {
          toast({
            variant: 'destructive',
            title: result.already_registered_this_year ? 'Already registered' : 'Already submitted',
            description: blockedSubmitMessage(result.already_registered_this_year),
          })
          return
        }
        setClassicStep('review')
      })
      return true
    }

    setClassicStep('review')
    return true
  }, [blockedSubmitMessage, form.slug, getRespondentPhone, previewMode, toast, validateRequired, values])

  const handleSubmit = useCallback(async () => {
    if (alreadySubmitted) {
      toast({
        variant: 'destructive',
        title: 'Cannot submit again',
        description: blockedSubmitMessage(),
      })
      return false
    }

    const phone = getRespondentPhone()
    if (profileLookupEnabled && !isValidPhone(phone)) {
      toast({
        variant: 'destructive',
        title: 'Phone required',
        description: 'Enter a valid Ghana phone number before submitting.',
      })
      return false
    }

    if (previewMode) {
      toast({
        title: 'Preview mode',
        description: 'Responses are not saved when previewing.',
      })
      setSubmitted(true)
      return true
    }

    setSubmitting(true)
    const emailField = fields.find((f) => f.field_type === 'email')
    const nameField = fields.find(
      (f) => f.prefill_key === 'full_name' || f.label.toLowerCase().includes('name')
    )

    const { values: submitValues, error: validationError } = prepareAndValidateSubmitValues({
      fields,
      values,
      phone,
      whatsappSameAsPhone,
      requirePhoneLookup: profileLookupEnabled,
    })

    if (validationError) {
      setSubmitting(false)
      toast({ variant: 'destructive', title: 'Missing information', description: validationError })
      return false
    }

    const { data, error } = await submitFormResponse({
      slug: form.slug,
      values: submitValues,
      respondent_phone: phone || undefined,
      respondent_email: emailField ? String(submitValues[emailField.id] ?? '') : undefined,
      respondent_name: nameField
        ? String(submitValues[nameField.id] ?? '')
        : profileName ?? undefined,
      respondent_latitude: respondentLocation?.latitude,
      respondent_longitude: respondentLocation?.longitude,
      respondent_location_label: respondentLocation?.label,
    })
    setSubmitting(false)

    if (error) {
      toast({ variant: 'destructive', title: 'Submission failed', description: error })
      return false
    }

    const campReg = data?.camp_registration
    if (campReg?.id) {
      const params = new URLSearchParams({
        id: campReg.id,
        name: campReg.full_name,
        qr: campReg.qr_code,
      })
      if (typeof window !== 'undefined') {
        const registerUrl = `${window.location.origin}/f/${form.slug}`
        params.set('register', encodeURIComponent(registerUrl))
      }
      router.push(`/camp-meeting/success?${params.toString()}`)
      return true
    }

    setSubmitted(true)
    return true
  }, [
    alreadySubmitted,
    blockedSubmitMessage,
    fields,
    form.slug,
    getRespondentPhone,
    previewMode,
    profileLookupEnabled,
    profileName,
    respondentLocation,
    router,
    toast,
    values,
    whatsappSameAsPhone,
  ])

  const phoneInputValue = phoneField ? String(values[phoneField.id] ?? '') : lookupPhone
  const phoneLookupLabel = phoneField?.label ?? 'Phone number'
  const phoneLookupDescription =
    phoneField?.description ||
    (profileLookupEnabled
      ? 'Enter your Ghana mobile number to load your details and prevent duplicate submissions.'
      : 'Optional — used to find your existing records.')
  const phoneLookupRequired = Boolean(phoneField?.required || profileLookupEnabled)

  return {
    form,
    fields,
    campusGroupName,
    campYearLabel,
    previewMode,
    profileLookupEnabled,
    isCampForm,
    submitting,
    lookupLoading,
    submitted,
    classicStep,
    setClassicStep,
    values,
    profileName,
    alreadySubmitted,
    submittedAt,
    respondentLocation,
    setRespondentLocation,
    whatsappSameAsPhone,
    setWhatsappSameAsPhone,
    phoneField,
    whatsappField,
    showPhoneStep,
    visibleFields,
    phoneInputValue,
    phoneLookupLabel,
    phoneLookupDescription,
    phoneLookupRequired,
    getRespondentPhone,
    setRespondentPhone,
    setFieldValue,
    toggleCheckboxOption,
    handleLookup,
    validateRequired,
    validateSingleField,
    syncWhatsappFromPhone,
    goToReview,
    handleSubmit,
  }
}

export type PublicFormController = ReturnType<typeof usePublicForm>
