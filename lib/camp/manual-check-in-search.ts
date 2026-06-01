import type { CampRegistration } from '@/lib/types'
import { isValidGhanaPhone, normalizeGhanaPhone, sanitizePhoneInput } from '@/lib/camp/phone'
import { parseCampQrPayload } from '@/lib/camp/qr-payload'

export function campRegistrationDisplayName(reg: CampRegistration): string {
  return reg.full_name?.trim() || `${reg.first_name ?? ''} ${reg.last_name ?? ''}`.trim() || 'Unknown'
}

function collectPhoneKeys(phone: string | null | undefined): string[] {
  if (!phone?.trim()) return []
  const keys = new Set<string>()
  const normalized = normalizeGhanaPhone(phone)
  const sanitized = sanitizePhoneInput(phone)
  if (normalized) keys.add(normalized)
  if (sanitized) keys.add(sanitized)
  for (const value of [normalized, sanitized, phone]) {
    const digits = value.replace(/\D/g, '')
    if (digits.length >= 9) keys.add(digits.slice(-9))
  }
  return Array.from(keys)
}

function registrationMatchesPhoneKeys(reg: CampRegistration, queryKeys: string[]): boolean {
  const regKeys = collectPhoneKeys(reg.phone).concat(collectPhoneKeys(reg.parent_contact))
  return regKeys.some((rk) => queryKeys.some((qk) => rk === qk || rk.endsWith(qk) || qk.endsWith(rk)))
}

function sortForManualCheckIn(regs: CampRegistration[]): CampRegistration[] {
  return [...regs].sort((a, b) => {
    const aChecked = a.status === 'checked_in' ? 1 : 0
    const bChecked = b.status === 'checked_in' ? 1 : 0
    if (aChecked !== bChecked) return aChecked - bChecked
    return campRegistrationDisplayName(a).localeCompare(campRegistrationDisplayName(b))
  })
}

/**
 * Find campers for desk check-in — matches camper phone, guardian phone, name, or QR code.
 * Phone search returns every registration on that number (family / proxy registration).
 */
export function searchCampRegistrationsForManualCheckIn(
  registrations: CampRegistration[],
  rawQuery: string
): { results: CampRegistration[]; mode: 'phone' | 'text' } {
  const query = rawQuery.trim()
  if (!query) return { results: [], mode: 'text' }

  const digitsOnly = query.replace(/\D/g, '')
  const isPhoneSearch =
    isValidGhanaPhone(query) || (digitsOnly.length >= 8 && digitsOnly.length <= 12)

  if (isPhoneSearch) {
    const queryKeys = collectPhoneKeys(query)
    if (queryKeys.length === 0) return { results: [], mode: 'phone' }
    const results = registrations.filter((r) => registrationMatchesPhoneKeys(r, queryKeys))
    return { results: sortForManualCheckIn(results), mode: 'phone' }
  }

  const lower = query.toLowerCase()
  const results = registrations.filter((r) => {
    if (campRegistrationDisplayName(r).toLowerCase().includes(lower)) return true
    if (r.parent_name?.trim() && r.parent_name.toLowerCase().includes(lower)) return true
    if (r.email?.trim() && r.email.toLowerCase().includes(lower)) return true
    if (r.id.toLowerCase().includes(lower)) return true
    if (r.qr_code?.toLowerCase().includes(lower)) return true
    const payload = parseCampQrPayload(r.qr_code)
    if (payload?.code?.toLowerCase().includes(lower)) return true
    return false
  })

  return { results: sortForManualCheckIn(results), mode: 'text' }
}
