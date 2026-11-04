import { describe, expect, it } from 'vitest'
import {
  buildCallListSms,
  distributeEvenly,
  isOpenCall,
  progressByCaller,
  summarizeCallCampaign,
} from './call-campaign'
import { registrationsPerDay, summarizeRoomAllocation } from './room-allocation'

describe('distributeEvenly', () => {
  it('splits round-robin when nobody has a list yet', () => {
    const out = distributeEvenly(['a', 'b', 'c', 'd', 'e'], ['x', 'y'])
    expect(out.filter((a) => a.assigned_to === 'x')).toHaveLength(3)
    expect(out.filter((a) => a.assigned_to === 'y')).toHaveLength(2)
  })

  it('tops up the caller with the lightest existing load first', () => {
    const out = distributeEvenly(['a', 'b', 'c'], ['x', 'y'], new Map([['x', 4], ['y', 1]]))
    expect(out.map((a) => a.assigned_to)).toEqual(['y', 'y', 'y'])
  })

  it('returns nothing without callers', () => {
    expect(distributeEvenly(['a'], [])).toEqual([])
  })
})

describe('call outcomes', () => {
  it('treats confirmed, declined, cancelled and checked-in as closed', () => {
    expect(isOpenCall({ attendance_confirmation: 'confirmed', status: 'registered' })).toBe(false)
    expect(isOpenCall({ attendance_confirmation: 'declined', status: 'registered' })).toBe(false)
    expect(isOpenCall({ attendance_confirmation: 'maybe', status: 'cancelled' })).toBe(false)
    expect(isOpenCall({ attendance_confirmation: undefined, status: 'checked_in' })).toBe(false)
    expect(isOpenCall({ attendance_confirmation: 'unreachable', status: 'registered' })).toBe(true)
    expect(isOpenCall({ attendance_confirmation: undefined, status: 'registered' })).toBe(true)
  })

  it('summarizes a campaign and per-caller progress', () => {
    const regs = [
      { attendance_confirmation: 'confirmed', status: 'registered', assigned_to: 'x', call_attempts: 1 },
      { attendance_confirmation: 'declined', status: 'registered', assigned_to: 'x', call_attempts: 2 },
      { attendance_confirmation: 'maybe', status: 'registered', assigned_to: 'y', call_attempts: 1 },
      { attendance_confirmation: undefined, status: 'registered', assigned_to: undefined, call_attempts: 0 },
      { attendance_confirmation: undefined, status: 'checked_in', assigned_to: undefined, call_attempts: 0 },
      { attendance_confirmation: undefined, status: 'cancelled', assigned_to: 'y', call_attempts: 0 },
    ] as const
    const s = summarizeCallCampaign(regs)
    expect(s.total).toBe(5)
    expect(s.assigned).toBe(3)
    expect(s.unassigned).toBe(2)
    expect(s.open).toBe(2)
    expect(s.expected).toBe(2)
    expect(s.byOutcome.confirmed).toBe(1)
    const byCaller = progressByCaller(regs)
    expect(byCaller.get('x')).toMatchObject({ total: 2, open: 0, confirmed: 1, declined: 1 })
    expect(byCaller.get('y')).toMatchObject({ total: 1, open: 1 })
  })
})

describe('buildCallListSms', () => {
  it('fits a short list into one message with the link', () => {
    const [msg, ...rest] = buildCallListSms({
      callerName: 'Kofi Mensah',
      campYear: 2026,
      entries: [{ name: 'Ama Owusu', phone: '0241234567' }],
      link: 'https://x.test/calls',
    })
    expect(rest).toHaveLength(0)
    expect(msg).toContain('Hi Kofi')
    expect(msg).toContain('1. Ama Owusu 0241234567')
    expect(msg).toContain('https://x.test/calls')
  })

  it('splits long lists into numbered parts under the limit', () => {
    const entries = Array.from({ length: 30 }, (_, i) => ({ name: `Person Number ${i + 1}`, phone: '0241234567' }))
    const parts = buildCallListSms({ callerName: 'Esi', entries, link: 'https://x.test/calls', maxChars: 300 })
    expect(parts.length).toBeGreaterThan(1)
    parts.forEach((p, i) => {
      expect(p.length).toBeLessThanOrEqual(300)
      expect(p.startsWith(`(${i + 1}/${parts.length})`)).toBe(true)
    })
    const joined = parts.join('\n')
    entries.forEach((e, i) => expect(joined).toContain(`${i + 1}. ${e.name}`))
    expect(parts[parts.length - 1]).toContain('https://x.test/calls')
  })
})

describe('summarizeRoomAllocation', () => {
  it('counts beds, waiting people and shortfall by gender', () => {
    const rooms = [
      { id: 'r1', capacity: 2, gender: 'Female' as const },
      { id: 'r2', capacity: 1, gender: 'Male' as const },
    ]
    const regs = [
      { id: 'a', room_id: 'r1', sex: 'Female' as const, status: 'registered' as const },
      { id: 'b', room_id: 'r1', sex: 'Female' as const, status: 'registered' as const },
      { id: 'c', room_id: undefined, sex: 'Female' as const, status: 'registered' as const },
      { id: 'd', room_id: undefined, sex: 'Male' as const, status: 'registered' as const },
      { id: 'e', room_id: undefined, sex: 'Male' as const, status: 'cancelled' as const },
    ]
    const s = summarizeRoomAllocation(regs, rooms)
    expect(s.capacity).toBe(3)
    expect(s.occupied).toBe(2)
    expect(s.fullRooms).toBe(1)
    expect(s.unassigned).toBe(2)
    expect(s.freeBeds).toBe(1)
    expect(s.shortfall).toBe(1)
    expect(s.buckets.find((b) => b.key === 'Female')).toMatchObject({ capacity: 2, occupied: 2, waiting: 1 })
  })
})

describe('registrationsPerDay', () => {
  it('fills empty days with zero', () => {
    const now = new Date(2026, 9, 10, 12)
    const out = registrationsPerDay(
      [{ created_at: new Date(2026, 9, 10, 9).toISOString() }, { created_at: new Date(2026, 9, 8, 9).toISOString() }],
      3,
      now
    )
    expect(out.map((d) => d.count)).toEqual([1, 0, 1])
  })
})
