'use client'

import { useEffect, useMemo, useState } from 'react'
import { Search, UserMinus, UserPlus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoadingSpinner } from '@/components/ui/loading'
import { PersonAvatar } from '@/components/ui/person'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PhoneLink, QuickContactButtons } from '@/components/contact/phone-link'
import { useToast } from '@/hooks/use-toast'
import { GROUP_MEMBERSHIP_ROLES, GROUP_MEMBERSHIP_ROLE_LABELS } from '@/lib/constants/groups'
import { groupRoleTone } from '@/lib/ui/chip-tones'
import {
  addCampusMemberAction,
  removeCampusMemberAction,
  searchPeopleForCampusAction,
  setCampusMemberRoleAction,
  type PersonHit,
} from '@/lib/actions/campuses'
import type { GroupMembership } from '@/lib/types'

const ROLE_ORDER: Record<GroupMembership['role'], number> = { leader: 0, co_leader: 1, executive: 2, volunteer: 3, member: 4 }

/** Members of one campus: search, role badges, phone links; add / change role / remove for managers. */
export function CampusMembersPanel({
  groupId,
  label,
  memberships,
  canManage,
  canAssignLeader,
  leadersOnly = false,
  onChanged,
}: {
  groupId: string
  label: string
  memberships: GroupMembership[]
  canManage: boolean
  canAssignLeader: boolean
  /** Leaders & executives tab. */
  leadersOnly?: boolean
  onChanged: () => void
}) {
  const { toast } = useToast()
  const [query, setQuery] = useState('')
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const digits = q.replace(/\D/g, '')
    return memberships
      .filter((m) => !leadersOnly || m.role !== 'member')
      .filter((m) => {
        if (!q) return true
        const u = m.member?.user
        return (
          (u?.full_name ?? '').toLowerCase().includes(q) ||
          (digits.length >= 3 && (u?.phone ?? '').replace(/\D/g, '').includes(digits)) ||
          (m.notes ?? '').toLowerCase().includes(q)
        )
      })
      .sort(
        (a, b) =>
          ROLE_ORDER[a.role] - ROLE_ORDER[b.role] ||
          (a.member?.user?.full_name ?? '').localeCompare(b.member?.user?.full_name ?? '')
      )
  }, [memberships, query, leadersOnly])

  const roleOptions = GROUP_MEMBERSHIP_ROLES.filter((r) => canAssignLeader || r.value !== 'leader')

  async function changeRole(m: GroupMembership, role: GroupMembership['role']) {
    setBusy(m.id)
    const res = await setCampusMemberRoleAction(groupId, m.id, role)
    setBusy(null)
    if (res.error) toast({ title: 'Role not changed', description: res.error, variant: 'destructive' })
    else {
      toast({ title: `${m.member?.user?.full_name ?? 'They'} is now ${GROUP_MEMBERSHIP_ROLE_LABELS[role]}` })
      onChanged()
    }
  }

  async function remove(m: GroupMembership) {
    const name = m.member?.user?.full_name ?? 'this person'
    if (!window.confirm(`Remove ${name} from ${label}? They stay in the church directory.`)) return
    setBusy(m.id)
    const res = await removeCampusMemberAction(groupId, m.id)
    setBusy(null)
    if (res.error) toast({ title: 'Not removed', description: res.error, variant: 'destructive' })
    else {
      toast({ title: `${name} removed from ${label}` })
      onChanged()
    }
  }

  return (
    <section className="dashboard-panel overflow-hidden">
      <div className="flex flex-col gap-2 border-b border-neutral-200/80 p-4 dark:border-white/[0.06] sm:flex-row sm:items-center sm:px-5">
        <h2 className="app-section-title shrink-0">
          {leadersOnly ? 'Leaders & executives' : 'Members'}{' '}
          <span className="tabular-nums text-neutral-500 dark:text-neutral-400">({rows.length})</span>
        </h2>
        <div className="relative flex-1 sm:ml-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" aria-hidden />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, phone or note"
            className="h-11 pl-10 sm:h-10"
            aria-label="Search campus members"
          />
        </div>
        {canManage ? (
          <Button onClick={() => setAdding(true)} className="h-11 sm:h-10">
            <UserPlus className="mr-2 h-4 w-4" aria-hidden />
            Add person
          </Button>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <p className="p-6 text-center text-sm text-neutral-600 dark:text-neutral-400">
          {query
            ? 'No one matches that search.'
            : leadersOnly
              ? 'No leaders or executives yet. Change someone’s role on the Members tab.'
              : 'No members yet. Use Onboarding to find students already in the directory or share the join link.'}
        </p>
      ) : (
        <ul className="divide-y divide-neutral-100 dark:divide-white/[0.06]">
          {rows.map((m) => {
            const u = m.member?.user
            const name = u?.full_name || 'Unknown'
            const locked = !canAssignLeader && m.role === 'leader'
            return (
              <li key={m.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap sm:px-5">
                <PersonAvatar name={name} seed={m.member_id} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{name}</span>
                    <Badge variant={groupRoleTone(m.role)}>{GROUP_MEMBERSHIP_ROLE_LABELS[m.role]}</Badge>
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[13px] text-neutral-500 dark:text-neutral-400">
                    {u?.phone ? <PhoneLink phone={u.phone} whatsapp={u.whatsapp} name={name} /> : <span>No phone</span>}
                    {m.notes ? <span className="min-w-0 truncate">{m.notes}</span> : null}
                  </div>
                </div>
                <QuickContactButtons phone={u?.phone} whatsapp={u?.whatsapp} name={name} className="hidden min-[400px]:inline-flex" />
                {canManage ? (
                  <div className="flex w-full items-center gap-2 sm:w-auto">
                    <Select value={m.role} onValueChange={(v) => changeRole(m, v as GroupMembership['role'])} disabled={busy === m.id || locked}>
                      <SelectTrigger className="h-11 w-full sm:h-9 sm:w-36" aria-label={`Role for ${name}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(locked ? GROUP_MEMBERSHIP_ROLES : roleOptions).map((r) => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-11 w-11 shrink-0 sm:h-9 sm:w-9"
                      onClick={() => remove(m)}
                      disabled={busy === m.id || locked}
                      aria-label={`Remove ${name} from ${label}`}
                    >
                      {busy === m.id ? <LoadingSpinner size="sm" /> : <UserMinus className="h-4 w-4" aria-hidden />}
                    </Button>
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}

      {adding ? (
        <AddPersonDialog
          groupId={groupId}
          label={label}
          roleOptions={roleOptions}
          defaultRole={leadersOnly ? 'executive' : 'member'}
          onClose={() => setAdding(false)}
          onAdded={() => {
            onChanged()
          }}
        />
      ) : null}
    </section>
  )
}

function AddPersonDialog({
  groupId,
  label,
  roleOptions,
  defaultRole,
  onClose,
  onAdded,
}: {
  groupId: string
  label: string
  roleOptions: ReadonlyArray<{ value: GroupMembership['role']; label: string }>
  defaultRole: GroupMembership['role']
  onClose: () => void
  onAdded: () => void
}) {
  const { toast } = useToast()
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<PersonHit[]>([])
  const [searching, setSearching] = useState(false)
  const [role, setRole] = useState<GroupMembership['role']>(defaultRole)
  const [busy, setBusy] = useState<string | null>(null)
  const [move, setMove] = useState<{ person: PersonHit; from: string } | null>(null)

  useEffect(() => {
    const q = query.trim()
    if (q.length < 3) {
      setHits([])
      return
    }
    let alive = true
    setSearching(true)
    const t = setTimeout(async () => {
      const res = await searchPeopleForCampusAction(groupId, q)
      if (!alive) return
      setSearching(false)
      setHits(res.data ?? [])
    }, 250)
    return () => {
      alive = false
      clearTimeout(t)
    }
  }, [query, groupId])

  async function add(person: PersonHit, confirmMove = false) {
    setBusy(person.user_id)
    const res = await addCampusMemberAction({ groupId, userId: person.user_id, role, confirmMove })
    setBusy(null)
    if (res.error || !res.data) {
      toast({ title: 'Not added', description: res.error ?? undefined, variant: 'destructive' })
      return
    }
    const r = res.data
    if (r.status === 'needs_move' || r.status === 'blocked_leader') {
      setMove({ person, from: r.from.short_code || r.from.name })
      return
    }
    toast({
      title: r.status === 'moved' ? `${person.full_name} moved to ${label}` : `${person.full_name} added to ${label}`,
      description: r.status === 'moved' && r.from ? `Their ${r.from.short_code || r.from.name} membership has ended.` : undefined,
    })
    setMove(null)
    setHits((prev) => prev.map((h) => (h.user_id === person.user_id ? { ...h, on_this_campus: true, campus: label } : h)))
    onAdded()
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add someone to {label}</DialogTitle>
          <DialogDescription>Search the church directory by name or phone number. New students can use the join link instead.</DialogDescription>
        </DialogHeader>

        {move ? (
          <div className="space-y-4">
            <p className="text-sm text-neutral-800 dark:text-neutral-200">
              <strong>{move.person.full_name}</strong> is on <strong>{move.from}</strong>. A person belongs to one campus.
              Move them from {move.from} to {label}?
            </p>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setMove(null)} className="h-11 sm:h-10">Cancel</Button>
              <Button onClick={() => add(move.person, true)} disabled={busy !== null} className="h-11 sm:h-10">
                {busy ? <LoadingSpinner size="sm" className="mr-2" /> : null}
                Move from {move.from} to {label}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
              <div className="space-y-1.5">
                <Label htmlFor="campus-add-search">Name or phone</Label>
                <Input id="campus-add-search" autoFocus value={query} onChange={(e) => setQuery(e.target.value)} className="h-11 sm:h-10" placeholder="At least 3 characters" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="campus-add-role">Role</Label>
                <Select value={role} onValueChange={(v) => setRole(v as GroupMembership['role'])}>
                  <SelectTrigger id="campus-add-role" className="h-11 sm:h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="max-h-72 overflow-y-auto rounded-xl border border-neutral-200/80 dark:border-white/10" aria-live="polite">
              {searching ? (
                <div className="flex justify-center p-4"><LoadingSpinner size="sm" /></div>
              ) : hits.length === 0 ? (
                <p className="p-4 text-sm text-neutral-500 dark:text-neutral-400">
                  {query.trim().length < 3 ? 'Type a name or number.' : 'No one found.'}
                </p>
              ) : (
                <ul className="divide-y divide-neutral-100 dark:divide-white/[0.06]">
                  {hits.map((h) => (
                    <li key={h.user_id} className="flex items-center gap-3 px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">{h.full_name}</p>
                        <p className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                          {h.phone_hint ? <span className="font-mono">{h.phone_hint}</span> : null}
                          {h.campus ? <Badge variant="outline" className="font-mono">{h.campus}</Badge> : null}
                        </p>
                      </div>
                      <Button size="sm" className="h-11 sm:h-8" disabled={h.on_this_campus || busy === h.user_id} onClick={() => add(h)}>
                        {h.on_this_campus ? 'On campus' : busy === h.user_id ? <LoadingSpinner size="sm" /> : 'Add'}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
