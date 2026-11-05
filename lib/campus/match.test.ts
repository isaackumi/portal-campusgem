import { describe, expect, test } from 'bun:test'
import {
  campusMatchTerms,
  matchPersonToCampus,
  matchPersonToCampuses,
  normalizeShortCode,
  parseAliases,
  slugifyCampus,
} from '@/lib/campus/match'

const UEW = { id: 'uew', name: 'University of Education, Winneba', short_code: 'UEW', aliases: ['Winneba'] }
const UCC = { id: 'ucc', name: 'University of Cape Coast', short_code: 'UCC' }
const UG = { id: 'ug', name: 'University of Ghana (Legon)', short_code: 'UG', aliases: ['Legon'] }

describe('matchPersonToCampus', () => {
  test('short code, case-insensitive, with a reason', () => {
    const m = matchPersonToCampus(UEW, [{ label: 'school', value: 'uew winneba' }])
    expect(m?.reasons).toEqual(['school: "uew winneba"'])
  })

  test('alias in residence', () => {
    expect(matchPersonToCampus(UEW, [{ label: 'residence', value: 'North Campus, Winneba' }])).not.toBeNull()
  })

  test('full name phrase with punctuation', () => {
    expect(matchPersonToCampus(UCC, [{ label: 'school', value: 'Univ: university of cape coast' }])).not.toBeNull()
  })

  test('generic words never match on their own', () => {
    expect(matchPersonToCampus(UCC, [{ label: 'school', value: 'University of Ghana' }])).toBeNull()
    expect(matchPersonToCampus(UEW, [{ label: 'school', value: 'Education Service' }])).toBeNull()
  })

  test('tokens, not substrings: "UGC" is not "UG"', () => {
    expect(matchPersonToCampus(UG, [{ label: 'school', value: 'UGC Ltd' }])).toBeNull()
    expect(matchPersonToCampus(UG, [{ label: 'school', value: 'UG, Legon' }])).not.toBeNull()
  })

  test('empty sources give nothing', () => {
    expect(matchPersonToCampus(UEW, [{ label: 'school', value: '' }, { label: 'x', value: null }])).toBeNull()
  })
})

describe('matchPersonToCampuses', () => {
  test('picks the stronger campus', () => {
    const r = matchPersonToCampuses([UEW, UCC, UG], [{ label: 'school', value: 'UCC' }])
    expect(r.map((x) => x.campus_id)).toEqual(['ucc'])
  })
  test('a tie returns both', () => {
    const r = matchPersonToCampuses([UEW, UCC], [{ label: 'school', value: 'UEW then UCC' }])
    expect(r.map((x) => x.campus_id).sort()).toEqual(['ucc', 'uew'])
  })
})

describe('identity helpers', () => {
  test('short code', () => {
    expect(normalizeShortCode(' uew ')).toBe('UEW')
    expect(normalizeShortCode('U')).toBeNull()
    expect(normalizeShortCode('K.N.U.S.T')).toBe('KNUST')
  })
  test('slug', () => {
    expect(slugifyCampus('University of Cape Coast')).toBe('university-of-cape-coast')
  })
  test('aliases de-duplicate case-insensitively', () => {
    expect(parseAliases('Winneba, winneba ,UEW\n')).toEqual(['Winneba', 'UEW'])
  })
  test('terms skip one-letter codes', () => {
    expect(campusMatchTerms({ id: 'a', name: 'X', short_code: 'A' })).toEqual([])
  })
})
