'use server'

import { revalidatePath } from 'next/cache'
import { createUserRecord } from '@/lib/actions/core-data'

function requireConvexEnv(): void {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    throw new Error('NEXT_PUBLIC_CONVEX_URL is required')
  }
}

/**
 * Ensure a camp contact has a directory user (and member profile) so they can be added to groups.
 * Matches by phone when possible; links the registration when registrationId is provided.
 */
export async function ensureDirectoryUserFromCampContact(args: {
  full_name: string
  phone: string
  email?: string
  registrationId?: string
  existingUserId?: string
}): Promise<{
  data: { userId: string; created: boolean } | null
  error: string | null
}> {
  const fullName = args.full_name?.trim()
  const phone = args.phone?.trim()
  if (!fullName) {
    return { data: null, error: 'Name is required to create a directory profile.' }
  }
  if (!phone) {
    return { data: null, error: 'Phone is required to create a directory profile.' }
  }

  try {
    requireConvexEnv()
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Convex is not configured',
    }
  }

  try {
    const { findUserByPhoneFromConvex, fetchMemberByUserIdFromConvex, insertMemberInConvex } =
      await import('@/lib/convex/core-bridge')

    let userId = args.existingUserId?.trim() || ''
    let created = false

    if (userId) {
      const member = await fetchMemberByUserIdFromConvex(userId)
      if (!member) {
        await insertMemberInConvex({ user_id: userId, status: 'active' })
      }
    } else {
      const existing = await findUserByPhoneFromConvex(phone)
      if (existing) {
        userId = existing.id
      } else {
        const result = await createUserRecord({
          full_name: fullName,
          phone,
          email: args.email?.trim() || undefined,
          role: 'member',
        })
        if (result.error || !result.data) {
          return { data: null, error: result.error ?? 'Failed to create directory user' }
        }
        userId = result.data.id
        created = true
      }

      const member = await fetchMemberByUserIdFromConvex(userId)
      if (!member) {
        await insertMemberInConvex({ user_id: userId, status: 'active' })
      }
    }

    if (args.registrationId) {
      const { patchRegistrationInConvex } = await import('@/lib/convex/camp-bridge')
      await patchRegistrationInConvex(args.registrationId, { user_id: userId })
      revalidatePath('/admin/camp-meeting')
      revalidatePath('/dashboard')
      revalidatePath('/admin/camp-meeting/directory')
    }

    return { data: { userId, created }, error: null }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to prepare directory profile',
    }
  }
}
