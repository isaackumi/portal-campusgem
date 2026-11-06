import { describe, expect, test } from 'bun:test'
import type { CampRegistration, CampRoom } from '@/lib/types'
import {
  bulkRoomNames,
  groupRoomsByBuilding,
  nextRoomNumber,
  personMatches,
  rankRoomsFor,
  roomFit,
  roomMatches,
} from './rooms-board'

const room = (id: string, name: string, extra: Partial<CampRoom> = {}): CampRoom => ({
  id,
  camp_year_id: 'y',
  name,
  capacity: 4,
  created_at: '',
  updated_at: '',
  ...extra,
})

const reg = (extra: Partial<CampRegistration>): CampRegistration =>
  ({ id: 'r', camp_year_id: 'y', full_name: 'Ama Mensah', phone: '0244123456', role: 'Student', status: 'registered', ...extra }) as CampRegistration

describe('personMatches', () => {
  test('name words, school and phone in any format', () => {
    const r = reg({ address_school_work: 'UEW Winneba', residence: 'Hall 3' })
    expect(personMatches(r, 'ama')).toBe(true)
    expect(personMatches(r, 'mensah winneba')).toBe(true)
    expect(personMatches(r, '0244 123')).toBe(true)
    expect(personMatches(r, '233244123456')).toBe(true)
    expect(personMatches(r, 'kofi')).toBe(false)
  })
})

describe('roomFit / rankRoomsFor', () => {
  const rooms = [
    room('a', 'Room 10', { gender: 'Female' }),
    room('b', 'Room 2', { gender: 'Male' }),
    room('c', 'Room 3', { gender: 'Mixed', capacity: 2 }),
    room('d', 'Room 1', { gender: 'Female' }),
  ]
  const occ = new Map([['c', 2], ['a', 1]])

  test('fit rules', () => {
    expect(roomFit(rooms[2]!, 2, { sex: 'Male' })).toBe('full')
    expect(roomFit(rooms[0]!, 1, { sex: 'Male' })).toBe('gender')
    expect(roomFit(rooms[0]!, 1, { sex: 'Female' })).toBe('ok')
    expect(roomFit(rooms[0]!, 1, {})).toBe('ok')
  })

  test('a woman is offered women-only rooms first, partly filled before empty', () => {
    const ranked = rankRoomsFor(rooms, occ, { sex: 'Female' }).map((r) => `${r.room.id}:${r.fit}`)
    expect(ranked).toEqual(['a:ok', 'd:ok', 'b:gender', 'c:full'])
  })
})

describe('grouping and naming', () => {
  test('buildings in natural order, unnamed last', () => {
    const groups = groupRoomsByBuilding([
      room('1', 'Room 10', { building: 'Block B' }),
      room('2', 'Room 2', { building: 'Block B' }),
      room('3', 'Tent', {}),
      room('4', 'Room 1', { building: 'Block A' }),
    ])
    expect(groups.map((g) => g.building)).toEqual(['Block A', 'Block B', 'No building'])
    expect(groups[1]!.rooms.map((r) => r.name)).toEqual(['Room 2', 'Room 10'])
  })

  test('bulk names skip taken ones and continue the series', () => {
    expect(bulkRoomNames('Room', 1, 3, ['Room 2'])).toEqual(['Room 1', 'Room 3', 'Room 4'])
    expect(nextRoomNumber('Room', ['Room 1', 'Room 9', 'Hall 20'])).toBe(10)
    expect(nextRoomNumber('Dorm', [])).toBe(1)
  })

  test('room search covers building and gender', () => {
    expect(roomMatches(room('x', 'Room 4', { building: 'Block A', gender: 'Female' }), 'block a female')).toBe(true)
  })
})
