'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Briefcase, Check, ChevronDown, Church, GraduationCap, Landmark, LayoutGrid, Search, Tent, type LucideIcon } from 'lucide-react'
import { useAuth } from '@/components/providers'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { listCampusesAction } from '@/lib/actions/campuses'
import { activeWorkspaceId, buildWorkspaces, shouldShowSwitcher, type Workspace, type WorkspaceKind } from '@/lib/navigation/workspaces'
import { cn } from '@/lib/utils'

const ICONS: Record<Exclude<WorkspaceKind, 'campus'>, LucideIcon> = {
  church: Church,
  rlc: Landmark,
  camp: Tent,
  corporate: Briefcase,
  campuses: GraduationCap,
}

/** Each area's colour (its tile, and the switcher button while you're in it). Full class names for Tailwind. */
const AREA_TONE: Record<Exclude<WorkspaceKind, 'campus'>, string> = {
  church: 'bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300',
  rlc: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  camp: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  corporate: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  campuses: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
}

/** Campuses each get one of these, by id, so a campus keeps its colour from visit to visit. */
const CAMPUS_TONES = [
  'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  'bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300',
  'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300',
  'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
  'bg-lime-100 text-lime-800 dark:bg-lime-500/15 dark:text-lime-300',
  'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-300',
  'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300',
]

function toneOf(w: Workspace): string {
  if (w.kind !== 'campus') return AREA_TONE[w.kind]
  let hash = 0
  for (const ch of w.id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return CAMPUS_TONES[hash % CAMPUS_TONES.length]!
}

/** Show a search box once the list is long enough to need one. */
const SEARCH_FROM = 8

function Glyph({ workspace, className }: { workspace: Workspace; className?: string }) {
  if (workspace.kind === 'campus') {
    return (
      <span className={cn('font-mono text-[11px] font-bold tracking-tight', className)} aria-hidden>
        {workspace.code}
      </span>
    )
  }
  const Icon = ICONS[workspace.kind]
  return <Icon className={cn('h-[18px] w-[18px]', className)} aria-hidden />
}

function useWorkspaces() {
  const { user, can } = useAuth()
  const campusAccess = Boolean(user) && (can('groups.manage') || can('campus.lead'))
  const { data: campuses } = useQuery({
    queryKey: ['workspace-campuses', user?.id],
    enabled: campusAccess,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const res = await listCampusesAction()
      return res.data?.campuses ?? []
    },
  })
  return useMemo(
    () => (user ? buildWorkspaces(can, campusAccess ? (campuses ?? []) : []) : []),
    [user, can, campusAccess, campuses]
  )
}

/**
 * Header workspace switcher: one button that says where you are, opening a panel with every area
 * (church, RLC, camp meeting, Corporate GEM) as coloured tiles and every campus below, with a search
 * once the list is long. The header stays the same size however many campuses there are. Only shown
 * to people who can reach more than one workspace.
 */
export function WorkspaceSwitcher() {
  const pathname = usePathname() ?? '/'
  const workspaces = useWorkspaces()
  const [query, setQuery] = useState('')
  const activeId = activeWorkspaceId(pathname, workspaces)
  if (!shouldShowSwitcher(workspaces)) return null

  const active = workspaces.find((w) => w.id === activeId) ?? workspaces[0]!
  const q = query.trim().toLowerCase()
  const matches = (w: Workspace) => !q || `${w.label} ${w.code ?? ''} ${w.description}`.toLowerCase().includes(q)
  const areas = workspaces.filter((w) => w.kind !== 'campus' && matches(w))
  const campuses = workspaces.filter((w) => w.kind === 'campus' && matches(w))
  const searchable = workspaces.length >= SEARCH_FROM

  return (
    <div data-tour="workspace-switcher" className="shrink-0">
      <DropdownMenu onOpenChange={(open) => !open && setQuery('')}>
        <DropdownMenuTrigger
          className="group inline-flex h-9 items-center gap-2 rounded-lg pl-1 pr-2 text-neutral-800 outline-none transition-colors hover:bg-neutral-200/70 focus-visible:ring-2 focus-visible:ring-brand-500/40 data-[state=open]:bg-neutral-200/70 dark:text-neutral-100 dark:hover:bg-neutral-800 dark:data-[state=open]:bg-neutral-800"
          aria-label={`Workspace: ${active.label}. Switch workspace`}
        >
          <span className={cn('flex h-7 w-7 items-center justify-center rounded-md', toneOf(active))}>
            <LayoutGrid className="h-4 w-4" aria-hidden />
          </span>
          <span className="hidden max-w-[11rem] truncate text-sm font-semibold sm:inline">{active.label}</span>
          <ChevronDown className="h-3.5 w-3.5 text-neutral-400 transition-transform group-data-[state=open]:rotate-180 dark:text-neutral-500" aria-hidden />
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="start"
          sideOffset={8}
          className="w-[min(26rem,calc(100vw-1.5rem))] rounded-2xl border-neutral-200/80 bg-white p-0 shadow-pop dark:border-white/10 dark:bg-neutral-900"
        >
          <div className="border-b border-neutral-200/80 px-4 pb-3 pt-3.5 dark:border-white/10">
            <p className="app-overline">Switch workspace</p>
            {searchable ? (
              <label className="relative mt-2.5 block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  // Typing goes into the box, not the menu's jump-to-item.
                  onKeyDown={(e) => {
                    if (e.key !== 'ArrowDown' && e.key !== 'Escape') e.stopPropagation()
                  }}
                  placeholder="Find a campus or area"
                  aria-label="Find a workspace"
                  className="h-10 w-full rounded-lg border border-neutral-200 bg-neutral-50 pl-9 pr-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:focus:bg-neutral-800"
                />
              </label>
            ) : null}
          </div>

          <div className="max-h-[min(70vh,34rem)] overflow-y-auto p-2">
            {areas.length > 0 ? (
              <div className="grid grid-cols-2 gap-1.5">
                {areas.map((w) => (
                  <DropdownMenuItem key={w.id} asChild className="cursor-pointer rounded-xl p-0 focus:bg-transparent">
                    <Link
                      href={w.href}
                      aria-current={w.id === activeId ? 'page' : undefined}
                      className={cn(
                        'relative flex flex-col items-start gap-2 rounded-xl border p-3 transition-colors',
                        w.id === activeId
                          ? 'border-brand-300 bg-brand-50/70 dark:border-brand-500/40 dark:bg-brand-500/10'
                          : 'border-transparent hover:border-neutral-200 hover:bg-neutral-50 data-[highlighted]:border-neutral-200 data-[highlighted]:bg-neutral-50 dark:hover:border-white/10 dark:hover:bg-white/[0.04] dark:data-[highlighted]:border-white/10 dark:data-[highlighted]:bg-white/[0.04]'
                      )}
                    >
                      <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg', toneOf(w))}>
                        <Glyph workspace={w} />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-neutral-900 dark:text-neutral-50">{w.label}</span>
                        <span className="line-clamp-2 block text-xs leading-snug text-neutral-500 dark:text-neutral-400">{w.description}</span>
                      </span>
                      {w.id === activeId ? <Check className="absolute right-2.5 top-2.5 h-4 w-4 text-brand-600 dark:text-brand-400" aria-hidden /> : null}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </div>
            ) : null}

            {campuses.length > 0 ? (
              <>
                <p className="app-overline px-2 pb-1.5 pt-4">Campuses · {campuses.length}</p>
                <div className="grid gap-0.5">
                  {campuses.map((w) => (
                    <DropdownMenuItem key={w.id} asChild className="cursor-pointer rounded-lg p-0 focus:bg-transparent">
                      <Link
                        href={w.href}
                        aria-current={w.id === activeId ? 'page' : undefined}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-2 py-2 transition-colors',
                          w.id === activeId
                            ? 'bg-brand-50/70 dark:bg-brand-500/10'
                            : 'hover:bg-neutral-50 data-[highlighted]:bg-neutral-50 dark:hover:bg-white/[0.04] dark:data-[highlighted]:bg-white/[0.04]'
                        )}
                      >
                        <span className={cn('flex h-8 w-11 shrink-0 items-center justify-center rounded-md', toneOf(w))}>
                          <Glyph workspace={w} />
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">{w.label}</span>
                        {w.id === activeId ? <Check className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" aria-hidden /> : null}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </div>
              </>
            ) : null}

            {areas.length === 0 && campuses.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">Nothing called “{query.trim()}”.</p>
            ) : null}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
