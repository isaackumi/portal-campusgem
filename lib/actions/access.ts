'use server'

import type { AppUser, UserRole } from '@/lib/types'
import { isUserRole, sanitizePermissions, permissionsForRole } from '@/lib/auth/roles'

/**
 * Set a person's role plus any extra permissions on top of it. Extra grants that the
 * role already includes are dropped so the stored list only holds real exceptions.
 */
export async function updateUserAccess(
  userId: string,
  role: UserRole,
  permissions: string[]
): Promise<{ data: AppUser | null; error: string | null }> {
  try {
    if (!isUserRole(role)) throw new Error('Choose a valid role.')
    const roleSet = new Set<string>(permissionsForRole(role))
    const extra = sanitizePermissions(permissions).filter((p) => !roleSet.has(p))

    const { fetchUserFromConvex, setUserAccessInConvex } = await import('@/lib/convex/core-bridge')
    const { requireAccessChange } = await import('@/lib/auth/server-session')
    const target = await fetchUserFromConvex(userId)
    if (!target) throw new Error('That person no longer exists.')
    await requireAccessChange({ target, nextRole: role, nextPermissions: extra })

    const data = await setUserAccessInConvex(userId, { role, permissions: extra })
    return { data, error: null }
  } catch (error: unknown) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to update access' }
  }
}

export async function listDuplicatePeople(): Promise<{
  data: import('@/lib/people/duplicates').DuplicatePeopleGroup[]
  error: string | null
}> {
  try {
    const { guard } = await import('@/lib/auth/action-guard')
    await guard('users.manage')
    const { fetchUsersFromConvex } = await import('@/lib/convex/core-bridge')
    const { findDuplicatePeople } = await import('@/lib/people/duplicates')
    return { data: findDuplicatePeople(await fetchUsersFromConvex()), error: null }
  } catch (error: unknown) {
    return { data: [], error: error instanceof Error ? error.message : 'Failed to find duplicates' }
  }
}

/**
 * Keep one record and add the duplicate's phone as its secondary (login) phone.
 * Giving a new number access to someone's account is an access change, so it is
 * guarded like one (admin accounts need "Manage administrators").
 */
export async function linkDuplicatePerson(
  keepId: string,
  duplicateId: string
): Promise<{ data: AppUser | null; error: string | null }> {
  try {
    const { fetchUserFromConvex, linkDuplicateUserInConvex } = await import('@/lib/convex/core-bridge')
    const { requireAccessChange } = await import('@/lib/auth/server-session')
    const [keep, duplicate] = await Promise.all([fetchUserFromConvex(keepId), fetchUserFromConvex(duplicateId)])
    if (!keep || !duplicate) throw new Error('One of these records no longer exists.')
    await requireAccessChange({ target: keep, nextRole: keep.role })
    if (duplicate.role === 'admin') {
      await requireAccessChange({ target: duplicate, nextRole: duplicate.role })
    }
    return { data: await linkDuplicateUserInConvex(keepId, duplicateId), error: null }
  } catch (error: unknown) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to link records' }
  }
}

export async function updateSecondaryPhone(
  userId: string,
  secondaryPhone: string
): Promise<{ data: AppUser | null; error: string | null }> {
  try {
    const { fetchUserFromConvex, setUserSecondaryPhoneInConvex } = await import('@/lib/convex/core-bridge')
    const { requireAccessChange } = await import('@/lib/auth/server-session')
    const target = await fetchUserFromConvex(userId)
    if (!target) throw new Error('That person no longer exists.')
    await requireAccessChange({ target, nextRole: target.role })
    return { data: await setUserSecondaryPhoneInConvex(userId, secondaryPhone.trim() || undefined), error: null }
  } catch (error: unknown) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to update phone' }
  }
}
