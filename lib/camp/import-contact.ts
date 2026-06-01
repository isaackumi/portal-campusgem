import { isValidGhanaPhone, normalizeGhanaPhone, sanitizePhoneInput } from '@/lib/camp/phone'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidImportEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim())
}

export function collectImportContactWarnings(
  phone: string | undefined,
  email: string | undefined
): string[] {
  const warnings: string[] = []
  const rawPhone = sanitizePhoneInput(phone ?? '')

  if (!rawPhone) {
    warnings.push('Missing phone number')
  } else if (!isValidGhanaPhone(rawPhone)) {
    warnings.push('Invalid phone number format')
  }

  const emailNorm = String(email ?? '').trim()
  if (emailNorm && !isValidImportEmail(emailNorm)) {
    warnings.push('Invalid email format')
  }

  return warnings
}

/** Stored phone value for imported rows — normalized when valid, raw otherwise. */
export function resolveImportPhoneForStorage(rawPhone: string, sourceRow: number): string {
  if (!rawPhone) return `import-missing-phone-row-${sourceRow}`
  if (isValidGhanaPhone(rawPhone)) return normalizeGhanaPhone(rawPhone)
  return (sanitizePhoneInput(rawPhone) || rawPhone.trim()).slice(0, 60)
}

/** Dedupe key — invalid/missing phones are scoped per import row. */
export function importPhoneDedupeKey(rawPhone: string, sourceRow: number): string {
  if (rawPhone && isValidGhanaPhone(rawPhone)) {
    return normalizeGhanaPhone(rawPhone)
  }
  return `invalid-import-row-${sourceRow}`
}
