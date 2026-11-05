/**
 * "Probably at this campus": case-insensitive token matching of a person's school,
 * residence and form answers against a campus's name, short code and aliases. Pure.
 */

export type CampusMatchTarget = {
  id: string
  name: string
  short_code?: string
  aliases?: readonly string[]
}

export type CampusMatchSource = {
  /** Shown in the reason, e.g. "school". */
  label: string
  value: string | null | undefined
}

export type CampusMatch = {
  campus_id: string
  /** Human reasons, e.g. `school: "UEW Winneba"`. */
  reasons: string[]
  /** Higher is stronger: short code / alias / full name hits beat partial-name hits. */
  score: number
}

/** Words that say nothing about which campus someone is at. */
const STOP_WORDS = new Set([
  'of',
  'the',
  'and',
  'for',
  'at',
  'in',
  'a',
  'an',
  'university',
  'college',
  'school',
  'campus',
  'technical',
  'tech',
  'institute',
  'education',
  'science',
  'technology',
  'studies',
  'development',
  'ghana',
  'student',
  'students',
  'level',
  'hall',
  'gem',
  'fellowship',
])

export function campusTokens(value: string | null | undefined): string[] {
  return (value ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
}

/** "University of Education, Winneba" → "university of education winneba" */
function phrase(value: string): string {
  return campusTokens(value).join(' ')
}

function containsPhrase(haystack: string[], needle: string[]): boolean {
  if (needle.length === 0 || needle.length > haystack.length) return false
  outer: for (let i = 0; i <= haystack.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) continue outer
    }
    return true
  }
  return false
}

type Term = { tokens: string[]; strong: boolean }

/**
 * Terms to look for. Short code and aliases are whole phrases (strong). The name gives
 * its full phrase (strong) and its distinctive words ("winneba", "legon") on their own (weak,
 * but still enough). Generic words like "university" never match alone.
 */
export function campusMatchTerms(campus: CampusMatchTarget): Term[] {
  const terms: Term[] = []
  const add = (raw: string | undefined, strong: boolean) => {
    const tokens = campusTokens(raw)
    if (tokens.length === 0) return
    if (tokens.length === 1 && STOP_WORDS.has(tokens[0])) return
    // A one-letter or two-digit code ("A", "12") would match noise.
    if (tokens.length === 1 && tokens[0].length < 2) return
    if (!terms.some((t) => t.tokens.join(' ') === tokens.join(' '))) terms.push({ tokens, strong })
  }
  add(campus.short_code, true)
  for (const alias of campus.aliases ?? []) add(alias, true)
  add(campus.name, true)
  for (const word of campusTokens(campus.name)) {
    if (word.length >= 4 && !STOP_WORDS.has(word) && !/^\d+$/.test(word)) add(word, false)
  }
  return terms
}

function clip(value: string, max = 60): string {
  const trimmed = value.trim().replace(/\s+/g, ' ')
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed
}

/** Why (if at all) a person looks like they belong to `campus`. */
export function matchPersonToCampus(
  campus: CampusMatchTarget,
  sources: readonly CampusMatchSource[]
): CampusMatch | null {
  const terms = campusMatchTerms(campus)
  if (terms.length === 0) return null
  const reasons: string[] = []
  let score = 0
  for (const source of sources) {
    const value = source.value?.trim()
    if (!value) continue
    const hay = campusTokens(value)
    const hit = terms.filter((t) => containsPhrase(hay, t.tokens))
    if (hit.length === 0) continue
    reasons.push(`${source.label}: "${clip(value)}"`)
    score += hit.some((t) => t.strong) ? 2 : 1
  }
  return reasons.length ? { campus_id: campus.id, reasons, score } : null
}

/**
 * Best campus for a person among several. A tie between different campuses is ambiguous
 * and returns every tied match, so the UI can show it under each without guessing.
 */
export function matchPersonToCampuses(
  campuses: readonly CampusMatchTarget[],
  sources: readonly CampusMatchSource[]
): CampusMatch[] {
  const matches = campuses
    .map((c) => matchPersonToCampus(c, sources))
    .filter((m): m is CampusMatch => m != null)
  if (matches.length <= 1) return matches
  const top = Math.max(...matches.map((m) => m.score))
  return matches.filter((m) => m.score === top)
}

// ---------------------------------------------------------------------------
// Identity: short code + slug
// ---------------------------------------------------------------------------

/** "uew " → "UEW"; letters and digits only, 2–10 characters, else null. */
export function normalizeShortCode(raw: string | null | undefined): string | null {
  const code = (raw ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  return code.length >= 2 && code.length <= 10 ? code : null
}

/** "University of Cape Coast" → "university-of-cape-coast"; max 48 characters. */
export function slugifyCampus(raw: string | null | undefined): string {
  return campusTokens(raw).join('-').slice(0, 48).replace(/-+$/, '')
}

export function isValidCampusSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length <= 48
}

/** Comma / newline separated aliases → trimmed, de-duplicated (case-insensitive), max 12. */
export function parseAliases(raw: string | readonly string[] | null | undefined): string[] {
  const list = typeof raw === 'string' ? raw.split(/[,\n;]/) : raw ?? []
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of list) {
    const value = item.trim().replace(/\s+/g, ' ').slice(0, 80)
    const key = phrase(value)
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(value)
  }
  return out.slice(0, 12)
}

/** Badge label for a campus: its short code, else its name. */
export function campusLabel(campus: { name: string; short_code?: string } | null | undefined): string {
  if (!campus) return ''
  return campus.short_code?.trim() || campus.name
}
