/**
 * Offline camp session check-in queue.
 *
 * When the desk phone is offline (or a check-in call fails on the network), the check-in is
 * saved on the phone and synced later. The server records one row per session + camper
 * (`by_activity_registration` in `camp_session_attendances`), so replaying an item is safe:
 * a repeat comes back as "already checked in". `client_uuid` names each queued item so the
 * sync results can be matched back to it.
 *
 * Pure logic plus a tiny Storage (localStorage) adapter. The browser glue lives in
 * `components/camp/use-camp-offline-queue.ts`. Not related to `lib/offline-sync.ts`, which
 * queues general church attendance.
 */
import type { CampRegistration, CampSessionAttendance } from '@/lib/types'
import { resolveCampCheckInCode } from '@/lib/camp/check-in-code'

export const CAMP_OFFLINE_QUEUE_KEY = 'campgem.camp-checkin-queue.v1'
/** Items synced per request. */
export const CAMP_OFFLINE_SYNC_BATCH = 50
/** Server accepts back-dated check-ins this old at most. */
export const CAMP_OFFLINE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

export type CampCheckInMethod = NonNullable<CampSessionAttendance['check_in_method']>

export type QueuedCampCheckIn = {
  client_uuid: string
  registration_id: string
  activity_id: string
  camp_year_id?: string
  check_in_method: CampCheckInMethod
  /** When the usher tapped, in ms. Sent to the server so the record keeps the real time. */
  checked_in_at: number
  /** Display only. */
  name?: string
  attempts: number
  status: 'pending' | 'failed'
  last_error?: string
}

export type CampCheckInSyncItem = Pick<
  QueuedCampCheckIn,
  'client_uuid' | 'registration_id' | 'activity_id' | 'check_in_method' | 'checked_in_at'
>

export type CampCheckInSyncResult =
  | { client_uuid: string; ok: true; already_checked_in: boolean }
  | { client_uuid: string; ok: false; error: string; retryable: boolean }

export function newClientUuid(): string {
  const c = globalThis.crypto
  if (c?.randomUUID) return c.randomUUID()
  const b = c.getRandomValues(new Uint8Array(16))
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
}

export function createQueuedCheckIn(
  input: Omit<QueuedCampCheckIn, 'client_uuid' | 'attempts' | 'status' | 'checked_in_at'> & {
    checked_in_at?: number
    client_uuid?: string
  },
  now: number = Date.now()
): QueuedCampCheckIn {
  return {
    ...input,
    client_uuid: input.client_uuid ?? newClientUuid(),
    checked_in_at: input.checked_in_at ?? now,
    attempts: 0,
    status: 'pending',
  }
}

/** Add an item unless the same camper is already queued for the same session. */
export function enqueueCheckIn(
  queue: readonly QueuedCampCheckIn[],
  item: QueuedCampCheckIn
): { queue: QueuedCampCheckIn[]; added: boolean; existing?: QueuedCampCheckIn } {
  const existing = queue.find(
    (q) => q.activity_id === item.activity_id && q.registration_id === item.registration_id
  )
  if (existing) {
    // A failed one gets another go when the usher checks the camper in again.
    if (existing.status === 'failed') {
      return {
        queue: queue.map((q) =>
          q === existing ? { ...q, status: 'pending', attempts: 0, last_error: undefined } : q
        ),
        added: false,
        existing,
      }
    }
    return { queue: [...queue], added: false, existing }
  }
  return { queue: [...queue, item], added: true }
}

/** Registration ids waiting to sync for one session (count them as present on screen). */
export function queuedRegistrationIds(queue: readonly QueuedCampCheckIn[], activityId: string): Set<string> {
  return new Set(queue.filter((q) => q.activity_id === activityId).map((q) => q.registration_id))
}

export function pendingItems(queue: readonly QueuedCampCheckIn[]): QueuedCampCheckIn[] {
  return queue.filter((q) => q.status === 'pending')
}

export function failedItems(queue: readonly QueuedCampCheckIn[]): QueuedCampCheckIn[] {
  return queue.filter((q) => q.status === 'failed')
}

/** Next batch to send: oldest pending first. */
export function nextSyncBatch(
  queue: readonly QueuedCampCheckIn[],
  limit: number = CAMP_OFFLINE_SYNC_BATCH
): CampCheckInSyncItem[] {
  return pendingItems(queue)
    .sort((a, b) => a.checked_in_at - b.checked_in_at)
    .slice(0, limit)
    .map(({ client_uuid, registration_id, activity_id, check_in_method, checked_in_at }) => ({
      client_uuid,
      registration_id,
      activity_id,
      check_in_method,
      checked_in_at,
    }))
}

/**
 * Fold server results back in: synced items leave the queue, permanent failures stay as
 * `failed` (visible, not retried), retryable ones stay pending with one more attempt.
 */
export function applySyncResults(
  queue: readonly QueuedCampCheckIn[],
  results: readonly CampCheckInSyncResult[]
): { queue: QueuedCampCheckIn[]; synced: number; failed: number } {
  const byId = new Map(results.map((r) => [r.client_uuid, r]))
  let synced = 0
  let failed = 0
  const next: QueuedCampCheckIn[] = []
  for (const item of queue) {
    const r = byId.get(item.client_uuid)
    if (!r) {
      next.push(item)
    } else if (r.ok) {
      synced++
    } else if (r.retryable) {
      next.push({ ...item, attempts: item.attempts + 1, last_error: r.error })
    } else {
      failed++
      next.push({ ...item, status: 'failed', attempts: item.attempts + 1, last_error: r.error })
    }
  }
  return { queue: next, synced, failed }
}

const NETWORK_PATTERNS = [
  /failed to fetch/i,
  /networkerror/i,
  /network request failed/i,
  /load failed/i,
  /fetch failed/i,
  /network error/i,
  /internet connection/i,
  /econnrefused|econnreset|enotfound|etimedout|eai_again/i,
  /timed? ?out/i,
]

/** True for "couldn't reach the server" failures, which are worth queueing and retrying. */
export function isNetworkError(error: unknown, online: boolean = true): boolean {
  if (!online) return true
  const message =
    typeof error === 'string' ? error : error instanceof Error ? `${error.name}: ${error.message}` : ''
  if (!message) return false
  return NETWORK_PATTERNS.some((p) => p.test(message))
}

/** Server-side: data problems (camper or session gone) are not worth retrying. */
export function isPermanentCheckInError(message: string): boolean {
  return /not found|not registered|invalid|permission|validator|does not match/i.test(message)
}

/** Clamp a client-supplied check-in time to [now - 7 days, now]. */
export function clampOfflineCheckInTime(at: number | undefined, now: number): number {
  if (at == null || !Number.isFinite(at)) return now
  return Math.min(now, Math.max(at, now - CAMP_OFFLINE_MAX_AGE_MS))
}

export function parseQueue(raw: string | null | undefined): QueuedCampCheckIn[] {
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (q): q is QueuedCampCheckIn =>
        q != null &&
        typeof q === 'object' &&
        typeof (q as QueuedCampCheckIn).client_uuid === 'string' &&
        typeof (q as QueuedCampCheckIn).registration_id === 'string' &&
        typeof (q as QueuedCampCheckIn).activity_id === 'string' &&
        typeof (q as QueuedCampCheckIn).checked_in_at === 'number'
    )
  } catch {
    return []
  }
}

type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export function loadQueue(storage: KeyValueStorage | null | undefined): QueuedCampCheckIn[] {
  if (!storage) return []
  try {
    return parseQueue(storage.getItem(CAMP_OFFLINE_QUEUE_KEY))
  } catch {
    return []
  }
}

export function saveQueue(storage: KeyValueStorage | null | undefined, queue: readonly QueuedCampCheckIn[]): void {
  if (!storage) return
  if (queue.length === 0) storage.removeItem(CAMP_OFFLINE_QUEUE_KEY)
  else storage.setItem(CAMP_OFFLINE_QUEUE_KEY, JSON.stringify(queue))
}

/** The fields the desk needs to find a camper offline (by code, QR, name or phone). */
export type CampLookupRegistration = Pick<
  CampRegistration,
  'id' | 'camp_year_id' | 'full_name' | 'first_name' | 'last_name' | 'phone' | 'whatsapp' | 'role' | 'status' | 'check_in_code' | 'parent_name'
>

export function toLookupRegistration(reg: CampRegistration): CampLookupRegistration {
  return {
    id: reg.id,
    camp_year_id: reg.camp_year_id,
    full_name: reg.full_name,
    first_name: reg.first_name,
    last_name: reg.last_name,
    phone: reg.phone,
    whatsapp: reg.whatsapp,
    role: reg.role,
    status: reg.status,
    check_in_code: resolveCampCheckInCode(reg) ?? reg.check_in_code,
    parent_name: reg.parent_name,
  }
}

/** Cached rows are shaped enough for the search and scan helpers; fill the required rest. */
export function fromLookupRegistration(row: CampLookupRegistration): CampRegistration {
  return { email: '', is_new_registrant: false, ...row } as CampRegistration
}
