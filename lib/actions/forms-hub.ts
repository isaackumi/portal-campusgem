'use server'

import type { ChurchForm, Group } from '@/lib/types'

export type FormsHubData = {
  forms: ChurchForm[]
  groups: Group[]
  /** User id → display name for form creators */
  creatorsById: Record<string, string>
}

export async function getFormsHubData(groupId?: string): Promise<{
  data: FormsHubData | null
  error: string | null
}> {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return { data: null, error: 'Forms are not configured (missing NEXT_PUBLIC_CONVEX_URL)' }
  }
  try {
    const [{ listFormsFromConvex }, { fetchGroupsFromConvex }] = await Promise.all([
      import('@/lib/convex/forms-bridge'),
      import('@/lib/convex/core-bridge'),
    ])
    const [forms, groups, users] = await Promise.all([
      listFormsFromConvex(groupId || undefined),
      fetchGroupsFromConvex(true),
      import('@/lib/convex/core-bridge').then(({ fetchUsersFromConvex }) => fetchUsersFromConvex()),
    ])

    const creatorsById: Record<string, string> = {}
    for (const user of users) {
      creatorsById[user.id] = user.full_name?.trim() || user.phone?.trim() || user.email?.trim() || 'Unknown user'
    }

    return { data: { forms, groups, creatorsById }, error: null }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to load Forms Hub',
    }
  }
}
