import { hasPermission } from '@/lib/auth/roles'
import type { GroupMembership, UserRole } from '@/lib/types'

/**
 * Who may open / change a campus page. Pure, so it is unit-tested; the server wrapper
 * (lib/auth/campus-scope.ts) loads the user's memberships and the group, then asks here.
 *
 * - `groups.manage` holders (admin, pastor, elder, or a per-user grant): every campus.
 * - `campus.lead` holders: `manage` on campuses where they are an ACTIVE leader / co-leader,
 *   `view` on campuses where they are an active executive. Nothing anywhere else.
 * - Everyone else: nothing.
 */
export type CampusAccessLevel = 'view' | 'manage'

export type CampusScopeMembership = {
  group_id: string
  role: GroupMembership['role']
  is_active: boolean
  /** Group type of `group_id` when known; anything but 'campus' never grants campus access. */
  group_type?: string
}

export type CampusScopeUser = {
  role: UserRole | null | undefined
  permissions?: readonly unknown[] | null
}

const LEAD_ROLES: ReadonlySet<GroupMembership['role']> = new Set<GroupMembership['role']>(['leader', 'co_leader'])

export function isCampusAdmin(user: CampusScopeUser): boolean {
  return hasPermission(user.role, 'groups.manage', user.permissions)
}

export function canLeadCampuses(user: CampusScopeUser): boolean {
  return hasPermission(user.role, 'campus.lead', user.permissions)
}

function campusRows(memberships: readonly CampusScopeMembership[]): CampusScopeMembership[] {
  return memberships.filter((m) => m.is_active && (m.group_type === undefined || m.group_type === 'campus'))
}

/** The access a user has on one campus, or null. */
export function campusAccessLevel(
  user: CampusScopeUser,
  memberships: readonly CampusScopeMembership[],
  groupId: string
): CampusAccessLevel | null {
  if (!groupId) return null
  if (isCampusAdmin(user)) return 'manage'
  if (!canLeadCampuses(user)) return null
  let best: CampusAccessLevel | null = null
  for (const m of campusRows(memberships)) {
    if (m.group_id !== groupId) continue
    if (LEAD_ROLES.has(m.role)) return 'manage'
    if (m.role === 'executive') best = 'view'
  }
  return best
}

export function allowsCampusLevel(have: CampusAccessLevel | null, need: CampusAccessLevel): boolean {
  if (!have) return false
  return need === 'view' || have === 'manage'
}

/** Campus ids this user leads (active leader / co-leader), only when they hold `campus.lead`. */
export function ledCampusIdsFrom(user: CampusScopeUser, memberships: readonly CampusScopeMembership[]): string[] {
  if (!canLeadCampuses(user)) return []
  return Array.from(new Set(campusRows(memberships).filter((m) => LEAD_ROLES.has(m.role)).map((m) => m.group_id)))
}

/** Campus ids this user can open without `groups.manage` (led + executive of). */
export function viewableCampusIdsFrom(
  user: CampusScopeUser,
  memberships: readonly CampusScopeMembership[]
): string[] {
  if (!canLeadCampuses(user)) return []
  return Array.from(
    new Set(
      campusRows(memberships)
        .filter((m) => LEAD_ROLES.has(m.role) || m.role === 'executive')
        .map((m) => m.group_id)
    )
  )
}

/**
 * Non-admin leaders run their campus but cannot hand out or take away the top seat:
 * only `groups.manage` holders may set someone as `leader` or change an existing leader.
 */
export function canAssignCampusRole(
  isAdmin: boolean,
  next: GroupMembership['role'],
  current?: GroupMembership['role'] | null
): boolean {
  if (isAdmin) return true
  if (next === 'leader') return false
  if (current === 'leader') return false
  return true
}
