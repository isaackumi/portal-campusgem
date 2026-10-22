import 'server-only'

import { cookies } from 'next/headers'
import type { NextResponse } from 'next/server'
import type { AppUser } from '@/lib/types'
import { CHMS_AUTH_SESSION_COOKIE } from '@/lib/auth/session-cookie'
import {
  effectivePermissions,
  encodePermissionsCookie,
  hasPermission,
  type Permission,
} from '@/lib/auth/roles'

export const CHMS_ROLE_COOKIE = 'chms-role'
export const CHMS_PERMS_COOKIE = 'chms-perms'
export const CHMS_USER_ID_COOKIE = 'chms-user-id'

const SESSION_MAX_AGE = 60 * 60 * 24 * 7

function cookieOptions(maxAge = SESSION_MAX_AGE) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge,
    path: '/',
  }
}

/** Shape returned to the browser (never includes more than the client needs). */
export function toSessionPayload(user: AppUser) {
  return {
    id: user.id,
    full_name: user.full_name,
    role: user.role,
    permissions: user.permissions ?? [],
    effective_permissions: effectivePermissions(user.role, user.permissions),
    phone: user.phone,
    auth_uid: user.auth_uid ?? '',
    membership_id: user.membership_id,
  }
}

/** Write the session + routing cookies from the user's current DB record. */
export function applySessionCookies(response: NextResponse, user: AppUser): void {
  const opts = cookieOptions()
  if (user.auth_uid) response.cookies.set(CHMS_AUTH_SESSION_COOKIE, user.auth_uid, opts)
  response.cookies.set(CHMS_ROLE_COOKIE, user.role, opts)
  response.cookies.set(CHMS_PERMS_COOKIE, encodePermissionsCookie(user.permissions), opts)
  response.cookies.set(CHMS_USER_ID_COOKIE, user.id, opts)
}

export function clearSessionCookies(response: NextResponse): void {
  const opts = cookieOptions(0)
  for (const name of [
    CHMS_AUTH_SESSION_COOKIE,
    CHMS_ROLE_COOKIE,
    CHMS_PERMS_COOKIE,
    CHMS_USER_ID_COOKIE,
    'firebase-auth-token',
    'sb-access-token',
  ]) {
    response.cookies.set(name, '', opts)
  }
}

/** Resolve the signed-in user from the session cookie against Convex (fresh role). */
export async function getSessionUser(): Promise<AppUser | null> {
  const store = await cookies()
  const authUid = store.get(CHMS_AUTH_SESSION_COOKIE)?.value
  if (!authUid) return null
  const { findUserByAuthUidFromConvex } = await import('@/lib/convex/core-bridge')
  return findUserByAuthUidFromConvex(authUid)
}

/** Throws unless the signed-in user holds `permission` (role or per-user grant). */
export async function requirePermission(permission: Permission): Promise<AppUser> {
  const user = await getSessionUser()
  if (!user) throw new Error('Your session has expired. Sign in again.')
  if (!hasPermission(user.role, permission, user.permissions)) {
    throw new Error('You do not have permission to do this.')
  }
  return user
}

/**
 * Guard for anything that changes who can do what. Changing roles or grants needs
 * `users.manage`; touching admin rights (granting, or changing an existing admin)
 * also needs `admins.manage`. People cannot demote themselves out of admin by accident.
 */
export async function requireAccessChange(args: {
  target: Pick<AppUser, 'id' | 'role' | 'permissions'> | null
  nextRole: AppUser['role']
  nextPermissions?: readonly string[]
}): Promise<AppUser> {
  const actor = await requirePermission('users.manage')
  const { target, nextRole, nextPermissions } = args
  const touchesAdmin =
    nextRole === 'admin' ||
    target?.role === 'admin' ||
    Boolean(nextPermissions?.some((p) => p === 'admins.manage' || p === 'users.manage'))
  if (touchesAdmin && !hasPermission(actor.role, 'admins.manage', actor.permissions)) {
    throw new Error('Only administrators with “Manage administrators” can change admin access.')
  }
  if (target && target.id === actor.id && actor.role === 'admin' && nextRole !== 'admin') {
    throw new Error('You cannot remove your own administrator role. Ask another admin.')
  }
  return actor
}
