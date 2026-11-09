import { mutation } from './_generated/server'
import { v } from 'convex/values'
import { assertServerSecret } from './lib/serverSecret'

const RESEND_AFTER_MS = 45_000
const MAX_PER_HOUR = 5
const MAX_ATTEMPTS = 5

/**
 * Store a new sign-in code (already hashed by the server) unless the person is
 * asking too often.
 *
 * Lifecycle: issued ──right code──▶ used · ──5 wrong──▶ locked · ──time──▶ expired.
 * Only the newest code is ever checked (verify reads the latest), so a newer code replaces older
 * ones without touching them. That matters when the text fails to send: the new code is discarded
 * and the previous one, still unexpired, keeps working instead of leaving the person with none.
 */
export const issueAuthCodeWithSecret = mutation({
  args: {
    secret: v.string(),
    user_id: v.id('users'),
    code_hash: v.string(),
    sent_to: v.string(),
    ttl_ms: v.number(),
  },
  returns: v.union(
    v.object({ ok: v.literal(true), id: v.id('auth_codes') }),
    v.object({ ok: v.literal(false), reason: v.union(v.literal('wait'), v.literal('too_many')), retry_after_ms: v.number() })
  ),
  handler: async (ctx, { secret, user_id, code_hash, sent_to, ttl_ms }) => {
    assertServerSecret(secret)
    const now = Date.now()
    const recent = await ctx.db
      .query('auth_codes')
      .withIndex('by_user', (q) => q.eq('user_id', user_id).gte('created_at', now - 60 * 60 * 1000))
      .collect()
    const latest = recent.reduce((max, c) => Math.max(max, c.created_at), 0)
    if (latest && now - latest < RESEND_AFTER_MS) {
      return { ok: false as const, reason: 'wait' as const, retry_after_ms: RESEND_AFTER_MS - (now - latest) }
    }
    if (recent.length >= MAX_PER_HOUR) {
      const oldest = recent.reduce((min, c) => Math.min(min, c.created_at), now)
      return { ok: false as const, reason: 'too_many' as const, retry_after_ms: oldest + 60 * 60 * 1000 - now }
    }
    const id = await ctx.db.insert('auth_codes', {
      user_id,
      code_hash,
      sent_to,
      expires_at: now + ttl_ms,
      attempts: 0,
      created_at: now,
    })
    return { ok: true as const, id }
  },
})

/** Undo an issued code whose text could not be sent, so it doesn't count against the limits. */
export const discardAuthCodeWithSecret = mutation({
  args: { secret: v.string(), id: v.id('auth_codes') },
  returns: v.null(),
  handler: async (ctx, { secret, id }) => {
    assertServerSecret(secret)
    if (await ctx.db.get(id)) await ctx.db.delete(id)
    return null
  },
})

/**
 * Check a code. Wrong guesses are counted (returned, not thrown, so the count
 * sticks); after MAX_ATTEMPTS the code is dead and a new one must be sent.
 */
export const verifyAuthCodeWithSecret = mutation({
  args: { secret: v.string(), user_id: v.id('users'), code_hash: v.string() },
  returns: v.union(
    v.object({ ok: v.literal(true) }),
    v.object({
      ok: v.literal(false),
      reason: v.union(v.literal('none'), v.literal('expired'), v.literal('locked'), v.literal('wrong')),
      attempts_left: v.number(),
    })
  ),
  handler: async (ctx, { secret, user_id, code_hash }) => {
    assertServerSecret(secret)
    const now = Date.now()
    const code = await ctx.db
      .query('auth_codes')
      .withIndex('by_user', (q) => q.eq('user_id', user_id))
      .order('desc')
      .first()
    if (!code || code.used_at) return { ok: false as const, reason: 'none' as const, attempts_left: 0 }
    if (code.expires_at < now) return { ok: false as const, reason: 'expired' as const, attempts_left: 0 }
    if (code.attempts >= MAX_ATTEMPTS) return { ok: false as const, reason: 'locked' as const, attempts_left: 0 }
    if (code.code_hash !== code_hash) {
      const attempts = code.attempts + 1
      await ctx.db.patch(code._id, attempts >= MAX_ATTEMPTS ? { attempts, used_at: now } : { attempts })
      const left = MAX_ATTEMPTS - attempts
      return { ok: false as const, reason: left > 0 ? ('wrong' as const) : ('locked' as const), attempts_left: left }
    }
    await ctx.db.patch(code._id, { used_at: now })
    return { ok: true as const }
  },
})
