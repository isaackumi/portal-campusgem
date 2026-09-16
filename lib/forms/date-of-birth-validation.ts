/** Camp / directory DOB rules — reject “today” and under-10 entries. */
export const MIN_FORM_AGE_YEARS = 10
export const MAX_FORM_AGE_YEARS = 100

export function isDateOfBirthField(field: {
  field_type: string
  prefill_key?: string | null
  label: string
}): boolean {
  if (field.prefill_key === 'date_of_birth') return true
  if (field.field_type !== 'date') return false
  const label = field.label.toLowerCase()
  return (
    label.includes('birth') ||
    label.includes('birthday') ||
    label.includes('dob') ||
    label === 'date of birth'
  )
}

/** Parse `YYYY-MM-DD` as a local calendar date (avoids UTC shift). */
export function parseIsoDateOnly(value: string): Date | null {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null
  }
  return date
}

export function startOfLocalDay(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function ageInYearsOn(dob: Date, on: Date = new Date()): number {
  let age = on.getFullYear() - dob.getFullYear()
  const monthDelta = on.getMonth() - dob.getMonth()
  if (monthDelta < 0 || (monthDelta === 0 && on.getDate() < dob.getDate())) {
    age -= 1
  }
  return age
}

/**
 * Validate an optional/required DOB value.
 * Empty values return null (caller handles `required`).
 */
export function validateDateOfBirthValue(
  value: unknown,
  options?: {
    label?: string
    minAgeYears?: number
    maxAgeYears?: number
    today?: Date
  }
): string | null {
  if (value == null || String(value).trim() === '') return null

  const label = options?.label?.trim() || 'Date of birth'
  const minAge = options?.minAgeYears ?? MIN_FORM_AGE_YEARS
  const maxAge = options?.maxAgeYears ?? MAX_FORM_AGE_YEARS
  const today = startOfLocalDay(options?.today ?? new Date())

  const dob = parseIsoDateOnly(String(value))
  if (!dob) {
    return `${label} must be a valid date`
  }

  if (dob.getTime() >= today.getTime()) {
    return `${label} cannot be today or a future date — enter your real birth date`
  }

  const age = ageInYearsOn(dob, today)
  if (age < minAge) {
    return `${label}: campers must be at least ${minAge} years old`
  }
  if (age > maxAge) {
    return `${label} looks incorrect — check the year`
  }

  return null
}
