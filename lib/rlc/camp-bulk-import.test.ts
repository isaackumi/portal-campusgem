import { describe, expect, test } from 'bun:test'
import type { CampRegistration, Member, Visitor } from '@/lib/types'
import {
  buildCampBulkImportCandidates,
  classifyCampRegistrationForRlc,
  filterCampBulkImportCandidates,
} from '@/lib/rlc/camp-bulk-import'

describe('camp bulk import to RLC', () => {
  const registration: CampRegistration = {
    id: 'reg-1',
    camp_year_id: 'year-1',
    full_name: 'Jane Doe',
    phone: '+233241234567',
    email: 'jane@example.com',
    role: 'Participant',
    is_new_registrant: true,
    status: 'registered',
    qr_code: 'qr',
    created_at: '',
    updated_at: '',
  }

  test('marks registration available when not in RLC', () => {
    expect(classifyCampRegistrationForRlc(registration, [], []).status).toBe('available')
  })

  test('detects existing RLC visitor by phone', () => {
    const visitors = [
      {
        id: 'v1',
        first_name: 'Jane',
        last_name: 'Doe',
        phone: '0241234567',
        visit_date: '2026-01-01',
        follow_up_completed: false,
        converted_to_member: false,
        is_active: true,
        congregation: 'rlc',
        created_at: '',
        updated_at: '',
      },
    ] as Visitor[]

    expect(classifyCampRegistrationForRlc(registration, visitors, []).status).toBe('rlc_visitor')
  })

  test('filters to available rows by default', () => {
    const members = [
      {
        id: 'm1',
        user_id: 'u1',
        status: 'active',
        congregation: 'rlc',
        emergency_contacts: [],
        documents: [],
        created_at: '',
        updated_at: '',
        user: {
          id: 'u1',
          full_name: 'Jane Doe',
          phone: '0241234567',
          email: '',
          role: 'member',
          membership_id: 'CG-1',
          created_at: '',
          updated_at: '',
        },
      },
    ] as Member[]

    const rows = buildCampBulkImportCandidates([registration], [], members)
    const filtered = filterCampBulkImportCandidates(rows, { onlyAvailable: true })
    expect(filtered).toHaveLength(0)
  })
})
