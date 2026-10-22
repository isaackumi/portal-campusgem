import { describe, expect, test } from 'bun:test'
import type { AppUser } from '@/lib/types'
import { findDuplicatePeople, personNameKey } from './duplicates'

function user(partial: Partial<AppUser> & { id: string; full_name: string }): AppUser {
  return {
    membership_id: `CG-${partial.id}`,
    role: 'member',
    join_year: 2026,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...partial,
  }
}

describe('personNameKey', () => {
  test('ignores order, case, spacing and punctuation', () => {
    expect(personNameKey('Divine  Asem')).toBe(personNameKey('asem divine.'))
  })
})

describe('findDuplicatePeople', () => {
  test('flags same name with a different number and suggests keeping the admin', () => {
    const groups = findDuplicatePeople([
      user({ id: 'a', full_name: 'Divine Asem', role: 'admin', phone: '+23324123238', auth_uid: 'x' }),
      user({ id: 'b', full_name: 'Divine  Asem', role: 'member', phone: '+233241232385', auth_uid: 'y' }),
      user({ id: 'c', full_name: 'Someone Else', phone: '0241111111' }),
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0].records.map((r) => r.id).sort()).toEqual(['a', 'b'])
    expect(groups[0].suggestedKeepId).toBe('a')
  })

  test('skips records that share a number, single names, and already linked records', () => {
    expect(
      findDuplicatePeople([
        user({ id: 'a', full_name: 'Ama Mensah', phone: '0241234567' }),
        user({ id: 'b', full_name: 'Ama Mensah', phone: '+233241234567' }),
        user({ id: 'c', full_name: 'Grace', phone: '0241111111' }),
        user({ id: 'd', full_name: 'Grace', phone: '0242222222' }),
        user({ id: 'e', full_name: 'Kofi Boat', phone: '0243333333' }),
        user({ id: 'f', full_name: 'Kofi Boat', phone: '0244444444', merged_into: 'e' }),
      ])
    ).toEqual([])
  })
})
