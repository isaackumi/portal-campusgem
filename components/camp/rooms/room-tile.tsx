'use client'

import Link from 'next/link'
import { MessageSquare, MoreHorizontal, Pencil, Plus, Trash2, UserMinus, ArrowRightLeft, UserCheck, ExternalLink } from 'lucide-react'
import type { CampRegistration, CampRoom } from '@/lib/types'
import { displayName, genderLabel } from '@/lib/camp/rooms-board'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Meter } from '@/components/ui/meter'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

const genderTone: Record<string, string> = {
  Male: 'bg-sky-50 text-sky-800 ring-sky-600/20 dark:bg-sky-400/10 dark:text-sky-300 dark:ring-sky-400/20',
  Female: 'bg-rose-50 text-rose-800 ring-rose-600/20 dark:bg-rose-400/10 dark:text-rose-300 dark:ring-rose-400/20',
  Mixed: 'bg-neutral-100 text-neutral-700 ring-neutral-500/20 dark:bg-white/[0.06] dark:text-neutral-300 dark:ring-white/10',
}

export function GenderChip({ gender, className }: { gender?: string | null; className?: string }) {
  const g = gender === 'Male' || gender === 'Female' ? gender : 'Mixed'
  return (
    <span className={cn('inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset', genderTone[g], className)}>
      {genderLabel(g)}
    </span>
  )
}

/**
 * One room on the board: beds used, who is in it (each bed a row), empty beds you can
 * click to add people, and the room's actions in one menu.
 */
export function RoomTile({
  room,
  occupants,
  yearId,
  busy,
  highlight,
  onAddPeople,
  onRemove,
  onMove,
  onSetLeader,
  onEdit,
  onDelete,
  onSms,
}: {
  room: CampRoom
  occupants: CampRegistration[]
  yearId: string
  busy?: boolean
  /** Dim rooms that don't match the person being placed. */
  highlight?: 'fit' | 'nofit' | null
  onAddPeople: () => void
  onRemove: (reg: CampRegistration) => void
  onMove: (reg: CampRegistration) => void
  onSetLeader: (reg: CampRegistration | null) => void
  onEdit: () => void
  onDelete: () => void
  onSms: () => void
}) {
  const used = occupants.length
  const free = Math.max(0, room.capacity - used)
  const full = free === 0
  const leaderId = room.room_leader_id ?? null

  return (
    <article
      className={cn(
        'dashboard-panel flex flex-col p-3.5 transition-opacity',
        highlight === 'nofit' && 'opacity-50',
        busy && 'pointer-events-none opacity-70'
      )}
      aria-label={`${room.name}, ${used} of ${room.capacity} beds`}
    >
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-semibold text-neutral-900 dark:text-white">{room.name}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <GenderChip gender={room.gender} />
            <span className={cn('text-xs tabular-nums', full ? 'font-medium text-amber-700 dark:text-amber-300' : 'text-neutral-500 dark:text-neutral-400')}>
              {full ? 'Full' : `${free} free`} · {used}/{room.capacity}
            </span>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="-mr-1.5 -mt-1 h-9 w-9 shrink-0" aria-label={`${room.name} actions`}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem className="min-h-10 gap-2" onSelect={onEdit}>
              <Pencil className="h-4 w-4" /> Edit room
            </DropdownMenuItem>
            <DropdownMenuItem className="min-h-10 gap-2" disabled={used === 0} onSelect={onSms}>
              <MessageSquare className="h-4 w-4" /> Text room details
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="min-h-10 gap-2 text-red-600 focus:text-red-700 dark:text-red-400" onSelect={onDelete}>
              <Trash2 className="h-4 w-4" /> Delete room
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <Meter
        className="mt-2.5 h-1.5"
        value={used}
        max={room.capacity}
        tone={full ? 'warning' : 'brand'}
        label={`${room.name} beds filled`}
      />

      <ul className="mt-3 space-y-1">
        {occupants.map((reg) => {
          const name = displayName(reg)
          const isLeader = reg.id === leaderId
          return (
            <li key={reg.id}>
              <DropdownMenu>
                <DropdownMenuTrigger className="group flex min-h-9 w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 dark:hover:bg-white/[0.06]">
                  <span className="min-w-0 flex-1 truncate text-neutral-800 dark:text-neutral-200">{name}</span>
                  {isLeader ? (
                    <Badge variant="secondary" className="shrink-0 px-1.5 py-0 text-[11px] font-medium">
                      Leader
                    </Badge>
                  ) : null}
                  {reg.status === 'checked_in' ? (
                    <span className="shrink-0 text-[11px] text-emerald-700 dark:text-emerald-400">In</span>
                  ) : null}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuLabel className="truncate text-xs font-normal text-neutral-500 dark:text-neutral-400">
                    {name}
                    {reg.sex ? ` · ${reg.sex}` : ''}
                  </DropdownMenuLabel>
                  <DropdownMenuItem className="min-h-10 gap-2" onSelect={() => onSetLeader(isLeader ? null : reg)}>
                    <UserCheck className="h-4 w-4" /> {isLeader ? 'Remove as room leader' : 'Make room leader'}
                  </DropdownMenuItem>
                  <DropdownMenuItem className="min-h-10 gap-2" onSelect={() => onMove(reg)}>
                    <ArrowRightLeft className="h-4 w-4" /> Move to another room
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="min-h-10 gap-2">
                    <Link href={`/admin/camp-meeting/registrations/${reg.id}?year=${yearId}`}>
                      <ExternalLink className="h-4 w-4" /> Open registration
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="min-h-10 gap-2" onSelect={() => onRemove(reg)}>
                    <UserMinus className="h-4 w-4" /> Take out of room
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          )
        })}
        {free > 0 ? (
          <li>
            <button
              type="button"
              onClick={onAddPeople}
              className="flex min-h-9 w-full items-center gap-2 rounded-md border border-dashed border-neutral-300 px-2 py-1 text-sm text-neutral-500 hover:border-brand-400 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 dark:border-white/15 dark:text-neutral-400 dark:hover:border-brand-400/60 dark:hover:text-brand-300"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              {free === 1 ? 'Add 1 person' : `Add people (${free} beds free)`}
            </button>
          </li>
        ) : null}
      </ul>

      {room.notes ? <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">{room.notes}</p> : null}
    </article>
  )
}
