'use client'

import type { RlcAttendancePerson } from '@/lib/rlc/attendance-roster'
import { cn } from '@/lib/utils'
import { CheckCircle, Loader2 } from 'lucide-react'

type RlcCheckInSearchHitProps = {
  person: RlcAttendancePerson
  pending?: boolean
  onCheckIn: (person: RlcAttendancePerson) => void
  className?: string
}

export function RlcCheckInSearchHit({ person, pending, onCheckIn, className }: RlcCheckInSearchHitProps) {
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => onCheckIn(person)}
      className={cn(
        'flex w-full items-center justify-between gap-3 rounded-lg border bg-white px-3 py-2 text-left transition-colors',
        'hover:border-emerald-300 hover:bg-emerald-50/60 active:bg-emerald-50',
        'disabled:cursor-default disabled:opacity-70',
        className
      )}
    >
      <div className="min-w-0">
        <p className="truncate font-medium">{person.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          <span
            className={cn(
              'font-medium',
              person.kind === 'visitor' ? 'text-sky-800' : 'text-rose-800'
            )}
          >
            {person.kind === 'visitor' ? 'Visitor' : 'Member'}
          </span>
          {person.phone ? ` · ${person.phone}` : ''}
          {person.code ? ` · ${person.code}` : ''}
        </p>
      </div>
      <span className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-emerald-700">
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving
          </>
        ) : (
          <>
            <CheckCircle className="h-4 w-4" />
            Check in
          </>
        )}
      </span>
    </button>
  )
}