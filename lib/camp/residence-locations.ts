/** Canonical camp residence / area labels for registration + analytics. */

export const CAMP_RESIDENCE_OTHER = 'Other'

/** Town / area labels (alphabetical). "Other" is appended separately. */
const CAMP_RESIDENCE_TOWNS: readonly string[] = [
  'Accra',
  'Achimota',
  'Apam',
  'Ashaley Botwe',
  'Ashanti',
  'Ashongman',
  'Awoshie',
  'Beraku',
  'Cape Coast',
  'Central Region',
  'Eastern Region',
  'Freetown (Sierra Leone)',
  'Greater Accra',
  'Kasoa',
  'Koforidua',
  'Kokrobite',
  'Kumasi',
  'Madina',
  'Mallam',
  'Methodist School Park',
  'Mumford',
  'Northern',
  'Nsawam',
  'Pantang',
  'Penkye',
  'Pokuase',
  'Spintex',
  'T-junction',
  'Takoradi',
  'Tema',
  'Volta',
  'Western',
  'Winneba',
].slice().sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }))

/** Dropdown options for Residence / area — alphabetical, Other last. */
export const CAMP_RESIDENCE_OPTIONS: readonly string[] = [
  ...CAMP_RESIDENCE_TOWNS,
  CAMP_RESIDENCE_OTHER,
]

const CANONICAL_BY_LOWER = new Map(
  CAMP_RESIDENCE_OPTIONS.map((label) => [label.toLowerCase(), label] as const)
)

/** Free-text / shortcut → canonical label (town-first, then region). Analytics only — DB stays as submitted. */
export const CAMP_RESIDENCE_ALIASES: Record<string, string> = {
  // Mumford cluster
  mumford: 'Mumford',
  'mumford c/r': 'Mumford',
  'mumford cr': 'Mumford',
  'mumford, cr': 'Mumford',
  'mumford central': 'Mumford',
  'mumford central region': 'Mumford',
  'central mumford': 'Mumford',
  'central, mumford': 'Mumford',
  'central/mumford': 'Mumford',
  'gomoa west/mumford': 'Mumford',
  'gomoa west mumford': 'Mumford',
  'gomoa west': 'Mumford',

  // Kasoa
  kasoa: 'Kasoa',
  'kasoa , ca': 'Kasoa',
  'kasoa,central': 'Kasoa',
  'kasoa, central': 'Kasoa',
  'kasoa,cr': 'Kasoa',
  'kasoa, cr': 'Kasoa',
  'kasoa ca': 'Kasoa',
  'kasoa central': 'Kasoa',

  // Winneba
  winneba: 'Winneba',

  // Apam
  apam: 'Apam',
  'apam junction': 'Apam',
  'apam, central': 'Apam',
  'apam central': 'Apam',

  // Accra-area towns
  mallam: 'Mallam',
  achimota: 'Achimota',
  madina: 'Madina',
  'madina, ga': 'Madina',
  'madina ga': 'Madina',
  'ashaley botwe': 'Ashaley Botwe',
  ashaleybotwe: 'Ashaley Botwe',
  ashongman: 'Ashongman',
  'ashongman estate': 'Ashongman',
  'ashongman estate , ga': 'Ashongman',
  'ashongman estate ga': 'Ashongman',
  awoshie: 'Awoshie',
  'awoshie , ga': 'Awoshie',
  'awoshie ga': 'Awoshie',
  kokrobite: 'Kokrobite',
  kokrobitey: 'Kokrobite',
  nsawam: 'Nsawam',
  'nsawam -okanta': 'Nsawam',
  'nsawam okanta': 'Nsawam',
  'nsawam, er': 'Nsawam',
  'nsawam er': 'Nsawam',
  pantang: 'Pantang',
  'pantang west': 'Pantang',
  penkye: 'Penkye',
  pokuase: 'Pokuase',
  spintex: 'Spintex',
  tema: 'Tema',
  accra: 'Accra',
  beraku: 'Beraku',
  takoradi: 'Takoradi',
  kumasi: 'Kumasi',
  koforidua: 'Koforidua',
  'cape coast': 'Cape Coast',
  't-junction': 'T-junction',
  tjunction: 'T-junction',
  't junction': 'T-junction',

  // Known typos / venue names
  'methodist school park': 'Methodist School Park',
  'methods school park': 'Methodist School Park',
  'freetown sl': 'Freetown (Sierra Leone)',
  freetown: 'Freetown (Sierra Leone)',

  // Region shortcuts (fallback when town unknown)
  'c/r': 'Central Region',
  cr: 'Central Region',
  central: 'Central Region',
  'central region': 'Central Region',
  ga: 'Greater Accra',
  'greater accra': 'Greater Accra',
  'greater-accra': 'Greater Accra',
  er: 'Eastern Region',
  eastern: 'Eastern Region',
  'eastern region': 'Eastern Region',
  ashanti: 'Ashanti',
  western: 'Western',
  volta: 'Volta',
  northern: 'Northern',
  bono: 'Bono',
  sunyani: 'Bono',
  tamale: 'Northern',
  ho: 'Volta',
  bolgatanga: 'Upper East',
  'upper east': 'Upper East',
  wa: 'Upper West',
  'upper west': 'Upper West',
  other: CAMP_RESIDENCE_OTHER,
}

function collapseKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/,/g, ' ')
    .replace(/\s*\/\s*/g, '/')
    .replace(/\s+/g, ' ')
    .trim()
}

function lookupAlias(raw: string): string | undefined {
  const key = collapseKey(raw)
  if (!key) return undefined
  const canonical = CANONICAL_BY_LOWER.get(key)
  if (canonical) return canonical
  const direct = CAMP_RESIDENCE_ALIASES[key]
  if (direct) return direct
  // Also try without slashes → spaces (Central/Mumford → central mumford)
  const spaced = key.replace(/\//g, ' ').replace(/\s+/g, ' ').trim()
  if (spaced !== key) {
    const viaSpaced = CANONICAL_BY_LOWER.get(spaced) ?? CAMP_RESIDENCE_ALIASES[spaced]
    if (viaSpaced) return viaSpaced
  }
  return undefined
}

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Map free-text or legacy residence strings onto a canonical label for charts.
 * Prefers town aliases over region aliases when both could match.
 * Does not mutate stored registration data.
 */
export function normalizeResidenceLabel(residence: string | undefined | null): string {
  const raw = String(residence ?? '').trim()
  if (!raw) return 'Not recorded'

  const full = lookupAlias(raw)
  if (full) return full

  const parts = raw
    .split(/[,;/|]+/)
    .map((part) => part.trim())
    .filter(Boolean)

  // Prefer an explicit town match on any segment (Mumford before C/R, Kasoa before Central).
  for (const part of parts) {
    const mapped = lookupAlias(part)
    if (mapped && mapped !== 'Central Region' && mapped !== 'Greater Accra' && mapped !== 'Eastern Region') {
      // Region-only shortcuts on a segment are weaker than a town on another segment.
      if (
        mapped === 'Ashanti' ||
        mapped === 'Western' ||
        mapped === 'Volta' ||
        mapped === 'Northern' ||
        mapped === 'Bono' ||
        mapped === 'Upper East' ||
        mapped === 'Upper West'
      ) {
        continue
      }
      return mapped
    }
  }

  for (const part of parts) {
    const mapped = lookupAlias(part)
    if (mapped) return mapped
  }

  const candidate = parts[0]
  if (!candidate) return 'Not recorded'
  if (candidate.length <= 3) return titleCase(raw)
  return titleCase(candidate)
}

export function isCanonicalResidence(value: string | undefined | null): boolean {
  const raw = String(value ?? '').trim()
  if (!raw) return false
  return CANONICAL_BY_LOWER.has(raw.toLowerCase())
}

/** Preview how a list of raw residence strings remaps (for ops / scripts). */
export function remapResidenceLabels(
  rows: Array<{ residence?: string | null }>
): Array<{ raw: string; mapped: string; count: number }> {
  const counts = new Map<string, { raw: string; mapped: string; count: number }>()
  for (const row of rows) {
    const raw = String(row.residence ?? '').trim() || '(empty)'
    const mapped = normalizeResidenceLabel(raw === '(empty)' ? '' : raw)
    const key = `${raw}→${mapped}`
    const cur = counts.get(key) ?? { raw, mapped, count: 0 }
    cur.count += 1
    counts.set(key, cur)
  }
  return [...counts.values()].sort(
    (a, b) => b.count - a.count || a.raw.localeCompare(b.raw) || a.mapped.localeCompare(b.mapped)
  )
}
