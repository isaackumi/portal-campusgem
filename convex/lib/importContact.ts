import { isValidGhanaPhone, normalizeGhanaPhone, sanitizePhoneInput } from './phone'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidImportEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim())
}

export function collectImportContactWarnings(rawPhone: string, email: string): string[] {
  const warnings: string[] = []

  if (!rawPhone) {
    warnings.push('Missing phone number')
  } else if (!isValidGhanaPhone(rawPhone)) {
    warnings.push('Invalid phone number format')
  }

  const emailNorm = email.trim()
  if (emailNorm && !isValidImportEmail(emailNorm)) {
    warnings.push('Invalid email format')
  }

  return warnings
}

export function resolveImportPhoneForStorage(rawPhone: string, sourceRow: number): string {
  if (!rawPhone) return `import-missing-phone-row-${sourceRow}`
  if (isValidGhanaPhone(rawPhone)) return normalizeGhanaPhone(rawPhone)
  return (sanitizePhoneInput(rawPhone) || rawPhone.trim()).slice(0, 60)
}

export function importPhoneDedupeKey(rawPhone: string, sourceRow: number): string {
  if (rawPhone && isValidGhanaPhone(rawPhone)) {
    return normalizeGhanaPhone(rawPhone)
  }
  return `invalid-import-row-${sourceRow}`
}
