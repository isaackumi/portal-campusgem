import { describe, expect, it } from 'bun:test'
import {
  buildCampMultiYearAnalyticsReport,
  buildCampYearAnalyticsReport,
  normalizeEducationBand,
  normalizePhoneKey,
  normalizeResidenceLabel,
} from '@/lib/camp/analytics'
import type { CampRegistration, CampYear } from '@/lib/types'

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

const year2025: CampYear = {
  id: 'year-2025',
  year: 2025,
  theme: 'Fire',
  start_date: '2025-08-01',
  end_date: '2025-08-07',
  is_active: false,
  registration_open: false,
  created_at: '2025-01-01',
  updated_at: '2025-01-01',
}

const year2026: CampYear = {
  id: 'year-2026',
  year: 2026,
  theme: 'Light',
  start_date: '2026-08-01',
  end_date: '2026-08-07',
  is_active: true,
  registration_open: true,
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
}

describe('camp analytics normalization', () => {
  it('normalizes Ghana phone keys to last 9 digits', () => {
    expect(normalizePhoneKey('+233244123456')).toBe('244123456')
    expect(normalizePhoneKey('0244123456')).toBe('244123456')
  })

  it('maps common residence aliases to regions', () => {
    expect(normalizeResidenceLabel('Tema, Greater Accra')).toBe('Greater Accra')
    expect(normalizeResidenceLabel('kumasi')).toBe('Ashanti')
  })

  it('bands education levels', () => {
    expect(normalizeEducationBand('SHS 2')).toBe('SHS')
    expect(normalizeEducationBand('LEVEL 200')).toBe('University / Tertiary')
  })
})

describe('camp year analytics report', () => {
  it('builds overview and insights for a single year', () => {
    const regs = [
      makeReg({
        id: '1',
        camp_year_id: 'year-2026',
        sex: 'Female',
        age_bracket: '13-19',
        residence: 'Tema, Greater Accra',
        education_level: 'SHS 2',
        is_new_registrant: true,
        status: 'checked_in',
        payment_status: 'paid',
        payment_amount: 30,
      }),
      makeReg({
        id: '2',
        camp_year_id: 'year-2026',
        sex: 'Male',
        age_bracket: '13-19',
        residence: 'Kumasi',
        education_level: 'JHS 3',
        is_new_registrant: false,
        payment_status: 'pending',
        payment_amount: 30,
      }),
    ]

    const report = buildCampYearAnalyticsReport(year2026, regs)
    expect(report.total).toBe(2)
    expect(report.overview.checkedIn).toBe(1)
    expect(report.demographics.ageBracket[0]?.label).toBe('13-19')
    expect(report.insights.length).toBeGreaterThan(0)
  })
})

describe('multi-year analytics report', () => {
  it('detects returning campers across years', () => {
    const phone = '0244999888'
    const regs2025 = [
      makeReg({ id: 'a', camp_year_id: 'year-2025', phone, created_at: '2025-04-01T10:00:00Z' }),
    ]
    const regs2026 = [
      makeReg({ id: 'b', camp_year_id: 'year-2026', phone, is_new_registrant: false, created_at: '2026-04-01T10:00:00Z' }),
      makeReg({ id: 'c', camp_year_id: 'year-2026', phone: '0200111222', created_at: '2026-04-02T10:00:00Z' }),
    ]

    const report = buildCampMultiYearAnalyticsReport([year2026, year2025], {
      'year-2025': regs2025,
      'year-2026': regs2026,
    })

    expect(report.combined.totalRegistrations).toBe(3)
    expect(report.combined.uniqueCampers).toBe(2)
    expect(report.combined.multiYearCampers).toBe(1)
    expect(report.combined.yearComparison).toHaveLength(2)
    expect(report.insights.some((line) => line.includes('unique campers'))).toBe(true)
  })
})
