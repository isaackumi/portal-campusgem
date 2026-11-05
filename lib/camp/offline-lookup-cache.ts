/**
 * Browser-only IndexedDB cache of the camp desk's lookup data, so a desk phone that loses
 * signal (or reloads offline) can still find campers by code, QR, name or phone.
 * Saved each time the scan page loads online. Holds id, name, code, phone, role and status
 * per registration (see `toLookupRegistration`), plus the year and its sessions.
 */
import type { CampActivity, CampRegistration, CampYear } from '@/lib/types'
import {
  fromLookupRegistration,
  toLookupRegistration,
  type CampLookupRegistration,
} from '@/lib/camp/offline-checkin-queue'

const DB_NAME = 'campgem-camp-desk'
const STORE = 'kv'
const ACTIVE_KEY = 'active-year'

type Snapshot = {
  saved_at: number
  camp_year: CampYear
  activities: CampActivity[]
  registrations: CampLookupRegistration[]
}

export type CampDeskSnapshot = {
  saved_at: number
  campYear: CampYear
  activities: CampActivity[]
  registrations: CampRegistration[]
}

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null)
  return new Promise((resolve) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => resolve(null)
    req.onblocked = () => resolve(null)
  })
}

async function withStore<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
  const db = await openDb()
  if (!db) return null
  try {
    return await new Promise<T | null>((resolve) => {
      const tx = db.transaction(STORE, mode)
      const req = fn(tx.objectStore(STORE))
      req.onsuccess = () => resolve(req.result ?? null)
      req.onerror = () => resolve(null)
    })
  } finally {
    db.close()
  }
}

export async function saveCampDeskSnapshot(input: {
  campYear: CampYear
  activities: CampActivity[]
  registrations: CampRegistration[]
}): Promise<void> {
  const snapshot: Snapshot = {
    saved_at: Date.now(),
    camp_year: input.campYear,
    activities: input.activities,
    registrations: input.registrations.map(toLookupRegistration),
  }
  await withStore('readwrite', (s) => s.put(snapshot, ACTIVE_KEY)).catch(() => null)
}

export async function loadCampDeskSnapshot(): Promise<CampDeskSnapshot | null> {
  const raw = (await withStore<Snapshot>('readonly', (s) => s.get(ACTIVE_KEY)).catch(() => null)) as Snapshot | null
  if (!raw?.camp_year) return null
  return {
    saved_at: raw.saved_at,
    campYear: raw.camp_year,
    activities: Array.isArray(raw.activities) ? raw.activities : [],
    registrations: Array.isArray(raw.registrations) ? raw.registrations.map(fromLookupRegistration) : [],
  }
}
