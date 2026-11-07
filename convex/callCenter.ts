/**
 * Call center: the shared queue's claims, calling sessions and WhatsApp templates. Server-only
 * (`*WithSecret`), reached through `lib/convex/call-center-bridge.ts`; the permission checks are in
 * `lib/actions/call-center.ts`.
 *
 * A mutation runs as one transaction, so `claimNextWithSecret` can look at the claims and take the
 * first free person without two callers ever getting the same one.
 */
import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import type { Id } from './_generated/dataModel'
import { assertServerSecret } from './lib/serverSecret'

// --- Claims ------------------------------------------------------------------------------------

/**
 * Take the next person to call: the caller's own unfinished claim if they have one in this list
 * (a reload never loses who they were on), otherwise the first candidate nobody holds. Candidates
 * come in queue order (lib/calls/queue.ts). Returns the target id, or null when nobody is free.
 */
export const claimNextWithSecret = mutation({
  args: {
    secret: v.string(),
    list_key: v.string(),
    caller_id: v.string(),
    candidate_ids: v.array(v.string()),
    ttl_ms: v.number(),
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, { secret, list_key, caller_id, candidate_ids, ttl_ms }) => {
    assertServerSecret(secret)
    const now = Date.now()
    const mine = await ctx.db
      .query('call_claims')
      .withIndex('by_caller', (q) => q.eq('caller_id', caller_id))
      .collect()
    const held = mine.find((c) => c.list_key === list_key && c.expires_at > now && candidate_ids.includes(c.target_id))
    if (held) {
      await ctx.db.patch(held._id, { expires_at: now + ttl_ms })
      return held.target_id
    }
    // Anything else this caller held in this list is let go: one person at a time.
    for (const c of mine) if (c.list_key === list_key) await ctx.db.delete(c._id)
    for (const target_id of candidate_ids.slice(0, 500)) {
      const claim = await ctx.db
        .query('call_claims')
        .withIndex('by_list_target', (q) => q.eq('list_key', list_key).eq('target_id', target_id))
        .first()
      if (claim && claim.expires_at > now) continue
      if (claim) await ctx.db.delete(claim._id)
      await ctx.db.insert('call_claims', { list_key, target_id, caller_id, claimed_at: now, expires_at: now + ttl_ms })
      return target_id
    }
    return null
  },
})

/** Let a person go (an outcome was recorded, or the caller skipped them). Only the holder's claim. */
export const releaseClaimWithSecret = mutation({
  args: { secret: v.string(), list_key: v.string(), caller_id: v.string(), target_id: v.string() },
  returns: v.null(),
  handler: async (ctx, { secret, list_key, caller_id, target_id }) => {
    assertServerSecret(secret)
    const claim = await ctx.db
      .query('call_claims')
      .withIndex('by_list_target', (q) => q.eq('list_key', list_key).eq('target_id', target_id))
      .first()
    if (claim && claim.caller_id === caller_id) await ctx.db.delete(claim._id)
    return null
  },
})

/** Who holds whom right now in a list (expired claims left out). */
export const listClaimsWithSecret = query({
  args: { secret: v.string(), list_key: v.string() },
  returns: v.array(v.object({ target_id: v.string(), caller_id: v.string(), claimed_at: v.number() })),
  handler: async (ctx, { secret, list_key }) => {
    assertServerSecret(secret)
    const now = Date.now()
    const claims = await ctx.db
      .query('call_claims')
      .withIndex('by_list', (q) => q.eq('list_key', list_key))
      .collect()
    return claims
      .filter((c) => c.expires_at > now)
      .map((c) => ({ target_id: c.target_id, caller_id: c.caller_id, claimed_at: c.claimed_at }))
  },
})

// --- Sessions ----------------------------------------------------------------------------------

const sessionShape = v.object({
  id: v.string(),
  list_key: v.string(),
  title: v.string(),
  segment: v.string(),
  started_by: v.string(),
  started_at: v.number(),
  ended_at: v.optional(v.number()),
  status: v.string(),
})

function sessionOut(doc: {
  _id: Id<'call_sessions'>
  list_key: string
  title: string
  segment: string
  started_by: string
  started_at: number
  ended_at?: number
  status: string
}) {
  return {
    id: doc._id as string,
    list_key: doc.list_key,
    title: doc.title,
    segment: doc.segment,
    started_by: doc.started_by,
    started_at: doc.started_at,
    ...(doc.ended_at !== undefined ? { ended_at: doc.ended_at } : {}),
    status: doc.status,
  }
}

/** The live session for a list, if one is running. */
export const getLiveSessionWithSecret = query({
  args: { secret: v.string(), list_key: v.string() },
  returns: v.union(sessionShape, v.null()),
  handler: async (ctx, { secret, list_key }) => {
    assertServerSecret(secret)
    const live = await ctx.db
      .query('call_sessions')
      .withIndex('by_list_status', (q) => q.eq('list_key', list_key).eq('status', 'live'))
      .first()
    return live ? sessionOut(live) : null
  },
})

/** Start a session for a list (or return the one already live, so two managers can't start two). */
export const startSessionWithSecret = mutation({
  args: { secret: v.string(), list_key: v.string(), title: v.string(), segment: v.string(), started_by: v.string() },
  returns: sessionShape,
  handler: async (ctx, { secret, list_key, title, segment, started_by }) => {
    assertServerSecret(secret)
    const live = await ctx.db
      .query('call_sessions')
      .withIndex('by_list_status', (q) => q.eq('list_key', list_key).eq('status', 'live'))
      .first()
    if (live) return sessionOut(live)
    const id = await ctx.db.insert('call_sessions', {
      list_key,
      title: title.slice(0, 80),
      segment,
      started_by,
      started_at: Date.now(),
      status: 'live',
    })
    const doc = await ctx.db.get(id)
    if (!doc) throw new Error('Could not start the session')
    return sessionOut(doc)
  },
})

/** Change who the live session works through (all / new / returning). */
export const setSessionSegmentWithSecret = mutation({
  args: { secret: v.string(), session_id: v.id('call_sessions'), segment: v.string() },
  returns: v.null(),
  handler: async (ctx, { secret, session_id, segment }) => {
    assertServerSecret(secret)
    await ctx.db.patch(session_id, { segment })
    return null
  },
})

/**
 * End a session: nobody new is handed out. Claims are left to run out on their own, so someone in
 * the middle of a call can still save what the person said.
 */
export const endSessionWithSecret = mutation({
  args: { secret: v.string(), session_id: v.id('call_sessions') },
  returns: v.null(),
  handler: async (ctx, { secret, session_id }) => {
    assertServerSecret(secret)
    const session = await ctx.db.get(session_id)
    if (!session || session.status === 'ended') return null
    await ctx.db.patch(session_id, { status: 'ended', ended_at: Date.now() })
    return null
  },
})

/** I'm here: join the session, or say so again (the board shows who was seen lately). */
export const heartbeatWithSecret = mutation({
  args: { secret: v.string(), session_id: v.id('call_sessions'), user_id: v.string(), name: v.string() },
  returns: v.null(),
  handler: async (ctx, { secret, session_id, user_id, name }) => {
    assertServerSecret(secret)
    const now = Date.now()
    const row = await ctx.db
      .query('call_session_people')
      .withIndex('by_session_user', (q) => q.eq('session_id', session_id).eq('user_id', user_id))
      .first()
    if (row) await ctx.db.patch(row._id, { last_seen: now, name })
    else await ctx.db.insert('call_session_people', { session_id, user_id, name, joined_at: now, last_seen: now })
    return null
  },
})

/** Note an outcome made during a session, for the board. */
export const recordSessionOutcomeWithSecret = mutation({
  args: {
    secret: v.string(),
    session_id: v.id('call_sessions'),
    caller_id: v.string(),
    target_id: v.string(),
    target_name: v.string(),
    outcome: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    assertServerSecret(args.secret)
    await ctx.db.insert('call_session_outcomes', {
      session_id: args.session_id,
      caller_id: args.caller_id,
      target_id: args.target_id,
      target_name: args.target_name.slice(0, 120),
      outcome: args.outcome,
      at: Date.now(),
    })
    return null
  },
})

/** Everything the board shows for a session: who is in it, and the outcomes so far. */
export const getSessionBoardWithSecret = query({
  args: { secret: v.string(), session_id: v.id('call_sessions') },
  returns: v.object({
    people: v.array(v.object({ user_id: v.string(), name: v.string(), joined_at: v.number(), last_seen: v.number() })),
    outcomes: v.array(
      v.object({ caller_id: v.string(), target_id: v.string(), target_name: v.string(), outcome: v.string(), at: v.number() })
    ),
  }),
  handler: async (ctx, { secret, session_id }) => {
    assertServerSecret(secret)
    const people = await ctx.db
      .query('call_session_people')
      .withIndex('by_session', (q) => q.eq('session_id', session_id))
      .collect()
    const outcomes = await ctx.db
      .query('call_session_outcomes')
      .withIndex('by_session', (q) => q.eq('session_id', session_id))
      .collect()
    return {
      people: people.map((p) => ({ user_id: p.user_id, name: p.name, joined_at: p.joined_at, last_seen: p.last_seen })),
      outcomes: outcomes.map((o) => ({ caller_id: o.caller_id, target_id: o.target_id, target_name: o.target_name, outcome: o.outcome, at: o.at })),
    }
  },
})

// --- Templates ---------------------------------------------------------------------------------

const templateShape = v.object({
  key: v.string(),
  name: v.string(),
  body: v.string(),
  audience: v.union(v.literal('camp'), v.literal('members'), v.literal('any')),
  position: v.number(),
  archived: v.optional(v.boolean()),
})

/** Templates managers have saved (the app's defaults live in code). */
export const listTemplatesWithSecret = query({
  args: { secret: v.string() },
  returns: v.array(templateShape),
  handler: async (ctx, { secret }) => {
    assertServerSecret(secret)
    const rows = await ctx.db.query('message_templates').collect()
    return rows.map((r) => ({
      key: r.key,
      name: r.name,
      body: r.body,
      audience: r.audience,
      position: r.position,
      ...(r.archived !== undefined ? { archived: r.archived } : {}),
    }))
  },
})

/** Save a template by key (a default's key replaces that default). */
export const saveTemplateWithSecret = mutation({
  args: { secret: v.string(), template: templateShape, updated_by: v.string() },
  returns: v.null(),
  handler: async (ctx, { secret, template, updated_by }) => {
    assertServerSecret(secret)
    const row = await ctx.db
      .query('message_templates')
      .withIndex('by_key', (q) => q.eq('key', template.key))
      .first()
    const doc = { ...template, updated_by, updated_at: Date.now() }
    if (row) await ctx.db.patch(row._id, doc)
    else await ctx.db.insert('message_templates', doc)
    return null
  },
})

/** Put a default back as the app ships it (removes the saved copy). */
export const resetTemplateWithSecret = mutation({
  args: { secret: v.string(), key: v.string() },
  returns: v.null(),
  handler: async (ctx, { secret, key }) => {
    assertServerSecret(secret)
    const row = await ctx.db
      .query('message_templates')
      .withIndex('by_key', (q) => q.eq('key', key))
      .first()
    if (row) await ctx.db.delete(row._id)
    return null
  },
})

// --- SMS number changes ------------------------------------------------------------------------

/** Every number change (small: one row per changed number). */
export const listNumberChangesWithSecret = query({
  args: { secret: v.string() },
  returns: v.array(v.object({ from_phone: v.string(), to_phone: v.string() })),
  handler: async (ctx, { secret }) => {
    assertServerSecret(secret)
    const rows = await ctx.db.query('sms_number_changes').collect()
    return rows.map((r) => ({ from_phone: r.from_phone, to_phone: r.to_phone }))
  },
})

/** Texts to `from_phone` go to `to_phone` from now on (keys are 233… digits). */
export const setNumberChangeWithSecret = mutation({
  args: { secret: v.string(), from_phone: v.string(), to_phone: v.string(), set_by: v.string(), context: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, { secret, from_phone, to_phone, set_by, context }) => {
    assertServerSecret(secret)
    if (!from_phone || !to_phone) throw new Error('Both numbers are needed.')
    const row = await ctx.db
      .query('sms_number_changes')
      .withIndex('by_from', (q) => q.eq('from_phone', from_phone))
      .first()
    // Back to the original number: no change to keep.
    if (from_phone === to_phone) {
      if (row) await ctx.db.delete(row._id)
      return null
    }
    const doc = { from_phone, to_phone, set_by, set_at: Date.now(), ...(context ? { context } : {}) }
    if (row) await ctx.db.patch(row._id, doc)
    else await ctx.db.insert('sms_number_changes', doc)
    // A new number that had itself been moved elsewhere is now in use again: drop that old move.
    const back = await ctx.db
      .query('sms_number_changes')
      .withIndex('by_from', (q) => q.eq('from_phone', to_phone))
      .first()
    if (back) await ctx.db.delete(back._id)
    return null
  },
})
