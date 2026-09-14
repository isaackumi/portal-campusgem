export function primaryPhoneToken(phone: string): string {
  return phone.replace(/\s/g, '').split(/[/,]/)[0]?.trim() ?? ''
}

/**
 * Normalize Ghana phone input.
 * Valid mobiles are 10 local digits (0XXXXXXXXX) or 233XXXXXXXXX / +233XXXXXXXXX.
 */
export function sanitizePhoneInput(value: unknown): string {
  if (value == null || value === '') return ''

  const asDigits = (raw: string) => raw.replace(/[^\d+]/g, '')

  if (typeof value === 'number' && Number.isFinite(value)) {
    const digits = String(Math.trunc(Math.abs(value)))
    if (/^233\d{9}$/.test(digits)) return `+${digits}`
    if (/^0\d{9}$/.test(digits)) return digits
    // Excel often drops the leading 0 → 9 national digits
    if (/^[1-9]\d{8}$/.test(digits)) return `0${digits}`
    return ''
  }

  let raw = String(value).trim()
  if (/^\d+(\.0+)?$/.test(raw)) {
    const digits = raw.replace(/\.\d+$/, '')
    if (/^233\d{9}$/.test(digits)) return `+${digits}`
    if (/^0\d{9}$/.test(digits)) return digits
    if (/^[1-9]\d{8}$/.test(digits)) return `0${digits}`
    // Incomplete local like 024842385 (9 chars) — reject
    return ''
  }

  const primary = primaryPhoneToken(raw)
  const compact = asDigits(primary)
  if (/^\+233\d{9}$/.test(compact)) return compact
  if (/^233\d{9}$/.test(compact)) return `+${compact}`
  if (/^0\d{9}$/.test(compact)) return compact
  if (/^[1-9]\d{8}$/.test(compact)) return `0${compact}`
  return ''
}

export function isValidGhanaPhone(phone: string): boolean {
  const primary = sanitizePhoneInput(phone)
  if (!primary) return false
  return /^(?:\+233\d{9}|0\d{9}|233\d{9})$/.test(primary)
}

export function normalizeGhanaPhone(phone: string): string {
  const primary = sanitizePhoneInput(phone)
  if (!isValidGhanaPhone(primary)) return ''
  if (primary.startsWith('+233')) return primary
  if (primary.startsWith('0')) return `+233${primary.slice(1)}`
  if (primary.startsWith('233')) return `+${primary}`
  return `+233${primary}`
}

export function phoneLookupVariants(phone: string): string[] {
  const trimmed = primaryPhoneToken(sanitizePhoneInput(phone))
  if (!trimmed) return []

  const variants = new Set<string>([trimmed, normalizeGhanaPhone(trimmed)])
  const intl = normalizeGhanaPhone(trimmed)
  if (intl.startsWith('+233')) {
    variants.add(`0${intl.slice(4)}`)
    variants.add(intl.slice(1))
  }
  if (trimmed.startsWith('0')) {
    variants.add(`+233${trimmed.slice(1)}`)
  }
  if (/^233\d{9}$/.test(trimmed)) {
    variants.add(`+${trimmed}`)
  }
  return Array.from(variants).filter(Boolean)
}
