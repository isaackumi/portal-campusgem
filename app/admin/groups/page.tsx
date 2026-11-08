'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ExternalLink, FileText, MessageSquare, MoreHorizontal, Pencil, Plus, Power, Search, Trash2, X } from 'lucide-react'
import { useAuth } from '@/components/providers'
import { AccessDenied } from '@/components/auth/access-denied'
import { GroupFormDialog, type GroupFormValues } from '@/components/groups/group-form-dialog'
import type { CampusIdentityValue } from '@/components/campus/campus-identity-fields'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LoadingSpinner } from '@/components/ui/loading'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/hooks/use-toast'
import { useCreateGroup, useDeleteGroup, useUpdateGroup } from '@/lib/hooks/use-data'
import { loadGroupsOverviewAction, type GroupOverview } from '@/lib/actions/groups'
import { setCampusIdentityAction } from '@/lib/actions/campuses'
import { GROUP_TYPES, getGroupTypeLabel } from '@/lib/constants/groups'
import type { Group } from '@/lib/types'
import { cn } from '@/lib/utils'

type StatusFilter = 'active' | 'inactive' | 'all'

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'min-h-8 shrink-0 rounded-full border px-3 text-[13px] font-medium transition-colors',
        active
          ? 'border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900'
          : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 dark:border-white/10 dark:bg-transparent dark:text-neutral-300 dark:hover:border-white/20'
      )}
    >
      {children}
    </button>
  )
}

function leaderText(g: GroupOverview): string | null {
  if (g.leaders.length === 0) return null
  const names = g.leaders.map((l) => l.name)
  return names.length <= 2 ? names.join(', ') : `${names.slice(0, 2).join(', ')} +${names.length - 2}`
}

export default function GroupsManagementPage() {
  const { loading: authLoading, can } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [query, setQuery] = useState('')
  const [type, setType] = useState<string>('all')
  const [status, setStatus] = useState<StatusFilter>('active')
  const [noLeaderOnly, setNoLeaderOnly] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Group | null>(null)
  const queryClient = useQueryClient()

  // /admin/groups?type=campus opens on that kind (and new groups default to it).
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('type')
    if (t && GROUP_TYPES.some((g) => g.value === t)) setType(t)
  }, [])

  const { createGroup, loading: creating } = useCreateGroup()
  const { updateGroup, loading: updating } = useUpdateGroup()
  const { deleteGroup } = useDeleteGroup()

  const { data: groups, isLoading, error, refetch } = useQuery({
    queryKey: ['groups-overview'],
    queryFn: async () => {
      const res = await loadGroupsOverviewAction()
      if (res.error) throw new Error(res.error)
      return res.data ?? []
    },
    enabled: can('groups.manage'),
  })

  const all = useMemo(() => groups ?? [], [groups])
  const byStatus = useMemo(
    () => all.filter((g) => (status === 'all' ? true : status === 'active' ? g.is_active : !g.is_active)),
    [all, status]
  )
  const typeCounts = useMemo(() => {
    const m = new Map<string, number>()
    for (const g of byStatus) m.set(g.group_type, (m.get(g.group_type) ?? 0) + 1)
    return m
  }, [byStatus])
  const noLeaderCount = useMemo(() => byStatus.filter((g) => g.leaders.length === 0).length, [byStatus])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return byStatus
      .filter((g) => type === 'all' || g.group_type === type)
      .filter((g) => !noLeaderOnly || g.leaders.length === 0)
      .filter((g) => {
        if (!q) return true
        const hay = [g.name, g.description, g.meeting_location, g.meeting_schedule, g.short_code, ...g.leaders.map((l) => l.name)]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return q.split(/\s+/).every((w) => hay.includes(w))
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [byStatus, type, noLeaderOnly, query])

  const totals = useMemo(() => {
    const active = all.filter((g) => g.is_active)
    return { groups: active.length, places: active.reduce((n, g) => n + g.member_count, 0) }
  }, [all])

  if (authLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }
  if (!can('groups.manage')) return <AccessDenied permission="groups.manage" />

  async function save(values: GroupFormValues, campus: CampusIdentityValue) {
    try {
      const result = editing ? await updateGroup(editing.id, values) : await createGroup(values)
      if (!result) throw new Error('Not saved')
      const id = editing?.id ?? (result as Group).id
      if (values.group_type === 'campus' && id) {
        const res = await setCampusIdentityAction(id, campus)
        if (res.error) toast({ variant: 'destructive', title: 'Campus tag not saved', description: res.error })
      }
      toast({ title: editing ? `${values.name} saved` : `${values.name} created` })
      setFormOpen(false)
      setEditing(null)
      await refetch()
      void queryClient.invalidateQueries({ queryKey: ['workspace-campuses'] })
      if (!editing && id) router.push(`/groups/${id}`)
    } catch (e) {
      toast({ variant: 'destructive', title: 'Could not save the group', description: e instanceof Error ? e.message : undefined })
    }
  }

  async function toggleActive(g: GroupOverview) {
    const result = await updateGroup(g.id, { is_active: !g.is_active })
    if (!result) {
      toast({ variant: 'destructive', title: 'Could not change the group' })
      return
    }
    toast({ title: g.is_active ? `${g.name} is now inactive` : `${g.name} is active again` })
    await refetch()
  }

  async function remove(g: GroupOverview) {
    const extra = g.member_count ? ` Its ${g.member_count} ${g.member_count === 1 ? 'membership' : 'memberships'} will be removed.` : ''
    if (!window.confirm(`Delete ${g.name}?${extra} This can't be undone. To keep its history, make it inactive instead.`)) return
    const result = await deleteGroup(g.id)
    if (!result) {
      toast({ variant: 'destructive', title: 'Could not delete the group' })
      return
    }
    toast({ title: `${g.name} deleted` })
    await refetch()
  }

  const rowMenu = (g: GroupOverview) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9" aria-label={`${g.name} actions`} onClick={(e) => e.stopPropagation()}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem asChild className="min-h-10 gap-2">
          <Link href={`/groups/${g.id}`}>
            <ExternalLink className="h-4 w-4" /> Open members
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="min-h-10 gap-2"
          onSelect={() => {
            setEditing(g)
            setFormOpen(true)
          }}
        >
          <Pencil className="h-4 w-4" /> Edit details
        </DropdownMenuItem>
        {can('sms.send') ? (
          <DropdownMenuItem asChild className="min-h-10 gap-2">
            <Link href={`/groups/${g.id}?tab=messages`}>
              <MessageSquare className="h-4 w-4" /> Text members
            </Link>
          </DropdownMenuItem>
        ) : null}
        {can('forms.manage') ? (
          <DropdownMenuItem asChild className="min-h-10 gap-2">
            <Link href={`/admin/forms?group=${encodeURIComponent(g.id)}`}>
              <FileText className="h-4 w-4" /> Forms for this group
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="min-h-10 gap-2" onSelect={() => void toggleActive(g)}>
          <Power className="h-4 w-4" /> {g.is_active ? 'Make inactive' : 'Make active'}
        </DropdownMenuItem>
        <DropdownMenuItem className="min-h-10 gap-2 text-red-600 focus:text-red-700 dark:text-red-400" onSelect={() => void remove(g)}>
          <Trash2 className="h-4 w-4" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  const typesPresent = GROUP_TYPES.filter((t) => typeCounts.has(t.value))

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="app-page-title">Groups</h1>
          <p className="app-page-description mt-1">
            {isLoading
              ? 'Fellowships, campuses, ministries and activities.'
              : `${totals.groups} active ${totals.groups === 1 ? 'group' : 'groups'} · ${totals.places} memberships. Open a group to manage its members.`}
          </p>
        </div>
        <Button
          className="h-11 sm:h-10"
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> New group
        </Button>
      </div>

      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative sm:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search groups, places or leaders"
              aria-label="Search groups"
              className="h-11 pl-9 pr-9 sm:h-10"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          <div className="flex gap-1.5">
            <Chip active={status === 'active'} onClick={() => setStatus('active')}>Active</Chip>
            <Chip active={status === 'inactive'} onClick={() => setStatus('inactive')}>Inactive</Chip>
            <Chip active={status === 'all'} onClick={() => setStatus('all')}>All</Chip>
          </div>
        </div>
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          <Chip active={type === 'all' && !noLeaderOnly} onClick={() => { setType('all'); setNoLeaderOnly(false) }}>
            Every kind ({byStatus.length})
          </Chip>
          {typesPresent.map((t) => (
            <Chip key={t.value} active={type === t.value} onClick={() => setType(type === t.value ? 'all' : t.value)}>
              {t.label} ({typeCounts.get(t.value)})
            </Chip>
          ))}
          {noLeaderCount > 0 ? (
            <Chip active={noLeaderOnly} onClick={() => setNoLeaderOnly((v) => !v)}>
              No leader ({noLeaderCount})
            </Chip>
          ) : null}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <div className="dashboard-panel p-6 text-center">
          <p className="font-medium text-neutral-900 dark:text-white">Couldn&apos;t load groups</p>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{error instanceof Error ? error.message : ''}</p>
          <Button className="mt-4 h-10" variant="outline" onClick={() => void refetch()}>
            Try again
          </Button>
        </div>
      ) : shown.length === 0 ? (
        <div className="dashboard-panel p-8 text-center">
          <p className="font-medium text-neutral-900 dark:text-white">{all.length === 0 ? 'No groups yet' : 'No groups match'}</p>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            {all.length === 0 ? 'Create your first fellowship, campus or ministry.' : 'Try another search or filter.'}
          </p>
        </div>
      ) : (
        <div className="dashboard-panel overflow-hidden p-0">
          {/* Wide screens: a table you can scan */}
          <table className="hidden w-full text-sm md:table">
            <thead>
              <tr className="border-b border-neutral-200/80 text-left text-xs font-medium text-neutral-500 dark:border-white/[0.06] dark:text-neutral-400">
                <th scope="col" className="px-4 py-2.5 font-medium">Group</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Leaders</th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">Members</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Meets</th>
                <th scope="col" className="w-12 px-2 py-2.5"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-white/[0.06]">
              {shown.map((g) => {
                const leaders = leaderText(g)
                return (
                  <tr
                    key={g.id}
                    onClick={() => router.push(`/groups/${g.id}`)}
                    className={cn('cursor-pointer hover:bg-neutral-50 dark:hover:bg-white/[0.03]', !g.is_active && 'opacity-60')}
                  >
                    <td className="px-4 py-3">
                      <Link href={`/groups/${g.id}`} className="font-medium text-neutral-900 hover:underline dark:text-white" onClick={(e) => e.stopPropagation()}>
                        {g.name}
                      </Link>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                        <span>{getGroupTypeLabel(g.group_type)}</span>
                        {g.short_code ? <span className="font-mono">{g.short_code}</span> : null}
                        {!g.is_active ? <Badge variant="secondary" className="px-1.5 py-0 text-[11px]">Inactive</Badge> : null}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {leaders ? (
                        <span className="text-neutral-800 dark:text-neutral-200">{leaders}</span>
                      ) : (
                        <span className="text-amber-700 dark:text-amber-300">No leader</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-neutral-800 dark:text-neutral-200">
                      {g.member_count}
                      {g.max_members ? <span className="text-neutral-400 dark:text-neutral-500"> / {g.max_members}</span> : null}
                    </td>
                    <td className="max-w-[16rem] px-4 py-3 text-neutral-600 dark:text-neutral-400">
                      <span className="line-clamp-2">
                        {[g.meeting_schedule, g.meeting_location].filter(Boolean).join(' · ') || '—'}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      {rowMenu(g)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Phones: a list */}
          <ul className="divide-y divide-neutral-100 dark:divide-white/[0.06] md:hidden">
            {shown.map((g) => {
              const leaders = leaderText(g)
              return (
                <li key={g.id} className={cn('flex items-start gap-2 px-4 py-3', !g.is_active && 'opacity-60')}>
                  <Link href={`/groups/${g.id}`} className="min-w-0 flex-1">
                    <p className="truncate font-medium text-neutral-900 dark:text-white">{g.name}</p>
                    <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-400">
                      {getGroupTypeLabel(g.group_type)} · {g.member_count} {g.member_count === 1 ? 'member' : 'members'}
                      {!g.is_active ? ' · Inactive' : ''}
                    </p>
                    <p className={cn('mt-0.5 truncate text-xs', leaders ? 'text-neutral-600 dark:text-neutral-300' : 'text-amber-700 dark:text-amber-300')}>
                      {leaders ? `Led by ${leaders}` : 'No leader'}
                    </p>
                  </Link>
                  {rowMenu(g)}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <GroupFormDialog
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o)
          if (!o) setEditing(null)
        }}
        editing={editing}
        defaultType={type !== 'all' ? (type as Group['group_type']) : undefined}
        saving={creating || updating}
        onSave={(v, c) => void save(v, c)}
      />
    </div>
  )
}
