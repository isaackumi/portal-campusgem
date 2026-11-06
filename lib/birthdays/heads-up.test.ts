import { describe, expect, test } from 'bun:test'
import { buildHeadsUpTexts, dueInDays, headsUpLine, mergePeople } from './heads-up'

const today = { year: 2026, month: 11, day: 6 } // Friday

describe('mergePeople', () => {
  test('same phone in different formats is one person with combined tags', () => {
    const merged = mergePeople([
      { name: 'Ama Mensah', phone: '0244123456', birthMonth: 11, birthDay: 13, tags: ['UEW', 'Campus GEM'] },
      { name: 'Ama S. Mensah', phone: '+233 24 412 3456', birthMonth: 11, birthDay: 13, tags: ['Camper 2026'] },
    ])
    expect(merged).toHaveLength(1)
    expect(merged[0]!.name).toBe('Ama S. Mensah')
    expect(merged[0]!.tags).toEqual(['UEW', 'Campus GEM', 'Camper 2026'])
  })

  test('without a phone, name + birthday is the key', () => {
    const merged = mergePeople([
      { name: 'Kofi Boateng', birthMonth: 3, birthDay: 4, tags: ['RLC'] },
      { name: 'kofi  boateng', birthMonth: 3, birthDay: 4, tags: ['RLC visitor'] },
      { name: 'Kofi Boateng', birthMonth: 3, birthDay: 5, tags: ['RLC'] },
    ])
    expect(merged).toHaveLength(2)
  })
})

describe('dueInDays', () => {
  test('only birthdays exactly one week away', () => {
    const due = dueInDays(
      [
        { name: 'Yaw', phone: '0201112223', birthMonth: 11, birthDay: 13, tags: ['RLC'] },
        { name: 'Efua', phone: '0201112224', birthMonth: 11, birthDay: 12, tags: ['UCC'] },
        { name: 'Akosua', phone: '0201112225', birthMonth: 11, birthDay: 6, tags: [] },
      ],
      today
    )
    expect(due.map((d) => d.name)).toEqual(['Yaw'])
    expect(due[0]!.date).toBe('Friday 13 November')
  })
})

describe('buildHeadsUpTexts', () => {
  test('name, phone and where they belong', () => {
    const due = dueInDays([{ name: 'Ama Mensah', phone: '233244123456', birthMonth: 11, birthDay: 13, tags: ['UEW', 'Camper 2026'], ageTurning: 21 }], today)
    expect(headsUpLine(due[0]!)).toBe('Ama Mensah, 024 412 3456 (UEW, Camper 2026, turns 21)')
    const [text] = buildHeadsUpTexts(due)
    expect(text).toBe('Birthdays in one week, Friday 13 November:\nAma Mensah, 024 412 3456 (UEW, Camper 2026, turns 21)\nThe app sends their birthday text on the day.')
  })

  test('nobody due: no text', () => {
    expect(buildHeadsUpTexts([])).toEqual([])
  })

  test('long lists are split into numbered texts under 3 SMS each', () => {
    const people = Array.from({ length: 30 }, (_, i) => ({
      name: `Person Number ${i + 1}`,
      phone: `02400000${String(i).padStart(2, '0')}`,
      birthMonth: 11,
      birthDay: 13,
      tags: ['Campus GEM', 'UEW'],
    }))
    const texts = buildHeadsUpTexts(dueInDays(people, today))
    expect(texts.length).toBeGreaterThan(1)
    expect(texts[0]).toContain(`(1/${texts.length})`)
    for (const t of texts) expect(t.length).toBeLessThanOrEqual(450)
    expect(texts.join('\n').match(/Person Number/g)).toHaveLength(30)
  })
})
