import { describe, expect, test } from 'bun:test'
import {
  mergeCamperDirectoryBuckets,
  normalizePersonNameKey,
  type CamperDirectoryBucket,
} from '@/lib/camp/person-identity'

describe('person identity helpers', () => {
  test('normalizes names for matching', () => {
    expect(normalizePersonNameKey('  Emmanuel   Ntow ')).toBe('emmanuel ntow')
  })

  test('merges missing-phone rows with the same name', () => {
    const buckets = new Map<string, CamperDirectoryBucket>([
      [
        'missing:r1',
        {
          phone_key: 'missing:r1',
          full_name: 'Emmanuel Ntow',
          phone: '',
          years: [{ year_id: 'y1', year: 2024, status: 'registered', registration_id: 'r1' }],
          registration_count: 1,
        },
      ],
      [
        'missing:r2',
        {
          phone_key: 'missing:r2',
          full_name: 'Emmanuel Ntow',
          phone: '',
          years: [{ year_id: 'y2', year: 2025, status: 'registered', registration_id: 'r2' }],
          registration_count: 1,
        },
      ],
    ])

    const merged = mergeCamperDirectoryBuckets(buckets)
    expect(merged).toHaveLength(1)
    expect(merged[0]?.registration_count).toBe(2)
    expect(merged[0]?.years).toHaveLength(2)
  })

  test('merges missing-phone row into valid-phone row with same name', () => {
    const buckets = new Map<string, CamperDirectoryBucket>([
      [
        '+233244123456',
        {
          phone_key: '+233244123456',
          full_name: 'Desmond Goldsmith',
          phone: '0244123456',
          years: [{ year_id: 'y1', year: 2025, status: 'registered', registration_id: 'r1' }],
          registration_count: 1,
        },
      ],
      [
        'missing:r2',
        {
          phone_key: 'missing:r2',
          full_name: 'Desmond Goldsmith',
          phone: '',
          years: [{ year_id: 'y2', year: 2024, status: 'registered', registration_id: 'r2' }],
          registration_count: 1,
        },
      ],
    ])

    const merged = mergeCamperDirectoryBuckets(buckets)
    expect(merged).toHaveLength(1)
    expect(merged[0]?.phone_key).toBe('+233244123456')
    expect(merged[0]?.registration_count).toBe(2)
  })
})
