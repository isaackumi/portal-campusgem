import { describe, expect, it } from 'vitest'
import { seededRandom, shareOut, summarizeShare, type ShareCaller, type SharePerson } from './distribute'

const people = (n: number, over: (i: number) => Partial<SharePerson> = () => ({})): SharePerson[] =>
  Array.from({ length: n }, (_, i) => ({ id: `p${i}`, isNew: false, ...over(i) }))
const caller = (id: string, over: Partial<ShareCaller> = {}): ShareCaller => ({ id, takes: 'all', ...over })
const owner = (r: ReturnType<typeof shareOut>) => new Map(r.assignments.map((a) => [a.personId, a.callerId]))

describe('sharing calls out', () => {
  it('shares evenly, everyone placed', () => {
    const r = shareOut(people(10), [caller('a'), caller('b'), caller('c')], { sameGender: false, matchTakes: false }, 1)
    const counts = [...summarizeShare(r, people(10)).values()].map((x) => x.total).sort()
    expect(counts).toEqual([3, 3, 4])
    expect(r.unplaced).toEqual([])
  })

  it('evens out against what callers already have', () => {
    const r = shareOut(people(4), [caller('busy', { load: 5 }), caller('free')], { sameGender: false, matchTakes: false }, 2)
    expect(r.assignments.every((a) => a.callerId === 'free')).toBe(true)
  })

  it('men call men and women call women; unknown never blocks', () => {
    const ps = people(8, (i) => ({ sex: i % 2 ? 'Female' : 'Male' }))
    ps.push({ id: 'unknown', isNew: false })
    const r = shareOut(ps, [caller('m', { gender: 'Male' }), caller('f', { gender: 'Female' })], { sameGender: true, matchTakes: false }, 3)
    const own = owner(r)
    for (const p of ps.filter((x) => x.sex)) expect(own.get(p.id)).toBe(p.sex === 'Male' ? 'm' : 'f')
    expect(own.has('unknown')).toBe(true)
    expect(r.relaxed.gender).toBe(0)
  })

  it('relaxes the gender rule rather than leave someone out, and says so', () => {
    const r = shareOut(people(3, () => ({ sex: 'Female' })), [caller('m', { gender: 'Male' })], { sameGender: true, matchTakes: false }, 4)
    expect(r.assignments).toHaveLength(3)
    expect(r.relaxed.gender).toBe(3)
  })

  it('new campers to some callers, returning to others', () => {
    const ps = people(6, (i) => ({ isNew: i < 3 }))
    const r = shareOut(ps, [caller('n', { takes: 'new' }), caller('r', { takes: 'returning' })], { sameGender: false, matchTakes: true }, 5)
    const own = owner(r)
    for (const p of ps) expect(own.get(p.id)).toBe(p.isNew ? 'n' : 'r')
  })

  it("keeps to each caller's limit; the rest wait", () => {
    const r = shareOut(people(5), [caller('a', { max: 2 }), caller('b', { max: 1 })], { sameGender: false, matchTakes: false }, 6)
    expect(r.assignments).toHaveLength(3)
    expect(r.unplaced).toHaveLength(2)
  })

  it('is the same for the same seed (the preview is what gets shared)', () => {
    const callers = [caller('a'), caller('b'), caller('c')]
    expect(shareOut(people(20), callers, { sameGender: false, matchTakes: false }, 42)).toEqual(
      shareOut(people(20), callers, { sameGender: false, matchTakes: false }, 42)
    )
    expect(seededRandom(7)()).toBe(seededRandom(7)())
  })

  it('with no callers, nobody is placed', () => {
    expect(shareOut(people(2), [], { sameGender: false, matchTakes: false }, 1).unplaced).toEqual(['p0', 'p1'])
  })
})
