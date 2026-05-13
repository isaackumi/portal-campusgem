import { v } from 'convex/values'
import { query, mutation } from './_generated/server'
import { requireAuth, getCurrentUserDoc } from './lib/access'

const userRole = v.union(
  v.literal('admin'),
  v.literal('pastor'),
  v.literal('elder'),
  v.literal('finance_officer'),
  v.literal('member'),
  v.literal('visitor')
)

export const getById = query({
  args: { id: v.id('users') },
  returns: v.any(),
  handler: async (ctx, { id }) => {
    return await ctx.db.get('users', id)
  },
})

export const getByMembershipId = query({
  args: { membership_id: v.string() },
  returns: v.any(),
  handler: async (ctx, { membership_id }) => {
    return await ctx.db
      .query('users')
      .withIndex('by_membership_id', (q) => q.eq('membership_id', membership_id))
      .first()
  },
})

export const listPage = query({
  args: {
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.any()),
  handler: async (ctx, { limit = 50 }) => {
    await requireAuth(ctx)
    return await ctx.db.query('users').order('desc').take(limit)
  },
})

export const upsertForMigration = mutation({
  args: {
    membership_id: v.string(),
    full_name: v.string(),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    role: userRole,
    join_year: v.number(),
    auth_uid: v.optional(v.string()),
  },
  returns: v.id('users'),
  handler: async (ctx, args) => {
    await requireAuth(ctx)
    const existing = await ctx.db
      .query('users')
      .withIndex('by_membership_id', (q) => q.eq('membership_id', args.membership_id))
      .first()

    const now = Date.now()
    const payload = {
      membership_id: args.membership_id,
      full_name: args.full_name,
      phone: args.phone,
      email: args.email,
      role: args.role,
      join_year: args.join_year,
      auth_uid: args.auth_uid,
      updated_at: now,
    }

    if (existing) {
      await ctx.db.patch('users', existing._id, payload)
      return existing._id
    }
    return await ctx.db.insert('users', payload)
  },
})

export const me = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    return await getCurrentUserDoc(ctx)
  },
})
