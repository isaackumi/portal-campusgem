'use server'

import { createGroupAction } from '@/lib/actions/core-data'
import {
  DEFAULT_RLC_FORMS_GROUP_NAME,
  RLC_FORMS_GROUP_TYPE,
} from '@/lib/constants/forms'
import type { Group } from '@/lib/types'

export async function findRlcFormsGroups(): Promise<{
  data: Group[]
  error: string | null
}> {
  try {
    const { fetchGroupsFromConvex } = await import('@/lib/convex/core-bridge')
    const groups = await fetchGroupsFromConvex()
    const target = DEFAULT_RLC_FORMS_GROUP_NAME.toLowerCase()
    return {
      data: groups.filter(
        (g) =>
          g.is_active &&
          (g.group_type === RLC_FORMS_GROUP_TYPE || g.name.trim().toLowerCase() === target)
      ),
      error: null,
    }
  } catch (error: unknown) {
    return {
      data: [],
      error: error instanceof Error ? error.message : 'Failed to load RLC forms group',
    }
  }
}

export async function ensureRlcFormsGroup(): Promise<{
  data: Group | null
  created: boolean
  error: string | null
}> {
  const { data: existing, error: listError } = await findRlcFormsGroups()
  if (listError) return { data: null, created: false, error: listError }

  if (existing[0]) {
    const group = existing[0]
    if (group.group_type !== RLC_FORMS_GROUP_TYPE) {
      const { updateGroupAction } = await import('@/lib/actions/core-data')
      const { data: updated, error: updateError } = await updateGroupAction(group.id, {
        group_type: RLC_FORMS_GROUP_TYPE,
      })
      if (updateError || !updated) {
        return {
          data: null,
          created: false,
          error: updateError ?? 'Failed to update Redemption Light Chapel group type',
        }
      }
      return { data: updated, created: false, error: null }
    }
    return { data: group, created: false, error: null }
  }

  const { data, error } = await createGroupAction({
    name: DEFAULT_RLC_FORMS_GROUP_NAME,
    description: 'Redemption Light Chapel — dedicated forms for the mother church.',
    group_type: RLC_FORMS_GROUP_TYPE,
    is_active: true,
  })

  if (error || !data) {
    return { data: null, created: false, error: error ?? 'Failed to create RLC forms group' }
  }

  return { data, created: true, error: null }
}
