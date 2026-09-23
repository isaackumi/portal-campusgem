'use client'

import { useEffect, useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import {
  FORM_OTHER_OPTION,
  isOtherOption,
  optionsIncludeOther,
} from '@/lib/forms/dropdown-other'
import { cn } from '@/lib/utils'

type SearchableFormSelectProps = {
  options: string[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  autoFocus?: boolean
  variant?: 'classic' | 'stepped'
  id?: string
}

/**
 * Type-to-filter select. Choosing "Other" requires a free-text area name;
 * the stored value becomes that custom text (never bare "Other").
 */
export function SearchableFormSelect({
  options,
  value,
  onChange,
  placeholder = 'Search or choose…',
  autoFocus = false,
  variant = 'classic',
  id,
}: SearchableFormSelectProps) {
  const isStepped = variant === 'stepped'
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [forceOther, setForceOther] = useState(false)

  const valueInOptions = options.some((opt) => opt === value && !isOtherOption(opt))
  const showingOther =
    forceOther ||
    isOtherOption(value) ||
    (optionsIncludeOther(options) && Boolean(value.trim()) && !options.includes(value))

  const otherText = showingOther && !isOtherOption(value) ? value : ''

  useEffect(() => {
    if (valueInOptions) setForceOther(false)
  }, [valueInOptions])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((opt) => opt.toLowerCase().includes(q))
  }, [options, query])

  const closedDisplay = showingOther ? FORM_OTHER_OPTION : value

  const classicInput =
    'h-12 rounded-xl border-slate-200 bg-white text-base shadow-none focus-visible:ring-2 focus-visible:ring-offset-0'
  const steppedInput =
    'h-14 rounded-none border-0 border-b-2 border-white/40 bg-transparent px-0 text-xl text-white shadow-none placeholder:text-white/45 focus-visible:border-white focus-visible:ring-0'

  function selectOption(option: string) {
    setQuery('')
    setOpen(false)
    if (isOtherOption(option)) {
      setForceOther(true)
      onChange('')
      return
    }
    setForceOther(false)
    onChange(option)
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Input
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={id ? `${id}-listbox` : undefined}
          autoComplete="off"
          autoFocus={autoFocus && !showingOther}
          className={cn(isStepped ? steppedInput : classicInput, 'w-full')}
          placeholder={placeholder}
          value={open ? query : closedDisplay}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
          }}
          onFocus={() => {
            setQuery('')
            setOpen(true)
          }}
          onBlur={() => {
            window.setTimeout(() => setOpen(false), 150)
          }}
        />

        {open ? (
          <div
            id={id ? `${id}-listbox` : undefined}
            role="listbox"
            className={cn(
              'absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border shadow-lg',
              isStepped
                ? 'border-white/30 bg-slate-900/95 text-white backdrop-blur'
                : 'border-slate-200 bg-white text-slate-900'
            )}
          >
            {filtered.length === 0 ? (
              <p
                className={cn(
                  'px-4 py-3 text-sm',
                  isStepped ? 'text-white/60' : 'text-slate-500'
                )}
              >
                No matches — try another spelling, or choose Other
              </p>
            ) : (
              filtered.map((option) => {
                const selected =
                  (showingOther && isOtherOption(option)) ||
                  (!showingOther && option === value)
                return (
                  <button
                    key={option}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={cn(
                      'flex w-full px-4 py-3 text-left text-base transition-colors',
                      isStepped
                        ? selected
                          ? 'bg-white/20'
                          : 'hover:bg-white/10'
                        : selected
                          ? 'bg-slate-100 font-medium'
                          : 'hover:bg-slate-50'
                    )}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectOption(option)}
                  >
                    {option}
                  </button>
                )
              })
            )}
          </div>
        ) : null}
      </div>

      {showingOther ? (
        <div className="space-y-1.5">
          <label
            className={cn(
              'block text-sm',
              isStepped ? 'text-white/80' : 'text-slate-600'
            )}
            htmlFor={id ? `${id}-other` : undefined}
          >
            Please specify your area <span className="text-red-500">*</span>
          </label>
          <Input
            id={id ? `${id}-other` : undefined}
            className={cn(isStepped ? steppedInput : classicInput, 'w-full')}
            placeholder="Town or area name"
            value={otherText}
            onChange={(event) => {
              setForceOther(true)
              onChange(event.target.value)
            }}
            autoFocus={forceOther || isOtherOption(value)}
          />
        </div>
      ) : null}
    </div>
  )
}
