import { describe, expect, test } from 'bun:test'
import { classifyRoster, parseRoster } from '@/lib/campus/roster-import'

const people = [
  { user_id: 'u1', full_name: 'Ama Mensah', phones: ['0241234567'] },
  { user_id: 'u2', full_name: 'Kofi Boateng', phones: ['+233201111111'], campus: 'UCC' },
  { user_id: 'u3', full_name: 'Kofi Boateng', phones: [] },
]

describe('parseRoster', () => {
  test('header, CSV, tabs, phone-only, name-only', () => {
    const rows = parseRoster('Name,Phone\nAma Mensah, 024 123 4567\n0209999999\tYaw Ofori\n\nEsi Arthur\n')
    expect(rows.map((r) => [r.name, r.phone])).toEqual([
      ['Ama Mensah', '+233241234567'],
      ['Yaw Ofori', '+233209999999'],
      ['Esi Arthur', undefined],
    ])
  })
  test('bad phone is kept for the preview', () => {
    expect(parseRoster('Abena, 02412')[0].bad_phone).toBe('02412')
  })
})

describe('classifyRoster', () => {
  test('matched / new / ambiguous / invalid', () => {
    const rows = classifyRoster(
      parseRoster(
        ['0241234567', 'Yaw Ofori, 0209999999', 'Kofi Boateng', '233201111111', '0551112222', 'Nobody Here', '024 123 4567'].join('\n')
      ),
      people
    )
    expect(rows.map((r) => r.status)).toEqual(['matched', 'new', 'ambiguous', 'matched', 'invalid', 'invalid', 'invalid'])
    expect(rows[0].user_id).toBe('u1')
    expect(rows[3].current_campus).toBe('UCC')
    expect(rows[6].note).toContain('earlier row')
  })
})
