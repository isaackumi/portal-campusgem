import type { CampRegistration } from '@/lib/types'
import { parseCampQrPayload } from '@/lib/camp/qr-payload'

const CODE_PATTERN = /^GEM-\d{2}-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}$/i

export function normalizeCampCheckInCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, '')
}

export function isCampCheckInCodeFormat(raw: string): boolean {
  return CODE_PATTERN.test(normalizeCampCheckInCode(raw))
}

/** Human-facing camp code for desk check-in (stored field or embedded in QR JSON). */
export function resolveCampCheckInCode(
  reg: Pick<CampRegistration, 'check_in_code' | 'qr_code'>
): string | undefined {
  if (reg.check_in_code?.trim()) {
    return normalizeCampCheckInCode(reg.check_in_code)
  }
  const payload = parseCampQrPayload(reg.qr_code)
  if (payload?.check_in_code?.trim()) {
    return normalizeCampCheckInCode(payload.check_in_code)
  }
  if (payload?.code?.trim() && isCampCheckInCodeFormat(payload.code)) {
    return normalizeCampCheckInCode(payload.code)
  }
  return undefined
}

export function formatCampCheckInCodeForDisplay(code: string): string {
  return normalizeCampCheckInCode(code)
}
