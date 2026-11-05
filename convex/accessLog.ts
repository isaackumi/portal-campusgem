import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { assertServerSecret } from './lib/serverSecret'

const kind = v.union(
  v.literal('access'),
  v.literal('secondary_phone'),
  v.literal('link_duplicate'),
  v.literal('signin_text')
)

export const logAccessChangeWithSecret = mutation({
  args: {
    secret: v.string(),
    user_id: v.id('users'),
    user_name: v.string(),
    actor_id: v.optional(v.id('users')),
    actor_name: v.string(),
    kind,
    from_role: v.optional(v.string()),
    to_role: v.optional(v.string()),
    added: v.array(v.string()),
    removed: v.array(v.string()),
    note: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, { secret, ...entry }) => {
    assertServerSecret(secret)
    await ctx.db.insert('access_log', { ...entry, at: Date.now() })
    return null
  },
})

/** Most recent first; one person's history when `user_id` is given. */
export const listAccessLogWithSecret = query({
  args: { secret: v.string(), user_id: v.optional(v.id('users')), limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, { secret, user_id, limit }) => {
    assertServerSecret(secret)
    const take = Math.min(Math.max(limit ?? 100, 1), 500)
    const rows = user_id
      ? await ctx.db
          .query('access_log')
          .withIndex('by_user', (q) => q.eq('user_id', user_id))
          .order('desc')
          .take(take)
      : await ctx.db.query('access_log').withIndex('by_at').order('desc').take(take)
    return rows.map((r) => ({ ...r, id: r._id }))
  },
})
