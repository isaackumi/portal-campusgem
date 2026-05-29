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
}

export function WhatsappSameAsPhoneBlock({
  whatsappField,
  phone,
  value,
  sameAsPhone,
  onSameAsPhoneChange,
  onValueChange,
  isLast,
}: Props) {
  return (
    <div className="space-y-0">
      <div className="border-b border-slate-100 px-6 py-4">
        <label className="flex cursor-pointer items-start gap-3">
          <Checkbox
            checked={sameAsPhone}
            onCheckedChange={(checked) => onSameAsPhoneChange(checked === true)}
            className="mt-0.5"
          />
          <div className="space-y-1">
            <Label className="cursor-pointer text-sm font-medium text-slate-900">
              My WhatsApp number is the same as my phone number
            </Label>
            {phone ? (
              <p className="text-sm text-muted-foreground">
                We will use <span className="font-medium text-slate-700">{phone}</span> for WhatsApp.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">Enter your phone number first.</p>
            )}
          </div>
        </label>
      </div>
      {!sameAsPhone ? (
        <PublicFormQuestionBlock field={whatsappField} isLast={isLast}>
          <PublicFormFieldInput
            field={whatsappField}
            value={value}
            onChange={onValueChange}
            onToggleCheckbox={() => {}}
          />
        </PublicFormQuestionBlock>
      ) : null}
    </div>
  )
}
