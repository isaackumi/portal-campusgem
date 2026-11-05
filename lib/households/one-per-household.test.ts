import { describe, expect, test } from 'bun:test'
import { householdIdsOf, onePerHousehold } from './one-per-household'

type P = { user: string; household?: string; phone?: string }

const opts = (primaries: Record<string, string | null> = {}) => ({
  householdId: (p: P) => p.household,
  userId: (p: P) => p.user,
  isReachable: (p: P) => Boolean(p.phone),
  primaryByHousehold: primaries,
})

describe('onePerHousehold', () => {
  test('keeps people without a household', () => {
    const list: P[] = [{ user: 'a', phone: '1' }, { user: 'b' }]
    expect(onePerHousehold(list, opts()).kept).toEqual(list)
  })

  test('keeps the primary person when reachable', () => {
    const list: P[] = [
      { user: 'a', household: 'h', phone: '1' },
      { user: 'b', household: 'h', phone: '2' },
    ]
    const { kept, dropped } = onePerHousehold(list, opts({ h: 'b' }))
    expect(kept.map((p) => p.user)).toEqual(['b'])
    expect(dropped.map((p) => p.user)).toEqual(['a'])
  })

  test('falls back to the first reachable person when the primary has no phone', () => {
    const list: P[] = [
      { user: 'a', household: 'h' },
      { user: 'b', household: 'h', phone: '2' },
      { user: 'c', household: 'h', phone: '3' },
    ]
    expect(onePerHousehold(list, opts({ h: 'a' })).kept.map((p) => p.user)).toEqual(['b'])
  })

  test('falls back when the primary is not in the list or none is set', () => {
    const list: P[] = [
      { user: 'a', household: 'h', phone: '1' },
      { user: 'b', household: 'h', phone: '2' },
    ]
    expect(onePerHousehold(list, opts({ h: 'zzz' })).kept.map((p) => p.user)).toEqual(['a'])
    expect(onePerHousehold(list, opts()).kept.map((p) => p.user)).toEqual(['a'])
  })

  test('keeps one (unreachable) person when nobody in the household has a phone', () => {
    const list: P[] = [
      { user: 'a', household: 'h' },
      { user: 'b', household: 'h' },
    ]
    const { kept, dropped } = onePerHousehold(list, opts())
    expect(kept.map((p) => p.user)).toEqual(['a'])
    expect(dropped.map((p) => p.user)).toEqual(['b'])
  })

  test('handles several households and keeps input order', () => {
    const list: P[] = [
      { user: 'x', phone: '0' },
      { user: 'a', household: 'h1', phone: '1' },
      { user: 'c', household: 'h2', phone: '3' },
      { user: 'b', household: 'h1', phone: '2' },
      { user: 'd', household: 'h2', phone: '4' },
    ]
    const { kept } = onePerHousehold(list, opts({ h1: 'b' }))
    expect(kept.map((p) => p.user)).toEqual(['x', 'c', 'b'])
  })

  test('householdIdsOf lists unique ids', () => {
    const list: P[] = [{ user: 'a', household: 'h' }, { user: 'b', household: 'h' }, { user: 'c' }]
    expect(householdIdsOf(list, (p) => p.household)).toEqual(['h'])
  })
})
