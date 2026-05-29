'use client'

import type { ReactNode } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { usePublicFormTheme } from '@/components/forms/public-form-theme-context'
import type { ChurchFormField } from '@/lib/types'
import { cn } from '@/lib/utils'

const inputClass =
  'h-12 rounded-xl border-slate-200 bg-white text-base shadow-none focus-visible:ring-2 focus-visible:ring-offset-0'

export function PublicFormQuestionBlock({
  field,
  children,
  isLast: _isLast,
  questionNumber,
}: {
  field: ChurchFormField
  children: ReactNode
  isLast?: boolean
  questionNumber?: number
}) {
  const theme = usePublicFormTheme()

  return (
    <section className="rounded-lg border border-slate-200/80 bg-white px-5 py-5 shadow-sm sm:px-6 sm:py-6">
      <fieldset className="space-y-4">
        <legend className="mb-0 w-full">
          <div className="flex items-start gap-3">
            {questionNumber != null ? (
              <span className="mt-0.5 text-sm font-normal text-slate-500">{questionNumber}.</span>
            ) : null}
            <div className="min-w-0 flex-1">
              <span className="text-base font-medium leading-snug text-slate-900">
                {field.label}
                {field.required ? <span className="text-red-500"> *</span> : null}
              </span>
              {field.description ? (
                <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{field.description}</p>
              ) : null}
            </div>
          </div>
        </legend>
        <div className={questionNumber != null ? 'pl-6 sm:pl-7' : undefined}>{children}</div>
        <div className="h-0.5 w-12 rounded-full opacity-30" style={{ backgroundColor: theme.accentHex }} />
      </fieldset>
    </section>
  )
}

function ChoiceOption({
  selected,
  onSelect,
  children,
  type,
  name,
}: {
  selected: boolean
  onSelect: () => void
  children: ReactNode
  type: 'radio' | 'checkbox'
  name?: string
}) {
  const theme = usePublicFormTheme()

  return (
    <label
      className={cn(
        'flex min-h-[3rem] cursor-pointer items-center gap-3 rounded-xl border px-4 py-3.5 transition-all active:scale-[0.99]',
        selected ? theme.choiceSelected : 'border-slate-200 bg-white active:bg-slate-50'
      )}
    >
      {type === 'radio' ? (
        <input
          type="radio"
          name={name}
          className="h-5 w-5 shrink-0 border-slate-300 accent-current"
          checked={selected}
          onChange={onSelect}
        />
      ) : null}
      <span className="flex-1 text-base leading-snug text-slate-800">{children}</span>
    </label>
  )
}

export function PublicFormFieldInput({
  field,
  value,
  onChange,
  onToggleCheckbox,
  readOnly = false,
}: {
  field: ChurchFormField
  value: unknown
  onChange: (value: unknown) => void
  onToggleCheckbox: (option: string, checked: boolean) => void
  readOnly?: boolean
}) {
  const theme = usePublicFormTheme()
  const lockedClass = readOnly ? 'bg-slate-50 text-slate-700' : ''

  switch (field.field_type) {
    case 'long_text':
      return (
        <Textarea
          className={cn(
            'min-h-[120px] resize-y rounded-xl border-slate-200 text-base shadow-none focus-visible:ring-2',
            lockedClass
          )}
          value={String(value ?? '')}
          onChange={(event) => onChange(event.target.value)}
          readOnly={readOnly}
          rows={4}
        />
      )

    case 'dropdown':
      if (readOnly) {
        return <Input className={cn(inputClass, lockedClass)} value={String(value ?? '')} readOnly />
      }
      return (
        <Select value={String(value ?? '')} onValueChange={onChange}>
          <SelectTrigger className={inputClass}>
            <SelectValue placeholder="Choose an option" />
          </SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((option) => (
              <SelectItem key={option} value={option} className="text-base">
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )

    case 'radio':
      if ((field.options ?? []).length === 0) {
        return <p className="text-sm text-amber-700">This question is not set up yet.</p>
      }
      return (
        <div className="space-y-2.5" role="radiogroup" aria-label={field.label}>
          {(field.options ?? []).map((option) => {
            const selected = String(value ?? '') === option
            return (
              <ChoiceOption
                key={option}
                type="radio"
                name={`field-${field.id}`}
                selected={selected}
                onSelect={() => onChange(option)}
              >
                {option}
              </ChoiceOption>
            )
          })}
        </div>
      )

    case 'checkbox':
      if ((field.options ?? []).length > 0) {
        return (
          <div className="space-y-2.5">
            {(field.options ?? []).map((option) => {
              const selected = Array.isArray(value) && (value as string[]).includes(option)
              return (
                <label
                  key={option}
                  className={cn(
                    'flex min-h-[3rem] cursor-pointer items-center gap-3 rounded-xl border px-4 py-3.5 transition-all active:scale-[0.99]',
                    selected ? theme.choiceSelected : 'border-slate-200 bg-white active:bg-slate-50'
                  )}
                >
                  <Checkbox
                    checked={selected}
                    className="h-5 w-5"
                    onCheckedChange={(checked) => onToggleCheckbox(option, checked === true)}
                  />
                  <span className="text-base leading-snug text-slate-800">{option}</span>
                </label>
              )
            })}
          </div>
        )
      }
      return (
        <label
          className={cn(
            'flex min-h-[3rem] cursor-pointer items-center gap-3 rounded-xl border px-4 py-3.5',
            value === true ? theme.choiceSelected : 'border-slate-200 bg-white'
          )}
        >
          <Checkbox
            checked={value === true}
            className="h-5 w-5"
            onCheckedChange={(checked) => onChange(checked === true)}
          />
          <span className="text-base text-slate-800">Yes</span>
        </label>
      )

    default:
      return (
        <Input
          className={cn(inputClass, lockedClass)}
          readOnly={readOnly}
          type={
            field.field_type === 'email'
              ? 'email'
              : field.field_type === 'number'
                ? 'number'
                : field.field_type === 'date'
                  ? 'date'
                  : 'text'
          }
          value={String(value ?? '')}
          onChange={(event) => onChange(event.target.value)}
          placeholder={
            field.field_type === 'file'
              ? 'Paste a link to your file'
              : field.field_type === 'phone'
                ? '054 123 4567'
                : field.field_type === 'email'
                  ? 'you@example.com'
                  : undefined
          }
        />
      )
  }
}
