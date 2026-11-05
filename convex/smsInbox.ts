import { mutation, query, type QueryCtx } from './_generated/server'
import { v } from 'convex/values'
import type { Doc, Id } from './_generated/dataModel'
import { assertServerSecret } from './lib/serverSecret'
import { phoneLookupVariants } from './lib/phone'

/**
 * SMS replies inbox. Written by the webhook (`app/api/sms/inbound`), read by
 * `/admin/inbox`, both through lib/convex/inbox-bridge.ts. Keyword decisions (STOP, YES/NO)
 * are made in lib/comms/inbound.ts; this module only stores and matches.
 */

async function followMerged(ctx: QueryCtx, user: Doc<'users'>): Promise<Doc<'users'>> {
  let current = user
  for (let i = 0; i < 5 && current.merged_into; i++) {
    const next = await ctx.db.get('users', current.merged_into)
    if (!next) break
    current = next
  }
  return current
}

async function matchSender(ctx: QueryCtx, phone: string) {
  const variants = phoneLookupVariants(phone)
  let user: Doc<'users'> | null = null
  for (const index of ['by_phone', 'by_secondary_phone'] as const) {
    const field = index === 'by_phone' ? 'phone' : 'secondary_phone'
    for (const candidate of variants) {
      const found = await ctx.db
        .query('users')
        .withIndex(index, (q) => q.eq(field, candidate))
        .first()
      if (found) {
        user = await followMerged(ctx, found)
        break
      }
    }
    if (user) break
  }

  let visitor: Doc<'visitors'> | null = null
  for (const candidate of variants) {
    visitor = await ctx.db
      .query('visitors')
      .withIndex('by_phone', (q) => q.eq('phone', candidate))
      .first()
    if (visitor) break
  }

  let registration: Doc<'camp_registrations'> | null = null
  for (const candidate of variants) {
    const rows = await ctx.db
      .query('camp_registrations')
      .withIndex('by_phone', (q) => q.eq('phone', candidate))
      .collect()
    for (const row of rows) {
      if (!registration || row._creationTime > registration._creationTime) registration = row
    }
  }

  const regName =
    registration &&
    (registration.full_name?.trim() ||
      `${registration.first_name ?? ''} ${registration.last_name ?? ''}`.trim() ||
      undefined)
  const visitorName = visitor && [visitor.first_name, visitor.last_name].filter(Boolean).join(' ').trim()

  return {
    user_id: user?._id,
    user_name: user?.full_name,
    sms_opt_out: Boolean(user?.sms_opt_out),
    visitor_id: visitor?._id,
    visitor_name: visitorName || undefined,
    camp_registration_id: registration?._id,
    camp_registration_name: regName || undefined,
    sender_name: user?.full_name || visitorName || regName || undefined,
  }
}

export const matchSenderWithSecret = query({
  args: { secret: v.string(), phone: v.string() },
  returns: v.any(),
  handler: async (ctx, { secret, phone }) => {
    assertServerSecret(secret)
    return matchSender(ctx, phone)
  },
})

export const recordInboundWithSecret = mutation({
  args: {
    secret: v.string(),
    from: v.string(),
    phone: v.string(),
    to: v.optional(v.string()),
    body: v.string(),
    provider_message_id: v.optional(v.string()),
    keyword: v.optional(v.string()),
    tags: v.array(v.string()),
    /** true = opt the matched user out, false = back in. */
    opt_out: v.optional(v.boolean()),
  },
  returns: v.object({ id: v.string(), duplicate: v.boolean() }),
  handler: async (ctx, { secret, opt_out, ...msg }) => {
    assertServerSecret(secret)
    if (msg.provider_message_id) {
      const dup = await ctx.db
        .query('sms_inbox')
        .withIndex('by_provider_message_id', (q) => q.eq('provider_message_id', msg.provider_message_id))
        .first()
      if (dup) return { id: dup._id, duplicate: true }
    }
    const match = await matchSender(ctx, msg.phone)
    const id = await ctx.db.insert('sms_inbox', {
      ...msg,
      received_at: Date.now(),
      user_id: match.user_id,
      visitor_id: match.visitor_id,
      camp_registration_id: match.camp_registration_id,
      sender_name: match.sender_name,
    })
    if (opt_out !== undefined && match.user_id) {
      await ctx.db.patch('users', match.user_id, { sms_opt_out: opt_out, updated_at: Date.now() })
    }
    return { id, duplicate: false }
  },
})

function messageOut(m: Doc<'sms_inbox'>) {
  return { ...m, id: m._id }
}

export const listInboxWithSecret = query({
  args: { secret: v.string(), limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, { secret, limit }) => {
    assertServerSecret(secret)
    const take = Math.min(Math.max(limit ?? 500, 1), 1000)
    const rows = await ctx.db.query('sms_inbox').withIndex('by_received_at').order('desc').take(take)
    return rows.map(messageOut)
  },
})

/** Inbound messages from a number plus what we sent to it (communications log). */
export const getThreadWithSecret = query({
  args: { secret: v.string(), phone: v.string() },
  returns: v.any(),
  handler: async (ctx, { secret, phone }) => {
    assertServerSecret(secret)
    const inbound = await ctx.db
      .query('sms_inbox')
      .withIndex('by_phone', (q) => q.eq('phone', phone))
      .order('desc')
      .take(200)
    const outbound = []
    const seen = new Set<string>()
    for (const candidate of [phone, ...phoneLookupVariants(phone)]) {
      if (seen.has(candidate)) continue
      seen.add(candidate)
      const rows = await ctx.db
        .query('communications')
        .withIndex('by_recipient_phone', (q) => q.eq('recipient_phone', candidate))
        .order('desc')
        .take(100)
      for (const c of rows) {
        if (c.channel !== 'sms') continue
        outbound.push({
          id: c._id,
          body: c.message_body,
          at: c.sent_at ?? c._creationTime,
          status: c.status,
          sender_id: c.sender_id,
          recipient_name: c.recipient_name,
        })
      }
    }
    const match = await matchSender(ctx, phone)
    return { inbound: inbound.map(messageOut), outbound, match }
  },
})

async function threadRows(ctx: QueryCtx, phone: string) {
  return ctx.db
    .query('sms_inbox')
    .withIndex('by_phone', (q) => q.eq('phone', phone))
    .collect()
}

export const markThreadReadWithSecret = mutation({
  args: { secret: v.string(), phone: v.string(), by: v.optional(v.string()), unread: v.optional(v.boolean()) },
  returns: v.null(),
  handler: async (ctx, { secret, phone, by, unread }) => {
    assertServerSecret(secret)
    const now = Date.now()
    for (const m of await threadRows(ctx, phone)) {
      if (unread) await ctx.db.patch('sms_inbox', m._id, { read_at: undefined })
      else if (!m.read_at) await ctx.db.patch('sms_inbox', m._id, { read_at: now, handled_by: m.handled_by ?? by })
    }
    return null
  },
})

export const setThreadArchivedWithSecret = mutation({
  args: { secret: v.string(), phone: v.string(), archived: v.boolean(), by: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, { secret, phone, archived, by }) => {
    assertServerSecret(secret)
    const now = Date.now()
    for (const m of await threadRows(ctx, phone)) {
      await ctx.db.patch('sms_inbox', m._id, {
        archived,
        read_at: m.read_at ?? (archived ? now : undefined),
        handled_by: m.handled_by ?? by,
      })
    }
    return null
  },
})

export const markHandledWithSecret = mutation({
  args: { secret: v.string(), phone: v.string(), by: v.string() },
  returns: v.null(),
  handler: async (ctx, { secret, phone, by }) => {
    assertServerSecret(secret)
    const now = Date.now()
    for (const m of await threadRows(ctx, phone)) {
      await ctx.db.patch('sms_inbox', m._id, { handled_by: by, read_at: m.read_at ?? now })
    }
    return null
  },
})

/** Unread, not archived. Capped: the badge only needs "a few" vs "many". */
export const countUnreadWithSecret = query({
  args: { secret: v.string() },
  returns: v.number(),
  handler: async (ctx, { secret }) => {
    assertServerSecret(secret)
    const rows = await ctx.db
      .query('sms_inbox')
      .withIndex('by_read_at', (q) => q.eq('read_at', undefined))
      .take(200)
    return rows.filter((m) => !m.archived).length
  },
})

/** Phones (as stored) of everyone who replied STOP. Bulk sends skip these. */
export const listOptedOutPhonesWithSecret = query({
  args: { secret: v.string() },
  returns: v.array(v.string()),
  handler: async (ctx, { secret }) => {
    assertServerSecret(secret)
    const users = await ctx.db
      .query('users')
      .withIndex('by_sms_opt_out', (q) => q.eq('sms_opt_out', true))
      .collect()
    const out: string[] = []
    for (const u of users) {
      if (u.phone) out.push(u.phone)
      if (u.secondary_phone) out.push(u.secondary_phone)
    }
    return out
  },
})

export const setUserSmsOptOutWithSecret = mutation({
  args: { secret: v.string(), user_id: v.string(), opt_out: v.boolean() },
  returns: v.null(),
  handler: async (ctx, { secret, user_id, opt_out }) => {
    assertServerSecret(secret)
    const id = ctx.db.normalizeId('users', user_id) as Id<'users'> | null
    if (!id) throw new Error('User not found')
    await ctx.db.patch('users', id, { sms_opt_out: opt_out, updated_at: Date.now() })
    return null
  },
})
