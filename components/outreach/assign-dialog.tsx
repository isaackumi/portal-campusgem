'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { LoadingSpinner } from '@/components/ui/loading'
import { cn } from '@/lib/utils'
import { GROUP_MEMBERSHIP_ROLE_LABELS } from '@/lib/constants/groups'
import type { OutreachAssignee } from '@/lib/actions/outreach'
import type { GroupMembership } from '@/lib/types'

/**
 * Pick campus members: one ("Assign to…") or several ("Share out evenly"). Searchable; each
 * row shows how many open follow-ups the person already has.
 */
export function AssignDialog({
  open,
  onOpenChange,
  mode,
  people,
  loading,
  count,
  onPick,
  busy,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'one' | 'many'
  people: OutreachAssignee[] | undefined
  loading: boolean
  /** How many contacts are being given out ("unassigned" when sharing all of them). */
  count: number | 'unassigned'
  onPick: (picked: OutreachAssignee[]) => void
  busy?: boolean
}) {
  const [q, setQ] = useState('')
  const [picked, setPicked] = useState<string[]>([])

  useEffect(() => {
    if (open) {
      setQ('')
      setPicked([])
    }
  }, [open])

  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    return (people ?? []).filter((p) => !s || p.name.toLowerCase().includes(s))
  }, [people, q])

  const what = count === 'unassigned' ? 'everyone not yet assigned' : `${count} ${count === 1 ? 'person' : 'people'}`

  function tap(p: OutreachAssignee) {
    if (mode === 'one') {
      onPick([p])
      return
    }
    setPicked((cur) => (cur.includes(p.user_id) ? cur.filter((x) => x !== p.user_id) : [...cur, p.user_id]))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid-cols-1 sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader className="min-w-0 text-left">
          <DialogTitle>{mode === 'one' ? 'Assign to…' : 'Share out evenly'}</DialogTitle>
          <DialogDescription className="break-words">
            {mode === 'one'
              ? `Who will follow up ${what}?`
              : `Pick the people who will follow up ${what}. They are split so everyone ends up with a similar number.`}
          </DialogDescription>
        </DialogHeader>
        <div className="relative min-w-0">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" aria-hidden />
          <Input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search campus members"
            className="h-12 pl-9 text-base sm:h-12 sm:text-base"
            aria-label="Search campus members"
          />
        </div>
        {loading ? (
          <div className="flex justify-center py-6">
            <LoadingSpinner />
          </div>
        ) : list.length === 0 ? (
          <p className="py-4 text-sm text-neutral-600 dark:text-neutral-400">
            {people?.length ? 'Nobody matches that name.' : 'This campus has no active members yet. Add them on the campus page.'}
          </p>
        ) : (
          <ul className="grid min-w-0 grid-cols-1 divide-y divide-neutral-100 overflow-hidden rounded-xl border border-neutral-200/80 dark:divide-white/[0.06] dark:border-white/[0.08]">
            {list.map((p) => {
              const on = picked.includes(p.user_id)
              return (
                <li key={p.user_id} className="min-w-0">
                  <button
                    type="button"
                    onClick={() => tap(p)}
                    disabled={busy}
                    aria-pressed={mode === 'many' ? on : undefined}
                    className={cn(
                      'grid min-h-14 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2 text-left transition-colors',
                      on ? 'bg-brand-50 dark:bg-brand-500/10' : 'hover:bg-neutral-50 dark:hover:bg-white/[0.04]'
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block break-words text-[15px] font-medium text-neutral-900 dark:text-neutral-100">{p.name}</span>
                      <span className="block text-[13px] text-neutral-500 dark:text-neutral-400">
                        {GROUP_MEMBERSHIP_ROLE_LABELS[p.role as GroupMembership['role']] ?? p.role} · {p.open} open
                      </span>
                    </span>
                    {mode === 'many' ? (
                      <span
                        className={cn(
                          'flex h-6 w-6 items-center justify-center rounded-md border',
                          on ? 'border-brand-600 bg-brand-600 text-white dark:border-brand-500 dark:bg-brand-500' : 'border-neutral-300 dark:border-white/20'
                        )}
                        aria-hidden
                      >
                        {on ? <Check className="h-4 w-4" /> : null}
                      </span>
                    ) : null}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        {mode === 'many' ? (
          <div className="sticky bottom-[calc(-1.25rem-env(safe-area-inset-bottom))] -mx-5 -mb-5 border-t border-neutral-200/80 bg-white px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 dark:border-white/[0.08] dark:bg-neutral-900 sm:-bottom-6 sm:-mx-6 sm:-mb-6 sm:px-6">
            <Button
              type="button"
              className="h-12 w-full text-base"
              disabled={picked.length === 0 || busy}
              onClick={() => onPick((people ?? []).filter((p) => picked.includes(p.user_id)))}
            >
              {busy ? <LoadingSpinner size="sm" className="mr-2" /> : null}
              {picked.length === 0 ? 'Pick people' : `Share between ${picked.length} ${picked.length === 1 ? 'person' : 'people'}`}
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
