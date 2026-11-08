import { describe, expect, test } from 'bun:test'
import { looksLikeCampus, suggestShortCode } from './setup'

describe('looksLikeCampus', () => {
  test('universities and colleges', () => {
    expect(looksLikeCampus('University of Ghana, Legon')).toBe(true)
    expect(looksLikeCampus('Accra College of Education')).toBe(true)
    expect(looksLikeCampus('KNUST')).toBe(true)
  })
  test('ordinary groups', () => {
    expect(looksLikeCampus('Choir')).toBe(false)
    expect(looksLikeCampus('Ushering ministry')).toBe(false)
    expect(looksLikeCampus('')).toBe(false)
    expect(looksLikeCampus(undefined)).toBe(false)
  })
})

describe('suggestShortCode', () => {
  test('known campuses', () => {
    expect(suggestShortCode('University of Ghana, Legon')).toBe('UG')
    expect(suggestShortCode('University of Ghana (Legon)')).toBe('UG')
    expect(suggestShortCode('University of Education, Winneba')).toBe('UEW')
    expect(suggestShortCode('University of Cape Coast')).toBe('UCC')
  })
  test('initials otherwise', () => {
    expect(suggestShortCode('Accra College of Education')).toBe('ACE')
    expect(suggestShortCode('Ho Technical University, Ho')).toBe('HTU')
  })
  test('nothing useful', () => {
    expect(suggestShortCode('Choir')).toBe('')
    expect(suggestShortCode('')).toBe('')
  })
})
