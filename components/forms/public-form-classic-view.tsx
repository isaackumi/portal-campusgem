'use client'

import { formatResponseValue } from '@/lib/forms/analytics'
import {
  PublicFormFieldInput,
  PublicFormQuestionBlock,
} from '@/components/forms/public-form-field'
import {
  PublicFormDocument,
  PublicFormPageShell,
  PublicFormPhoneLookup,
  PublicFormPrimaryButton,
  PublicFormReviewActions,
  PublicFormReviewRow,
  PublicFormSubmitBar,
  PublicFormSuccess,
} from '@/components/forms/public-form-layout'
import { PublicFormLocationCapture } from '@/components/forms/public-form-location'
import { PublicFormToolbar } from '@/components/forms/public-form-toolbar'
import { PublicFormPreviewBanner } from '@/components/forms/public-form-preview-banner'
import { WhatsappSameAsPhoneBlock } from '@/components/forms/whatsapp-same-as-phone'
import { applyWhatsappSameAsPhone } from '@/lib/forms/whatsapp-phone'
import type { PublicFormController } from '@/hooks/use-public-form'

export function PublicFormClassicView({ controller }: { controller: PublicFormController }) {
  const {
    form,
    fields,
    campusGroupName,
    campYearLabel,
    previewMode,
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
    goToReview,
    handleSubmit,
  } = controller

  const toolbar = <PublicFormToolbar form={form} campYearLabel={campYearLabel} previewMode={previewMode} />

  if (submitted) {
    return (
      <PublicFormPageShell form={form}>
        {previewMode ? <PublicFormPreviewBanner /> : null}
        {toolbar}
        <PublicFormSuccess title={form.title} form={form} />
      </PublicFormPageShell>
    )
  }

  if (classicStep === 'review') {
    const reviewPhone = getRespondentPhone()
    const displayValues = applyWhatsappSameAsPhone(values, fields, reviewPhone, whatsappSameAsPhone)
    return (
      <PublicFormPageShell form={form}>
        {previewMode ? <PublicFormPreviewBanner /> : null}
        <PublicFormDocument
          step="review"
          form={form}
          groupName={campusGroupName}
          campYearLabel={campYearLabel}
          toolbar={toolbar}
        >
          {reviewPhone && !controller.phoneField ? (
            <PublicFormReviewRow label="Phone number" value={reviewPhone} />
          ) : null}
          {fields.map((field) => (
            <PublicFormReviewRow
              key={field.id}
              label={field.label}
              value={formatResponseValue(displayValues[field.id])}
            />
          ))}
          {respondentLocation ? (
            <PublicFormReviewRow
              label="Location"
              value={
                respondentLocation.label ??
                `${respondentLocation.latitude.toFixed(5)}, ${respondentLocation.longitude.toFixed(5)}`
              }
            />
          ) : null}
        </PublicFormDocument>
        <PublicFormReviewActions
          onEdit={() => setClassicStep('fill')}
          onSubmit={() => void handleSubmit()}
          submitting={submitting}
          disabled={alreadySubmitted && !previewMode}
        />
      </PublicFormPageShell>
    )
  }

  return (
    <PublicFormPageShell form={form}>
      {previewMode ? <PublicFormPreviewBanner /> : null}
      <form
        onSubmit={(event) => {
          event.preventDefault()
          goToReview()
        }}
      >
        <PublicFormDocument
          step="fill"
          form={form}
          groupName={campusGroupName}
          campYearLabel={campYearLabel}
          toolbar={toolbar}
        >
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
            <p className="rounded-lg border border-slate-200/80 bg-white px-6 py-10 text-center text-sm text-slate-500 shadow-sm">
              No questions yet.
            </p>
          ) : (
            visibleFields.map((field, index) => {
              const questionNumber = index + 1
              const isLastField =
                index === visibleFields.length - 1 && !form.capture_respondent_location

              if (whatsappField && field.id === whatsappField.id) {
                return (
                  <WhatsappSameAsPhoneBlock
                    key={field.id}
                    whatsappField={field}
                    phone={getRespondentPhone()}
                    value={values[field.id]}
                    sameAsPhone={whatsappSameAsPhone}
                    onSameAsPhoneChange={setWhatsappSameAsPhone}
                    onValueChange={(value) => setFieldValue(field.id, value)}
                    isLast={isLastField}
                    questionNumber={questionNumber}
                  />
                )
              }

              const universityLocked =
                field.prefill_key === 'university' && Boolean(campusGroupName)

              return (
                <PublicFormQuestionBlock
                  key={field.id}
                  field={field}
                  isLast={isLastField}
                  questionNumber={questionNumber}
                >
                  <PublicFormFieldInput
                    field={field}
                    value={values[field.id]}
                    readOnly={universityLocked}
                    onChange={(value) => setFieldValue(field.id, value)}
                    onToggleCheckbox={(option, checked) =>
                      toggleCheckboxOption(field.id, option, checked)
                    }
                  />
                </PublicFormQuestionBlock>
              )
            })
          )}

          {form.capture_respondent_location ? (
            <PublicFormLocationCapture value={respondentLocation} onChange={setRespondentLocation} />
          ) : null}
        </PublicFormDocument>

        <PublicFormSubmitBar>
          <PublicFormPrimaryButton type="submit" disabled={alreadySubmitted && !previewMode}>
            Continue to review
          </PublicFormPrimaryButton>
        </PublicFormSubmitBar>
      </form>
    </PublicFormPageShell>
  )
}
