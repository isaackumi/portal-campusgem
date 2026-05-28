import { v } from 'convex/values'
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server'
import type { Doc, Id } from './_generated/dataModel'
import { assertServerSecret } from './lib/serverSecret'
import { isValidGhanaPhone, normalizeGhanaPhone, sanitizePhoneInput } from './lib/phone'

const formFieldType = v.union(
  v.literal('short_text'),
  v.literal('long_text'),
  v.literal('email'),
  v.literal('phone'),
  v.literal('number'),
  v.literal('dropdown'),
  v.literal('radio'),
  v.literal('checkbox'),
  v.literal('date'),
  v.literal('file')
)

const formFieldInput = v.object({
  label: v.string(),
  description: v.optional(v.string()),
  field_type: formFieldType,
  required: v.boolean(),
  options: v.optional(v.array(v.string())),
  prefill_key: v.optional(v.string()),
  sort_order: v.number(),
})

function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
}

type FormsCtx = QueryCtx | MutationCtx

async function getFieldsForForm(ctx: FormsCtx, formId: string): Promise<Doc<'form_fields'>[]> {
  const fields = await ctx.db
    .query('form_fields')
    .withIndex('by_form', (q) => q.eq('form_id', formId))
    .collect()
  return fields.sort((a, b) => a.sort_order - b.sort_order)
}

export const listFormsWithSecret = query({
  args: { secret: v.string(), group_id: v.optional(v.string()) },
  returns: v.array(v.any()),
  handler: async (ctx, { secret, group_id }) => {
    assertServerSecret(secret)
    let forms = await ctx.db.query('forms').order('desc').collect()
    if (group_id) {
      forms = forms.filter((form) => form.group_id === group_id)
    }
    const counts = await Promise.all(
      forms.map(async (form) => {
        const responses = await ctx.db
          .query('form_responses')
          .withIndex('by_form', (q) => q.eq('form_id', String(form._id)))
          .collect()
        return responses.length
      })
    )
    return forms.map((form, index) => ({
      ...form,
      response_count: counts[index] ?? 0,
    }))
  },
})

export const getFormAdminWithSecret = query({
  args: { secret: v.string(), form_id: v.id('forms') },
  returns: v.any(),
  handler: async (ctx, { secret, form_id }) => {
    assertServerSecret(secret)
    const form = await ctx.db.get('forms', form_id)
    if (!form) return null
    const fields = await getFieldsForForm(ctx, String(form_id))
    return { form, fields }
  },
})

export const getPublishedFormBySlug = query({
  args: { slug: v.string() },
  returns: v.any(),
  handler: async (ctx, { slug }) => {
    const form = await ctx.db
      .query('forms')
      .withIndex('by_slug', (q) => q.eq('slug', slug))
      .first()
    if (!form || form.status !== 'published') return null
    const fields = await getFieldsForForm(ctx, String(form._id))
    return { form, fields }
  },
})

/** Public check: has this phone already submitted this published form? */
export const checkFormSubmissionByPhone = query({
  args: { slug: v.string(), phone: v.string() },
  returns: v.any(),
  handler: async (ctx, { slug, phone }) => {
    const form = await ctx.db
      .query('forms')
      .withIndex('by_slug', (q) => q.eq('slug', slug))
      .first()
    if (!form || form.status !== 'published') {
      return { already_submitted: false, submitted_at: null as number | null }
    }

    const sanitized = sanitizePhoneInput(phone)
    if (!sanitized || !isValidGhanaPhone(sanitized)) {
      return { already_submitted: false, submitted_at: null as number | null }
    }

    const normalized = normalizeGhanaPhone(sanitized)
    const existing = await ctx.db
      .query('form_responses')
      .withIndex('by_form_and_phone', (q) =>
        q.eq('form_id', String(form._id)).eq('respondent_phone', normalized)
      )
      .first()

    return {
      already_submitted: Boolean(existing),
      submitted_at: existing?.submitted_at ?? null,
    }
  },
})

export const listFormResponsesWithSecret = query({
  args: { secret: v.string(), form_id: v.id('forms') },
  returns: v.array(v.any()),
  handler: async (ctx, { secret, form_id }) => {
    assertServerSecret(secret)
    return await ctx.db
      .query('form_responses')
      .withIndex('by_form', (q) => q.eq('form_id', String(form_id)))
      .order('desc')
      .collect()
  },
})

export const createFormWithSecret = mutation({
  args: {
    secret: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    group_id: v.optional(v.string()),
    created_by: v.optional(v.string()),
    enable_profile_lookup: v.optional(v.boolean()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    assertServerSecret(args.secret)
    const title = args.title.trim()
    if (!title) throw new Error('Form title is required.')
    if (args.group_id) {
      const group = await ctx.db.get('groups', args.group_id as Id<'groups'>)
      if (!group) throw new Error('Selected group was not found.')
    }

    const baseSlug = slugifyTitle(title) || 'form'
    let slug = baseSlug
    let suffix = 1
    while (await ctx.db.query('forms').withIndex('by_slug', (q) => q.eq('slug', slug)).first()) {
      suffix += 1
      slug = `${baseSlug}-${suffix}`
    }

    const now = Date.now()
    const id = await ctx.db.insert('forms', {
      title,
      slug,
      description: args.description?.trim() || undefined,
      category: args.category?.trim() || 'general',
      group_id: args.group_id,
      status: 'draft',
      enable_profile_lookup: args.enable_profile_lookup ?? false,
      created_by: args.created_by,
      updated_at: now,
    })
    return await ctx.db.get('forms', id)
  },
})

export const updateFormWithSecret = mutation({
  args: {
    secret: v.string(),
    form_id: v.id('forms'),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    group_id: v.optional(v.union(v.string(), v.null())),
    status: v.optional(v.union(v.literal('draft'), v.literal('published'), v.literal('closed'))),
    slug: v.optional(v.string()),
    enable_profile_lookup: v.optional(v.boolean()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    assertServerSecret(args.secret)
    const form = await ctx.db.get('forms', args.form_id)
    if (!form) throw new Error('Form not found.')

    const patch: Record<string, unknown> = { updated_at: Date.now() }
    if (args.title != null) patch.title = args.title.trim()
    if (args.description != null) patch.description = args.description.trim() || undefined
    if (args.category != null) patch.category = args.category.trim() || 'general'
    if (args.group_id !== undefined) {
      if (args.group_id === null) {
        patch.group_id = undefined
      } else {
        const group = await ctx.db.get('groups', args.group_id as Id<'groups'>)
        if (!group) throw new Error('Selected group was not found.')
        patch.group_id = args.group_id
      }
    }
    if (args.status != null) patch.status = args.status
    if (args.enable_profile_lookup != null) patch.enable_profile_lookup = args.enable_profile_lookup

    if (args.slug != null) {
      const slug = slugifyTitle(args.slug)
      if (!slug) throw new Error('Form link slug is required.')
      const existing = await ctx.db.query('forms').withIndex('by_slug', (q) => q.eq('slug', slug)).first()
      if (existing && String(existing._id) !== String(args.form_id)) {
        throw new Error('That form link is already in use.')
      }
      patch.slug = slug
    }

    await ctx.db.patch('forms', args.form_id, patch)
    return await ctx.db.get('forms', args.form_id)
  },
})

export const replaceFormFieldsWithSecret = mutation({
  args: {
    secret: v.string(),
    form_id: v.id('forms'),
    fields: v.array(formFieldInput),
  },
  returns: v.array(v.any()),
  handler: async (ctx, { secret, form_id, fields }) => {
    assertServerSecret(secret)
    const form = await ctx.db.get('forms', form_id)
    if (!form) throw new Error('Form not found.')

    const existing = await ctx.db
      .query('form_fields')
      .withIndex('by_form', (q) => q.eq('form_id', String(form_id)))
      .collect()
    for (const field of existing) {
      await ctx.db.delete('form_fields', field._id)
    }

    const now = Date.now()
    const created = []
    for (const field of fields) {
      const id = await ctx.db.insert('form_fields', {
        form_id: String(form_id),
        label: field.label.trim(),
        description: field.description?.trim() || undefined,
        field_type: field.field_type,
        required: field.required,
        options: field.options?.map((option) => option.trim()).filter(Boolean),
        prefill_key: field.prefill_key?.trim() || undefined,
        sort_order: field.sort_order,
        updated_at: now,
      })
      created.push(await ctx.db.get('form_fields', id))
    }

    await ctx.db.patch('forms', form_id, { updated_at: now })
    return created
  },
})

export const submitFormResponsePublic = mutation({
  args: {
    slug: v.string(),
    values: v.any(),
    respondent_name: v.optional(v.string()),
    respondent_phone: v.optional(v.string()),
    respondent_email: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const form = await ctx.db
      .query('forms')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .first()
    if (!form || form.status !== 'published') {
      throw new Error('This form is not accepting responses.')
    }

    const fields = await getFieldsForForm(ctx, String(form._id))
    const values = (args.values ?? {}) as Record<string, unknown>
    const errors: string[] = []

    for (const field of fields) {
      const key = String(field._id)
      const value = values[key]
      const isEmpty =
        value == null ||
        value === '' ||
        (Array.isArray(value) && value.length === 0) ||
        (field.field_type === 'checkbox' && value !== true)

      if (field.required && isEmpty) {
        errors.push(`${field.label} is required`)
      }

      if (field.field_type === 'email' && value != null && String(value).trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(String(value).trim())) {
          errors.push(`${field.label} must be a valid email`)
        }
      }

      if (field.field_type === 'phone' && value != null && String(value).trim()) {
        if (!isValidGhanaPhone(String(value))) {
          errors.push(`${field.label} must be a valid Ghana phone number`)
        }
      }

      if (
        (field.field_type === 'dropdown' || field.field_type === 'radio') &&
        value != null &&
        String(value).trim()
      ) {
        const options = field.options ?? []
        if (options.length > 0 && !options.includes(String(value))) {
          errors.push(`${field.label} has an invalid option`)
        }
      }
    }

    if (errors.length > 0) {
      throw new Error(errors.join('; '))
    }

    const phoneField = fields.find((field) => field.field_type === 'phone')
    const emailField = fields.find((field) => field.field_type === 'email')
    const respondentPhone = sanitizePhoneInput(
      args.respondent_phone ??
        (phoneField ? values[String(phoneField._id)] : undefined) ??
        ''
    )
    const respondentEmail = String(
      args.respondent_email ??
        (emailField ? values[String(emailField._id)] : undefined) ??
        ''
    ).trim()

    if (respondentPhone) {
      const normalized = normalizeGhanaPhone(respondentPhone)
      const existing = await ctx.db
        .query('form_responses')
        .withIndex('by_form_and_phone', (q) =>
          q.eq('form_id', String(form._id)).eq('respondent_phone', normalized)
        )
        .first()
      if (existing) {
        const when = new Date(existing.submitted_at).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
        throw new Error(
          `This phone number already submitted this form on ${when}. Contact the church office if you need to update your answers.`
        )
      }
    }

    const now = Date.now()
    const id = await ctx.db.insert('form_responses', {
      form_id: String(form._id),
      respondent_name: args.respondent_name?.trim() || undefined,
      respondent_phone: respondentPhone ? normalizeGhanaPhone(respondentPhone) : undefined,
      respondent_email: respondentEmail || undefined,
      values,
      submitted_at: now,
      updated_at: now,
    })

    return await ctx.db.get('form_responses', id)
  },
})
