'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { formatResponseValue } from '@/lib/forms/analytics'
import { PublicFormFieldInput } from '@/components/forms/public-form-field'
import {
  PublicFormPageShell,
  PublicFormPrimaryButton,
  PublicFormSuccess,
} from '@/components/forms/public-form-layout'
import { PublicFormLocationCapture } from '@/components/forms/public-form-location'
import { PublicFormPreviewBanner } from '@/components/forms/public-form-preview-banner'
import { WhatsappSameAsPhoneBlock } from '@/components/forms/whatsapp-same-as-phone'
import { usePublicFormTheme } from '@/components/forms/public-form-theme-context'
import { buildSteppedScreens, type SteppedScreen } from '@/lib/forms/public-form-steps'
import { applyWhatsappSameAsPhone } from '@/lib/forms/whatsapp-phone'
import { isValidCoverImageUrl } from '@/lib/forms/public-form-theme'
import { isValidPhone } from '@/lib/phone'
import type { PublicFormController } from '@/hooks/use-public-form'
import type { ChurchFormField } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { AlertTriangle, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'

type NavDirection = 'forward' | 'back'

function SteppedProgress({ progress, accentHex }: { progress: number; accentHex: string }) {
  return (
    <div className="h-1 w-full bg-white/20">
      <div
        className="h-full transition-all duration-500 ease-out"
        style={{ width: `${Math.min(100, Math.max(0, progress))}%`, backgroundColor: accentHex }}
      />
    </div>
  )
}

function SteppedScreenContent({
  screen,
  direction,
  children,
}: {
  screen: SteppedScreen
  direction: NavDirection
  children: React.ReactNode
}) {
  const enterClass =
    direction === 'forward'
      ? 'animate-in fade-in slide-in-from-right-8 duration-300'
      : 'animate-in fade-in slide-in-from-left-8 duration-300'

  return (
    <div key={screen.kind + ('field' in screen ? screen.field.id : '')} className={cn('w-full', enterClass)}>
      {children}
    </div>
  )
}

function SteppedWhatsapp({
  field,
  controller,
  onContinue,
}: {
  field: ChurchFormField
  controller: PublicFormController
  onContinue: () => void
}) {
  const {
    values,
    getRespondentPhone,
    whatsappSameAsPhone,
    setWhatsappSameAsPhone,
    setFieldValue,
  } = controller

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-normal leading-tight text-white sm:text-3xl md:text-4xl">
          {field.label}
          {field.required ? <span className="text-red-300"> *</span> : null}
        </h2>
        {field.description ? (
          <p className="mt-3 text-base leading-relaxed text-white/80 sm:text-lg">{field.description}</p>
        ) : null}
      </div>
      <WhatsappSameAsPhoneBlock
        whatsappField={field}
        phone={getRespondentPhone()}
        value={values[field.id]}
        sameAsPhone={whatsappSameAsPhone}
        onSameAsPhoneChange={setWhatsappSameAsPhone}
        onValueChange={(value) => setFieldValue(field.id, value)}
      />
      <SteppedNavHint onContinue={onContinue} />
    </div>
  )
}

function SteppedNavHint({ onContinue, label = 'OK' }: { onContinue: () => void; label?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3 pt-4">
      <Button
        type="button"
        onClick={onContinue}
        className="h-12 rounded-md bg-white px-8 text-base font-medium text-slate-900 shadow-lg hover:bg-white/95"
      >
        {label}
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
      <span className="text-sm text-white/60">
        press <kbd className="rounded bg-white/15 px-1.5 py-0.5 font-mono text-xs">Enter ↵</kbd>
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

  const screen = screens[stepIndex] ?? screens[0]
  const progress = screens.length > 1 ? (stepIndex / (screens.length - 1)) * 100 : 100
  const coverUrl = isValidCoverImageUrl(form.cover_image_url) ? form.cover_image_url!.trim() : null

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
    goForward,
    validateSingleField,
    showError,
  ])

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
      }, 380)
    },
    [setFieldValue, validateSingleField, screens.length]
  )

  if (submitted) {
    return (
      <PublicFormPageShell form={form}>
        {previewMode ? <PublicFormPreviewBanner /> : null}
        <div className="mx-auto max-w-lg">
          <PublicFormSuccess title={form.title} form={form} />
        </div>
      </PublicFormPageShell>
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
    <PublicFormPageShell form={form}>
      {previewMode ? <PublicFormPreviewBanner /> : null}
      <div
        className="relative flex min-h-[calc(100dvh-4rem)] flex-col overflow-hidden rounded-lg shadow-xl"
        style={{ backgroundColor: theme.accentHex }}
      >
        <SteppedProgress progress={progress} accentHex="rgba(255,255,255,0.9)" />

        {stepIndex > 0 ? (
          <button
            type="button"
            onClick={goBack}
            className="absolute left-4 top-6 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25 sm:left-6"
            aria-label="Previous question"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        ) : null}

        <div className="flex flex-1 flex-col items-center justify-center px-5 py-16 sm:px-10 md:px-16">
          <div className={cn('mx-auto w-full max-w-2xl', shake && 'animate-shake')}>
            <SteppedScreenContent screen={screen} direction={direction}>
              {screen.kind === 'intro' ? (
                <div className="space-y-8 text-white">
                  {coverUrl ? (
                    <div className="overflow-hidden rounded-lg border border-white/20 shadow-lg">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={coverUrl} alt="" className="max-h-48 w-full object-cover" />
                    </div>
                  ) : null}
                  <div>
                    {campYearLabel ? (
                      <p className="mb-2 text-sm font-medium uppercase tracking-wide text-white/70">
                        Camp Meeting {campYearLabel}
                      </p>
                    ) : campusGroupName ? (
                      <p className="mb-2 text-sm font-medium uppercase tracking-wide text-white/70">
                        {campusGroupName}
                      </p>
                    ) : null}
                    <h1 className="text-3xl font-normal leading-tight sm:text-4xl md:text-5xl">{form.title}</h1>
                    {form.description?.trim() ? (
                      <p className="mt-4 whitespace-pre-wrap text-lg leading-relaxed text-white/85">
                        {form.description}
                      </p>
                    ) : null}
                  </div>
                  <SteppedNavHint onContinue={goForward} label="Start" />
                </div>
              ) : null}

              {screen.kind === 'phone' ? (
                <div className="space-y-6 text-white">
                  <div>
                    <h2 className="text-2xl font-normal leading-tight sm:text-3xl md:text-4xl">
                      {phoneLookupLabel}
                      {phoneLookupRequired ? <span className="text-red-300"> *</span> : null}
                    </h2>
                    {phoneLookupDescription ? (
                      <p className="mt-3 text-base leading-relaxed text-white/80 sm:text-lg">
                        {phoneLookupDescription}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Input
                      className="h-14 flex-1 border-0 bg-white/95 text-lg text-slate-900 shadow-lg focus-visible:ring-2 focus-visible:ring-white"
                      inputMode="tel"
                      autoComplete="tel"
                      value={phoneInputValue}
                      onChange={(event) => setRespondentPhone(event.target.value)}
                      placeholder="054 123 4567"
                    />
                    {!previewMode && form.enable_profile_lookup ? (
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-14 shrink-0 bg-white/90 px-6 text-base"
                        onClick={() => void handleLookup()}
                        disabled={lookupLoading}
                      >
                        {lookupLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Find my details'}
                      </Button>
                    ) : null}
                  </div>
                  {profileName ? (
                    <p className="rounded-lg bg-white/15 px-4 py-3 text-base text-white">
                      Welcome back, <span className="font-semibold">{profileName}</span>.
                    </p>
                  ) : null}
                  {alreadySubmitted && !previewMode ? (
                    <p className="flex items-start gap-2 rounded-lg bg-amber-500/30 px-4 py-3 text-sm text-white">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      Already submitted
                      {submittedAt ? ` on ${new Date(submittedAt).toLocaleDateString('en-GB')}` : ''}.
                    </p>
                  ) : null}
                  <SteppedNavHint onContinue={validateCurrentAndAdvance} />
                </div>
              ) : null}

              {screen.kind === 'field' ? (
                whatsappField && screen.field.id === whatsappField.id ? (
                  <SteppedWhatsapp field={screen.field} controller={controller} onContinue={validateCurrentAndAdvance} />
                ) : (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-normal leading-tight text-white sm:text-3xl md:text-4xl">
                        {screen.field.label}
                        {screen.field.required ? <span className="text-red-300"> *</span> : null}
                      </h2>
                      {screen.field.description ? (
                        <p className="mt-3 text-base leading-relaxed text-white/80 sm:text-lg">
                          {screen.field.description}
                        </p>
                      ) : null}
                    </div>
                    <div className="rounded-xl bg-white/95 p-1 shadow-lg [&_input]:text-lg [&_textarea]:text-lg">
                      <PublicFormFieldInput
                        field={screen.field}
                        value={values[screen.field.id]}
                        readOnly={
                          screen.field.prefill_key === 'university' && Boolean(campusGroupName)
                        }
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
                    </div>
                    {screen.field.field_type !== 'radio' ? (
                      <SteppedNavHint onContinue={validateCurrentAndAdvance} />
                    ) : (
                      <p className="text-sm text-white/60">Select an option to continue</p>
                    )}
                  </div>
                )
              ) : null}

              {screen.kind === 'location' ? (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-normal leading-tight text-white sm:text-3xl md:text-4xl">
                      Share your location
                    </h2>
                    <p className="mt-3 text-base leading-relaxed text-white/80 sm:text-lg">
                      Optional — helps us know where respondents are joining from.
                    </p>
                  </div>
                  <div className="rounded-xl bg-white/95 p-4 shadow-lg">
                    <PublicFormLocationCapture
                      value={respondentLocation}
                      onChange={setRespondentLocation}
                    />
                  </div>
                  <SteppedNavHint onContinue={validateCurrentAndAdvance} label="Continue" />
                </div>
              ) : null}

              {screen.kind === 'review' ? (
                <div className="space-y-6 text-white">
                  <div>
                    <h2 className="text-2xl font-normal leading-tight sm:text-3xl md:text-4xl">
                      Review your answers
                    </h2>
                    <p className="mt-3 text-base text-white/80">Check everything looks correct, then submit.</p>
                  </div>
                  <div className="max-h-[50vh] space-y-3 overflow-y-auto rounded-xl bg-white/10 p-4 backdrop-blur-sm">
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
                  <div className="flex flex-wrap gap-3">
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-12 bg-white/90 px-6"
                      onClick={goBack}
                    >
                      Edit answers
                    </Button>
                    <PublicFormPrimaryButton
                      type="button"
                      className="h-12 bg-white text-slate-900 hover:bg-white/95"
                      onClick={() => void handleSubmit()}
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
                <p className="mt-4 rounded-lg bg-red-500/25 px-4 py-2 text-sm font-medium text-white">
                  {fieldError}
                </p>
              ) : null}
            </SteppedScreenContent>
          </div>
        </div>

        <div className="px-5 pb-6 text-center">
          <p className="text-xs text-white/50">
            {stepIndex + 1} / {screens.length}
          </p>
        </div>
      </div>
    </PublicFormPageShell>
  )
}

function ReviewLine({ label, value }: { label: string; value: string }) {
  const empty = value === '—' || !value.trim()
  return (
    <div className="border-b border-white/10 pb-3 last:border-0">
      <p className="text-xs font-medium uppercase tracking-wide text-white/60">{label}</p>
      <p className={cn('mt-1 text-base', empty ? 'italic text-white/40' : 'text-white')}>
        {empty ? 'No answer' : value}
      </p>
    </div>
  )
}
