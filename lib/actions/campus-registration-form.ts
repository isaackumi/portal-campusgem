'use server'

import type { ChurchForm } from '@/lib/types'
import {
  CAMPUS_MEMBER_REGISTRATION_CATEGORY,
  CAMPUS_MEMBER_REGISTRATION_FIELDS,
} from '@/lib/forms/campus-member-registration'
import { createForm, listForms, saveFormFields, updateForm } from '@/lib/actions/forms'

export async function ensureCampusMemberRegistrationForm(
  groupId: string,
  groupName: string
): Promise<{ data: ChurchForm | null; created: boolean; error: string | null }> {
  try {
    const { data: forms, error: listError } = await listForms(groupId)
    if (listError) return { data: null, created: false, error: listError }

    const existing = forms.find((form) => form.category === CAMPUS_MEMBER_REGISTRATION_CATEGORY)
    if (existing) {
      return { data: existing, created: false, error: null }
    }

    const { data: created, error: createError } = await createForm({
      title: `${groupName} — Member registration`,
      description: `Join ${groupName} at Campus Gem Ministries. Fill in your details below.`,
      category: CAMPUS_MEMBER_REGISTRATION_CATEGORY,
      group_id: groupId,
      enable_profile_lookup: true,
    })
    if (createError || !created) {
      return { data: null, created: false, error: createError ?? 'Failed to create registration form' }
    }

    const { error: fieldsError } = await saveFormFields(created.id, CAMPUS_MEMBER_REGISTRATION_FIELDS)
    if (fieldsError) {
      return { data: created, created: true, error: fieldsError }
    }

    return { data: created, created: true, error: null }
  } catch (error: unknown) {
    return {
      data: null,
      created: false,
      error: error instanceof Error ? error.message : 'Failed to set up registration form',
    }
  }
}

export async function publishCampusMemberRegistrationForm(
  formId: string
): Promise<{ data: ChurchForm | null; error: string | null }> {
  return updateForm(formId, { status: 'published' })
}
