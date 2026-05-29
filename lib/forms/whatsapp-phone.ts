import type { ChurchFormField } from '@/lib/types'

export function findWhatsappField(fields: ChurchFormField[]): ChurchFormField | undefined {
  return fields.find((f) => f.prefill_key === 'whatsapp' || f.label.toLowerCase().includes('whatsapp'))
}

export function applyWhatsappSameAsPhone(
  values: Record<string, unknown>,
  fields: ChurchFormField[],
  phone: string,
  whatsappSameAsPhone: boolean
): Record<string, unknown> {
  const whatsappField = findWhatsappField(fields)
  if (!whatsappField) return values

  const trimmedPhone = phone.trim()
  const existing = String(values[whatsappField.id] ?? '').trim()

  if (whatsappSameAsPhone && trimmedPhone) {
    return { ...values, [whatsappField.id]: trimmedPhone }
  }
  if (!existing && trimmedPhone) {
    return { ...values, [whatsappField.id]: trimmedPhone }
  }
  return values
}

export function shouldDefaultWhatsappSameAsPhone(
  values: Record<string, unknown>,
  fields: ChurchFormField[],
  phone: string
): boolean {
  const whatsappField = findWhatsappField(fields)
  if (!whatsappField) return false
  const whatsapp = String(values[whatsappField.id] ?? '').trim()
  const trimmedPhone = phone.trim()
  if (!whatsapp) return true
  if (!trimmedPhone) return false
  return whatsapp === trimmedPhone
}
