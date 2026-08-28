'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { getActiveCampYear } from '@/lib/actions/camp'
import { campService } from '@/lib/services/camp-service'
import type { CampRegistration, CampRoom, CampYear } from '@/lib/types'
import { campRegistrationDisplayName } from '@/lib/camp/manual-check-in-search'
import { CampAdminPageHeader } from '@/components/camp/camp-admin-page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { BedDouble, Crown, Plus, RefreshCw, Shuffle, Trash2, Users } from 'lucide-react'

const GENDER_OPTIONS = ['Mixed', 'Male', 'Female'] as const

export default function CampRoomsPage() {
  const { toast } = useToast()
  const [campYear, setCampYear] = useState<CampYear | null>(null)
  const [rooms, setRooms] = useState<CampRoom[]>([])
  const [registrations, setRegistrations] = useState<CampRegistration[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [randomizing, setRandomizing] = useState(false)
  const [leaderSavingRoomId, setLeaderSavingRoomId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [building, setBuilding] = useState('')
  const [capacity, setCapacity] = useState('4')
  const [gender, setGender] = useState<(typeof GENDER_OPTIONS)[number]>('Mixed')
  const [notes, setNotes] = useState('')

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
      const { data } = await getActiveCampYear()
      setCampYear(data ?? null)
      if (data) await loadData(data)
      setLoading(false)
    })()
  }, [loadData])

  const occupantsByRoom = useMemo(() => {
    const map = new Map<string, CampRegistration[]>()
    for (const reg of registrations) {
      if (!reg.room_id || reg.status === 'cancelled') continue
      const list = map.get(reg.room_id) ?? []
      list.push(reg)
      map.set(reg.room_id, list)
    }
    for (const list of Array.from(map.values())) {
      list.sort((a, b) => campRegistrationDisplayName(a).localeCompare(campRegistrationDisplayName(b)))
    }
    return map
  }, [registrations])

  const unassigned = useMemo(
    () =>
      registrations.filter(
        (reg) => !reg.room_id && reg.status !== 'cancelled'
      ),
    [registrations]
  )

  const stats = useMemo(() => {
    const assigned = registrations.filter((r) => r.room_id && r.status !== 'cancelled').length
    const totalBeds = rooms.reduce((sum, room) => sum + room.capacity, 0)
    const usedBeds = assigned
    return {
      roomCount: rooms.length,
      assigned,
      unassigned: unassigned.length,
      totalBeds,
      usedBeds,
    }
  }, [registrations, rooms, unassigned.length])

  async function handleCreateRoom() {
    if (!campYear || !name.trim()) {
      toast({ variant: 'destructive', title: 'Room name required' })
      return
    }
    setCreating(true)
    const { data, error } = await campService.createRoom({
      camp_year_id: campYear.id,
      name: name.trim(),
      building: building.trim() || undefined,
      capacity: Number(capacity) || 4,
      gender: gender === 'Mixed' ? 'Mixed' : gender,
      notes: notes.trim() || undefined,
    })
    setCreating(false)
    if (error || !data) {
      toast({ variant: 'destructive', title: 'Create failed', description: error ?? undefined })
      return
    }
    setCreateOpen(false)
    setName('')
    setBuilding('')
    setCapacity('4')
    setGender('Mixed')
    setNotes('')
    toast({ title: 'Room created', description: data.name })
    await loadData(campYear)
  }

  async function handleDeleteRoom(room: CampRoom) {
    if (!campYear) return
    if (!window.confirm(`Delete ${room.name}? Campers in this room will be unassigned.`)) return
    const { data, error } = await campService.deleteRoom(room.id)
    if (error || !data) {
      toast({ variant: 'destructive', title: 'Delete failed', description: error ?? undefined })
      return
    }
    toast({
      title: 'Room deleted',
      description: data.unassigned > 0 ? `${data.unassigned} camper(s) unassigned.` : undefined,
    })
    await loadData(campYear)
  }

  async function handleAssign(registrationId: string, roomId: string | null) {
    if (!campYear) return
    setAssigning(true)
    const { error } = await campService.assignRegistrationRoom({
      registration_id: registrationId,
      room_id: roomId,
    })
    setAssigning(false)
    if (error) {
      toast({ variant: 'destructive', title: 'Assignment failed', description: error })
      return
    }
    await loadData(campYear)
  }

  async function handleSetLeader(roomId: string, registrationId: string | null) {
    setLeaderSavingRoomId(roomId)
    const { error } = await campService.setRoomLeader({
      room_id: roomId,
      registration_id: registrationId,
    })
    setLeaderSavingRoomId(null)
    if (error) {
      toast({ variant: 'destructive', title: 'Could not set leader', description: error })
      return
    }
    toast({ title: 'Room leader updated' })
    if (campYear) await loadData(campYear)
  }

  async function handleRandomAssign() {
    if (!campYear) return
    if (rooms.length === 0) {
      toast({ variant: 'destructive', title: 'Create rooms first' })
      return
    }
    setRandomizing(true)
    const { data, error } = await campService.randomAssignRooms({
      camp_year_id: campYear.id,
      respect_gender: true,
      only_unassigned: true,
    })
    setRandomizing(false)
    if (error || !data) {
      toast({ variant: 'destructive', title: 'Random assign failed', description: error ?? undefined })
      return
    }
    toast({
      title: 'Random assignment complete',
      description: `${data.assigned} assigned${data.skipped ? `, ${data.skipped} skipped (no space)` : ''}.`,
    })
    await loadData(campYear)
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (!campYear) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No active camp year.</p>
            <Button className="mt-4" asChild>
              <Link href="/admin/camp-meeting/years">Manage camp years</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="mx-auto max-w-7xl space-y-6 p-6">
        <CampAdminPageHeader
          title="Camp rooms & roommates"
          campYear={campYear}
          actions={
            <>
              <Button variant="outline" asChild>
                <Link href="/admin/camp-meeting/scan">Check-in hub</Link>
              </Button>
              <Button variant="outline" onClick={() => void loadData(campYear)}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </>
          }
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Rooms</p>
              <p className="text-3xl font-bold">{stats.roomCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Assigned campers</p>
              <p className="text-3xl font-bold text-green-700">{stats.assigned}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Unassigned</p>
              <p className="text-3xl font-bold text-amber-700">{stats.unassigned}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Beds used</p>
              <p className="text-3xl font-bold">
                {stats.usedBeds}/{stats.totalBeds || '—'}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap gap-2">
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add room
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create room</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="room-name">Room name</Label>
                  <Input
                    id="room-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Room 12, Block A-3…"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="room-building">Building / block</Label>
                  <Input
                    id="room-building"
                    value={building}
                    onChange={(e) => setBuilding(e.target.value)}
                    placeholder="Girls dorm, Main hall…"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="room-capacity">Capacity (beds)</Label>
                    <Input
                      id="room-capacity"
                      type="number"
                      min={1}
                      value={capacity}
                      onChange={(e) => setCapacity(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Gender</Label>
                    <Select value={gender} onValueChange={(v) => setGender(v as typeof gender)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {GENDER_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="room-notes">Notes</Label>
                  <Textarea
                    id="room-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="Near chapel, leaders room…"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => void handleCreateRoom()} disabled={creating}>
                  {creating ? 'Creating…' : 'Create room'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button
            variant="secondary"
            disabled={randomizing || rooms.length === 0}
            onClick={() => void handleRandomAssign()}
          >
            {randomizing ? (
              <LoadingSpinner className="mr-2 h-4 w-4" />
            ) : (
              <Shuffle className="mr-2 h-4 w-4" />
            )}
            Random assign unassigned
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {rooms.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No rooms yet. Add rooms, then assign campers manually or use random assign.
                </CardContent>
              </Card>
            ) : (
              rooms.map((room) => {
                const occupants = occupantsByRoom.get(room.id) ?? []
                const leaderId = room.room_leader_id ?? null
                return (
                  <Card key={room.id}>
                    <CardHeader className="pb-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <CardTitle className="flex items-center gap-2 text-lg">
                            <BedDouble className="h-5 w-5" />
                            {room.name}
                            {leaderId ? (
                              <Badge className="gap-1 text-xs">
                                <Crown className="h-3 w-3" />
                                Leader set
                              </Badge>
                            ) : null}
                          </CardTitle>
                          <CardDescription>
                            {room.building ? `${room.building} · ` : ''}
                            {occupants.length}/{room.capacity} beds
                            {room.gender ? ` · ${room.gender}` : ''}
                          </CardDescription>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => void handleDeleteRoom(room)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {room.notes ? (
                        <p className="text-sm text-muted-foreground">{room.notes}</p>
                      ) : null}
                      {occupants.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-slate-800">Room leader</p>
                          <Select
                            value={leaderId ?? '__none__'}
                            disabled={leaderSavingRoomId === room.id}
                            onValueChange={(v) =>
                              void handleSetLeader(room.id, v === '__none__' ? null : v)
                            }
                          >
                            <SelectTrigger className="min-h-10">
                              <SelectValue placeholder="Choose room leader…" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">No leader assigned</SelectItem>
                              {occupants.map((reg) => (
                                <SelectItem key={reg.id} value={reg.id}>
                                  {campRegistrationDisplayName(reg)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : null}
                      {occupants.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No campers assigned yet.</p>
                      ) : (
                        <ul className="space-y-2">
                          {occupants.map((reg) => (
                            <li
                              key={reg.id}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-slate-50 px-3 py-2 text-sm"
                            >
                              <div>
                                <p className="font-medium">
                                  {campRegistrationDisplayName(reg)}
                                  {reg.id === leaderId ? (
                                    <Badge className="ml-2 gap-1 align-middle text-xs">
                                      <Crown className="h-3 w-3" />
                                      Leader
                                    </Badge>
                                  ) : null}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {reg.role}
                                  {reg.sex ? ` · ${reg.sex}` : ''}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <Button variant="outline" size="sm" asChild>
                                  <Link href={`/admin/camp-meeting/registrations/${reg.id}?year=${campYear.id}`}>
                                    View
                                  </Link>
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={assigning}
                                  onClick={() => void handleAssign(reg.id, null)}
                                >
                                  Unassign
                                </Button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>

          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Unassigned campers
              </CardTitle>
              <CardDescription>
                Assign each person to a room. Roommates share the same room.
              </CardDescription>
            </CardHeader>
            <CardContent className="max-h-[70vh] space-y-3 overflow-y-auto">
              {unassigned.length === 0 ? (
                <p className="text-sm text-muted-foreground">Everyone has a room.</p>
              ) : (
                unassigned.map((reg) => (
                  <div key={reg.id} className="space-y-2 rounded-lg border p-3">
                    <div>
                      <p className="font-medium">{campRegistrationDisplayName(reg)}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <Badge variant="outline" className="text-xs">
                          {reg.role}
                        </Badge>
                        {reg.sex ? (
                          <Badge variant="secondary" className="text-xs">
                            {reg.sex}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                    <Select
                      disabled={assigning || rooms.length === 0}
                      onValueChange={(roomId) => void handleAssign(reg.id, roomId)}
                    >
                      <SelectTrigger className="min-h-10">
                        <SelectValue placeholder="Assign to room…" />
                      </SelectTrigger>
                      <SelectContent>
                        {rooms.map((room) => {
                          const count = occupantsByRoom.get(room.id)?.length ?? 0
                          const full = count >= room.capacity
                          return (
                            <SelectItem key={room.id} value={room.id} disabled={full}>
                              {room.name} ({count}/{room.capacity})
                              {full ? ' — full' : ''}
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
