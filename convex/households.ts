import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server'
import { v } from 'convex/values'
import type { Doc, Id } from './_generated/dataModel'
import { assertServerSecret } from './lib/serverSecret'

/**
 * Households link family members (users.household_id). A household with nobody left
 * in it is deleted. Server-secret only: Next.js reaches these through
 * lib/convex/households-bridge.ts.
 */

async function householdMembers(ctx: Pick<QueryCtx, 'db'>, householdId: Id<'households'>) {
  return await ctx.db
    .query('users')
    .withIndex('by_household', (q) => q.eq('household_id', householdId))
    .collect()
}

/** Delete the household if empty, or hand "primary" on if the primary person left. */
async function tidyHousehold(ctx: Pick<MutationCtx, 'db'>, householdId: Id<'households'>) {
  const household = await ctx.db.get(householdId)
  if (!household) return
  const members = await householdMembers(ctx, householdId)
  if (members.length === 0) {
    await ctx.db.delete(householdId)
    return
  }
  if (household.primary_user_id && !members.some((m) => m._id === household.primary_user_id)) {
    await ctx.db.patch(householdId, { primary_user_id: undefined, updated_at: Date.now() })
  }
}

/** Take a user out of their household (if any) and tidy up what is left. */
export async function detachUserFromHousehold(ctx: Pick<MutationCtx, 'db'>, user: Doc<'users'>) {
  const previous = user.household_id
  if (!previous) return
  await ctx.db.patch(user._id, { household_id: undefined, updated_at: Date.now() })
  await tidyHousehold(ctx, previous)
}

function summary(household: Doc<'households'>, members: Doc<'users'>[]) {
  return {
    id: String(household._id),
    name: household.name,
    primary_user_id: household.primary_user_id ? String(household.primary_user_id) : undefined,
    updated_at: household.updated_at,
    members,
  }
}

export const createHouseholdWithSecret = mutation({
  args: {
    secret: v.string(),
    name: v.string(),
    /** First member; becomes the primary person. */
    user_id: v.optional(v.id('users')),
  },
  returns: v.any(),
  handler: async (ctx, { secret, name, user_id }) => {
    assertServerSecret(secret)
    const trimmed = name.trim()
    if (!trimmed) throw new Error('Give the household a name.')
    const user = user_id ? await ctx.db.get(user_id) : null
    if (user_id && !user) throw new Error('Person not found.')
    const id = await ctx.db.insert('households', {
      name: trimmed.slice(0, 120),
      primary_user_id: user?._id,
      updated_at: Date.now(),
    })
    if (user) {
      await detachUserFromHousehold(ctx, user)
      await ctx.db.patch(user._id, { household_id: id, updated_at: Date.now() })
    }
    const household = (await ctx.db.get(id))!
    return summary(household, await householdMembers(ctx, id))
  },
})

export const addUserToHouseholdWithSecret = mutation({
  args: { secret: v.string(), household_id: v.id('households'), user_id: v.id('users') },
  returns: v.any(),
  handler: async (ctx, { secret, household_id, user_id }) => {
    assertServerSecret(secret)
    const household = await ctx.db.get(household_id)
    if (!household) throw new Error('Household not found.')
    const user = await ctx.db.get(user_id)
    if (!user) throw new Error('Person not found.')
    if (user.household_id !== household_id) {
      await detachUserFromHousehold(ctx, user)
      await ctx.db.patch(user_id, { household_id, updated_at: Date.now() })
    }
    if (!household.primary_user_id) {
      await ctx.db.patch(household_id, { primary_user_id: user_id, updated_at: Date.now() })
    }
    const fresh = (await ctx.db.get(household_id))!
    return summary(fresh, await householdMembers(ctx, household_id))
  },
})

export const removeUserFromHouseholdWithSecret = mutation({
  args: { secret: v.string(), user_id: v.id('users') },
  returns: v.null(),
  handler: async (ctx, { secret, user_id }) => {
    assertServerSecret(secret)
    const user = await ctx.db.get(user_id)
    if (!user) throw new Error('Person not found.')
    await detachUserFromHousehold(ctx, user)
    return null
  },
})

export const setHouseholdPrimaryWithSecret = mutation({
  args: { secret: v.string(), household_id: v.id('households'), user_id: v.id('users') },
  returns: v.null(),
  handler: async (ctx, { secret, household_id, user_id }) => {
    assertServerSecret(secret)
    const user = await ctx.db.get(user_id)
    if (!user || user.household_id !== household_id) {
      throw new Error('That person is not in this household.')
    }
    await ctx.db.patch(household_id, { primary_user_id: user_id, updated_at: Date.now() })
    return null
  },
})

export const renameHouseholdWithSecret = mutation({
  args: { secret: v.string(), household_id: v.id('households'), name: v.string() },
  returns: v.null(),
  handler: async (ctx, { secret, household_id, name }) => {
    assertServerSecret(secret)
    const trimmed = name.trim()
    if (!trimmed) throw new Error('Give the household a name.')
    await ctx.db.patch(household_id, { name: trimmed.slice(0, 120), updated_at: Date.now() })
    return null
  },
})

/** Household plus its members (raw user docs: the bridge maps them). */
export const getHouseholdWithSecret = query({
  args: { secret: v.string(), household_id: v.id('households') },
  returns: v.any(),
  handler: async (ctx, { secret, household_id }) => {
    assertServerSecret(secret)
    const household = await ctx.db.get(household_id)
    if (!household) return null
    return summary(household, await householdMembers(ctx, household_id))
  },
})

/** The household a user belongs to, or null. */
export const getUserHouseholdWithSecret = query({
  args: { secret: v.string(), user_id: v.id('users') },
  returns: v.any(),
  handler: async (ctx, { secret, user_id }) => {
    assertServerSecret(secret)
    const user = await ctx.db.get(user_id)
    if (!user?.household_id) return null
    const household = await ctx.db.get(user.household_id)
    if (!household) return null
    return summary(household, await householdMembers(ctx, household._id))
  },
})

/** Primary person per household, for "one text per household". */
export const getHouseholdPrimariesWithSecret = query({
  args: { secret: v.string(), household_ids: v.array(v.string()) },
  returns: v.any(),
  handler: async (ctx, { secret, household_ids }) => {
    assertServerSecret(secret)
    const out: Record<string, string | null> = {}
    for (const raw of Array.from(new Set(household_ids)).slice(0, 2000)) {
      const id = ctx.db.normalizeId('households', raw)
      const household = id ? await ctx.db.get(id) : null
      out[raw] = household?.primary_user_id ? String(household.primary_user_id) : null
    }
    return out
  },
})
