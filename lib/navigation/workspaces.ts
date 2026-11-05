import type { Permission } from '@/lib/auth/roles'

/**
 * Workspaces for the header switcher: the main church, RLC, camp meeting, Corporate GEM
 * and each campus fellowship. Pure, so it can be tested; the component supplies `can`.
 */
export type WorkspaceKind = 'church' | 'rlc' | 'camp' | 'corporate' | 'campuses' | 'campus'

export type Workspace = {
  id: string
  kind: WorkspaceKind
  label: string
  /** Short text for the icon chip (campuses: UEW, UCC, …). */
  code?: string
  href: string
  description: string
}

export type CampusLink = { id: string; key: string; name: string; short_code?: string }

const FIXED: Array<Workspace & { permission: Permission | Permission[] }> = [
  {
    id: 'church',
    kind: 'church',
    label: 'Campus GEM',
    href: '/dashboard',
    description: 'Church dashboard, members and groups',
    permission: 'dashboard.view',
  },
  {
    id: 'rlc',
    kind: 'rlc',
    label: 'RLC',
    href: '/admin/rlc',
    description: 'Redemption Light Chapel',
    permission: 'rlc.view',
  },
  {
    id: 'camp',
    kind: 'camp',
    label: 'Camp meeting',
    href: '/admin/camp-meeting',
    description: 'Registrations, calls and check-in',
    permission: 'camp.view',
  },
  {
    id: 'corporate',
    kind: 'corporate',
    label: 'Corporate GEM',
    href: '/admin/corporate-gem',
    description: 'Graduates and workers',
    permission: 'groups.manage',
  },
]

/** Short label for a campus chip: its code, else initials of the name (max 4 letters). */
export function campusCode(campus: Pick<CampusLink, 'name' | 'short_code'>): string {
  const code = campus.short_code?.trim()
  if (code) return code.toUpperCase().slice(0, 5)
  const letters = campus.name
    .replace(/\(.*?\)/g, ' ')
    .split(/[^A-Za-z]+/)
    .filter((w) => w && !/^(of|the|and|for)$/i.test(w))
    .map((w) => w[0]!.toUpperCase())
    .join('')
  return letters.slice(0, 4) || campus.name.slice(0, 3).toUpperCase()
}

export function buildWorkspaces(
  can: (permission: Permission) => boolean,
  campuses: readonly CampusLink[]
): Workspace[] {
  const allowed = (p: Permission | Permission[]) => (Array.isArray(p) ? p.some(can) : can(p))
  const list: Workspace[] = FIXED.filter((w) => allowed(w.permission)).map(({ permission: _p, ...w }) => w)
  if (can('groups.manage') || can('campus.lead')) {
    for (const c of campuses) {
      list.push({
        id: `campus:${c.id}`,
        kind: 'campus',
        label: c.name,
        code: campusCode(c),
        href: `/campuses/${encodeURIComponent(c.key)}`,
        description: 'Campus fellowship',
      })
    }
    // Admins see the overview of every campus too.
    if (can('groups.manage') && campuses.length > 0) {
      list.push({
        id: 'campuses',
        kind: 'campuses',
        label: 'All campuses',
        href: '/campuses',
        description: 'Every campus fellowship, onboarding and unassigned students',
      })
    }
  }
  return list
}

/** The switcher is only useful when there is somewhere else to go. */
export function shouldShowSwitcher(workspaces: readonly Workspace[]): boolean {
  return workspaces.length >= 2
}

function under(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

/** Which workspace the current page belongs to. Falls back to the main church one. */
export function activeWorkspaceId(pathname: string, workspaces: readonly Workspace[]): string | null {
  const path = pathname.split(/[?#]/)[0] || '/'
  if (under(path, '/campuses')) {
    const key = decodeURIComponent(path.split('/')[2] ?? '')
    if (key) {
      const match = workspaces.find((w) => w.kind === 'campus' && w.href === `/campuses/${encodeURIComponent(key)}`)
      if (match) return match.id
    }
    return workspaces.some((w) => w.id === 'campuses') ? 'campuses' : null
  }
  if (under(path, '/admin/rlc') || under(path, '/visitors')) return has(workspaces, 'rlc')
  if (under(path, '/admin/camp-meeting')) return has(workspaces, 'camp')
  if (under(path, '/admin/corporate-gem')) return has(workspaces, 'corporate')
  return has(workspaces, 'church')
}

function has(workspaces: readonly Workspace[], id: string): string | null {
  return workspaces.some((w) => w.id === id) ? id : null
}
