'use server'

import type { AppUser, UserRole } from '@/lib/types'
import { isUserRole, sanitizePermissions, permissionsForRole } from '@/lib/auth/roles'

/**
 * Set a person's role plus any extra permissions on top of it. Extra grants that the
 * role already includes are dropped so the stored list only holds real exceptions.
 */
export type SignInSmsResult = { sent: boolean; error?: string }

/** Text someone where and how to sign in. Never throws; SMS trouble is reported back. */
async function textSignInDetails(user: AppUser): Promise<SignInSmsResult> {
  if (!user.phone?.trim()) return { sent: false, error: 'No phone number on file' }
  const { buildAccessWelcomeSms } = await import('@/lib/auth/access-welcome')
  const { siteOrigin } = await import('@/lib/site-url')
  const { sendSms } = await import('@/lib/comms/sms-client')
  const message = buildAccessWelcomeSms({
    fullName: user.full_name,
    role: user.role,
    permissions: user.permissions,
    phone: user.phone,
    siteUrl: siteOrigin(),
  })
  try {
    const res = await sendSms(user.phone, message)
    return res.success ? { sent: true } : { sent: false, error: res.error ?? 'SMS failed' }
  } catch (error: unknown) {
    return { sent: false, error: error instanceof Error ? error.message : 'SMS failed' }
  }
}

/** Resend the "you have access, sign in here" text. */
export async function sendSignInDetailsSms(userId: string): Promise<SignInSmsResult> {
  try {
    const { guard } = await import('@/lib/auth/action-guard')
    await guard('users.manage')
    const { fetchUserFromConvex } = await import('@/lib/convex/core-bridge')
    const user = await fetchUserFromConvex(userId)
    if (!user) return { sent: false, error: 'That person no longer exists.' }
    return await textSignInDetails(user)
  } catch (error: unknown) {
    return { sent: false, error: error instanceof Error ? error.message : 'Failed to send' }
  }
}

/**
 * With `notify`, the person is texted their sign-in details, but only when the
 * change gives them access they did not have before (never on a downgrade).
 */
export async function updateUserAccess(
  userId: string,
  role: UserRole,
  permissions: string[],
  options: { notify?: boolean } = {}
): Promise<{ data: AppUser | null; error: string | null; sms?: SignInSmsResult | null }> {
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
    let sms: SignInSmsResult | null = null
    if (options.notify && data) {
      const { gainedPermissions } = await import('@/lib/auth/access-welcome')
      if (gainedPermissions(target, data).length > 0) sms = await textSignInDetails(data)
    }
    return { data, error: null, sms }
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
