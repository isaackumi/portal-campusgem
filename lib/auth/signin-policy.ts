import { isStaffRole } from '@/lib/auth/roles'
import type { AppUser } from '@/lib/types'

/**
 * Who must enter a texted code, from AUTH_SIGNIN_CODES:
 * - `staff` (default): anyone with more than member access (staff role or extra grants)
 * - `all`: everyone
 * - `off`: nobody (emergency switch, e.g. if SMS is down)
 */
export type SigninCodeMode = 'staff' | 'all' | 'off'

export function signinCodeMode(raw = process.env.AUTH_SIGNIN_CODES): SigninCodeMode {
  const v = (raw ?? '').trim().toLowerCase()
  return v === 'all' || v === 'off' ? v : 'staff'
}

export function requiresSigninCode(
  user: Pick<AppUser, 'role' | 'permissions'>,
  mode: SigninCodeMode = signinCodeMode()
): boolean {
  if (mode === 'off') return false
  if (mode === 'all') return true
  return isStaffRole(user.role) || (user.permissions?.length ?? 0) > 0
}
