'use client'

/**
 * The callers, in plain sight on the calls page: one tile per caller with their progress and how
 * they take calls, a "No caller yet" tile, "Add callers", and "Split people among callers" (a
 * random, fair share, like filling rooms). Tap a tile to see that caller's people in the list
 * below; the cog changes how they take calls or removes them.
 */
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Check, Plus, Search, Settings2, Shuffle, Trash2, UserPlus, UsersRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Meter } from '@/components/ui/meter'
import { PersonAvatar } from '@/components/ui/person'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import {
  removeCallTeamMemberAction,
  saveCallTeamMemberAction,
  type TeamCandidate,
  type TeamMemberView,
} from '@/lib/actions/call-center'

export type CallTeamData = { team: TeamMemberView[]; candidates: TeamCandidate[]; sessionPeople: Array<{ user_id: string; name: string }> }
type Progress = { callerId: string; total: number; open: number }

const TAKES: Array<{ id: TeamMemberView['takes']; label: string }> = [
  { id: 'all', label: 'Everyone' },
  { id: 'new', label: 'New only' },
  { id: 'returning', label: 'Returning only' },
]
const GENDERS: Array<{ id: TeamMemberView['gender']; label: string }> = [
  { id: 'Male', label: 'Man' },
  { id: 'Female', label: 'Woman' },
  { id: null, label: 'Not set' },
]

const genderChip = (g: TeamMemberView['gender']) =>
  g === 'Male'
    ? { label: 'Man', cls: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300' }
    : g === 'Female'
      ? { label: 'Woman', cls: 'bg-pink-100 text-pink-800 dark:bg-pink-500/15 dark:text-pink-300' }
      : null
const takesChip = (t: TeamMemberView['takes']) =>
  t === 'new'
    ? { label: 'New only', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300' }
    : t === 'returning'
      ? { label: 'Returning only', cls: 'bg-teal-100 text-teal-800 dark:bg-teal-500/15 dark:text-teal-300' }
      : null

export function CallersBoard({
  team,
  loading,
  progress,
  nameOf,
  unassignedOpen,
  callerFilter,
  onFilter,
  onSplit,
  onChanged,
}: {
  team: CallTeamData | null | undefined
  loading: boolean
  /** Each caller's calls this camp, from the board. */
  progress: Map<string, Progress>
  nameOf: (userId: string) => string | undefined
  /** Open calls nobody has yet. */
  unassignedOpen: number
  callerFilter: string
  onFilter: (value: string) => void
  onSplit: () => void
  onChanged: () => void
}) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<TeamMemberView | null>(null)

  const members = useMemo(() => team?.team ?? [], [team])
  const onTeam = useMemo(() => new Set(members.map((m) => m.user_id)), [members])
  // People holding calls who aren't on the team (assigned by hand): shown too, with "Add".
  const outsiders = useMemo(() => Array.from(progress.values()).filter((p) => !onTeam.has(p.callerId)), [progress, onTeam])
  const activeCount = members.filter((m) => m.active).length
  const sessionCount = team?.sessionPeople.length ?? 0
  const splitters = sessionCount || activeCount

  function patchCache(fn: (prev: CallTeamData) => CallTeamData) {
    queryClient.setQueryData(['call-team'], (prev: CallTeamData | null | undefined) => (prev ? fn(prev) : prev))
  }

  async function save(member: TeamMemberView) {
    patchCache((prev) => ({
      ...prev,
      team: prev.team.some((t) => t.user_id === member.user_id)
        ? prev.team.map((t) => (t.user_id === member.user_id ? member : t))
        : [...prev.team, member].sort((a, b) => a.name.localeCompare(b.name)),
    }))
    const res = await saveCallTeamMemberAction({ user_id: member.user_id, gender: member.gender, takes: member.takes, max: member.max, active: member.active })
    if (res.error) {
      toast({ variant: 'destructive', title: 'Not saved', description: res.error })
      onChanged()
    }
  }

  async function remove(member: TeamMemberView) {
    patchCache((prev) => ({ ...prev, team: prev.team.filter((t) => t.user_id !== member.user_id) }))
    setEditing(null)
    const res = await removeCallTeamMemberAction({ user_id: member.user_id })
    if (res.error) toast({ variant: 'destructive', title: 'Not removed', description: res.error })
    else toast({ title: `${member.name.split(' ')[0]} is no longer a caller`, description: 'People they already have stay with them.' })
    onChanged()
  }

  function addPerson(c: { id: string; name: string; phone: string | null; gender: TeamMemberView['gender']; canUseApp: boolean }) {
    void save({ user_id: c.id, name: c.name, phone: c.phone, gender: c.gender, takes: 'all', max: null, active: true, canUseApp: c.canUseApp, open: progress.get(c.id)?.open ?? 0 })
  }

  const candidateById = useMemo(() => new Map((team?.candidates ?? []).map((c) => [c.id, c])), [team])

  return (
    <section id="callers" aria-labelledby="callers-title" className="dashboard-panel mt-4 scroll-mt-20 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300" aria-hidden>
            <UsersRound className="h-5 w-5" />
          </span>
          <div>
            <h2 id="callers-title" className="app-section-title">Callers</h2>
            <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
              {members.length === 0
                ? 'Add the people making calls, then split everyone among them.'
                : `${activeCount} taking calls${sessionCount ? ` · ${sessionCount} in the live session` : ''}. Tap a caller to see their people.`}
            </p>
          </div>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <Button variant="outline" className="h-11 flex-1 sm:flex-none" onClick={() => setAdding(true)}>
            <UserPlus className="mr-2 h-4 w-4" aria-hidden />
            Add callers
          </Button>
          <Button className="h-11 flex-1 sm:flex-none" onClick={onSplit} disabled={!splitters}>
            <Shuffle className="mr-2 h-4 w-4" aria-hidden />
            Split people
            {unassignedOpen ? <span className="ml-1.5 rounded-full bg-white/20 px-1.5 text-[12px] tabular-nums">{unassignedOpen}</span> : null}
          </Button>
        </div>
      </div>

      {loading && !team ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-hidden>
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[92px] animate-pulse rounded-xl bg-neutral-100 dark:bg-white/[0.04]" />
          ))}
        </div>
      ) : members.length === 0 && outsiders.length === 0 ? (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="mt-4 flex w-full flex-col items-center rounded-xl border border-dashed border-violet-300 bg-violet-50/50 px-6 py-8 text-center transition-colors hover:bg-violet-50 dark:border-violet-800 dark:bg-violet-950/20 dark:hover:bg-violet-950/40"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">
            <Plus className="h-5 w-5" aria-hidden />
          </span>
          <span className="mt-3 font-semibold text-neutral-900 dark:text-neutral-50">Add your first callers</span>
          <span className="mt-1 max-w-sm text-sm text-neutral-600 dark:text-neutral-400">
            Pick the people making calls. Then &ldquo;Split people&rdquo; shares {unassignedOpen ? `the ${unassignedOpen} people` : 'everyone'} out among them at random, men to men and women to women if you like.
          </span>
        </button>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <li>
            <Tile
              active={callerFilter === 'unassigned'}
              onClick={() => onFilter(callerFilter === 'unassigned' ? 'all' : 'unassigned')}
              tone={unassignedOpen ? 'warn' : 'done'}
            >
              <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', unassignedOpen ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300')} aria-hidden>
                {unassignedOpen ? <AlertTriangle className="h-4 w-4" /> : <Check className="h-4 w-4" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-neutral-900 dark:text-neutral-50">No caller yet</span>
                <span className="block text-[13px] text-neutral-600 dark:text-neutral-400">
                  {unassignedOpen ? `${unassignedOpen} ${unassignedOpen === 1 ? 'person waits' : 'people wait'} for a caller` : 'Everyone has a caller'}
                </span>
              </span>
            </Tile>
          </li>
          {members.map((m) => {
            const p = progress.get(m.user_id)
            const total = p?.total ?? 0
            const done = total - (p?.open ?? 0)
            const g = genderChip(m.gender)
            const t = takesChip(m.takes)
            return (
              <li key={m.user_id} className="relative">
                <Tile active={callerFilter === m.user_id} onClick={() => onFilter(callerFilter === m.user_id ? 'all' : m.user_id)} dim={!m.active}>
                  <PersonAvatar name={m.name} seed={m.user_id} />
                  <span className="min-w-0 flex-1 pr-8">
                    <span className="block truncate text-sm font-semibold text-neutral-900 dark:text-neutral-50">{m.name}</span>
                    <span className="mt-1 flex flex-wrap gap-1">
                      {!m.active ? <Chip cls="bg-neutral-200 text-neutral-700 dark:bg-white/10 dark:text-neutral-300">Paused</Chip> : null}
                      {g ? <Chip cls={g.cls}>{g.label}</Chip> : null}
                      {t ? <Chip cls={t.cls}>{t.label}</Chip> : null}
                      {m.max ? <Chip cls="bg-neutral-100 text-neutral-700 dark:bg-white/[0.06] dark:text-neutral-300">Up to {m.max}</Chip> : null}
                      {!m.canUseApp ? <Chip cls="bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300">Texts only</Chip> : null}
                    </span>
                    <span className="mt-2 flex items-center gap-2">
                      <Meter className="h-1.5 flex-1" value={done} max={Math.max(total, 1)} tone={total && done === total ? 'success' : 'brand'} label={`${m.name}: ${done} of ${total} done`} />
                      <span className="shrink-0 text-[12px] tabular-nums text-neutral-500 dark:text-neutral-400">{total ? `${done}/${total}` : 'None yet'}</span>
                    </span>
                  </span>
                </Tile>
                <button
                  type="button"
                  onClick={() => setEditing(m)}
                  aria-label={`Settings for ${m.name}`}
                  className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-white/10 dark:hover:text-white"
                >
                  <Settings2 className="h-4 w-4" aria-hidden />
                </button>
              </li>
            )
          })}
          {outsiders.map((p) => {
            const name = nameOf(p.callerId) ?? candidateById.get(p.callerId)?.name ?? 'Former user'
            const c = candidateById.get(p.callerId)
            return (
              <li key={p.callerId} className="relative">
                <Tile active={callerFilter === p.callerId} onClick={() => onFilter(callerFilter === p.callerId ? 'all' : p.callerId)} dashed>
                  <PersonAvatar name={name} seed={p.callerId} />
                  <span className="min-w-0 flex-1 pr-14">
                    <span className="block truncate text-sm font-semibold text-neutral-900 dark:text-neutral-50">{name}</span>
                    <span className="block text-[12px] text-neutral-500 dark:text-neutral-400">Has calls · not a caller for splits</span>
                    <span className="mt-2 flex items-center gap-2">
                      <Meter className="h-1.5 flex-1" value={p.total - p.open} max={Math.max(p.total, 1)} tone={p.open === 0 ? 'success' : 'brand'} label={`${name} progress`} />
                      <span className="shrink-0 text-[12px] tabular-nums text-neutral-500 dark:text-neutral-400">{p.total - p.open}/{p.total}</span>
                    </span>
                  </span>
                </Tile>
                {c ? (
                  <button
                    type="button"
                    onClick={() => addPerson(c)}
                    className="absolute right-2 top-2 inline-flex h-9 items-center gap-1 rounded-lg px-2.5 text-[13px] font-medium text-violet-700 hover:bg-violet-50 dark:text-violet-300 dark:hover:bg-violet-950/40"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden />
                    Add
                  </button>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}

      <AddCallersDialog
        open={adding}
        onOpenChange={setAdding}
        candidates={team?.candidates ?? []}
        onTeam={onTeam}
        onAdd={addPerson}
        onDone={() => { setAdding(false); onChanged() }}
      />
      <CallerSettingsDialog member={editing} onClose={() => setEditing(null)} onSave={(m) => { setEditing(m); void save(m) }} onRemove={(m) => void remove(m)} />
    </section>
  )
}

function Tile({ active, onClick, children, dim, dashed, tone }: { active: boolean; onClick: () => void; children: React.ReactNode; dim?: boolean; dashed?: boolean; tone?: 'warn' | 'done' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex h-full w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors',
        dashed && 'border-dashed',
        active
          ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-500/20 dark:border-brand-500 dark:bg-brand-500/10'
          : tone === 'warn'
            ? 'border-amber-200 bg-amber-50/60 hover:border-amber-300 dark:border-amber-900 dark:bg-amber-950/20 dark:hover:border-amber-800'
            : 'border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800/60 dark:hover:border-neutral-600',
        dim && 'opacity-60'
      )}
    >
      {children}
    </button>
  )
}

function Chip({ cls, children }: { cls: string; children: React.ReactNode }) {
  return <span className={cn('rounded-full px-2 py-px text-[11px] font-medium', cls)}>{children}</span>
}

function AddCallersDialog({
  open,
  onOpenChange,
  candidates,
  onTeam,
  onAdd,
  onDone,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  candidates: TeamCandidate[]
  onTeam: Set<string>
  onAdd: (c: TeamCandidate) => void
  onDone: () => void
}) {
  const [search, setSearch] = useState('')
  const [added, setAdded] = useState<string[]>([])
  const found = useMemo(() => {
    const q = search.trim().toLowerCase()
    return candidates.filter((c) => !q || `${c.name} ${c.phone ?? ''}`.toLowerCase().includes(q)).slice(0, 60)
  }, [candidates, search])

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v)
        if (!v) {
          setSearch('')
          if (added.length) onDone()
          setAdded([])
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add callers</DialogTitle>
          <DialogDescription>Tap everyone making calls. Gender comes from their member profile where it&apos;s known; change it on their tile.</DialogDescription>
        </DialogHeader>
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or phone"
            aria-label="Search people"
            className="h-11 w-full rounded-lg border border-neutral-200 bg-white pl-9 pr-3 text-[15px] text-neutral-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
          />
        </label>
        <ul className="-mx-1 grid max-h-[50vh] gap-0.5 overflow-y-auto">
          {found.map((c) => {
            const isIn = onTeam.has(c.id)
            return (
              <li key={c.id}>
                <button
                  type="button"
                  disabled={isIn}
                  onClick={() => {
                    onAdd(c)
                    setAdded((a) => [...a, c.id])
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left hover:bg-neutral-50 disabled:cursor-default disabled:hover:bg-transparent dark:hover:bg-white/[0.04]"
                >
                  <PersonAvatar name={c.name} seed={c.id} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">{c.name}</span>
                    <span className="block truncate text-xs text-neutral-500 dark:text-neutral-400">
                      {c.gender === 'Male' ? 'Man · ' : c.gender === 'Female' ? 'Woman · ' : ''}
                      {c.canUseApp ? 'Can open the app' : 'Texts only'}
                      {c.phone ? ` · ${c.phone}` : ''}
                    </span>
                  </span>
                  {isIn ? (
                    <span className="inline-flex items-center gap-1 text-[12px] font-medium text-emerald-700 dark:text-emerald-400">
                      <Check className="h-4 w-4" aria-hidden />
                      Caller
                    </span>
                  ) : (
                    <Plus className="h-4 w-4 text-violet-600 dark:text-violet-400" aria-hidden />
                  )}
                </button>
              </li>
            )
          })}
          {found.length === 0 ? <li className="px-3 py-6 text-center text-sm text-neutral-500">No one matches.</li> : null}
        </ul>
        <Button className="h-11 w-full" onClick={() => { onOpenChange(false); setSearch(''); if (added.length) onDone(); setAdded([]) }}>
          {added.length ? `Done · ${added.length} added` : 'Done'}
        </Button>
      </DialogContent>
    </Dialog>
  )
}

function CallerSettingsDialog({
  member,
  onClose,
  onSave,
  onRemove,
}: {
  member: TeamMemberView | null
  onClose: () => void
  onSave: (m: TeamMemberView) => void
  onRemove: (m: TeamMemberView) => void
}) {
  return (
    <Dialog open={!!member} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        {member ? (
          <>
            <DialogHeader>
              <DialogTitle>{member.name}</DialogTitle>
              <DialogDescription>How they take calls when people are split. Saves as you tap.</DialogDescription>
            </DialogHeader>
            {!member.canUseApp ? (
              <p className="flex items-start gap-2 rounded-lg bg-orange-50 px-3 py-2 text-[13px] text-orange-900 dark:bg-orange-950/30 dark:text-orange-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span>
                  Can&apos;t open the app, so they get their list by text only.{' '}
                  <Link href="/admin/admins" className="font-medium underline underline-offset-2">Give calling access</Link>
                </span>
              </p>
            ) : null}
            <div className="grid gap-4">
              <label className="flex items-center justify-between gap-3">
                <span>
                  <span className="block text-sm font-medium text-neutral-900 dark:text-neutral-100">Taking calls</span>
                  <span className="block text-[12px] text-neutral-500 dark:text-neutral-400">Off: left out of splits; keeps who they have.</span>
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={member.active}
                  onClick={() => onSave({ ...member, active: !member.active })}
                  className={cn('relative h-6 w-11 shrink-0 rounded-full transition-colors', member.active ? 'bg-emerald-600' : 'bg-neutral-300 dark:bg-neutral-600')}
                >
                  <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-[left]', member.active ? 'left-[22px]' : 'left-0.5')} />
                </button>
              </label>
              <Choice label="Gender (for men to men, women to women)" options={GENDERS} value={member.gender} onChange={(gender) => onSave({ ...member, gender })} />
              <Choice label="Calls" options={TAKES} value={member.takes} onChange={(takes) => onSave({ ...member, takes })} />
              <label className="grid gap-1 text-[12px] font-medium text-neutral-600 dark:text-neutral-400">
                Most people at a time
                <input
                  key={member.user_id}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={500}
                  placeholder="No limit"
                  defaultValue={member.max ?? ''}
                  onBlur={(e) => {
                    const value = e.target.value ? Math.max(1, Math.min(500, Number(e.target.value))) : null
                    if (value !== member.max) onSave({ ...member, max: value })
                  }}
                  className="h-11 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
                />
              </label>
            </div>
            <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
              <Button variant="ghost" className="h-11 text-red-700 hover:bg-red-50 hover:text-red-800 dark:text-red-300 dark:hover:bg-red-950/40" onClick={() => onRemove(member)}>
                <Trash2 className="mr-1.5 h-4 w-4" aria-hidden />
                Remove caller
              </Button>
              <Button className="h-11" onClick={onClose}>Done</Button>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function Choice<T extends string | null>({ label, options, value, onChange }: { label: string; options: Array<{ id: T; label: string }>; value: T; onChange: (v: T) => void }) {
  return (
    <div className="grid gap-1">
      <span className="text-[12px] font-medium text-neutral-600 dark:text-neutral-400">{label}</span>
      <div role="radiogroup" aria-label={label} className="grid auto-cols-fr grid-flow-col rounded-lg bg-neutral-200/60 p-0.5 dark:bg-neutral-800">
        {options.map((o) => (
          <button
            key={String(o.id)}
            type="button"
            role="radio"
            aria-checked={value === o.id}
            onClick={() => onChange(o.id)}
            className={cn(
              'h-10 rounded-md px-2 text-[13px] font-medium transition-colors',
              value === o.id ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-white' : 'text-neutral-600 dark:text-neutral-400'
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}
