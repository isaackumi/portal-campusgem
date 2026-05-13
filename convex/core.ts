import { v } from 'convex/values'
import { query, mutation } from './_generated/server'
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
    group_type: v.union(
      v.literal('ministry'),
      v.literal('fellowship'),
      v.literal('age_group'),
      v.literal('special_interest'),
      v.literal('leadership')
    ),
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
    group_type: v.optional(
      v.union(
        v.literal('ministry'),
        v.literal('fellowship'),
        v.literal('age_group'),
        v.literal('special_interest'),
        v.literal('leadership')
      )
    ),
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
  args: { secret: v.string() },
  returns: v.array(v.any()),
  handler: async (ctx, { secret }) => {
    assertServerSecret(secret)
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
