'use client'

/**
 * Browser glue for the offline camp check-in queue (`lib/camp/offline-checkin-queue.ts`).
 * One queue per device in localStorage, shared by every check-in tool on the scan page.
 */
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { recordCampSessionCheckIn } from '@/lib/actions/camp'
import { syncOfflineCampCheckInsAction } from '@/lib/actions/camp-offline'
import {
  CAMP_OFFLINE_QUEUE_KEY,
  applySyncResults,
  createQueuedCheckIn,
  enqueueCheckIn,
  failedItems,
  isNetworkError,
  loadQueue,
  nextSyncBatch,
  pendingItems,
  saveQueue,
  type CampCheckInMethod,
  type QueuedCampCheckIn,
} from '@/lib/camp/offline-checkin-queue'
import type { CampRegistration, CampSessionAttendance } from '@/lib/types'

const AUTO_SYNC_MS = 30_000
const EMPTY: QueuedCampCheckIn[] = []

let current: QueuedCampCheckIn[] | null = null
const listeners = new Set<() => void>()
let syncing: Promise<SyncSummary> | null = null

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

function read(): QueuedCampCheckIn[] {
  if (current == null) current = loadQueue(storage())
  return current
}

function write(next: QueuedCampCheckIn[]) {
  current = next
  try {
    saveQueue(storage(), next)
  } catch {
    // Storage full or blocked: the queue still lives in memory for this tab.
  }
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  const onStorage = (e: StorageEvent) => {
    if (e.key === CAMP_OFFLINE_QUEUE_KEY) {
      current = null
      listener()
    }
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

function isOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine !== false
}

export type CampCheckInOutcome =
  | { kind: 'recorded'; attendance: CampSessionAttendance | null; registration: CampRegistration | null }
  | { kind: 'already'; attendance: CampSessionAttendance | null; registration: CampRegistration | null }
  | { kind: 'queued' }
  | { kind: 'already_queued' }

/**
 * Record a session check-in now, or save it on this phone when the network is down.
 * Throws for real errors (camper not found, no permission) so callers can show them.
 */
export async function recordCampCheckInOrQueue(args: {
  activity_id: string
  registration_id: string
  performed_by: string
  check_in_method: CampCheckInMethod
  camp_year_id?: string
  name?: string
}): Promise<CampCheckInOutcome> {
  const queue = () => {
    const { queue: next, added } = enqueueCheckIn(
      read(),
      createQueuedCheckIn({
        registration_id: args.registration_id,
        activity_id: args.activity_id,
        camp_year_id: args.camp_year_id,
        check_in_method: args.check_in_method,
        name: args.name,
      })
    )
    write(next)
    return { kind: added ? ('queued' as const) : ('already_queued' as const) }
  }

  if (!isOnline()) return queue()
  try {
    const { data, error } = await recordCampSessionCheckIn({
      activity_id: args.activity_id,
      registration_id: args.registration_id,
      performed_by: args.performed_by,
      check_in_method: args.check_in_method,
    })
    if (error || !data) {
      if (error && isNetworkError(error)) return queue()
      throw new Error(error ?? 'Check-in failed')
    }
    return {
      kind: data.already_checked_in ? ('already' as const) : ('recorded' as const),
      attendance: data.attendance,
      registration: data.registration,
    }
  } catch (err) {
    if (isNetworkError(err, isOnline())) return queue()
    throw err
  }
}

export type SyncSummary = { synced: number; failed: number; remaining: number; error?: string }

/** Push pending check-ins to the server. One run at a time per tab. */
export function syncCampCheckInQueue(): Promise<SyncSummary> {
  if (syncing) return syncing
  syncing = (async () => {
    let synced = 0
    let failed = 0
    try {
      // Batches until nothing is pending, or a batch makes no progress.
      for (let round = 0; round < 20; round++) {
        const batch = nextSyncBatch(read())
        if (batch.length === 0 || !isOnline()) break
        const { data, error } = await syncOfflineCampCheckInsAction(batch)
        if (error || !data) return { synced, failed, remaining: pendingItems(read()).length, error: error ?? 'Sync failed' }
        const applied = applySyncResults(read(), data)
        write(applied.queue)
        synced += applied.synced
        failed += applied.failed
        if (applied.synced + applied.failed === 0) break
      }
      return { synced, failed, remaining: pendingItems(read()).length }
    } catch (err) {
      return {
        synced,
        failed,
        remaining: pendingItems(read()).length,
        error: isNetworkError(err, isOnline()) ? 'Still offline' : err instanceof Error ? err.message : 'Sync failed',
      }
    } finally {
      syncing = null
    }
  })()
  return syncing
}

export function dismissFailedCampCheckIns() {
  write(read().filter((q) => q.status !== 'failed'))
}

/**
 * Queue state for the page, plus automatic retries (on `online` and every 30s) when
 * `autoSync` is set. Mount it with autoSync once per page.
 */
export function useCampOfflineQueue(options: { autoSync?: boolean; onSynced?: (s: SyncSummary) => void } = {}) {
  const { autoSync = false, onSynced } = options
  const queue = useSyncExternalStore(subscribe, read, () => EMPTY)
  const [online, setOnline] = useState(true)
  const [busy, setBusy] = useState(false)
  const onSyncedRef = useRef(onSynced)
  onSyncedRef.current = onSynced

  const sync = useCallback(async () => {
    setBusy(true)
    try {
      const summary = await syncCampCheckInQueue()
      if (summary.synced > 0 || summary.failed > 0) onSyncedRef.current?.(summary)
      return summary
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => {
    setOnline(isOnline())
    const up = () => {
      setOnline(true)
      if (autoSync) void sync()
    }
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    let id: number | undefined
    if (autoSync) {
      id = window.setInterval(() => {
        if (isOnline() && pendingItems(read()).length > 0) void sync()
      }, AUTO_SYNC_MS)
      if (isOnline() && pendingItems(read()).length > 0) void sync()
    }
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
      if (id) window.clearInterval(id)
    }
  }, [autoSync, sync])

  return {
    queue,
    pending: pendingItems(queue),
    failed: failedItems(queue),
    online,
    syncing: busy,
    sync,
    dismissFailed: dismissFailedCampCheckIns,
  }
}
