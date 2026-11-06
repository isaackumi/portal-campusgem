import type { SmsPreviewRequest } from '@/components/comms/sms-preview'
import { previewCampTemplateSmsAction } from '@/lib/actions/camp'
import { isValidSmsPhone, normalizeSmsPhone } from '@/lib/comms/sms-client'
import { previewCampSms, type CampSmsPreviewRecipient } from '@/lib/camp/sms-templates'

/**
 * Recipients and warnings for a camp SMS preview: each person's filled-in text, and
 * how many will be skipped for having no valid phone (the camp SMS actions skip them too).
 */
export function campSmsPreview(
  template: string,
  rows: ReadonlyArray<CampSmsPreviewRecipient>,
  campYear?: number | string | null,
  extras?: Parameters<typeof previewCampSms>[3]
): Pick<SmsPreviewRequest, 'message' | 'recipients' | 'warnings'> {
  const valid = rows.filter((r) => isValidSmsPhone(r.phone))
  const skipped = rows.length - valid.length
  return {
    message: template,
    recipients: valid.map((r) => ({
      name: r.full_name?.trim() || `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim() || null,
      phone: normalizeSmsPhone(r.phone!),
      message: previewCampSms(template, r, campYear, extras),
    })),
    warnings: skipped
      ? [`${skipped} ${skipped === 1 ? 'person has' : 'people have'} no valid phone and will be skipped.`]
      : [],
  }
}

/**
 * Show the exact confirmation / room texts the server will send (it fills them in, room
 * details and env templates included) and resolve true only when the person confirms.
 * Resolves false with an error message when the preview cannot be built.
 */
export async function confirmCampTemplateSms(
  preview: (req: SmsPreviewRequest) => Promise<boolean>,
  input: Parameters<typeof previewCampTemplateSmsAction>[0] & { title: string }
): Promise<{ ok: boolean; error?: string }> {
  const { title, ...rest } = input
  const res = await previewCampTemplateSmsAction(rest)
  if (res.error || !res.data) return { ok: false, error: res.error ?? 'Could not prepare the texts' }
  const { messages, skipped } = res.data
  if (!messages.length) return { ok: false, error: skipped[0] ?? 'No one to text' }
  const ok = await preview({
    title,
    recipients: messages.map((m) => ({ name: m.name, phone: m.phone, message: m.text })),
    warnings: skipped.length
      ? [
          `${skipped.length} will be skipped: ${skipped.slice(0, 3).join('; ')}${skipped.length > 3 ? ` and ${skipped.length - 3} more` : ''}.`,
        ]
      : [],
  })
  return { ok }
}
