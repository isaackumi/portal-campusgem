import { describe, expect, it } from 'vitest'
import { matchesSegment, NO_ANSWER_COOLDOWN_MS, orderQueue, remainingFor, tallySession } from './queue'

const NOW = Date.UTC(2026, 6, 1, 12)
const ago = (ms: number) => new Date(NOW - ms).toISOString()

function reg(id: string, over: Record<string, unknown> = {}) {
  return {
    id,
    full_name: id,
    status: 'registered' as const,
    is_new_registrant: false,
    attendance_confirmation: undefined,
    call_attempts: 0,
    last_called_at: undefined,
    ...over,
  }
}

describe('calling queue', () => {
  it('calls the never-called first, then fewest attempts, then longest since the last call', () => {
    const regs = [
      reg('b', { call_attempts: 2, last_called_at: ago(5 * 3600_000), attendance_confirmation: 'maybe' }),
      reg('a'),
      reg('c', { call_attempts: 1, last_called_at: ago(2 * 3600_000), attendance_confirmation: 'maybe' }),
      reg('d', { call_attempts: 1, last_called_at: ago(9 * 3600_000), attendance_confirmation: 'maybe' }),
    ]
    expect(orderQueue(regs, { now: NOW })).toEqual(['a', 'd', 'c', 'b'])
  })

  it('leaves out the settled, the cancelled and those already at camp', () => {
    const regs = [
      reg('yes', { attendance_confirmation: 'confirmed' }),
      reg('no', { attendance_confirmation: 'declined' }),
      reg('gone', { status: 'cancelled' }),
      reg('here', { status: 'checked_in' }),
      reg('open'),
    ]
    expect(orderQueue(regs, { now: NOW })).toEqual(['open'])
  })

  it('rests someone who did not answer for a while, so the room spreads its calls', () => {
    const regs = [
      reg('just-tried', { attendance_confirmation: 'unreachable', call_attempts: 1, last_called_at: ago(10 * 60_000) }),
      reg('tried-earlier', { attendance_confirmation: 'unreachable', call_attempts: 1, last_called_at: ago(NO_ANSWER_COOLDOWN_MS + 60_000) }),
    ]
    expect(orderQueue(regs, { now: NOW })).toEqual(['tried-earlier'])
    // Still counted as left to reach.
    expect(remainingFor(regs, 'all')).toBe(2)
  })

  it('puts the ones this caller skipped at the back', () => {
    expect(orderQueue([reg('a'), reg('b'), reg('c')], { now: NOW, skip: ['a'] })).toEqual(['b', 'c', 'a'])
  })

  it('works through new or returning campers only, when asked', () => {
    const regs = [reg('first', { is_new_registrant: true }), reg('back')]
    expect(orderQueue(regs, { now: NOW, segment: 'new' })).toEqual(['first'])
    expect(orderQueue(regs, { now: NOW, segment: 'returning' })).toEqual(['back'])
    expect(matchesSegment({ is_new_registrant: true }, 'all')).toBe(true)
  })
})

describe('session tally', () => {
  it('counts the room and each caller', () => {
    const t = tallySession([
      { caller_id: 'x', outcome: 'confirmed', at: 1 },
      { caller_id: 'x', outcome: 'unreachable', at: 2 },
      { caller_id: 'y', outcome: 'confirmed', at: 3 },
    ])
    expect(t.total).toBe(3)
    expect(t.byOutcome).toEqual({ confirmed: 2, unreachable: 1 })
    expect(t.byCaller.get('x')).toEqual({ total: 2, confirmed: 1 })
  })
})
