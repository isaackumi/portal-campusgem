import { v } from 'convex/values'
import { query, mutation } from './_generated/server'
import type { MutationCtx } from './_generated/server'
import type { Id } from './_generated/dataModel'
import { assertServerSecret } from './lib/serverSecret'

const followUpStatus = v.union(
  v.literal('pending'),
  v.literal('in_progress'),
  v.literal('completed')
)

const pipelineStatus = v.union(
  v.literal('first_visit'),
  v.literal('follow_up'),
  v.literal('new_member'),
  v.literal('full_member'),
  v.literal('inactive')
)

const visitorSource = v.union(
  v.literal('walk_in'),
  v.literal('camp'),
  v.literal('campus_gem'),
  v.literal('corporate_gem'),
  v.literal('referral'),
  v.literal('other')
)

const congregation = v.union(v.literal('rlc'), v.literal('campus_gem'))

const gender = v.union(v.literal('male'), v.literal('female'), v.literal('other'))

const maritalStatus = v.union(
  v.literal('single'),
  v.literal('married'),
  v.literal('divorced'),
  v.literal('widowed'),
  v.literal('separated')
)

const interactionType = v.union(
  v.literal('call'),
  v.literal('visit'),
  v.literal('note'),
  v.literal('status_change'),
  v.literal('sms'),
  v.literal('email'),
  v.literal('conversion')
)

const serviceType = v.union(
  v.literal('sunday_service'),
  v.literal('midweek_service'),
  v.literal('prayer_meeting'),
  v.literal('youth_service'),
  v.literal('children_service'),
  v.literal('special_event')
)

function normalizeGhanaPhone(phone: string): string {
  const trimmed = phone.replace(/\s/g, '')
  if (trimmed.startsWith('+233')) return trimmed
  if (trimmed.startsWith('0')) return `+233${trimmed.slice(1)}`
  if (trimmed.startsWith('233')) return `+${trimmed}`
  return `+233${trimmed}`
}

function phoneLookupVariants(phone: string): string[] {
  const trimmed = phone.replace(/\s/g, '')
  const variants = new Set<string>([trimmed, normalizeGhanaPhone(trimmed)])
  const intl = normalizeGhanaPhone(trimmed)
  if (intl.startsWith('+233')) {
    variants.add(`0${intl.slice(4)}`)
    variants.add(intl.slice(1))
  }
  if (trimmed.startsWith('0')) {
    variants.add(`+233${trimmed.slice(1)}`)
  }
  return Array.from(variants)
}

function normalizeMembershipForLookup(raw: string): string {
  return raw.replace(/\W+/g, '').toUpperCase()
}

function mergeRlcRoles(existing: string[] | undefined, incoming: string[]): string[] {
  return Array.from(new Set([...(existing ?? []), ...incoming]))
}

function resolveRlcCongregation(current?: 'rlc' | 'campus_gem' | 'both'): 'rlc' | 'campus_gem' | 'both' {
  if (current === 'rlc' || current === 'both') return current
  if (current === 'campus_gem') return 'both'
  return 'rlc'
}

function inferRlcMembershipType(
  roles: string[],
  current?: 'full_member' | 'associate' | 'visitor_converted'
): 'full_member' | 'associate' | 'visitor_converted' {
  if (roles.includes('full_member')) return 'full_member'
  if (roles.includes('associate')) return 'associate'
  if (roles.includes('visitor')) return 'visitor_converted'
  return current ?? 'full_member'
}

function generateRlcMembershipId(phone?: string, joinYear?: number): string {
  const year = joinYear ?? new Date().getFullYear()
  let digits: string
  if (phone && phone.replace(/\D/g, '').length >= 4) {
    digits = phone.replace(/\D/g, '').slice(-4)
  } else {
    digits = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0')
  }
  return `RLC${digits}${year}`
}

async function logInteraction(
  ctx: MutationCtx,
  args: {
    visitor_id: string
    performed_by: string
    interaction_type: 'call' | 'visit' | 'note' | 'status_change' | 'sms' | 'email' | 'conversion'
    notes?: string
    metadata?: Record<string, unknown>
  }
) {
  await ctx.db.insert('rlc_interactions', {
    visitor_id: args.visitor_id,
    performed_by: args.performed_by,
    interaction_type: args.interaction_type,
    notes: args.notes,
    metadata: args.metadata,
    updated_at: Date.now(),
  })
}

const visitorInputFields = {
  first_name: v.string(),
  last_name: v.optional(v.string()),
  phone: v.optional(v.string()),
  email: v.optional(v.string()),
  address: v.optional(v.string()),
  visit_date: v.string(),
  service_attended: v.optional(v.string()),
  how_heard_about_church: v.optional(v.string()),
  invited_by_member_ids: v.optional(v.array(v.string())),
  assigned_follow_up_member_id: v.optional(v.string()),
  follow_up_notes: v.optional(v.string()),
  follow_up_date: v.optional(v.string()),
  follow_up_status: v.optional(followUpStatus),
  pipeline_status: v.optional(pipelineStatus),
  source: v.optional(visitorSource),
  source_user_id: v.optional(v.string()),
  source_camp_registration_id: v.optional(v.string()),
  gender: v.optional(gender),
  date_of_birth: v.optional(v.string()),
  occupation: v.optional(v.string()),
  marital_status: v.optional(maritalStatus),
}

export const listRlcVisitorsWithSecret = query({
  args: {
    secret: v.string(),
    pipeline_status: v.optional(pipelineStatus),
    follow_up_status: v.optional(followUpStatus),
    assigned_to: v.optional(v.string()),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    assertServerSecret(args.secret)
    let rows = await ctx.db
      .query('visitors')
      .withIndex('by_congregation', (q) => q.eq('congregation', 'rlc'))
      .order('desc')
      .collect()

    if (rows.length === 0) {
      const all = await ctx.db.query('visitors').order('desc').collect()
      rows = all.filter((v) => !v.congregation || v.congregation === 'rlc')
    }

    if (args.pipeline_status) {
      rows = rows.filter((v) => (v.pipeline_status ?? 'first_visit') === args.pipeline_status)
    }
    if (args.follow_up_status) {
      rows = rows.filter((v) => (v.follow_up_status ?? 'pending') === args.follow_up_status)
    }
    if (args.assigned_to) {
      rows = rows.filter((v) => v.assigned_follow_up_member_id === args.assigned_to)
    }

    return rows.filter((v) => v.is_active !== false)
  },
})

export const getRlcVisitorWithSecret = query({
  args: { secret: v.string(), id: v.string() },
  returns: v.any(),
  handler: async (ctx, { secret, id }) => {
    assertServerSecret(secret)
    return await ctx.db.get('visitors', id as Id<'visitors'>)
  },
})

export const listRlcInteractionsWithSecret = query({
  args: { secret: v.string(), visitor_id: v.string() },
  returns: v.array(v.any()),
  handler: async (ctx, { secret, visitor_id }) => {
    assertServerSecret(secret)
    return await ctx.db
      .query('rlc_interactions')
      .withIndex('by_visitor_id', (q) => q.eq('visitor_id', visitor_id))
      .order('desc')
      .collect()
  },
})

export const createRlcVisitorWithSecret = mutation({
  args: {
    secret: v.string(),
    performed_by: v.string(),
    ...visitorInputFields,
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    assertServerSecret(args.secret)
    const now = Date.now()
    const sponsorIds = args.invited_by_member_ids ?? []
    const id = await ctx.db.insert('visitors', {
      first_name: args.first_name.trim(),
      last_name: args.last_name?.trim(),
      phone: args.phone ? normalizeGhanaPhone(args.phone) : undefined,
      email: args.email?.trim() || undefined,
      address: args.address?.trim(),
      visit_date: args.visit_date,
      service_attended: args.service_attended,
      how_heard_about_church: args.how_heard_about_church,
      invited_by_member_id: sponsorIds[0],
      invited_by_member_ids: sponsorIds.length ? sponsorIds : undefined,
      assigned_follow_up_member_id: args.assigned_follow_up_member_id,
      follow_up_notes: args.follow_up_notes,
      follow_up_date: args.follow_up_date,
      follow_up_status: args.follow_up_status ?? 'pending',
      follow_up_completed: args.follow_up_status === 'completed',
      pipeline_status: args.pipeline_status ?? 'first_visit',
      source: args.source ?? 'walk_in',
      source_user_id: args.source_user_id,
      source_camp_registration_id: args.source_camp_registration_id,
      gender: args.gender,
      date_of_birth: args.date_of_birth,
      occupation: args.occupation,
      marital_status: args.marital_status,
      congregation: 'rlc',
      converted_to_member: false,
      is_active: true,
      updated_at: now,
    })

    await logInteraction(ctx, {
      visitor_id: String(id),
      performed_by: args.performed_by,
      interaction_type: 'note',
      notes: 'Visitor registered at RLC',
    })

    return await ctx.db.get('visitors', id)
  },
})

export const updateRlcVisitorWithSecret = mutation({
  args: {
    secret: v.string(),
    id: v.string(),
    performed_by: v.string(),
    ...visitorInputFields,
    follow_up_completed: v.optional(v.boolean()),
    pipeline_status: v.optional(pipelineStatus),
    is_active: v.optional(v.boolean()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    assertServerSecret(args.secret)
    const existing = await ctx.db.get('visitors', args.id as Id<'visitors'>)
    if (!existing) throw new Error('Visitor not found.')

    const sponsorIds = args.invited_by_member_ids
    const now = Date.now()
    const patch: Record<string, unknown> = {
      first_name: args.first_name.trim(),
      last_name: args.last_name?.trim(),
      phone: args.phone ? normalizeGhanaPhone(args.phone) : undefined,
      email: args.email?.trim() || undefined,
      address: args.address?.trim(),
      visit_date: args.visit_date,
      service_attended: args.service_attended,
      how_heard_about_church: args.how_heard_about_church,
      assigned_follow_up_member_id: args.assigned_follow_up_member_id,
      follow_up_notes: args.follow_up_notes,
      follow_up_date: args.follow_up_date,
      gender: args.gender,
      date_of_birth: args.date_of_birth,
      occupation: args.occupation,
      marital_status: args.marital_status,
      updated_at: now,
    }

    if (sponsorIds != null) {
      patch.invited_by_member_ids = sponsorIds
      patch.invited_by_member_id = sponsorIds[0]
    }
    if (args.follow_up_status != null) {
      patch.follow_up_status = args.follow_up_status
      patch.follow_up_completed = args.follow_up_status === 'completed'
    }
    if (args.pipeline_status != null) patch.pipeline_status = args.pipeline_status
    if (args.source != null) patch.source = args.source
    if (args.is_active != null) patch.is_active = args.is_active

    await ctx.db.patch('visitors', args.id as Id<'visitors'>, patch)

    await logInteraction(ctx, {
      visitor_id: args.id,
      performed_by: args.performed_by,
      interaction_type: 'status_change',
      notes: 'Visitor profile updated',
    })

    return await ctx.db.get('visitors', args.id as Id<'visitors'>)
  },
})

export const addRlcInteractionWithSecret = mutation({
  args: {
    secret: v.string(),
    visitor_id: v.string(),
    performed_by: v.string(),
    interaction_type: interactionType,
    notes: v.optional(v.string()),
    follow_up_status: v.optional(followUpStatus),
    pipeline_status: v.optional(pipelineStatus),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    assertServerSecret(args.secret)
    const visitor = await ctx.db.get('visitors', args.visitor_id as Id<'visitors'>)
    if (!visitor) throw new Error('Visitor not found.')

    const now = Date.now()
    const patch: Record<string, unknown> = { updated_at: now }
    if (args.follow_up_status != null) {
      patch.follow_up_status = args.follow_up_status
      patch.follow_up_completed = args.follow_up_status === 'completed'
    }
    if (args.pipeline_status != null) patch.pipeline_status = args.pipeline_status
    if (args.notes) {
      const prev = visitor.follow_up_notes ?? ''
      patch.follow_up_notes = prev ? `${prev}\n\n${args.notes}` : args.notes
    }

    await ctx.db.patch('visitors', args.visitor_id as Id<'visitors'>, patch)

    const interactionId = await ctx.db.insert('rlc_interactions', {
      visitor_id: args.visitor_id,
      performed_by: args.performed_by,
      interaction_type: args.interaction_type,
      notes: args.notes,
      updated_at: now,
    })

    return await ctx.db.get('rlc_interactions', interactionId)
  },
})

export const convertRlcVisitorToMemberWithSecret = mutation({
  args: {
    secret: v.string(),
    visitor_id: v.string(),
    performed_by: v.string(),
    membership_id: v.optional(v.string()),
    full_name: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    dob: v.optional(v.string()),
    gender: v.optional(gender),
    address: v.optional(v.string()),
    occupation: v.optional(v.string()),
    place_of_work: v.optional(v.string()),
    marital_status: v.optional(maritalStatus),
    spouse_name: v.optional(v.string()),
    emergency_contact_name: v.optional(v.string()),
    emergency_contact_phone: v.optional(v.string()),
    emergency_contact_relation: v.optional(v.string()),
    date_of_baptism: v.optional(v.string()),
    holy_ghost_baptism: v.optional(v.boolean()),
    date_of_holy_ghost_baptism: v.optional(v.string()),
    previous_church: v.optional(v.string()),
    reason_for_leaving: v.optional(v.string()),
    special_skills: v.optional(v.array(v.string())),
    interests: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
    rlc_membership_type: v.optional(
      v.union(v.literal('full_member'), v.literal('associate'), v.literal('visitor_converted'))
    ),
    link_existing_user_id: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    assertServerSecret(args.secret)
    const visitor = await ctx.db.get('visitors', args.visitor_id as Id<'visitors'>)
    if (!visitor) throw new Error('Visitor not found.')
    if (visitor.converted_to_member) throw new Error('Visitor already converted to member.')

    const now = Date.now()
    const today = new Date().toISOString().split('T')[0]
    const phone = normalizeGhanaPhone(args.phone ?? visitor.phone ?? '')
    const fullName =
      args.full_name?.trim() ||
      [visitor.first_name, visitor.last_name].filter(Boolean).join(' ').trim() ||
      'RLC Member'

    let userId: Id<'users'> | null = null

    if (args.link_existing_user_id) {
      userId = args.link_existing_user_id as Id<'users'>
      const existing = await ctx.db.get('users', userId)
      if (!existing) throw new Error('Linked user not found.')
    } else if (phone) {
      for (const candidate of phoneLookupVariants(phone)) {
        const byPhone = await ctx.db
          .query('users')
          .withIndex('by_phone', (q) => q.eq('phone', candidate))
          .first()
        if (byPhone) {
          userId = byPhone._id
          break
        }
      }
    }

    const membershipId =
      args.membership_id?.trim() ||
      (userId
        ? (await ctx.db.get('users', userId))?.membership_id
        : undefined) ||
      generateRlcMembershipId(phone)

    const userPayload = {
      full_name: fullName,
      first_name: visitor.first_name,
      last_name: visitor.last_name,
      phone: phone || undefined,
      email: args.email?.trim() || visitor.email,
      role: 'member' as const,
      membership_id: normalizeMembershipForLookup(membershipId),
      auth_uid: `rlc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      join_year: new Date().getFullYear(),
      occupation: args.occupation ?? visitor.occupation,
      place_of_work: args.place_of_work,
      marital_status: args.marital_status ?? visitor.marital_status,
      spouse_name: args.spouse_name,
      emergency_contact_name: args.emergency_contact_name,
      emergency_contact_phone: args.emergency_contact_phone,
      emergency_contact_relation: args.emergency_contact_relation,
      updated_at: now,
    }

    if (userId) {
      await ctx.db.patch('users', userId, userPayload)
    } else {
      userId = await ctx.db.insert('users', userPayload)
    }

    let member = await ctx.db
      .query('members')
      .withIndex('by_user_id', (q) => q.eq('user_id', String(userId)))
      .first()

    const memberPayload = {
      user_id: String(userId),
      dob: args.dob ?? visitor.date_of_birth,
      gender: args.gender ?? visitor.gender,
      address: args.address ?? visitor.address,
      emergency_contacts:
        args.emergency_contact_name && args.emergency_contact_phone
          ? [
              {
                name: args.emergency_contact_name,
                phone: args.emergency_contact_phone,
                relation: args.emergency_contact_relation ?? 'Emergency',
              },
            ]
          : [],
      documents: [],
      status: 'active' as const,
      notes: args.notes,
      date_of_baptism: args.date_of_baptism,
      holy_ghost_baptism: args.holy_ghost_baptism,
      date_of_holy_ghost_baptism: args.date_of_holy_ghost_baptism,
      previous_church: args.previous_church,
      reason_for_leaving: args.reason_for_leaving,
      special_skills: args.special_skills,
      interests: args.interests,
      is_visitor: false,
      visitor_since: visitor.visit_date,
      visitor_converted_to_member: true,
      congregation: 'rlc' as const,
      rlc_membership_type: args.rlc_membership_type ?? 'visitor_converted',
      source_visitor_id: args.visitor_id,
      updated_at: now,
    }

    if (member) {
      const existingCong = member.congregation
      await ctx.db.patch('members', member._id, {
        ...memberPayload,
        congregation:
          existingCong === 'campus_gem' ? 'both' : ('rlc' as const),
      })
      member = await ctx.db.get('members', member._id)
    } else {
      const memberId = await ctx.db.insert('members', memberPayload)
      member = await ctx.db.get('members', memberId)
    }

    if (!member) throw new Error('Failed to create member profile.')

    await ctx.db.patch('visitors', args.visitor_id as Id<'visitors'>, {
      converted_to_member: true,
      converted_member_id: String(member._id),
      converted_at: today,
      pipeline_status: args.rlc_membership_type === 'full_member' ? 'full_member' : 'new_member',
      follow_up_status: 'completed',
      follow_up_completed: true,
      is_active: false,
      updated_at: now,
    })

    await logInteraction(ctx, {
      visitor_id: args.visitor_id,
      performed_by: args.performed_by,
      interaction_type: 'conversion',
      notes: `Converted to RLC member (${args.rlc_membership_type ?? 'visitor_converted'})`,
      metadata: { member_id: String(member._id), user_id: String(userId) },
    })

    return {
      visitor: await ctx.db.get('visitors', args.visitor_id as Id<'visitors'>),
      member,
      user: await ctx.db.get('users', userId),
    }
  },
})

export const linkCampusMemberToRlcWithSecret = mutation({
  args: {
    secret: v.string(),
    member_id: v.string(),
    performed_by: v.string(),
    rlc_membership_type: v.optional(
      v.union(v.literal('full_member'), v.literal('associate'), v.literal('visitor_converted'))
    ),
    rlc_roles: v.optional(v.array(v.string())),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    assertServerSecret(args.secret)
    const member = await ctx.db.get('members', args.member_id as Id<'members'>)
    if (!member) throw new Error('Member not found.')

    const mergedRoles = mergeRlcRoles(member.rlc_roles, args.rlc_roles ?? ['member'])
    const congregation = resolveRlcCongregation(member.congregation)

    await ctx.db.patch('members', args.member_id as Id<'members'>, {
      congregation,
      rlc_membership_type:
        args.rlc_membership_type ?? inferRlcMembershipType(mergedRoles, member.rlc_membership_type),
      rlc_roles: mergedRoles,
      updated_at: Date.now(),
    })

    return await ctx.db.get('members', args.member_id as Id<'members'>)
  },
})

export const addPersonToRlcWithSecret = mutation({
  args: {
    secret: v.string(),
    performed_by: v.string(),
    user_id: v.optional(v.string()),
    member_id: v.optional(v.string()),
    camp_registration_id: v.optional(v.string()),
    rlc_roles: v.array(v.string()),
    rlc_membership_type: v.optional(
      v.union(v.literal('full_member'), v.literal('associate'), v.literal('visitor_converted'))
    ),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    assertServerSecret(args.secret)
    if (args.rlc_roles.length === 0) throw new Error('Select at least one RLC role.')

    const now = Date.now()
    let member = args.member_id
      ? await ctx.db.get('members', args.member_id as Id<'members'>)
      : null

    if (!member && args.user_id) {
      member = await ctx.db
        .query('members')
        .withIndex('by_user_id', (q) => q.eq('user_id', args.user_id!))
        .first()
    }

    let user = args.user_id ? await ctx.db.get('users', args.user_id as Id<'users'>) : null

    if (!member && !user && args.camp_registration_id) {
      const reg = await ctx.db.get(
        'camp_registrations',
        args.camp_registration_id as Id<'camp_registrations'>
      )
      if (!reg) throw new Error('Camp registration not found.')
      if (reg.phone) {
        for (const candidate of phoneLookupVariants(reg.phone)) {
          const byPhone = await ctx.db
            .query('users')
            .withIndex('by_phone', (q) => q.eq('phone', candidate))
            .first()
          if (byPhone) {
            user = byPhone
            break
          }
        }
      }
      if (!user) {
        const phone = reg.phone ? normalizeGhanaPhone(reg.phone) : undefined
        const userId = await ctx.db.insert('users', {
          full_name: reg.full_name,
          first_name: reg.first_name,
          last_name: reg.last_name,
          phone,
          email: reg.email,
          role: 'member',
          membership_id: generateRlcMembershipId(phone),
          auth_uid: `rlc-import-${Date.now()}`,
          join_year: new Date().getFullYear(),
          updated_at: now,
        })
        user = await ctx.db.get('users', userId)
      }
    }

    if (!member && user) {
      member = await ctx.db
        .query('members')
        .withIndex('by_user_id', (q) => q.eq('user_id', String(user!._id)))
        .first()
      if (!member) {
        const memberId = await ctx.db.insert('members', {
          user_id: String(user._id),
          emergency_contacts: [],
          documents: [],
          status: 'active',
          updated_at: now,
        })
        member = await ctx.db.get('members', memberId)
      }
    }

    if (!member) throw new Error('Could not resolve a member profile for RLC.')

    const mergedRoles = mergeRlcRoles(member.rlc_roles, args.rlc_roles)
    const congregation = resolveRlcCongregation(member.congregation)

    await ctx.db.patch('members', member._id, {
      congregation,
      rlc_roles: mergedRoles,
      rlc_membership_type:
        args.rlc_membership_type ?? inferRlcMembershipType(mergedRoles, member.rlc_membership_type),
      updated_at: now,
    })

    member = await ctx.db.get('members', member._id)
    if (!member) throw new Error('Member profile missing after RLC update.')

    if (mergedRoles.includes('visitor')) {
      const allVisitors = await ctx.db.query('visitors').collect()
      const userIdStr = user ? String(user._id) : member.user_id
      const hasActiveVisitor = allVisitors.some(
        (v) =>
          v.congregation === 'rlc' &&
          v.is_active &&
          !v.converted_to_member &&
          (v.source_user_id === userIdStr ||
            (user?.phone && v.phone && normalizeGhanaPhone(v.phone) === normalizeGhanaPhone(user.phone)))
      )

      if (!hasActiveVisitor && user) {
        const visitorId = await ctx.db.insert('visitors', {
          first_name: user.first_name ?? user.full_name.split(' ')[0] ?? user.full_name,
          last_name: user.last_name ?? (user.full_name.split(' ').slice(1).join(' ') || undefined),
          phone: user.phone,
          email: user.email,
          address: member.address,
          visit_date: new Date().toISOString().split('T')[0],
          service_attended: 'RLC Service',
          source: args.camp_registration_id ? 'camp' : 'campus_gem',
          source_user_id: String(user._id),
          source_camp_registration_id: args.camp_registration_id,
          follow_up_status: 'pending',
          follow_up_completed: false,
          pipeline_status: 'first_visit',
          gender: member.gender,
          date_of_birth: member.dob,
          occupation: user.occupation,
          marital_status: user.marital_status,
          congregation: 'rlc',
          converted_to_member: false,
          is_active: true,
          updated_at: now,
        })
        await logInteraction(ctx, {
          visitor_id: String(visitorId),
          performed_by: args.performed_by,
          interaction_type: 'note',
          notes: `Added to RLC with visitor role (${mergedRoles.join(', ')})`,
        })
      }
    }

    return member
  },
})

export const createRlcVisitorFromCampRegistrationWithSecret = mutation({
  args: {
    secret: v.string(),
    camp_registration_id: v.string(),
    performed_by: v.string(),
    visit_date: v.optional(v.string()),
    invited_by_member_ids: v.optional(v.array(v.string())),
    assigned_follow_up_member_id: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    assertServerSecret(args.secret)
    const reg = await ctx.db.get(
      'camp_registrations',
      args.camp_registration_id as Id<'camp_registrations'>
    )
    if (!reg) throw new Error('Camp registration not found.')

    const existing = await ctx.db.query('visitors').collect()
    const dup = existing.find(
      (v) => v.source_camp_registration_id === args.camp_registration_id && v.congregation === 'rlc'
    )
    if (dup) return dup

    const now = Date.now()
    const sponsorIds = args.invited_by_member_ids ?? []
    const id = await ctx.db.insert('visitors', {
      first_name: reg.first_name ?? reg.full_name.split(' ')[0] ?? reg.full_name,
      last_name: reg.last_name ?? (reg.full_name.split(' ').slice(1).join(' ') || undefined),
      phone: reg.phone ? normalizeGhanaPhone(reg.phone) : undefined,
      email: reg.email,
      address: reg.address_school_work ?? reg.residence,
      visit_date: args.visit_date ?? new Date().toISOString().split('T')[0],
      service_attended: 'Camp Meeting',
      how_heard_about_church: 'Camp Meeting',
      invited_by_member_id: sponsorIds[0],
      invited_by_member_ids: sponsorIds.length ? sponsorIds : undefined,
      assigned_follow_up_member_id: args.assigned_follow_up_member_id ?? reg.assigned_to,
      follow_up_status: 'pending',
      follow_up_completed: false,
      pipeline_status: 'first_visit',
      source: 'camp',
      source_user_id: reg.user_id,
      source_camp_registration_id: args.camp_registration_id,
      gender: reg.sex === 'Male' ? 'male' : reg.sex === 'Female' ? 'female' : undefined,
      date_of_birth: reg.date_of_birth,
      congregation: 'rlc',
      converted_to_member: false,
      is_active: true,
      updated_at: now,
    })

    await logInteraction(ctx, {
      visitor_id: String(id),
      performed_by: args.performed_by,
      interaction_type: 'note',
      notes: `Imported from camp registration (${reg.full_name})`,
    })

    return await ctx.db.get('visitors', id)
  },
})

export const createRlcVisitorFromCampusMemberWithSecret = mutation({
  args: {
    secret: v.string(),
    member_id: v.string(),
    performed_by: v.string(),
    visit_date: v.optional(v.string()),
    invited_by_member_ids: v.optional(v.array(v.string())),
    assigned_follow_up_member_id: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    assertServerSecret(args.secret)
    const member = await ctx.db.get('members', args.member_id as Id<'members'>)
    if (!member) throw new Error('Member not found.')
    const user = await ctx.db.get('users', member.user_id as Id<'users'>)
    if (!user) throw new Error('User profile not found for member.')

    const existing = await ctx.db.query('visitors').collect()
    const dup = existing.find(
      (v) => v.source_user_id === String(user._id) && v.congregation === 'rlc' && v.is_active
    )
    if (dup) return dup

    const now = Date.now()
    const sponsorIds = args.invited_by_member_ids ?? []
    const id = await ctx.db.insert('visitors', {
      first_name: user.first_name ?? user.full_name.split(' ')[0] ?? user.full_name,
      last_name: user.last_name ?? (user.full_name.split(' ').slice(1).join(' ') || undefined),
      phone: user.phone,
      email: user.email,
      address: member.address,
      visit_date: args.visit_date ?? new Date().toISOString().split('T')[0],
      service_attended: 'RLC Service',
      source: 'campus_gem',
      source_user_id: String(user._id),
      invited_by_member_id: sponsorIds[0],
      invited_by_member_ids: sponsorIds.length ? sponsorIds : undefined,
      assigned_follow_up_member_id: args.assigned_follow_up_member_id,
      follow_up_status: 'pending',
      follow_up_completed: false,
      pipeline_status: 'first_visit',
      gender: member.gender,
      date_of_birth: member.dob,
      occupation: user.occupation,
      marital_status: user.marital_status,
      congregation: 'rlc',
      converted_to_member: false,
      is_active: true,
      updated_at: now,
    })

    await logInteraction(ctx, {
      visitor_id: String(id),
      performed_by: args.performed_by,
      interaction_type: 'note',
      notes: `Imported from Campus Gem member (${user.full_name})`,
    })

    return await ctx.db.get('visitors', id)
  },
})

export const listRlcMembersWithSecret = query({
  args: { secret: v.string() },
  returns: v.array(v.any()),
  handler: async (ctx, { secret }) => {
    assertServerSecret(secret)
    const members = await ctx.db.query('members').order('desc').collect()
    return members.filter(
      (m) =>
        m.status === 'active' &&
        (m.congregation === 'rlc' ||
          m.congregation === 'both' ||
          m.source_visitor_id != null ||
          (m.rlc_roles != null && m.rlc_roles.length > 0))
    )
  },
})

export const getRlcStatsWithSecret = query({
  args: { secret: v.string() },
  returns: v.any(),
  handler: async (ctx, { secret }) => {
    assertServerSecret(secret)
    const allVisitors = await ctx.db.query('visitors').collect()
    const rlcVisitors = allVisitors.filter((v) => !v.congregation || v.congregation === 'rlc')

    const activeVisitors = rlcVisitors.filter((v) => v.is_active !== false && !v.converted_to_member)
    const converted = rlcVisitors.filter((v) => v.converted_to_member)
    const pendingFollowUp = activeVisitors.filter((v) => (v.follow_up_status ?? 'pending') === 'pending')
    const inProgressFollowUp = activeVisitors.filter(
      (v) => v.follow_up_status === 'in_progress'
    )

    const members = await ctx.db.query('members').collect()
    const rlcMembers = members.filter(
      (m) =>
        m.status === 'active' &&
        (m.congregation === 'rlc' || m.congregation === 'both' || m.source_visitor_id != null)
    )
    const fullMembers = rlcMembers.filter((m) => m.rlc_membership_type === 'full_member')
    const newMembers = rlcMembers.filter(
      (m) => m.rlc_membership_type === 'visitor_converted' || m.rlc_membership_type === 'associate'
    )

    const today = new Date().toISOString().split('T')[0]
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    const weekStartStr = weekStart.toISOString().split('T')[0]

    const attendance = await ctx.db.query('attendance').collect()
    const rlcAttendance = attendance.filter((a) => a.congregation === 'rlc' || !a.congregation)
    const todayAttendance = rlcAttendance.filter((a) => a.service_date === today).length
    const weekAttendance = rlcAttendance.filter((a) => (a.service_date ?? '') >= weekStartStr).length

    const pipelineCounts = {
      first_visit: activeVisitors.filter((v) => (v.pipeline_status ?? 'first_visit') === 'first_visit').length,
      follow_up: activeVisitors.filter((v) => v.pipeline_status === 'follow_up').length,
      new_member: converted.filter((v) => v.pipeline_status === 'new_member').length,
      full_member: converted.filter((v) => v.pipeline_status === 'full_member').length,
    }

    const sourceCounts: Record<string, number> = {}
    for (const v of rlcVisitors) {
      const src = v.source ?? 'walk_in'
      sourceCounts[src] = (sourceCounts[src] ?? 0) + 1
    }

    return {
      total_visitors: rlcVisitors.length,
      active_visitors: activeVisitors.length,
      converted_visitors: converted.length,
      conversion_rate:
        rlcVisitors.length > 0 ? Math.round((converted.length / rlcVisitors.length) * 100) : 0,
      pending_follow_up: pendingFollowUp.length,
      in_progress_follow_up: inProgressFollowUp.length,
      rlc_members: rlcMembers.length,
      full_members: fullMembers.length,
      new_members: newMembers.length,
      today_attendance: todayAttendance,
      week_attendance: weekAttendance,
      pipeline_counts: pipelineCounts,
      source_counts: sourceCounts,
    }
  },
})

export const listRlcAttendanceWithSecret = query({
  args: {
    secret: v.string(),
    service_date: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    assertServerSecret(args.secret)
    const lim = Math.min(Math.max(args.limit ?? 200, 1), 2000)

    if (args.service_date) {
      const rows = await ctx.db
        .query('attendance')
        .withIndex('by_congregation_and_date', (q) =>
          q.eq('congregation', 'rlc').eq('service_date', args.service_date!)
        )
        .collect()
      return rows.slice(0, lim)
    }

    const all = await ctx.db.query('attendance').order('desc').take(lim * 2)
    return all.filter((a) => a.congregation === 'rlc' || !a.congregation).slice(0, lim)
  },
})

export const recordRlcAttendanceWithSecret = mutation({
  args: {
    secret: v.string(),
    member_id: v.optional(v.string()),
    visitor_id: v.optional(v.string()),
    service_date: v.string(),
    service_type: v.optional(serviceType),
    check_in_time: v.string(),
    method: v.union(
      v.literal('qr'),
      v.literal('kiosk'),
      v.literal('admin'),
      v.literal('pin'),
      v.literal('mobile')
    ),
    created_by: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    assertServerSecret(args.secret)
    if (!args.member_id && !args.visitor_id) {
      throw new Error('Either member_id or visitor_id is required.')
    }

    const now = Date.now()
    const id = await ctx.db.insert('attendance', {
      member_id: args.member_id,
      visitor_id: args.visitor_id,
      congregation: 'rlc',
      service_date: args.service_date,
      service_type: args.service_type ?? 'sunday_service',
      check_in_time: args.check_in_time,
      method: args.method,
      metadata: {},
      created_by: args.created_by,
      checked_in_by: args.created_by,
      status: 'present',
      notes: args.notes,
      updated_at: now,
    })

    return await ctx.db.get('attendance', id)
  },
})

export const searchPeopleForRlcImportWithSecret = query({
  args: {
    secret: v.string(),
    query: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.any()),
  handler: async (ctx, { secret, query: q, limit = 20 }) => {
    assertServerSecret(secret)
    const needle = q.trim().toLowerCase()
    if (needle.length < 2) return []

    const users = await ctx.db.query('users').collect()
    const members = await ctx.db.query('members').collect()
    const memberByUserId = new Map(members.map((m) => [m.user_id, m]))

    const results: Array<Record<string, unknown>> = []

    for (const user of users) {
      const hay = [
        user.full_name,
        user.first_name,
        user.last_name,
        user.phone,
        user.email,
        user.membership_id,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      if (!hay.includes(needle)) continue

      const member = memberByUserId.get(String(user._id))
      results.push({
        type: 'campus_member',
        user_id: String(user._id),
        member_id: member ? String(member._id) : undefined,
        full_name: user.full_name,
        phone: user.phone,
        email: user.email,
        membership_id: user.membership_id,
        congregation: member?.congregation,
      })
      if (results.length >= limit) break
    }

    if (results.length < limit) {
      const campRegs = await ctx.db.query('camp_registrations').order('desc').take(500)
      for (const reg of campRegs) {
        const hay = [reg.full_name, reg.phone, reg.email].filter(Boolean).join(' ').toLowerCase()
        if (!hay.includes(needle)) continue
        results.push({
          type: 'camp_registration',
          camp_registration_id: String(reg._id),
          full_name: reg.full_name,
          phone: reg.phone,
          email: reg.email,
          camp_year_id: reg.camp_year_id,
        })
        if (results.length >= limit) break
      }
    }

    return results
  },
})
