export type CampQrPayload = {
  id?: string
  name?: string
  role?: string
  year?: number
  /** Legacy internal id; new registrations use check_in_code here too. */
  code?: string
  check_in_code?: string
}

/** Parse stored camp QR JSON for display (check-in still uses the full encoded value). */
export function parseCampQrPayload(raw: string | null | undefined): CampQrPayload | null {
  if (!raw?.trim()) return null
  const trimmed = raw.trim()
  if (!trimmed.startsWith('{')) return null
  try {
    const parsed = JSON.parse(trimmed) as CampQrPayload
    if (parsed && typeof parsed === 'object') return parsed
  } catch {
    return null
  }
  return null
}

export function campQrDisplayName(
  payload: CampQrPayload | null,
  fallback?: string | null
): string | undefined {
  return payload?.name?.trim() || fallback?.trim() || undefined
}

export function campQrDisplayRole(
  payload: CampQrPayload | null,
  fallback?: string | null
): string | undefined {
  return payload?.role?.trim() || fallback?.trim() || undefined
}
