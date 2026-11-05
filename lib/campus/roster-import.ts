import { isValidPhone, normalizePhone } from '@/lib/phone'
import { personNameKey } from '@/lib/people/duplicates'

/**
 * Paste a list (phones, names, or "name, phone" rows, CSV or tab separated) into a campus.
 * Pure parsing + classification; the server action supplies the directory.
 */
export type RosterLine = {
  line: number
  raw: string
  name?: string
  /** +233… when the row has a valid Ghana mobile. */
  phone?: string
  /** The row had something phone-like that is not a valid Ghana mobile. */
  bad_phone?: string
}

const MAX_ROWS = 500

function looksLikePhone(cell: string): boolean {
  const digits = cell.replace(/\D/g, '')
  return digits.length >= 5 && digits.length / cell.replace(/\s/g, '').length > 0.6
}

const HEADER = /^(name|full ?name|phone|phone ?number|mobile|number|contact)$/i

/** Split pasted text into rows; tolerates a header row, quotes, `;`/`,`/tab separators. */
export function parseRoster(text: string): RosterLine[] {
  const rows: RosterLine[] = []
  const lines = text.split(/\r?\n/)
  for (let i = 0; i < lines.length && rows.length < MAX_ROWS; i++) {
    const raw = lines[i].trim()
    if (!raw) continue
    const cells = raw
      .split(/[\t;,]/)
      .map((c) => c.trim().replace(/^"|"$/g, '').trim())
      .filter(Boolean)
    if (cells.length === 0) continue
    if (cells.every((c) => HEADER.test(c))) continue

    const row: RosterLine = { line: i + 1, raw }
    const nameParts: string[] = []
    for (const cell of cells) {
      if (looksLikePhone(cell)) {
        if (row.phone || row.bad_phone) continue
        if (isValidPhone(cell)) row.phone = normalizePhone(cell)
        else row.bad_phone = cell
      } else if (/[a-z]/i.test(cell)) {
        nameParts.push(cell.replace(/\s+/g, ' '))
      }
    }
    if (nameParts.length) row.name = nameParts.join(' ').slice(0, 120)
    if (!row.name && !row.phone && !row.bad_phone) continue
    rows.push(row)
  }
  return rows
}

export type RosterPerson = {
  user_id: string
  full_name: string
  phones: string[]
  /** Short code of their current campus, if any. */
  campus?: string
}

export type RosterPreviewRow = RosterLine & {
  status: 'matched' | 'new' | 'ambiguous' | 'invalid'
  /** Set for matched rows. */
  user_id?: string
  match_name?: string
  current_campus?: string
  /** Why the row is ambiguous / invalid. */
  note?: string
  /** For ambiguous rows: possible people. */
  candidates?: Array<{ user_id: string; full_name: string; campus?: string }>
}

/**
 * - phone matches one person → matched (phone wins over name)
 * - valid phone, nobody has it → new (needs a name to be created)
 * - name only: exactly one person with that name → matched; several → ambiguous; none → invalid
 *   (we can't create someone without a phone)
 */
export function classifyRoster(lines: readonly RosterLine[], people: readonly RosterPerson[]): RosterPreviewRow[] {
  const byPhone = new Map<string, RosterPerson[]>()
  const byName = new Map<string, RosterPerson[]>()
  for (const person of people) {
    for (const phone of person.phones) {
      const key = isValidPhone(phone) ? normalizePhone(phone) : ''
      if (!key) continue
      const list = byPhone.get(key) ?? []
      if (!list.some((p) => p.user_id === person.user_id)) list.push(person)
      byPhone.set(key, list)
    }
    const nameKey = personNameKey(person.full_name)
    if (nameKey) byName.set(nameKey, [...(byName.get(nameKey) ?? []), person])
  }

  const seen = new Set<string>()
  return lines.map((line): RosterPreviewRow => {
    const pick = (p: RosterPerson): RosterPreviewRow => {
      if (seen.has(p.user_id)) return { ...line, status: 'invalid', note: 'Same person as an earlier row' }
      seen.add(p.user_id)
      return { ...line, status: 'matched', user_id: p.user_id, match_name: p.full_name, current_campus: p.campus }
    }
    const many = (list: RosterPerson[], note: string): RosterPreviewRow => ({
      ...line,
      status: 'ambiguous',
      note,
      candidates: list.slice(0, 5).map((p) => ({ user_id: p.user_id, full_name: p.full_name, campus: p.campus })),
    })

    if (line.phone) {
      const found = byPhone.get(line.phone) ?? []
      if (found.length === 1) return pick(found[0])
      if (found.length > 1) return many(found, 'Several people share this number')
      if (!line.name) return { ...line, status: 'invalid', note: 'New number: add a name to create them' }
      if (seen.has(`new:${line.phone}`)) return { ...line, status: 'invalid', note: 'Same number as an earlier row' }
      seen.add(`new:${line.phone}`)
      return { ...line, status: 'new' }
    }
    if (line.bad_phone) return { ...line, status: 'invalid', note: `Not a valid Ghana mobile: ${line.bad_phone}` }
    const found = line.name ? byName.get(personNameKey(line.name)) ?? [] : []
    if (found.length === 1) return pick(found[0])
    if (found.length > 1) return many(found, 'Several people have this name; add a phone number')
    return { ...line, status: 'invalid', note: 'No one by this name; add a phone number to create them' }
  })
}
