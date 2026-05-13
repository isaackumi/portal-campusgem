/** When only month/day are known, store this leap-year-safe year for recurring “upcoming birthday” math. */
export const MEMBER_DOB_PLACEHOLDER_YEAR = 2000

/**
 * Build `YYYY-MM-DD` for `members.dob` from camp registration fields or admin overrides.
 * Full ISO `date_of_birth` on the registration is preferred when no override month/day is passed.
 */
export function memberDobIsoFromCampRegistration(
  reg: {
    date_of_birth?: string | null
    birth_month?: number | null
    birth_day?: number | null
  },
  override?: { birth_month?: number; birth_day?: number; birth_year?: number | null }
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
