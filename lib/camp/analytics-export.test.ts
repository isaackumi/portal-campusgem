import { describe, expect, it } from 'bun:test'
import { buildCampAnalyticsCsv, campAnalyticsExportFilename } from '@/lib/camp/analytics-export'
import { buildCampYearAnalyticsReport } from '@/lib/camp/analytics'
import type { CampRegistration, CampYear } from '@/lib/types'

const year: CampYear = {
  id: 'y1',
  year: 2026,
  theme: 'Light',
  start_date: '2026-08-01',
  end_date: '2026-08-07',
  is_active: true,
  registration_open: true,
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
}

function reg(id: string): CampRegistration {
  return {
    id,
    camp_year_id: 'y1',
    full_name: 'Test',
    email: 't@example.com',
    phone: '0244123456',
    sex: 'Male',
    age_bracket: '13-19',
    role: 'Participant',
    is_new_registrant: true,
    status: 'registered',
    qr_code: 'qr',
    created_at: '2026-05-01T10:00:00Z',
    updated_at: '2026-05-01T10:00:00Z',
  }
}

describe('camp analytics export', () => {
  it('builds csv with summary and demographics', () => {
    const report = buildCampYearAnalyticsReport(year, [reg('1')])
    const csv = buildCampAnalyticsCsv(report)
    expect(csv).toContain('Summary')
    expect(csv).toContain('Camp year,2026')
    expect(csv).toContain('Gender')
  })

  it('names export file by year', () => {
    const report = buildCampYearAnalyticsReport(year, [])
    expect(campAnalyticsExportFilename(report)).toMatch(/camp-analytics-2026/)
  })
})
