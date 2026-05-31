'use server'

import type { ApiResponse } from '@/lib/services/api-types'
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

function isConvexDataSource(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_CONVEX_URL)
}

function convexUnavailable(): string {
  return 'Convex data source is not configured.'
}

async function enrichVisitors(visitors: Visitor[]): Promise<Visitor[]> {
  const { fetchMemberFromConvex } = await import('@/lib/convex/core-bridge')
  const memberIds = new Set<string>()
  for (const v of visitors) {
    if (v.invited_by_member_ids) v.invited_by_member_ids.forEach((id) => memberIds.add(id))
    if (v.assigned_follow_up_member_id) memberIds.add(v.assigned_follow_up_member_id)
    if (v.converted_member_id) memberIds.add(v.converted_member_id)
  }

  const members = await Promise.all(Array.from(memberIds).map((id) => fetchMemberFromConvex(id)))
  const memberById = new Map(members.filter(Boolean).map((m) => [m!.id, m!]))

  return visitors.map((v) => ({
    ...v,
    invited_by_members: (v.invited_by_member_ids ?? [])
      .map((id) => memberById.get(id))
      .filter(Boolean) as Member[],
    invited_by: v.invited_by_member_id ? memberById.get(v.invited_by_member_id) : undefined,
    assigned_follow_up: v.assigned_follow_up_member_id
      ? memberById.get(v.assigned_follow_up_member_id)
      : undefined,
    converted_member: v.converted_member_id ? memberById.get(v.converted_member_id) : undefined,
  }))
}

async function enrichRlcMembers(members: Member[]): Promise<Member[]> {
  const { fetchUserFromConvex } = await import('@/lib/convex/core-bridge')
  const users = await Promise.all(members.map((m) => fetchUserFromConvex(m.user_id)))
  return members.map((m, i) => ({ ...m, user: users[i] ?? undefined }))
}

export async function loadRlcStatsAction(): Promise<ApiResponse<RlcStats>> {
  if (!isConvexDataSource()) {
    return { data: null, error: convexUnavailable(), loading: false }
  }
  try {
    const { getRlcStatsFromConvex } = await import('@/lib/convex/rlc-bridge')
    const data = await getRlcStatsFromConvex()
    return { data, error: null, loading: false }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to load RLC stats',
      loading: false,
    }
  }
}

export async function loadRlcVisitorsAction(filters?: {
  pipeline_status?: RlcPipelineStatus
  follow_up_status?: VisitorFollowUpStatus
  assigned_to?: string
  include_inactive?: boolean
}): Promise<ApiResponse<Visitor[]>> {
  if (!isConvexDataSource()) {
    return { data: null, error: convexUnavailable(), loading: false }
  }
  try {
    const { listRlcVisitorsFromConvex } = await import('@/lib/convex/rlc-bridge')
    const rows = await listRlcVisitorsFromConvex(filters)
    const data = await enrichVisitors(rows)
    return { data, error: null, loading: false }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to load RLC visitors',
      loading: false,
    }
  }
}

export async function loadRlcVisitorAction(id: string): Promise<ApiResponse<Visitor>> {
  if (!isConvexDataSource()) {
    return { data: null, error: convexUnavailable(), loading: false }
  }
  try {
    const { getRlcVisitorFromConvex } = await import('@/lib/convex/rlc-bridge')
    const visitor = await getRlcVisitorFromConvex(id)
    if (!visitor) return { data: null, error: 'Visitor not found', loading: false }
    const [enriched] = await enrichVisitors([visitor])
    return { data: enriched, error: null, loading: false }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to load visitor',
      loading: false,
    }
  }
}

export async function loadRlcInteractionsAction(visitorId: string): Promise<ApiResponse<RlcInteraction[]>> {
  if (!isConvexDataSource()) {
    return { data: null, error: convexUnavailable(), loading: false }
  }
  try {
    const { listRlcInteractionsFromConvex } = await import('@/lib/convex/rlc-bridge')
    const data = await listRlcInteractionsFromConvex(visitorId)
    return { data, error: null, loading: false }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to load interactions',
      loading: false,
    }
  }
}

export async function createRlcVisitorAction(
  form: CreateVisitorForm,
  performedBy: string
): Promise<ApiResponse<Visitor>> {
  if (!isConvexDataSource()) {
    return { data: null, error: convexUnavailable(), loading: false }
  }
  try {
    const { createRlcVisitorInConvex } = await import('@/lib/convex/rlc-bridge')
    const visitor = await createRlcVisitorInConvex(form, performedBy)
    const [enriched] = await enrichVisitors([visitor])
    return { data: enriched, error: null, loading: false }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to create visitor',
      loading: false,
    }
  }
}

export async function updateRlcVisitorAction(
  id: string,
  form: CreateVisitorForm,
  performedBy: string
): Promise<ApiResponse<Visitor>> {
  if (!isConvexDataSource()) {
    return { data: null, error: convexUnavailable(), loading: false }
  }
  try {
    const { updateRlcVisitorInConvex } = await import('@/lib/convex/rlc-bridge')
    const visitor = await updateRlcVisitorInConvex(id, form, performedBy)
    const [enriched] = await enrichVisitors([visitor])
    return { data: enriched, error: null, loading: false }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to update visitor',
      loading: false,
    }
  }
}

export async function deleteRlcVisitorAction(
  id: string,
  performedBy: string,
  hardDelete?: boolean
): Promise<ApiResponse<{ id: string; hard_delete: boolean }>> {
  if (!isConvexDataSource()) {
    return { data: null, error: convexUnavailable(), loading: false }
  }
  try {
    const { deleteRlcVisitorInConvex } = await import('@/lib/convex/rlc-bridge')
    const data = await deleteRlcVisitorInConvex(id, performedBy, hardDelete)
    return { data, error: null, loading: false }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to delete visitor',
      loading: false,
    }
  }
}

export async function addRlcInteractionAction(args: {
  visitorId: string
  performedBy: string
  interactionType: RlcInteraction['interaction_type']
  notes?: string
  followUpStatus?: VisitorFollowUpStatus
  pipelineStatus?: RlcPipelineStatus
}): Promise<ApiResponse<RlcInteraction>> {
  if (!isConvexDataSource()) {
    return { data: null, error: convexUnavailable(), loading: false }
  }
  try {
    const { addRlcInteractionInConvex } = await import('@/lib/convex/rlc-bridge')
    const data = await addRlcInteractionInConvex(args)
    return { data, error: null, loading: false }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to log interaction',
      loading: false,
    }
  }
}

export async function convertRlcVisitorAction(
  visitorId: string,
  form: ConvertRlcVisitorForm,
  performedBy: string
): Promise<ApiResponse<{ visitor: Visitor; member: Member }>> {
  if (!isConvexDataSource()) {
    return { data: null, error: convexUnavailable(), loading: false }
  }
  try {
    const { convertRlcVisitorInConvex } = await import('@/lib/convex/rlc-bridge')
    const result = await convertRlcVisitorInConvex(visitorId, form, performedBy)
    const [enrichedVisitor] = await enrichVisitors([result.visitor])
    const [enrichedMember] = await enrichRlcMembers([result.member])
    return {
      data: { visitor: enrichedVisitor, member: enrichedMember },
      error: null,
      loading: false,
    }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to convert visitor',
      loading: false,
    }
  }
}

export async function searchRlcImportAction(query: string): Promise<ApiResponse<RlcImportSearchResult[]>> {
  if (!isConvexDataSource()) {
    return { data: null, error: convexUnavailable(), loading: false }
  }
  try {
    const { searchRlcImportFromConvex } = await import('@/lib/convex/rlc-bridge')
    const data = await searchRlcImportFromConvex(query)
    return { data, error: null, loading: false }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Search failed',
      loading: false,
    }
  }
}

export async function addPersonToRlcAction(args: {
  performedBy: string
  userId?: string
  memberId?: string
  campRegistrationId?: string
  rlcRoles: string[]
  rlcMembershipType?: 'full_member' | 'associate' | 'visitor_converted'
}): Promise<ApiResponse<Member>> {
  if (!isConvexDataSource()) {
    return { data: null, error: convexUnavailable(), loading: false }
  }
  if (args.rlcRoles.length === 0) {
    return { data: null, error: 'Select at least one RLC role', loading: false }
  }
  try {
    const { addPersonToRlcInConvex } = await import('@/lib/convex/rlc-bridge')
    const member = await addPersonToRlcInConvex(args)
    const [enriched] = await enrichRlcMembers([member])
    return { data: enriched, error: null, loading: false }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to add to RLC',
      loading: false,
    }
  }
}

export async function importToRlcAction(args: {
  type: 'campus_member' | 'camp_registration'
  memberId?: string
  campRegistrationId?: string
  performedBy: string
  linkAsMember?: boolean
  rlcMembershipType?: 'full_member' | 'associate' | 'visitor_converted'
  rlcRoles?: string[]
}): Promise<ApiResponse<Visitor | Member>> {
  if (!isConvexDataSource()) {
    return { data: null, error: convexUnavailable(), loading: false }
  }
  try {
    const bridge = await import('@/lib/convex/rlc-bridge')

    if (args.type === 'campus_member' && args.memberId) {
      if (args.linkAsMember) {
        const member = await bridge.linkCampusMemberToRlcInConvex({
          memberId: args.memberId,
          performedBy: args.performedBy,
          rlcMembershipType: args.rlcMembershipType ?? 'full_member',
          rlcRoles: args.rlcRoles,
        })
        const [enriched] = await enrichRlcMembers([member])
        return { data: enriched, error: null, loading: false }
      }
      const visitor = await bridge.importCampusMemberToRlcInConvex({
        memberId: args.memberId,
        performedBy: args.performedBy,
      })
      const [enriched] = await enrichVisitors([visitor])
      return { data: enriched, error: null, loading: false }
    }

    if (args.type === 'camp_registration' && args.campRegistrationId) {
      const visitor = await bridge.importCampRegistrationToRlcInConvex({
        campRegistrationId: args.campRegistrationId,
        performedBy: args.performedBy,
      })
      const [enriched] = await enrichVisitors([visitor])
      return { data: enriched, error: null, loading: false }
    }

    return { data: null, error: 'Invalid import target', loading: false }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Import failed',
      loading: false,
    }
  }
}

export async function loadRlcMembersAction(): Promise<ApiResponse<Member[]>> {
  if (!isConvexDataSource()) {
    return { data: null, error: convexUnavailable(), loading: false }
  }
  try {
    const { listRlcMembersFromConvex } = await import('@/lib/convex/rlc-bridge')
    const rows = await listRlcMembersFromConvex()
    const data = await enrichRlcMembers(rows)
    return { data, error: null, loading: false }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to load RLC members',
      loading: false,
    }
  }
}

export async function loadRlcAttendanceAction(args?: {
  serviceDate?: string
}): Promise<ApiResponse<Attendance[]>> {
  if (!isConvexDataSource()) {
    return { data: null, error: convexUnavailable(), loading: false }
  }
  try {
    const { listRlcAttendanceFromConvex } = await import('@/lib/convex/rlc-bridge')
    const data = await listRlcAttendanceFromConvex(args)
    return { data, error: null, loading: false }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to load attendance',
      loading: false,
    }
  }
}

export async function recordRlcAttendanceAction(args: {
  memberId?: string
  visitorId?: string
  serviceDate: string
  serviceType?: Attendance['service_type']
  method?: Attendance['method']
  createdBy?: string
  notes?: string
}): Promise<ApiResponse<Attendance>> {
  if (!isConvexDataSource()) {
    return { data: null, error: convexUnavailable(), loading: false }
  }
  try {
    const { recordRlcAttendanceInConvex } = await import('@/lib/convex/rlc-bridge')
    const data = await recordRlcAttendanceInConvex({
      ...args,
      method: args.method ?? 'admin',
    })
    return { data, error: null, loading: false }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to record attendance',
      loading: false,
    }
  }
}
