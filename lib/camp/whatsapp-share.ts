import { whatsAppShareHref } from '@/lib/contact-links'
import { formatCampCheckInCodeForDisplay } from '@/lib/camp/check-in-code'

/** Share personal camp registration + check-in code with family on WhatsApp. */
export function buildCampRegistrationConfirmationShareUrl(input: {
  name: string
  checkInCode: string
  role?: string
  campLabel?: string
}): string {
  const lines = [
    input.campLabel ? `Camp Meeting — ${input.campLabel}` : 'Camp Meeting registration',
    `${input.name.trim() || 'I'} am registered!`,
    input.role?.trim() ? `Role: ${input.role.trim()}` : null,
    '',
    'My check-in code (show at the gate if you do not have a QR):',
    formatCampCheckInCodeForDisplay(input.checkInCode),
    '',
    'You can also check in with this code, your name, or phone at the desk.',
  ].filter((line) => line !== null)

  return whatsAppShareHref(lines.join('\n'))
}
