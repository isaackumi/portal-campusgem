import { describe, expect, test } from 'bun:test'
import type { Member } from '@/lib/types'
import {
  daysUntilNextBirthday,
  filterBirthdaysByBirthMonth,
  filterBirthdaysByTime,
  isCampusGemMember,
  isRlcMember,
  memberToBirthdayEntry,
  nextBirthdayDate,
} from '@/lib/birthdays/upcoming-birthdays'

describe('upcoming birthdays', () => {
  const refDate = new Date('2026-08-30T12:00:00')

  test('computes next birthday in same year when still ahead', () => {
    const next = nextBirthdayDate('2000-09-15', refDate)
    expect(next.getFullYear()).toBe(2026)
    expect(next.getMonth()).toBe(8)
    expect(next.getDate()).toBe(15)
  })

  test('rolls to next year when birthday already passed', () => {
    const next = nextBirthdayDate('1990-03-10', refDate)
    expect(next.getFullYear()).toBe(2027)
    expect(next.getMonth()).toBe(2)
    expect(next.getDate()).toBe(10)
  })

  test('filters today and week windows', () => {
    const entries = [
      memberToBirthdayEntry(makeMember('1', '2000-08-30'), { href: '/a' }),
      memberToBirthdayEntry(makeMember('2', '2000-09-02'), { href: '/b' }),
      memberToBirthdayEntry(makeMember('3', '2000-10-01'), { href: '/c' }),
    ].filter(Boolean) as NonNullable<ReturnType<typeof memberToBirthdayEntry>>[]

    const today = filterBirthdaysByTime(entries, 'today', refDate)
    expect(today).toHaveLength(1)
    expect(today[0]?.id).toBe('1')

    const week = filterBirthdaysByTime(entries, 'week', refDate)
    expect(week.map((row) => row.id)).toEqual(['1', '2'])
  })

  test('filters by birth month regardless of upcoming window', () => {
    const entries = [
      memberToBirthdayEntry(makeMember('1', '1995-03-05'), { href: '/a' }),
      memberToBirthdayEntry(makeMember('2', '1988-08-30'), { href: '/b' }),
    ].filter(Boolean) as NonNullable<ReturnType<typeof memberToBirthdayEntry>>[]

    const march = filterBirthdaysByBirthMonth(entries, 3)
    expect(march).toHaveLength(1)
    expect(march[0]?.id).toBe('1')
  })

  test('congregation filters', () => {
    expect(isCampusGemMember({ status: 'active', congregation: 'campus_gem' } as Member)).toBe(true)
    expect(isCampusGemMember({ status: 'active', congregation: 'rlc' } as Member)).toBe(false)
    expect(isRlcMember({ status: 'active', congregation: 'both' } as Member)).toBe(true)
  })

  test('days until is zero on birthday', () => {
    expect(daysUntilNextBirthday('2000-08-30', refDate)).toBe(0)
  })
})

function makeMember(id: string, dob: string): Member {
  return {
    id,
    user_id: `u-${id}`,
    dob,
    status: 'active',
    emergency_contacts: [],
    documents: [],
    created_at: '',
    updated_at: '',
    user: {
      id: `u-${id}`,
      full_name: `Person ${id}`,
      email: '',
      role: 'member',
      membership_id: `CG-${id}`,
      created_at: '',
      updated_at: '',
    },
  }
}
