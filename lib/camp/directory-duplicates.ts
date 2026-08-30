import { normalizePersonNameKey } from '@/lib/camp/person-identity'
import type { CampCamperDirectoryRow } from '@/lib/types'

export type DirectoryDuplicateGroup = {
  nameKey: string
  displayName: string
  rows: CampCamperDirectoryRow[]
  suggestedPrimaryPhoneKey: string
}

/** Score a directory row — higher is a better canonical contact for merges. */
export function scoreDirectoryRowForCanonical(row: CampCamperDirectoryRow): number {
  let score = 0
  if (!row.phone_key.startsWith('missing:') && !row.phone_key.startsWith('name:')) {
    score += 100
  }
  if (row.phone_key.startsWith('+233')) score += 50
  if (row.user_id) score += 25
  if (row.member_id) score += 10
  score += Math.min(row.registration_count, 20) * 5
  if (row.email?.trim() && row.email.trim() !== ' ') score += 5
  return score
}

export function findDirectoryDuplicateGroups(rows: CampCamperDirectoryRow[]): DirectoryDuplicateGroup[] {
  const byName = new Map<string, CampCamperDirectoryRow[]>()

  for (const row of rows) {
    const nameKey = normalizePersonNameKey(row.full_name)
    if (nameKey.length < 3) continue
    const list = byName.get(nameKey) ?? []
    list.push(row)
    byName.set(nameKey, list)
  }

  const groups: DirectoryDuplicateGroup[] = []

  for (const [nameKey, groupRows] of Array.from(byName.entries())) {
    if (groupRows.length < 2) continue
    const phoneKeys = new Set(groupRows.map((row) => row.phone_key))
    if (phoneKeys.size < 2) continue

    const sorted = [...groupRows].sort(
      (a, b) => scoreDirectoryRowForCanonical(b) - scoreDirectoryRowForCanonical(a)
    )
    const suggestedPrimaryPhoneKey = sorted[0]?.phone_key ?? groupRows[0]!.phone_key

    groups.push({
      nameKey,
      displayName: sorted[0]?.full_name ?? groupRows[0]!.full_name,
      rows: sorted,
      suggestedPrimaryPhoneKey,
    })
  }

  return groups.sort((a, b) => a.displayName.localeCompare(b.displayName))
}

/** Registration ids on non-primary rows in a duplicate group. */
export function registrationIdsToMerge(
  group: DirectoryDuplicateGroup,
  primaryPhoneKey: string
): string[] {
  const ids: string[] = []
  for (const row of group.rows) {
    if (row.phone_key === primaryPhoneKey) continue
    for (const year of row.years) {
      ids.push(year.registration_id)
    }
  }
  return ids
}

export function primaryRowForGroup(
  group: DirectoryDuplicateGroup,
  primaryPhoneKey: string
): CampCamperDirectoryRow | undefined {
  return group.rows.find((row) => row.phone_key === primaryPhoneKey)
}
