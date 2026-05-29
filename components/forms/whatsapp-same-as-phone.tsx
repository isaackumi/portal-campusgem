'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { PublicFormFieldInput, PublicFormQuestionBlock } from '@/components/forms/public-form-field'
import type { ChurchFormField } from '@/lib/types'
import { cn } from '@/lib/utils'

type Props = {
  whatsappField: ChurchFormField
  phone: string
  value: unknown
  sameAsPhone: boolean
  onSameAsPhoneChange: (checked: boolean) => void
  onValueChange: (value: unknown) => void
  isLast?: boolean
  questionNumber?: number
  variant?: 'classic' | 'stepped'
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
  variant = 'classic',
}: Props) {
  const isStepped = variant === 'stepped'

  const toggle = (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-3 px-4 py-3.5 transition-all',
        isStepped
          ? 'rounded-2xl border-2 border-white/25 bg-white/10 hover:border-white/50'
          : 'rounded-xl border border-slate-200 bg-slate-50/80 active:bg-slate-100'
      )}
    >
      <Checkbox
        checked={sameAsPhone}
        onCheckedChange={(checked) => onSameAsPhoneChange(checked === true)}
        className={cn('mt-0.5 h-5 w-5', isStepped && 'border-white/70 data-[state=checked]:bg-white data-[state=checked]:text-slate-900')}
      />
      <div className="space-y-1">
        <Label className={cn('cursor-pointer text-base font-medium', isStepped ? 'text-white' : 'text-slate-900')}>
          Same as my phone number
        </Label>
        {phone ? (
          <p className={cn('text-sm', isStepped ? 'text-white/80' : 'text-slate-600')}>
            WhatsApp: <span className="font-semibold">{phone}</span>
          </p>
        ) : (
          <p className={cn('text-sm', isStepped ? 'text-white/60' : 'text-slate-500')}>
            Enter your phone number first.
          </p>
        )}
      </div>
    </label>
  )

  if (isStepped) {
    return (
      <div className="space-y-4">
        {toggle}
        {!sameAsPhone ? (
          <PublicFormFieldInput
            field={whatsappField}
            value={value}
            onChange={onValueChange}
            onToggleCheckbox={() => {}}
            variant="stepped"
          />
        ) : null}
      </div>
    )
  }

  return (
    <PublicFormQuestionBlock
      field={whatsappField}
      isLast={isLast && sameAsPhone}
      questionNumber={questionNumber}
    >
      <div className="space-y-4">
        {toggle}
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
