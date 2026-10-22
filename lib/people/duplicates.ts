import type { AppUser, UserRole } from '@/lib/types'
import { isValidPhone, normalizePhone } from '@/lib/phone'

/** "Divine  Asem", "asem divine" and "Divine Asem." all compare equal. */
export function personNameKey(name: string | null | undefined): string {
  return (name ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(' ')
}

const ROLE_RANK: Record<UserRole, number> = {
  admin: 0,
  pastor: 1,
  elder: 2,
  finance_officer: 3,
  member: 4,
  visitor: 5,
}

function phoneKey(phone: string | undefined): string {
  return phone && isValidPhone(phone) ? normalizePhone(phone) : ''
}

/**
 * Best record to keep: highest role, then one people can actually sign in to,
 * then a working phone number, then the most recently updated.
 */
export function suggestKeep(records: AppUser[]): AppUser {
  return [...records].sort(
    (a, b) =>
      ROLE_RANK[a.role] - ROLE_RANK[b.role] ||
      Number(Boolean(b.auth_uid)) - Number(Boolean(a.auth_uid)) ||
      Number(Boolean(phoneKey(b.phone))) - Number(Boolean(phoneKey(a.phone))) ||
      (b.updated_at ?? '').localeCompare(a.updated_at ?? '')
  )[0]
}

export interface DuplicatePeopleGroup {
  key: string
  name: string
  records: AppUser[]
  suggestedKeepId: string
}

/**
 * People who share a name but sit on different phone numbers (typically an Excel
 * import with an old number). Already-linked records and same-number pairs are skipped.
 */
export function findDuplicatePeople(users: AppUser[]): DuplicatePeopleGroup[] {
  const byName = new Map<string, AppUser[]>()
  for (const user of users) {
    if (user.merged_into) continue
    const key = personNameKey(user.full_name)
    // Single names ("Grace") are too ambiguous to flag.
    if (!key || !key.includes(' ')) continue
    const list = byName.get(key)
    if (list) list.push(user)
    else byName.set(key, [user])
  }

  const groups: DuplicatePeopleGroup[] = []
  byName.forEach((records, key) => {
    if (records.length < 2) return
    const numbers = new Set<string>()
    for (const r of records) {
      numbers.add(phoneKey(r.phone) || `raw:${r.phone ?? ''}`)
    }
    // Every record already shares one number: not the changed-number case.
    if (numbers.size < 2) return
    const keep = suggestKeep(records)
    groups.push({ key, name: keep.full_name, records, suggestedKeepId: keep.id })
  })
  return groups.sort((a, b) => a.name.localeCompare(b.name))
}
