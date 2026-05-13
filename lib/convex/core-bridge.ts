import { getConvexHttpClient, runConvexQueryWithRetry } from '@/lib/convex/http-client'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import type { AppUser, Attendance, DashboardStats, Group, GroupMembership, Member, Visitor } from '@/lib/types'

export function requireCoreServerSecret(): string {
  const secret = process.env.CAMP_CONVEX_SERVER_SECRET
  if (!secret) {
    throw new Error(
      'CAMP_CONVEX_SERVER_SECRET must be set for Convex core operations (mirror in Convex dashboard).'
    )
  }
  return secret
}

function isoFromMs(t?: number): string {
  return t != null ? new Date(t).toISOString() : ''
}

export function convexMemberDocToMember(doc: Record<string, unknown> | null | undefined): Member | null {
  if (!doc || typeof doc !== 'object') return null
  const id = String(doc._id ?? '')
  if (!id) return null
  const ct = doc._creationTime as number | undefined
  const ut = doc.updated_at as number | undefined
  return {
    id,
    user_id: String(doc.user_id ?? ''),
    dob: doc.dob != null ? String(doc.dob) : undefined,
    gender: doc.gender as Member['gender'],
    address: doc.address != null ? String(doc.address) : undefined,
    emergency_contacts: Array.isArray(doc.emergency_contacts)
      ? (doc.emergency_contacts as Member['emergency_contacts'])
      : [],
    profile_photo: doc.profile_photo != null ? String(doc.profile_photo) : undefined,
    documents: Array.isArray(doc.documents) ? (doc.documents as Member['documents']) : [],
    status: (doc.status as Member['status']) ?? 'active',
    notes: doc.notes != null ? String(doc.notes) : undefined,
    created_at: isoFromMs(ct) || new Date().toISOString(),
    updated_at: isoFromMs(ut) || isoFromMs(ct) || new Date().toISOString(),
  }
}

export function convexUserDocToAppUser(doc: Record<string, unknown> | null | undefined): AppUser | null {
  if (!doc || typeof doc !== 'object') return null
  const id = String(doc._id ?? '')
  if (!id) return null
  const ct = doc._creationTime as number | undefined
  const ut = doc.updated_at as number | undefined
  return {
    id,
    auth_uid: doc.auth_uid != null ? String(doc.auth_uid) : undefined,
    membership_id: String(doc.membership_id ?? ''),
    phone: doc.phone != null ? String(doc.phone) : undefined,
    email: doc.email != null ? String(doc.email) : undefined,
    full_name: String(doc.full_name ?? ''),
    role: (doc.role as AppUser['role']) ?? 'member',
    join_year: Number(doc.join_year ?? new Date().getFullYear()),
    created_at: isoFromMs(ct) || new Date().toISOString(),
    updated_at: isoFromMs(ut) || isoFromMs(ct) || new Date().toISOString(),
  }
}

export function convexGroupDocToGroup(doc: Record<string, unknown> | null | undefined): Group | null {
  if (!doc || typeof doc !== 'object') return null
  const id = String(doc._id ?? '')
  if (!id) return null
  const ct = doc._creationTime as number | undefined
  const ut = doc.updated_at as number | undefined
  return {
    id,
    name: String(doc.name ?? ''),
    description: doc.description != null ? String(doc.description) : undefined,
    group_type: (doc.group_type as Group['group_type']) ?? 'ministry',
    leader_id: doc.leader_id != null ? String(doc.leader_id) : undefined,
    co_leader_id: doc.co_leader_id != null ? String(doc.co_leader_id) : undefined,
    meeting_schedule: doc.meeting_schedule != null ? String(doc.meeting_schedule) : undefined,
    meeting_location: doc.meeting_location != null ? String(doc.meeting_location) : undefined,
    is_active: Boolean(doc.is_active ?? true),
    max_members: doc.max_members != null ? Number(doc.max_members) : undefined,
    created_at: isoFromMs(ct) || new Date().toISOString(),
    updated_at: isoFromMs(ut) || isoFromMs(ct) || new Date().toISOString(),
  }
}

export function convexAttendanceDocToAttendance(
  doc: Record<string, unknown> | null | undefined
): Attendance | null {
  if (!doc || typeof doc !== 'object') return null
  const id = String(doc._id ?? '')
  if (!id) return null
  const ct = doc._creationTime as number | undefined
  return {
    id,
    member_id: doc.member_id != null ? String(doc.member_id) : undefined,
    dependant_id: doc.dependant_id != null ? String(doc.dependant_id) : undefined,
    service_date: String(doc.service_date ?? ''),
    service_type: doc.service_type as Attendance['service_type'],
    check_in_time: String(doc.check_in_time ?? ''),
    method: (doc.method as Attendance['method']) ?? 'mobile',
    metadata: (doc.metadata as Attendance['metadata']) ?? {},
    client_uuid: doc.client_uuid != null ? String(doc.client_uuid) : undefined,
    created_by: doc.created_by != null ? String(doc.created_by) : undefined,
    checked_in_by: doc.checked_in_by != null ? String(doc.checked_in_by) : undefined,
    created_at: isoFromMs(ct) || new Date().toISOString(),
  }
}

export async function findUserByMembershipIdFromConvex(membershipId: string): Promise<AppUser | null> {
  const client = getConvexHttpClient()
  const doc = (await client.query(api.core.findUserByMembershipIdWithSecret, {
    secret: requireCoreServerSecret(),
    membership_id: membershipId,
  })) as Record<string, unknown> | null
  return convexUserDocToAppUser(doc)
}

export async function findUserByPhoneFromConvex(phone: string): Promise<AppUser | null> {
  const client = getConvexHttpClient()
  const doc = (await client.query(api.core.findUserByPhoneWithSecret, {
    secret: requireCoreServerSecret(),
    phone,
  })) as Record<string, unknown> | null
  return convexUserDocToAppUser(doc)
}

export async function fetchMembersFromConvex(): Promise<Member[]> {
  const client = getConvexHttpClient()
  const docs = (await client.query(api.core.listMembersWithSecret, {
    secret: requireCoreServerSecret(),
  })) as Record<string, unknown>[]
  return docs
    .map((d) => convexMemberDocToMember(d))
    .filter((m): m is Member => m != null)
}

export async function fetchMemberFromConvex(id: string): Promise<Member | null> {
  const client = getConvexHttpClient()
  const doc = (await client.query(api.core.getMemberWithSecret, {
    secret: requireCoreServerSecret(),
    id: id as Id<'members'>,
  })) as Record<string, unknown> | null
  return convexMemberDocToMember(doc)
}

export async function fetchMemberByUserIdFromConvex(userId: string): Promise<Member | null> {
  const client = getConvexHttpClient()
  const doc = (await client.query(api.core.getMemberByUserIdWithSecret, {
    secret: requireCoreServerSecret(),
    user_id: userId,
  })) as Record<string, unknown> | null
  return convexMemberDocToMember(doc)
}

export async function fetchUserFromConvex(id: string): Promise<AppUser | null> {
  const client = getConvexHttpClient()
  const doc = (await client.query(api.core.getUserWithSecret, {
    secret: requireCoreServerSecret(),
    id: id as Id<'users'>,
  })) as Record<string, unknown> | null
  return convexUserDocToAppUser(doc)
}

export async function fetchGroupsFromConvex(): Promise<Group[]> {
  const client = getConvexHttpClient()
  const docs = (await client.query(api.core.listGroupsWithSecret, {
    secret: requireCoreServerSecret(),
  })) as Record<string, unknown>[]
  return docs
    .map((d) => convexGroupDocToGroup(d))
    .filter((g): g is Group => g != null)
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function fetchGroupFromConvex(id: string): Promise<Group | null> {
  const client = getConvexHttpClient()
  const doc = (await client.query(api.core.getGroupWithSecret, {
    secret: requireCoreServerSecret(),
    id: id as Id<'groups'>,
  })) as Record<string, unknown> | null
  return convexGroupDocToGroup(doc)
}

export async function fetchDashboardStatsFromConvex(): Promise<DashboardStats> {
  return runConvexQueryWithRetry(async (client) => {
    return (await client.query(api.core.getDashboardStatsWithSecret, {
      secret: requireCoreServerSecret(),
    })) as DashboardStats
  })
}

export async function findAttendanceByClientUuidFromConvex(
  clientUuid: string
): Promise<Attendance | null> {
  const client = getConvexHttpClient()
  const doc = (await client.query(api.core.findAttendanceByClientUuidWithSecret, {
    secret: requireCoreServerSecret(),
    client_uuid: clientUuid,
  })) as Record<string, unknown> | null
  return convexAttendanceDocToAttendance(doc)
}

export async function bootstrapUserInConvex(args: {
  full_name: string
  phone: string
  role: AppUser['role']
  email?: string
  membership_id: string
  auth_uid: string
  first_name?: string
  last_name?: string
  join_year?: number
}): Promise<AppUser> {
  const client = getConvexHttpClient()
  const doc = (await client.mutation(api.core.bootstrapUserWithSecret, {
    secret: requireCoreServerSecret(),
    ...args,
  })) as Record<string, unknown> | null
  const user = convexUserDocToAppUser(doc)
  if (!user) {
    throw new Error('Failed to bootstrap user')
  }
  return user
}

export async function recordAttendanceInConvex(
  payload: Partial<Attendance> & { client_uuid?: string }
): Promise<Attendance> {
  const client = getConvexHttpClient()
  const doc = (await client.mutation(api.core.recordAttendanceWithSecret, {
    secret: requireCoreServerSecret(),
    member_id: payload.member_id,
    dependant_id: payload.dependant_id,
    service_date: payload.service_date ?? new Date().toISOString().split('T')[0],
    service_type: payload.service_type,
    check_in_time: payload.check_in_time ?? new Date().toISOString(),
    method: payload.method ?? 'mobile',
    metadata: payload.metadata,
    client_uuid: payload.client_uuid,
    created_by: payload.created_by,
    checked_in_by: payload.checked_in_by,
  })) as Record<string, unknown>
  const mapped = convexAttendanceDocToAttendance(doc)
  if (!mapped) {
    throw new Error('Attendance saved but response could not be read.')
  }
  return mapped
}

export async function fetchUsersFromConvex(): Promise<AppUser[]> {
  const client = getConvexHttpClient()
  const docs = (await client.query(api.core.listUsersWithSecret, {
    secret: requireCoreServerSecret(),
  })) as Record<string, unknown>[]
  return docs
    .map((doc) => convexUserDocToAppUser(doc))
    .filter((user): user is AppUser => user != null)
}

export async function updateUserInConvex(
  userId: string,
  updates: Partial<AppUser>
): Promise<AppUser> {
  const client = getConvexHttpClient()
  const doc = (await client.mutation(api.core.updateUserWithSecret, {
    secret: requireCoreServerSecret(),
    id: userId as Id<'users'>,
    full_name: updates.full_name,
    phone: updates.phone,
    email: updates.email,
    role: updates.role,
    membership_id: updates.membership_id,
    join_year: updates.join_year,
  })) as Record<string, unknown>
  const user = convexUserDocToAppUser(doc)
  if (!user) throw new Error('Failed to update user')
  return user
}

export async function createGroupInConvex(groupData: Partial<Group>): Promise<Group> {
  const client = getConvexHttpClient()
  const doc = (await client.mutation(api.core.createGroupWithSecret, {
    secret: requireCoreServerSecret(),
    name: groupData.name ?? 'Untitled group',
    description: groupData.description,
    group_type: groupData.group_type ?? 'ministry',
    leader_id: groupData.leader_id,
    co_leader_id: groupData.co_leader_id,
    meeting_schedule: groupData.meeting_schedule,
    meeting_location: groupData.meeting_location,
    max_members: groupData.max_members,
    is_active: groupData.is_active,
  })) as Record<string, unknown>
  const group = convexGroupDocToGroup(doc)
  if (!group) throw new Error('Failed to create group')
  return group
}

export async function updateGroupInConvex(
  groupId: string,
  updates: Partial<Group>
): Promise<Group> {
  const client = getConvexHttpClient()
  const doc = (await client.mutation(api.core.updateGroupWithSecret, {
    secret: requireCoreServerSecret(),
    id: groupId as Id<'groups'>,
    name: updates.name,
    description: updates.description,
    group_type: updates.group_type,
    leader_id: updates.leader_id,
    co_leader_id: updates.co_leader_id,
    meeting_schedule: updates.meeting_schedule,
    meeting_location: updates.meeting_location,
    max_members: updates.max_members,
    is_active: updates.is_active,
  })) as Record<string, unknown>
  const group = convexGroupDocToGroup(doc)
  if (!group) throw new Error('Failed to update group')
  return group
}

export function convexVisitorDocToVisitor(doc: Record<string, unknown> | null | undefined): Visitor | null {
  if (!doc || typeof doc !== 'object') return null
  const id = String(doc._id ?? '')
  if (!id) return null
  const ct = doc._creationTime as number | undefined
  const ut = doc.updated_at as number | undefined
  const created = isoFromMs(ct) || new Date().toISOString()
  return {
    id,
    first_name: String(doc.first_name ?? ''),
    last_name: doc.last_name != null ? String(doc.last_name) : undefined,
    phone: doc.phone != null ? String(doc.phone) : undefined,
    email: doc.email != null ? String(doc.email) : undefined,
    address: doc.address != null ? String(doc.address) : undefined,
    visit_date: String(doc.visit_date ?? ''),
    service_attended: doc.service_attended != null ? String(doc.service_attended) : undefined,
    how_heard_about_church: doc.how_heard_about_church != null ? String(doc.how_heard_about_church) : undefined,
    invited_by_member_id: doc.invited_by_member_id != null ? String(doc.invited_by_member_id) : undefined,
    follow_up_notes: doc.follow_up_notes != null ? String(doc.follow_up_notes) : undefined,
    follow_up_date: doc.follow_up_date != null ? String(doc.follow_up_date) : undefined,
    follow_up_completed: Boolean(doc.follow_up_completed),
    converted_to_member: Boolean(doc.converted_to_member),
    converted_member_id: doc.converted_member_id != null ? String(doc.converted_member_id) : undefined,
    is_active: Boolean(doc.is_active ?? true),
    created_at: created,
    updated_at: isoFromMs(ut) || created,
  }
}

export function convexGroupMembershipDocToGroupMembership(
  doc: Record<string, unknown> | null | undefined
): GroupMembership | null {
  if (!doc || typeof doc !== 'object') return null
  const id = String(doc._id ?? '')
  if (!id) return null
  const ct = doc._creationTime as number | undefined
  const ut = doc.updated_at as number | undefined
  return {
    id,
    group_id: String(doc.group_id ?? ''),
    member_id: String(doc.member_id ?? ''),
    role: (doc.role as GroupMembership['role']) ?? 'member',
    joined_date: String(doc.joined_date ?? ''),
    is_active: Boolean(doc.is_active ?? true),
    created_at: isoFromMs(ct) || new Date().toISOString(),
    notes: doc.notes != null ? String(doc.notes) : undefined,
  }
}

export async function listAttendanceFromConvex(args: {
  member_id?: string
  service_date?: string
  service_type?: string
  limit?: number
}): Promise<Attendance[]> {
  const client = getConvexHttpClient()
  const docs = (await client.query(api.core.listAttendanceWithSecret, {
    secret: requireCoreServerSecret(),
    member_id: args.member_id,
    service_date: args.service_date,
    service_type: args.service_type as Attendance['service_type'] | undefined,
    limit: args.limit,
  })) as Record<string, unknown>[]
  return docs.map((d) => convexAttendanceDocToAttendance(d)).filter((a): a is Attendance => a != null)
}

export async function getAttendanceStatsFromConvex(): Promise<{
  total_attendance: number
  today_attendance: number
  weekly_attendance: number
  monthly_attendance: number
}> {
  const client = getConvexHttpClient()
  return (await client.query(api.core.getAttendanceStatsWithSecret, {
    secret: requireCoreServerSecret(),
  })) as {
    total_attendance: number
    today_attendance: number
    weekly_attendance: number
    monthly_attendance: number
  }
}

export async function listVisitorsFromConvex(): Promise<Visitor[]> {
  const client = getConvexHttpClient()
  const docs = (await client.query(api.core.listVisitorsWithSecret, {
    secret: requireCoreServerSecret(),
  })) as Record<string, unknown>[]
  return docs.map((d) => convexVisitorDocToVisitor(d)).filter((v): v is Visitor => v != null)
}

export async function createVisitorInConvex(visitor: Partial<Visitor>): Promise<Visitor> {
  const client = getConvexHttpClient()
  const doc = (await client.mutation(api.core.createVisitorWithSecret, {
    secret: requireCoreServerSecret(),
    first_name: visitor.first_name ?? 'Visitor',
    last_name: visitor.last_name,
    phone: visitor.phone,
    email: visitor.email,
    address: visitor.address,
    visit_date: visitor.visit_date ?? new Date().toISOString().split('T')[0],
    follow_up_completed: visitor.follow_up_completed ?? false,
    converted_to_member: visitor.converted_to_member ?? false,
    is_active: visitor.is_active ?? true,
  })) as Record<string, unknown>
  const v = convexVisitorDocToVisitor(doc)
  if (!v) throw new Error('Failed to create visitor')
  return v
}

export async function listGroupMembershipsFromConvex(groupId: string): Promise<GroupMembership[]> {
  const client = getConvexHttpClient()
  const docs = (await client.query(api.core.listGroupMembershipsForGroupWithSecret, {
    secret: requireCoreServerSecret(),
    group_id: groupId,
  })) as Record<string, unknown>[]
  return docs
    .map((d) => convexGroupMembershipDocToGroupMembership(d))
    .filter((m): m is GroupMembership => m != null)
    .filter((m) => m.is_active)
}

export async function addGroupMembershipForUserInConvex(
  groupId: string,
  userId: string,
  role: GroupMembership['role']
): Promise<GroupMembership> {
  const client = getConvexHttpClient()
  const doc = (await client.mutation(api.core.addGroupMembershipForUserWithSecret, {
    secret: requireCoreServerSecret(),
    group_id: groupId,
    user_id: userId,
    role,
    joined_date: new Date().toISOString().split('T')[0],
  })) as Record<string, unknown>
  const m = convexGroupMembershipDocToGroupMembership(doc)
  if (!m) throw new Error('Failed to add group membership')
  return m
}

export async function deactivateGroupMembershipInConvex(membershipId: string): Promise<void> {
  const client = getConvexHttpClient()
  await client.mutation(api.core.deactivateGroupMembershipWithSecret, {
    secret: requireCoreServerSecret(),
    id: membershipId as Id<'group_memberships'>,
  })
}

export async function removeGroupMembershipForUserInConvex(groupId: string, userId: string): Promise<number> {
  const client = getConvexHttpClient()
  return (await client.mutation(api.core.removeGroupMembershipForUserWithSecret, {
    secret: requireCoreServerSecret(),
    group_id: groupId,
    user_id: userId,
  })) as number
}

export async function patchGroupMembershipInConvex(
  membershipId: string,
  updates: Partial<GroupMembership>
): Promise<GroupMembership> {
  const client = getConvexHttpClient()
  const doc = (await client.mutation(api.core.patchGroupMembershipWithSecret, {
    secret: requireCoreServerSecret(),
    id: membershipId as Id<'group_memberships'>,
    role: updates.role,
    is_active: updates.is_active,
  })) as Record<string, unknown>
  const m = convexGroupMembershipDocToGroupMembership(doc)
  if (!m) throw new Error('Failed to update membership')
  return m
}

export async function deleteGroupInConvex(groupId: string): Promise<void> {
  const client = getConvexHttpClient()
  await client.mutation(api.core.deleteGroupWithSecret, {
    secret: requireCoreServerSecret(),
    id: groupId as Id<'groups'>,
  })
}

export async function deleteUserInConvex(userId: string): Promise<void> {
  const client = getConvexHttpClient()
  await client.mutation(api.core.deleteUserWithSecret, {
    secret: requireCoreServerSecret(),
    id: userId as Id<'users'>,
  })
}

export async function insertMemberInConvex(memberData: Partial<Member>): Promise<Member> {
  if (!memberData.user_id?.trim()) throw new Error('user_id is required to create a member profile.')
  const client = getConvexHttpClient()
  const doc = (await client.mutation(api.core.insertMemberWithSecret, {
    secret: requireCoreServerSecret(),
    user_id: memberData.user_id,
    dob: memberData.dob,
    gender: memberData.gender,
    address: memberData.address,
    notes: memberData.notes,
    status: memberData.status,
    emergency_contacts: memberData.emergency_contacts,
    documents: memberData.documents,
  })) as Record<string, unknown>
  const m = convexMemberDocToMember(doc)
  if (!m) throw new Error('Failed to create member')
  return m
}

export async function patchMemberInConvex(memberId: string, updates: Partial<Member>): Promise<Member> {
  const client = getConvexHttpClient()
  const doc = (await client.mutation(api.core.patchMemberWithSecret, {
    secret: requireCoreServerSecret(),
    id: memberId as Id<'members'>,
    dob: updates.dob,
    gender: updates.gender,
    address: updates.address,
    notes: updates.notes,
    status: updates.status,
    emergency_contacts: updates.emergency_contacts,
    documents: updates.documents,
    profile_photo: updates.profile_photo,
  })) as Record<string, unknown>
  const m = convexMemberDocToMember(doc)
  if (!m) throw new Error('Failed to update member')
  if (m.user_id) {
    const user = await fetchUserFromConvex(m.user_id)
    if (user) return { ...m, user }
  }
  return m
}

export async function getUpcomingEventsFromConvex(): Promise<{
  birthdays: Member[]
  anniversaries: Member[]
}> {
  const client = getConvexHttpClient()
  const raw = (await client.query(api.core.getUpcomingEventsWithSecret, {
    secret: requireCoreServerSecret(),
  })) as {
    birthdays: Record<string, unknown>[]
    anniversaries: Record<string, unknown>[]
    usersById: Record<string, Record<string, unknown>>
  }

  const mapMember = async (d: Record<string, unknown>): Promise<Member | null> => {
    const m = convexMemberDocToMember(d)
    if (!m?.user_id) return m
    const cached = raw.usersById[m.user_id]
    const user = cached ? convexUserDocToAppUser(cached) : await fetchUserFromConvex(m.user_id)
    if (user) return { ...m, user }
    return m
  }

  const birthdays = (await Promise.all((raw.birthdays ?? []).map((d) => mapMember(d)))).filter(
    (m): m is Member => m != null
  )
  const anniversaries = (await Promise.all((raw.anniversaries ?? []).map((d) => mapMember(d)))).filter(
    (m): m is Member => m != null
  )
  return { birthdays, anniversaries }
}
