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

const steppedInputClass =
  'h-14 rounded-none border-0 border-b-2 border-white/40 bg-transparent px-0 text-xl text-white shadow-none placeholder:text-white/45 focus-visible:border-white focus-visible:ring-0'

function ChoiceOption({
  selected,
  onSelect,
  children,
  type,
  name,
  variant = 'classic',
}: {
  selected: boolean
  onSelect: () => void
  children: ReactNode
  type: 'radio' | 'checkbox'
  name?: string
  variant?: 'classic' | 'stepped'
}) {
  const theme = usePublicFormTheme()

  if (variant === 'stepped') {
    return (
      <label
        onClick={type === 'checkbox' ? onSelect : undefined}
        className={cn(
          'flex min-h-[3.25rem] cursor-pointer items-center gap-3 rounded-2xl border-2 px-5 py-4 transition-all duration-200 active:scale-[0.99]',
          selected
            ? 'border-white bg-white/20 shadow-lg backdrop-blur-sm'
            : 'border-white/25 bg-white/10 hover:border-white/50 hover:bg-white/15'
        )}
      >
        {type === 'radio' ? (
          <input
            type="radio"
            name={name}
            className="h-5 w-5 shrink-0 border-white/50 accent-white"
            checked={selected}
            onChange={onSelect}
          />
        ) : (
          <span
            className={cn(
              'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 border-white/70 text-xs font-bold',
              selected ? 'border-white bg-white text-slate-900' : 'bg-transparent text-transparent'
            )}
          >
            ✓
          </span>
        )}
        <span className="flex-1 text-lg leading-snug text-white">{children}</span>
      </label>
    )
  }

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
  variant = 'classic',
  autoFocus = false,
}: {
  field: ChurchFormField
  value: unknown
  onChange: (value: unknown) => void
  onToggleCheckbox: (option: string, checked: boolean) => void
  readOnly?: boolean
  variant?: 'classic' | 'stepped'
  autoFocus?: boolean
}) {
  const theme = usePublicFormTheme()
  const lockedClass = readOnly ? 'bg-slate-50 text-slate-700' : ''
  const isStepped = variant === 'stepped'
  const textInputClass = isStepped ? steppedInputClass : cn(inputClass, lockedClass)

  switch (field.field_type) {
    case 'long_text':
      return (
        <Textarea
          className={cn(
            isStepped
              ? 'min-h-[140px] resize-y rounded-2xl border-2 border-white/30 bg-white/10 px-4 py-3 text-lg text-white shadow-none placeholder:text-white/45 focus-visible:border-white focus-visible:ring-0'
              : 'min-h-[120px] resize-y rounded-xl border-slate-200 text-base shadow-none focus-visible:ring-2',
            !isStepped && lockedClass
          )}
          value={String(value ?? '')}
          onChange={(event) => onChange(event.target.value)}
          readOnly={readOnly}
          rows={4}
          autoFocus={autoFocus}
        />
      )

    case 'dropdown':
      if (readOnly) {
        return (
          <Input
            className={textInputClass}
            value={String(value ?? '')}
            readOnly
            autoFocus={autoFocus}
          />
        )
      }
      if (isStepped) {
        return (
          <select
            className={cn(
              steppedInputClass,
              'w-full appearance-none bg-transparent pr-8 text-lg outline-none'
            )}
            value={String(value ?? '')}
            onChange={(event) => onChange(event.target.value)}
            autoFocus={autoFocus}
          >
            <option value="" className="text-slate-900">
              Choose an option
            </option>
            {(field.options ?? []).map((option) => (
              <option key={option} value={option} className="text-slate-900">
                {option}
              </option>
            ))}
          </select>
        )
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
        return (
          <p className={cn('text-sm', isStepped ? 'text-amber-100' : 'text-amber-700')}>
            This question is not set up yet.
          </p>
        )
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
                variant={variant}
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
              if (isStepped) {
                return (
                  <ChoiceOption
                    key={option}
                    type="checkbox"
                    selected={selected}
                    onSelect={() => onToggleCheckbox(option, !selected)}
                    variant="stepped"
                  >
                    {option}
                  </ChoiceOption>
                )
              }
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
      if (isStepped) {
        return (
          <ChoiceOption
            type="checkbox"
            selected={value === true}
            onSelect={() => onChange(value !== true)}
            variant="stepped"
          >
            Yes
          </ChoiceOption>
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
          className={textInputClass}
          readOnly={readOnly}
          autoFocus={autoFocus}
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
                  : isStepped
                    ? 'Type your answer…'
                    : undefined
          }
        />
      )
  }
}
