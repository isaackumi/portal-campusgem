import { describe, expect, it } from 'bun:test'
import { isCampCheckInCodeFormat, normalizeCampCheckInCode } from '@/lib/camp/check-in-code'

describe('camp check-in code', () => {
  it('normalizes and validates GEM format', () => {
    expect(normalizeCampCheckInCode(' gem-26-abcd ')).toBe('GEM-26-ABCD')
    expect(isCampCheckInCodeFormat('GEM-26-ABCD')).toBe(true)
    expect(isCampCheckInCodeFormat('CAMP-OLD-CODE')).toBe(false)
  })
})
