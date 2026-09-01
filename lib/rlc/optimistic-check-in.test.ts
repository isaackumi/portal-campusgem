import { describe, expect, test } from 'bun:test'
import {
  buildOptimisticAttendanceRecord,
  removeOptimisticAttendanceForPerson,
  upsertAttendanceRecord,
} from '@/lib/rlc/optimistic-check-in'
import { defaultRlcServiceSelection } from '@/lib/rlc/service-selection'
import type { Attendance } from '@/lib/types'

describe('rlc optimistic check-in', () => {
  const person = {
    key: 'v:2',
    kind: 'visitor' as const,
    visitorId: '2',
    name: 'Kofi Boateng',
    phone: '0555987654',
  }

  test('builds optimistic present record for the active service', () => {
    const row = buildOptimisticAttendanceRecord({
      person,
      serviceDate: '2026-09-01',
      selection: defaultRlcServiceSelection(),
      method: 'admin',
      createdBy: 'user1',
    })
    expect(row.id.startsWith('optimistic:')).toBe(true)
    expect(row.visitor_id).toBe('2')
    expect(row.service_date).toBe('2026-09-01')
    expect(row.service_type).toBe('sunday_service')
    expect(row.status).toBe('present')
  })

  test('upsert replaces prior optimistic and server rows for the same person', () => {
    const optimistic = buildOptimisticAttendanceRecord({
      person,
      serviceDate: '2026-09-01',
      selection: defaultRlcServiceSelection(),
      method: 'admin',
      createdBy: 'user1',
    })
    const server = {
      ...optimistic,
      id: 'server-id',
      metadata: {},
    } as Attendance

    const merged = upsertAttendanceRecord([optimistic], server)
    expect(merged).toHaveLength(1)
    expect(merged[0]?.id).toBe('server-id')
  })

  test('rollback removes only optimistic rows for that person', () => {
    const optimistic = buildOptimisticAttendanceRecord({
      person,
      serviceDate: '2026-09-01',
      selection: defaultRlcServiceSelection(),
      method: 'admin',
      createdBy: 'user1',
    })
    const server = {
      id: 'server-id',
      visitor_id: '2',
      service_date: '2026-09-01',
      check_in_time: '2026-09-01T09:00:00.000Z',
      method: 'admin',
      metadata: {},
      created_at: '2026-09-01T09:00:00.000Z',
      status: 'present',
    } as Attendance

    const rolledBack = removeOptimisticAttendanceForPerson([optimistic, server], person)
    expect(rolledBack).toEqual([server])
  })
})
