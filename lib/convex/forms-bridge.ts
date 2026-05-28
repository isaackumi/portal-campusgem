import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import type { ChurchForm, ChurchFormField, ChurchFormResponse } from '@/lib/types'

function requireConvexUrl(): string {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL
  if (!url) {
    throw new Error('NEXT_PUBLIC_CONVEX_URL is not set')
  }
  return url
}

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
    values: (doc.values as Record<string, unknown>) ?? {},
    submitted_at: iso(doc.submitted_at as number | undefined),
    updated_at: iso(doc.updated_at as number | undefined),
  }
}

export async function listFormsFromConvex(groupId?: string): Promise<ChurchForm[]> {
  const client = new ConvexHttpClient(requireConvexUrl())
  const args: { secret: string; group_id?: string } = { secret: requireCampAdminSecret() }
  if (groupId) args.group_id = groupId
  const rows = (await client.query(api.forms.listFormsWithSecret, args)) as Array<Record<string, unknown>>
  return rows.map((row) => mapForm(row)).filter((row): row is ChurchForm => row != null)
}

export async function getFormAdminFromConvex(formId: string): Promise<{
  form: ChurchForm
  fields: ChurchFormField[]
} | null> {
  const client = new ConvexHttpClient(requireConvexUrl())
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
  const client = new ConvexHttpClient(requireConvexUrl())
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
  const client = new ConvexHttpClient(requireConvexUrl())
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
}): Promise<ChurchForm> {
  const client = new ConvexHttpClient(requireConvexUrl())
  const doc = (await client.mutation(api.forms.createFormWithSecret, {
    secret: requireCampAdminSecret(),
    ...input,
  })) as Record<string, unknown>
  const form = mapForm(doc)
  if (!form) throw new Error('Failed to create form')
  return form
}

export async function updateFormInConvex(
  formId: string,
  patch: {
    title?: string
    description?: string
    category?: string
    group_id?: string | null
    status?: ChurchForm['status']
    slug?: string
    enable_profile_lookup?: boolean
  }
): Promise<ChurchForm> {
  const client = new ConvexHttpClient(requireConvexUrl())
  const doc = (await client.mutation(api.forms.updateFormWithSecret, {
    secret: requireCampAdminSecret(),
    form_id: formId as Id<'forms'>,
    ...patch,
  })) as Record<string, unknown>
  const form = mapForm(doc)
  if (!form) throw new Error('Failed to update form')
  return form
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
  const client = new ConvexHttpClient(requireConvexUrl())
  const rows = (await client.mutation(api.forms.replaceFormFieldsWithSecret, {
    secret: requireCampAdminSecret(),
    form_id: formId as Id<'forms'>,
    fields,
  })) as Array<Record<string, unknown>>
  return rows.map(mapField)
}

export async function submitFormResponseInConvex(input: {
  slug: string
  values: Record<string, unknown>
  respondent_name?: string
  respondent_phone?: string
  respondent_email?: string
}): Promise<ChurchFormResponse> {
  const client = new ConvexHttpClient(requireConvexUrl())
  const doc = (await client.mutation(api.forms.submitFormResponsePublic, input)) as Record<
    string,
    unknown
  >
  return mapResponse(doc)
}
