import type { ChurchFormField } from '@/lib/types'
import { isValidPhone } from '@/lib/phone'

export function isFieldValueEmpty(field: ChurchFormField, value: unknown): boolean {
  return (
    value == null ||
    value === '' ||
    (Array.isArray(value) && value.length === 0) ||
    (field.field_type === 'checkbox' &&
      value !== true &&
      !(Array.isArray(value) && value.length > 0))
  )
}

export function validateField(field: ChurchFormField, value: unknown): string | null {
  if (field.field_type === 'radio' && field.required && (field.options ?? []).length === 0) {
    return `${field.label} needs answer choices in the form editor`
  }

  if (field.required && isFieldValueEmpty(field, value)) {
    return `${field.label} is required`
  }

  if (
    (field.field_type === 'phone' || field.prefill_key === 'phone') &&
    field.required &&
    value != null &&
    String(value).trim() !== '' &&
    !isValidPhone(String(value))
  ) {
    return `${field.label} must be a valid Ghana mobile number`
  }

  if (field.field_type === 'email' && value != null && String(value).trim() !== '') {
    const email = String(value).trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return `${field.label} must be a valid email address`
    }
  }

  return null
}

export function validateAllFields(
  fields: ChurchFormField[],
  values: Record<string, unknown>,
  options?: { requirePhoneLookup?: boolean; phone?: string }
): string | null {
  if (options?.requirePhoneLookup && !isValidPhone(options.phone ?? '')) {
    return 'Phone number is required (use a valid Ghana mobile number)'
  }

  for (const field of fields) {
    const error = validateField(field, values[field.id])
    if (error) return error
  }

  return null
}
