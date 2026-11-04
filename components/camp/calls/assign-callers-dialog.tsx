'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Search, ShieldCheck, Users, UserRound, UsersRound } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { PersonAvatar } from '@/components/ui/person'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/components/providers'
import { cn } from '@/lib/utils'
import { distributeEvenly } from '@/lib/camp/call-campaign'
import {
  assignCallersAction,
  grantCallAccessAction,
  sendCallListsBySmsAction,
  type CallBoardCaller,
} from '@/lib/actions/camp-calls'
import { loadCommsGroupsAction } from '@/lib/actions/comms'
import { loadGroupMembersAction } from '@/lib/actions/core-data'

type Mode = 'single' | 'spread' | 'group'

const MODES: Array<{ id: Mode; label: string; hint: string; icon: typeof UserRound }> = [
  { id: 'single', label: 'One person', hint: 'Give the whole list to one caller', icon: UserRound },
  { id: 'spread', label: 'Share it out', hint: 'Split evenly between several callers', icon: UsersRound },
  { id: 'group', label: 'A group', hint: 'Split among members of a group', icon: Users },
]

export function AssignCallersDialog({
  open,
  onOpenChange,
  registrationIds,
  people,
  currentLoad,
  campYearId,
  canSms,
  onAssigned,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  registrationIds: string[]
  people: CallBoardCaller[]
  /** Open calls each caller already has, so the split stays fair. */
  currentLoad: Map<string, number>
  campYearId: string
  canSms: boolean
  onAssigned: () => void
}) {
  const { toast } = useToast()
  const { can } = useAuth()
  const [mode, setMode] = useState<Mode>('single')
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<string[]>([])
  const [groups, setGroups] = useState<Array<{ id: string; name: string }>>([])
  const [groupId, setGroupId] = useState<string>('')
  const [groupUserIds, setGroupUserIds] = useState<string[]>([])
  const [groupLoading, setGroupLoading] = useState(false)
  const [textNow, setTextNow] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setPicked([])
    setQuery('')
    setGroupId('')
    setGroupUserIds([])
    setTextNow(false)
  }, [open])

  useEffect(() => {
    if (!open || mode !== 'group' || groups.length) return
    void loadCommsGroupsAction().then(({ data }) =>
      setGroups((data ?? []).map((g) => ({ id: g.id, name: g.name })).sort((a, b) => a.name.localeCompare(b.name)))
    )
  }, [open, mode, groups.length])

  useEffect(() => {
    if (!groupId) {
      setGroupUserIds([])
      return
    }
    setGroupLoading(true)
    void loadGroupMembersAction(groupId)
      .then(({ data }) => {
        const ids = (data ?? [])
          .map((m) => m.member?.user?.id ?? m.member?.user_id)
          .filter((id): id is string => Boolean(id))
        setGroupUserIds(Array.from(new Set(ids)))
      })
      .finally(() => setGroupLoading(false))
  }, [groupId])

  const peopleById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people])

  const callerIds = useMemo(() => {
    if (mode === 'group') return groupUserIds.filter((id) => peopleById.has(id))
    return mode === 'single' ? picked.slice(0, 1) : picked
  }, [mode, picked, groupUserIds, peopleById])

  const preview = useMemo(() => {
    const plan =
      mode === 'single' && callerIds[0]
        ? registrationIds.map((id) => ({ registration_id: id, assigned_to: callerIds[0] }))
        : distributeEvenly(registrationIds, callerIds, currentLoad)
    const counts = new Map<string, number>()
    plan.forEach((a) => counts.set(a.assigned_to, (counts.get(a.assigned_to) ?? 0) + 1))
    return Array.from(counts.entries())
      .map(([id, count]) => ({ person: peopleById.get(id), id, count }))
      .sort((a, b) => b.count - a.count)
  }, [mode, callerIds, registrationIds, currentLoad, peopleById])

  const withoutAccess = callerIds.map((id) => peopleById.get(id)).filter((p): p is CallBoardCaller => Boolean(p && !p.can_use_app))

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q
      ? people.filter((p) => p.full_name.toLowerCase().includes(q) || (p.phone ?? '').includes(q))
      : people
    return list.slice(0, 60)
  }, [people, query])

  function toggle(id: string) {
    if (mode === 'single') setPicked([id])
    else setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  async function grantAccess() {
    const res = await grantCallAccessAction(withoutAccess.map((p) => p.id))
    if (res.error) {
      toast({ variant: 'destructive', title: 'Could not grant access', description: res.error })
      return
    }
    withoutAccess.forEach((p) => (p.can_use_app = true))
    toast({ title: 'Access granted', description: `${res.granted} caller${res.granted === 1 ? '' : 's'} can now open the call list.` })
    setPicked((prev) => [...prev])
  }

  async function submit() {
    if (!callerIds.length) return
    setSaving(true)
    try {
      const res = await assignCallersAction({
        registration_ids: registrationIds,
        caller_ids: callerIds,
        mode: mode === 'single' ? 'single' : 'spread',
      })
      if (res.error) throw new Error(res.error)
      let smsNote = ''
      if (textNow) {
        const sms = await sendCallListsBySmsAction({ camp_year_id: campYearId, caller_ids: callerIds })
        if (sms.error) smsNote = ` SMS not sent: ${sms.error}`
        else if (sms.data) smsNote = ` Texted ${sms.data.callers} caller${sms.data.callers === 1 ? '' : 's'}.${sms.data.failed.length ? ` ${sms.data.failed.length} could not be texted.` : ''}`
      }
      toast({ title: 'Call lists updated', description: `${res.updated} assigned.${smsNote}` })
      onAssigned()
      onOpenChange(false)
    } catch (error) {
      toast({ variant: 'destructive', title: 'Could not assign', description: error instanceof Error ? error.message : 'Try again.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="border-b border-neutral-200 px-6 pb-4 pt-6 dark:border-neutral-700">
          <DialogTitle className="app-section-title">
            Assign {registrationIds.length} {registrationIds.length === 1 ? 'person' : 'people'} to call
          </DialogTitle>
          <DialogDescription>Callers get a list with names and numbers, and mark who is coming.</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <div role="radiogroup" aria-label="How to assign" className="grid grid-cols-3 gap-2">
            {MODES.map((m) => {
              const Icon = m.icon
              const active = mode === m.id
              return (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => {
                    setMode(m.id)
                    if (m.id === 'single') setPicked((p) => p.slice(0, 1))
                  }}
                  className={cn(
                    'flex flex-col items-start gap-1.5 rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30',
                    active
                      ? 'border-brand-500 bg-brand-50 dark:border-brand-500 dark:bg-brand-950/40'
                      : 'border-neutral-200 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-700/50'
                  )}
                >
                  <Icon className={cn('h-4 w-4', active ? 'text-brand-600 dark:text-brand-300' : 'text-neutral-500 dark:text-neutral-400')} aria-hidden />
                  <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{m.label}</span>
                  <span className="hidden text-xs leading-snug text-neutral-500 dark:text-neutral-400 sm:block">{m.hint}</span>
                </button>
              )
            })}
          </div>

          {mode === 'group' ? (
            <div className="space-y-2">
              <label htmlFor="assign-group" className="app-overline">Group</label>
              <select
                id="assign-group"
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-900 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
              >
                <option value="">Choose a group…</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
              {groupId && !groupLoading ? (
                <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
                  {callerIds.length
                    ? `${callerIds.length} member${callerIds.length === 1 ? '' : 's'} with an account will share the list.`
                    : 'No one in this group has an account yet, so they cannot be given a list.'}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search people by name or phone"
                  aria-label="Search callers"
                  className="h-10 w-full rounded-lg border border-neutral-200 bg-white pl-9 pr-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500"
                />
              </div>
              <ul className="max-h-64 divide-y divide-neutral-100 overflow-y-auto rounded-lg border border-neutral-200 dark:divide-neutral-700 dark:border-neutral-700">
                {filtered.map((p) => {
                  const selected = picked.includes(p.id)
                  const load = currentLoad.get(p.id) ?? 0
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => toggle(p.id)}
                        aria-pressed={selected}
                        className={cn(
                          'flex w-full items-center gap-3 px-3 py-2 text-left transition-colors',
                          selected ? 'bg-brand-50 dark:bg-brand-950/40' : 'hover:bg-neutral-50 dark:hover:bg-neutral-700/50'
                        )}
                      >
                        {mode === 'spread' ? <Checkbox checked={selected} aria-hidden tabIndex={-1} /> : null}
                        <PersonAvatar name={p.full_name} seed={p.id} size="sm" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">{p.full_name}</span>
                          <span className="block truncate text-xs text-neutral-500 dark:text-neutral-400">
                            {p.phone || 'No phone'}{load ? ` · ${load} open call${load === 1 ? '' : 's'}` : ''}
                          </span>
                        </span>
                        {!p.can_use_app ? <Badge variant="outline">SMS only</Badge> : null}
                      </button>
                    </li>
                  )
                })}
                {filtered.length === 0 ? (
                  <li className="px-3 py-6 text-center text-sm text-neutral-500 dark:text-neutral-400">No one matches “{query}”.</li>
                ) : null}
              </ul>
            </div>
          )}

          {preview.length > 0 ? (
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-900/40">
              <p className="app-overline mb-2">Split</p>
              <ul className="flex flex-wrap gap-1.5">
                {preview.map((row) => (
                  <li key={row.id}>
                    <Badge variant="secondary">
                      {row.person?.full_name ?? 'Unknown'} · {row.count}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {withoutAccess.length > 0 ? (
            <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900/60 dark:bg-amber-950/30">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-amber-900 dark:text-amber-200">
                  {withoutAccess.length === 1 ? `${withoutAccess[0].full_name} can't` : `${withoutAccess.length} callers can't`} open the call list in the app. They can still work from the SMS list and report back to you.
                </p>
                {can('users.manage') ? (
                  <Button size="sm" variant="outline" onClick={() => void grantAccess()}>
                    <ShieldCheck className="mr-1.5 h-4 w-4" aria-hidden />
                    Let them mark calls in the app
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}

          {canSms ? (
            <label className="flex cursor-pointer items-start gap-3 text-sm">
              <Checkbox checked={textNow} onCheckedChange={(v) => setTextNow(v === true)} className="mt-0.5" />
              <span>
                <span className="block font-medium text-neutral-900 dark:text-neutral-100">Text each caller their list now</span>
                <span className="block text-[13px] text-neutral-500 dark:text-neutral-400">Names and numbers by SMS, with a link to mark outcomes.</span>
              </span>
            </label>
          ) : null}
        </div>

        <DialogFooter className="border-t border-neutral-200 px-6 py-4 dark:border-neutral-700">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={() => void submit()} disabled={saving || callerIds.length === 0}>
            {saving ? 'Assigning…' : textNow ? 'Assign and text' : 'Assign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
