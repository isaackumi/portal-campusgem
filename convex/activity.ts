/**
 * The activity log: one row per thing that happened (lib/activity/log.ts writes them; /admin/activity
 * reads them). Server-only.
 */
import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { assertServerSecret } from './lib/serverSecret'

const entry = {
  category: v.string(),
  action: v.string(),
  summary: v.string(),
  outcome: v.union(v.literal('ok'), v.literal('failed')),
  actor_id: v.optional(v.string()),
  actor_name: v.optional(v.string()),
  target_type: v.optional(v.string()),
  target_id: v.optional(v.string()),
  target_label: v.optional(v.string()),
  ip: v.optional(v.string()),
  device: v.optional(v.string()),
  details: v.optional(v.any()),
}

export const logWithSecret = mutation({
  args: { secret: v.string(), ...entry },
  returns: v.null(),
  handler: async (ctx, { secret, ...row }) => {
    assertServerSecret(secret)
    const clean = Object.fromEntries(Object.entries(row).filter(([, value]) => value !== undefined)) as typeof row
    await ctx.db.insert('activity_log', { ...clean, summary: clean.summary.slice(0, 300), at: Date.now() })
    return null
  },
})

/**
 * Newest first, a page at a time; by one person or one category when asked, and since a time.
 * `cursor` continues where the last page stopped.
 */
export const listWithSecret = query({
  args: {
    secret: v.string(),
    actor_id: v.optional(v.string()),
    category: v.optional(v.string()),
    since: v.optional(v.number()),
    failed_only: v.optional(v.boolean()),
    cursor: v.optional(v.union(v.string(), v.null())),
    limit: v.optional(v.number()),
  },
  returns: v.object({ rows: v.array(v.any()), cursor: v.union(v.string(), v.null()), done: v.boolean() }),
  handler: async (ctx, args) => {
    assertServerSecret(args.secret)
    const since = args.since ?? 0
    const base = args.actor_id
      ? ctx.db.query('activity_log').withIndex('by_actor', (q) => q.eq('actor_id', args.actor_id).gte('at', since))
      : args.category
        ? ctx.db.query('activity_log').withIndex('by_category', (q) => q.eq('category', args.category!).gte('at', since))
        : ctx.db.query('activity_log').withIndex('by_at', (q) => q.gte('at', since))
    let ordered = base.order('desc')
    if (args.actor_id && args.category) ordered = ordered.filter((q) => q.eq(q.field('category'), args.category!))
    if (args.failed_only) ordered = ordered.filter((q) => q.eq(q.field('outcome'), 'failed'))
    const page = await ordered.paginate({ numItems: Math.min(Math.max(args.limit ?? 50, 1), 200), cursor: args.cursor ?? null })
    return {
      rows: page.page.map((r) => ({ ...r, id: r._id })),
      cursor: page.isDone ? null : page.continueCursor,
      done: page.isDone,
    }
  },
})
