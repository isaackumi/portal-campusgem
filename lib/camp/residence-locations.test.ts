import { describe, expect, it } from 'bun:test'
import {
  CAMP_RESIDENCE_OPTIONS,
  CAMP_RESIDENCE_OTHER,
  isCanonicalResidence,
  normalizeResidenceLabel,
} from '@/lib/camp/residence-locations'

describe('camp residence locations', () => {
  it('lists towns alphabetically with Other last', () => {
    expect(CAMP_RESIDENCE_OPTIONS[CAMP_RESIDENCE_OPTIONS.length - 1]).toBe(CAMP_RESIDENCE_OTHER)
    const towns = CAMP_RESIDENCE_OPTIONS.slice(0, -1)
    const sorted = [...towns].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }))
    expect(towns).toEqual(sorted)
    expect(CAMP_RESIDENCE_OPTIONS).toContain('Mumford')
    expect(CAMP_RESIDENCE_OPTIONS).toContain('Kasoa')
    expect(CAMP_RESIDENCE_OPTIONS).toContain('T-junction')
  })

  it('normalizes known free-text variants to one label without changing storage semantics', () => {
    expect(normalizeResidenceLabel('Mumford, CR')).toBe('Mumford')
    expect(normalizeResidenceLabel('Gomoa West/Mumford')).toBe('Mumford')
    expect(normalizeResidenceLabel('kasoa , CA')).toBe('Kasoa')
    expect(normalizeResidenceLabel('WINNEBA')).toBe('Winneba')
    expect(normalizeResidenceLabel('T-junction')).toBe('T-junction')
    expect(normalizeResidenceLabel('')).toBe('Not recorded')
  })

  it('detects canonical labels', () => {
    expect(isCanonicalResidence('Mumford')).toBe(true)
    expect(isCanonicalResidence('mumford')).toBe(true)
    expect(isCanonicalResidence('Mumford C/R')).toBe(false)
  })
})
