/**
 * Lodging picture for one camp year: beds per gender, who has a room, who still needs one.
 */
import type { CampRegistration, CampRoom } from '@/lib/types'

export type AllocationBucket = {
  key: 'Male' | 'Female' | 'Mixed'
  label: string
  rooms: number
  capacity: number
  occupied: number
  /** Registrants of this sex (Mixed: unknown sex) still without a room. */
  waiting: number
}

export type RoomAllocationSummary = {
  rooms: number
  capacity: number
  occupied: number
  fullRooms: number
  /** Active registrants (not cancelled) without a room. */
  unassigned: number
  /** Active registrants who need a bed. */
  needingBeds: number
  /** Beds still free across all rooms. */
  freeBeds: number
  /** Positive when there are more people without rooms than free beds. */
  shortfall: number
  buckets: AllocationBucket[]
}

export function summarizeRoomAllocation(
  registrations: readonly Pick<CampRegistration, 'id' | 'room_id' | 'sex' | 'status'>[],
  rooms: readonly Pick<CampRoom, 'id' | 'capacity' | 'gender'>[]
): RoomAllocationSummary {
  const active = registrations.filter((r) => r.status !== 'cancelled')
  const roomIds = new Set(rooms.map((r) => r.id))
  const occupancy = new Map<string, number>()
  for (const reg of active) {
    if (reg.room_id && roomIds.has(reg.room_id)) {
      occupancy.set(reg.room_id, (occupancy.get(reg.room_id) ?? 0) + 1)
    }
  }

  const bucketOf = (gender: CampRoom['gender']): AllocationBucket['key'] =>
    gender === 'Male' || gender === 'Female' ? gender : 'Mixed'
  const buckets: Record<AllocationBucket['key'], AllocationBucket> = {
    Male: { key: 'Male', label: 'Brothers', rooms: 0, capacity: 0, occupied: 0, waiting: 0 },
    Female: { key: 'Female', label: 'Sisters', rooms: 0, capacity: 0, occupied: 0, waiting: 0 },
    Mixed: { key: 'Mixed', label: 'Mixed / unspecified', rooms: 0, capacity: 0, occupied: 0, waiting: 0 },
  }

  let capacity = 0
  let occupied = 0
  let fullRooms = 0
  for (const room of rooms) {
    const used = occupancy.get(room.id) ?? 0
    const cap = Math.max(0, room.capacity || 0)
    const b = buckets[bucketOf(room.gender)]
    b.rooms += 1
    b.capacity += cap
    b.occupied += used
    capacity += cap
    occupied += used
    if (cap > 0 && used >= cap) fullRooms += 1
  }

  let unassigned = 0
  for (const reg of active) {
    if (reg.room_id && roomIds.has(reg.room_id)) continue
    unassigned += 1
    buckets[reg.sex === 'Male' || reg.sex === 'Female' ? reg.sex : 'Mixed'].waiting += 1
  }

  const freeBeds = Math.max(0, capacity - occupied)
  return {
    rooms: rooms.length,
    capacity,
    occupied,
    fullRooms,
    unassigned,
    needingBeds: active.length,
    freeBeds,
    shortfall: Math.max(0, unassigned - freeBeds),
    buckets: [buckets.Female, buckets.Male, buckets.Mixed].filter(
      (b) => b.rooms > 0 || b.waiting > 0
    ),
  }
}

/** Registrations per calendar day (local), oldest first, for the last `days` days. */
export function registrationsPerDay(
  registrations: readonly Pick<CampRegistration, 'created_at'>[],
  days = 30,
  now: Date = new Date()
): Array<{ day: string; label: string; count: number }> {
  const key = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const counts = new Map<string, number>()
  for (const reg of registrations) {
    const d = new Date(reg.created_at)
    if (Number.isNaN(d.getTime())) continue
    counts.set(key(d), (counts.get(key(d)) ?? 0) + 1)
  }
  const out: Array<{ day: string; label: string; count: number }> = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
    out.push({
      day: key(d),
      label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      count: counts.get(key(d)) ?? 0,
    })
  }
  return out
}
