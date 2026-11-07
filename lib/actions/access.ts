'use server'

import type { AppUser, UserRole } from '@/lib/types'
import { effectivePermissions, isUserRole, sanitizePermissions, permissionsForRole } from '@/lib/auth/roles'
import type { AccessLogEntry, AccessLogKind } from '@/lib/convex/auth-bridge'
import { labelOf, logActivity } from '@/lib/activity/log'

export type SignInSmsResult = { sent: boolean; error?: string }

/**
 * Record an access change in the history. History must never block the change
 * itself, so failures are logged and swallowed.
 */
async function recordAccessChange(args: {
  kind: AccessLogKind
  target: AppUser
  actor: AppUser | null
  before?: Pick<AppUser, 'role' | 'permissions'>
  after?: Pick<AppUser, 'role' | 'permissions'>
  note?: string
}): Promise<void> {
  try {
    const { logAccessChangeInConvex } = await import('@/lib/convex/auth-bridge')
    const had = args.before ? effectivePermissions(args.before.role, args.before.permissions) : []
    const has = args.after ? effectivePermissions(args.after.role, args.after.permissions) : []
    await logAccessChangeInConvex({
      kind: args.kind,
      user_id: args.target.id,
      user_name: args.target.full_name,
      actor_id: args.actor?.id,
      actor_name: args.actor?.full_name ?? 'System',
      from_role: args.before?.role,
      to_role: args.after?.role,
      added: has.filter((p) => !had.includes(p)),
      removed: had.filter((p) => !has.includes(p)),
      note: args.note,
    })
  } catch (error) {
    console.error('[access history] could not record change', error)
  }
}

/** Text someone where and how to sign in. Never throws; SMS trouble is reported back. */
async function textSignInDetails(user: AppUser, actor: AppUser | null): Promise<SignInSmsResult> {
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
  let result: SignInSmsResult
  try {
    const res = await sendSms(user.phone, message)
    result = res.success ? { sent: true } : { sent: false, error: res.error ?? 'SMS failed' }
  } catch (error: unknown) {
    result = { sent: false, error: error instanceof Error ? error.message : 'SMS failed' }
  }
  await recordAccessChange({
    kind: 'signin_text',
    target: user,
    actor,
    note: result.sent ? 'Sign-in details texted' : `Sign-in text failed: ${result.error}`,
  })
  return result
}

/** Resend the "you have access, sign in here" text. */
export async function sendSignInDetailsSms(userId: string): Promise<SignInSmsResult> {
  try {
    const { guard } = await import('@/lib/auth/action-guard')
    const actor = await guard('users.manage')
    const { fetchUserFromConvex } = await import('@/lib/convex/core-bridge')
    const user = await fetchUserFromConvex(userId)
    if (!user) return { sent: false, error: 'That person no longer exists.' }
    const result = await textSignInDetails(user, actor)
    if (result.sent) await logActivity({ category: 'access', action: 'access.signin_text', summary: `Texted ${user.full_name} how to sign in`, target: { type: 'user', id: userId, label: user.full_name } })
    return result
  } catch (error: unknown) {
    return { sent: false, error: error instanceof Error ? error.message : 'Failed to send' }
  }
}

/**
 * Set a person's role plus any extra permissions on top of it. Extra grants that the
 * role already includes are dropped so the stored list only holds real exceptions.
 *
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
    const actor = await requireAccessChange({ target, nextRole: role, nextPermissions: extra })

    const data = await setUserAccessInConvex(userId, { role, permissions: extra })
    const { gainedPermissions } = await import('@/lib/auth/access-welcome')
    const after = data ?? { ...target, role, permissions: extra }
    const changed =
      target.role !== after.role ||
      gainedPermissions(target, after).length > 0 ||
      gainedPermissions(after, target).length > 0
    if (changed) await recordAccessChange({ kind: 'access', target, actor, before: target, after })

    let sms: SignInSmsResult | null = null
    if (options.notify && data && gainedPermissions(target, data).length > 0) {
      sms = await textSignInDetails(data, actor)
    }
    await logActivity({ category: 'access', action: 'access.change', summary: `Changed ${labelOf(data) ?? 'someone'}'s access to ${role}`, target: { type: 'user', id: userId, label: labelOf(data) }, details: { role, permissions } })
    return { data, error: null, sms }
  } catch (error: unknown) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to update access' }
  }
}

/** Access history, newest first. One person's when `userId` is given. */
export async function listAccessHistory(
  userId?: string,
  limit = 100
): Promise<{ data: AccessLogEntry[]; error: string | null }> {
  try {
    const { guard } = await import('@/lib/auth/action-guard')
    await guard('users.manage')
    const { listAccessLogFromConvex } = await import('@/lib/convex/auth-bridge')
    return { data: await listAccessLogFromConvex(userId, limit), error: null }
  } catch (error: unknown) {
    return { data: [], error: error instanceof Error ? error.message : 'Failed to load history' }
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
    const actor = await requireAccessChange({ target: keep, nextRole: keep.role })
    if (duplicate.role === 'admin') {
      await requireAccessChange({ target: duplicate, nextRole: duplicate.role })
    }
    const data = await linkDuplicateUserInConvex(keepId, duplicateId)
    await recordAccessChange({
      kind: 'link_duplicate',
      target: keep,
      actor,
      note: `Merged ${duplicate.full_name}${duplicate.phone ? ` (${duplicate.phone})` : ''} into this record; that number now signs in here`,
    })
    await logActivity({ category: 'access', action: 'access.link_duplicate', summary: 'Linked two records of the same person', target: { type: 'user', id: keepId }, details: { duplicate_id: duplicateId } })
    return { data, error: null }
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
    const actor = await requireAccessChange({ target, nextRole: target.role })
    const next = secondaryPhone.trim() || undefined
    const data = await setUserSecondaryPhoneInConvex(userId, next)
    if ((target.secondary_phone ?? '') !== (next ?? '')) {
      await recordAccessChange({
        kind: 'secondary_phone',
        target,
        actor,
        note: next
          ? `Secondary sign-in phone set to ${next}${target.secondary_phone ? ` (was ${target.secondary_phone})` : ''}`
          : `Secondary sign-in phone ${target.secondary_phone} removed`,
      })
    }
    await logActivity({ category: 'access', action: 'access.secondary_phone', summary: 'Changed a second sign-in number', target: { type: 'user', id: userId } })
    return { data, error: null }
  } catch (error: unknown) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to update phone' }
  }
}
