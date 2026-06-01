import type { CampRegistration } from '@/lib/types'
import {
  isCampCheckInCodeFormat,
  normalizeCampCheckInCode,
  resolveCampCheckInCode,
} from '@/lib/camp/check-in-code'
import { parseCampQrPayload } from '@/lib/camp/qr-payload'

/** Match a scanned or typed value to a camp registration (QR JSON, GEM code, or id). */
export function findCampRegistrationFromScan(
  registrations: CampRegistration[],
  decodedText: string
): CampRegistration | undefined {
  const text = decodedText.trim()
  if (!text) return undefined

  if (isCampCheckInCodeFormat(text)) {
    const code = normalizeCampCheckInCode(text)
    return registrations.find((r) => resolveCampCheckInCode(r) === code)
  }

  try {
    const parsed = JSON.parse(text) as {
      id?: string
      code?: string
      check_in_code?: string
    }
    if (parsed.check_in_code && isCampCheckInCodeFormat(parsed.check_in_code)) {
      const code = normalizeCampCheckInCode(parsed.check_in_code)
      const byCode = registrations.find((r) => resolveCampCheckInCode(r) === code)
      if (byCode) return byCode
    }
    if (parsed.code && isCampCheckInCodeFormat(parsed.code)) {
      const code = normalizeCampCheckInCode(parsed.code)
      const byCode = registrations.find((r) => resolveCampCheckInCode(r) === code)
      if (byCode) return byCode
    }
    const id = parsed.id ?? parsed.code
    if (id) {
      const byId = registrations.find((r) => r.id === id)
      if (byId) return byId
    }
  } catch {
    // not JSON — fall through
  }

  const payload = parseCampQrPayload(text)
  if (payload?.check_in_code && isCampCheckInCodeFormat(payload.check_in_code)) {
    const code = normalizeCampCheckInCode(payload.check_in_code)
    const byCode = registrations.find((r) => resolveCampCheckInCode(r) === code)
    if (byCode) return byCode
  }

  return registrations.find(
    (r) =>
      r.qr_code === text ||
      r.id === text ||
      resolveCampCheckInCode(r) === normalizeCampCheckInCode(text)
  )
}
