import { describe, expect, it } from 'bun:test'
import type { CampRegistration } from '@/lib/types'
import { searchCampRegistrationsForManualCheckIn } from '@/lib/camp/manual-check-in-search'

function reg(partial: Partial<CampRegistration> & Pick<CampRegistration, 'id'>): CampRegistration {
  return {
    camp_year_id: 'y1',
    full_name: 'Child One',
    email: ' ',
    phone: '+233241111111',
    role: 'Participant',
    is_new_registrant: true,
    status: 'registered',
    qr_code: '{}',
    created_at: '',
    updated_at: '',
    ...partial,
  } as CampRegistration
}

describe('searchCampRegistrationsForManualCheckIn', () => {
  const list = [
    reg({ id: '1', full_name: 'Child One', phone: '+233241111111', parent_contact: '+233242222222' }),
    reg({ id: '2', full_name: 'Child Two', phone: '+233243333333', parent_contact: '+233242222222' }),
    reg({ id: '3', full_name: 'Adult Self', phone: '+233244444444' }),
  ]

  it('finds all registrations sharing guardian phone', () => {
    const { results, mode } = searchCampRegistrationsForManualCheckIn(list, '0242222222')
    expect(mode).toBe('phone')
    expect(results.map((r) => r.id).sort()).toEqual(['1', '2'])
  })

  it('finds by camper name', () => {
    const { results } = searchCampRegistrationsForManualCheckIn(list, 'Adult')
    expect(results).toHaveLength(1)
    expect(results[0]?.id).toBe('3')
  })
})
