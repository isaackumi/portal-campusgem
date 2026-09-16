/**
 * Public-facing camp line from `year` or `year · theme`.
 * Avoids awkward doubles like "Camp Meeting 2026 · Eagles Camp Meeting 2026".
 */
export function formatPublicCampYearLabel(
  campYearLabel: string | null | undefined
): string | null {
  if (!campYearLabel?.trim()) return null
  const raw = campYearLabel.trim()
  const match = raw.match(/^(\d{4})(?:\s*·\s*(.+))?$/)
  if (!match) return `Camp Meeting ${raw}`

  const year = match[1]
  const theme = match[2]?.trim()
  if (!theme) return `Camp Meeting ${year}`
  if (theme.includes(year)) return theme
  return `${theme} · ${year}`
}
