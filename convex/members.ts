import { v } from 'convex/values'
import { query, mutation } from './_generated/server'
import { requireAuth } from './lib/access'

export const getById = query({
  args: { id: v.id('members') },
  returns: v.any(),
  handler: async (ctx, { id }) => {
    return await ctx.db.get('members', id)
  },
})

export const getByUserId = query({
  args: { user_id: v.string() },
  returns: v.any(),
  handler: async (ctx, { user_id }) => {
    return await ctx.db
      .query('members')
      .withIndex('by_user_id', (q) => q.eq('user_id', user_id))
      .first()
  },
})

export const listRecent = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(v.any()),
  handler: async (ctx, { limit = 40 }) => {
    await requireAuth(ctx)
    return await ctx.db.query('members').order('desc').take(limit)
  },
})

export const patch = mutation({
  args: {
    id: v.id('members'),
    patch: v.object({
      status: v.optional(
        v.union(
          v.literal('active'),
          v.literal('visitor'),
          v.literal('transferred'),
          v.literal('inactive')
        )
      ),
      notes: v.optional(v.string()),
      address: v.optional(v.string()),
    }),
  },
  returns: v.id('members'),
  handler: async (ctx, { id, patch }) => {
    await requireAuth(ctx)
    await ctx.db.patch('members', id, { ...patch, updated_at: Date.now() })
    return id
  },
})
