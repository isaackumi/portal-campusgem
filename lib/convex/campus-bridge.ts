import 'server-only'

import { getConvexHttpClient } from '@/lib/convex/http-client'
import { api } from '@/convex/_generated/api'
import {
  convexGroupDocToGroup,
  convexGroupMembershipDocToGroupMembership,
  convexMemberDocToMember,
  convexUserDocToAppUser,
  requireCoreServerSecret,
} from '@/lib/convex/core-bridge'
import type { Group, GroupMembership } from '@/lib/types'
import type { CampusScopeMembership } from '@/lib/campus/scope'

/** Server-side access to convex/campuses.ts. Callers authorise first (lib/auth/campus-scope.ts). */

export type CampusSummary = Group & {
  member_count: number
  leader_count: number
  executive_count: number
}

export type CampusRef = { group_id: string; name: string; short_code: string | null }

export type PlaceOnCampusResult =
  | { status: 'added' | 'unchanged' | 'moved'; membership_id: string; from: CampusRef | null }
  | { status: 'needs_move' | 'blocked_leader'; from: CampusRef & { role: GroupMembership['role'] } }

export type PeopleIndexRow = {
  user_id: string
  member_id: string | null
  full_name: string
  phone: string | null
  secondary_phone: string | null
  school_or_workplace: string | null
  area_of_residence: string | null
  place_of_work: string | null
  congregation: string | null
  campus_group_id: string | null
}

export type CampusTagMap = {
  campuses: Array<{ id: string; name: string; short_code: string | null; slug: string | null; is_active: boolean }>
  rows: Array<{ member_id: string; user_id: string; group_id: string; role: GroupMembership['role'] }>
}

function secret() {
  return requireCoreServerSecret()
}

export async function listCampusesFromConvex(includeInactive = false): Promise<CampusSummary[]> {
  const rows = (await getConvexHttpClient().query(api.campuses.listCampusesWithSecret, {
    secret: secret(),
    include_inactive: includeInactive,
  })) as Array<{ group: Record<string, unknown>; member_count: number; leader_count: number; executive_count: number }>
  return rows
    .map((r) => {
      const group = convexGroupDocToGroup(r.group)
      return group
        ? { ...group, member_count: r.member_count, leader_count: r.leader_count, executive_count: r.executive_count }
        : null
    })
    .filter((g): g is CampusSummary => g != null)
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function findCampusFromConvex(key: string): Promise<Group | null> {
  const doc = (await getConvexHttpClient().query(api.campuses.findCampusWithSecret, {
    secret: secret(),
    key,
  })) as Record<string, unknown> | null
  return convexGroupDocToGroup(doc)
}

export async function membershipsForUserFromConvex(userId: string): Promise<CampusScopeMembership[]> {
  return (await getConvexHttpClient().query(api.campuses.membershipsForUserWithSecret, {
    secret: secret(),
    user_id: userId,
  })) as CampusScopeMembership[]
}

export async function campusTagMapFromConvex(): Promise<CampusTagMap> {
  return (await getConvexHttpClient().query(api.campuses.campusTagMapWithSecret, { secret: secret() })) as CampusTagMap
}

/** Active campus memberships with profile + user (mapped: no auth_uid). */
export async function listCampusMembersFromConvex(groupId: string): Promise<GroupMembership[]> {
  const rows = (await getConvexHttpClient().query(api.campuses.listCampusMembersWithSecret, {
    secret: secret(),
    group_id: groupId,
  })) as Array<{ membership: Record<string, unknown>; member: Record<string, unknown> | null; user: Record<string, unknown> | null }>
  return rows
    .map((r) => {
      const membership = convexGroupMembershipDocToGroupMembership(r.membership)
      if (!membership) return null
      const member = convexMemberDocToMember(r.member)
      const user = convexUserDocToAppUser(r.user) ?? undefined
      return { ...membership, member: member ? { ...member, user } : undefined }
    })
    .filter((m): m is NonNullable<typeof m> => m != null) as GroupMembership[]
}

export async function peopleIndexFromConvex(): Promise<PeopleIndexRow[]> {
  return (await getConvexHttpClient().query(api.campuses.peopleIndexWithSecret, { secret: secret() })) as PeopleIndexRow[]
}

export async function placeUserOnCampusInConvex(args: {
  group_id: string
  user_id: string
  role: GroupMembership['role']
  confirm_move: boolean
  keep_existing_role?: boolean
  protect_leaders?: boolean
}): Promise<PlaceOnCampusResult> {
  return (await getConvexHttpClient().mutation(api.campuses.placeUserOnCampusWithSecret, {
    secret: secret(),
    ...args,
  })) as PlaceOnCampusResult
}

export async function getCampusMembershipFromConvex(groupId: string, membershipId: string): Promise<GroupMembership | null> {
  const doc = (await getConvexHttpClient().query(api.campuses.getCampusMembershipWithSecret, {
    secret: secret(),
    group_id: groupId,
    membership_id: membershipId,
  })) as Record<string, unknown> | null
  return convexGroupMembershipDocToGroupMembership(doc)
}

export async function setCampusMembershipRoleInConvex(groupId: string, membershipId: string, role: GroupMembership['role']) {
  await getConvexHttpClient().mutation(api.campuses.setCampusMembershipRoleWithSecret, {
    secret: secret(),
    group_id: groupId,
    membership_id: membershipId,
    role,
  })
}

export async function endCampusMembershipInConvex(groupId: string, membershipId: string) {
  await getConvexHttpClient().mutation(api.campuses.endCampusMembershipWithSecret, {
    secret: secret(),
    group_id: groupId,
    membership_id: membershipId,
  })
}

export async function setCampusIdentityInConvex(
  groupId: string,
  identity: { short_code?: string | null; slug?: string | null; aliases?: string[] }
): Promise<Group | null> {
  const doc = (await getConvexHttpClient().mutation(api.campuses.setCampusIdentityWithSecret, {
    secret: secret(),
    group_id: groupId,
    ...identity,
  })) as Record<string, unknown> | null
  return convexGroupDocToGroup(doc)
}

export type JoinCampusResult = PlaceOnCampusResult & { created?: boolean; user_id?: string }

export async function joinCampusByPhoneInConvex(args: {
  group_id: string
  full_name: string
  phone: string
  whatsapp?: string
  area_of_residence?: string
  notes?: string
  membership_id: string
  auth_uid: string
  confirm_move: boolean
  protect_leaders?: boolean
}): Promise<JoinCampusResult> {
  return (await getConvexHttpClient().mutation(api.campuses.joinCampusByPhoneWithSecret, {
    secret: secret(),
    ...args,
  })) as JoinCampusResult
}

export async function currentCampusForUserFromConvex(userId: string): Promise<{
  group_id: string
  name: string
  short_code: string | null
  slug: string | null
  role: GroupMembership['role']
} | null> {
  return (await getConvexHttpClient().query(api.campuses.currentCampusForUserWithSecret, {
    secret: secret(),
    user_id: userId,
  })) as never
}
