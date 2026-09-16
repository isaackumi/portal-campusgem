import type { ChurchFormField } from '@/lib/types'
import { isValidPhone } from '@/lib/phone'
import { findWhatsappField } from '@/lib/forms/whatsapp-phone'
import { applyWhatsappSameAsPhone } from '@/lib/forms/whatsapp-phone'
import {
  isDateOfBirthField,
  validateDateOfBirthValue,
} from '@/lib/forms/date-of-birth-validation'

export type FormValidationContext = {
  phone?: string
  whatsappSameAsPhone?: boolean
  whatsappFieldId?: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i

function isPhoneLikeField(field: ChurchFormField): boolean {
  if (field.field_type === 'phone') return true
  const key = field.prefill_key?.trim()
  return key === 'phone' || key === 'whatsapp' || key === 'parent_contact'
}

function isEmailLikeField(field: ChurchFormField): boolean {
  return field.field_type === 'email' || field.prefill_key === 'email'
}

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

export function getEffectiveFieldValue(
  field: ChurchFormField,
  values: Record<string, unknown>,
  context?: FormValidationContext
): unknown {
  if (
    context?.whatsappFieldId &&
    field.id === context.whatsappFieldId &&
    context.whatsappSameAsPhone &&
    context.phone?.trim()
  ) {
    return context.phone.trim()
  }
  return values[field.id]
}

export function validateField(field: ChurchFormField, value: unknown): string | null {
  if (field.field_type === 'radio' && field.required && (field.options ?? []).length === 0) {
    return `${field.label} needs answer choices in the form editor`
  }

  if (field.required && isFieldValueEmpty(field, value)) {
    return `${field.label} is required`
  }

  if (isFieldValueEmpty(field, value)) {
    return null
  }

  if (isPhoneLikeField(field) && !isValidPhone(String(value))) {
    return `${field.label} must be a valid Ghana mobile number`
  }

  if (isEmailLikeField(field)) {
    const email = String(value).trim()
    if (!EMAIL_RE.test(email)) {
      return `${field.label} must be a valid email address`
    }
  }

  if (isDateOfBirthField(field)) {
    return validateDateOfBirthValue(value, { label: field.label })
  }

  return null
}

export function validateFieldWithContext(
  field: ChurchFormField,
  values: Record<string, unknown>,
  context?: FormValidationContext
): string | null {
  return validateField(field, getEffectiveFieldValue(field, values, context))
}

export function validateAllFields(
  fields: ChurchFormField[],
  values: Record<string, unknown>,
  options?: {
    requirePhoneLookup?: boolean
    phone?: string
    context?: FormValidationContext
  }
): string | null {
  if (options?.requirePhoneLookup && !isValidPhone(options.phone ?? '')) {
    return 'Phone number is required (use a valid Ghana mobile number) — needed for SMS confirmation'
  }

  for (const field of fields) {
    const error = validateFieldWithContext(field, values, options?.context)
    if (error) return error
  }

  return null
}

/** Merge WhatsApp-from-phone and validate the full payload before submit. */
export function prepareAndValidateSubmitValues(input: {
  fields: ChurchFormField[]
  values: Record<string, unknown>
  phone: string
  whatsappSameAsPhone: boolean
  requirePhoneLookup?: boolean
}): { values: Record<string, unknown>; error: string | null } {
  const whatsappField = findWhatsappField(input.fields)
  const values = applyWhatsappSameAsPhone(
    input.values,
    input.fields,
    input.phone,
    input.whatsappSameAsPhone
  )
  const error = validateAllFields(input.fields, values, {
    requirePhoneLookup: input.requirePhoneLookup,
    phone: input.phone,
    context: {
      phone: input.phone,
      whatsappSameAsPhone: input.whatsappSameAsPhone,
      whatsappFieldId: whatsappField?.id,
    },
  })
  return { values, error }
}
