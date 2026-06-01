'use server'

import { createFormFromTemplate } from '@/lib/actions/form-templates'
import { createGroupAction } from '@/lib/actions/core-data'
import { listForms } from '@/lib/actions/forms'
import { getCampYearById } from '@/lib/actions/camp'
import {
  CAMP_MEETING_FEEDBACK_CATEGORY,
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

export async function findCampMeetingFormForYear(campYearId: string): Promise<{
  data: ChurchForm | null
  error: string | null
}> {
  try {
    const { listFormsFromConvex } = await import('@/lib/convex/forms-bridge')
    const forms = await listFormsFromConvex()
    const match = forms.find(
      (form) =>
        form.category === CAMP_MEETING_REGISTRATION_CATEGORY && form.camp_year_id === campYearId
    )
    return { data: match ?? null, error: null }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to look up camp meeting form',
    }
  }
}

export async function ensureCampMeetingRegistrationForm(campYearId: string): Promise<{
  data: ChurchForm | null
  created: boolean
  error: string | null
}> {
  if (!campYearId.trim()) {
    return { data: null, created: false, error: 'Select a camp year first.' }
  }

  try {
    const { data: campYear, error: yearError } = await getCampYearById(campYearId)
    if (yearError || !campYear) {
      return { data: null, created: false, error: yearError ?? 'Camp year not found.' }
    }

    const { data: existing, error: findError } = await findCampMeetingFormForYear(campYearId)
    if (findError) return { data: null, created: false, error: findError }
    if (existing) return { data: existing, created: false, error: null }

    const { data: group, error: groupError } = await ensureEaglesCampMeetingGroup()
    if (groupError || !group) {
      return { data: null, created: false, error: groupError ?? 'Eagles camp meeting group not available' }
    }

    const title = `Camp Meeting ${campYear.year} registration`
    const description = campYear.theme
      ? `Register for Eagles Camp Meeting ${campYear.year} — ${campYear.theme}.`
      : `Register for Eagles Camp Meeting ${campYear.year}.`

    const { data, error } = await createFormFromTemplate({
      templateId: 'camp_meeting_registration',
      group_id: group.id,
      group_name: group.name,
      camp_year_id: campYearId,
      title,
      description,
      publish: false,
    })

    if (error || !data) {
      return { data: null, created: false, error: error ?? 'Failed to create camp meeting form' }
    }

    if (campYear.flyer_image_url && !data.cover_image_url) {
      const { updateForm } = await import('@/lib/actions/forms')
      await updateForm(data.id, { cover_image_url: campYear.flyer_image_url })
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

export async function findCampMeetingFeedbackFormForYear(campYearId: string): Promise<{
  data: ChurchForm | null
  error: string | null
}> {
  try {
    const { listFormsFromConvex } = await import('@/lib/convex/forms-bridge')
    const forms = await listFormsFromConvex()
    const match = forms.find(
      (form) =>
        form.category === CAMP_MEETING_FEEDBACK_CATEGORY && form.camp_year_id === campYearId
    )
    return { data: match ?? null, error: null }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to look up camp review form',
    }
  }
}

export async function ensureCampMeetingFeedbackForm(campYearId: string): Promise<{
  data: ChurchForm | null
  created: boolean
  error: string | null
}> {
  if (!campYearId.trim()) {
    return { data: null, created: false, error: 'Select a camp year first.' }
  }

  try {
    const { data: campYear, error: yearError } = await getCampYearById(campYearId)
    if (yearError || !campYear) {
      return { data: null, created: false, error: yearError ?? 'Camp year not found.' }
    }

    const { data: existing, error: findError } = await findCampMeetingFeedbackFormForYear(campYearId)
    if (findError) return { data: null, created: false, error: findError }
    if (existing) return { data: existing, created: false, error: null }

    const { data: group, error: groupError } = await ensureEaglesCampMeetingGroup()
    if (groupError || !group) {
      return { data: null, created: false, error: groupError ?? 'Eagles camp meeting group not available' }
    }

    const title = `Camp Meeting ${campYear.year} review`
    const description = campYear.theme
      ? `Share your feedback about Eagles Camp Meeting ${campYear.year} — ${campYear.theme}.`
      : `Share your feedback about Eagles Camp Meeting ${campYear.year}.`

    const { data, error } = await createFormFromTemplate({
      templateId: 'camp_meeting_feedback',
      group_id: group.id,
      group_name: group.name,
      camp_year_id: campYearId,
      title,
      description,
      publish: false,
    })

    if (error || !data) {
      return { data: null, created: false, error: error ?? 'Failed to create camp review form' }
    }

    return { data, created: true, error: null }
  } catch (error: unknown) {
    return {
      data: null,
      created: false,
      error: error instanceof Error ? error.message : 'Failed to set up camp review form',
    }
  }
}
