'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Briefcase, Check, ChevronDown, Church, GraduationCap, Landmark, MoreHorizontal, Tent, type LucideIcon } from 'lucide-react'
import { useAuth } from '@/components/providers'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { listCampusesAction } from '@/lib/actions/campuses'
import {
  activeWorkspaceId,
  buildWorkspaces,
  shouldShowSwitcher,
  type Workspace,
  type WorkspaceKind,
} from '@/lib/navigation/workspaces'
import { cn } from '@/lib/utils'

const ICONS: Record<Exclude<WorkspaceKind, 'campus'>, LucideIcon> = {
  church: Church,
  rlc: Landmark,
  camp: Tent,
  corporate: Briefcase,
  campuses: GraduationCap,
}

/** Campus chips shown inline on wide screens; the rest go in the "more" menu. */
const INLINE_CAMPUSES = 4

function WorkspaceGlyph({ workspace, className }: { workspace: Workspace; className?: string }) {
  if (workspace.kind === 'campus') {
    return (
      <span className={cn('font-mono text-[11px] font-semibold tracking-tight', className)} aria-hidden>
        {workspace.code}
      </span>
    )
  }
  const Icon = ICONS[workspace.kind]
  return <Icon className={cn('h-4 w-4', className)} aria-hidden />
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

function MenuItems({ workspaces, activeId }: { workspaces: Workspace[]; activeId: string | null }) {
  const areas = workspaces.filter((w) => w.kind !== 'campus')
  const campuses = workspaces.filter((w) => w.kind === 'campus')
  const row = (w: Workspace) => (
    <DropdownMenuItem key={w.id} asChild className="cursor-pointer gap-3 py-2">
      <Link href={w.href} aria-current={w.id === activeId ? 'page' : undefined}>
        <span className="flex h-7 w-9 shrink-0 items-center justify-center rounded-md bg-neutral-100 text-neutral-600 dark:bg-white/[0.06] dark:text-neutral-300">
          <WorkspaceGlyph workspace={w} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">{w.label}</span>
          <span className="block truncate text-xs text-neutral-500 dark:text-neutral-400">{w.description}</span>
        </span>
        {w.id === activeId && <Check className="h-4 w-4 text-brand-600 dark:text-brand-400" aria-hidden />}
      </Link>
    </DropdownMenuItem>
  )
  return (
    <>
      {areas.map(row)}
      {campuses.length > 0 && (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="app-overline px-2 py-1.5">Campuses</DropdownMenuLabel>
          {campuses.map(row)}
        </>
      )}
    </>
  )
}

/**
 * Header switcher between the church, RLC, camp meeting, Corporate GEM and each campus.
 * Only shown to people who can reach more than one of them. Icon row on wide screens,
 * a single menu on small ones.
 */
export function WorkspaceSwitcher() {
  const pathname = usePathname() ?? '/'
  const workspaces = useWorkspaces()
  const activeId = activeWorkspaceId(pathname, workspaces)
  if (!shouldShowSwitcher(workspaces)) return null

  const active = workspaces.find((w) => w.id === activeId) ?? workspaces[0]!
  const areas = workspaces.filter((w) => w.kind !== 'campus')
  const campuses = workspaces.filter((w) => w.kind === 'campus')
  const inlineCampuses = campuses.slice(0, INLINE_CAMPUSES)
  // Keep the current campus visible even when it would be in the overflow.
  if (active.kind === 'campus' && !inlineCampuses.includes(active)) inlineCampuses[inlineCampuses.length - 1] = active
  const overflow = campuses.length > inlineCampuses.length

  const chip = (w: Workspace) => {
    const isActive = w.id === activeId
    return (
      <Link
        key={w.id}
        href={w.href}
        title={w.label}
        aria-label={w.label}
        aria-current={isActive ? 'page' : undefined}
        className={cn(
          'inline-flex h-8 min-w-8 items-center justify-center rounded-md px-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40',
          isActive
            ? 'bg-white text-brand-700 shadow-sm ring-1 ring-neutral-900/5 dark:bg-neutral-800 dark:text-brand-300 dark:ring-white/10'
            : 'text-neutral-500 hover:bg-white/70 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800/70 dark:hover:text-white'
        )}
      >
        <WorkspaceGlyph workspace={w} />
      </Link>
    )
  }

  return (
    <div data-tour="workspace-switcher" className="shrink-0">
      {/* Wide screens: one-tap icons. */}
      <nav
        aria-label="Switch workspace"
        className="hidden items-center gap-0.5 rounded-lg bg-neutral-200/60 p-0.5 dark:bg-neutral-900 lg:flex"
      >
        {areas.map(chip)}
        {inlineCampuses.length > 0 && <span className="mx-0.5 h-5 w-px bg-neutral-900/10 dark:bg-white/10" aria-hidden />}
        {inlineCampuses.map(chip)}
        {overflow && (
          <DropdownMenu>
            <DropdownMenuTrigger
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-neutral-500 outline-none hover:bg-white/70 hover:text-neutral-900 focus-visible:ring-2 focus-visible:ring-brand-500/40 dark:text-neutral-400 dark:hover:bg-neutral-800/70 dark:hover:text-white"
              aria-label="More workspaces"
              title="More workspaces"
            >
              <MoreHorizontal className="h-4 w-4" aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-72">
              <MenuItems workspaces={workspaces} activeId={activeId} />
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </nav>

      {/* Small screens: one menu showing where you are. */}
      <DropdownMenu>
        <DropdownMenuTrigger
          className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-neutral-700 outline-none hover:bg-neutral-200/70 focus-visible:ring-2 focus-visible:ring-brand-500/40 dark:text-neutral-200 dark:hover:bg-neutral-800 lg:hidden"
          aria-label={`Workspace: ${active.label}. Switch workspace`}
        >
          <WorkspaceGlyph workspace={active} />
          <ChevronDown className="h-3.5 w-3.5 text-neutral-400 dark:text-neutral-500" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <MenuItems workspaces={workspaces} activeId={activeId} />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
