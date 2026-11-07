'use client'

/**
 * The call team: the people calls are shared among when no session is running, and how each likes
 * to be given them (their gender for matching, New or Returning campers, a limit). Changes save as
 * they're made. "Share out the calls" works from here too.
 */
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, ArrowLeft, Plus, Search, Sparkles, Trash2 } from 'lucide-react'
import { useAuth } from '@/components/providers'
import { AccessDenied } from '@/components/auth/access-denied'
import { Button } from '@/components/ui/button'
import { PersonAvatar } from '@/components/ui/person'
import { LoadingSpinner } from '@/components/ui/loading'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { getCallTeamAction, removeCallTeamMemberAction, saveCallTeamMemberAction, type TeamMemberView } from '@/lib/actions/call-center'
import { ShareOutDialog } from '@/components/calls/share-out-dialog'

const TAKES: Array<{ id: TeamMemberView['takes']; label: string }> = [
  { id: 'all', label: 'Everyone' },
  { id: 'new', label: 'New' },
  { id: 'returning', label: 'Returning' },
]
const GENDERS: Array<{ id: TeamMemberView['gender']; label: string }> = [
  { id: 'Male', label: 'Man' },
  { id: 'Female', label: 'Woman' },
  { id: null, label: 'Not set' },
]

export default function CallTeamPage() {
  const { can } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [search, setSearch] = useState('')
  const [shareOpen, setShareOpen] = useState(false)

  const team = useQuery({
    queryKey: ['call-team'],
    queryFn: async () => {
      const res = await getCallTeamAction(null)
      if (res.error || !res.data) throw new Error(res.error ?? 'Could not load the call team')
      return res.data
    },
  })
  const data = team.data
  const inTeam = useMemo(() => new Set((data?.team ?? []).map((t) => t.user_id)), [data])
  const found = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (data?.candidates ?? []).filter((c) => !inTeam.has(c.id) && (!q || `${c.name} ${c.phone ?? ''}`.toLowerCase().includes(q))).slice(0, 40)
  }, [data, inTeam, search])

  async function save(member: TeamMemberView) {
    // Shown at once; the server catches up.
    queryClient.setQueryData(['call-team'], (prev: typeof data) =>
      prev ? { ...prev, team: prev.team.some((t) => t.user_id === member.user_id) ? prev.team.map((t) => (t.user_id === member.user_id ? member : t)) : [...prev.team, member] } : prev
    )
    const res = await saveCallTeamMemberAction({ user_id: member.user_id, gender: member.gender, takes: member.takes, max: member.max, active: member.active })
    if (res.error) {
      toast({ variant: 'destructive', title: 'Not saved', description: res.error })
      void team.refetch()
    }
  }

  async function remove(member: TeamMemberView) {
    queryClient.setQueryData(['call-team'], (prev: typeof data) => (prev ? { ...prev, team: prev.team.filter((t) => t.user_id !== member.user_id) } : prev))
    const res = await removeCallTeamMemberAction({ user_id: member.user_id })
    if (res.error) {
      toast({ variant: 'destructive', title: 'Not removed', description: res.error })
      void team.refetch()
    } else toast({ title: `${member.name.split(' ')[0]} left the team`, description: 'Calls they already have stay with them.' })
  }

  if (!can('camp.manage')) return <AccessDenied permission="camp.manage" />

  const active = (data?.team ?? []).filter((t) => t.active).length

  return (
    <div className="mx-auto max-w-4xl pb-28">
      <Link href="/admin/camp-meeting/calls" className="inline-flex h-10 items-center gap-1.5 text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Calls
      </Link>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="app-page-title">Call team</h1>
          <p className="app-page-description mt-1 max-w-xl">Calls are shared among these people when no session is running. Set how each likes to be given them; it saves as you go.</p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <Button variant="outline" className="h-11 flex-1 sm:flex-none" onClick={() => setAdding(true)}>
            <Plus className="mr-2 h-4 w-4" aria-hidden />
            Add people
          </Button>
          <Button className="h-11 flex-1 sm:flex-none" onClick={() => setShareOpen(true)} disabled={!active}>
            <Sparkles className="mr-2 h-4 w-4" aria-hidden />
            Share out the calls
          </Button>
        </div>
      </div>

      {team.isLoading ? (
        <div className="flex min-h-[30vh] items-center justify-center"><LoadingSpinner /></div>
      ) : team.error || !data ? (
        <p className="mt-8 text-sm text-red-700 dark:text-red-300">{team.error instanceof Error ? team.error.message : 'Could not load the call team.'}</p>
      ) : data.team.length === 0 ? (
        <div className="mt-8 flex flex-col items-center rounded-xl border border-dashed border-neutral-300 px-6 py-14 text-center dark:border-neutral-700">
          <p className="app-section-title">No one on the call team yet</p>
          <p className="app-page-description mt-1 max-w-sm">Add the people who make calls. Then one tap shares everyone out among them, with your rules.</p>
          <Button className="mt-5 h-11" onClick={() => setAdding(true)}>
            <Plus className="mr-2 h-4 w-4" aria-hidden />
            Add people
          </Button>
        </div>
      ) : (
        <ul className="mt-6 grid gap-3">
          {data.team.map((m) => (
            <li key={m.user_id} className={cn('dashboard-panel p-4', !m.active && 'opacity-60')}>
              <div className="flex items-start gap-3">
                <PersonAvatar name={m.name} seed={m.user_id} />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-x-2 font-semibold text-neutral-900 dark:text-neutral-50">
                    {m.name}
                    <span className="text-[13px] font-normal text-neutral-500 dark:text-neutral-400">{m.open} open {m.open === 1 ? 'call' : 'calls'}</span>
                  </p>
                  {m.phone ? <p className="font-mono text-[13px] text-neutral-600 dark:text-neutral-400">{m.phone}</p> : null}
                  {!m.canUseApp ? (
                    <p className="mt-1 flex items-center gap-1.5 text-[12px] text-amber-800 dark:text-amber-300">
                      <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
                      Can&apos;t open the app: gets their list by text only.{' '}
                      <Link href="/admin/admins" className="font-medium underline underline-offset-2">Give calling access</Link>
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={m.active}
                  aria-label={m.active ? 'Taking calls' : 'Not taking calls'}
                  onClick={() => void save({ ...m, active: !m.active })}
                  className={cn('relative mt-1 h-6 w-11 shrink-0 rounded-full transition-colors', m.active ? 'bg-emerald-600' : 'bg-neutral-300 dark:bg-neutral-600')}
                >
                  <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-[left]', m.active ? 'left-[22px]' : 'left-0.5')} />
                </button>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-[auto_auto_1fr_auto] sm:items-end">
                <Choice label="Gender" options={GENDERS} value={m.gender} onChange={(gender) => void save({ ...m, gender })} />
                <Choice label="Takes" options={TAKES} value={m.takes} onChange={(takes) => void save({ ...m, takes })} />
                <label className="grid gap-1 text-[12px] font-medium text-neutral-600 dark:text-neutral-400">
                  Most at a time
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={500}
                    placeholder="No limit"
                    defaultValue={m.max ?? ''}
                    onBlur={(e) => {
                      const value = e.target.value ? Number(e.target.value) : null
                      if (value !== m.max) void save({ ...m, max: value })
                    }}
                    className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 sm:w-28"
                  />
                </label>
                <Button variant="ghost" className="h-10 justify-self-start text-red-700 hover:bg-red-50 hover:text-red-800 dark:text-red-300 dark:hover:bg-red-950/40" onClick={() => void remove(m)}>
                  <Trash2 className="mr-1.5 h-4 w-4" aria-hidden />
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={adding} onOpenChange={(v) => { setAdding(v); if (!v) setSearch('') }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to the call team</DialogTitle>
            <DialogDescription>Tap people to add them. Gender comes from their member profile where it&apos;s known.</DialogDescription>
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
            {found.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => void save({ user_id: c.id, name: c.name, phone: c.phone, gender: c.gender, takes: 'all', max: null, active: true, canUseApp: c.canUseApp, open: 0 })}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left hover:bg-neutral-50 dark:hover:bg-white/[0.04]"
                >
                  <PersonAvatar name={c.name} seed={c.id} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">{c.name}</span>
                    <span className="block truncate text-xs text-neutral-500 dark:text-neutral-400">{c.canUseApp ? 'Can open the app' : 'Texts only'}{c.phone ? ` · ${c.phone}` : ''}</span>
                  </span>
                  <Plus className="h-4 w-4 text-brand-600 dark:text-brand-400" aria-hidden />
                </button>
              </li>
            ))}
            {found.length === 0 ? <li className="px-3 py-6 text-center text-sm text-neutral-500">No one else matches.</li> : null}
          </ul>
        </DialogContent>
      </Dialog>

      {data ? (
        <ShareOutDialog open={shareOpen} onOpenChange={setShareOpen} sessionLive={data.sessionPeople.length > 0} sessionPeople={data.sessionPeople.length} teamActive={active} onShared={() => void team.refetch()} />
      ) : null}
    </div>
  )
}

function Choice<T extends string | null>({ label, options, value, onChange }: { label: string; options: Array<{ id: T; label: string }>; value: T; onChange: (v: T) => void }) {
  return (
    <div className="grid gap-1">
      <span className="text-[12px] font-medium text-neutral-600 dark:text-neutral-400">{label}</span>
      <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg bg-neutral-200/60 p-0.5 dark:bg-neutral-800">
        {options.map((o) => (
          <button
            key={String(o.id)}
            type="button"
            role="radio"
            aria-checked={value === o.id}
            onClick={() => onChange(o.id)}
            className={cn(
              'h-9 rounded-md px-3 text-[13px] font-medium transition-colors',
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
