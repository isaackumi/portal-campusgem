import type { CampCamperDirectoryRow, Member, Visitor } from '@/lib/types'

export function phoneLast9(phone?: string): string {
  if (!phone) return ''
  return phone.replace(/\D/g, '').slice(-9)
}

export function buildRlcPhoneIndex(visitors: Visitor[], members: Member[]): Set<string> {
  const set = new Set<string>()
  for (const visitor of visitors) {
    const key = phoneLast9(visitor.phone ?? visitor.secondary_phone)
    if (key) set.add(key)
  }
  for (const member of members) {
    const key = phoneLast9(member.user?.phone)
    if (key) set.add(key)
  }
  return set
}

export function isCampContactInRlc(
  row: CampCamperDirectoryRow,
  rlcPhones: Set<string>
): boolean {
  if (row.rlc_congregation === 'rlc' || row.rlc_congregation === 'both') return true
  if (row.rlc_roles?.length) return true
  const key = phoneLast9(row.phone)
  return key ? rlcPhones.has(key) : false
}

export function campContactsNotInRlc(
  rows: CampCamperDirectoryRow[],
  rlcPhones: Set<string>
): CampCamperDirectoryRow[] {
  return rows.filter((row) => !isCampContactInRlc(row, rlcPhones))
}

export function filterCampBridgeRows(
  rows: CampCamperDirectoryRow[],
  args: { query?: string; campYear?: string }
): CampCamperDirectoryRow[] {
  const needle = args.query?.trim().toLowerCase() ?? ''
  let list = rows

  if (args.campYear && args.campYear !== 'all') {
    const year = Number(args.campYear)
    list = list.filter((row) => row.years.some((y) => y.year === year))
  }

  if (needle) {
    list = list.filter((row) => {
      const hay = [row.full_name, row.phone, row.email, row.first_name, row.last_name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(needle)
    })
  }

  return [...list].sort((a, b) => a.full_name.localeCompare(b.full_name))
}

export function campBridgeYearOptions(rows: CampCamperDirectoryRow[]): number[] {
  const years = new Set<number>()
  for (const row of rows) {
    for (const entry of row.years) {
      if (entry.year > 0) years.add(entry.year)
    }
  }
  return Array.from(years).sort((a, b) => b - a)
}
