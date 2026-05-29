'use server'

import type { ChurchForm, ChurchFormField, ChurchFormResponse } from '@/lib/types'

function requireConvexEnv(): void {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    throw new Error('NEXT_PUBLIC_CONVEX_URL is required for forms')
  }
}

export async function listForms(groupId?: string): Promise<{ data: ChurchForm[]; error: string | null }> {
  requireConvexEnv()
  try {
    const { listFormsFromConvex } = await import('@/lib/convex/forms-bridge')
    const data = await listFormsFromConvex(groupId)
    return { data, error: null }
  } catch (error: unknown) {
    return {
      data: [],
      error: error instanceof Error ? error.message : 'Failed to load forms',
    }
  }
}

export async function getFormAdmin(formId: string): Promise<{
  data: { form: ChurchForm; fields: ChurchFormField[]; creator_name?: string } | null
  error: string | null
}> {
  requireConvexEnv()
  try {
    const { getFormAdminFromConvex } = await import('@/lib/convex/forms-bridge')
    const data = await getFormAdminFromConvex(formId)
    if (!data) return { data: null, error: null }

    let creator_name: string | undefined
    if (data.form.created_by) {
      const { fetchUserFromConvex } = await import('@/lib/convex/core-bridge')
      const creator = await fetchUserFromConvex(data.form.created_by)
      creator_name =
        creator?.full_name?.trim() || creator?.phone?.trim() || creator?.email?.trim() || undefined
    }

    return { data: { ...data, creator_name }, error: null }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to load form',
    }
  }
}

export async function getPublishedFormBySlug(slug: string): Promise<{
  data: { form: ChurchForm; fields: ChurchFormField[]; group_name?: string } | null
  error: string | null
}> {
  requireConvexEnv()
  try {
    const { getPublishedFormBySlugFromConvex } = await import('@/lib/convex/forms-bridge')
    const data = await getPublishedFormBySlugFromConvex(slug)
    if (!data) return { data: null, error: null }

    let group_name: string | undefined
    if (data.form.group_id) {
      const { loadGroupById } = await import('@/lib/actions/core-data')
      const groupRes = await loadGroupById(data.form.group_id)
      group_name = groupRes.data?.name
    }

    return { data: { ...data, group_name }, error: null }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to load form',
    }
  }
}

export async function listFormResponses(formId: string): Promise<{
  data: ChurchFormResponse[]
  error: string | null
}> {
  requireConvexEnv()
  try {
    const { listFormResponsesFromConvex } = await import('@/lib/convex/forms-bridge')
    const data = await listFormResponsesFromConvex(formId)
    return { data, error: null }
  } catch (error: unknown) {
    return {
      data: [],
      error: error instanceof Error ? error.message : 'Failed to load responses',
    }
  }
}

export async function createForm(input: {
  title: string
  description?: string
  category?: string
  group_id?: string
  created_by?: string
  enable_profile_lookup?: boolean
  capture_respondent_location?: boolean
}): Promise<{ data: ChurchForm | null; error: string | null }> {
  requireConvexEnv()
  try {
    const { createFormInConvex } = await import('@/lib/convex/forms-bridge')
    const data = await createFormInConvex(input)
    return { data, error: null }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to create form',
    }
  }
}

export async function updateForm(
  formId: string,
  patch: {
    title?: string
    description?: string
    category?: string
    group_id?: string | null
    status?: ChurchForm['status']
    slug?: string
    enable_profile_lookup?: boolean
    capture_respondent_location?: boolean
    cover_image_url?: string | null
    accent_color?: string | null
  }
): Promise<{ data: ChurchForm | null; error: string | null }> {
  requireConvexEnv()
  try {
    const { updateFormInConvex } = await import('@/lib/convex/forms-bridge')
    const data = await updateFormInConvex(formId, patch)
    return { data, error: null }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to update form',
    }
  }
}

export async function saveFormFields(
  formId: string,
  fields: Array<{
    label: string
    description?: string
    field_type: ChurchFormField['field_type']
    required: boolean
    options?: string[]
    prefill_key?: string
    sort_order: number
  }>
): Promise<{ data: ChurchFormField[]; error: string | null }> {
  requireConvexEnv()
  try {
    const { replaceFormFieldsInConvex } = await import('@/lib/convex/forms-bridge')
    const data = await replaceFormFieldsInConvex(formId, fields)
    return { data, error: null }
  } catch (error: unknown) {
    return {
      data: [],
      error: error instanceof Error ? error.message : 'Failed to save form fields',
    }
  }
}

export async function submitFormResponse(input: {
  slug: string
  values: Record<string, unknown>
  respondent_name?: string
  respondent_phone?: string
  respondent_email?: string
  respondent_latitude?: number
  respondent_longitude?: number
  respondent_location_label?: string
}): Promise<{ data: ChurchFormResponse | null; error: string | null }> {
  requireConvexEnv()
  try {
    const { submitFormResponseInConvex } = await import('@/lib/convex/forms-bridge')
    const data = await submitFormResponseInConvex(input)
    return { data, error: null }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to submit form',
    }
  }
}
