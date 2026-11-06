'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, Search } from 'lucide-react'
import type { CampRegistration, CampRoom } from '@/lib/types'
import { displayName, genderLabel, personMatches, rankRoomsFor, roomMatches } from '@/lib/camp/rooms-board'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { GenderChip } from './room-tile'
import { cn } from '@/lib/utils'

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden />
      <Input
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 pl-9"
        aria-label={placeholder}
      />
    </div>
  )
}

/** Choose a room for one person or a group. Best-fitting rooms first. */
export function PickRoomDialog({
  open,
  onOpenChange,
  people,
  rooms,
  occupancy,
  onPick,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  people: CampRegistration[]
  rooms: CampRoom[]
  occupancy: ReadonlyMap<string, number>
  onPick: (roomId: string) => void
}) {
  const [query, setQuery] = useState('')
  useEffect(() => {
    if (open) setQuery('')
  }, [open])

  const single = useMemo(() => {
    const sexes = new Set(people.map((p) => p.sex).filter(Boolean))
    return sexes.size === 1 ? { sex: Array.from(sexes)[0] as CampRegistration['sex'] } : null
  }, [people])
  // People already in a room free their bed when they move.
  const leaving = useMemo(() => {
    const m = new Map<string, number>()
    for (const p of people) if (p.room_id) m.set(p.room_id, (m.get(p.room_id) ?? 0) + 1)
    return m
  }, [people])

  const ranked = useMemo(
    () => rankRoomsFor(rooms.filter((r) => roomMatches(r, query)), occupancy, single),
    [rooms, query, occupancy, single]
  )
  const title = people.length === 1 ? `Room for ${displayName(people[0]!)}` : `Room for ${people.length} people`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88dvh] max-w-md flex-col gap-3">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {single?.sex ? `${genderLabel(single.sex)}' and mixed rooms first. ` : ''}Rooms that already have people come first, so rooms fill up.
          </DialogDescription>
        </DialogHeader>
        <SearchBox value={query} onChange={setQuery} placeholder="Search rooms or buildings" />
        <ul className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
          {ranked.length === 0 ? (
            <li className="py-6 text-center text-sm text-neutral-500 dark:text-neutral-400">No rooms match.</li>
          ) : (
            ranked.map(({ room, occupied }) => {
              const sameRoom = people.length > 0 && people.every((p) => p.room_id === room.id)
              const free = room.capacity - occupied + (leaving.get(room.id) ?? 0)
              const enough = free >= people.filter((p) => p.room_id !== room.id).length
              const wrongGender = Boolean(
                room.gender && room.gender !== 'Mixed' && people.some((p) => p.sex && p.sex !== room.gender)
              )
              const disabled = sameRoom || !enough
              return (
                <li key={room.id}>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onPick(room.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left',
                      disabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-neutral-100 dark:hover:bg-white/[0.06]'
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate font-medium text-neutral-900 dark:text-neutral-100">{room.name}</span>
                        <GenderChip gender={room.gender} />
                      </span>
                      <span className="block truncate text-xs text-neutral-500 dark:text-neutral-400">
                        {room.building ? `${room.building} · ` : ''}
                        {sameRoom ? 'Already here' : !enough ? `Not enough beds (${Math.max(0, free)} free)` : `${free} of ${room.capacity} beds free`}
                      </span>
                      {wrongGender && !disabled ? (
                        <span className="block text-xs text-amber-700 dark:text-amber-300">This is a {genderLabel(room.gender).toLowerCase()}&apos;s room</span>
                      ) : null}
                    </span>
                    <span className="shrink-0 font-mono text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
                      {occupied}/{room.capacity}
                    </span>
                  </button>
                </li>
              )
            })
          )}
        </ul>
      </DialogContent>
    </Dialog>
  )
}

/** Add people to a room: search everyone, pick up to the number of free beds. */
export function AddPeopleDialog({
  open,
  onOpenChange,
  room,
  freeBeds,
  people,
  roomsById,
  onAdd,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  room: CampRoom | null
  freeBeds: number
  /** Everyone not cancelled. */
  people: CampRegistration[]
  roomsById: ReadonlyMap<string, CampRoom>
  onAdd: (registrationIds: string[]) => void
}) {
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState<'unassigned' | 'all'>('unassigned')
  const [picked, setPicked] = useState<string[]>([])
  useEffect(() => {
    if (open) {
      setQuery('')
      setScope('unassigned')
      setPicked([])
    }
  }, [open])

  const list = useMemo(() => {
    if (!room) return []
    const rows = people.filter(
      (p) => p.room_id !== room.id && (scope === 'all' || !p.room_id) && personMatches(p, query)
    )
    const fits = (p: CampRegistration) => !room.gender || room.gender === 'Mixed' || !p.sex || p.sex === room.gender
    return rows
      .sort((a, b) => Number(fits(b)) - Number(fits(a)) || displayName(a).localeCompare(displayName(b)))
      .slice(0, 150)
  }, [people, room, scope, query])

  if (!room) return null
  const full = picked.length >= freeBeds

  function toggle(id: string) {
    setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : full ? prev : [...prev, id]))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88dvh] max-w-md flex-col gap-3">
        <DialogHeader>
          <DialogTitle>Add to {room.name}</DialogTitle>
          <DialogDescription>
            {freeBeds} {freeBeds === 1 ? 'bed' : 'beds'} free · {genderLabel(room.gender)}
            {room.building ? ` · ${room.building}` : ''}
          </DialogDescription>
        </DialogHeader>
        <SearchBox value={query} onChange={setQuery} placeholder="Search name, phone, school or hall" />
        <div className="flex gap-1 rounded-lg bg-neutral-100 p-1 text-sm dark:bg-white/[0.06]" role="tablist">
          {(['unassigned', 'all'] as const).map((s) => (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={scope === s}
              onClick={() => setScope(s)}
              className={cn(
                'flex-1 rounded-md px-3 py-1.5 font-medium',
                scope === s ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-800 dark:text-white' : 'text-neutral-600 dark:text-neutral-400'
              )}
            >
              {s === 'unassigned' ? 'No room yet' : 'Everyone (move)'}
            </button>
          ))}
        </div>
        <ul className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
          {list.length === 0 ? (
            <li className="py-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
              {scope === 'unassigned' ? 'Nobody without a room matches. Try "Everyone".' : 'Nobody matches.'}
            </li>
          ) : (
            list.map((p) => {
              const on = picked.includes(p.id)
              const current = p.room_id ? roomsById.get(p.room_id) : null
              const mismatch = Boolean(room.gender && room.gender !== 'Mixed' && p.sex && p.sex !== room.gender)
              return (
                <li key={p.id}>
                  <label
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5',
                      on ? 'bg-brand-50 dark:bg-brand-400/10' : 'hover:bg-neutral-100 dark:hover:bg-white/[0.06]',
                      !on && full && 'cursor-not-allowed opacity-50'
                    )}
                  >
                    <Checkbox checked={on} disabled={!on && full} onCheckedChange={() => toggle(p.id)} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-neutral-900 dark:text-neutral-100">{displayName(p)}</span>
                      <span className="block truncate text-xs text-neutral-500 dark:text-neutral-400">
                        {[p.sex, p.role, p.address_school_work || p.residence].filter(Boolean).join(' · ')}
                        {current ? ` · now in ${current.name}` : ''}
                      </span>
                      {mismatch ? (
                        <span className="block text-xs text-amber-700 dark:text-amber-300">This is a {genderLabel(room.gender).toLowerCase()}&apos;s room</span>
                      ) : null}
                    </span>
                    {on ? <Check className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-300" aria-hidden /> : null}
                  </label>
                </li>
              )
            })
          )}
        </ul>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" className="h-11" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="h-11" disabled={picked.length === 0} onClick={() => onAdd(picked)}>
            {picked.length === 0 ? 'Choose people' : `Add ${picked.length} to ${room.name}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
