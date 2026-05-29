import type { ChurchFormField } from '@/lib/types'
import { isValidPhone } from '@/lib/phone'
import { findWhatsappField } from '@/lib/forms/whatsapp-phone'
import { applyWhatsappSameAsPhone } from '@/lib/forms/whatsapp-phone'

export type FormValidationContext = {
  phone?: string
  whatsappSameAsPhone?: boolean
  whatsappFieldId?: string
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
    return 'Phone number is required (use a valid Ghana mobile number)'
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
