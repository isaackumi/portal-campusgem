/**
 * Spotting groups that were meant to be campuses but were saved as another kind (the group form
 * defaults to "Fellowship"), and suggesting a short code for them. Pure: used by the server
 * action and the group form.
 */

const CAMPUS_WORDS = /\b(universit(y|ies)|college|campus|polytechnic|technical university|institute|legon|knust|seminary|nursing|training college)\b/i

/** "University of Ghana, Legon" → true. "Choir" → false. */
export function looksLikeCampus(name: string | null | undefined): boolean {
  return CAMPUS_WORDS.test(name ?? '')
}

/** Well-known Ghanaian campuses, checked before falling back to initials. */
const KNOWN: Array<[RegExp, string]> = [
  [/\blegon\b|\buniversity of ghana\b/i, 'UG'],
  [/\bwinneba\b|\beducation\b.*\bwinneba\b/i, 'UEW'],
  [/\bcape coast\b/i, 'UCC'],
  [/\bknust\b|kwame nkrumah/i, 'KNUST'],
  [/\baccra technical\b/i, 'ATU'],
  [/\bdevelopment studies\b/i, 'UDS'],
  [/\bashesi\b/i, 'ASHESI'],
  [/\bcentral university\b/i, 'CU'],
]

const SMALL_WORDS = new Set(['of', 'the', 'for', 'and', 'at', 'in', 'on'])

/** "University of Ghana, Legon" → "UG"; anything else → initials of the part before a comma or bracket. */
export function suggestShortCode(name: string | null | undefined): string {
  const text = (name ?? '').trim()
  for (const [re, code] of KNOWN) if (re.test(text)) return code
  const head = text.split(/[,(—–-]/)[0] ?? ''
  const initials = head
    .split(/\s+/)
    .filter((w) => w && !SMALL_WORDS.has(w.toLowerCase()))
    .map((w) => w[0]!.toUpperCase())
    .join('')
    .replace(/[^A-Z0-9]/g, '')
  return initials.length >= 2 ? initials.slice(0, 6) : ''
}
