export function extractBirthdayParts(value: unknown): { birth_month?: number; birth_day?: number } {
  if (value == null || value === '') return {}
  const raw = String(value).trim()
  if (!raw) return {}

  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (iso) {
    return { birth_month: Number(iso[2]), birth_day: Number(iso[3]) }
  }

  const slash = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/)
  if (slash) {
    return { birth_month: Number(slash[2]), birth_day: Number(slash[1]) }
  }

  return {}
}
