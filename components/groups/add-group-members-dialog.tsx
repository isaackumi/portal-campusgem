'use client'

import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import type { AppUser, GroupMembership } from '@/lib/types'
import { GROUP_MEMBERSHIP_ROLES } from '@/lib/constants/groups'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

function digits(s?: string | null) {
  return (s ?? '').replace(/\D/g, '').replace(/^233/, '').replace(/^0/, '')
}

/** Search people and add one or several to a group with the same role. */
export function AddGroupMembersDialog({
  open,
  onOpenChange,
  groupName,
  candidates,
  adding,
  onAdd,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  groupName: string
  /** People not yet in the group. */
  candidates: AppUser[]
  adding: boolean
  onAdd: (userIds: string[], role: GroupMembership['role']) => void
}) {
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<string[]>([])
  const [role, setRole] = useState<GroupMembership['role']>('member')

  useEffect(() => {
    if (open) {
      setQuery('')
      setPicked([])
      setRole('member')
    }
  }, [open])

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    const rows = q
      ? candidates.filter((u) => {
          const hay = `${u.full_name} ${u.membership_id ?? ''} ${u.email ?? ''}`.toLowerCase()
          const d = digits(q)
          return q.split(/\s+/).every((w) => hay.includes(w)) || (d.length >= 3 && digits(u.phone).includes(d))
        })
      : candidates
    return [...rows].sort((a, b) => a.full_name.localeCompare(b.full_name)).slice(0, 200)
  }, [candidates, query])

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88dvh] max-w-md flex-col gap-3">
        <DialogHeader>
          <DialogTitle>Add people to {groupName}</DialogTitle>
          <DialogDescription>Search by name, phone or membership ID. Tick everyone you want to add.</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden />
          <Input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search people" aria-label="Search people" className="h-11 pl-9" />
        </div>
        <ul className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
          {list.length === 0 ? (
            <li className="py-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
              {candidates.length === 0 ? 'Everyone is already in this group.' : 'Nobody matches.'}
            </li>
          ) : (
            list.map((u) => {
              const on = picked.includes(u.id)
              return (
                <li key={u.id}>
                  <label
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5',
                      on ? 'bg-brand-50 dark:bg-brand-400/10' : 'hover:bg-neutral-100 dark:hover:bg-white/[0.06]'
                    )}
                  >
                    <Checkbox checked={on} onCheckedChange={() => toggle(u.id)} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-neutral-900 dark:text-neutral-100">{u.full_name}</span>
                      <span className="block truncate text-xs text-neutral-500 dark:text-neutral-400">
                        {[u.membership_id, u.phone].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                  </label>
                </li>
              )
            })
          )}
        </ul>
        <div className="flex items-center gap-3">
          <Label htmlFor="add-role" className="shrink-0 text-sm">
            Add as
          </Label>
          <Select value={role} onValueChange={(v) => setRole(v as GroupMembership['role'])}>
            <SelectTrigger id="add-role" className="h-11 flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GROUP_MEMBERSHIP_ROLES.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" className="h-11" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="h-11" disabled={picked.length === 0 || adding} onClick={() => onAdd(picked, role)}>
            {adding ? 'Adding…' : picked.length === 0 ? 'Choose people' : `Add ${picked.length}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
