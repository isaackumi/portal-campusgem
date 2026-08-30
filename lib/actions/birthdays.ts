'use server'

import type { ApiResponse } from '@/lib/services/api-types'
import {
  type BirthdayEntry,
  isCampusGemMember,
  isRlcMember,
  memberToBirthdayEntry,
  visitorToBirthdayEntry,
} from '@/lib/birthdays/upcoming-birthdays'

function isConvexDataSource(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_CONVEX_URL)
}

function convexUnavailable(): string {
  return 'Convex is not configured'
}

export async function loadCampusGemBirthdaysAction(): Promise<ApiResponse<BirthdayEntry[]>> {
  if (!isConvexDataSource()) {
    return { data: null, error: convexUnavailable(), loading: false }
  }
  try {
    const { fetchMembersFromConvex } = await import('@/lib/convex/core-bridge')
    const { attachUsersToMembers } = await import('@/lib/actions/core-data')
    const members = await fetchMembersFromConvex()
    const withUsers = await attachUsersToMembers(members)

    const entries = withUsers
      .filter(isCampusGemMember)
      .map((member) =>
        memberToBirthdayEntry(member, {
          href: member.user_id ? `/admin/users/${member.user_id}` : `/members/${member.id}`,
        })
      )
      .filter((entry): entry is BirthdayEntry => entry != null)

    return { data: entries, error: null, loading: false }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to load birthdays',
      loading: false,
    }
  }
}

export async function loadRlcBirthdaysAction(): Promise<ApiResponse<BirthdayEntry[]>> {
  if (!isConvexDataSource()) {
    return { data: null, error: convexUnavailable(), loading: false }
  }
  try {
    const [{ listRlcMembersFromConvex, listRlcVisitorsFromConvex }, { attachUsersToMembers }] =
      await Promise.all([
        import('@/lib/convex/rlc-bridge'),
        import('@/lib/actions/core-data'),
      ])

    const [members, visitors] = await Promise.all([
      listRlcMembersFromConvex(),
      listRlcVisitorsFromConvex({ include_inactive: false }),
    ])
    const withUsers = await attachUsersToMembers(members)

    const memberEntries = withUsers
      .filter(isRlcMember)
      .map((member) =>
        memberToBirthdayEntry(member, {
          href: `/admin/rlc/members/${member.id}/edit`,
        })
      )
      .filter((entry): entry is BirthdayEntry => entry != null)

    const visitorEntries = visitors
      .filter((visitor) => visitor.is_active !== false && !visitor.converted_to_member)
      .map((visitor) => visitorToBirthdayEntry(visitor))
      .filter((entry): entry is BirthdayEntry => entry != null)

    return { data: [...memberEntries, ...visitorEntries], error: null, loading: false }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to load RLC birthdays',
      loading: false,
    }
  }
}
