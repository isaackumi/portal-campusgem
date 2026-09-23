/** Shared helpers for dropdown "Other" + free-text specify. */

export const FORM_OTHER_OPTION = 'Other'

export function isOtherOption(option: string): boolean {
  return option.trim().toLowerCase() === FORM_OTHER_OPTION.toLowerCase()
}

export function optionsIncludeOther(options: string[] | undefined): boolean {
  return (options ?? []).some(isOtherOption)
}

/** Bare "Other" without a custom area name — incomplete. */
export function isIncompleteOtherValue(
  value: unknown,
  options: string[] | undefined
): boolean {
  if (!optionsIncludeOther(options)) return false
  return isOtherOption(String(value ?? ''))
}

/**
 * Dropdown allows listed options, or a custom non-empty string when "Other" is in the list.
 * Bare "Other" is never valid as a submitted value.
 */
export function isAllowedDropdownValue(
  value: unknown,
  options: string[] | undefined
): boolean {
  const raw = String(value ?? '').trim()
  if (!raw) return false
  if (isOtherOption(raw)) return false
  const opts = options ?? []
  if (opts.length === 0) return true
  if (opts.includes(raw)) return true
  return optionsIncludeOther(opts)
}
