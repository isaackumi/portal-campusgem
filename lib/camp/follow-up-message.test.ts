import { describe, expect, test } from 'bun:test'
import { buildCampFollowUpMessage } from './follow-up-message'

const camp = { year: 2026, theme: 'Arise and Shine', start_date: '2026-12-10', end_date: '2026-12-13', venue: 'Winneba' }

describe('buildCampFollowUpMessage', () => {
  test('names the registrant, the caller, the camp and its dates', () => {
    const msg = buildCampFollowUpMessage({
      registrant: { first_name: 'Ama Serwaa', full_name: 'Ama Serwaa Mensah' },
      callerName: 'Kofi Boateng',
      camp,
    })
    expect(msg.startsWith('Hi Ama, this is Kofi from Campus GEM')).toBe(true)
    expect(msg).toContain('Camp Meeting 2026 (“Arise and Shine”), Thu 10 Dec – Sun 13 Dec at Winneba')
    expect(msg).toContain('reply YES or NO')
    expect(msg).toContain('stay connected')
  })

  test('works without caller, camp details or first name', () => {
    const msg = buildCampFollowUpMessage({ registrant: { full_name: 'Yaw Owusu' } })
    expect(msg.startsWith('Hi Yaw, this is Campus GEM')).toBe(true)
    expect(msg).toContain('registration for Camp Meeting. Are you still coming?')
  })

  test('one-day camp shows a single date and falls back to "there"', () => {
    const msg = buildCampFollowUpMessage({
      registrant: {},
      callerName: '  ',
      camp: { year: 2026, start_date: '2026-12-10', end_date: '2026-12-10' },
    })
    expect(msg.startsWith('Hi there, this is Campus GEM')).toBe(true)
    expect(msg).toContain('Camp Meeting 2026, Thu 10 Dec.')
  })
})
