import type { ChurchFormField } from '@/lib/types'

export function buildPrefillMapFromFormValues(
  fields: ChurchFormField[],
  values: Record<string, unknown>
): Map<string, unknown> {
  const map = new Map<string, unknown>()
  for (const field of fields) {
    const key = field.prefill_key?.trim()
    if (!key) continue
    const raw = values[field.id]
    if (raw == null || raw === '') continue
    map.set(key, raw)
  }
  return map
}
