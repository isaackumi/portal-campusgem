'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  getActiveCampYear,
  getAllCampYears,
  getCampYearById,
  sendCampTemplateSmsToRegistrationsAction,
} from '@/lib/actions/camp'
import { campService } from '@/lib/services/camp-service'
import type { CampRegistration, CampRoom, CampYear } from '@/lib/types'
import { displayName, groupRoomsByBuilding, personMatches, roomMatches } from '@/lib/camp/rooms-board'
import { CampAdminPageHeader } from '@/components/camp/camp-admin-page-header'
import { RoomTile } from '@/components/camp/rooms/room-tile'
import { AddPeopleDialog, PickRoomDialog } from '@/components/camp/rooms/room-pickers'
import { RoomFormDialog, type RoomDraft } from '@/components/camp/rooms/room-form-dialog'
import { useSmsPreview } from '@/components/comms/sms-preview'
import { confirmCampTemplateSms } from '@/components/camp/camp-sms-preview'
import { StatCard } from '@/components/ui/stat-card'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { LoadingSpinner } from '@/components/ui/loading'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/components/providers'
import { ChevronDown, MessageSquare, Plus, RefreshCw, Search, Shuffle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type PeopleScope = 'unassigned' | 'assigned' | 'all'
type SexFilter = 'all' | 'Male' | 'Female'
type RoomFilter = 'all' | 'Male' | 'Female' | 'Mixed' | 'space' | 'full'

function Chips<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T
  onChange: (v: T) => void
  options: Array<{ value: T; label: string }>
  label: string
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'min-h-8 rounded-full border px-3 text-[13px] font-medium transition-colors',
            value === o.value
              ? 'border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900'
              : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 dark:border-white/10 dark:bg-transparent dark:text-neutral-300 dark:hover:border-white/20'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden />
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} className="h-11 pl-9 pr-9" />
      {value ? (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  )
}

function CampRoomsPageContent() {
  const { toast } = useToast()
  const smsPreview = useSmsPreview()
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const yearIdParam = searchParams.get('year')

  const [campYear, setCampYear] = useState<CampYear | null>(null)
  const [activeYear, setActiveYear] = useState<CampYear | null>(null)
  const [availableYears, setAvailableYears] = useState<CampYear[]>([])
  const [rooms, setRooms] = useState<CampRoom[]>([])
  const [registrations, setRegistrations] = useState<CampRegistration[]>([])
  const [loading, setLoading] = useState(true)
  const [busyRoomIds, setBusyRoomIds] = useState<Set<string>>(new Set())
  const [savingRooms, setSavingRooms] = useState(false)
  const [randomizing, setRandomizing] = useState(false)

  // Mobile: one panel at a time.
  const [mobilePanel, setMobilePanel] = useState<'people' | 'rooms'>('rooms')
  // People panel
  const [peopleQuery, setPeopleQuery] = useState('')
  const [scope, setScope] = useState<PeopleScope>('unassigned')
  const [sexFilter, setSexFilter] = useState<SexFilter>('all')
  const [selected, setSelected] = useState<string[]>([])
  // Rooms panel
  const [roomQuery, setRoomQuery] = useState('')
  const [roomFilter, setRoomFilter] = useState<RoomFilter>('all')
  // Dialogs
  const [formOpen, setFormOpen] = useState(false)
  const [editingRoom, setEditingRoom] = useState<CampRoom | null>(null)
  const [pickFor, setPickFor] = useState<CampRegistration[] | null>(null)
  const [addTo, setAddTo] = useState<CampRoom | null>(null)

  const loadData = useCallback(async (year: CampYear) => {
    const [roomsRes, regsRes] = await Promise.all([
      campService.getCampRooms(year.id),
      campService.getCampRegistrations(year.id),
    ])
    setRooms(roomsRes.data ?? [])
    setRegistrations(regsRes.data ?? [])
  }, [])

  useEffect(() => {
    void (async () => {
      setLoading(true)
      const [{ data: years }, { data: active }] = await Promise.all([getAllCampYears(), getActiveCampYear()])
      const sorted = [...(years ?? [])].sort((a, b) => b.year - a.year)
      setAvailableYears(sorted)
      setActiveYear(active ?? null)
      let chosen: CampYear | null = null
      if (yearIdParam) chosen = (await getCampYearById(yearIdParam)).data ?? null
      if (!chosen) chosen = active ?? sorted.find((y) => y.is_active) ?? sorted[0] ?? null
      setCampYear(chosen)
      if (chosen) await loadData(chosen)
      else {
        setRooms([])
        setRegistrations([])
      }
      setLoading(false)
    })()
  }, [yearIdParam, loadData])

  // ---- derived -----------------------------------------------------------
  const people = useMemo(() => registrations.filter((r) => r.status !== 'cancelled'), [registrations])
  const roomsById = useMemo(() => new Map(rooms.map((r) => [r.id, r])), [rooms])
  const occupantsByRoom = useMemo(() => {
    const map = new Map<string, CampRegistration[]>()
    for (const reg of people) {
      if (!reg.room_id || !roomsById.has(reg.room_id)) continue
      const list = map.get(reg.room_id) ?? []
      list.push(reg)
      map.set(reg.room_id, list)
    }
    for (const list of Array.from(map.values())) list.sort((a, b) => displayName(a).localeCompare(displayName(b)))
    return map
  }, [people, roomsById])
  const occupancy = useMemo(() => {
    const m = new Map<string, number>()
    occupantsByRoom.forEach((list, id) => m.set(id, list.length))
    return m
  }, [occupantsByRoom])

  const stats = useMemo(() => {
    const assigned = people.filter((r) => r.room_id && roomsById.has(r.room_id)).length
    const totalBeds = rooms.reduce((sum, room) => sum + room.capacity, 0)
    return { rooms: rooms.length, assigned, unassigned: people.length - assigned, totalBeds, freeBeds: Math.max(0, totalBeds - assigned) }
  }, [people, rooms, roomsById])

  const peopleList = useMemo(() => {
    return people
      .filter((p) => {
        const placed = Boolean(p.room_id && roomsById.has(p.room_id))
        if (scope === 'unassigned' && placed) return false
        if (scope === 'assigned' && !placed) return false
        if (sexFilter !== 'all' && p.sex !== sexFilter) return false
        return personMatches(p, peopleQuery)
      })
      .sort((a, b) => displayName(a).localeCompare(displayName(b)))
  }, [people, roomsById, scope, sexFilter, peopleQuery])

  const roomGroups = useMemo(() => {
    const filtered = rooms.filter((room) => {
      const used = occupancy.get(room.id) ?? 0
      if (roomFilter === 'space' && used >= room.capacity) return false
      if (roomFilter === 'full' && used < room.capacity) return false
      if ((roomFilter === 'Male' || roomFilter === 'Female' || roomFilter === 'Mixed') && (room.gender ?? 'Mixed') !== roomFilter) return false
      return roomMatches(room, roomQuery)
    })
    return groupRoomsByBuilding(filtered)
  }, [rooms, occupancy, roomFilter, roomQuery])

  const buildings = useMemo(
    () => Array.from(new Set(rooms.map((r) => r.building?.trim()).filter((b): b is string => Boolean(b)))).sort(),
    [rooms]
  )

  // ---- actions -----------------------------------------------------------
  function markBusy(ids: string[], on: boolean) {
    setBusyRoomIds((prev) => {
      const next = new Set(prev)
      for (const id of ids) {
        if (on) next.add(id)
        else next.delete(id)
      }
      return next
    })
  }

  /**
   * Put people in a room (or take them out with null). The board updates straight away;
   * anything the server refuses (e.g. the room filled up meanwhile) is put back.
   */
  async function assign(regIds: string[], roomId: string | null) {
    if (!campYear || regIds.length === 0) return
    const before = new Map(registrations.filter((r) => regIds.includes(r.id)).map((r) => [r.id, r.room_id]))
    const touched = Array.from(new Set([roomId, ...Array.from(before.values())].filter((x): x is string => Boolean(x))))
    setRegistrations((prev) => prev.map((r) => (regIds.includes(r.id) ? { ...r, room_id: roomId ?? undefined } : r)))
    markBusy(touched, true)
    const failures: string[] = []
    for (const id of regIds) {
      const { error } = await campService.assignRegistrationRoom({ registration_id: id, room_id: roomId })
      if (error) {
        failures.push(error)
        setRegistrations((prev) => prev.map((r) => (r.id === id ? { ...r, room_id: before.get(id) } : r)))
      }
    }
    markBusy(touched, false)
    setSelected((prev) => prev.filter((id) => !regIds.includes(id)))
    const done = regIds.length - failures.length
    const roomName = roomId ? roomsById.get(roomId)?.name : null
    if (failures.length) {
      toast({ variant: 'destructive', title: done ? `${done} placed, ${failures.length} not` : 'Not placed', description: failures[0] })
    } else {
      toast({ title: roomName ? `${done === 1 ? displayName(registrations.find((r) => r.id === regIds[0])!) : `${done} people`} → ${roomName}` : `${done} taken out of their room` })
    }
  }

  async function setLeader(room: CampRoom, reg: CampRegistration | null) {
    const previous = room.room_leader_id
    setRooms((prev) => prev.map((r) => (r.id === room.id ? { ...r, room_leader_id: reg?.id } : r)))
    const { error } = await campService.setRoomLeader({ room_id: room.id, registration_id: reg?.id ?? null })
    if (error) {
      setRooms((prev) => prev.map((r) => (r.id === room.id ? { ...r, room_leader_id: previous } : r)))
      toast({ variant: 'destructive', title: 'Could not set the room leader', description: error })
      return
    }
    toast({ title: reg ? `${displayName(reg)} leads ${room.name}` : `${room.name} has no leader now` })
  }

  async function saveRooms(drafts: RoomDraft[]) {
    if (!campYear) return
    setSavingRooms(true)
    if (editingRoom) {
      const d = drafts[0]!
      const { error } = await campService.updateRoom(editingRoom.id, d)
      setSavingRooms(false)
      if (error) {
        toast({ variant: 'destructive', title: 'Could not save the room', description: error })
        return
      }
      toast({ title: `${d.name} saved` })
    } else {
      let made = 0
      let firstError: string | null = null
      for (const d of drafts) {
        const { error } = await campService.createRoom({ camp_year_id: campYear.id, ...d })
        if (error) firstError ??= error
        else made++
      }
      setSavingRooms(false)
      toast(
        firstError
          ? { variant: 'destructive', title: `${made} of ${drafts.length} rooms added`, description: firstError }
          : { title: made === 1 ? `${drafts[0]!.name} added` : `${made} rooms added` }
      )
    }
    setFormOpen(false)
    setEditingRoom(null)
    await loadData(campYear)
  }

  async function deleteRoom(room: CampRoom) {
    if (!campYear) return
    const n = occupancy.get(room.id) ?? 0
    if (!window.confirm(`Delete ${room.name}?${n ? ` The ${n} ${n === 1 ? 'person' : 'people'} in it will have no room.` : ''}`)) return
    const { data, error } = await campService.deleteRoom(room.id)
    if (error || !data) {
      toast({ variant: 'destructive', title: 'Could not delete the room', description: error ?? undefined })
      return
    }
    toast({ title: `${room.name} deleted` })
    await loadData(campYear)
  }

  async function autoAssign() {
    if (!campYear) return
    if (!window.confirm(`Put the ${stats.unassigned} people without a room into rooms with space? Men and women go to matching rooms; people already placed stay where they are.`)) return
    setRandomizing(true)
    const { data, error } = await campService.randomAssignRooms({ camp_year_id: campYear.id, respect_gender: true, only_unassigned: true })
    setRandomizing(false)
    if (error || !data) {
      toast({ variant: 'destructive', title: 'Could not fill rooms', description: error ?? undefined })
      return
    }
    toast({ title: `${data.assigned} placed`, description: data.skipped ? `${data.skipped} still need a room (no matching space).` : undefined })
    await loadData(campYear)
  }

  async function textRoom(registrationIds: string[], label: string) {
    if (!campYear?.id || !user?.id || registrationIds.length === 0) return
    const check = await confirmCampTemplateSms(smsPreview, {
      title: `Room details · ${label}`,
      camp_year_id: campYear.id,
      registration_ids: registrationIds,
      template_id: 'room_allocation',
    })
    if (!check.ok) {
      if (check.error) toast({ variant: 'destructive', title: 'Not sent', description: check.error })
      return
    }
    const { data, error } = await sendCampTemplateSmsToRegistrationsAction({
      camp_year_id: campYear.id,
      sender_id: user.id,
      registration_ids: registrationIds,
      template_id: 'room_allocation',
    })
    if (error || !data) {
      toast({ variant: 'destructive', title: 'Room texts failed', description: error ?? 'Could not send' })
      return
    }
    toast({
      title: data.success_count > 0 ? `Sent ${data.success_count} room ${data.success_count === 1 ? 'text' : 'texts'}` : 'Nothing was sent',
      variant: data.success_count > 0 ? 'default' : 'destructive',
      description: data.skipped_count || data.error_count ? `${data.skipped_count} skipped, ${data.error_count} failed` : undefined,
    })
  }

  // ---- render ------------------------------------------------------------
  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (!campYear) {
    return (
      <div className="mx-auto max-w-4xl">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-neutral-700 dark:text-neutral-300">There is no camp year to set up rooms for.</p>
            <Button className="mt-4" asChild>
              <Link href="/admin/camp-meeting/years">Manage camp years</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const viewingActive = Boolean(activeYear && campYear.id === activeYear.id)
  const selectedPeople = people.filter((p) => selected.includes(p.id))
  const assignedIds = people.filter((r) => r.room_id && roomsById.has(r.room_id)).map((r) => r.id)

  const peoplePanel = (
    <section aria-label="People" className="dashboard-panel flex min-h-0 flex-col p-0 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-7rem)]">
      <div className="space-y-3 border-b border-neutral-200/80 p-3.5 dark:border-white/[0.06]">
        <SearchInput value={peopleQuery} onChange={setPeopleQuery} placeholder="Search name, phone, school or hall" />
        <Chips
          label="Which people"
          value={scope}
          onChange={(v) => {
            setScope(v)
            setSelected([])
          }}
          options={[
            { value: 'unassigned', label: `No room (${stats.unassigned})` },
            { value: 'assigned', label: `In a room (${stats.assigned})` },
            { value: 'all', label: 'Everyone' },
          ]}
        />
        <Chips
          label="Men or women"
          value={sexFilter}
          onChange={setSexFilter}
          options={[
            { value: 'all', label: 'All' },
            { value: 'Male', label: 'Men' },
            { value: 'Female', label: 'Women' },
          ]}
        />
      </div>

      {selected.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-neutral-200/80 bg-neutral-50 px-3.5 py-2.5 dark:border-white/[0.06] dark:bg-white/[0.03]">
          <span className="mr-auto text-sm font-medium text-neutral-900 dark:text-white">{selected.length} selected</span>
          <Button size="sm" className="h-9" disabled={rooms.length === 0} onClick={() => setPickFor(selectedPeople)}>
            Put in a room
          </Button>
          {selectedPeople.some((p) => p.room_id) ? (
            <Button size="sm" variant="outline" className="h-9" onClick={() => void assign(selected, null)}>
              Take out
            </Button>
          ) : null}
          <Button size="sm" variant="ghost" className="h-9" onClick={() => setSelected([])}>
            Clear
          </Button>
        </div>
      ) : null}

      <ul className="min-h-0 flex-1 divide-y divide-neutral-100 overflow-y-auto dark:divide-white/[0.06]">
        {peopleList.length === 0 ? (
          <li className="p-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
            {scope === 'unassigned' && !peopleQuery ? 'Everyone has a room.' : 'Nobody matches.'}
          </li>
        ) : (
          peopleList.slice(0, 300).map((p) => {
            const room = p.room_id ? roomsById.get(p.room_id) : null
            const checked = selected.includes(p.id)
            return (
              <li key={p.id} className={cn('flex items-center gap-3 px-3.5 py-2.5', checked && 'bg-brand-50/60 dark:bg-brand-400/[0.06]')}>
                <Checkbox
                  checked={checked}
                  onCheckedChange={(v) => setSelected((prev) => (v ? [...prev, p.id] : prev.filter((id) => id !== p.id)))}
                  aria-label={`Select ${displayName(p)}`}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">{displayName(p)}</p>
                  <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                    {[p.sex, p.role, p.address_school_work || p.residence].filter(Boolean).join(' · ') || 'No details'}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={room ? 'outline' : 'default'}
                  className="h-9 max-w-[9rem] shrink-0"
                  disabled={rooms.length === 0}
                  onClick={() => setPickFor([p])}
                  title={room ? `In ${room.name}. Tap to move.` : 'Choose a room'}
                >
                  <span className="truncate">{room ? room.name : 'Place'}</span>
                </Button>
              </li>
            )
          })
        )}
        {peopleList.length > 300 ? (
          <li className="p-3 text-center text-xs text-neutral-500 dark:text-neutral-400">Showing 300 of {peopleList.length}. Search to narrow down.</li>
        ) : null}
      </ul>
    </section>
  )

  const roomsPanel = (
    <section aria-label="Rooms" className="min-w-0 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="sm:w-72">
          <SearchInput value={roomQuery} onChange={setRoomQuery} placeholder="Search rooms or buildings" />
        </div>
        <Chips
          label="Which rooms"
          value={roomFilter}
          onChange={setRoomFilter}
          options={[
            { value: 'all', label: 'All' },
            { value: 'space', label: 'Has space' },
            { value: 'full', label: 'Full' },
            { value: 'Male', label: 'Men' },
            { value: 'Female', label: 'Women' },
            { value: 'Mixed', label: 'Mixed' },
          ]}
        />
      </div>

      {rooms.length === 0 ? (
        <div className="dashboard-panel p-8 text-center">
          <p className="font-medium text-neutral-900 dark:text-white">No rooms yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-neutral-600 dark:text-neutral-400">
            Add a block of numbered rooms in one go, for example Room 1 to Room 20 in Block A, 4 beds each.
          </p>
          <Button className="mt-4 h-11" onClick={() => setFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add rooms
          </Button>
        </div>
      ) : roomGroups.length === 0 ? (
        <p className="py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">No rooms match.</p>
      ) : (
        roomGroups.map((group) => {
          const beds = group.rooms.reduce((n, r) => n + r.capacity, 0)
          const used = group.rooms.reduce((n, r) => n + (occupancy.get(r.id) ?? 0), 0)
          return (
            <div key={group.building} className="space-y-2.5">
              <h2 className="flex items-baseline gap-2">
                <span className="app-section-title">{group.building}</span>
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  {group.rooms.length} {group.rooms.length === 1 ? 'room' : 'rooms'} · {Math.max(0, beds - used)} beds free
                </span>
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                {group.rooms.map((room) => {
                  const occupants = occupantsByRoom.get(room.id) ?? []
                  return (
                    <RoomTile
                      key={room.id}
                      room={room}
                      occupants={occupants}
                      yearId={campYear.id}
                      busy={busyRoomIds.has(room.id)}
                      onAddPeople={() => setAddTo(room)}
                      onRemove={(reg) => void assign([reg.id], null)}
                      onMove={(reg) => setPickFor([reg])}
                      onSetLeader={(reg) => void setLeader(room, reg)}
                      onEdit={() => {
                        setEditingRoom(room)
                        setFormOpen(true)
                      }}
                      onDelete={() => void deleteRoom(room)}
                      onSms={() => void textRoom(occupants.map((o) => o.id), room.name)}
                    />
                  )
                })}
              </div>
            </div>
          )
        })
      )}
    </section>
  )

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 sm:space-y-5">
      <CampAdminPageHeader
        title="Rooms"
        campYear={campYear}
        actions={
          <>
            <Select value={campYear.id} onValueChange={(id) => router.push(`/admin/camp-meeting/rooms?year=${id}`)}>
              <SelectTrigger className="h-10 w-[8.5rem]" aria-label="Camp year">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map((y) => (
                  <SelectItem key={y.id} value={y.id}>
                    {y.year}
                    {y.id === activeYear?.id ? ' (current)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button className="h-10" onClick={() => { setEditingRoom(null); setFormOpen(true) }}>
              <Plus className="mr-2 h-4 w-4" /> Add rooms
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-10 gap-1">
                  More <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuItem className="min-h-10 gap-2" disabled={randomizing || rooms.length === 0 || stats.unassigned === 0} onSelect={() => void autoAssign()}>
                  <Shuffle className="h-4 w-4" /> Fill rooms automatically ({stats.unassigned} without a room)
                </DropdownMenuItem>
                <DropdownMenuItem className="min-h-10 gap-2" disabled={assignedIds.length === 0} onSelect={() => void textRoom(assignedIds, 'everyone with a room')}>
                  <MessageSquare className="h-4 w-4" /> Text everyone their room ({assignedIds.length})
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="min-h-10 gap-2" onSelect={() => void loadData(campYear)}>
                  <RefreshCw className="h-4 w-4" /> Refresh
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      {!viewingActive ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200">
          You are looking at {campYear.year}, not the current camp.
          {activeYear ? (
            <button type="button" className="ml-2 font-medium underline" onClick={() => router.push(`/admin/camp-meeting/rooms?year=${activeYear.id}`)}>
              Go to {activeYear.year}
            </button>
          ) : null}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Rooms" value={stats.rooms} />
        <StatCard label="Beds free" value={stats.freeBeds} sub={`of ${stats.totalBeds}`} />
        <StatCard label="In a room" value={stats.assigned} tone="success" />
        <StatCard label="Without a room" value={stats.unassigned} tone={stats.unassigned > 0 ? 'warning' : 'default'} />
      </div>

      {/* Phones: one panel at a time */}
      <div className="flex gap-1 rounded-lg bg-neutral-200/60 p-1 text-sm dark:bg-white/[0.06] lg:hidden" role="tablist">
        {(['rooms', 'people'] as const).map((p) => (
          <button
            key={p}
            type="button"
            role="tab"
            aria-selected={mobilePanel === p}
            onClick={() => setMobilePanel(p)}
            className={cn(
              'min-h-10 flex-1 rounded-md font-medium',
              mobilePanel === p ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-800 dark:text-white' : 'text-neutral-600 dark:text-neutral-400'
            )}
          >
            {p === 'rooms' ? `Rooms (${stats.rooms})` : `People (${stats.unassigned} without a room)`}
          </button>
        ))}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(320px,380px)_1fr]">
        <div className={cn(mobilePanel !== 'people' && 'hidden lg:block')}>{peoplePanel}</div>
        <div className={cn(mobilePanel !== 'rooms' && 'hidden lg:block')}>{roomsPanel}</div>
      </div>

      <RoomFormDialog
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o)
          if (!o) setEditingRoom(null)
        }}
        editing={editingRoom}
        existingNames={rooms.map((r) => r.name)}
        buildings={buildings}
        saving={savingRooms}
        onSave={(d) => void saveRooms(d)}
      />
      <PickRoomDialog
        open={Boolean(pickFor)}
        onOpenChange={(o) => !o && setPickFor(null)}
        people={pickFor ?? []}
        rooms={rooms}
        occupancy={occupancy}
        onPick={(roomId) => {
          const ids = (pickFor ?? []).map((p) => p.id)
          setPickFor(null)
          void assign(ids, roomId)
        }}
      />
      <AddPeopleDialog
        open={Boolean(addTo)}
        onOpenChange={(o) => !o && setAddTo(null)}
        room={addTo}
        freeBeds={addTo ? Math.max(0, addTo.capacity - (occupancy.get(addTo.id) ?? 0)) : 0}
        people={people}
        roomsById={roomsById}
        onAdd={(ids) => {
          const roomId = addTo?.id ?? null
          setAddTo(null)
          if (roomId) void assign(ids, roomId)
        }}
      />
    </div>
  )
}

export default function CampRoomsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center">
          <LoadingSpinner />
        </div>
      }
    >
      <CampRoomsPageContent />
    </Suspense>
  )
}
