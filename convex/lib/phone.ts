export function primaryPhoneToken(phone: string): string {
  return phone.replace(/\s/g, '').split(/[/,]/)[0]?.trim() ?? ''
}

export function sanitizePhoneInput(value: unknown): string {
  if (value == null || value === '') return ''

  if (typeof value === 'number' && Number.isFinite(value)) {
    const digits = String(Math.trunc(Math.abs(value)))
    if (/^233\d{8,9}$/.test(digits)) return `+${digits}`
    if (/^\d{9}$/.test(digits)) return `0${digits}`
    if (/^0\d{8,9}$/.test(digits)) return digits
    return digits
  }

  let raw = String(value).trim()
  if (/^\d+(\.0+)?$/.test(raw)) {
    const digits = raw.replace(/\.\d+$/, '')
    if (/^233\d{8,9}$/.test(digits)) return `+${digits}`
    if (/^\d{9}$/.test(digits)) return `0${digits}`
    if (/^0\d{8,9}$/.test(digits)) return digits
    raw = digits
  }

  const primary = primaryPhoneToken(raw)
  const compact = primary.replace(/[^\d+]/g, '')
  if (/^\+233\d{8,9}$/.test(compact)) return compact
  if (/^233\d{8,9}$/.test(compact)) return `+${compact}`
  if (/^0\d{8,9}$/.test(compact)) return compact
  if (/^\d{9}$/.test(compact)) return `0${compact}`
  return primary
}

export function isValidGhanaPhone(phone: string): boolean {
  const primary = sanitizePhoneInput(phone)
  if (!primary) return false
  return /^(?:\+233\d{8,9}|0\d{8,9}|233\d{8,9}|\d{8,9})$/.test(primary)
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
  if (/^233\d{8,9}$/.test(trimmed)) {
    variants.add(`+${trimmed}`)
  }
  return Array.from(variants).filter(Boolean)
}
