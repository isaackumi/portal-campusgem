import { mutation, query, type QueryCtx } from './_generated/server'
import { v } from 'convex/values'
import type { Doc } from './_generated/dataModel'
import { assertServerSecret } from './lib/serverSecret'

/**
 * QR self check-in sessions (`/i/<token>`). See lib/attendance/checkin-session.ts.
 * The token names the session; the member is always the signed-in user the server passes.
 */

const serviceType = v.union(
  v.literal('sunday_service'),
  v.literal('midweek_service'),
  v.literal('prayer_meeting'),
  v.literal('youth_service'),
  v.literal('children_service'),
  v.literal('special_event'),
  v.literal('other')
)

const congregation = v.union(v.literal('campus_gem'), v.literal('rlc'))

type SessionState = 'open' | 'not_open_yet' | 'expired' | 'closed'

/** Mirrors checkinSessionState in lib/attendance/checkin-session.ts. */
function stateOf(s: Doc<'checkin_sessions'>, now: number): SessionState {
  if (s.closed_at != null && s.closed_at <= now) return 'closed'
  if (now < s.opens_at) return 'not_open_yet'
  if (now >= s.closes_at) return 'expired'
  return 'open'
}

function publicView(s: Doc<'checkin_sessions'>, now: number) {
  return {
    id: s._id,
    token: s.token,
    service_type: s.service_type,
    service_date: s.service_date,
    congregation: s.congregation,
    title: s.title,
    opens_at: s.opens_at,
    closes_at: s.closes_at,
    closed_at: s.closed_at,
    created_by: s.created_by,
    checkin_count: s.checkin_count,
    state: stateOf(s, now),
  }
}

async function byToken(ctx: QueryCtx, token: string) {
  return await ctx.db
    .query('checkin_sessions')
    .withIndex('by_token', (q) => q.eq('token', token))
    .first()
}

/** Existing check-in for this member at this service (same date and service type). */
async function existingCheckIn(ctx: QueryCtx, s: Doc<'checkin_sessions'>, userId: string) {
  const rows = await ctx.db
    .query('attendance')
    .withIndex('by_member_and_date', (q) => q.eq('member_id', userId).eq('service_date', s.service_date))
    .collect()
  return (
    rows.find((r) => !r.dependant_id && (r.service_type ?? s.service_type) === s.service_type) ?? null
  )
}

export const createCheckinSessionWithSecret = mutation({
  args: {
    secret: v.string(),
    token: v.string(),
    service_type: serviceType,
    service_date: v.string(),
    congregation,
    title: v.optional(v.string()),
    opens_at: v.number(),
    closes_at: v.number(),
    created_by: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, { secret, ...args }) => {
    assertServerSecret(secret)
    if (args.closes_at <= args.opens_at) throw new Error('Closing time must be after opening time.')
    if (await byToken(ctx, args.token)) throw new Error('Token clash, try again.')
    const id = await ctx.db.insert('checkin_sessions', {
      ...args,
      checkin_count: 0,
      created_at: Date.now(),
    })
    const doc = await ctx.db.get(id)
    return doc ? publicView(doc, Date.now()) : null
  },
})

export const getCheckinSessionWithSecret = query({
  args: { secret: v.string(), token: v.string() },
  returns: v.any(),
  handler: async (ctx, { secret, token }) => {
    assertServerSecret(secret)
    const s = await byToken(ctx, token)
    return s ? publicView(s, Date.now()) : null
  },
})

/** Sessions still open (most recent first), so an usher can get back to one after a reload. */
export const listOpenCheckinSessionsWithSecret = query({
  args: { secret: v.string() },
  returns: v.any(),
  handler: async (ctx, { secret }) => {
    assertServerSecret(secret)
    const now = Date.now()
    const rows = await ctx.db
      .query('checkin_sessions')
      .withIndex('by_closes_at', (q) => q.gt('closes_at', now))
      .collect()
    return rows
      .filter((s) => stateOf(s, now) === 'open' || stateOf(s, now) === 'not_open_yet')
      .sort((a, b) => b.created_at - a.created_at)
      .slice(0, 20)
      .map((s) => publicView(s, now))
  },
})

export const closeCheckinSessionWithSecret = mutation({
  args: { secret: v.string(), token: v.string() },
  returns: v.any(),
  handler: async (ctx, { secret, token }) => {
    assertServerSecret(secret)
    const s = await byToken(ctx, token)
    if (!s) throw new Error('Check-in session not found.')
    const now = Date.now()
    if (s.closed_at == null) await ctx.db.patch(s._id, { closed_at: now })
    const doc = await ctx.db.get(s._id)
    return doc ? publicView(doc, now) : null
  },
})

/** What `/i/<token>` shows the signed-in member before they tap. */
export const getSelfCheckInViewWithSecret = query({
  args: { secret: v.string(), token: v.string(), user_id: v.string() },
  returns: v.any(),
  handler: async (ctx, { secret, token, user_id }) => {
    assertServerSecret(secret)
    const s = await byToken(ctx, token)
    if (!s) return null
    const existing = await existingCheckIn(ctx, s, user_id)
    return {
      session: publicView(s, Date.now()),
      checked_in_at: existing?.check_in_time ?? null,
    }
  },
})

/** Record the signed-in member at this session. Idempotent per member, date and service. */
export const selfCheckInWithSecret = mutation({
  args: { secret: v.string(), token: v.string(), user_id: v.id('users') },
  returns: v.any(),
  handler: async (ctx, { secret, token, user_id }) => {
    assertServerSecret(secret)
    const s = await byToken(ctx, token)
    if (!s) return { status: 'not_found' as const }
    const now = Date.now()
    const state = stateOf(s, now)
    if (state !== 'open') return { status: state }

    const user = await ctx.db.get(user_id)
    if (!user) return { status: 'not_found' as const }

    const memberId = String(user_id)
    const existing = await existingCheckIn(ctx, s, memberId)
    if (existing) {
      return { status: 'already' as const, check_in_time: existing.check_in_time }
    }

    const checkInTime = new Date(now).toISOString()
    await ctx.db.insert('attendance', {
      member_id: memberId,
      congregation: s.congregation,
      service_date: s.service_date,
      service_type: s.service_type,
      check_in_time: checkInTime,
      method: 'self',
      metadata: { checkin_session_id: s._id },
      created_by: memberId,
      checked_in_by: memberId,
      status: 'present',
      updated_at: now,
    })
    await ctx.db.patch(s._id, { checkin_count: s.checkin_count + 1 })
    return { status: 'recorded' as const, check_in_time: checkInTime }
  },
})
