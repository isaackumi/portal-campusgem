/**
 * "Birthdays next week" heads-up for admins: who, their phone, and where they belong
 * (campus, Campus GEM / RLC, camper), so a flyer can be ready while the app sends the
 * birthday text on the day. Pure: the action gathers people, this decides and words it.
 */
import { formatBirthdayDay, nextBirthdayOn } from '@/lib/birthdays/sms'

export type HeadsUpPerson = {
  name: string
  phone?: string | null
  birthMonth: number
  birthDay: number
  /** Where they belong, most specific first: "UEW", "Campus GEM", "RLC", "Camper 2026". */
  tags: string[]
  ageTurning?: number | null
}

export type HeadsUpDue = HeadsUpPerson & { date: string; daysUntil: number }

function phoneKey(phone?: string | null): string {
  const digits = (phone ?? '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('233')) return digits.slice(3)
  if (digits.startsWith('0')) return digits.slice(1)
  return digits
}

function nameKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z]+/g, ' ').trim()
}

/**
 * One row per person even when they are a member, a visitor and a camper at once: rows
 * with the same phone (or, without a phone, the same name and birthday) are merged and
 * their tags combined.
 */
export function mergePeople(people: readonly HeadsUpPerson[]): HeadsUpPerson[] {
  const byKey = new Map<string, HeadsUpPerson>()
  for (const p of people) {
    if (!p.birthMonth || !p.birthDay || !p.name?.trim()) continue
    const key = phoneKey(p.phone) || `${nameKey(p.name)}|${p.birthMonth}-${p.birthDay}`
    const seen = byKey.get(key)
    if (!seen) {
      byKey.set(key, { ...p, tags: Array.from(new Set(p.tags.filter(Boolean))) })
      continue
    }
    // Keep the fuller name and any phone we have; merge tags in order.
    if (p.name.trim().length > seen.name.trim().length) seen.name = p.name
    if (!seen.phone && p.phone) seen.phone = p.phone
    if (seen.ageTurning == null && p.ageTurning != null) seen.ageTurning = p.ageTurning
    for (const t of p.tags) if (t && !seen.tags.includes(t)) seen.tags.push(t)
  }
  return Array.from(byKey.values())
}

/** People whose birthday is exactly `days` away (default one week), sorted by name. */
export function dueInDays(
  people: readonly HeadsUpPerson[],
  today: { year: number; month: number; day: number },
  days = 7
): HeadsUpDue[] {
  return mergePeople(people)
    .map((p) => {
      const next = nextBirthdayOn({ month: p.birthMonth, day: p.birthDay }, today)
      return { ...p, date: formatBirthdayDay(next), daysUntil: next.daysUntil }
    })
    .filter((p) => p.daysUntil === days)
    .sort((a, b) => a.name.localeCompare(b.name))
}

/** "0244 123 456" style, readable in an SMS. */
function prettyPhone(phone?: string | null): string {
  const key = phoneKey(phone)
  if (key.length === 9) return `0${key.slice(0, 2)} ${key.slice(2, 5)} ${key.slice(5)}`
  return phone?.trim() || 'no phone'
}

export function headsUpLine(p: HeadsUpDue): string {
  const age = p.ageTurning ? `, turns ${p.ageTurning}` : ''
  const tags = p.tags.length ? ` (${p.tags.join(', ')}${age})` : age ? ` (${age.slice(2)})` : ''
  return `${p.name}, ${prettyPhone(p.phone)}${tags}`
}

/** Max characters per text: 3 SMS parts. Longer lists are split into numbered texts. */
const MAX_CHARS = 450

/**
 * The text(s) admins get. Empty when nobody is due. Lists that don't fit in one text are
 * split, each part numbered "(1/2)".
 */
export function buildHeadsUpTexts(due: readonly HeadsUpDue[], days = 7): string[] {
  if (due.length === 0) return []
  const when = days === 7 ? 'in one week' : `in ${days} days`
  const header = `Birthdays ${when}, ${due[0]!.date}:`
  const footer = 'The app sends their birthday text on the day.'
  const lines = due.map(headsUpLine)

  const chunks: string[][] = []
  let current: string[] = []
  let length = header.length + footer.length + 2
  for (const line of lines) {
    const add = line.length + 1
    if (current.length > 0 && length + add > MAX_CHARS - 8) {
      chunks.push(current)
      current = []
      length = header.length + footer.length + 2
    }
    current.push(line)
    length += add
  }
  if (current.length) chunks.push(current)

  return chunks.map((chunk, i) => {
    const part = chunks.length > 1 ? ` (${i + 1}/${chunks.length})` : ''
    const end = i === chunks.length - 1 ? `\n${footer}` : ''
    return `${header}${part}\n${chunk.join('\n')}${end}`
  })
}
