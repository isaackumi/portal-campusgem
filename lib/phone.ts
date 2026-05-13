export function normalizePhone(phone: string): string {
  const trimmed = phone.replace(/\s/g, '')
  if (trimmed.startsWith('+233')) return trimmed
  if (trimmed.startsWith('0')) return `+233${trimmed.slice(1)}`
  if (trimmed.startsWith('233')) return `+${trimmed}`
  return `+233${trimmed}`
}

export function phoneLoginVariants(phone: string): string[] {
  const trimmed = phone.replace(/\s/g, '')
  const variants = new Set<string>([trimmed, normalizePhone(trimmed)])
  const intl = normalizePhone(trimmed)

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

  return Array.from(variants)
}

export function isValidPhone(phone: string): boolean {
  const trimmed = phone.replace(/\s/g, '')
  return /^(?:0\d{8,9}|\+233\d{8,9}|233\d{8,9}|\d{8,9})$/.test(trimmed)
}
