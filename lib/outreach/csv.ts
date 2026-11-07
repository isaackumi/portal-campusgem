import { OUTREACH_STATUS_LABELS } from '@/lib/outreach/options'
import type { OutreachContact } from '@/lib/outreach/types'

/** CSV export of outreach contacts (managers). Pure. */

/** Quote a cell, and defuse spreadsheet formulas (=, +, -, @ at the start). */
export function csvCell(value: unknown): string {
  let s = value == null ? '' : String(value)
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** +233241234567 → 0241234567 (reads naturally, and is not mistaken for a formula). */
export function localPhone(phone: string | undefined): string {
  if (!phone) return ''
  return /^\+233\d{9}$/.test(phone) ? `0${phone.slice(4)}` : phone
}

const COLUMNS: Array<[string, (c: OutreachContact) => unknown]> = [
  ['Name', (c) => c.full_name],
  ['Phone', (c) => localPhone(c.phone)],
  ['WhatsApp', (c) => localPhone(c.whatsapp ?? c.phone)],
  ['Student ID', (c) => c.student_id],
  ['Level', (c) => c.level],
  ['Programme', (c) => c.programme],
  ['Residence', (c) => (c.residence === 'hall' ? 'Hall' : c.residence === 'non_resident' ? 'Non-resident' : '')],
  ['Hall', (c) => c.hall],
  ['Room', (c) => c.room],
  ['Area', (c) => c.area],
  ['Ministry', (c) => [...(c.ministry_interests ?? []).filter((x) => x !== 'Other'), c.ministry_other].filter(Boolean).join('; ')],
  ['Bible study', (c) => (c.bible_study === 'yes' ? 'Yes' : c.bible_study === 'no' ? 'No' : '')],
  ['Prayer request', (c) => c.prayer_request],
  ['Met on', (c) => c.met_on],
  ['Met by', (c) => c.met_by_name ?? (c.source === 'qr' ? 'QR form' : '')],
  ['Status', (c) => OUTREACH_STATUS_LABELS[c.status]],
  ['Assigned to', (c) => c.assigned_name],
  ['Attempts', (c) => c.attempts ?? 0],
  ['Last outcome', (c) => c.last_outcome],
]

export function outreachCsv(contacts: readonly OutreachContact[]): string {
  const rows = [COLUMNS.map(([h]) => csvCell(h)).join(',')]
  for (const c of contacts) rows.push(COLUMNS.map(([, get]) => csvCell(get(c))).join(','))
  return rows.join('\r\n') + '\r\n'
}
