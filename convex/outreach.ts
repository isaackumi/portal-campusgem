import { v } from 'convex/values'
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server'
import type { Doc, Id } from './_generated/dataModel'
import { assertServerSecret } from './lib/serverSecret'
import { normalizeGhanaPhone } from './lib/phone'
import { groupFromString } from './lib/campusMembership'

/**
 * Campus outreach: students met on campus on Sundays, and their follow-up. Server-only
 * (`*WithSecret`), reached through lib/convex/outreach-bridge.ts. Who may do what is decided in
 * lib/actions/outreach.ts BEFORE these run; these only check that the ids belong together
 * (a contact always belongs to the campus it is asked about).
 */

const residence = v.union(v.literal('hall'), v.literal('non_resident'))
const yesNo = v.union(v.literal('yes'), v.literal('no'))
const status = v.union(
  v.literal('new'),
  v.literal('contacted'),
  v.literal('bible_study'),
  v.literal('joined'),
  v.literal('not_interested')
)

/** The answers on the form (already validated and normalised by the server action). */
const answers = {
  full_name: v.string(),
  phone: v.string(),
  whatsapp: v.optional(v.string()),
  student_id: v.optional(v.string()),
  level: v.optional(v.string()),
  programme: v.optional(v.string()),
  residence: v.optional(residence),
  hall: v.optional(v.string()),
  room: v.optional(v.string()),
  area: v.optional(v.string()),
  ministry_interests: v.optional(v.array(v.string())),
  ministry_other: v.optional(v.string()),
  bible_study: v.optional(yesNo),
  prayer_request: v.optional(v.string()),
}

const FILLABLE = [
  'whatsapp',
  'student_id',
  'level',
  'programme',
  'residence',
  'hall',
  'room',
  'area',
  'ministry_interests',
  'ministry_other',
  'bible_study',
  'prayer_request',
] as const

async function requireCampus(ctx: Pick<QueryCtx, 'db'>, campusId: string): Promise<Doc<'groups'>> {
  const group = await groupFromString(ctx, campusId)
  if (!group || group.group_type !== 'campus') throw new Error('Campus not found.')
  return group
}

async function contactOf(ctx: Pick<QueryCtx, 'db'>, campusId: string, contactId: string): Promise<Doc<'outreach_contacts'>> {
  const id = ctx.db.normalizeId('outreach_contacts', contactId)
  const doc = id ? await ctx.db.get(id) : null
  if (!doc || doc.campus_id !== campusId) throw new Error('That person is not on this campus’s outreach list.')
  return doc
}

async function addEvent(
  ctx: Pick<MutationCtx, 'db'>,
  contactId: Id<'outreach_contacts'>,
  event: Omit<Doc<'outreach_events'>, '_id' | '_creationTime' | 'contact_id' | 'at'> & { at?: number }
) {
  await ctx.db.insert('outreach_events', { contact_id: contactId, at: event.at ?? Date.now(), ...event })
}

function isEmpty(value: unknown): boolean {
  return value == null || value === '' || (Array.isArray(value) && value.length === 0)
}

/** Every contact on one campus, newest met first. */
export const listContactsWithSecret = query({
  args: { secret: v.string(), campus_id: v.string() },
  returns: v.any(),
  handler: async (ctx, { secret, campus_id }) => {
    assertServerSecret(secret)
    return await ctx.db
      .query('outreach_contacts')
      .withIndex('by_campus_met', (q) => q.eq('campus_id', campus_id))
      .order('desc')
      .collect()
  },
})

/** Contacts given to one person, on any campus (My GEM card). */
export const listAssignedWithSecret = query({
  args: { secret: v.string(), user_id: v.string() },
  returns: v.any(),
  handler: async (ctx, { secret, user_id }) => {
    assertServerSecret(secret)
    return await ctx.db
      .query('outreach_contacts')
      .withIndex('by_assigned', (q) => q.eq('assigned_to', user_id))
      .collect()
  },
})

/** One contact with its timeline (oldest first). */
export const getContactWithSecret = query({
  args: { secret: v.string(), campus_id: v.string(), contact_id: v.string() },
  returns: v.any(),
  handler: async (ctx, { secret, campus_id, contact_id }) => {
    assertServerSecret(secret)
    const contact = await contactOf(ctx, campus_id, contact_id)
    const events = await ctx.db
      .query('outreach_events')
      .withIndex('by_contact', (q) => q.eq('contact_id', contact._id))
      .collect()
    return { contact, events: events.sort((a, b) => a.at - b.at) }
  },
})

/**
 * A form came in (QR or a GEM member's phone). Same campus + phone as an existing contact:
 * only EMPTY fields are filled, `met_on` moves to the later date, and a "met again" event is
 * added. Otherwise a new contact. The caller never tells a QR visitor which happened.
 */
export const submitContactWithSecret = mutation({
  args: {
    secret: v.string(),
    campus_id: v.string(),
    ...answers,
    met_on: v.string(),
    met_by_user_id: v.optional(v.string()),
    met_by_name: v.optional(v.string()),
    source: v.union(v.literal('qr'), v.literal('member')),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    assertServerSecret(args.secret)
    const group = await requireCampus(ctx, args.campus_id)
    if (!group.is_active) throw new Error('This campus is not taking new contacts.')
    const phone = normalizeGhanaPhone(args.phone)
    if (!phone) throw new Error('Enter a valid Ghana mobile number.')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(args.met_on)) throw new Error('Invalid date.')
    const now = Date.now()
    const by = { by_user_id: args.met_by_user_id, by_name: args.met_by_name }
    const how = args.source === 'qr' ? 'Filled in the form from the QR code' : undefined

    const existing = await ctx.db
      .query('outreach_contacts')
      .withIndex('by_campus_phone', (q) => q.eq('campus_id', args.campus_id).eq('phone', phone))
      .first()

    if (existing) {
      const patch: Partial<Doc<'outreach_contacts'>> = { updated_at: now }
      for (const key of FILLABLE) {
        const incoming = args[key]
        if (!isEmpty(incoming) && isEmpty(existing[key])) (patch as Record<string, unknown>)[key] = incoming
      }
      if (args.met_on > existing.met_on) patch.met_on = args.met_on
      if (!existing.met_by_user_id && args.met_by_user_id) {
        patch.met_by_user_id = args.met_by_user_id
        patch.met_by_name = args.met_by_name
      }
      await ctx.db.patch(existing._id, patch)
      await addEvent(ctx, existing._id, { kind: 'met', note: how ? `Met again. ${how}.` : 'Met again.', ...by })
      return { id: String(existing._id), merged: true }
    }

    const id = await ctx.db.insert('outreach_contacts', {
      campus_id: args.campus_id,
      full_name: args.full_name,
      phone,
      whatsapp: args.whatsapp,
      student_id: args.student_id,
      level: args.level,
      programme: args.programme,
      residence: args.residence,
      hall: args.hall,
      room: args.room,
      area: args.area,
      ministry_interests: args.ministry_interests,
      ministry_other: args.ministry_other,
      bible_study: args.bible_study,
      prayer_request: args.prayer_request,
      met_on: args.met_on,
      met_by_user_id: args.met_by_user_id,
      met_by_name: args.met_by_name,
      source: args.source,
      status: 'new',
      attempts: 0,
      created_at: now,
      updated_at: now,
    })
    await addEvent(ctx, id, { kind: 'met', note: how ? `${how}.` : undefined, ...by })
    return { id: String(id), merged: false }
  },
})

const nullableString = v.optional(v.union(v.string(), v.null()))

/** Edit answers. `null` clears a field; a phone already used by another contact is refused. */
export const updateContactWithSecret = mutation({
  args: {
    secret: v.string(),
    campus_id: v.string(),
    contact_id: v.string(),
    full_name: v.optional(v.string()),
    phone: v.optional(v.string()),
    whatsapp: nullableString,
    student_id: nullableString,
    level: nullableString,
    programme: nullableString,
    residence: v.optional(v.union(residence, v.null())),
    hall: nullableString,
    room: nullableString,
    area: nullableString,
    ministry_interests: v.optional(v.union(v.array(v.string()), v.null())),
    ministry_other: nullableString,
    bible_study: v.optional(v.union(yesNo, v.null())),
    prayer_request: nullableString,
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    assertServerSecret(args.secret)
    const contact = await contactOf(ctx, args.campus_id, args.contact_id)
    const { secret: _s, campus_id: _c, contact_id: _id, ...fields } = args
    const patch: Record<string, unknown> = { updated_at: Date.now() }
    for (const [key, value] of Object.entries(fields)) {
      if (value === undefined) continue
      patch[key] = value === null ? undefined : value
    }
    if (typeof fields.phone === 'string') {
      const phone = normalizeGhanaPhone(fields.phone)
      if (!phone) throw new Error('Enter a valid Ghana mobile number.')
      if (phone !== contact.phone) {
        const other = await ctx.db
          .query('outreach_contacts')
          .withIndex('by_campus_phone', (q) => q.eq('campus_id', args.campus_id).eq('phone', phone))
          .first()
        if (other) throw new Error('Someone else on this campus’s list already has that number.')
      }
      patch.phone = phone
    }
    await ctx.db.patch(contact._id, patch as Partial<Doc<'outreach_contacts'>>)
    return await ctx.db.get(contact._id)
  },
})

/**
 * A call / WhatsApp outcome or a note. Calls and WhatsApps count as an attempt (counted here,
 * so two people recording at once both count). The new status is worked out by the caller.
 */
export const recordContactWithSecret = mutation({
  args: {
    secret: v.string(),
    campus_id: v.string(),
    contact_id: v.string(),
    kind: v.union(v.literal('call'), v.literal('whatsapp'), v.literal('note')),
    outcome: v.optional(v.string()),
    note: v.optional(v.string()),
    status: v.optional(status),
    bible_study: v.optional(v.literal('yes')),
    by_user_id: v.optional(v.string()),
    by_name: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    assertServerSecret(args.secret)
    const contact = await contactOf(ctx, args.campus_id, args.contact_id)
    const now = Date.now()
    const patch: Partial<Doc<'outreach_contacts'>> = { updated_at: now }
    if (args.kind !== 'note') {
      patch.attempts = (contact.attempts ?? 0) + 1
      patch.last_contact_at = now
      if (args.outcome) patch.last_outcome = args.outcome
    }
    if (args.status) patch.status = args.status
    if (args.bible_study) patch.bible_study = args.bible_study
    await ctx.db.patch(contact._id, patch)
    await addEvent(ctx, contact._id, {
      kind: args.kind,
      outcome: args.outcome,
      note: args.note,
      by_user_id: args.by_user_id,
      by_name: args.by_name,
      at: now,
    })
    return await ctx.db.get(contact._id)
  },
})

export const setStatusWithSecret = mutation({
  args: {
    secret: v.string(),
    campus_id: v.string(),
    contact_id: v.string(),
    status,
    note: v.optional(v.string()),
    user_id: v.optional(v.string()),
    by_user_id: v.optional(v.string()),
    by_name: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    assertServerSecret(args.secret)
    const contact = await contactOf(ctx, args.campus_id, args.contact_id)
    const patch: Partial<Doc<'outreach_contacts'>> = { status: args.status, updated_at: Date.now() }
    if (args.user_id) patch.user_id = args.user_id
    await ctx.db.patch(contact._id, patch)
    if (contact.status !== args.status || args.note) {
      await addEvent(ctx, contact._id, {
        kind: 'status',
        outcome: args.status,
        note: args.note,
        by_user_id: args.by_user_id,
        by_name: args.by_name,
      })
    }
    return await ctx.db.get(contact._id)
  },
})

/** Give contacts to people (`user_id` null takes them back). Contacts from another campus are refused. */
export const assignContactsWithSecret = mutation({
  args: {
    secret: v.string(),
    campus_id: v.string(),
    assignments: v.array(
      v.object({ contact_id: v.string(), user_id: v.union(v.string(), v.null()), name: v.union(v.string(), v.null()) })
    ),
    by_user_id: v.optional(v.string()),
    by_name: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    assertServerSecret(args.secret)
    if (args.assignments.length > 500) throw new Error('Assign at most 500 people at a time.')
    const now = Date.now()
    let changed = 0
    for (const a of args.assignments) {
      const contact = await contactOf(ctx, args.campus_id, a.contact_id)
      if ((contact.assigned_to ?? null) === a.user_id) continue
      await ctx.db.patch(contact._id, {
        assigned_to: a.user_id ?? undefined,
        assigned_name: a.user_id ? (a.name ?? undefined) : undefined,
        assigned_at: a.user_id ? now : undefined,
        updated_at: now,
      })
      await addEvent(ctx, contact._id, {
        kind: 'assign',
        note: a.user_id ? `Given to ${a.name ?? 'someone'}` : 'Taken back (nobody assigned)',
        by_user_id: args.by_user_id,
        by_name: args.by_name,
        at: now,
      })
      changed++
    }
    return { changed }
  },
})
