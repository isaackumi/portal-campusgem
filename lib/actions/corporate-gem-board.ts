'use server'

import type { ChurchForm, Group } from '@/lib/types'
import { CORPORATE_GEM_GROUP_TYPE } from '@/lib/constants/corporate-gem'

export type CorporateGemBoardGroup = Group & {
  memberCount: number
  leaderCount: number
  executiveCount: number
  formCount: number
  publishedFormCount: number
}

export type CorporateGemBoardData = {
  groups: CorporateGemBoardGroup[]
  totals: {
    groups: number
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
): Promise<CorporateGemBoardGroup> {
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

export async function loadCorporateGemBoardAction(): Promise<{
  data: CorporateGemBoardData | null
  error: string | null
}> {
  if (!isConvexDataSource()) {
    return {
      data: null,
      error: 'Convex is not configured. Set NEXT_PUBLIC_CONVEX_URL and CAMP_CONVEX_SERVER_SECRET.',
    }
  }

  try {
    const { fetchGroupsFromConvex, listGroupMembershipsFromConvex } = await import('@/lib/convex/core-bridge')
    const { listFormsFromConvex } = await import('@/lib/convex/forms-bridge')

    const [groups, forms] = await Promise.all([fetchGroupsFromConvex(), listFormsFromConvex()])
    const scoped = groups.filter((g) => g.is_active && g.group_type === CORPORATE_GEM_GROUP_TYPE)

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
            formCount: 0,
            publishedFormCount: 0,
          }
        }
      })
    )

    return {
      data: {
        groups: enriched,
        totals: {
          groups: enriched.length,
          members: enriched.reduce((sum, g) => sum + g.memberCount, 0),
          forms: enriched.reduce((sum, g) => sum + g.formCount, 0),
        },
      },
      error: null,
    }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to load Corporate Gem board',
    }
  }
}
