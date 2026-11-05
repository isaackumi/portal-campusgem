import 'server-only'

import { isValidMembershipId, normalizeMembershipId } from '@/lib/membershipId'
import { isValidPhone, normalizePhone } from '@/lib/phone'
import type { AppUser } from '@/lib/types'

export type LoginLookup =
  | { ok: true; user: AppUser; /** The phone to text a code to. */ codePhone: string | null }
  | { ok: false; status: number; error: string }

/** Find the account for what someone typed on the sign-in screen. */
export async function lookupLoginUser(input: unknown): Promise<LoginLookup> {
  const rawInput = String(input ?? '').trim()
  if (!rawInput) return { ok: false, status: 400, error: 'Phone number or membership ID is required' }

  const normalizedMembershipId = normalizeMembershipId(rawInput)
  const membershipLookup = isValidMembershipId(normalizedMembershipId)
  const phoneLookup = isValidPhone(rawInput)
  if (!membershipLookup && !phoneLookup) {
    return { ok: false, status: 400, error: 'Enter a valid Ghana phone number or membership ID (CG-XXXX-YYYY).' }
  }

  const { findUserByMembershipIdFromConvex, findUserByPhoneFromConvex } = await import('@/lib/convex/core-bridge')
  let user: AppUser | null = null
  let viaPhone = false
  if (phoneLookup) {
    user = await findUserByPhoneFromConvex(rawInput, { withAuthUid: true })
    viaPhone = Boolean(user)
  }
  if (!user && membershipLookup) user = await findUserByMembershipIdFromConvex(normalizedMembershipId, { withAuthUid: true })

  if (!user) {
    const checked = phoneLookup ? normalizePhone(rawInput) : normalizedMembershipId
    return {
      ok: false,
      status: 404,
      error: membershipLookup
        ? `No account matches ${checked}. Check the membership ID or sign in with the phone number on file.`
        : `No account matches ${checked}. Sign in with the phone number on file, or use your membership ID.`,
    }
  }
  if (!user.auth_uid) return { ok: false, status: 400, error: 'Account not properly set up' }

  // Signed in by phone: text the number they typed (it is one of theirs).
  const codePhone = viaPhone ? normalizePhone(rawInput) : user.phone || user.secondary_phone || null
  return { ok: true, user, codePhone }
}

/** Map Convex/env failures to a message people can act on. */
export function loginErrorResponse(error: unknown): { status: number; error: string } {
  const message = error instanceof Error ? error.message : ''
  if (message.includes('CAMP_CONVEX_SERVER_SECRET') || message.includes('NEXT_PUBLIC_CONVEX_URL') || message === 'Unauthorized') {
    return { status: 503, error: 'Login service is not configured correctly. Try again or use your membership ID.' }
  }
  return { status: 500, error: 'Internal server error' }
}
