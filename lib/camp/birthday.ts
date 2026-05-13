/** Same placeholder as Convex `memberDobIsoFromCampRegistration` — year optional in UI. */
export const MEMBER_DOB_PLACEHOLDER_YEAR = 2000

export interface BirthdayParts {
  birth_month?: number
  birth_day?: number
}

export function extractBirthdayParts(value: unknown): BirthdayParts {
  if (value == null || value === '') return {}

  const raw = String(value).trim()
  if (!raw) return {}

  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (iso) {
    return {
      birth_month: Number(iso[2]),
      birth_day: Number(iso[3]),
    }
  }

  const slash = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/)
  if (slash) {
    return {
      birth_month: Number(slash[2]),
      birth_day: Number(slash[1]),
    }
  }

  const text = raw.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)(?:,?\s+(\d{2,4}))?/i)
  if (text) {
    const month = monthNameToNumber(text[2])
    if (month) {
      return { birth_month: month, birth_day: Number(text[1]) }
    }
  }

  return {}
}

function monthNameToNumber(name: string): number | undefined {
  const months = [
    'january',
    'february',
    'march',
    'april',
    'may',
    'june',
    'july',
    'august',
    'september',
    'october',
    'november',
    'december',
  ]
  const index = months.findIndex((month) => name.toLowerCase().startsWith(month.slice(0, 3)))
  return index >= 0 ? index + 1 : undefined
}

export function birthdayPartsFromIsoDate(dateOfBirth?: string): BirthdayParts {
  if (!dateOfBirth) return {}
  return extractBirthdayParts(dateOfBirth)
}

export function parseIsoDob(iso?: string): { year?: number; month?: number; day?: number } {
  if (!iso?.trim()) return {}
  const m = iso.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (!m) return {}
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) }
}

/** Client-side mirror of Convex helper for validation and server actions. */
export function memberDobIsoFromCampRegistration(
  reg: { date_of_birth?: string; birth_month?: number; birth_day?: number },
  override?: { birth_month?: number; birth_day?: number; birth_year?: number }
): string | undefined {
  const hasOverride =
    override != null &&
    override.birth_month != null &&
    override.birth_day != null &&
    Number.isFinite(override.birth_month) &&
    Number.isFinite(override.birth_day)
  if (hasOverride) {
    const year =
      override!.birth_year != null && override!.birth_year! > 0
        ? override!.birth_year!
        : MEMBER_DOB_PLACEHOLDER_YEAR
    return `${year}-${String(override!.birth_month).padStart(2, '0')}-${String(override!.birth_day).padStart(2, '0')}`
  }
  if (reg.date_of_birth?.trim()) {
    const t = reg.date_of_birth.trim()
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(t)) return t
  }
  const m = reg.birth_month != null ? Number(reg.birth_month) : undefined
  const d = reg.birth_day != null ? Number(reg.birth_day) : undefined
  if (m != null && d != null && Number.isFinite(m) && Number.isFinite(d)) {
    return `${MEMBER_DOB_PLACEHOLDER_YEAR}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }
  const parts = extractBirthdayParts(reg.date_of_birth)
  if (parts.birth_month != null && parts.birth_day != null) {
    return `${MEMBER_DOB_PLACEHOLDER_YEAR}-${String(parts.birth_month).padStart(2, '0')}-${String(parts.birth_day).padStart(2, '0')}`
  }
  return undefined
}
