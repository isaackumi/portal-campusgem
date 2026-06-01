import { whatsAppShareHref } from '@/lib/contact-links'

/** Build a WhatsApp share link for a form (opens WhatsApp with pre-filled message). */
export function buildFormWhatsAppShareUrl(input: {
  formTitle: string
  publicUrl: string
  campYearLabel?: string
}): string {
  const lines = [
    input.campYearLabel ? `Camp Meeting ${input.campYearLabel}` : null,
    input.formTitle,
    'Fill the form here:',
    input.publicUrl,
  ].filter(Boolean)

  return whatsAppShareHref(lines.join('\n'))
}

/** After camp registration — invite friends to register via WhatsApp. */
export function buildCampRegistrationInviteShareUrl(input: {
  registrantName: string
  registrationUrl: string
  campLabel?: string
}): string {
  const name = input.registrantName.trim() || 'I'
  const lines = [
    input.campLabel ? `🦅 ${input.campLabel}` : '🦅 Camp Meeting',
    `${name} just registered for camp!`,
    "Don't forget to register too — it only takes a few minutes.",
    'Register here:',
    input.registrationUrl,
  ]
  return whatsAppShareHref(lines.join('\n'))
}
