'use server'

import { guard } from '@/lib/auth/action-guard'
import type { ApiResponse } from '@/lib/services/api-types'
import type { MyGem } from '@/lib/me/types'

/**
 * "My GEM" actions. Both act on the signed-in person only: the user id always comes
 * from the session (`guard` returns it), never from the client.
 */

async function sessionUserId(): Promise<string> {
  const user = await guard('dashboard.view')
  if (!user) throw new Error('Your session has expired. Sign in again.')
  return user.id
}

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

export async function loadMyGemAction(): Promise<ApiResponse<MyGem>> {
  try {
    const userId = await sessionUserId()
    const { fetchMyGemFromConvex } = await import('@/lib/convex/me-bridge')
    const data = await fetchMyGemFromConvex(userId, isoDaysAgo(400))
    if (!data) return { data: null, error: 'We could not find your record. Contact the church office.', loading: false }
    return { data, error: null, loading: false }
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Could not load your page', loading: false }
  }
}

/**
 * Update the caller's own phone-safe details. Anything else in `input` (phone, role,
 * permissions, membership ID…) is dropped by `sanitizeMyDetails`.
 */
export async function updateMyDetailsAction(input: unknown): Promise<ApiResponse<true>> {
  try {
    const userId = await sessionUserId()
    const { sanitizeMyDetails } = await import('@/lib/me/my-details')
    const { user, member } = sanitizeMyDetails(input)
    const { updateUserInConvex, fetchMemberByUserIdFromConvex, patchMemberInConvex } = await import(
      '@/lib/convex/core-bridge'
    )

    if (Object.keys(member).length > 0) {
      const profile = await fetchMemberByUserIdFromConvex(userId)
      if (!profile) {
        throw new Error('Your member profile is not set up yet, so your address cannot be saved. Contact the church office.')
      }
      await patchMemberInConvex(profile.id, member)
    }
    if (Object.keys(user).length > 0) {
      await updateUserInConvex(userId, user)
    }
    return { data: true, error: null, loading: false }
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Could not save your details', loading: false }
  }
}
