import { describe, expect, test } from 'bun:test'
import {
  MAX_GUESTS,
  canAcceptYes,
  capacityLeft,
  clampGuests,
  eventLinkUrl,
  formatEventShort,
  isRsvpTokenFormat,
  localInputToMs,
  maxGuestsAllowed,
  msToLocalInput,
  needsSend,
  newRsvpToken,
  rsvpClosedReason,
  sampleEventLinkUrl,
  tallyRsvps,
  validateEventInput,
} from './rsvp'

describe('tally', () => {
  test('counts responses and headcount with guests', () => {
    const t = tallyRsvps([
      { response: 'yes', guests: 2, invited_at: 1 },
      { response: 'yes', invited_at: 1 },
      { response: 'no', invited_at: 1 },
      { response: 'maybe' },
      { invited_at: 1 },
      {},
    ])
    expect(t).toEqual({ yes: 2, headcount: 4, guests: 2, no: 1, maybe: 1, noReply: 2, invited: 4, total: 6 })
  })

  test('guests clamp', () => {
    expect(clampGuests(-1)).toBe(0)
    expect(clampGuests('3')).toBe(3)
    expect(clampGuests(99)).toBe(MAX_GUESTS)
    expect(clampGuests(NaN)).toBe(0)
  })
})

describe('capacity', () => {
  test('left', () => {
    expect(capacityLeft(undefined, 10)).toBeNull()
    expect(capacityLeft(10, 4)).toBe(6)
    expect(capacityLeft(10, 12)).toBe(0)
  })
  test('accept yes', () => {
    expect(canAcceptYes(null, 100, 3)).toBe(true)
    expect(canAcceptYes(10, 9, 0)).toBe(true)
    expect(canAcceptYes(10, 9, 1)).toBe(false)
    expect(canAcceptYes(10, 10, 0)).toBe(false)
  })
  test('max guests', () => {
    expect(maxGuestsAllowed(null, 0)).toBe(MAX_GUESTS)
    expect(maxGuestsAllowed(10, 6)).toBe(3)
    expect(maxGuestsAllowed(10, 10)).toBe(0)
    expect(maxGuestsAllowed(100, 0)).toBe(MAX_GUESTS)
  })
})

describe('open / closed', () => {
  const base = { starts_at: 1000, status: 'published' as const }
  test('open before start', () => expect(rsvpClosedReason(base, 999)).toBeNull())
  test('closed at start', () => expect(rsvpClosedReason(base, 1000)).toBe('closed'))
  test('closes at deadline', () => expect(rsvpClosedReason({ ...base, rsvp_closes_at: 500 }, 600)).toBe('closed'))
  test('cancelled and draft', () => {
    expect(rsvpClosedReason({ ...base, status: 'cancelled' }, 0)).toBe('cancelled')
    expect(rsvpClosedReason({ ...base, status: 'draft' }, 0)).toBe('draft')
  })
})

describe('sending', () => {
  test('new only goes to uninvited', () => {
    expect(needsSend({}, 'new')).toBe(true)
    expect(needsSend({ invited_at: 1 }, 'new')).toBe(false)
  })
  test('reminder only goes to invited non-responders', () => {
    expect(needsSend({ invited_at: 1 }, 'reminder')).toBe(true)
    expect(needsSend({ invited_at: 1, response: 'maybe' }, 'reminder')).toBe(false)
    expect(needsSend({}, 'reminder')).toBe(false)
  })
})

describe('tokens and links', () => {
  test('token format', () => {
    const t = newRsvpToken()
    expect(t).toHaveLength(22)
    expect(isRsvpTokenFormat(t)).toBe(true)
    expect(isRsvpTokenFormat('short')).toBe(false)
    expect(isRsvpTokenFormat('../../etc/passwd/aaaaaaaaaaa')).toBe(false)
  })
  test('links', () => {
    expect(eventLinkUrl('https://x.org/', 'abc')).toBe('https://x.org/e/abc')
    expect(sampleEventLinkUrl('https://x.org')).toHaveLength('https://x.org/e/'.length + 22)
  })
})

describe('dates', () => {
  test('datetime-local round trip (Ghana = UTC)', () => {
    const ms = localInputToMs('2026-11-14T16:00')!
    expect(ms).toBe(Date.UTC(2026, 10, 14, 16, 0))
    expect(msToLocalInput(ms)).toBe('2026-11-14T16:00')
    expect(localInputToMs('nope')).toBeNull()
  })
  test('short format', () => {
    expect(formatEventShort(Date.UTC(2026, 10, 14, 16, 0))).toBe('Sat 14 Nov, 4:00 pm')
  })
})

describe('validateEventInput', () => {
  const ok = { title: ' Youth  night ', starts_at: 2000, audience: 'all' as const, status: 'draft' as const }
  test('cleans', () => {
    const r = validateEventInput(ok)
    expect(r.ok && r.value.title).toBe('Youth night')
  })
  test('errors', () => {
    expect(validateEventInput({ ...ok, title: '' }).ok).toBe(false)
    expect(validateEventInput({ ...ok, ends_at: 1000 }).ok).toBe(false)
    expect(validateEventInput({ ...ok, rsvp_closes_at: 3000 }).ok).toBe(false)
    expect(validateEventInput({ ...ok, capacity: 0 }).ok).toBe(false)
    expect(validateEventInput({ ...ok, audience: 'group' }).ok).toBe(false)
  })
  test('group keeps group id, others drop it', () => {
    const g = validateEventInput({ ...ok, audience: 'group', group_id: 'g1' })
    expect(g.ok && g.value.group_id).toBe('g1')
    const a = validateEventInput({ ...ok, group_id: 'g1' })
    expect(a.ok && a.value.group_id).toBeUndefined()
  })
})
