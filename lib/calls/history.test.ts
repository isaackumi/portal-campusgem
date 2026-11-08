import { describe, expect, test } from 'bun:test'
import { callerStats, callSeconds, callsCsv, groupCalls, sessionOf, type CallRow, type CallSessionInfo } from './history'

const MIN = 60_000
const T0 = Date.UTC(2026, 10, 6, 18, 0)

function row(over: Partial<CallRow>): CallRow {
  return {
    id: Math.random().toString(36).slice(2),
    registration_id: 'r1',
    name: 'Ama',
    phone: '0244000000',
    caller_id: 'u1',
    kind: 'call',
    outcome: 'confirmed',
    note: null,
    at: T0,
    session_id: null,
    started_at: null,
    ...over,
  }
}

const session: CallSessionInfo = { id: 's1', title: 'Thursday calls', started_at: T0, ended_at: T0 + 120 * MIN, status: 'ended', people: ['u1', 'u2'] }

describe('sessionOf', () => {
  test('uses the saved session', () => {
    expect(sessionOf(row({ session_id: 's1', at: T0 + 500 * MIN }), [session])).toBe('s1')
  })
  test('older calls: running session the caller joined', () => {
    expect(sessionOf(row({ at: T0 + 30 * MIN }), [session])).toBe('s1')
    expect(sessionOf(row({ at: T0 + 30 * MIN, caller_id: 'u9' }), [session])).toBeNull()
    expect(sessionOf(row({ at: T0 + 300 * MIN }), [session])).toBeNull()
  })
  test('answers by link belong to no session', () => {
    expect(sessionOf(row({ caller_id: null, kind: 'link', at: T0 + 5 * MIN }), [session])).toBeNull()
  })
})

describe('callSeconds', () => {
  test('known, unknown and implausible', () => {
    expect(callSeconds({ at: T0 + 90_000, started_at: T0 })).toBe(90)
    expect(callSeconds({ at: T0, started_at: null })).toBeNull()
    expect(callSeconds({ at: T0 + 2 * 3600_000, started_at: T0 })).toBeNull()
  })
})

describe('groupCalls', () => {
  test('session group and day group, newest first', () => {
    const rows = [
      row({ at: T0 + 10 * MIN }),
      row({ at: T0 + 20 * MIN, caller_id: 'u2', outcome: 'unreachable' }),
      row({ at: T0 - 24 * 60 * MIN, outcome: 'maybe' }),
    ]
    const groups = groupCalls(rows, [session], T0 + 999 * MIN)
    expect(groups.map((g) => g.kind)).toEqual(['session', 'day'])
    expect(groups[0]!.rows.map((r) => r.at)).toEqual([T0 + 20 * MIN, T0 + 10 * MIN])
    expect(groups[0]!.callerIds.sort()).toEqual(['u1', 'u2'])
    expect(groups[0]!.counts.confirmed).toBe(1)
    expect(groups[0]!.counts.unreachable).toBe(1)
  })
})

describe('callerStats', () => {
  test('counts calls, reach, pace and time per person', () => {
    const rows = [
      row({ at: T0 + 2 * MIN, started_at: T0, registration_id: 'a' }),
      row({ at: T0 + 6 * MIN, started_at: T0 + 2 * MIN, registration_id: 'b', outcome: 'unreachable' }),
      row({ at: T0 + 10 * MIN, started_at: T0 + 6 * MIN, registration_id: 'c', outcome: 'declined' }),
      row({ at: T0 + 11 * MIN, registration_id: 'b', kind: 'change', outcome: 'maybe' }),
      row({ caller_id: null, kind: 'link', registration_id: 'd' }),
      row({ caller_id: 'u2', at: T0 + 5 * MIN }),
    ]
    const [u1, u2] = callerStats(rows, [session], T0 + 999 * MIN)
    expect(u1!.caller_id).toBe('u1')
    expect(u1!.calls).toBe(3)
    expect(u1!.reached).toBe(2)
    expect(u1!.reachRate).toBeCloseTo(2 / 3)
    expect(u1!.avgSeconds).toBe(200)
    expect(u1!.paceMinutes).toBe(4)
    expect(u1!.sessions).toBe(1)
    expect(u2!.calls).toBe(1)
  })
})

describe('callsCsv', () => {
  test('quotes and orders oldest first', () => {
    const csv = callsCsv(
      [row({ at: T0 + MIN, note: 'Said "yes", will come' }), row({ at: T0, name: 'Kofi' })],
      () => 'Esi',
      () => 'Thursday calls'
    )
    const lines = csv.split('\n')
    expect(lines[0]).toStartWith('Date,Time,Caller')
    expect(lines[1]).toContain('Kofi')
    expect(lines[2]).toContain('"Said ""yes"", will come"')
  })
})
