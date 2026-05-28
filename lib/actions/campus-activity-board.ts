'use server'

import type { ChurchForm, Group } from '@/lib/types'

export type CampusActivityBoardGroup = Group & {
  memberCount: number
  leaderCount: number
  executiveCount: number
  formCount: number
  publishedFormCount: number
}

export type CampusActivityBoardData = {
  campuses: CampusActivityBoardGroup[]
  activities: CampusActivityBoardGroup[]
  totals: {
    campuses: number
    activities: number
    members: number
    forms: number
  }
}

function isConvexDataSource(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_CONVEX_URL && process.env.CAMP_CONVEX_SERVER_SECRET)
}

async function enrichGroup(
  group: Group,
  forms: ChurchForm[],
  listMemberships: (groupId: string) => Promise<Array<{ role: string; is_active: boolean }>>
): Promise<CampusActivityBoardGroup> {
  const memberships = await listMemberships(group.id)
  const active = memberships.filter((m) => m.is_active)
  const groupForms = forms.filter((f) => f.group_id === group.id)

  return {
    ...group,
    memberCount: active.length,
    leaderCount: active.filter((m) => m.role === 'leader' || m.role === 'co_leader').length,
    executiveCount: active.filter((m) => m.role === 'executive').length,
    formCount: groupForms.length,
    publishedFormCount: groupForms.filter((f) => f.status === 'published').length,
  }
}

export async function loadCampusActivityBoardAction(): Promise<{
  data: CampusActivityBoardData | null
  error: string | null
}> {
  if (!isConvexDataSource()) {
    return {
      data: null,
      error:
        'Convex is not configured. Set NEXT_PUBLIC_CONVEX_URL and CAMP_CONVEX_SERVER_SECRET in .env.local (and in your Convex deployment).',
    }
  }

  try {
    const { fetchGroupsFromConvex, listGroupMembershipsFromConvex } = await import('@/lib/convex/core-bridge')
    const { listFormsFromConvex } = await import('@/lib/convex/forms-bridge')

    const [groups, forms] = await Promise.all([fetchGroupsFromConvex(), listFormsFromConvex()])
    const scoped = groups.filter(
      (g) => g.is_active && (g.group_type === 'campus' || g.group_type === 'activity')
    )

    const enriched = await Promise.all(
      scoped.map(async (group) => {
        try {
          return await enrichGroup(group, forms, async (groupId) => {
            const rows = await listGroupMembershipsFromConvex(groupId)
            return rows.map((m) => ({ role: m.role, is_active: m.is_active }))
          })
        } catch {
          return {
            ...group,
            memberCount: 0,
            leaderCount: 0,
            executiveCount: 0,
            formCount: forms.filter((f) => f.group_id === group.id).length,
            publishedFormCount: forms.filter((f) => f.group_id === group.id && f.status === 'published')
              .length,
          }
        }
      })
    )

    const campuses = enriched
      .filter((g) => g.group_type === 'campus')
      .sort((a, b) => a.name.localeCompare(b.name))
    const activities = enriched
      .filter((g) => g.group_type === 'activity')
      .sort((a, b) => a.name.localeCompare(b.name))

    return {
      data: {
        campuses,
        activities,
        totals: {
          campuses: campuses.length,
          activities: activities.length,
          members: enriched.reduce((sum, g) => sum + g.memberCount, 0),
          forms: enriched.reduce((sum, g) => sum + g.formCount, 0),
        },
      },
      error: null,
    }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to load campus and activity board',
    }
  }
}
