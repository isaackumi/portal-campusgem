'use server'

import { revalidatePath } from 'next/cache'
import { ensureDirectoryUserFromCampContact } from '@/lib/actions/ensure-camp-directory-user'
import { promoteUserToCorporateGem } from '@/lib/actions/corporate-gem'
import { updateUserRecord } from '@/lib/actions/core-data'
import { STAFF_ROLES } from '@/lib/auth/roles'
import type { Group, GroupMembership, UserRole } from '@/lib/types'

export type CampContactPromotionInput = {
  full_name: string
  phone: string
  email?: string
  userId?: string
  registrationId?: string
}

async function resolveUserId(
  input: CampContactPromotionInput
): Promise<{ userId: string; created: boolean } | { error: string }> {
  if (input.userId?.trim()) {
    return { userId: input.userId.trim(), created: false }
  }

  const ensured = await ensureDirectoryUserFromCampContact({
    full_name: input.full_name,
    phone: input.phone,
    email: input.email,
    registrationId: input.registrationId,
  })

  if (ensured.error || !ensured.data) {
    return { error: ensured.error ?? 'Could not create or find a directory profile.' }
  }

  return { userId: ensured.data.userId, created: ensured.data.created }
}

function revalidateCampDirectory() {
  revalidatePath('/admin/camp-meeting/directory')
  revalidatePath('/dashboard')
  revalidatePath('/admin/users')
  revalidatePath('/admin/corporate-gem')
}

export async function promoteCampContactToCorporateGem(
  input: CampContactPromotionInput,
  options?: { groupRole?: GroupMembership['role'] }
): Promise<{
  data: GroupMembership | null
  group: Group | null
  userId: string | null
  profileCreated: boolean
  error: string | null
}> {
  const resolved = await resolveUserId(input)
  if ('error' in resolved) {
    return { data: null, group: null, userId: null, profileCreated: false, error: resolved.error }
  }

  const { data, group, error } = await promoteUserToCorporateGem(resolved.userId, {
    role: options?.groupRole ?? 'member',
  })
  if (error || !data) {
    return {
      data: null,
      group,
      userId: resolved.userId,
      profileCreated: resolved.created,
      error: error ?? 'Failed to add to Corporate Gem',
    }
  }

  revalidateCampDirectory()
  return {
    data,
    group,
    userId: resolved.userId,
    profileCreated: resolved.created,
    error: null,
  }
}

export async function promoteCampContactWithRole(
  input: CampContactPromotionInput,
  role: UserRole
): Promise<{
  data: { userId: string; role: UserRole } | null
  profileCreated: boolean
  error: string | null
}> {
  if (!STAFF_ROLES.includes(role)) {
    return { data: null, profileCreated: false, error: 'Choose a staff role with elevated permissions.' }
  }

  const resolved = await resolveUserId(input)
  if ('error' in resolved) {
    return { data: null, profileCreated: false, error: resolved.error }
  }

  const { data, error } = await updateUserRecord(resolved.userId, { role })
  if (error || !data) {
    return {
      data: null,
      profileCreated: resolved.created,
      error: error ?? 'Failed to update role and permissions',
    }
  }

  revalidateCampDirectory()
  return {
    data: { userId: data.id, role: data.role },
    profileCreated: resolved.created,
    error: null,
  }
}

/** @deprecated Use promoteCampContactWithRole with role `admin` */
export async function promoteCampContactToAdmin(input: CampContactPromotionInput) {
  return promoteCampContactWithRole(input, 'admin')
}
