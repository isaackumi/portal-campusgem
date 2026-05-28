'use client'

import type { ReactNode } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { ChurchFormField } from '@/lib/types'
import { cn } from '@/lib/utils'

const inputClass = 'h-11 border-slate-200 shadow-none focus-visible:ring-primary/30'

export function PublicFormQuestionBlock({
  field,
  children,
  isLast,
}: {
  field: ChurchFormField
  children: ReactNode
  isLast?: boolean
}) {
  return (
    <div className={cn('px-6 py-5 sm:py-6', !isLast && 'border-b border-slate-100')}>
      <fieldset className="space-y-3">
        <legend className="mb-0">
          <span className="text-[15px] font-medium leading-snug text-slate-900">
            {field.label}
            {field.required ? <span className="text-red-500"> *</span> : null}
          </span>
          {field.description ? (
            <p className="mt-1 text-sm font-normal leading-relaxed text-slate-500">{field.description}</p>
          ) : null}
        </legend>
        <div>{children}</div>
      </fieldset>
    </div>
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
  return (
    <label
      className={cn(
        'flex cursor-pointer items-center gap-3 rounded-lg border px-3.5 py-3 transition-colors',
        selected
          ? 'border-primary/50 bg-primary/[0.04]'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
      )}
    >
      {type === 'radio' ? (
        <input
          type="radio"
          name={name}
          className="h-4 w-4 shrink-0 border-slate-300 text-primary focus:ring-primary/30"
          checked={selected}
          onChange={onSelect}
        />
      ) : null}
      <span className="flex-1 text-sm leading-snug text-slate-800">{children}</span>
    </label>
  )
}

export function PublicFormFieldInput({
  field,
  value,
  onChange,
  onToggleCheckbox,
}: {
  field: ChurchFormField
  value: unknown
  onChange: (value: unknown) => void
  onToggleCheckbox: (option: string, checked: boolean) => void
}) {
  switch (field.field_type) {
    case 'long_text':
      return (
        <Textarea
          className="min-h-[112px] resize-y border-slate-200 shadow-none focus-visible:ring-primary/30"
          value={String(value ?? '')}
          onChange={(event) => onChange(event.target.value)}
          rows={4}
        />
      )

    case 'dropdown':
      return (
        <Select value={String(value ?? '')} onValueChange={onChange}>
          <SelectTrigger className={inputClass}>
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((option) => (
              <SelectItem key={option} value={option}>
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
        <div className="space-y-2" role="radiogroup" aria-label={field.label}>
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
          <div className="space-y-2">
            {(field.options ?? []).map((option) => {
              const selected = Array.isArray(value) && (value as string[]).includes(option)
              return (
                <label
                  key={option}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-lg border px-3.5 py-3 transition-colors',
                    selected
                      ? 'border-primary/50 bg-primary/[0.04]'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                  )}
                >
                  <Checkbox
                    checked={selected}
                    onCheckedChange={(checked) => onToggleCheckbox(option, checked === true)}
                  />
                  <span className="text-sm leading-snug text-slate-800">{option}</span>
                </label>
              )
            })}
          </div>
        )
      }
      return (
        <label
          className={cn(
            'flex cursor-pointer items-center gap-3 rounded-lg border px-3.5 py-3 transition-colors',
            value === true
              ? 'border-primary/50 bg-primary/[0.04]'
              : 'border-slate-200 bg-white hover:bg-slate-50/50'
          )}
        >
          <Checkbox checked={value === true} onCheckedChange={(checked) => onChange(checked === true)} />
          <span className="text-sm text-slate-800">Yes</span>
        </label>
      )

    default:
      return (
        <Input
          className={inputClass}
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
              ? 'Paste a link'
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
