'use server'

import { createForm, saveFormFields } from '@/lib/actions/forms'
import type { ChurchForm } from '@/lib/types'
import { getFormTemplate, type FormTemplateId } from '@/lib/forms/templates'

export async function createFormFromTemplate(input: {
  templateId: FormTemplateId
  group_id: string
  group_name?: string
  title?: string
  description?: string
  category?: string
  created_by?: string
  publish?: boolean
}): Promise<{ data: ChurchForm | null; error: string | null }> {
  const template = getFormTemplate(input.templateId)
  const groupName = input.group_name?.trim()

  const { data: form, error: createError } = await createForm({
    title: input.title?.trim() || template.defaultTitle(groupName),
    description: input.description?.trim() || template.defaultDescription(groupName) || undefined,
    category: input.category?.trim() || template.category,
    group_id: input.group_id,
    created_by: input.created_by,
    enable_profile_lookup: template.enable_profile_lookup,
    capture_respondent_location: template.capture_respondent_location,
  })

  if (createError || !form) {
    return { data: null, error: createError ?? 'Failed to create form' }
  }

  if (template.fields.length > 0) {
    const { error: fieldsError } = await saveFormFields(form.id, template.fields)
    if (fieldsError) {
      return { data: form, error: fieldsError }
    }
  }

  if (input.publish) {
    const { updateForm } = await import('@/lib/actions/forms')
    const { data: published, error: publishError } = await updateForm(form.id, { status: 'published' })
    if (publishError || !published) {
      return { data: form, error: publishError ?? 'Form created but publish failed' }
    }
    return { data: published, error: null }
  }

  return { data: form, error: null }
}
