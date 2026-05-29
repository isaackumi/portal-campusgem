'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { PublicFormFieldInput, PublicFormQuestionBlock } from '@/components/forms/public-form-field'
import type { ChurchFormField } from '@/lib/types'

type Props = {
  whatsappField: ChurchFormField
  phone: string
  value: unknown
  sameAsPhone: boolean
  onSameAsPhoneChange: (checked: boolean) => void
  onValueChange: (value: unknown) => void
  isLast?: boolean
  questionNumber?: number
}

export function WhatsappSameAsPhoneBlock({
  whatsappField,
  phone,
  value,
  sameAsPhone,
  onSameAsPhoneChange,
  onValueChange,
  isLast,
  questionNumber,
}: Props) {
  return (
    <PublicFormQuestionBlock
      field={whatsappField}
      isLast={isLast && sameAsPhone}
      questionNumber={questionNumber}
    >
      <div className="space-y-4">
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3.5 active:bg-slate-100">
          <Checkbox
            checked={sameAsPhone}
            onCheckedChange={(checked) => onSameAsPhoneChange(checked === true)}
            className="mt-0.5 h-5 w-5"
          />
          <div className="space-y-1">
            <Label className="cursor-pointer text-base font-medium text-slate-900">
              Same as my phone number
            </Label>
            {phone ? (
              <p className="text-sm text-slate-600">
                WhatsApp: <span className="font-semibold text-slate-800">{phone}</span>
              </p>
            ) : (
              <p className="text-sm text-slate-500">Enter your phone number first.</p>
            )}
          </div>
        </label>
        {!sameAsPhone ? (
          <PublicFormFieldInput
            field={whatsappField}
            value={value}
            onChange={onValueChange}
            onToggleCheckbox={() => {}}
          />
        ) : null}
      </div>
    </PublicFormQuestionBlock>
  )
}
