'use server'

import { createFormFromTemplate } from '@/lib/actions/form-templates'
import { createGroupAction } from '@/lib/actions/core-data'
import { listForms } from '@/lib/actions/forms'
import {
  CAMP_MEETING_REGISTRATION_CATEGORY,
  DEFAULT_EAGLES_CAMP_MEETING_GROUP_NAME,
  EAGLES_CAMP_MEETING_GROUP_TYPE,
} from '@/lib/constants/camp-meeting'
import type { ChurchForm, Group } from '@/lib/types'

export async function findEaglesCampMeetingGroups(): Promise<{
  data: Group[]
  error: string | null
}> {
  try {
    const { fetchGroupsFromConvex } = await import('@/lib/convex/core-bridge')
    const groups = await fetchGroupsFromConvex()
    const target = DEFAULT_EAGLES_CAMP_MEETING_GROUP_NAME.toLowerCase()
    return {
      data: groups.filter(
        (g) => g.is_active && g.name.trim().toLowerCase() === target
      ),
      error: null,
    }
  } catch (error: unknown) {
    return {
      data: [],
      error: error instanceof Error ? error.message : 'Failed to load Eagles camp meeting group',
    }
  }
}

export async function ensureEaglesCampMeetingGroup(): Promise<{
  data: Group | null
  created: boolean
  error: string | null
}> {
  const { data: existing, error: listError } = await findEaglesCampMeetingGroups()
  if (listError) return { data: null, created: false, error: listError }

  if (existing[0]) return { data: existing[0], created: false, error: null }

  const { data, error } = await createGroupAction({
    name: DEFAULT_EAGLES_CAMP_MEETING_GROUP_NAME,
    description: 'Eagles Camp / Camp Meeting — church-wide annual camp registration and activities.',
    group_type: EAGLES_CAMP_MEETING_GROUP_TYPE,
    is_active: true,
  })

  if (error || !data) {
    return { data: null, created: false, error: error ?? 'Failed to create Eagles camp meeting group' }
  }

  return { data, created: true, error: null }
}

export async function ensureCampMeetingRegistrationForm(): Promise<{
  data: ChurchForm | null
  created: boolean
  error: string | null
}> {
  try {
    const { data: group, error: groupError } = await ensureEaglesCampMeetingGroup()
    if (groupError || !group) {
      return { data: null, created: false, error: groupError ?? 'Eagles camp meeting group not available' }
    }

    const { data: forms, error: listError } = await listForms(group.id)
    if (listError) return { data: null, created: false, error: listError }

    const existing = forms.find((form) => form.category === CAMP_MEETING_REGISTRATION_CATEGORY)
    if (existing) return { data: existing, created: false, error: null }

    const { data, error } = await createFormFromTemplate({
      templateId: 'camp_meeting_registration',
      group_id: group.id,
      group_name: group.name,
      publish: false,
    })

    if (error || !data) {
      return { data: null, created: false, error: error ?? 'Failed to create camp meeting form' }
    }

    return { data, created: true, error: null }
  } catch (error: unknown) {
    return {
      data: null,
      created: false,
      error: error instanceof Error ? error.message : 'Failed to set up camp meeting form',
    }
  }
}
