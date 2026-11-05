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
