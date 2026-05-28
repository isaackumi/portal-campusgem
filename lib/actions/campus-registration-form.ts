'use server'

import { createFormFromTemplate } from '@/lib/actions/form-templates'
import type { ChurchForm } from '@/lib/types'
import { CAMPUS_MEMBER_REGISTRATION_CATEGORY } from '@/lib/forms/campus-member-registration'
import { listForms } from '@/lib/actions/forms'

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

    const { data, error } = await createFormFromTemplate({
      templateId: 'campus_registration',
      group_id: groupId,
      group_name: groupName,
      publish: false,
    })

    if (error || !data) {
      return { data: null, created: false, error: error ?? 'Failed to create registration form' }
    }

    return { data, created: true, error: null }
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
  const { updateForm } = await import('@/lib/actions/forms')
  return updateForm(formId, { status: 'published' })
}
