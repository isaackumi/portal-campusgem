import { describe, expect, test } from 'bun:test'
import {
  buildRlcPhoneIndex,
  campContactsNotInRlc,
  filterCampBridgeRows,
  isCampContactInRlc,
} from '@/lib/rlc/camp-bridge'
import type { CampCamperDirectoryRow, Member, Visitor } from '@/lib/types'

describe('rlc camp bridge helpers', () => {
  const campRow: CampCamperDirectoryRow = {
    phone_key: '+233244123456',
    full_name: 'Ama Mensah',
    phone: '0244123456',
    years: [{ year_id: 'y1', year: 2025, status: 'registered', registration_id: 'r1' }],
    registration_count: 1,
  }

  test('detects RLC membership via congregation or phone', () => {
    const phones = buildRlcPhoneIndex([], [])
    expect(isCampContactInRlc(campRow, phones)).toBe(false)
    expect(
      isCampContactInRlc({ ...campRow, rlc_congregation: 'rlc' }, phones)
    ).toBe(true)
    const withPhone = buildRlcPhoneIndex(
      [{ id: 'v1', first_name: 'Ama', visit_date: '2026-01-01', phone: '0244123456' } as Visitor],
      []
    )
    expect(isCampContactInRlc(campRow, withPhone)).toBe(true)
  })

  test('filters missing contacts and search/year filters', () => {
    const members = [
      {
        id: 'm1',
        user_id: 'u1',
        user: { id: 'u1', full_name: 'Kofi', phone: '0555111222' },
      } as Member,
    ]
    const rows = [
      campRow,
      { ...campRow, phone_key: 'p2', phone: '0555111222', full_name: 'Kofi Boateng' },
      {
        ...campRow,
        phone_key: 'p3',
        phone: '0200999888',
        full_name: 'Yaw Asare',
        years: [{ year_id: 'y2', year: 2024, status: 'registered', registration_id: 'r2' }],
      },
    ]
    const missing = campContactsNotInRlc(rows, buildRlcPhoneIndex([], members))
    expect(missing.map((r) => r.full_name)).toEqual(['Ama Mensah', 'Yaw Asare'])
    expect(filterCampBridgeRows(missing, { query: 'ama' }).map((r) => r.full_name)).toEqual([
      'Ama Mensah',
    ])
    expect(filterCampBridgeRows(missing, { campYear: '2024' }).map((r) => r.full_name)).toEqual([
      'Yaw Asare',
    ])
  })
})
