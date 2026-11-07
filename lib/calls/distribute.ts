/**
 * Sharing calls out without anyone assigning by hand: everyone who needs a call goes, at random but
 * evenly, to the callers (the people in a live session, or the call team), following the rules the
 * manager switched on:
 *
 * - Same gender: men call men, women call women (when both are known).
 * - Takes: a caller who takes only New campers (or only Returning) gets only those.
 * - Most: a caller's limit, if they set one.
 *
 * When a rule leaves someone with no caller (no women on the team, say), that rule is relaxed for
 * them rather than leaving them out, and the result says how often. Seeded, so a preview and the
 * share that follows it come out the same.
 */

export type Gender = 'Male' | 'Female'
export type Takes = 'all' | 'new' | 'returning'

export type ShareCaller = {
  id: string
  gender?: Gender | null
  takes: Takes
  /** The most this caller should have open (none: no limit). */
  max?: number | null
  /** What they already have open (counts toward `max` and toward evenness). */
  load?: number
}

export type SharePerson = { id: string; sex?: Gender | null; isNew: boolean }

export type ShareRules = { sameGender: boolean; matchTakes: boolean }

export type ShareResult = {
  assignments: Array<{ personId: string; callerId: string }>
  /** People given to a caller outside a rule, because nobody fitted it. */
  relaxed: { gender: number; takes: number }
  /** People nobody could take (everyone at their limit). */
  unplaced: string[]
}

/** A small seeded random (mulberry32), so the same seed gives the same share. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[out[i], out[j]] = [out[j]!, out[i]!]
  }
  return out
}

const takesFits = (caller: ShareCaller, person: SharePerson) =>
  caller.takes === 'all' || (caller.takes === 'new' ? person.isNew : !person.isNew)

/** Different only when both are known: an unknown gender never blocks a match. */
const genderFits = (caller: ShareCaller, person: SharePerson) => !caller.gender || !person.sex || caller.gender === person.sex

export function shareOut(people: readonly SharePerson[], callers: readonly ShareCaller[], rules: ShareRules, seed = Date.now()): ShareResult {
  const random = seededRandom(seed)
  const load = new Map(callers.map((c) => [c.id, c.load ?? 0]))
  const roomFor = (c: ShareCaller) => c.max == null || (load.get(c.id) ?? 0) < c.max
  const result: ShareResult = { assignments: [], relaxed: { gender: 0, takes: 0 }, unplaced: [] }
  if (!callers.length) return { ...result, unplaced: people.map((p) => p.id) }

  for (const person of shuffle(people, random)) {
    const open = callers.filter(roomFor)
    let pool = open.filter((c) => (!rules.sameGender || genderFits(c, person)) && (!rules.matchTakes || takesFits(c, person)))
    if (!pool.length && rules.sameGender) {
      pool = open.filter((c) => !rules.matchTakes || takesFits(c, person))
      if (pool.length) result.relaxed.gender += 1
    }
    if (!pool.length && rules.matchTakes) {
      pool = open.filter((c) => !rules.sameGender || genderFits(c, person))
      if (!pool.length) pool = open
      if (pool.length) result.relaxed.takes += 1
    }
    if (!pool.length) {
      result.unplaced.push(person.id)
      continue
    }
    const least = Math.min(...pool.map((c) => load.get(c.id) ?? 0))
    const lightest = pool.filter((c) => (load.get(c.id) ?? 0) === least)
    const pick = lightest[Math.floor(random() * lightest.length)]!
    load.set(pick.id, least + 1)
    result.assignments.push({ personId: person.id, callerId: pick.id })
  }
  return result
}

/** The preview's line per caller: how many, and of whom. */
export function summarizeShare(
  result: ShareResult,
  people: readonly SharePerson[]
): Map<string, { total: number; male: number; female: number; newcomers: number; returning: number }> {
  const byId = new Map(people.map((p) => [p.id, p]))
  const rows = new Map<string, { total: number; male: number; female: number; newcomers: number; returning: number }>()
  for (const a of result.assignments) {
    const p = byId.get(a.personId)
    const row = rows.get(a.callerId) ?? { total: 0, male: 0, female: 0, newcomers: 0, returning: 0 }
    row.total += 1
    if (p?.sex === 'Male') row.male += 1
    if (p?.sex === 'Female') row.female += 1
    if (p?.isNew) row.newcomers += 1
    else row.returning += 1
    rows.set(a.callerId, row)
  }
  return rows
}
