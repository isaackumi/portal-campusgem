import { v } from 'convex/values'
import { mutation, query, type QueryCtx } from './_generated/server'
import type { Doc, Id } from './_generated/dataModel'
import { assertServerSecret } from './lib/serverSecret'
import { normalizeGhanaPhone, phoneLookupVariants } from './lib/phone'
import { sealMemberCheckIn } from './lib/rlcCheckInCode'
import { activeCampusRows, groupFromString, placeOnCampus } from './lib/campusMembership'

/**
 * Campus fellowships (groups with group_type 'campus'). Server-only (`*WithSecret`), reached
 * through lib/convex/campus-bridge.ts. Who may call what is decided in lib/auth/campus-scope.ts
 * BEFORE these run; these functions only check that the ids belong together.
 */

const membershipRole = v.union(
  v.literal('leader'),
  v.literal('co_leader'),
  v.literal('executive'),
  v.literal('member'),
  v.literal('volunteer')
)

async function campusGroups(ctx: Pick<QueryCtx, 'db'>, includeInactive = false): Promise<Doc<'groups'>[]> {
  const groups = includeInactive
    ? await ctx.db.query('groups').collect()
    : await ctx.db
        .query('groups')
        .withIndex('by_active', (q) => q.eq('is_active', true))
        .collect()
  return groups.filter((g) => g.group_type === 'campus')
}

async function requireCampus(ctx: Pick<QueryCtx, 'db'>, groupId: string): Promise<Doc<'groups'>> {
  const group = await groupFromString(ctx, groupId)
  if (!group || group.group_type !== 'campus') throw new Error('Campus not found.')
  return group
}

async function memberForUser(ctx: Pick<QueryCtx, 'db'>, userId: string): Promise<Doc<'members'> | null> {
  return await ctx.db
    .query('members')
    .withIndex('by_user_id', (q) => q.eq('user_id', userId))
    .first()
}

/** Every campus with its active member / leader / executive counts. */
export const listCampusesWithSecret = query({
  args: { secret: v.string(), include_inactive: v.optional(v.boolean()) },
  returns: v.any(),
  handler: async (ctx, { secret, include_inactive }) => {
    assertServerSecret(secret)
    const groups = await campusGroups(ctx, include_inactive)
    const out = []
    for (const group of groups) {
      const rows = (
        await ctx.db
          .query('group_memberships')
          .withIndex('by_group_id', (q) => q.eq('group_id', String(group._id)))
          .collect()
      ).filter((r) => r.is_active)
      out.push({
        group,
        member_count: rows.length,
        leader_count: rows.filter((r) => r.role === 'leader' || r.role === 'co_leader').length,
        executive_count: rows.filter((r) => r.role === 'executive').length,
      })
    }
    return out
  },
})

/** By slug, then short code (case-insensitive), then id. */
export const findCampusWithSecret = query({
  args: { secret: v.string(), key: v.string() },
  returns: v.any(),
  handler: async (ctx, { secret, key }) => {
    assertServerSecret(secret)
    const k = key.trim().toLowerCase()
    if (!k) return null
    const groups = await campusGroups(ctx, true)
    return (
      groups.find((g) => g.slug === k) ??
      groups.find((g) => g.short_code?.toLowerCase() === k) ??
      groups.find((g) => String(g._id) === key.trim()) ??
      null
    )
  },
})

/** All of one user's group memberships (any type, active or not) with the group type. */
export const membershipsForUserWithSecret = query({
  args: { secret: v.string(), user_id: v.string() },
  returns: v.any(),
  handler: async (ctx, { secret, user_id }) => {
    assertServerSecret(secret)
    const member = await memberForUser(ctx, user_id)
    if (!member) return []
    const rows = await ctx.db
      .query('group_memberships')
      .withIndex('by_member_id', (q) => q.eq('member_id', String(member._id)))
      .collect()
    const out = []
    for (const row of rows) {
      const group = await groupFromString(ctx, row.group_id)
      out.push({
        membership_id: String(row._id),
        group_id: row.group_id,
        role: row.role,
        is_active: row.is_active && Boolean(group?.is_active ?? false),
        group_type: group?.group_type ?? 'unknown',
      })
    }
    return out
  },
})

/** One map for the whole directory: who is on which campus. */
export const campusTagMapWithSecret = query({
  args: { secret: v.string() },
  returns: v.any(),
  handler: async (ctx, { secret }) => {
    assertServerSecret(secret)
    const groups = await campusGroups(ctx, true)
    const rows: Array<{ member_id: string; user_id: string; group_id: string; role: string }> = []
    for (const group of groups) {
      const memberships = await ctx.db
        .query('group_memberships')
        .withIndex('by_group_id', (q) => q.eq('group_id', String(group._id)))
        .collect()
      for (const m of memberships) {
        if (!m.is_active) continue
        const mid = ctx.db.normalizeId('members', m.member_id)
        const member = mid ? await ctx.db.get(mid) : null
        rows.push({ member_id: m.member_id, user_id: member?.user_id ?? '', group_id: String(group._id), role: m.role })
      }
    }
    return {
      campuses: groups.map((g) => ({
        id: String(g._id),
        name: g.name,
        short_code: g.short_code ?? null,
        slug: g.slug ?? null,
        is_active: g.is_active,
      })),
      rows,
    }
  },
})

/** Active members of one campus with their profile and user docs (the bridge maps the user). */
export const listCampusMembersWithSecret = query({
  args: { secret: v.string(), group_id: v.string() },
  returns: v.any(),
  handler: async (ctx, { secret, group_id }) => {
    assertServerSecret(secret)
    await requireCampus(ctx, group_id)
    const rows = (
      await ctx.db
        .query('group_memberships')
        .withIndex('by_group_id', (q) => q.eq('group_id', group_id))
        .collect()
    ).filter((r) => r.is_active)
    const out = []
    for (const row of rows) {
      const mid = ctx.db.normalizeId('members', row.member_id)
      const member = mid ? await ctx.db.get(mid) : null
      const uid = member ? ctx.db.normalizeId('users', member.user_id) : null
      const user = uid ? await ctx.db.get(uid) : null
      out.push({ membership: row, member, user })
    }
    return out
  },
})

/**
 * Light index of the whole directory for matching / import / search: one row per person
 * (merged duplicates skipped) with their campus, school and residence.
 */
export const peopleIndexWithSecret = query({
  args: { secret: v.string() },
  returns: v.any(),
  handler: async (ctx, { secret }) => {
    assertServerSecret(secret)
    const campusIds = (await campusGroups(ctx, true)).map((g) => String(g._id))
    const campusByMember = new Map<string, string>()
    for (const gid of campusIds) {
      const rows = await ctx.db
        .query('group_memberships')
        .withIndex('by_group_id', (q) => q.eq('group_id', gid))
        .collect()
      for (const r of rows) if (r.is_active) campusByMember.set(r.member_id, gid)
    }
    const memberByUser = new Map<string, Doc<'members'>>()
    for (const m of await ctx.db.query('members').collect()) memberByUser.set(m.user_id, m)

    const out = []
    for (const u of await ctx.db.query('users').collect()) {
      if (u.merged_into) continue
      const member = memberByUser.get(String(u._id))
      out.push({
        user_id: String(u._id),
        member_id: member ? String(member._id) : null,
        full_name: u.full_name,
        phone: u.phone ?? null,
        secondary_phone: u.secondary_phone ?? null,
        school_or_workplace: member?.school_or_workplace ?? null,
        area_of_residence: member?.area_of_residence ?? null,
        place_of_work: u.place_of_work ?? null,
        congregation: member?.congregation ?? null,
        campus_group_id: member ? campusByMember.get(String(member._id)) ?? null : null,
      })
    }
    return out
  },
})

/** Put one directory user on a campus (creates their member profile if missing). */
export const placeUserOnCampusWithSecret = mutation({
  args: {
    secret: v.string(),
    group_id: v.string(),
    user_id: v.string(),
    role: membershipRole,
    confirm_move: v.boolean(),
    keep_existing_role: v.optional(v.boolean()),
    protect_leaders: v.optional(v.boolean()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    assertServerSecret(args.secret)
    const group = await requireCampus(ctx, args.group_id)
    if (!group.is_active) throw new Error('This campus is archived.')
    const uid = ctx.db.normalizeId('users', args.user_id)
    const user = uid ? await ctx.db.get(uid) : null
    if (!user || user.merged_into) throw new Error('Person not found.')
    let member = await memberForUser(ctx, args.user_id)
    if (!member) {
      const id = await ctx.db.insert('members', {
        user_id: args.user_id,
        emergency_contacts: [],
        documents: [],
        status: 'active',
        congregation: 'campus_gem',
        updated_at: Date.now(),
      })
      await sealMemberCheckIn(ctx, id, user.full_name)
      member = await ctx.db.get(id)
    }
    if (!member) throw new Error('Could not create a member profile.')
    return await placeOnCampus(ctx, {
      group,
      memberId: member._id,
      role: args.role,
      confirmMove: args.confirm_move,
      keepExistingRole: args.keep_existing_role,
      protectLeaders: args.protect_leaders,
    })
  },
})

async function campusMembershipRow(ctx: Pick<QueryCtx, 'db'>, groupId: string, membershipId: string) {
  const mid = ctx.db.normalizeId('group_memberships', membershipId)
  const row = mid ? await ctx.db.get(mid) : null
  if (!row || row.group_id !== groupId) throw new Error('That person is not on this campus.')
  return row
}

export const getCampusMembershipWithSecret = query({
  args: { secret: v.string(), group_id: v.string(), membership_id: v.string() },
  returns: v.any(),
  handler: async (ctx, { secret, group_id, membership_id }) => {
    assertServerSecret(secret)
    const mid = ctx.db.normalizeId('group_memberships', membership_id)
    const row = mid ? await ctx.db.get(mid) : null
    return row && row.group_id === group_id ? row : null
  },
})

export const setCampusMembershipRoleWithSecret = mutation({
  args: { secret: v.string(), group_id: v.string(), membership_id: v.string(), role: membershipRole },
  returns: v.any(),
  handler: async (ctx, args) => {
    assertServerSecret(args.secret)
    await requireCampus(ctx, args.group_id)
    const row = await campusMembershipRow(ctx, args.group_id, args.membership_id)
    if (!row.is_active) throw new Error('That membership has ended.')
    await ctx.db.patch(row._id, { role: args.role, updated_at: Date.now() })
    return await ctx.db.get(row._id)
  },
})

export const endCampusMembershipWithSecret = mutation({
  args: { secret: v.string(), group_id: v.string(), membership_id: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    assertServerSecret(args.secret)
    await requireCampus(ctx, args.group_id)
    const row = await campusMembershipRow(ctx, args.group_id, args.membership_id)
    await ctx.db.patch(row._id, { is_active: false, updated_at: Date.now() })
    return null
  },
})

/** Short code / slug / aliases. Short code and slug are unique across campuses. */
export const setCampusIdentityWithSecret = mutation({
  args: {
    secret: v.string(),
    group_id: v.string(),
    short_code: v.optional(v.union(v.string(), v.null())),
    slug: v.optional(v.union(v.string(), v.null())),
    aliases: v.optional(v.array(v.string())),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    assertServerSecret(args.secret)
    const group = await requireCampus(ctx, args.group_id)
    const others = (await campusGroups(ctx, true)).filter((g) => g._id !== group._id)
    const patch: Partial<Doc<'groups'>> = { updated_at: Date.now() }
    if (args.short_code !== undefined) {
      const code = args.short_code?.trim().toUpperCase() || undefined
      if (code && !/^[A-Z0-9]{2,10}$/.test(code)) throw new Error('Short code: 2–10 letters or digits.')
      if (code && others.some((g) => g.short_code?.toUpperCase() === code)) {
        throw new Error(`Another campus already uses the short code ${code}.`)
      }
      patch.short_code = code
    }
    if (args.slug !== undefined) {
      const slug = args.slug?.trim().toLowerCase() || undefined
      if (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error('Link name: lowercase letters, digits and dashes.')
      if (slug && others.some((g) => g.slug === slug)) throw new Error(`Another campus already uses /${slug}.`)
      patch.slug = slug
    }
    if (args.aliases !== undefined) patch.aliases = args.aliases.length ? args.aliases.slice(0, 12) : undefined
    await ctx.db.patch(group._id, patch)
    return await ctx.db.get(group._id)
  },
})

async function findUserByPhone(ctx: Pick<QueryCtx, 'db'>, phone: string): Promise<Doc<'users'> | null> {
  const follow = async (u: Doc<'users'> | null) => {
    let current = u
    for (let i = 0; current?.merged_into && i < 5; i++) current = await ctx.db.get(current.merged_into)
    return current
  }
  const variants = phoneLookupVariants(phone)
  for (const candidate of variants) {
    const found = await ctx.db
      .query('users')
      .withIndex('by_phone', (q) => q.eq('phone', candidate))
      .first()
    if (found) return await follow(found)
  }
  for (const candidate of variants) {
    const found = await ctx.db
      .query('users')
      .withIndex('by_secondary_phone', (q) => q.eq('secondary_phone', candidate))
      .first()
    if (found) return await follow(found)
  }
  const target = normalizeGhanaPhone(phone)
  if (!target) return null
  for (const user of await ctx.db.query('users').collect()) {
    if (
      (user.phone && normalizeGhanaPhone(user.phone) === target) ||
      (user.secondary_phone && normalizeGhanaPhone(user.secondary_phone) === target)
    ) {
      return await follow(user)
    }
  }
  return null
}

/**
 * Join a campus by phone (public /join link, roster import). Existing person: never touches
 * their name or role, only fills EMPTY fields. New person: member with congregation campus_gem.
 */
export const joinCampusByPhoneWithSecret = mutation({
  args: {
    secret: v.string(),
    group_id: v.string(),
    full_name: v.string(),
    phone: v.string(),
    whatsapp: v.optional(v.string()),
    area_of_residence: v.optional(v.string()),
    notes: v.optional(v.string()),
    /** Used only when creating someone. */
    membership_id: v.string(),
    auth_uid: v.string(),
    confirm_move: v.boolean(),
    protect_leaders: v.optional(v.boolean()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    assertServerSecret(args.secret)
    const group = await requireCampus(ctx, args.group_id)
    if (!group.is_active) throw new Error('This campus is not taking sign-ups.')
    const phone = normalizeGhanaPhone(args.phone)
    if (!phone) throw new Error('Enter a valid Ghana mobile number.')
    const now = Date.now()

    let user = await findUserByPhone(ctx, phone)
    let created = false
    if (!user) {
      // Membership ids end in the phone's last 4 digits, so they can collide: make it unique.
      let membershipId = args.membership_id
      for (let i = 0; i < 20; i++) {
        const taken = await ctx.db
          .query('users')
          .withIndex('by_membership_id', (q) => q.eq('membership_id', membershipId))
          .first()
        if (!taken) break
        membershipId = `${args.membership_id}-${Math.floor(Math.random() * 900 + 100)}`
      }
      const parts = args.full_name.trim().split(/\s+/)
      const userId = await ctx.db.insert('users', {
        full_name: args.full_name.trim(),
        first_name: parts[0],
        last_name: parts.length > 1 ? parts[parts.length - 1] : undefined,
        phone,
        whatsapp: args.whatsapp,
        role: 'member',
        membership_id: membershipId,
        auth_uid: args.auth_uid,
        join_year: new Date(now).getFullYear(),
        updated_at: now,
      })
      user = await ctx.db.get(userId)
      created = true
    } else if (!user.whatsapp && args.whatsapp) {
      await ctx.db.patch(user._id, { whatsapp: args.whatsapp, updated_at: now })
    }
    if (!user) throw new Error('Could not create your profile.')

    let member = await memberForUser(ctx, String(user._id))
    if (!member) {
      const id = await ctx.db.insert('members', {
        user_id: String(user._id),
        emergency_contacts: [],
        documents: [],
        status: 'active',
        congregation: 'campus_gem',
        school_or_workplace: group.name,
        area_of_residence: args.area_of_residence,
        updated_at: now,
      })
      await sealMemberCheckIn(ctx, id, user.full_name)
      member = await ctx.db.get(id)
    } else {
      const patch: Partial<Doc<'members'>> = {}
      if (!member.school_or_workplace?.trim()) patch.school_or_workplace = group.name
      if (!member.area_of_residence?.trim() && args.area_of_residence) patch.area_of_residence = args.area_of_residence
      if (!member.congregation) patch.congregation = 'campus_gem'
      if (Object.keys(patch).length) await ctx.db.patch(member._id, { ...patch, updated_at: now })
    }
    if (!member) throw new Error('Could not create your profile.')

    const placed = await placeOnCampus(ctx, {
      group,
      memberId: member._id as Id<'members'>,
      role: 'member',
      confirmMove: args.confirm_move,
      keepExistingRole: true,
      protectLeaders: args.protect_leaders,
      notes: args.notes,
    })
    return { ...placed, created, user_id: String(user._id) }
  },
})

/** Self-service: the session user's current campus. */
export const currentCampusForUserWithSecret = query({
  args: { secret: v.string(), user_id: v.string() },
  returns: v.any(),
  handler: async (ctx, { secret, user_id }) => {
    assertServerSecret(secret)
    const member = await memberForUser(ctx, user_id)
    if (!member) return null
    const [first] = await activeCampusRows(ctx, String(member._id))
    return first
      ? {
          group_id: String(first.group._id),
          name: first.group.name,
          short_code: first.group.short_code ?? null,
          slug: first.group.slug ?? null,
          role: first.row.role,
        }
      : null
  },
})
