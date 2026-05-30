'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { formatResponseValue } from '@/lib/forms/analytics'
import { PublicFormFieldInput } from '@/components/forms/public-form-field'
import { PublicFormPrimaryButton, PublicFormSuccess } from '@/components/forms/public-form-layout'
import { PublicFormLocationCapture } from '@/components/forms/public-form-location'
import { PublicFormPreviewBanner } from '@/components/forms/public-form-preview-banner'
import {
  PublicFormSteppedShell,
  SteppedQuestionCard,
} from '@/components/forms/public-form-stepped-shell'
import { PublicFormToolbar } from '@/components/forms/public-form-toolbar'
import { WhatsappSameAsPhoneBlock } from '@/components/forms/whatsapp-same-as-phone'
import { buildSteppedScreens, type SteppedScreen } from '@/lib/forms/public-form-steps'
import { applyWhatsappSameAsPhone } from '@/lib/forms/whatsapp-phone'
import { isValidCoverImageUrl } from '@/lib/forms/public-form-theme'
import { isValidPhone } from '@/lib/phone'
import type { PublicFormController } from '@/hooks/use-public-form'
import type { ChurchFormField } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { AlertTriangle, ArrowLeft, ArrowRight, Loader2, Sparkles } from 'lucide-react'

type NavDirection = 'forward' | 'back'

function getEncouragement(stepIndex: number, total: number): string | null {
  if (stepIndex <= 0 || total <= 2) return null
  const pct = stepIndex / (total - 1)
  if (pct >= 0.9) return 'Almost done — great job!'
  if (pct >= 0.65) return 'Nice progress!'
  if (pct >= 0.35) return 'You\'re doing well!'
  if (stepIndex === 1) return 'Let\'s go!'
  return null
}

function screenKey(screen: SteppedScreen): string {
  if (screen.kind === 'field') return `field-${screen.field.id}`
  return screen.kind
}

function SteppedActions({
  onContinue,
  label = 'Continue',
  hint = true,
}: {
  onContinue: () => void
  label?: string
  hint?: boolean
}) {
  return (
    <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <PublicFormPrimaryButton type="button" onClick={onContinue} className="h-12 min-w-[160px] px-8">
        {label}
        <ArrowRight className="ml-2 h-4 w-4" />
      </PublicFormPrimaryButton>
      {hint ? (
        <p className="text-sm text-slate-500">
          Press <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-xs">Enter ↵</kbd>
        </p>
      ) : null}
    </div>
  )
}

export function PublicFormSteppedView({ controller }: { controller: PublicFormController }) {
  const {
    form,
    fields,
    campusGroupName,
    campYearLabel,
    previewMode,
    submitting,
    lookupLoading,
    submitted,
    values,
    profileName,
    alreadySubmitted,
    submittedAt,
    respondentLocation,
    setRespondentLocation,
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
    validateSingleField,
    validateRequired,
    syncWhatsappFromPhone,
    handleSubmit,
  } = controller

  const screens = useMemo(
    () => buildSteppedScreens({ form, fields, showPhoneStep, visibleFields }),
    [form, fields, showPhoneStep, visibleFields]
  )

  const [stepIndex, setStepIndex] = useState(0)
  const [direction, setDirection] = useState<NavDirection>('forward')
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [shake, setShake] = useState(false)
  const continueRef = useRef<() => void>(() => {})
  const contentRef = useRef<HTMLDivElement>(null)

  const screen = screens[stepIndex] ?? screens[0]
  const totalSteps = screens.length
  const progress = totalSteps > 1 ? (stepIndex / (totalSteps - 1)) * 100 : 100
  const coverUrl = isValidCoverImageUrl(form.cover_image_url) ? form.cover_image_url!.trim() : null
  const encouragement = getEncouragement(stepIndex, totalSteps)
  const questionNumber =
    screen.kind === 'field'
      ? visibleFields.findIndex((f) => f.id === screen.field.id) + 1
      : null

  const goForward = useCallback(() => {
    setDirection('forward')
    setStepIndex((index) => Math.min(index + 1, screens.length - 1))
    setFieldError(null)
  }, [screens.length])

  const goBack = useCallback(() => {
    setDirection('back')
    setStepIndex((index) => Math.max(index - 1, 0))
    setFieldError(null)
  }, [])

  const showError = useCallback((message: string) => {
    setFieldError(message)
    setShake(true)
    window.setTimeout(() => setShake(false), 450)
  }, [])

  const validateCurrentAndAdvance = useCallback(() => {
    if (!screen) return

    if (screen.kind === 'phone') {
      const phone = getRespondentPhone()
      if (phoneLookupRequired && !isValidPhone(phone)) {
        showError('Enter a valid Ghana mobile number')
        return
      }
      if (alreadySubmitted && !previewMode) {
        showError('This phone number has already submitted this form')
        return
      }
      goForward()
      return
    }

    if (screen.kind === 'field') {
      if (whatsappField && screen.field.id === whatsappField.id) {
        syncWhatsappFromPhone()
      }
      const error = validateSingleField(screen.field)
      if (error) {
        showError(error)
        return
      }
      goForward()
      return
    }

    goForward()
  }, [
    screen,
    getRespondentPhone,
    phoneLookupRequired,
    alreadySubmitted,
    previewMode,
    whatsappField,
    syncWhatsappFromPhone,
    validateSingleField,
    goForward,
    showError,
  ])

  const submitFromReview = useCallback(async () => {
    syncWhatsappFromPhone()
    const error = validateRequired()
    if (error) {
      showError(error)
      return
    }
    await handleSubmit()
  }, [syncWhatsappFromPhone, validateRequired, showError, handleSubmit])

  continueRef.current = validateCurrentAndAdvance

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Enter' || event.shiftKey) return
      const target = event.target as HTMLElement
      if (target.tagName === 'TEXTAREA') return
      if (screen?.kind === 'review') return
      event.preventDefault()
      continueRef.current()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [screen?.kind])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const el = contentRef.current?.querySelector<HTMLElement>(
        'input:not([type=hidden]):not([type=radio]):not([type=checkbox]), textarea, select'
      )
      el?.focus()
    }, 280)
    return () => window.clearTimeout(timer)
  }, [stepIndex, screenKey(screen)])

  const handleRadioChange = useCallback(
    (field: ChurchFormField, value: unknown) => {
      setFieldValue(field.id, value)
      window.setTimeout(() => {
        const error = validateSingleField(field)
        if (!error) {
          setDirection('forward')
          setStepIndex((index) => Math.min(index + 1, screens.length - 1))
          setFieldError(null)
        }
      }, 420)
    },
    [setFieldValue, validateSingleField, screens.length]
  )

  const enterClass =
    direction === 'forward'
      ? 'animate-in fade-in slide-in-from-right-6 duration-300'
      : 'animate-in fade-in slide-in-from-left-6 duration-300'

  if (submitted) {
    return (
      <PublicFormSteppedShell form={form} progress={100}>
        {previewMode ? <PublicFormPreviewBanner /> : null}
        <div className="flex flex-1 flex-col justify-center py-8">
          <PublicFormSuccess title={form.title} form={form} />
        </div>
      </PublicFormSteppedShell>
    )
  }

  const reviewPhone = getRespondentPhone()
  const displayValues = applyWhatsappSameAsPhone(
    values,
    fields,
    reviewPhone,
    controller.whatsappSameAsPhone
  )

  return (
    <PublicFormSteppedShell form={form} progress={progress}>
      {previewMode ? <PublicFormPreviewBanner /> : null}

      <PublicFormToolbar form={form} campYearLabel={campYearLabel} previewMode={previewMode} />

      <div className="mb-4 flex items-center justify-between gap-3">
        {stepIndex > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 border border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white"
            onClick={goBack}
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back
          </Button>
        ) : (
          <span />
        )}
        <p className="text-sm font-semibold text-white">
          Step {stepIndex + 1} of {totalSteps}
        </p>
      </div>

      {encouragement ? (
        <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-4 py-1.5 text-sm font-medium text-white backdrop-blur-sm">
          <Sparkles className="h-4 w-4" />
          {encouragement}
        </p>
      ) : null}

      <div className="flex flex-1 flex-col justify-center py-4 sm:py-8">
        <div ref={contentRef} className={cn(enterClass, shake && 'animate-shake')}>
          <SteppedQuestionCard>
          {screen.kind === 'intro' ? (
            <div className="space-y-6">
              {coverUrl ? (
                <div className="overflow-hidden rounded-lg border border-slate-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={coverUrl} alt="" className="max-h-44 w-full object-cover" />
                </div>
              ) : null}
              <div>
                {campYearLabel ? (
                  <p className="mb-2 text-sm font-semibold text-slate-500">Camp Meeting {campYearLabel}</p>
                ) : campusGroupName ? (
                  <p className="mb-2 text-sm font-semibold text-slate-500">{campusGroupName}</p>
                ) : null}
                <h1 className="text-2xl font-semibold leading-snug text-slate-900 sm:text-3xl">{form.title}</h1>
                {form.description?.trim() ? (
                  <p className="mt-4 whitespace-pre-wrap text-base leading-relaxed text-slate-600">
                    {form.description}
                  </p>
                ) : null}
              </div>
              <SteppedActions onContinue={goForward} label="Start" />
            </div>
          ) : null}

          {screen.kind === 'phone' ? (
            <div>
              <StepQuestionHeader
                label={phoneLookupLabel}
                required={phoneLookupRequired}
                description={phoneLookupDescription}
                stepLabel="Your contact"
              />
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input
                  className="h-12 flex-1 border-slate-300 bg-white text-base shadow-none"
                  inputMode="tel"
                  autoComplete="tel"
                  autoFocus
                  value={phoneInputValue}
                  onChange={(event) => setRespondentPhone(event.target.value)}
                  placeholder="054 123 4567"
                />
                {!previewMode && controller.profileLookupEnabled ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 shrink-0 border-slate-300"
                    onClick={() => void handleLookup()}
                    disabled={lookupLoading}
                  >
                    {lookupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Find my details'}
                  </Button>
                ) : null}
              </div>
              {profileName ? (
                <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                  Welcome back, <span className="font-semibold">{profileName}</span>!
                </p>
              ) : null}
              {alreadySubmitted && !previewMode ? (
                <p className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  Already submitted
                  {submittedAt ? ` on ${new Date(submittedAt).toLocaleDateString('en-GB')}` : ''}.
                </p>
              ) : null}
              <SteppedActions onContinue={validateCurrentAndAdvance} label="Continue" />
            </div>
          ) : null}

          {screen.kind === 'field' ? (
            <div>
              <StepQuestionHeader
                label={screen.field.label}
                required={screen.field.required}
                description={screen.field.description}
                stepLabel={
                  questionNumber != null ? `Question ${questionNumber} of ${visibleFields.length}` : undefined
                }
              />
              {whatsappField && screen.field.id === whatsappField.id ? (
                <WhatsappSameAsPhoneBlock
                  whatsappField={screen.field}
                  phone={getRespondentPhone()}
                  value={values[screen.field.id]}
                  sameAsPhone={controller.whatsappSameAsPhone}
                  onSameAsPhoneChange={controller.setWhatsappSameAsPhone}
                  onValueChange={(value) => setFieldValue(screen.field.id, value)}
                />
              ) : (
                <PublicFormFieldInput
                  field={screen.field}
                  value={values[screen.field.id]}
                  readOnly={screen.field.prefill_key === 'university' && Boolean(campusGroupName)}
                  autoFocus
                  onChange={(value) => {
                    if (screen.field.field_type === 'radio') {
                      handleRadioChange(screen.field, value)
                    } else {
                      setFieldValue(screen.field.id, value)
                    }
                  }}
                  onToggleCheckbox={(option, checked) =>
                    toggleCheckboxOption(screen.field.id, option, checked)
                  }
                />
              )}
              {screen.field.field_type !== 'radio' ? (
                <SteppedActions onContinue={validateCurrentAndAdvance} label="Continue" />
              ) : (
                <p className="mt-6 text-sm text-slate-500">Select an option to continue</p>
              )}
            </div>
          ) : null}

          {screen.kind === 'location' ? (
            <div>
              <StepQuestionHeader
                label="Share your location"
                description="Optional — helps us know where respondents are joining from."
                stepLabel="Almost done"
              />
              <PublicFormLocationCapture value={respondentLocation} onChange={setRespondentLocation} />
              <SteppedActions onContinue={validateCurrentAndAdvance} label="Continue" />
            </div>
          ) : null}

          {screen.kind === 'review' ? (
            <div>
              <StepQuestionHeader
                label="Review your answers"
                description="Check everything looks correct, then submit."
                stepLabel="Final step"
              />
              <div className="max-h-[40vh] space-y-3 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/80 p-4">
                {reviewPhone && !controller.phoneField ? (
                  <ReviewLine label="Phone" value={reviewPhone} />
                ) : null}
                {fields.map((field) => (
                  <ReviewLine
                    key={field.id}
                    label={field.label}
                    value={formatResponseValue(displayValues[field.id])}
                  />
                ))}
                {respondentLocation ? (
                  <ReviewLine
                    label="Location"
                    value={
                      respondentLocation.label ??
                      `${respondentLocation.latitude.toFixed(5)}, ${respondentLocation.longitude.toFixed(5)}`
                    }
                  />
                ) : null}
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button type="button" variant="outline" className="h-11" onClick={goBack}>
                  Edit answers
                </Button>
                <PublicFormPrimaryButton
                  type="button"
                  className="h-11 min-w-[160px]"
                  onClick={() => void submitFromReview()}
                  disabled={(alreadySubmitted && !previewMode) || submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting…
                    </>
                  ) : (
                    'Submit'
                  )}
                </PublicFormPrimaryButton>
              </div>
            </div>
          ) : null}

          {fieldError ? (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-800">
              {fieldError}
            </p>
          ) : null}
          </SteppedQuestionCard>
        </div>
      </div>
    </PublicFormSteppedShell>
  )
}

function StepQuestionHeader({
  label,
  required,
  description,
  stepLabel,
}: {
  label: string
  required?: boolean
  description?: string
  stepLabel?: string
}) {
  return (
    <div className="mb-6">
      {stepLabel ? (
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{stepLabel}</p>
      ) : null}
      <h2 className="text-xl font-semibold leading-snug text-slate-900 sm:text-2xl">
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
      </h2>
      {description ? (
        <p className="mt-2 text-base leading-relaxed text-slate-600">{description}</p>
      ) : null}
    </div>
  )
}

function ReviewLine({ label, value }: { label: string; value: string }) {
  const empty = value === '—' || !value.trim()
  return (
    <div className="border-b border-slate-200 pb-3 last:border-0">
      <p className="text-sm font-medium text-slate-700">{label}</p>
      <p className={cn('mt-1 text-base', empty ? 'italic text-slate-400' : 'text-slate-900')}>
        {empty ? 'No answer' : value}
      </p>
    </div>
  )
}
