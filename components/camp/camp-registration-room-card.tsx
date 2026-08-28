'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { CampRegistration, CampRegistrationRoomContext } from '@/lib/types'
import { campRegistrationDisplayName } from '@/lib/camp/manual-check-in-search'
import {
  formatCamperCheckInLines,
  getCamperCheckInIdentity,
} from '@/lib/camp/check-in-identity'
import { campService } from '@/lib/services/camp-service'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LoadingSpinner } from '@/components/ui/loading'
import { useToast } from '@/hooks/use-toast'
import { BedDouble, Copy, Crown, Users } from 'lucide-react'

type Props = {
  registration: CampRegistration
  roomContext: CampRegistrationRoomContext | null
  loading?: boolean
  canManageLeader?: boolean
  onUpdated?: () => void
}

function buildRoomShareText(
  registration: CampRegistration,
  roomContext: CampRegistrationRoomContext
): string {
  const room = roomContext.room!
  const identity = getCamperCheckInIdentity(registration)
  const leader = roomContext.occupants.find((o) => o.id === roomContext.room_leader_id)
  const mates = roomContext.occupants
    .filter((o) => o.id !== registration.id)
    .map((o) => campRegistrationDisplayName(o))
  const lines = [
    `Camp room for ${identity.name}`,
    ...formatCamperCheckInLines(identity),
    `Room: ${room.name}${room.building ? ` (${room.building})` : ''}`,
  ]
  if (leader) lines.push(`Room leader: ${campRegistrationDisplayName(leader)}`)
  if (mates.length) lines.push(`Roommates: ${mates.join(', ')}`)
  return lines.join('\n')
}

export function CampRegistrationRoomCard({
  registration,
  roomContext,
  loading = false,
  canManageLeader = true,
  onUpdated,
}: Props) {
  const { toast } = useToast()
  const [savingLeader, setSavingLeader] = useState(false)

  const room = roomContext?.room ?? null
  const occupants = roomContext?.occupants ?? []
  const leaderId = roomContext?.room_leader_id ?? null

  const leaderSelectValue = useMemo(() => leaderId ?? '__none__', [leaderId])
  const checkInIdentity = useMemo(() => getCamperCheckInIdentity(registration), [registration])

  async function copyRoomDetails() {
    if (!roomContext?.room) return
    try {
      await navigator.clipboard.writeText(buildRoomShareText(registration, roomContext))
      toast({ title: 'Copied', description: 'Room details copied — paste into WhatsApp or SMS.' })
    } catch {
      toast({ variant: 'destructive', title: 'Copy failed' })
    }
  }

  async function handleLeaderChange(value: string) {
    if (!room) return
    setSavingLeader(true)
    const { error } = await campService.setRoomLeader({
      room_id: room.id,
      registration_id: value === '__none__' ? null : value,
    })
    setSavingLeader(false)
    if (error) {
      toast({ variant: 'destructive', title: 'Could not set leader', description: error })
      return
    }
    toast({ title: 'Room leader updated' })
    onUpdated?.()
  }

  return (
    <Card className="border-2 border-indigo-200">
      <CardHeader className="border-b bg-indigo-50/60">
        <CardTitle className="flex items-center gap-2">
          <BedDouble className="h-5 w-5 text-indigo-700" />
          Room assignment
        </CardTitle>
        <CardDescription>
          Share this with the camper — name, phone, check-in code, room, and roommates.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {loading ? (
          <div className="flex justify-center py-6">
            <LoadingSpinner />
          </div>
        ) : !room ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-muted-foreground">
            Not assigned to a room yet.{' '}
            <Link href="/admin/camp-meeting/rooms" className="font-medium text-indigo-700 underline">
              Assign on the rooms page
            </Link>
            .
          </div>
        ) : (
          <>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-600">
                Check-in at desk
              </p>
              <p className="mt-1 text-lg font-bold text-slate-900">{checkInIdentity.name}</p>
              {checkInIdentity.phone ? (
                <p className="text-base font-medium text-slate-800">{checkInIdentity.phone}</p>
              ) : null}
              {checkInIdentity.code ? (
                <p className="mt-2 font-mono text-xl font-bold tracking-wide text-indigo-900">
                  {checkInIdentity.code}
                </p>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">No GEM code assigned yet.</p>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                Staff can check in by code, name, or phone.
              </p>
            </div>

            <div className="rounded-lg border border-indigo-200 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-indigo-700">Your room</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{room.name}</p>
              {room.building ? (
                <p className="text-sm text-muted-foreground">{room.building}</p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                {room.gender ? <Badge variant="outline">{room.gender}</Badge> : null}
                <Badge variant="secondary">
                  {occupants.length}/{room.capacity} in room
                </Badge>
              </div>
            </div>

            {canManageLeader && occupants.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-800">Room leader</p>
                <Select
                  value={leaderSelectValue}
                  disabled={savingLeader}
                  onValueChange={(v) => void handleLeaderChange(v)}
                >
                  <SelectTrigger className="min-h-10">
                    <SelectValue placeholder="Choose room leader…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No leader assigned</SelectItem>
                    {occupants.map((occ) => (
                      <SelectItem key={occ.id} value={occ.id}>
                        {campRegistrationDisplayName(occ)}
                        {occ.id === registration.id ? ' (this camper)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="space-y-2">
              <p className="flex items-center gap-2 text-sm font-medium text-slate-800">
                <Users className="h-4 w-4" />
                Roommates ({occupants.length})
              </p>
              {occupants.length === 0 ? (
                <p className="text-sm text-muted-foreground">No one else in this room yet.</p>
              ) : (
                <ul className="space-y-2">
                  {occupants.map((occ) => {
                    const isLeader = occ.id === leaderId
                    const isSelf = occ.id === registration.id
                    return (
                      <li
                        key={occ.id}
                        className="flex items-center justify-between gap-2 rounded-md border bg-slate-50 px-3 py-2 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {campRegistrationDisplayName(occ)}
                            {isSelf ? ' (this camper)' : ''}
                          </p>
                          <p className="text-xs text-muted-foreground">{occ.role}</p>
                        </div>
                        {isLeader ? (
                          <Badge className="shrink-0 gap-1">
                            <Crown className="h-3 w-3" />
                            Leader
                          </Badge>
                        ) : null}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            <Button variant="outline" className="w-full min-h-10" onClick={() => void copyRoomDetails()}>
              <Copy className="mr-2 h-4 w-4" />
              Copy room details for camper
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
