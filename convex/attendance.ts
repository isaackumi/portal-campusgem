import { v } from 'convex/values'
import { query, mutation } from './_generated/server'
import { requireAuth } from './lib/access'

const serviceType = v.union(
  v.literal('sunday_service'),
  v.literal('midweek_service'),
  v.literal('prayer_meeting'),
  v.literal('youth_service'),
  v.literal('children_service'),
  v.literal('special_event')
)

const method = v.union(
  v.literal('qr'),
  v.literal('kiosk'),
  v.literal('admin'),
  v.literal('pin'),
  v.literal('mobile')
)

export const listByDate = query({
  args: { service_date: v.string() },
  returns: v.array(v.any()),
  handler: async (ctx, { service_date }) => {
    await requireAuth(ctx)
    return await ctx.db
      .query('attendance')
      .withIndex('by_service_date', (q) => q.eq('service_date', service_date))
      .collect()
  },
})

export const listByMember = query({
  args: { member_id: v.string(), limit: v.optional(v.number()) },
  returns: v.array(v.any()),
  handler: async (ctx, { member_id, limit = 100 }) => {
    await requireAuth(ctx)
    return await ctx.db
      .query('attendance')
      .withIndex('by_member_id', (q) => q.eq('member_id', member_id))
      .order('desc')
      .take(limit)
  },
})

/** Idempotent insert when client_uuid is set (offline sync). */
export const recordCheckIn = mutation({
  args: {
    member_id: v.optional(v.string()),
    dependant_id: v.optional(v.string()),
    service_date: v.string(),
    service_type: v.optional(serviceType),
    check_in_time: v.string(),
    method,
    metadata: v.optional(v.any()),
    client_uuid: v.optional(v.string()),
    created_by: v.optional(v.string()),
    checked_in_by: v.optional(v.string()),
  },
  returns: v.id('attendance'),
  handler: async (ctx, args) => {
    await requireAuth(ctx)
    if (args.client_uuid) {
      const existing = await ctx.db
        .query('attendance')
        .withIndex('by_client_uuid', (q) => q.eq('client_uuid', args.client_uuid))
        .first()
      if (existing) {
        return existing._id
      }
    }
    const now = Date.now()
    return await ctx.db.insert('attendance', {
      ...args,
      updated_at: now,
    })
  },
})
