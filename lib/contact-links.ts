import { normalizeGhanaPhone } from '@/lib/camp/phone'

/** Ghana mobile → E.164 digits for wa.me (233…). */
export function phoneDigitsForWhatsApp(phone: string | null | undefined): string | null {
  const raw = phone?.trim()
  if (!raw) return null
  try {
    const normalized = normalizeGhanaPhone(raw)
    if (!normalized) return null
    if (normalized.startsWith('+')) return normalized.slice(1)
    if (normalized.startsWith('0')) return `233${normalized.slice(1)}`
    return normalized.replace(/\D/g, '')
  } catch {
    const digits = raw.replace(/\D/g, '')
    if (!digits) return null
    if (digits.startsWith('233')) return digits
    if (digits.startsWith('0')) return `233${digits.slice(1)}`
    return digits
  }
}

export function telHref(phone: string | null | undefined): string | null {
  const digits = phoneDigitsForWhatsApp(phone)
  if (!digits) return null
  return `tel:+${digits}`
}

export function mailtoHref(email: string | null | undefined, subject?: string): string | null {
  const trimmed = email?.trim()
  if (!trimmed || !trimmed.includes('@')) return null
  const base = `mailto:${encodeURIComponent(trimmed)}`
  if (!subject?.trim()) return base
  return `${base}?subject=${encodeURIComponent(subject.trim())}`
}

/** Open chat with a specific number (not share sheet). */
export function whatsAppChatHref(phone: string | null | undefined, text?: string): string | null {
  const digits = phoneDigitsForWhatsApp(phone)
  if (!digits) return null
  const base = `https://wa.me/${digits}`
  if (!text?.trim()) return base
  return `${base}?text=${encodeURIComponent(text.trim())}`
}

/** Share sheet with pre-filled message (no recipient). */
export function whatsAppShareHref(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}
