import { describe, expect, it } from 'vitest'
import { cleanTemplateInput, DEFAULT_CALL_TEMPLATES, fillCallTemplate, templatesFor, unknownPlaceholders } from './templates'

describe('fillCallTemplate', () => {
  it('fills every placeholder it knows', () => {
    expect(fillCallTemplate('Hi {{firstName}}, this is {{callerName}} from {{ministry}}.', { firstName: 'Ama', callerName: 'Kofi', ministry: 'Campus GEM' })).toBe(
      'Hi Ama, this is Kofi from Campus GEM.'
    )
  })

  it('drops missing values cleanly, without stray braces or punctuation', () => {
    const body = 'Camp Meeting {{campYear}} ({{campDates}}, {{venue}}). See you at {{venue}}!'
    expect(fillCallTemplate(body, { campYear: 2026 })).toBe('Camp Meeting 2026. See you!')
    expect(fillCallTemplate(body, { campYear: 2026, campDates: '12 – 16 Aug' })).toBe('Camp Meeting 2026 (12 – 16 Aug). See you!')
    expect(fillCallTemplate(body, { campYear: 2026, campDates: '12 – 16 Aug', venue: 'Abokobi' })).toBe(
      'Camp Meeting 2026 (12 – 16 Aug, Abokobi). See you at Abokobi!'
    )
  })

  it('keeps line breaks', () => {
    expect(fillCallTemplate('Hi {{firstName}}!\n\nGod bless.', { firstName: 'Yaw' })).toBe('Hi Yaw!\n\nGod bless.')
  })

  it('every default reads well with typical values', () => {
    const vars = { firstName: 'Ama', name: 'Ama Mensah', callerName: 'Kofi', ministry: 'Campus GEM', campYear: 2026, campDates: '12 – 16 Aug', venue: 'Abokobi', theme: 'Arise', group: 'Legon' }
    for (const t of DEFAULT_CALL_TEMPLATES) {
      const text = fillCallTemplate(t.body, vars)
      expect(text).not.toMatch(/\{\{|\}\}/)
      expect(unknownPlaceholders(t.body)).toEqual([])
    }
  })
})

describe('templates managers edit', () => {
  it('cleans input and says what is missing', () => {
    expect(cleanTemplateInput({ name: ' ', body: 'x' }).error).toMatch(/name/)
    expect(cleanTemplateInput({ name: 'Hi', body: '  ' }).error).toMatch(/message/)
    const ok = cleanTemplateInput({ name: 'Hi', body: 'Hello {{firstName}}', audience: 'nope' })
    expect(ok.template).toMatchObject({ name: 'Hi', body: 'Hello {{firstName}}', audience: 'any' })
    expect(ok.template?.key).toMatch(/^custom-/)
  })

  it('a saved template replaces its default; hidden ones leave the picker', () => {
    const saved = [
      { key: 'camp-confirm', name: 'Still coming?', body: 'Hi {{firstName}}!', audience: 'camp' as const, position: 10 },
      { key: 'camp-payment', name: 'Pay', body: 'x', audience: 'camp' as const, position: 50, archived: true },
      { key: 'custom-a1', name: 'Bus times', body: 'Bus at 6am', audience: 'camp' as const, position: 15 },
    ]
    const picked = templatesFor('camp', saved)
    expect(picked.find((t) => t.key === 'camp-confirm')).toMatchObject({ name: 'Still coming?', isDefault: false })
    expect(picked.some((t) => t.key === 'camp-payment')).toBe(false)
    expect(picked.map((t) => t.key).slice(0, 2)).toEqual(['camp-confirm', 'custom-a1'])
    // Camp shows camp and "any" templates, never member ones.
    expect(picked.some((t) => t.audience === 'members')).toBe(false)
    expect(picked.some((t) => t.audience === 'any')).toBe(true)
    expect(templatesFor('camp', saved, { includeArchived: true }).some((t) => t.key === 'camp-payment')).toBe(true)
  })
})
