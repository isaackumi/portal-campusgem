import 'server-only'

import { getConvexHttpClient } from '@/lib/convex/http-client'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import type { ChurchForm, ChurchFormField, ChurchFormResponse } from '@/lib/types'

export function requireCampAdminSecret(): string {
  const secret = process.env.CAMP_CONVEX_SERVER_SECRET
  if (!secret) {
    throw new Error('CAMP_CONVEX_SERVER_SECRET is not set')
  }
  return secret
}

function iso(value?: number): string {
  return value != null ? new Date(value).toISOString() : new Date().toISOString()
}

function mapForm(doc: Record<string, unknown> | null | undefined): ChurchForm | null {
  if (!doc) return null
  const id = String(doc._id ?? '')
  if (!id) return null
  return {
    id,
    title: String(doc.title ?? ''),
    slug: String(doc.slug ?? ''),
    description: doc.description != null ? String(doc.description) : undefined,
    category: doc.category != null ? String(doc.category) : undefined,
    group_id: doc.group_id != null ? String(doc.group_id) : undefined,
    status: (doc.status as ChurchForm['status']) ?? 'draft',
    enable_profile_lookup: Boolean(doc.enable_profile_lookup),
    capture_respondent_location: Boolean(doc.capture_respondent_location),
    cover_image_url: doc.cover_image_url != null ? String(doc.cover_image_url) : undefined,
    accent_color: doc.accent_color != null ? String(doc.accent_color) : undefined,
    camp_year_id: doc.camp_year_id != null ? String(doc.camp_year_id) : undefined,
    display_mode:
      doc.display_mode === 'stepped' ? 'stepped' : doc.display_mode === 'classic' ? 'classic' : undefined,
    created_by: doc.created_by != null ? String(doc.created_by) : undefined,
    created_at: iso(doc._creationTime as number | undefined),
    updated_at: iso(doc.updated_at as number | undefined),
    response_count:
      doc.response_count != null ? Number(doc.response_count) : undefined,
  }
}

function mapField(doc: Record<string, unknown>): ChurchFormField {
  return {
    id: String(doc._id),
    form_id: String(doc.form_id),
    label: String(doc.label ?? ''),
    description: doc.description != null ? String(doc.description) : undefined,
    field_type: doc.field_type as ChurchFormField['field_type'],
    required: Boolean(doc.required),
    options: Array.isArray(doc.options) ? (doc.options as string[]) : undefined,
    prefill_key: doc.prefill_key != null ? String(doc.prefill_key) : undefined,
    sort_order: Number(doc.sort_order ?? 0),
    updated_at: iso(doc.updated_at as number | undefined),
  }
}

function mapResponse(doc: Record<string, unknown>): ChurchFormResponse {
  return {
    id: String(doc._id),
    form_id: String(doc.form_id),
    respondent_name: doc.respondent_name != null ? String(doc.respondent_name) : undefined,
    respondent_phone: doc.respondent_phone != null ? String(doc.respondent_phone) : undefined,
    respondent_email: doc.respondent_email != null ? String(doc.respondent_email) : undefined,
    respondent_latitude:
      doc.respondent_latitude != null ? Number(doc.respondent_latitude) : undefined,
    respondent_longitude:
      doc.respondent_longitude != null ? Number(doc.respondent_longitude) : undefined,
    respondent_location_label:
      doc.respondent_location_label != null ? String(doc.respondent_location_label) : undefined,
    values: (doc.values as Record<string, unknown>) ?? {},
    submitted_at: iso(doc.submitted_at as number | undefined),
    updated_at: iso(doc.updated_at as number | undefined),
  }
}

export async function listFormsFromConvex(groupId?: string): Promise<ChurchForm[]> {
  const client = getConvexHttpClient()
  const args: { secret: string; group_id?: string } = { secret: requireCampAdminSecret() }
  if (groupId) args.group_id = groupId
  const rows = (await client.query(api.forms.listFormsWithSecret, args)) as Array<Record<string, unknown>>
  return rows.map((row) => mapForm(row)).filter((row): row is ChurchForm => row != null)
}

export async function getFormAdminFromConvex(formId: string): Promise<{
  form: ChurchForm
  fields: ChurchFormField[]
} | null> {
  const client = getConvexHttpClient()
  const result = (await client.query(api.forms.getFormAdminWithSecret, {
    secret: requireCampAdminSecret(),
    form_id: formId as Id<'forms'>,
  })) as { form: Record<string, unknown>; fields: Array<Record<string, unknown>> } | null
  const form = mapForm(result?.form)
  if (!form) return null
  return {
    form,
    fields: (result?.fields ?? []).map(mapField),
  }
}

export async function getPublishedFormBySlugFromConvex(slug: string): Promise<{
  form: ChurchForm
  fields: ChurchFormField[]
} | null> {
  const client = getConvexHttpClient()
  const result = (await client.query(api.forms.getPublishedFormBySlug, { slug })) as {
    form: Record<string, unknown>
    fields: Array<Record<string, unknown>>
  } | null
  const form = mapForm(result?.form)
  if (!form) return null
  return {
    form,
    fields: (result?.fields ?? []).map(mapField),
  }
}

export async function listFormResponsesFromConvex(formId: string): Promise<ChurchFormResponse[]> {
  const client = getConvexHttpClient()
  const rows = (await client.query(api.forms.listFormResponsesWithSecret, {
    secret: requireCampAdminSecret(),
    form_id: formId as Id<'forms'>,
  })) as Array<Record<string, unknown>>
  return rows.map(mapResponse)
}

export async function createFormInConvex(input: {
  title: string
  description?: string
  category?: string
  group_id?: string
  created_by?: string
  enable_profile_lookup?: boolean
  capture_respondent_location?: boolean
  cover_image_url?: string
  accent_color?: string
  camp_year_id?: string
  display_mode?: 'classic' | 'stepped'
}): Promise<ChurchForm> {
  const client = getConvexHttpClient()
  const doc = (await client.mutation(api.forms.createFormWithSecret, {
    secret: requireCampAdminSecret(),
    ...input,
  })) as Record<string, unknown>
  const form = mapForm(doc)
  if (!form) throw new Error('Failed to create form')
  return form
}

type FormUpdatePatch = {
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
  camp_year_id?: string | null
  display_mode?: 'classic' | 'stepped'
}

function stripOptionalFormFields(patch: FormUpdatePatch): FormUpdatePatch {
  const {
    cover_image_url: _cover,
    accent_color: _accent,
    camp_year_id: _campYear,
    display_mode: _displayMode,
    ...rest
  } = patch
  return rest
}

function isLegacyFormFieldValidationError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return (
    message.includes('accent_color') ||
    message.includes('cover_image_url') ||
    message.includes('camp_year_id') ||
    message.includes('display_mode')
  )
}

export async function updateFormInConvex(formId: string, patch: FormUpdatePatch): Promise<ChurchForm> {
  const client = getConvexHttpClient()
  const base = {
    secret: requireCampAdminSecret(),
    form_id: formId as Id<'forms'>,
  }

  try {
    const doc = (await client.mutation(api.forms.updateFormWithSecret, {
      ...base,
      ...patch,
    })) as Record<string, unknown>
    const form = mapForm(doc)
    if (!form) throw new Error('Failed to update form')
    return form
  } catch (error: unknown) {
    if (!isLegacyFormFieldValidationError(error)) throw error

    const doc = (await client.mutation(api.forms.updateFormWithSecret, {
      ...base,
      ...stripOptionalFormFields(patch),
    })) as Record<string, unknown>
    const form = mapForm(doc)
    if (!form) throw new Error('Failed to update form')
    return form
  }
}

export async function replaceFormFieldsInConvex(
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
): Promise<ChurchFormField[]> {
  const client = getConvexHttpClient()
  const rows = (await client.mutation(api.forms.replaceFormFieldsWithSecret, {
    secret: requireCampAdminSecret(),
    form_id: formId as Id<'forms'>,
    fields,
  })) as Array<Record<string, unknown>>
  return rows.map(mapField)
}

export async function deleteFormInConvex(formId: string): Promise<void> {
  const client = getConvexHttpClient()
  await client.mutation(api.forms.deleteFormWithSecret, {
    secret: requireCampAdminSecret(),
    form_id: formId as Id<'forms'>,
  })
}

export async function submitFormResponseInConvex(input: {
  slug: string
  values: Record<string, unknown>
  respondent_name?: string
  respondent_phone?: string
  respondent_email?: string
  respondent_latitude?: number
  respondent_longitude?: number
  respondent_location_label?: string
}): Promise<ChurchFormResponse> {
  const client = getConvexHttpClient()
  const doc = (await client.mutation(api.forms.submitFormResponsePublic, input)) as Record<
    string,
    unknown
  >
  return mapResponse(doc)
}

export async function checkFormSubmissionByPhoneFromConvex(
  slug: string,
  phone: string
): Promise<{ already_submitted: boolean; submitted_at: number | null }> {
  const client = getConvexHttpClient()
  const result = (await client.query(api.forms.checkFormSubmissionByPhone, {
    slug,
    phone,
  })) as { already_submitted: boolean; submitted_at: number | null }
  return {
    already_submitted: Boolean(result.already_submitted),
    submitted_at: result.submitted_at ?? null,
  }
}
