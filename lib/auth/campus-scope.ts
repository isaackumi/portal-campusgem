import 'server-only'

import { guardWith } from '@/lib/auth/action-guard'
import {
  allowsCampusLevel,
  campusAccessLevel,
  isCampusAdmin,
  ledCampusIdsFrom,
  viewableCampusIdsFrom,
  type CampusAccessLevel,
} from '@/lib/campus/scope'
import type { AppUser, Group } from '@/lib/types'

/**
 * Per-campus authorisation for campus server actions. Call it FIRST in the action, before
 * any `guard()` (which would make everything after it trusted):
 *
 *   const { group, user, access } = await guardCampus(groupId, 'manage')
 *
 * Passes for `groups.manage` holders on any campus, and for `campus.lead` holders on the
 * campuses they lead (`manage`) or are an executive of (`view`). The group must really be
 * `group_type: 'campus'`. Only then is the trusted scope entered (via `guardWith`).
 */
export type CampusGuard = {
  group: Group
  /** Null only when already inside a trusted scope (nested call). */
  user: AppUser | null
  access: CampusAccessLevel
  isAdmin: boolean
}

async function loadMemberships(user: AppUser) {
  const { membershipsForUserFromConvex } = await import('@/lib/convex/campus-bridge')
  return membershipsForUserFromConvex(user.id)
}

export async function guardCampus(groupId: string, level: CampusAccessLevel): Promise<CampusGuard> {
  if (typeof groupId !== 'string' || !/^[a-z0-9]{10,64}$/i.test(groupId)) throw new Error('Campus not found.')
  const { fetchGroupFromConvex } = await import('@/lib/convex/core-bridge')
  let group: Group | null = null
  try {
    group = await fetchGroupFromConvex(groupId)
  } catch {
    group = null
  }
  if (!group || group.group_type !== 'campus') throw new Error('Campus not found.')

  let access: CampusAccessLevel | null = null
  let admin = false
  const user = await guardWith(async (u) => {
    admin = isCampusAdmin(u)
    access = admin ? 'manage' : campusAccessLevel(u, await loadMemberships(u), group!.id)
    return allowsCampusLevel(access, level)
  }, level === 'manage' ? 'Only this campus’s leaders can do this.' : 'You can only open campuses you lead.')

  // Trusted nested call: the outer entry point already authorised.
  if (!user) return { group, user: null, access: 'manage', isAdmin: true }
  return { group, user, access: access ?? level, isAdmin: admin }
}

/** Campus ids a user leads (active leader / co-leader, with `campus.lead`). */
export async function ledCampusIds(user: AppUser): Promise<string[]> {
  return ledCampusIdsFrom(user, await loadMemberships(user))
}

/** 'all' for `groups.manage` holders, else the campus ids they lead or are an executive of. */
export async function visibleCampusIds(user: AppUser): Promise<'all' | string[]> {
  if (isCampusAdmin(user)) return 'all'
  return viewableCampusIdsFrom(user, await loadMemberships(user))
}

export type CampusMemberAccess = CampusAccessLevel | 'member'

export type CampusMemberGuard = {
  group: Group
  /** Null only when already inside a trusted scope (nested call). */
  user: AppUser | null
  /** `manage` / `view` as in `guardCampus`; `member` for any other active member of the campus. */
  access: CampusMemberAccess
  isAdmin: boolean
}

/**
 * Like `guardCampus(groupId, 'view')`, but also lets in any ACTIVE member of that campus, in any
 * role (campus outreach: every GEM member on the campus records the students they meet). Same
 * order as `guardCampus`: the id is verified to be a campus, then the user's own access is
 * checked, and only then is the trusted scope entered. The caller must still limit a `member`
 * to their own records: after this, nested `guard()` calls pass.
 */
export async function guardCampusMember(groupId: string): Promise<CampusMemberGuard> {
  if (typeof groupId !== 'string' || !/^[a-z0-9]{10,64}$/i.test(groupId)) throw new Error('Campus not found.')
  const { fetchGroupFromConvex } = await import('@/lib/convex/core-bridge')
  let group: Group | null = null
  try {
    group = await fetchGroupFromConvex(groupId)
  } catch {
    group = null
  }
  if (!group || group.group_type !== 'campus') throw new Error('Campus not found.')

  let access: CampusMemberAccess | null = null
  let admin = false
  const user = await guardWith(async (u) => {
    admin = isCampusAdmin(u)
    if (admin) {
      access = 'manage'
      return true
    }
    const memberships = await loadMemberships(u)
    const level = campusAccessLevel(u, memberships, group!.id)
    if (level) access = level
    else if (memberships.some((m) => m.is_active && m.group_id === group!.id && m.group_type === 'campus')) access = 'member'
    return access != null
  }, 'Only members of this campus can do this.')

  if (!user) return { group, user: null, access: 'manage', isAdmin: true }
  return { group, user, access: access ?? 'member', isAdmin: admin }
}

/** Active campus group ids a user belongs to (any role). */
export async function memberCampusIds(user: AppUser): Promise<string[]> {
  const rows = await loadMemberships(user)
  return Array.from(new Set(rows.filter((m) => m.is_active && m.group_type === 'campus').map((m) => m.group_id)))
}
