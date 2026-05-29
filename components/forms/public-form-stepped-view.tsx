'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { formatResponseValue } from '@/lib/forms/analytics'
import { PublicFormFieldInput } from '@/components/forms/public-form-field'
import { PublicFormSuccess } from '@/components/forms/public-form-layout'
import { PublicFormLocationCapture } from '@/components/forms/public-form-location'
import { PublicFormPreviewBanner } from '@/components/forms/public-form-preview-banner'
import { PublicFormSteppedShell } from '@/components/forms/public-form-stepped-shell'
import { PublicFormToolbar } from '@/components/forms/public-form-toolbar'
import { WhatsappSameAsPhoneBlock } from '@/components/forms/whatsapp-same-as-phone'
import { usePublicFormTheme } from '@/components/forms/public-form-theme-context'
import { buildSteppedScreens, type SteppedScreen } from '@/lib/forms/public-form-steps'
import { applyWhatsappSameAsPhone } from '@/lib/forms/whatsapp-phone'
import { isValidCoverImageUrl } from '@/lib/forms/public-form-theme'
import { isValidPhone } from '@/lib/phone'
import type { PublicFormController } from '@/hooks/use-public-form'
import type { ChurchFormField } from '@/lib/types'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { AlertTriangle, ArrowLeft, ArrowRight, Loader2, Sparkles } from 'lucide-react'

type NavDirection = 'forward' | 'back'

function getEncouragement(stepIndex: number, total: number): string | null {
  if (stepIndex <= 0 || total <= 2) return null
  const pct = stepIndex / (total - 1)
  if (pct >= 0.9) return 'Almost there — you’re doing great!'
  if (pct >= 0.65) return 'Nice progress — keep going!'
  if (pct >= 0.35) return 'You’re on a roll!'
  if (stepIndex === 1) return 'Let’s get started!'
  return null
}

function screenKey(screen: SteppedScreen): string {
  if (screen.kind === 'field') return `field-${screen.field.id}`
  return screen.kind
}

function SteppedContinueButton({
  onClick,
  label = 'OK',
  accentHex,
  disabled,
}: {
  onClick: () => void
  label?: string
  accentHex: string
  disabled?: boolean
}) {
  return (
    <div className="flex flex-wrap items-center gap-4 pt-6">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="group inline-flex h-13 min-h-[3.25rem] items-center gap-2 rounded-full bg-white px-8 text-base font-semibold shadow-xl transition-all hover:scale-[1.02] hover:shadow-2xl active:scale-[0.98] disabled:opacity-60"
        style={{ color: accentHex }}
      >
        {label}
        <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
      </button>
      <span className="text-sm text-white/55">
        press <kbd className="rounded-md bg-white/15 px-2 py-0.5 font-mono text-xs">Enter ↵</kbd>
      </span>
    </div>
  )
}

export function PublicFormSteppedView({ controller }: { controller: PublicFormController }) {
  const theme = usePublicFormTheme()
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
      ? 'animate-in fade-in slide-in-from-right-10 duration-400'
      : 'animate-in fade-in slide-in-from-left-10 duration-400'

  if (submitted) {
    return (
      <PublicFormSteppedShell form={form}>
        {previewMode ? <PublicFormPreviewBanner /> : null}
        <div className="mx-auto w-full max-w-lg px-4 py-10">
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
    <PublicFormSteppedShell form={form}>
      {previewMode ? <PublicFormPreviewBanner /> : null}

      <div className="px-4 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6">
        <PublicFormToolbar form={form} campYearLabel={campYearLabel} previewMode={previewMode} />
      </div>

      <div className="h-1.5 w-full bg-black/15">
        <div
          className="h-full transition-all duration-700 ease-out"
          style={{ width: `${Math.min(100, Math.max(4, progress))}%`, backgroundColor: '#ffffff' }}
        />
      </div>

      {stepIndex > 0 ? (
        <button
          type="button"
          onClick={goBack}
          className="absolute left-4 top-[4.5rem] z-20 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/15 text-white backdrop-blur-sm transition hover:bg-black/25 sm:left-6"
          aria-label="Previous question"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      ) : null}

      <div className="flex flex-1 flex-col items-center justify-center px-5 py-10 sm:px-10 md:px-16">
        <div ref={contentRef} className={cn('mx-auto w-full max-w-2xl', shake && 'animate-shake', enterClass)}>
          {encouragement ? (
            <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium text-white/90 backdrop-blur-sm">
              <Sparkles className="h-4 w-4" />
              {encouragement}
            </p>
          ) : null}

          {screen.kind === 'intro' ? (
            <div className="space-y-8">
              {coverUrl ? (
                <div className="overflow-hidden rounded-2xl border border-white/20 shadow-2xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={coverUrl} alt="" className="max-h-52 w-full object-cover" />
                </div>
              ) : null}
              <div>
                {campYearLabel ? (
                  <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-white/70">
                    Camp Meeting {campYearLabel}
                  </p>
                ) : campusGroupName ? (
                  <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-white/70">
                    {campusGroupName}
                  </p>
                ) : null}
                <h1 className="text-3xl font-semibold leading-tight sm:text-4xl md:text-5xl">{form.title}</h1>
                {form.description?.trim() ? (
                  <p className="mt-5 whitespace-pre-wrap text-lg leading-relaxed text-white/85">
                    {form.description}
                  </p>
                ) : null}
              </div>
              <SteppedContinueButton onClick={goForward} label="Start" accentHex={theme.accentHex} />
            </div>
          ) : null}

          {screen.kind === 'phone' ? (
            <div className="space-y-2">
              <StepQuestionHeader
                label={phoneLookupLabel}
                required={phoneLookupRequired}
                description={phoneLookupDescription}
                stepLabel="Your contact"
              />
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <Input
                  className={cn(
                    'h-14 flex-1 rounded-none border-0 border-b-2 border-white/40 bg-transparent text-2xl text-white shadow-none placeholder:text-white/40 focus-visible:border-white focus-visible:ring-0'
                  )}
                  inputMode="tel"
                  autoComplete="tel"
                  autoFocus
                  value={phoneInputValue}
                  onChange={(event) => setRespondentPhone(event.target.value)}
                  placeholder="054 123 4567"
                />
                {!previewMode && form.enable_profile_lookup ? (
                  <button
                    type="button"
                    className="h-12 shrink-0 rounded-full border border-white/30 bg-white/15 px-5 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/25"
                    onClick={() => void handleLookup()}
                    disabled={lookupLoading}
                  >
                    {lookupLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Find my details'}
                  </button>
                ) : null}
              </div>
              {profileName ? (
                <p className="mt-4 rounded-xl bg-white/15 px-4 py-3 text-base text-white backdrop-blur-sm">
                  Welcome back, <span className="font-semibold">{profileName}</span>!
                </p>
              ) : null}
              {alreadySubmitted && !previewMode ? (
                <p className="mt-3 flex items-start gap-2 rounded-xl bg-amber-400/25 px-4 py-3 text-sm text-white">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  Already submitted
                  {submittedAt ? ` on ${new Date(submittedAt).toLocaleDateString('en-GB')}` : ''}.
                </p>
              ) : null}
              <SteppedContinueButton onClick={validateCurrentAndAdvance} accentHex={theme.accentHex} />
            </div>
          ) : null}

          {screen.kind === 'field' ? (
            <div className="space-y-2">
              <StepQuestionHeader
                label={screen.field.label}
                required={screen.field.required}
                description={screen.field.description}
                stepLabel={questionNumber != null ? `Question ${questionNumber} of ${visibleFields.length}` : undefined}
              />
              {whatsappField && screen.field.id === whatsappField.id ? (
                <WhatsappSameAsPhoneBlock
                  whatsappField={screen.field}
                  phone={getRespondentPhone()}
                  value={values[screen.field.id]}
                  sameAsPhone={controller.whatsappSameAsPhone}
                  onSameAsPhoneChange={controller.setWhatsappSameAsPhone}
                  onValueChange={(value) => setFieldValue(screen.field.id, value)}
                  variant="stepped"
                />
              ) : (
                <PublicFormFieldInput
                  field={screen.field}
                  value={values[screen.field.id]}
                  readOnly={screen.field.prefill_key === 'university' && Boolean(campusGroupName)}
                  variant="stepped"
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
                <SteppedContinueButton onClick={validateCurrentAndAdvance} accentHex={theme.accentHex} />
              ) : (
                <p className="pt-4 text-sm text-white/55">Tap an option to continue</p>
              )}
            </div>
          ) : null}

          {screen.kind === 'location' ? (
            <div className="space-y-2">
              <StepQuestionHeader
                label="Share your location"
                description="Optional — helps us know where respondents are joining from."
                stepLabel="Almost done"
              />
              <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
                <PublicFormLocationCapture value={respondentLocation} onChange={setRespondentLocation} />
              </div>
              <SteppedContinueButton onClick={validateCurrentAndAdvance} label="Continue" accentHex={theme.accentHex} />
            </div>
          ) : null}

          {screen.kind === 'review' ? (
            <div className="space-y-4">
              <StepQuestionHeader
                label="Review your answers"
                description="Check everything looks correct, then submit."
                stepLabel="Final step"
              />
              <div className="max-h-[45vh] space-y-3 overflow-y-auto rounded-2xl border border-white/20 bg-black/15 p-4 backdrop-blur-sm">
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
              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="button"
                  className="h-12 rounded-full border border-white/30 bg-white/10 px-6 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/20"
                  onClick={goBack}
                >
                  Edit answers
                </button>
                <button
                  type="button"
                  className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-8 text-base font-semibold shadow-xl transition hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
                  style={{ color: theme.accentHex }}
                  onClick={() => void submitFromReview()}
                  disabled={(alreadySubmitted && !previewMode) || submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Submitting…
                    </>
                  ) : (
                    'Submit response'
                  )}
                </button>
              </div>
            </div>
          ) : null}

          {fieldError ? (
            <p className="mt-4 rounded-xl bg-red-500/30 px-4 py-2.5 text-sm font-medium text-white backdrop-blur-sm">
              {fieldError}
            </p>
          ) : null}
        </div>
      </div>

      <div className="px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-center">
        <p className="text-xs font-medium tracking-wide text-white/45">
          {stepIndex + 1} / {totalSteps}
        </p>
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
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/55">{stepLabel}</p>
      ) : null}
      <h2 className="text-2xl font-semibold leading-tight sm:text-3xl md:text-[2rem]">
        {label}
        {required ? <span className="text-red-200"> *</span> : null}
      </h2>
      {description ? (
        <p className="mt-3 text-base leading-relaxed text-white/75 sm:text-lg">{description}</p>
      ) : null}
    </div>
  )
}

function ReviewLine({ label, value }: { label: string; value: string }) {
  const empty = value === '—' || !value.trim()
  return (
    <div className="border-b border-white/10 pb-3 last:border-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-white/50">{label}</p>
      <p className={cn('mt-1 text-base', empty ? 'italic text-white/35' : 'text-white')}>
        {empty ? 'No answer' : value}
      </p>
    </div>
  )
}
