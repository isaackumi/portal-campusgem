import { describe, expect, test } from 'bun:test'
import {
  findDirectoryDuplicateGroups,
  registrationIdsToMerge,
  scoreDirectoryRowForCanonical,
} from '@/lib/camp/directory-duplicates'
import type { CampCamperDirectoryRow } from '@/lib/types'

const baseRow = (overrides: Partial<CampCamperDirectoryRow>): CampCamperDirectoryRow => ({
  phone_key: '+233244111111',
  full_name: 'Emmanuel Ntow',
  phone: '0244111111',
  years: [{ year_id: 'y1', year: 2025, status: 'registered', registration_id: 'r1' }],
    registration_count: 1,
    ...overrides,
})

describe('directory duplicate helpers', () => {
  test('finds same-name rows with different phones', () => {
    const rows = [
      baseRow({ phone_key: '+233244111111', phone: '0244111111', registration_id: undefined }),
      baseRow({
        phone_key: '+233244222222',
        phone: '0244222222',
        years: [{ year_id: 'y2', year: 2024, status: 'registered', registration_id: 'r2' }],
      }),
      baseRow({
        phone_key: '+233244333333',
        full_name: 'Desmond Goldsmith',
        phone: '0244333333',
      }),
    ]

    const groups = findDirectoryDuplicateGroups(rows)
    expect(groups).toHaveLength(1)
    expect(groups[0]?.displayName).toBe('Emmanuel Ntow')
    expect(groups[0]?.rows).toHaveLength(2)
  })

  test('prefers valid phone and linked account when scoring', () => {
    const withAccount = scoreDirectoryRowForCanonical(
      baseRow({ user_id: 'u1', registration_count: 2 })
    )
    const bare = scoreDirectoryRowForCanonical(
      baseRow({ phone_key: 'missing:r9', phone: '', registration_count: 1 })
    )
    expect(withAccount).toBeGreaterThan(bare)
  })

  test('lists registration ids from non-primary rows', () => {
    const group = findDirectoryDuplicateGroups([
      baseRow({ phone_key: '+233244111111' }),
      baseRow({
        phone_key: '+233244222222',
        phone: '0244222222',
        years: [{ year_id: 'y2', year: 2024, status: 'registered', registration_id: 'r2' }],
      }),
    ])[0]!

    expect(registrationIdsToMerge(group, '+233244111111')).toEqual(['r2'])
  })
})
