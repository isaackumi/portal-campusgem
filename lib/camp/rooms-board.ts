/**
 * Pure helpers for the rooms board: searching people and rooms, which rooms fit a person,
 * natural room ordering, grouping by building and naming rooms in bulk.
 */
import type { CampRegistration, CampRoom } from '@/lib/types'

export function displayName(reg: Pick<CampRegistration, 'full_name' | 'first_name' | 'last_name'>): string {
  return reg.full_name?.trim() || `${reg.first_name ?? ''} ${reg.last_name ?? ''}`.trim() || 'Unknown'
}

/** "Room 2" before "Room 10". */
export function naturalCompare(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
}

function digits(s?: string | null): string {
  return (s ?? '').replace(/\D/g, '')
}

/** Every word of the query must appear in the name, phone, school/work or residence. */
export function personMatches(reg: CampRegistration, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const hay = [displayName(reg), reg.role, reg.residence, reg.address_school_work, reg.sex]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  // Compare numbers without the leading 0 / 233, so "0244…", "233244…" and "+233 24…" all match.
  const local = (d: string) => d.replace(/^233/, '').replace(/^0/, '')
  const phone = local(digits(reg.phone)) + ' ' + local(digits(reg.whatsapp))
  return q.split(/\s+/).every((word) => {
    if (hay.includes(word)) return true
    const d = local(digits(word))
    return d.length >= 3 && phone.includes(d)
  })
}

export function roomMatches(room: CampRoom, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const hay = [room.name, room.building, room.gender, room.notes].filter(Boolean).join(' ').toLowerCase()
  return q.split(/\s+/).every((w) => hay.includes(w))
}

export type RoomFit = 'ok' | 'full' | 'gender'

/** Can this person go in this room? Rooms marked Male / Female only take that sex. */
export function roomFit(room: CampRoom, occupied: number, reg?: Pick<CampRegistration, 'sex'> | null): RoomFit {
  if (occupied >= room.capacity) return 'full'
  if (reg?.sex && room.gender && room.gender !== 'Mixed' && room.gender !== reg.sex) return 'gender'
  return 'ok'
}

export function genderLabel(g?: string | null): string {
  if (g === 'Male') return 'Men'
  if (g === 'Female') return 'Women'
  return 'Mixed'
}

/**
 * Rooms to offer a person, best first: rooms that fit, then the ones that would need
 * a gender override, then full ones. Within each, rooms already partly filled come
 * first (so rooms fill up rather than everyone getting a room alone), then by name.
 */
export function rankRoomsFor(
  rooms: readonly CampRoom[],
  occupancy: ReadonlyMap<string, number>,
  reg?: Pick<CampRegistration, 'sex'> | null
): Array<{ room: CampRoom; occupied: number; fit: RoomFit }> {
  const order: Record<RoomFit, number> = { ok: 0, gender: 1, full: 2 }
  return rooms
    .map((room) => {
      const occupied = occupancy.get(room.id) ?? 0
      return { room, occupied, fit: roomFit(room, occupied, reg) }
    })
    .sort((a, b) => {
      if (order[a.fit] !== order[b.fit]) return order[a.fit] - order[b.fit]
      const aPartial = a.occupied > 0 ? 0 : 1
      const bPartial = b.occupied > 0 ? 0 : 1
      if (aPartial !== bPartial) return aPartial - bPartial
      return naturalCompare(`${a.room.building ?? ''} ${a.room.name}`, `${b.room.building ?? ''} ${b.room.name}`)
    })
}

/** Rooms grouped under their building ("No building" last), each group in natural order. */
export function groupRoomsByBuilding(rooms: readonly CampRoom[]): Array<{ building: string; rooms: CampRoom[] }> {
  const groups = new Map<string, CampRoom[]>()
  for (const room of rooms) {
    const key = room.building?.trim() || ''
    const list = groups.get(key) ?? []
    list.push(room)
    groups.set(key, list)
  }
  return Array.from(groups.entries())
    .sort(([a], [b]) => (a === '' ? 1 : b === '' ? -1 : naturalCompare(a, b)))
    .map(([building, list]) => ({
      building: building || 'No building',
      rooms: list.sort((x, y) => naturalCompare(x.name, y.name)),
    }))
}

/**
 * Names for adding several rooms at once: prefix + numbers ("Room 1".."Room 12"), skipping
 * names already used in the same building.
 */
export function bulkRoomNames(prefix: string, start: number, count: number, taken: Iterable<string> = []): string[] {
  const used = new Set(Array.from(taken, (n) => n.trim().toLowerCase()))
  const base = prefix.trim() || 'Room'
  const names: string[] = []
  let n = Math.max(0, Math.floor(start))
  const want = Math.min(Math.max(0, Math.floor(count)), 200)
  while (names.length < want && n < start + want + 500) {
    const name = `${base} ${n}`
    if (!used.has(name.toLowerCase())) names.push(name)
    n++
  }
  return names
}

/** Next free number after existing "<prefix> N" names, so bulk-adding continues the series. */
export function nextRoomNumber(prefix: string, existing: Iterable<string>): number {
  const base = prefix.trim().toLowerCase() || 'room'
  let max = 0
  for (const name of Array.from(existing)) {
    const m = new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*(\\d+)$`, 'i').exec(name.trim())
    if (m) max = Math.max(max, Number(m[1]))
  }
  return max + 1
}
