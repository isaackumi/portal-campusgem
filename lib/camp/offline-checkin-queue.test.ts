import { describe, expect, it } from 'bun:test'
import {
  CAMP_OFFLINE_MAX_AGE_MS,
  CAMP_OFFLINE_QUEUE_KEY,
  applySyncResults,
  clampOfflineCheckInTime,
  createQueuedCheckIn,
  enqueueCheckIn,
  fromLookupRegistration,
  isNetworkError,
  isPermanentCheckInError,
  loadQueue,
  nextSyncBatch,
  parseQueue,
  pendingItems,
  queuedRegistrationIds,
  saveQueue,
  toLookupRegistration,
  type QueuedCampCheckIn,
} from '@/lib/camp/offline-checkin-queue'
import type { CampRegistration } from '@/lib/types'

function item(overrides: Partial<QueuedCampCheckIn> = {}): QueuedCampCheckIn {
  return createQueuedCheckIn(
    {
      registration_id: 'reg1',
      activity_id: 'act1',
      check_in_method: 'qr',
      client_uuid: overrides.client_uuid ?? `uuid-${Math.random()}`,
      ...overrides,
    },
    overrides.checked_in_at ?? 1_000
  )
}

function memoryStorage() {
  const m = new Map<string, string>()
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    map: m,
  }
}

describe('enqueueCheckIn', () => {
  it('adds a new item as pending', () => {
    const { queue, added } = enqueueCheckIn([], item())
    expect(added).toBe(true)
    expect(queue).toHaveLength(1)
    expect(queue[0].status).toBe('pending')
    expect(queue[0].attempts).toBe(0)
  })

  it('does not queue the same camper twice for one session', () => {
    const first = enqueueCheckIn([], item({ client_uuid: 'a' })).queue
    const second = enqueueCheckIn(first, item({ client_uuid: 'b' }))
    expect(second.added).toBe(false)
    expect(second.queue).toHaveLength(1)
    expect(second.existing?.client_uuid).toBe('a')
  })

  it('queues the same camper for a different session', () => {
    const first = enqueueCheckIn([], item()).queue
    const second = enqueueCheckIn(first, item({ activity_id: 'act2' }))
    expect(second.added).toBe(true)
    expect(second.queue).toHaveLength(2)
  })

  it('revives a failed item instead of duplicating it', () => {
    const failed = { ...item({ client_uuid: 'a' }), status: 'failed' as const, attempts: 3, last_error: 'x' }
    const { queue, added } = enqueueCheckIn([failed], item({ client_uuid: 'b' }))
    expect(added).toBe(false)
    expect(queue).toHaveLength(1)
    expect(queue[0]).toMatchObject({ client_uuid: 'a', status: 'pending', attempts: 0 })
  })
})

describe('nextSyncBatch', () => {
  it('sends pending items oldest first, up to the limit, without display fields', () => {
    const q = [
      item({ client_uuid: 'late', checked_in_at: 3_000, registration_id: 'r3', name: 'Ama' }),
      item({ client_uuid: 'early', checked_in_at: 1_000, registration_id: 'r1' }),
      { ...item({ client_uuid: 'bad', registration_id: 'r2' }), status: 'failed' as const },
    ]
    const batch = nextSyncBatch(q, 1)
    expect(batch).toEqual([
      { client_uuid: 'early', registration_id: 'r1', activity_id: 'act1', check_in_method: 'qr', checked_in_at: 1_000 },
    ])
    expect(nextSyncBatch(q).map((b) => b.client_uuid)).toEqual(['early', 'late'])
  })
})

describe('applySyncResults', () => {
  const q = [item({ client_uuid: 'a', registration_id: 'r1' }), item({ client_uuid: 'b', registration_id: 'r2' }), item({ client_uuid: 'c', registration_id: 'r3' }), item({ client_uuid: 'd', registration_id: 'r4' })]

  it('drops synced items, keeps retryable ones pending and marks permanent failures', () => {
    const { queue, synced, failed } = applySyncResults(q, [
      { client_uuid: 'a', ok: true, already_checked_in: false },
      { client_uuid: 'b', ok: true, already_checked_in: true },
      { client_uuid: 'c', ok: false, error: 'fetch failed', retryable: true },
      { client_uuid: 'd', ok: false, error: 'Registration not found.', retryable: false },
    ])
    expect(synced).toBe(2)
    expect(failed).toBe(1)
    expect(queue.map((x) => [x.client_uuid, x.status, x.attempts])).toEqual([
      ['c', 'pending', 1],
      ['d', 'failed', 1],
    ])
    expect(pendingItems(queue).map((x) => x.client_uuid)).toEqual(['c'])
  })

  it('leaves items without a result untouched', () => {
    expect(applySyncResults(q, []).queue).toEqual(q)
  })
})

describe('queuedRegistrationIds', () => {
  it('lists queued campers for one session', () => {
    const q = [item({ registration_id: 'r1' }), item({ registration_id: 'r2', activity_id: 'other' })]
    expect([...queuedRegistrationIds(q, 'act1')]).toEqual(['r1'])
  })
})

describe('isNetworkError', () => {
  it('spots browser and server fetch failures', () => {
    expect(isNetworkError(new TypeError('Failed to fetch'))).toBe(true)
    expect(isNetworkError(new TypeError('Load failed'))).toBe(true)
    expect(isNetworkError('fetch failed')).toBe(true)
    expect(isNetworkError(new Error('NetworkError when attempting to fetch resource.'))).toBe(true)
  })

  it('treats anything as a network error when offline', () => {
    expect(isNetworkError(new Error('whatever'), false)).toBe(true)
  })

  it('does not treat data errors as network errors', () => {
    expect(isNetworkError(new Error('Registration not found.'))).toBe(false)
    expect(isNetworkError(undefined)).toBe(false)
  })
})

describe('isPermanentCheckInError', () => {
  it('flags data problems only', () => {
    expect(isPermanentCheckInError('Session not found. Choose a valid camp session.')).toBe(true)
    expect(isPermanentCheckInError('This camper is not registered for this camp year.')).toBe(true)
    expect(isPermanentCheckInError('fetch failed')).toBe(false)
  })
})

describe('clampOfflineCheckInTime', () => {
  const now = 10 * CAMP_OFFLINE_MAX_AGE_MS
  it('keeps recent times, clamps future and very old ones', () => {
    expect(clampOfflineCheckInTime(now - 1_000, now)).toBe(now - 1_000)
    expect(clampOfflineCheckInTime(now + 60_000, now)).toBe(now)
    expect(clampOfflineCheckInTime(0, now)).toBe(now - CAMP_OFFLINE_MAX_AGE_MS)
    expect(clampOfflineCheckInTime(undefined, now)).toBe(now)
    expect(clampOfflineCheckInTime(Number.NaN, now)).toBe(now)
  })
})

describe('storage', () => {
  it('round-trips and clears the key when empty', () => {
    const s = memoryStorage()
    const q = [item({ client_uuid: 'a' })]
    saveQueue(s, q)
    expect(loadQueue(s)).toEqual(q)
    saveQueue(s, [])
    expect(s.map.has(CAMP_OFFLINE_QUEUE_KEY)).toBe(false)
  })

  it('survives junk', () => {
    expect(parseQueue('not json')).toEqual([])
    expect(parseQueue('{"a":1}')).toEqual([])
    expect(parseQueue('[{"client_uuid":1},null]')).toEqual([])
    expect(loadQueue(null)).toEqual([])
  })
})

describe('lookup cache rows', () => {
  it('keep what scan and search need, with the resolved desk code', () => {
    const reg = {
      id: 'r1',
      camp_year_id: 'y1',
      full_name: 'Ama Mensah',
      email: 'ama@example.com',
      phone: '0241234567',
      role: 'Camper',
      is_new_registrant: true,
      status: 'registered',
      check_in_code: 'gem-26-k7m3',
      health_challenges: ['private'],
    } as unknown as CampRegistration
    const row = toLookupRegistration(reg)
    expect(row).not.toHaveProperty('email')
    expect(row).not.toHaveProperty('health_challenges')
    expect(row.check_in_code).toBe('GEM-26-K7M3')
    expect(fromLookupRegistration(row)).toMatchObject({ id: 'r1', phone: '0241234567', email: '' })
  })
})
