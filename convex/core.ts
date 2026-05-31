import { v } from 'convex/values'
import { query, mutation } from './_generated/server'
import type { Id } from './_generated/dataModel'
import { assertServerSecret } from './lib/serverSecret'

const attendanceMethod = v.union(
  v.literal('qr'),
  v.literal('kiosk'),
  v.literal('admin'),
  v.literal('pin'),
  v.literal('mobile')
)

const serviceType = v.union(
  v.literal('sunday_service'),
  v.literal('midweek_service'),
  v.literal('prayer_meeting'),
  v.literal('youth_service'),
  v.literal('children_service'),
  v.literal('special_event')
)

const groupType = v.union(
  v.literal('campus'),
  v.literal('corporate_gem'),
  v.literal('activity'),
  v.literal('ministry'),
  v.literal('fellowship'),
  v.literal('age_group'),
  v.literal('special_interest'),
  v.literal('leadership')
)

const userRole = v.union(
  v.literal('admin'),
  v.literal('pastor'),
  v.literal('elder'),
  v.literal('finance_officer'),
  v.literal('member'),
  v.literal('visitor')
)

function normalizeGhanaPhone(phone: string): string {
  const trimmed = phone.replace(/\s/g, '')
  if (trimmed.startsWith('+233')) return trimmed
  if (trimmed.startsWith('0')) return `+233${trimmed.slice(1)}`
  if (trimmed.startsWith('233')) return `+${trimmed}`
  return `+233${trimmed}`
}

function phoneLookupVariants(phone: string): string[] {
  const trimmed = phone.replace(/\s/g, '')
  const variants = new Set<string>([trimmed, normalizeGhanaPhone(trimmed)])
  const intl = normalizeGhanaPhone(trimmed)
  if (intl.startsWith('+233')) {
    variants.add(`0${intl.slice(4)}`)
    variants.add(intl.slice(1))
  }
  if (trimmed.startsWith('0')) {
    variants.add(`+233${trimmed.slice(1)}`)
  }
  if (/^233\d{8,9}$/.test(trimmed)) {
    variants.add(`+${trimmed}`)
  }
  return Array.from(variants)
}

function normalizeMembershipForLookup(raw: string): string {
  return raw.replace(/\W+/g, '').toUpperCase()
}

export const findUserByMembershipIdWithSecret = query({
  args: { secret: v.string(), membership_id: v.string() },
  returns: v.any(),
  handler: async (ctx, { secret, membership_id }) => {
    assertServerSecret(secret)
    const normalized = normalizeMembershipForLookup(membership_id)
    const indexed = await ctx.db
      .query('users')
      .withIndex('by_membership_id', (q) => q.eq('membership_id', normalized))
      .first()
    if (indexed) return indexed

    const trimmed = membership_id.trim()
    if (trimmed !== normalized) {
      const byRaw = await ctx.db
        .query('users')
        .withIndex('by_membership_id', (q) => q.eq('membership_id', trimmed))
        .first()
      if (byRaw) return byRaw
    }

    for (const user of await ctx.db.query('users').collect()) {
      if (user.membership_id && normalizeMembershipForLookup(user.membership_id) === normalized) {
        return user
      }
    }
    return null
  },
})

export const findUserByPhoneWithSecret = query({
  args: { secret: v.string(), phone: v.string() },
  returns: v.any(),
  handler: async (ctx, { secret, phone }) => {
    assertServerSecret(secret)
    for (const candidate of phoneLookupVariants(phone)) {
      const found = await ctx.db
        .query('users')
        .withIndex('by_phone', (q) => q.eq('phone', candidate))
        .first()
      if (found) return found
    }

    const target = normalizeGhanaPhone(phone)
    for (const user of await ctx.db.query('users').collect()) {
      if (user.phone && normalizeGhanaPhone(user.phone) === target) {
        return user
      }
    }
    return null
  },
})

export const listMembersWithSecret = query({
  args: { secret: v.string() },
  returns: v.array(v.any()),
  handler: async (ctx, { secret }) => {
    assertServerSecret(secret)
    const members = await ctx.db.query('members').order('desc').collect()
    return members.filter((m: { status?: string }) => m.status === 'active')
  },
})

export const getMemberWithSecret = query({
  args: { secret: v.string(), id: v.id('members') },
  returns: v.any(),
  handler: async (ctx, { secret, id }) => {
    assertServerSecret(secret)
    return await ctx.db.get('members', id)
  },
})

export const getMemberByUserIdWithSecret = query({
  args: { secret: v.string(), user_id: v.string() },
  returns: v.any(),
  handler: async (ctx, { secret, user_id }) => {
    assertServerSecret(secret)
    return await ctx.db
      .query('members')
      .withIndex('by_user_id', (q) => q.eq('user_id', user_id))
      .first()
  },
})

export const getUserWithSecret = query({
  args: { secret: v.string(), id: v.id('users') },
  returns: v.any(),
  handler: async (ctx, { secret, id }) => {
    assertServerSecret(secret)
    return await ctx.db.get('users', id)
  },
})

export const listUsersWithSecret = query({
  args: { secret: v.string() },
  returns: v.array(v.any()),
  handler: async (ctx, { secret }) => {
    assertServerSecret(secret)
    return await ctx.db.query('users').order('desc').collect()
  },
})

export const updateUserWithSecret = mutation({
  args: {
    secret: v.string(),
    id: v.id('users'),
    full_name: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    role: v.optional(userRole),
    membership_id: v.optional(v.string()),
    join_year: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    assertServerSecret(args.secret)
    const existing = await ctx.db.get('users', args.id)
    if (!existing) throw new Error('User not found.')

    const patch: Record<string, unknown> = { updated_at: Date.now() }
    if (args.full_name != null) patch.full_name = args.full_name.trim()
    if (args.email != null) patch.email = args.email.trim() || undefined
    if (args.role != null) patch.role = args.role
    if (args.membership_id != null) patch.membership_id = args.membership_id.trim()
    if (args.join_year != null) patch.join_year = args.join_year

    if (args.phone != null) {
      const phone = normalizeGhanaPhone(args.phone)
      const conflict = await ctx.db
        .query('users')
        .withIndex('by_phone', (q) => q.eq('phone', phone))
        .first()
      if (conflict && String(conflict._id) !== String(args.id)) {
        throw new Error('Another account already uses this phone number.')
      }
      patch.phone = phone
    }

    await ctx.db.patch('users', args.id, patch)
    return await ctx.db.get('users', args.id)
  },
})

export const createGroupWithSecret = mutation({
  args: {
    secret: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    group_type: groupType,
    leader_id: v.optional(v.string()),
    co_leader_id: v.optional(v.string()),
    meeting_schedule: v.optional(v.string()),
    meeting_location: v.optional(v.string()),
    max_members: v.optional(v.number()),
    is_active: v.optional(v.boolean()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    assertServerSecret(args.secret)
    const now = Date.now()
    const id = await ctx.db.insert('groups', {
      name: args.name.trim(),
      description: args.description?.trim() || undefined,
      group_type: args.group_type,
      leader_id: args.leader_id,
      co_leader_id: args.co_leader_id,
      meeting_schedule: args.meeting_schedule,
      meeting_location: args.meeting_location,
      max_members: args.max_members,
      is_active: args.is_active ?? true,
      updated_at: now,
    })
    return await ctx.db.get('groups', id)
  },
})

export const updateGroupWithSecret = mutation({
  args: {
    secret: v.string(),
    id: v.id('groups'),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    group_type: v.optional(groupType),
    leader_id: v.optional(v.string()),
    co_leader_id: v.optional(v.string()),
    meeting_schedule: v.optional(v.string()),
    meeting_location: v.optional(v.string()),
    max_members: v.optional(v.number()),
    is_active: v.optional(v.boolean()),
  },
  returns: v.any(),
  handler: async (ctx, { secret, id, ...updates }) => {
    assertServerSecret(secret)
    const existing = await ctx.db.get('groups', id)
    if (!existing) throw new Error('Group not found.')

    const patch: Record<string, unknown> = { updated_at: Date.now() }
    if (updates.name != null) patch.name = updates.name.trim()
    if (updates.description != null) patch.description = updates.description.trim() || undefined
    if (updates.group_type != null) patch.group_type = updates.group_type
    if (updates.leader_id != null) patch.leader_id = updates.leader_id
    if (updates.co_leader_id != null) patch.co_leader_id = updates.co_leader_id
    if (updates.meeting_schedule != null) patch.meeting_schedule = updates.meeting_schedule
    if (updates.meeting_location != null) patch.meeting_location = updates.meeting_location
    if (updates.max_members != null) patch.max_members = updates.max_members
    if (updates.is_active != null) patch.is_active = updates.is_active

    await ctx.db.patch('groups', id, patch)
    return await ctx.db.get('groups', id)
  },
})

export const listGroupsWithSecret = query({
  args: { secret: v.string(), active_only: v.optional(v.boolean()) },
  returns: v.array(v.any()),
  handler: async (ctx, { secret, active_only }) => {
    assertServerSecret(secret)
    if (active_only === false) {
      return await ctx.db.query('groups').collect()
    }
    return await ctx.db
      .query('groups')
      .withIndex('by_active', (q) => q.eq('is_active', true))
      .collect()
  },
})

export const getGroupWithSecret = query({
  args: { secret: v.string(), id: v.id('groups') },
  returns: v.any(),
  handler: async (ctx, { secret, id }) => {
    assertServerSecret(secret)
    return await ctx.db.get('groups', id)
  },
})

export const getDashboardStatsWithSecret = query({
  args: { secret: v.string() },
  returns: v.any(),
  handler: async (ctx, { secret }) => {
    assertServerSecret(secret)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]
    const today = new Date().toISOString().split('T')[0]

    const [members, groups, attendance, visitors] = await Promise.all([
      ctx.db.query('members').collect(),
      ctx.db.query('groups').collect(),
      ctx.db.query('attendance').collect(),
      ctx.db.query('visitors').collect(),
    ])

    const activeMembers = members.filter((m: { status?: string }) => m.status === 'active')
    const activeGroups = groups.filter((g: { is_active?: boolean }) => g.is_active)
    const recentAttendance = attendance.filter(
      (a: { service_date?: string }) => (a.service_date ?? '') >= thirtyDaysAgo
    )
    const recentVisitors = visitors.filter(
      (v: { visit_date?: string }) => (v.visit_date ?? '') >= thirtyDaysAgo
    )
    const todayAttendance = recentAttendance.filter(
      (a: { service_date?: string }) => a.service_date === today
    )

    const memberById = new Map(
      members.map((m: { _id: string; gender?: string; dob?: string }) => [String(m._id), m])
    )
    let maleAttendance = 0
    let femaleAttendance = 0
    let adultAttendance = 0
    let childrenAttendance = 0

    for (const row of recentAttendance.slice(0, 200)) {
      const memberId = (row as { member_id?: string }).member_id
      if (!memberId) continue
      const m = memberById.get(memberId)
      if (!m) continue
      if (m.gender === 'male') maleAttendance++
      if (m.gender === 'female') femaleAttendance++
      if (m.dob) {
        const age = new Date().getFullYear() - new Date(m.dob).getFullYear()
        if (age >= 18) adultAttendance++
        else childrenAttendance++
      }
    }

    const totalMembers = activeMembers.length
    return {
      total_members: totalMembers,
      active_members: totalMembers,
      visitors: recentVisitors.length,
      today_attendance: todayAttendance.length,
      weekly_attendance: recentAttendance.length,
      monthly_donations: 0,
      pending_pledges: 0,
      prayer_requests: 0,
      upcoming_birthdays: 0,
      upcoming_anniversaries: 0,
      groups_count: activeGroups.length,
      recent_visitors: recentVisitors.length,
      attendance_rate:
        totalMembers > 0 ? Math.round((recentAttendance.length / totalMembers) * 100) : 0,
      visitor_conversion_rate:
        recentVisitors.length > 0
          ? Math.round((recentVisitors.length / (recentVisitors.length + totalMembers)) * 100)
          : 0,
      male_attendance: maleAttendance,
      female_attendance: femaleAttendance,
      adult_attendance: adultAttendance,
      children_attendance: childrenAttendance,
      total_attendance: recentAttendance.length,
    }
  },
})

export const findAttendanceByClientUuidWithSecret = query({
  args: { secret: v.string(), client_uuid: v.string() },
  returns: v.any(),
  handler: async (ctx, { secret, client_uuid }) => {
    assertServerSecret(secret)
    return await ctx.db
      .query('attendance')
      .withIndex('by_client_uuid', (q) => q.eq('client_uuid', client_uuid))
      .first()
  },
})

export const recordAttendanceWithSecret = mutation({
  args: {
    secret: v.string(),
    member_id: v.optional(v.string()),
    dependant_id: v.optional(v.string()),
    service_date: v.string(),
    service_type: v.optional(serviceType),
    check_in_time: v.string(),
    method: attendanceMethod,
    metadata: v.optional(v.any()),
    client_uuid: v.optional(v.string()),
    created_by: v.optional(v.string()),
    checked_in_by: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    assertServerSecret(args.secret)
    if (args.client_uuid) {
      const existing = await ctx.db
        .query('attendance')
        .withIndex('by_client_uuid', (q) => q.eq('client_uuid', args.client_uuid))
        .first()
      if (existing) return existing
    }
    const now = Date.now()
    const id = await ctx.db.insert('attendance', {
      member_id: args.member_id,
      dependant_id: args.dependant_id,
      service_date: args.service_date,
      service_type: args.service_type,
      check_in_time: args.check_in_time,
      method: args.method,
      metadata: args.metadata,
      client_uuid: args.client_uuid,
      created_by: args.created_by,
      checked_in_by: args.checked_in_by,
      updated_at: now,
    })
    return await ctx.db.get('attendance', id)
  },
})

/** Bootstrap or update a user for login (server secret only). */
export const bootstrapUserWithSecret = mutation({
  args: {
    secret: v.string(),
    full_name: v.string(),
    phone: v.string(),
    role: userRole,
    email: v.optional(v.string()),
    membership_id: v.string(),
    auth_uid: v.string(),
    first_name: v.optional(v.string()),
    last_name: v.optional(v.string()),
    join_year: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    assertServerSecret(args.secret)
    const phone = normalizeGhanaPhone(args.phone)
    const now = Date.now()
    const payload = {
      full_name: args.full_name,
      first_name: args.first_name,
      last_name: args.last_name,
      phone,
      email: args.email,
      role: args.role,
      membership_id: args.membership_id,
      auth_uid: args.auth_uid,
      join_year: args.join_year ?? new Date().getFullYear(),
      updated_at: now,
    }

    for (const candidate of phoneLookupVariants(args.phone)) {
      const byPhone = await ctx.db
        .query('users')
        .withIndex('by_phone', (q) => q.eq('phone', candidate))
        .first()
      if (byPhone) {
        await ctx.db.patch('users', byPhone._id, payload)
        return await ctx.db.get('users', byPhone._id)
      }
    }

    const targetPhone = normalizeGhanaPhone(args.phone)
    for (const user of await ctx.db.query('users').collect()) {
      if (user.phone && normalizeGhanaPhone(user.phone) === targetPhone) {
        await ctx.db.patch('users', user._id, payload)
        return await ctx.db.get('users', user._id)
      }
    }

    if (args.email?.trim()) {
      const byEmail = await ctx.db
        .query('users')
        .withIndex('by_email', (q) => q.eq('email', args.email!.trim()))
        .first()
      if (byEmail) {
        await ctx.db.patch('users', byEmail._id, payload)
        return await ctx.db.get('users', byEmail._id)
      }
    }

    const byMembership = await ctx.db
      .query('users')
      .withIndex('by_membership_id', (q) => q.eq('membership_id', args.membership_id))
      .first()
    if (byMembership) {
      await ctx.db.patch('users', byMembership._id, payload)
      return await ctx.db.get('users', byMembership._id)
    }

    const userId = await ctx.db.insert('users', payload)
    const user = await ctx.db.get('users', userId)
    if (!user) return null

    const existingMember = await ctx.db
      .query('members')
      .withIndex('by_user_id', (q) => q.eq('user_id', String(userId)))
      .first()
    if (!existingMember) {
      await ctx.db.insert('members', {
        user_id: String(userId),
        emergency_contacts: [],
        documents: [],
        status: 'active',
        updated_at: now,
      })
    }

    return user
  },
})

const memberStatusValue = v.union(
  v.literal('active'),
  v.literal('visitor'),
  v.literal('transferred'),
  v.literal('inactive')
)

const membershipRole = v.union(
  v.literal('leader'),
  v.literal('co_leader'),
  v.literal('executive'),
  v.literal('member'),
  v.literal('volunteer')
)

export const listAttendanceWithSecret = query({
  args: {
    secret: v.string(),
    member_id: v.optional(v.string()),
    service_date: v.optional(v.string()),
    service_type: v.optional(serviceType),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    assertServerSecret(args.secret)
    const lim = Math.min(Math.max(args.limit ?? 100, 1), 2000)
    let rows: Array<Record<string, unknown>> = []

    if (args.member_id) {
      rows = await ctx.db
        .query('attendance')
        .withIndex('by_member_id', (q) => q.eq('member_id', args.member_id!))
        .order('desc')
        .take(lim)
    } else if (args.service_date) {
      rows = await ctx.db
        .query('attendance')
        .withIndex('by_service_date', (q) => q.eq('service_date', args.service_date!))
        .collect()
      rows = rows.slice(0, lim)
    } else {
      rows = await ctx.db.query('attendance').order('desc').take(lim)
    }

    if (args.service_type) {
      rows = rows.filter((r) => (r as { service_type?: string }).service_type === args.service_type)
    }
    return rows
  },
})

export const getAttendanceStatsWithSecret = query({
  args: { secret: v.string() },
  returns: v.any(),
  handler: async (ctx, { secret }) => {
    assertServerSecret(secret)
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const weekStart = new Date(now)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    const weekStartStr = weekStart.toISOString().split('T')[0]
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]

    const all = await ctx.db.query('attendance').collect()
    const total_attendance = all.length
    const today_attendance = all.filter((a) => a.service_date === today).length
    const weekly_attendance = all.filter((a) => (a.service_date ?? '') >= weekStartStr).length
    const monthly_attendance = all.filter((a) => (a.service_date ?? '') >= monthStart).length

    return { total_attendance, today_attendance, weekly_attendance, monthly_attendance }
  },
})

export const listVisitorsWithSecret = query({
  args: { secret: v.string() },
  returns: v.array(v.any()),
  handler: async (ctx, { secret }) => {
    assertServerSecret(secret)
    return await ctx.db.query('visitors').order('desc').collect()
  },
})

export const createVisitorWithSecret = mutation({
  args: {
    secret: v.string(),
    first_name: v.string(),
    last_name: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
    visit_date: v.string(),
    service_attended: v.optional(v.string()),
    how_heard_about_church: v.optional(v.string()),
    invited_by_member_id: v.optional(v.string()),
    invited_by_member_ids: v.optional(v.array(v.string())),
    assigned_follow_up_member_id: v.optional(v.string()),
    follow_up_notes: v.optional(v.string()),
    follow_up_date: v.optional(v.string()),
    follow_up_status: v.optional(
      v.union(v.literal('pending'), v.literal('in_progress'), v.literal('completed'))
    ),
    follow_up_completed: v.boolean(),
    converted_to_member: v.boolean(),
    is_active: v.boolean(),
    congregation: v.optional(v.union(v.literal('rlc'), v.literal('campus_gem'))),
    pipeline_status: v.optional(
      v.union(
        v.literal('first_visit'),
        v.literal('follow_up'),
        v.literal('new_member'),
        v.literal('full_member'),
        v.literal('inactive')
      )
    ),
    source: v.optional(
      v.union(
        v.literal('walk_in'),
        v.literal('camp'),
        v.literal('campus_gem'),
        v.literal('corporate_gem'),
        v.literal('referral'),
        v.literal('other')
      )
    ),
    gender: v.optional(v.union(v.literal('male'), v.literal('female'), v.literal('other'))),
    date_of_birth: v.optional(v.string()),
    occupation: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    assertServerSecret(args.secret)
    const now = Date.now()
    const sponsorIds = args.invited_by_member_ids ?? (args.invited_by_member_id ? [args.invited_by_member_id] : [])
    const id = await ctx.db.insert('visitors', {
      first_name: args.first_name,
      last_name: args.last_name,
      phone: args.phone,
      email: args.email,
      address: args.address,
      visit_date: args.visit_date,
      service_attended: args.service_attended,
      how_heard_about_church: args.how_heard_about_church,
      invited_by_member_id: sponsorIds[0] ?? args.invited_by_member_id,
      invited_by_member_ids: sponsorIds.length ? sponsorIds : undefined,
      assigned_follow_up_member_id: args.assigned_follow_up_member_id,
      follow_up_notes: args.follow_up_notes,
      follow_up_date: args.follow_up_date,
      follow_up_status: args.follow_up_status ?? (args.follow_up_completed ? 'completed' : 'pending'),
      follow_up_completed: args.follow_up_completed,
      pipeline_status: args.pipeline_status ?? 'first_visit',
      source: args.source,
      gender: args.gender,
      date_of_birth: args.date_of_birth,
      occupation: args.occupation,
      congregation: args.congregation,
      converted_to_member: args.converted_to_member,
      is_active: args.is_active,
      updated_at: now,
    })
    return await ctx.db.get('visitors', id)
  },
})

export const listGroupMembershipsForGroupWithSecret = query({
  args: { secret: v.string(), group_id: v.string() },
  returns: v.array(v.any()),
  handler: async (ctx, { secret, group_id }) => {
    assertServerSecret(secret)
    return await ctx.db
      .query('group_memberships')
      .withIndex('by_group_id', (q) => q.eq('group_id', group_id))
      .collect()
  },
})

export const addGroupMembershipForUserWithSecret = mutation({
  args: {
    secret: v.string(),
    group_id: v.string(),
    user_id: v.string(),
    role: membershipRole,
    joined_date: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    assertServerSecret(args.secret)
    const member = await ctx.db
      .query('members')
      .withIndex('by_user_id', (q) => q.eq('user_id', args.user_id))
      .first()
    if (!member) throw new Error('No member profile found for this user.')

    const memberId = String(member._id)
    const now = Date.now()
    const existing = await ctx.db
      .query('group_memberships')
      .withIndex('by_group_and_member', (q) => q.eq('group_id', args.group_id).eq('member_id', memberId))
      .first()

    if (existing) {
      await ctx.db.patch('group_memberships', existing._id, {
        role: args.role,
        is_active: true,
        joined_date: args.joined_date,
        updated_at: now,
      })
      return await ctx.db.get('group_memberships', existing._id)
    }

    const id = await ctx.db.insert('group_memberships', {
      group_id: args.group_id,
      member_id: memberId,
      role: args.role,
      joined_date: args.joined_date,
      is_active: true,
      updated_at: now,
    })
    return await ctx.db.get('group_memberships', id)
  },
})

export const deactivateGroupMembershipWithSecret = mutation({
  args: { secret: v.string(), id: v.id('group_memberships') },
  returns: v.null(),
  handler: async (ctx, { secret, id }) => {
    assertServerSecret(secret)
    await ctx.db.patch(id, { is_active: false, updated_at: Date.now() })
    return null
  },
})

export const removeGroupMembershipForUserWithSecret = mutation({
  args: { secret: v.string(), group_id: v.string(), user_id: v.string() },
  returns: v.number(),
  handler: async (ctx, { secret, group_id, user_id }) => {
    assertServerSecret(secret)
    const member = await ctx.db
      .query('members')
      .withIndex('by_user_id', (q) => q.eq('user_id', user_id))
      .first()
    if (!member) return 0

    const memberId = String(member._id)
    const list = await ctx.db
      .query('group_memberships')
      .withIndex('by_group_and_member', (q) => q.eq('group_id', group_id).eq('member_id', memberId))
      .collect()

    const now = Date.now()
    for (const row of list) {
      await ctx.db.patch(row._id, { is_active: false, updated_at: now })
    }
    return list.length
  },
})

export const patchGroupMembershipWithSecret = mutation({
  args: {
    secret: v.string(),
    id: v.id('group_memberships'),
    role: v.optional(membershipRole),
    is_active: v.optional(v.boolean()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    assertServerSecret(args.secret)
    const patch: Record<string, unknown> = { updated_at: Date.now() }
    if (args.role != null) patch.role = args.role
    if (args.is_active != null) patch.is_active = args.is_active
    await ctx.db.patch(args.id, patch)
    return await ctx.db.get('group_memberships', args.id)
  },
})

export const deleteGroupWithSecret = mutation({
  args: { secret: v.string(), id: v.id('groups') },
  returns: v.null(),
  handler: async (ctx, { secret, id }) => {
    assertServerSecret(secret)
    const gid = String(id)
    const linkedForms = await ctx.db
      .query('forms')
      .withIndex('by_group', (q) => q.eq('group_id', gid))
      .first()
    if (linkedForms) {
      throw new Error(
        'This group has forms linked to it. Reassign or delete those forms before deleting the group.'
      )
    }
    const memberships = await ctx.db
      .query('group_memberships')
      .withIndex('by_group_id', (q) => q.eq('group_id', gid))
      .collect()
    for (const m of memberships) {
      await ctx.db.delete(m._id)
    }
    await ctx.db.delete(id)
    return null
  },
})

export const deleteUserWithSecret = mutation({
  args: { secret: v.string(), id: v.id('users') },
  returns: v.null(),
  handler: async (ctx, { secret, id }) => {
    assertServerSecret(secret)
    const uid = String(id)
    const members = await ctx.db
      .query('members')
      .withIndex('by_user_id', (q) => q.eq('user_id', uid))
      .collect()

    for (const member of members) {
      const mid = String(member._id)
      const gms = await ctx.db
        .query('group_memberships')
        .withIndex('by_member_id', (q) => q.eq('member_id', mid))
        .collect()
      for (const gm of gms) {
        await ctx.db.delete(gm._id)
      }
      await ctx.db.delete(member._id)
    }

    await ctx.db.delete(id)
    return null
  },
})

export const insertMemberWithSecret = mutation({
  args: {
    secret: v.string(),
    user_id: v.string(),
    dob: v.optional(v.string()),
    gender: v.optional(v.union(v.literal('male'), v.literal('female'), v.literal('other'))),
    address: v.optional(v.string()),
    notes: v.optional(v.string()),
    status: v.optional(memberStatusValue),
    emergency_contacts: v.optional(v.any()),
    documents: v.optional(v.any()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    assertServerSecret(args.secret)
    const now = Date.now()
    const id = await ctx.db.insert('members', {
      user_id: args.user_id,
      dob: args.dob,
      gender: args.gender,
      address: args.address,
      notes: args.notes,
      status: args.status ?? 'active',
      emergency_contacts: Array.isArray(args.emergency_contacts) ? args.emergency_contacts : [],
      documents: Array.isArray(args.documents) ? args.documents : [],
      updated_at: now,
    })
    return await ctx.db.get('members', id)
  },
})

export const patchMemberWithSecret = mutation({
  args: {
    secret: v.string(),
    id: v.id('members'),
    dob: v.optional(v.string()),
    gender: v.optional(v.union(v.literal('male'), v.literal('female'), v.literal('other'))),
    address: v.optional(v.string()),
    notes: v.optional(v.string()),
    status: v.optional(memberStatusValue),
    emergency_contacts: v.optional(v.any()),
    documents: v.optional(v.any()),
    profile_photo: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    assertServerSecret(args.secret)
    const patch: Record<string, unknown> = { updated_at: Date.now() }
    if (args.dob !== undefined) patch.dob = args.dob
    if (args.gender !== undefined) patch.gender = args.gender
    if (args.address !== undefined) patch.address = args.address
    if (args.notes !== undefined) patch.notes = args.notes
    if (args.status !== undefined) patch.status = args.status
    if (args.emergency_contacts !== undefined) patch.emergency_contacts = args.emergency_contacts
    if (args.documents !== undefined) patch.documents = args.documents
    if (args.profile_photo !== undefined) patch.profile_photo = args.profile_photo

    await ctx.db.patch(args.id, patch)
    return await ctx.db.get('members', args.id)
  },
})

function upcomingEventDays(dateString: string, type: 'birthday' | 'anniversary'): number | null {
  try {
    const today = new Date()
    const eventDate = new Date(dateString)
    const currentYear = today.getFullYear()
    const thisYearEvent = new Date(eventDate)
    thisYearEvent.setFullYear(currentYear)
    if (thisYearEvent < today) {
      thisYearEvent.setFullYear(currentYear + 1)
    }
    const diffTime = thisYearEvent.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays >= 0 ? diffDays : null
  } catch {
    return null
  }
}

export const getUpcomingEventsWithSecret = query({
  args: { secret: v.string() },
  returns: v.any(),
  handler: async (ctx, { secret }) => {
    assertServerSecret(secret)
    const members = (await ctx.db.query('members').collect()).filter(
      (m: { status?: string }) => m.status === 'active'
    )

    const out: { birthdays: typeof members; anniversaries: typeof members; usersById: Record<string, unknown> } = {
      birthdays: [],
      anniversaries: [],
      usersById: {},
    }

    for (const m of members) {
      if (!m.dob) continue
      const days = upcomingEventDays(String(m.dob), 'birthday')
      if (days !== null && days <= 30) {
        out.birthdays.push(m)
      }
    }

    for (const m of members) {
      if (!m.user_id) continue
      type MiniUser = { marital_status?: string; anniversary_date?: string }
      let user = out.usersById[m.user_id] as MiniUser | undefined
      if (!user) {
        const u = await ctx.db.get('users', m.user_id as Id<'users'>)
        if (!u) continue
        user = u as MiniUser
        out.usersById[m.user_id] = u
      }
      if (user?.marital_status !== 'married' || !user?.anniversary_date) continue
      const days = upcomingEventDays(String(user.anniversary_date), 'anniversary')
      if (days !== null && days <= 30) {
        out.anniversaries.push(m)
      }
    }

    out.birthdays.sort(
      (a, b) =>
        (upcomingEventDays(String(a.dob!), 'birthday') ?? 999) -
        (upcomingEventDays(String(b.dob!), 'birthday') ?? 999)
    )
    out.anniversaries.sort((a, b) => {
      const ua = out.usersById[a.user_id] as { anniversary_date?: string } | undefined
      const ub = out.usersById[b.user_id] as { anniversary_date?: string } | undefined
      return (
        (upcomingEventDays(String(ua?.anniversary_date ?? ''), 'anniversary') ?? 999) -
        (upcomingEventDays(String(ub?.anniversary_date ?? ''), 'anniversary') ?? 999)
      )
    })

    return out
  },
})
