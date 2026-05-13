import { v } from 'convex/values'
import { query, mutation } from './_generated/server'
import { requireAuth } from './lib/access'

export const listActive = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    await requireAuth(ctx)
    return await ctx.db
      .query('groups')
      .withIndex('by_active', (q) => q.eq('is_active', true))
      .collect()
  },
})

export const getWithMemberships = query({
  args: { group_id: v.id('groups') },
  returns: v.any(),
  handler: async (ctx, { group_id }) => {
    await requireAuth(ctx)
    const group = await ctx.db.get('groups', group_id)
    if (!group) return null
    const gid = group_id as string
    const memberships = await ctx.db
      .query('group_memberships')
      .withIndex('by_group_id', (q) => q.eq('group_id', gid))
      .collect()
    return { group, memberships }
  },
})

export const addMembership = mutation({
  args: {
    group_id: v.string(),
    member_id: v.string(),
    role: v.union(
      v.literal('leader'),
      v.literal('co_leader'),
      v.literal('member'),
      v.literal('volunteer')
    ),
    joined_date: v.string(),
    notes: v.optional(v.string()),
  },
  returns: v.id('group_memberships'),
  handler: async (ctx, args) => {
    await requireAuth(ctx)
    const existing = await ctx.db
      .query('group_memberships')
      .withIndex('by_group_id', (q) => q.eq('group_id', args.group_id))
      .filter((q) => q.eq(q.field('member_id'), args.member_id))
      .first()
    const now = Date.now()
    if (existing) {
      await ctx.db.patch('group_memberships', existing._id, {
        role: args.role,
        is_active: true,
        notes: args.notes,
        updated_at: now,
      })
      return existing._id
    }
    return await ctx.db.insert('group_memberships', {
      ...args,
      is_active: true,
      updated_at: now,
    })
  },
})
