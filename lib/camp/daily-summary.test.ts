import { describe, expect, it } from 'bun:test'
import { buildLiveRegistrationPulse } from '@/lib/camp/analytics'
import {
  buildCampDailySummaryText,
  buildCampDailySummaryWhatsAppUrl,
  formatCampSummaryDate,
} from '@/lib/camp/daily-summary'
import type { CampRegistration } from '@/lib/types'

function makeReg(overrides: Partial<CampRegistration> & { id: string; camp_year_id: string }): CampRegistration {
  return {
    full_name: 'Test User',
    email: 'test@example.com',
    phone: '0244123456',
    role: 'Participant',
    is_new_registrant: true,
    status: 'registered',
    qr_code: 'qr',
    created_at: '2026-05-01T10:00:00Z',
    updated_at: '2026-05-01T10:00:00Z',
    ...overrides,
  }
}

describe('camp daily summary', () => {
  it('formats a readable summary date', () => {
    expect(formatCampSummaryDate(new Date('2026-09-09T12:00:00.000Z'))).toContain('2026')
  })

  it('splits today into new vs returning and builds WhatsApp text', () => {
    const now = new Date('2026-09-09T12:00:00.000Z')
    const regs = [
      makeReg({
        id: 'a',
        camp_year_id: 'year-2026',
        is_new_registrant: true,
        created_at: '2026-09-09T09:00:00.000Z',
      }),
      makeReg({
        id: 'b',
        camp_year_id: 'year-2026',
        is_new_registrant: false,
        created_at: '2026-09-09T10:00:00.000Z',
      }),
      makeReg({
        id: 'c',
        camp_year_id: 'year-2026',
        is_new_registrant: true,
        created_at: '2026-09-08T10:00:00.000Z',
      }),
    ]
    const pulse = buildLiveRegistrationPulse(regs, now)
    expect(pulse.today).toBe(2)
    expect(pulse.todayNew).toBe(1)
    expect(pulse.todayReturning).toBe(1)
    expect(pulse.last7New).toBe(2)
    expect(pulse.last7Returning).toBe(1)

    const text = buildCampDailySummaryText({
      year: 2026,
      theme: 'Light',
      total: regs.length,
      newRegistrants: 2,
      returning: 1,
      pulse,
      now,
      registrationUrl: 'https://portal-gem.vercel.app/f/camp-2026',
    })

    expect(text).toContain('Camp Meeting 2026 — Light')
    expect(text).toContain('*Today:* 2 registrations')
    expect(text).toContain('• New (first-timers): 1')
    expect(text).toContain('• Returning: 1')
    expect(text).toContain('*Season total:* 3')
    expect(text).toContain('Not registered yet?')
    expect(text).toContain('Register here:')
    expect(text).toContain('https://portal-gem.vercel.app/f/camp-2026')
    expect(buildCampDailySummaryWhatsAppUrl({
      year: 2026,
      total: 3,
      newRegistrants: 2,
      returning: 1,
      pulse,
      now,
      registrationUrl: 'https://portal-gem.vercel.app/f/camp-2026',
    })).toContain('wa.me/?text=')
  })

  it('omits the registration CTA when no link is provided', () => {
    const now = new Date('2026-09-09T12:00:00.000Z')
    const pulse = buildLiveRegistrationPulse([], now)
    const text = buildCampDailySummaryText({
      year: 2026,
      total: 0,
      newRegistrants: 0,
      returning: 0,
      pulse,
      now,
    })
    expect(text).not.toContain('Register here:')
  })
})
