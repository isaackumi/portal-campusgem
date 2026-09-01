import { isValidGhanaPhone } from '@/lib/camp/phone'

export function ghanaPhoneFieldInput(raw: string): string {
  return raw.replace(/[^\d+\s-]/g, '')
}

export function validateOptionalGhanaPhone(
  value: string | undefined,
  label: string
): string | null {
  const trimmed = value?.trim()
  if (!trimmed) return null
  if (!isValidGhanaPhone(trimmed)) {
    return `${label} must be a valid Ghana mobile number (e.g. 0244123456).`
  }
  return null
}

export function validateVisitorPhoneFields(form: {
  phone?: string
  secondary_phone?: string
  whatsapp?: string
  emergency_contact_phone?: string
}): string | null {
  return (
    validateOptionalGhanaPhone(form.phone, 'Phone') ??
    validateOptionalGhanaPhone(form.secondary_phone, 'Secondary phone') ??
    validateOptionalGhanaPhone(form.whatsapp, 'WhatsApp number') ??
    validateOptionalGhanaPhone(form.emergency_contact_phone, 'Emergency contact phone')
  )
}
