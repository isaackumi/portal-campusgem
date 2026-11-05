'use client'

import { useEffect, useState } from 'react'
import { History, KeyRound, Link2, MessageSquare, Phone } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading'
import { listAccessHistory } from '@/lib/actions/access'
import type { AccessLogEntry, AccessLogKind } from '@/lib/convex/auth-bridge'
import { PERMISSION_LABELS, ROLE_LABELS, isPermission, isUserRole } from '@/lib/auth/roles'
import { formatDateTime, getRelativeTime } from '@/lib/utils'
import { cn } from '@/lib/utils'

const KIND_ICON: Record<AccessLogKind, typeof KeyRound> = {
  access: KeyRound,
  secondary_phone: Phone,
  link_duplicate: Link2,
  signin_text: MessageSquare,
}

function roleLabel(role?: string): string {
  return role && isUserRole(role) ? ROLE_LABELS[role] : (role ?? '')
}

function permissionLabel(p: string): string {
  return isPermission(p) ? PERMISSION_LABELS[p] : p
}

function describe(entry: AccessLogEntry, showPerson: boolean): string {
  const who = showPerson ? entry.user_name : 'them'
  switch (entry.kind) {
    case 'access':
      if (entry.from_role && entry.to_role && entry.from_role !== entry.to_role) {
        return `changed ${who} from ${roleLabel(entry.from_role)} to ${roleLabel(entry.to_role)}`
      }
      return `changed permissions for ${who}`
    case 'secondary_phone':
      return `updated the sign-in phone for ${who}`
    case 'link_duplicate':
      return `merged a duplicate record into ${who}`
    case 'signin_text':
      return `texted ${who} how to sign in`
  }
}

/**
 * Who changed whose access, and when. Pass `userId` for one person's history.
 * Change `reloadKey` to refetch after a save.
 */
export function AccessHistoryList({
  userId,
  limit = 50,
  reloadKey = 0,
  emptyText = 'No access changes recorded yet.',
  className,
}: {
  userId?: string
  limit?: number
  reloadKey?: number
  emptyText?: string
  className?: string
}) {
  const [entries, setEntries] = useState<AccessLogEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    listAccessHistory(userId, limit).then((res) => {
      if (cancelled) return
      setEntries(res.data)
      setError(res.error)
    })
    return () => {
      cancelled = true
    }
  }, [userId, limit, reloadKey])

  if (entries === null) {
    return (
      <div className={cn('flex justify-center py-6', className)}>
        <LoadingSpinner size="sm" />
      </div>
    )
  }
  if (error) {
    return <p className={cn('py-4 text-sm text-red-600 dark:text-red-400', className)}>{error}</p>
  }
  if (entries.length === 0) {
    return <p className={cn('py-4 text-sm text-neutral-500 dark:text-neutral-400', className)}>{emptyText}</p>
  }

  return (
    <ol className={cn('divide-y divide-neutral-100 dark:divide-white/[0.06]', className)}>
      {entries.map((entry) => {
        const Icon = KIND_ICON[entry.kind] ?? History
        return (
          <li key={entry.id} className="flex gap-3 py-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500 dark:bg-white/[0.06] dark:text-neutral-400">
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1 space-y-1.5">
              <p className="text-sm text-neutral-800 dark:text-neutral-200">
                <span className="font-semibold text-neutral-900 dark:text-white">{entry.actor_name}</span>{' '}
                {describe(entry, !userId)}
              </p>
              {entry.note && <p className="text-xs text-neutral-500 dark:text-neutral-400">{entry.note}</p>}
              {(entry.added.length > 0 || entry.removed.length > 0) && (
                <div className="flex flex-wrap gap-1">
                  {entry.added.map((p) => (
                    <Badge key={`+${p}`} variant="success" className="font-normal">
                      + {permissionLabel(p)}
                    </Badge>
                  ))}
                  {entry.removed.map((p) => (
                    <Badge key={`-${p}`} variant="danger" className="font-normal">
                      − {permissionLabel(p)}
                    </Badge>
                  ))}
                </div>
              )}
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                <time dateTime={new Date(entry.at).toISOString()} title={formatDateTime(new Date(entry.at))}>
                  {getRelativeTime(new Date(entry.at))}
                </time>
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
