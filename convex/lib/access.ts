import type { DataModel } from '../_generated/dataModel'
import type { GenericMutationCtx, GenericQueryCtx } from 'convex/server'

type QueryCtx = GenericQueryCtx<DataModel>
type MutationCtx = GenericMutationCtx<DataModel>

type AuthCtx = QueryCtx | MutationCtx

/**
 * Returns Convex Auth identity or null.
 * Wire Convex Auth (or Clerk / custom JWT) before relying on this in production.
 */
export async function getIdentity(ctx: AuthCtx) {
  return await ctx.auth.getUserIdentity()
}

/** Require a signed-in user (queries and mutations). */
export async function requireAuth(ctx: AuthCtx) {
  const id = await ctx.auth.getUserIdentity()
  if (!id) {
    throw new Error('Not authenticated')
  }
  return id
}

/** @deprecated Use requireAuth */
export async function requireIdentity(ctx: MutationCtx) {
  return await requireAuth(ctx)
}

/**
 * Map JWT subject to `users` row via `auth_uid` (e.g. Firebase UID embedded in JWT).
 */
export async function getCurrentUserDoc(ctx: AuthCtx) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) return null
  const u = await ctx.db
    .query('users')
    .withIndex('by_auth_uid', (q) => q.eq('auth_uid', identity.subject))
    .first()
  return u
}
