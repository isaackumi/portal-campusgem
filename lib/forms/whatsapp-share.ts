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

  return `https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`
}
