import type { CampRegistration } from '@/lib/types'
import { resolveCampCheckInCode } from '@/lib/camp/check-in-code'

export type CamperCheckInIdentity = {
  name: string
  phone: string | null
  code: string | null
}

export function getCamperCheckInIdentity(
  reg: Pick<
    CampRegistration,
    'full_name' | 'first_name' | 'last_name' | 'phone' | 'check_in_code' | 'qr_code'
  >
): CamperCheckInIdentity {
  const phone = reg.phone?.trim() || null
  const name =
    reg.full_name?.trim() ||
    `${reg.first_name ?? ''} ${reg.last_name ?? ''}`.trim() ||
    'Unknown'
  return {
    name,
    phone: phone && phone !== 'N/A' ? phone : null,
    code: resolveCampCheckInCode(reg) ?? null,
  }
}

/** Lines for desk staff or WhatsApp — name, phone, and GEM code together. */
export function formatCamperCheckInLines(reg: CamperCheckInIdentity): string[] {
  const lines = [`Name: ${reg.name}`]
  if (reg.phone) lines.push(`Phone: ${reg.phone}`)
  if (reg.code) lines.push(`Check-in code: ${reg.code}`)
  return lines
}
