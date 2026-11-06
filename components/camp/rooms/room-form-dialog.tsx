'use client'

import { useEffect, useMemo, useState } from 'react'
import type { CampRoom, CampRoomGender } from '@/lib/types'
import { bulkRoomNames, nextRoomNumber } from '@/lib/camp/rooms-board'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

export type RoomDraft = {
  name: string
  building?: string
  capacity: number
  gender: CampRoomGender
  notes?: string
}

const GENDERS: Array<{ value: CampRoomGender; label: string }> = [
  { value: 'Male', label: 'Men' },
  { value: 'Female', label: 'Women' },
  { value: 'Mixed', label: 'Mixed' },
]

function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: Array<{ value: T; label: string }>; onChange: (v: T) => void; label: string }) {
  return (
    <div className="flex gap-1 rounded-lg bg-neutral-100 p-1 text-sm dark:bg-white/[0.06]" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'min-h-9 flex-1 rounded-md px-3 font-medium',
            value === o.value ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-800 dark:text-white' : 'text-neutral-600 dark:text-neutral-400'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/**
 * Add one room, add many at once ("Room 1" to "Room 12" in Block A, 4 beds, women), or edit
 * a room. Adding many is how most camps set up: same building, same size, numbered rooms.
 */
export function RoomFormDialog({
  open,
  onOpenChange,
  editing,
  existingNames,
  buildings,
  saving,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: CampRoom | null
  existingNames: string[]
  buildings: string[]
  saving: boolean
  onSave: (rooms: RoomDraft[]) => void
}) {
  const [mode, setMode] = useState<'many' | 'one'>('many')
  const [name, setName] = useState('')
  const [prefix, setPrefix] = useState('Room')
  const [start, setStart] = useState('1')
  const [count, setCount] = useState('10')
  const [building, setBuilding] = useState('')
  const [capacity, setCapacity] = useState('4')
  const [gender, setGender] = useState<CampRoomGender>('Mixed')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!open) return
    if (editing) {
      setMode('one')
      setName(editing.name)
      setBuilding(editing.building ?? '')
      setCapacity(String(editing.capacity ?? 4))
      setGender(editing.gender === 'Male' || editing.gender === 'Female' ? editing.gender : 'Mixed')
      setNotes(editing.notes ?? '')
    } else {
      setMode('many')
      setName('')
      setPrefix('Room')
      setStart(String(nextRoomNumber('Room', existingNames)))
      setCount('10')
      setNotes('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing])

  const cap = Math.min(Math.max(1, Number(capacity) || 1), 100)
  const names = useMemo(
    () => (mode === 'many' ? bulkRoomNames(prefix, Number(start) || 1, Number(count) || 0, existingNames) : []),
    [mode, prefix, start, count, existingNames]
  )

  function submit() {
    const base = { building: building.trim() || undefined, capacity: cap, gender, notes: notes.trim() || undefined }
    if (mode === 'one') {
      if (!name.trim()) return
      onSave([{ ...base, name: name.trim() }])
    } else {
      if (names.length === 0) return
      onSave(names.map((n) => ({ ...base, name: n })))
    }
  }

  const ready = mode === 'one' ? Boolean(name.trim()) : names.length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? `Edit ${editing.name}` : 'Add rooms'}</DialogTitle>
          {!editing ? <DialogDescription>Add a whole block of numbered rooms at once, or a single room.</DialogDescription> : null}
        </DialogHeader>

        <div className="space-y-4">
          {!editing ? (
            <Segmented
              label="How many rooms"
              value={mode}
              onChange={setMode}
              options={[
                { value: 'many', label: 'Several rooms' },
                { value: 'one', label: 'One room' },
              ]}
            />
          ) : null}

          {mode === 'one' ? (
            <div className="space-y-1.5">
              <Label htmlFor="room-name">Room name</Label>
              <Input id="room-name" className="h-11" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Room 4 or Chapel annex" />
            </div>
          ) : (
            <div className="grid grid-cols-[1fr_5rem_5rem] gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="room-prefix">Name</Label>
                <Input id="room-prefix" className="h-11" value={prefix} onChange={(e) => setPrefix(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="room-start">From</Label>
                <Input id="room-start" className="h-11" inputMode="numeric" value={start} onChange={(e) => setStart(e.target.value.replace(/\D/g, ''))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="room-count">How many</Label>
                <Input id="room-count" className="h-11" inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value.replace(/\D/g, ''))} />
              </div>
              <p className="col-span-3 text-xs text-neutral-500 dark:text-neutral-400">
                {names.length === 0
                  ? 'Nothing to add.'
                  : names.length <= 4
                    ? names.join(', ')
                    : `${names[0]}, ${names[1]} … ${names[names.length - 1]} (${names.length} rooms)`}
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="room-building">Building or block</Label>
            <Input id="room-building" className="h-11" list="room-buildings" value={building} onChange={(e) => setBuilding(e.target.value)} placeholder="Optional, e.g. Block A" />
            <datalist id="room-buildings">
              {buildings.map((b) => (
                <option key={b} value={b} />
              ))}
            </datalist>
          </div>

          <div className="grid grid-cols-[6rem_1fr] items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="room-capacity">Beds each</Label>
              <Input id="room-capacity" className="h-11" inputMode="numeric" value={capacity} onChange={(e) => setCapacity(e.target.value.replace(/\D/g, ''))} />
            </div>
            <div className="space-y-1.5">
              <Label>Who sleeps here</Label>
              <Segmented label="Who sleeps here" value={gender} onChange={setGender} options={GENDERS} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="room-notes">Notes</Label>
            <Textarea id="room-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional, e.g. ground floor, near the hall" />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" className="h-11" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="h-11" disabled={!ready || saving} onClick={submit}>
            {saving ? 'Saving…' : editing ? 'Save changes' : mode === 'many' ? `Add ${names.length} rooms` : 'Add room'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
