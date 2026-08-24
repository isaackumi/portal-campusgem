import { v } from 'convex/values'
import { query, mutation } from './_generated/server'
import { requireAuth } from './lib/access'
import { sealVisitorCheckIn } from './lib/rlcCheckInCode'

export const recent = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(v.any()),
  handler: async (ctx, { limit = 50 }) => {
    await requireAuth(ctx)
    return await ctx.db.query('visitors').order('desc').take(limit)
  },
})

export const create = mutation({
  args: {
    first_name: v.string(),
    last_name: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
    visit_date: v.string(),
    service_attended: v.optional(v.string()),
    how_heard_about_church: v.optional(v.string()),
    invited_by_member_id: v.optional(v.string()),
    follow_up_notes: v.optional(v.string()),
    follow_up_date: v.optional(v.string()),
    follow_up_completed: v.boolean(),
    converted_to_member: v.boolean(),
    converted_member_id: v.optional(v.string()),
    is_active: v.boolean(),
  },
  returns: v.id('visitors'),
  handler: async (ctx, args) => {
    await requireAuth(ctx)
    const now = Date.now()
    const id = await ctx.db.insert('visitors', {
      ...args,
      updated_at: now,
    })
    await sealVisitorCheckIn(
      ctx,
      id,
      [args.first_name, args.last_name].filter(Boolean).join(' ').trim() || 'Visitor'
    )
    return id
  },
})
