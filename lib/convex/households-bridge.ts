import 'server-only'

import { getConvexHttpClient } from '@/lib/convex/http-client'
import { convexUserDocToAppUser, requireCoreServerSecret } from '@/lib/convex/core-bridge'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'

/** Staff view of a household. Members carry only what the household card needs. */
export type HouseholdMember = {
  id: string
  full_name: string
  membership_id: string
  phone?: string
  role: string
}

export type Household = {
  id: string
  name: string
  primary_user_id?: string
  members: HouseholdMember[]
}

type RawHousehold = {
  id: string
  name: string
  primary_user_id?: string
  members: Record<string, unknown>[]
} | null

function mapHousehold(raw: RawHousehold): Household | null {
  if (!raw) return null
  const members: HouseholdMember[] = []
  for (const doc of raw.members ?? []) {
    const user = convexUserDocToAppUser(doc)
    if (!user) continue
    members.push({
      id: user.id,
      full_name: user.full_name,
      membership_id: user.membership_id,
      phone: user.phone,
      role: user.role,
    })
  }
  members.sort((a, b) => {
    if (a.id === raw.primary_user_id) return -1
    if (b.id === raw.primary_user_id) return 1
    return a.full_name.localeCompare(b.full_name)
  })
  return { id: String(raw.id), name: raw.name, primary_user_id: raw.primary_user_id, members }
}

export async function createHouseholdInConvex(name: string, userId?: string): Promise<Household> {
  const raw = (await getConvexHttpClient().mutation(api.households.createHouseholdWithSecret, {
    secret: requireCoreServerSecret(),
    name,
    user_id: userId ? (userId as Id<'users'>) : undefined,
  })) as RawHousehold
  const household = mapHousehold(raw)
  if (!household) throw new Error('Could not create the household.')
  return household
}

export async function addUserToHouseholdInConvex(householdId: string, userId: string): Promise<Household> {
  const raw = (await getConvexHttpClient().mutation(api.households.addUserToHouseholdWithSecret, {
    secret: requireCoreServerSecret(),
    household_id: householdId as Id<'households'>,
    user_id: userId as Id<'users'>,
  })) as RawHousehold
  const household = mapHousehold(raw)
  if (!household) throw new Error('Household not found.')
  return household
}

export async function removeUserFromHouseholdInConvex(userId: string): Promise<void> {
  await getConvexHttpClient().mutation(api.households.removeUserFromHouseholdWithSecret, {
    secret: requireCoreServerSecret(),
    user_id: userId as Id<'users'>,
  })
}

export async function setHouseholdPrimaryInConvex(householdId: string, userId: string): Promise<void> {
  await getConvexHttpClient().mutation(api.households.setHouseholdPrimaryWithSecret, {
    secret: requireCoreServerSecret(),
    household_id: householdId as Id<'households'>,
    user_id: userId as Id<'users'>,
  })
}

export async function renameHouseholdInConvex(householdId: string, name: string): Promise<void> {
  await getConvexHttpClient().mutation(api.households.renameHouseholdWithSecret, {
    secret: requireCoreServerSecret(),
    household_id: householdId as Id<'households'>,
    name,
  })
}

export async function fetchHouseholdFromConvex(householdId: string): Promise<Household | null> {
  const raw = (await getConvexHttpClient().query(api.households.getHouseholdWithSecret, {
    secret: requireCoreServerSecret(),
    household_id: householdId as Id<'households'>,
  })) as RawHousehold
  return mapHousehold(raw)
}

export async function fetchUserHouseholdFromConvex(userId: string): Promise<Household | null> {
  const raw = (await getConvexHttpClient().query(api.households.getUserHouseholdWithSecret, {
    secret: requireCoreServerSecret(),
    user_id: userId as Id<'users'>,
  })) as RawHousehold
  return mapHousehold(raw)
}

export async function fetchHouseholdPrimariesFromConvex(
  householdIds: string[]
): Promise<Record<string, string | null>> {
  if (householdIds.length === 0) return {}
  return (await getConvexHttpClient().query(api.households.getHouseholdPrimariesWithSecret, {
    secret: requireCoreServerSecret(),
    household_ids: householdIds,
  })) as Record<string, string | null>
}
