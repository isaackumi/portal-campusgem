'use server'

import { guard } from '@/lib/auth/action-guard'
import type { ApiResponse } from '@/lib/services/api-types'
import type { Household } from '@/lib/convex/households-bridge'

/** Family households. Changes need `members.manage`; reading needs `members.view`. */

function fail<T>(error: unknown, fallback: string): ApiResponse<T> {
  return { data: null, error: error instanceof Error ? error.message : fallback, loading: false }
}

export async function loadUserHouseholdAction(userId: string): Promise<ApiResponse<Household | null>> {
  await guard('members.view')
  try {
    const { fetchUserHouseholdFromConvex } = await import('@/lib/convex/households-bridge')
    return { data: await fetchUserHouseholdFromConvex(userId), error: null, loading: false }
  } catch (error) {
    return fail(error, 'Could not load the household')
  }
}

export async function createHouseholdAction(input: { name: string; userId: string }): Promise<ApiResponse<Household>> {
  await guard('members.manage')
  try {
    const name = input.name?.trim()
    if (!name) throw new Error('Give the household a name.')
    const { createHouseholdInConvex } = await import('@/lib/convex/households-bridge')
    return { data: await createHouseholdInConvex(name, input.userId), error: null, loading: false }
  } catch (error) {
    return fail(error, 'Could not create the household')
  }
}

export async function addToHouseholdAction(input: {
  householdId: string
  userId: string
}): Promise<ApiResponse<Household>> {
  await guard('members.manage')
  try {
    const { addUserToHouseholdInConvex } = await import('@/lib/convex/households-bridge')
    return { data: await addUserToHouseholdInConvex(input.householdId, input.userId), error: null, loading: false }
  } catch (error) {
    return fail(error, 'Could not add this person')
  }
}

/** Removing the last person deletes the household. */
export async function removeFromHouseholdAction(userId: string): Promise<ApiResponse<true>> {
  await guard('members.manage')
  try {
    const { removeUserFromHouseholdInConvex } = await import('@/lib/convex/households-bridge')
    await removeUserFromHouseholdInConvex(userId)
    return { data: true, error: null, loading: false }
  } catch (error) {
    return fail(error, 'Could not remove this person')
  }
}

export async function setHouseholdPrimaryAction(input: {
  householdId: string
  userId: string
}): Promise<ApiResponse<true>> {
  await guard('members.manage')
  try {
    const { setHouseholdPrimaryInConvex } = await import('@/lib/convex/households-bridge')
    await setHouseholdPrimaryInConvex(input.householdId, input.userId)
    return { data: true, error: null, loading: false }
  } catch (error) {
    return fail(error, 'Could not set the main contact')
  }
}

export async function renameHouseholdAction(input: { householdId: string; name: string }): Promise<ApiResponse<true>> {
  await guard('members.manage')
  try {
    const { renameHouseholdInConvex } = await import('@/lib/convex/households-bridge')
    await renameHouseholdInConvex(input.householdId, input.name)
    return { data: true, error: null, loading: false }
  } catch (error) {
    return fail(error, 'Could not rename the household')
  }
}

export type HouseholdSearchResult = {
  id: string
  full_name: string
  membership_id: string
  household_id?: string
}

/** People to add to a household, by name, membership ID or phone. */
export async function searchPeopleForHouseholdAction(query: string): Promise<ApiResponse<HouseholdSearchResult[]>> {
  await guard('members.manage')
  try {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return { data: [], error: null, loading: false }
    const digits = q.replace(/\D/g, '')
    const { fetchUsersFromConvex } = await import('@/lib/convex/core-bridge')
    const users = await fetchUsersFromConvex()
    const data = users
      .filter((u) => !u.merged_into)
      .filter(
        (u) =>
          u.full_name.toLowerCase().includes(q) ||
          u.membership_id.toLowerCase().includes(q) ||
          (digits.length >= 4 && (u.phone ?? '').replace(/\D/g, '').includes(digits))
      )
      .slice(0, 12)
      .map((u) => ({ id: u.id, full_name: u.full_name, membership_id: u.membership_id, household_id: u.household_id }))
    return { data, error: null, loading: false }
  } catch (error) {
    return fail(error, 'Search failed')
  }
}

/** household id -> primary user id, for "One text per household". */
export async function loadHouseholdPrimariesAction(
  householdIds: string[]
): Promise<ApiResponse<Record<string, string | null>>> {
  await guard('sms.send')
  try {
    const ids = Array.from(new Set((householdIds ?? []).filter((id) => typeof id === 'string'))).slice(0, 2000)
    const { fetchHouseholdPrimariesFromConvex } = await import('@/lib/convex/households-bridge')
    return { data: await fetchHouseholdPrimariesFromConvex(ids), error: null, loading: false }
  } catch (error) {
    return fail(error, 'Could not load households')
  }
}
