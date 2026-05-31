import 'server-only'

import { getConvexHttpClient } from '@/lib/convex/http-client'
import { api } from '@/convex/_generated/api'
import { requireCoreServerSecret } from '@/lib/convex/core-bridge'
import type {
  Attendance,
  ConvertRlcVisitorForm,
  CreateVisitorForm,
  Member,
  RlcImportSearchResult,
  RlcInteraction,
  RlcStats,
  Visitor,
  VisitorFollowUpStatus,
  RlcPipelineStatus,
} from '@/lib/types'

function isoFromMs(t?: number): string {
  return t != null ? new Date(t).toISOString() : ''
}

export function convexRlcVisitorDocToVisitor(doc: Record<string, unknown> | null | undefined): Visitor | null {
  if (!doc || typeof doc !== 'object') return null
  const id = String(doc._id ?? '')
  if (!id) return null
  const ct = doc._creationTime as number | undefined
  const ut = doc.updated_at as number | undefined
  const created = isoFromMs(ct) || new Date().toISOString()
  const sponsorIds = Array.isArray(doc.invited_by_member_ids)
    ? (doc.invited_by_member_ids as string[])
    : doc.invited_by_member_id
      ? [String(doc.invited_by_member_id)]
      : undefined

  return {
    id,
    first_name: String(doc.first_name ?? ''),
    last_name: doc.last_name != null ? String(doc.last_name) : undefined,
    phone: doc.phone != null ? String(doc.phone) : undefined,
    email: doc.email != null ? String(doc.email) : undefined,
    address: doc.address != null ? String(doc.address) : undefined,
    visit_date: String(doc.visit_date ?? ''),
    service_attended: doc.service_attended != null ? String(doc.service_attended) : undefined,
    how_heard_about_church:
      doc.how_heard_about_church != null ? String(doc.how_heard_about_church) : undefined,
    invited_by_member_id: doc.invited_by_member_id != null ? String(doc.invited_by_member_id) : undefined,
    invited_by_member_ids: sponsorIds,
    assigned_follow_up_member_id:
      doc.assigned_follow_up_member_id != null ? String(doc.assigned_follow_up_member_id) : undefined,
    follow_up_notes: doc.follow_up_notes != null ? String(doc.follow_up_notes) : undefined,
    follow_up_date: doc.follow_up_date != null ? String(doc.follow_up_date) : undefined,
    follow_up_status: doc.follow_up_status as VisitorFollowUpStatus | undefined,
    follow_up_completed: Boolean(doc.follow_up_completed),
    pipeline_status: doc.pipeline_status as RlcPipelineStatus | undefined,
    source: doc.source as Visitor['source'],
    source_user_id: doc.source_user_id != null ? String(doc.source_user_id) : undefined,
    source_camp_registration_id:
      doc.source_camp_registration_id != null ? String(doc.source_camp_registration_id) : undefined,
    gender: doc.gender as Visitor['gender'],
    date_of_birth: doc.date_of_birth != null ? String(doc.date_of_birth) : undefined,
    occupation: doc.occupation != null ? String(doc.occupation) : undefined,
    marital_status: doc.marital_status as Visitor['marital_status'],
    congregation: doc.congregation as Visitor['congregation'],
    converted_to_member: Boolean(doc.converted_to_member),
    converted_member_id: doc.converted_member_id != null ? String(doc.converted_member_id) : undefined,
    converted_at: doc.converted_at != null ? String(doc.converted_at) : undefined,
    is_active: Boolean(doc.is_active ?? true),
    created_at: created,
    updated_at: isoFromMs(ut) || created,
  }
}

export function convexRlcInteractionDocToInteraction(
  doc: Record<string, unknown> | null | undefined
): RlcInteraction | null {
  if (!doc || typeof doc !== 'object') return null
  const id = String(doc._id ?? '')
  if (!id) return null
  const ct = doc._creationTime as number | undefined
  const ut = doc.updated_at as number | undefined
  const created = isoFromMs(ct) || new Date().toISOString()
  return {
    id,
    visitor_id: String(doc.visitor_id ?? ''),
    performed_by: String(doc.performed_by ?? ''),
    interaction_type: doc.interaction_type as RlcInteraction['interaction_type'],
    notes: doc.notes != null ? String(doc.notes) : undefined,
    metadata: doc.metadata as Record<string, unknown> | undefined,
    created_at: created,
    updated_at: isoFromMs(ut) || created,
  }
}

export async function listRlcVisitorsFromConvex(filters?: {
  pipeline_status?: RlcPipelineStatus
  follow_up_status?: VisitorFollowUpStatus
  assigned_to?: string
  include_inactive?: boolean
}): Promise<Visitor[]> {
  const client = getConvexHttpClient()
  const docs = (await client.query(api.rlc.listRlcVisitorsWithSecret, {
    secret: requireCoreServerSecret(),
    pipeline_status: filters?.pipeline_status,
    follow_up_status: filters?.follow_up_status,
    assigned_to: filters?.assigned_to,
    include_inactive: filters?.include_inactive,
  })) as Record<string, unknown>[]
  return docs.map((d) => convexRlcVisitorDocToVisitor(d)).filter((v): v is Visitor => v != null)
}

export async function getRlcVisitorFromConvex(id: string): Promise<Visitor | null> {
  const client = getConvexHttpClient()
  const doc = (await client.query(api.rlc.getRlcVisitorWithSecret, {
    secret: requireCoreServerSecret(),
    id,
  })) as Record<string, unknown> | null
  return convexRlcVisitorDocToVisitor(doc)
}

export async function listRlcInteractionsFromConvex(visitorId: string): Promise<RlcInteraction[]> {
  const client = getConvexHttpClient()
  const docs = (await client.query(api.rlc.listRlcInteractionsWithSecret, {
    secret: requireCoreServerSecret(),
    visitor_id: visitorId,
  })) as Record<string, unknown>[]
  return docs.map((d) => convexRlcInteractionDocToInteraction(d)).filter((i): i is RlcInteraction => i != null)
}

export async function createRlcVisitorInConvex(
  form: CreateVisitorForm,
  performedBy: string
): Promise<Visitor> {
  const client = getConvexHttpClient()
  const sponsorIds =
    form.invited_by_member_ids ??
    (form.invited_by_member_id ? [form.invited_by_member_id] : undefined)

  const doc = (await client.mutation(api.rlc.createRlcVisitorWithSecret, {
    secret: requireCoreServerSecret(),
    performed_by: performedBy,
    first_name: form.first_name,
    last_name: form.last_name,
    phone: form.phone,
    email: form.email,
    address: form.address,
    visit_date: form.visit_date,
    service_attended: form.service_attended,
    how_heard_about_church: form.how_heard_about_church,
    invited_by_member_ids: sponsorIds,
    assigned_follow_up_member_id: form.assigned_follow_up_member_id,
    follow_up_notes: form.follow_up_notes,
    follow_up_date: form.follow_up_date,
    follow_up_status: form.follow_up_status,
    pipeline_status: form.pipeline_status,
    source: form.source,
    gender: form.gender,
    date_of_birth: form.date_of_birth,
    occupation: form.occupation,
    marital_status: form.marital_status,
  })) as Record<string, unknown>

  const v = convexRlcVisitorDocToVisitor(doc)
  if (!v) throw new Error('Failed to create RLC visitor')
  return v
}

export async function updateRlcVisitorInConvex(
  id: string,
  form: CreateVisitorForm,
  performedBy: string
): Promise<Visitor> {
  const client = getConvexHttpClient()
  const sponsorIds =
    form.invited_by_member_ids ??
    (form.invited_by_member_id ? [form.invited_by_member_id] : undefined)

  const doc = (await client.mutation(api.rlc.updateRlcVisitorWithSecret, {
    secret: requireCoreServerSecret(),
    id,
    performed_by: performedBy,
    first_name: form.first_name,
    last_name: form.last_name,
    phone: form.phone,
    email: form.email,
    address: form.address,
    visit_date: form.visit_date,
    service_attended: form.service_attended,
    how_heard_about_church: form.how_heard_about_church,
    invited_by_member_ids: sponsorIds,
    assigned_follow_up_member_id: form.assigned_follow_up_member_id,
    follow_up_notes: form.follow_up_notes,
    follow_up_date: form.follow_up_date,
    follow_up_status: form.follow_up_status,
    pipeline_status: form.pipeline_status,
    source: form.source,
    gender: form.gender,
    date_of_birth: form.date_of_birth,
    occupation: form.occupation,
    marital_status: form.marital_status,
  })) as Record<string, unknown>

  const v = convexRlcVisitorDocToVisitor(doc)
  if (!v) throw new Error('Failed to update RLC visitor')
  return v
}

export async function deleteRlcVisitorInConvex(
  id: string,
  performedBy: string,
  hardDelete?: boolean
): Promise<{ id: string; hard_delete: boolean }> {
  const client = getConvexHttpClient()
  const result = (await client.mutation(api.rlc.deleteRlcVisitorWithSecret, {
    secret: requireCoreServerSecret(),
    id,
    performed_by: performedBy,
    hard_delete: hardDelete,
  })) as { id: string; hard_delete: boolean }
  return result
}

export async function addRlcInteractionInConvex(args: {
  visitorId: string
  performedBy: string
  interactionType: RlcInteraction['interaction_type']
  notes?: string
  followUpStatus?: VisitorFollowUpStatus
  pipelineStatus?: RlcPipelineStatus
}): Promise<RlcInteraction> {
  const client = getConvexHttpClient()
  const doc = (await client.mutation(api.rlc.addRlcInteractionWithSecret, {
    secret: requireCoreServerSecret(),
    visitor_id: args.visitorId,
    performed_by: args.performedBy,
    interaction_type: args.interactionType,
    notes: args.notes,
    follow_up_status: args.followUpStatus,
    pipeline_status: args.pipelineStatus,
  })) as Record<string, unknown>
  const i = convexRlcInteractionDocToInteraction(doc)
  if (!i) throw new Error('Failed to log interaction')
  return i
}

export async function convertRlcVisitorInConvex(
  visitorId: string,
  form: ConvertRlcVisitorForm,
  performedBy: string
): Promise<{ visitor: Visitor; member: Member }> {
  const client = getConvexHttpClient()
  const result = (await client.mutation(api.rlc.convertRlcVisitorToMemberWithSecret, {
    secret: requireCoreServerSecret(),
    visitor_id: visitorId,
    performed_by: performedBy,
    ...form,
  })) as { visitor: Record<string, unknown>; member: Record<string, unknown> }

  const visitor = convexRlcVisitorDocToVisitor(result.visitor)
  if (!visitor) throw new Error('Conversion failed')

  const { convexMemberDocToMember } = await import('@/lib/convex/core-bridge')
  const member = convexMemberDocToMember(result.member)
  if (!member) throw new Error('Member profile missing after conversion')

  return { visitor, member }
}

export function convexImportSearchDocToResult(
  doc: Record<string, unknown> | null | undefined
): RlcImportSearchResult | null {
  if (!doc || typeof doc !== 'object') return null
  const type = doc.type
  if (type !== 'campus_member' && type !== 'camp_registration') return null
  return {
    type,
    user_id: doc.user_id != null ? String(doc.user_id) : undefined,
    member_id: doc.member_id != null ? String(doc.member_id) : undefined,
    camp_registration_id:
      doc.camp_registration_id != null ? String(doc.camp_registration_id) : undefined,
    full_name: String(doc.full_name ?? ''),
    phone: doc.phone != null ? String(doc.phone) : undefined,
    email: doc.email != null ? String(doc.email) : undefined,
    membership_id: doc.membership_id != null ? String(doc.membership_id) : undefined,
    congregation: doc.congregation as RlcImportSearchResult['congregation'],
    camp_year_id: doc.camp_year_id != null ? String(doc.camp_year_id) : undefined,
  }
}

export async function getRlcStatsFromConvex(): Promise<RlcStats> {
  const client = getConvexHttpClient()
  return (await client.query(api.rlc.getRlcStatsWithSecret, {
    secret: requireCoreServerSecret(),
  })) as RlcStats
}

export async function searchRlcImportFromConvex(query: string): Promise<RlcImportSearchResult[]> {
  const client = getConvexHttpClient()
  const docs = (await client.query(api.rlc.searchPeopleForRlcImportWithSecret, {
    secret: requireCoreServerSecret(),
    query,
    limit: 25,
  })) as Record<string, unknown>[]
  return docs
    .map((d) => convexImportSearchDocToResult(d))
    .filter((r): r is RlcImportSearchResult => r != null)
}

export async function importCampRegistrationToRlcInConvex(args: {
  campRegistrationId: string
  performedBy: string
  visitDate?: string
  invitedByMemberIds?: string[]
  assignedFollowUpMemberId?: string
}): Promise<Visitor> {
  const client = getConvexHttpClient()
  const doc = (await client.mutation(api.rlc.createRlcVisitorFromCampRegistrationWithSecret, {
    secret: requireCoreServerSecret(),
    camp_registration_id: args.campRegistrationId,
    performed_by: args.performedBy,
    visit_date: args.visitDate,
    invited_by_member_ids: args.invitedByMemberIds,
    assigned_follow_up_member_id: args.assignedFollowUpMemberId,
  })) as Record<string, unknown>
  const v = convexRlcVisitorDocToVisitor(doc)
  if (!v) throw new Error('Failed to import camp registration')
  return v
}

export async function importCampusMemberToRlcInConvex(args: {
  memberId: string
  performedBy: string
  visitDate?: string
  invitedByMemberIds?: string[]
  assignedFollowUpMemberId?: string
}): Promise<Visitor> {
  const client = getConvexHttpClient()
  const doc = (await client.mutation(api.rlc.createRlcVisitorFromCampusMemberWithSecret, {
    secret: requireCoreServerSecret(),
    member_id: args.memberId,
    performed_by: args.performedBy,
    visit_date: args.visitDate,
    invited_by_member_ids: args.invitedByMemberIds,
    assigned_follow_up_member_id: args.assignedFollowUpMemberId,
  })) as Record<string, unknown>
  const v = convexRlcVisitorDocToVisitor(doc)
  if (!v) throw new Error('Failed to import campus member as visitor')
  return v
}

export async function linkCampusMemberToRlcInConvex(args: {
  memberId: string
  performedBy: string
  rlcMembershipType?: 'full_member' | 'associate' | 'visitor_converted'
  rlcRoles?: string[]
}): Promise<Member> {
  const client = getConvexHttpClient()
  const doc = (await client.mutation(api.rlc.linkCampusMemberToRlcWithSecret, {
    secret: requireCoreServerSecret(),
    member_id: args.memberId,
    performed_by: args.performedBy,
    rlc_membership_type: args.rlcMembershipType,
    rlc_roles: args.rlcRoles,
  })) as Record<string, unknown>
  const { convexMemberDocToMember } = await import('@/lib/convex/core-bridge')
  const member = convexMemberDocToMember(doc)
  if (!member) throw new Error('Failed to link member to RLC')
  return member
}

export async function addPersonToRlcInConvex(args: {
  performedBy: string
  userId?: string
  memberId?: string
  campRegistrationId?: string
  rlcRoles: string[]
  rlcMembershipType?: 'full_member' | 'associate' | 'visitor_converted'
}): Promise<Member> {
  const client = getConvexHttpClient()
  const doc = (await client.mutation(api.rlc.addPersonToRlcWithSecret, {
    secret: requireCoreServerSecret(),
    performed_by: args.performedBy,
    user_id: args.userId,
    member_id: args.memberId,
    camp_registration_id: args.campRegistrationId,
    rlc_roles: args.rlcRoles,
    rlc_membership_type: args.rlcMembershipType,
  })) as Record<string, unknown>
  const { convexMemberDocToMember } = await import('@/lib/convex/core-bridge')
  const member = convexMemberDocToMember(doc)
  if (!member) throw new Error('Failed to add person to RLC')
  return member
}

export async function listRlcMembersFromConvex(): Promise<Member[]> {
  const client = getConvexHttpClient()
  const docs = (await client.query(api.rlc.listRlcMembersWithSecret, {
    secret: requireCoreServerSecret(),
  })) as Record<string, unknown>[]
  const { convexMemberDocToMember } = await import('@/lib/convex/core-bridge')
  return docs.map((d) => convexMemberDocToMember(d)).filter((m): m is Member => m != null)
}

export async function recordRlcAttendanceInConvex(args: {
  memberId?: string
  visitorId?: string
  serviceDate: string
  serviceType?: Attendance['service_type']
  method: Attendance['method']
  createdBy?: string
  notes?: string
}): Promise<Attendance> {
  const client = getConvexHttpClient()
  const doc = (await client.mutation(api.rlc.recordRlcAttendanceWithSecret, {
    secret: requireCoreServerSecret(),
    member_id: args.memberId,
    visitor_id: args.visitorId,
    service_date: args.serviceDate,
    service_type: args.serviceType,
    check_in_time: new Date().toISOString(),
    method: args.method,
    created_by: args.createdBy,
    notes: args.notes,
  })) as Record<string, unknown>
  const { convexAttendanceDocToAttendance } = await import('@/lib/convex/core-bridge')
  const row = convexAttendanceDocToAttendance(doc)
  if (!row) throw new Error('Failed to record attendance')
  return row
}

export async function listRlcAttendanceFromConvex(args?: {
  serviceDate?: string
  limit?: number
}): Promise<Attendance[]> {
  const client = getConvexHttpClient()
  const docs = (await client.query(api.rlc.listRlcAttendanceWithSecret, {
    secret: requireCoreServerSecret(),
    service_date: args?.serviceDate,
    limit: args?.limit,
  })) as Record<string, unknown>[]
  const { convexAttendanceDocToAttendance } = await import('@/lib/convex/core-bridge')
  return docs.map((d) => convexAttendanceDocToAttendance(d)).filter((a): a is Attendance => a != null)
}
