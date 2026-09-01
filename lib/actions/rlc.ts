'use server'

import type { ApiResponse } from '@/lib/services/api-types'
import type {
  Attendance,
  ConvertRlcVisitorForm,
  CreateVisitorForm,
  Member,
  RlcImportSearchResult,
  RlcInteraction,
  RlcMembershipType,
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
  const { fetchMemberRefWithUserFromConvex } = await import('@/lib/convex/core-bridge')
  const memberIds = new Set<string>()
  for (const v of visitors) {
    if (v.invited_by_member_ids) v.invited_by_member_ids.forEach((id) => memberIds.add(id))
    if (v.invited_by_member_id) memberIds.add(v.invited_by_member_id)
    if (v.assigned_follow_up_member_id) memberIds.add(v.assigned_follow_up_member_id)
    if (v.converted_member_id) memberIds.add(v.converted_member_id)
  }

  const refIds = Array.from(memberIds)
  const resolved = await Promise.all(
    refIds.map(async (refId) => [refId, await fetchMemberRefWithUserFromConvex(refId)] as const)
  )
  const memberByRef = new Map(
    resolved.filter((entry): entry is [string, Member] => entry[1] != null).map(([refId, member]) => [refId, member])
  )

  return visitors.map((v) => ({
    ...v,
    invited_by_members: (v.invited_by_member_ids ?? [])
      .map((id) => memberByRef.get(id))
      .filter(Boolean) as Member[],
    invited_by: v.invited_by_member_id ? memberByRef.get(v.invited_by_member_id) : undefined,
    assigned_follow_up: v.assigned_follow_up_member_id
      ? memberByRef.get(v.assigned_follow_up_member_id)
      : undefined,
    converted_member: v.converted_member_id ? memberByRef.get(v.converted_member_id) : undefined,
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

export type BulkConvertVisitorsResult = {
  imported: number
  skipped: number
  failed: Array<{ visitor_id: string; name: string; error: string }>
}

export async function bulkConvertRlcVisitorsToMembersAction(args: {
  visitorIds: string[]
  performedBy: string
  rlcMembershipType?: RlcMembershipType
}): Promise<ApiResponse<BulkConvertVisitorsResult>> {
  if (!isConvexDataSource()) {
    return { data: null, error: convexUnavailable(), loading: false }
  }

  const uniqueIds = Array.from(new Set(args.visitorIds.filter(Boolean)))
  const result: BulkConvertVisitorsResult = { imported: 0, skipped: 0, failed: [] }
  if (uniqueIds.length === 0) {
    return { data: result, error: null, loading: false }
  }

  try {
    const { convertRlcVisitorInConvex, listRlcVisitorsFromConvex } = await import(
      '@/lib/convex/rlc-bridge'
    )
    const { visitorToConvertForm } = await import('@/lib/rlc/visitor-convert')
    const all = await listRlcVisitorsFromConvex({ include_inactive: true })
    const byId = new Map(all.map((row) => [row.id, row]))
    const membershipType = args.rlcMembershipType ?? 'full_member'

    for (const visitorId of uniqueIds) {
      const visitor = byId.get(visitorId)
      const name = visitor
        ? [visitor.first_name, visitor.last_name].filter(Boolean).join(' ') || 'Visitor'
        : 'Visitor'

      if (!visitor) {
        result.failed.push({ visitor_id: visitorId, name, error: 'Visitor not found' })
        continue
      }
      if (visitor.converted_to_member) {
        result.skipped += 1
        continue
      }

      try {
        await convertRlcVisitorInConvex(
          visitorId,
          visitorToConvertForm(visitor, membershipType),
          args.performedBy
        )
        result.imported += 1
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to convert visitor'
        if (/already converted/i.test(message)) result.skipped += 1
        else result.failed.push({ visitor_id: visitorId, name, error: message })
      }
    }

    return { data: result, error: null, loading: false }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Bulk import failed',
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

export async function preparePersonForRlcAction(args: {
  userId?: string
  memberId?: string
  fullName: string
  phone?: string
  email?: string
  campRegistrationId?: string
}): Promise<ApiResponse<{ userId: string; memberId: string }>> {
  if (!isConvexDataSource()) {
    return { data: null, error: convexUnavailable(), loading: false }
  }

  try {
    const {
      fetchMemberFromConvex,
      fetchMemberByUserIdFromConvex,
      insertMemberInConvex,
    } = await import('@/lib/convex/core-bridge')
    const { ensureDirectoryUserFromCampContact } = await import('@/lib/actions/ensure-camp-directory-user')

    let userId = args.userId?.trim()
    let memberId = args.memberId?.trim()

    if (memberId) {
      const member = await fetchMemberFromConvex(memberId)
      if (!member) {
        return { data: null, error: 'Member profile not found', loading: false }
      }
      userId = member.user_id
      memberId = member.id
    }

    if (userId && !memberId) {
      let member = await fetchMemberByUserIdFromConvex(userId)
      if (!member) {
        member = await insertMemberInConvex({ user_id: userId, status: 'active' })
      }
      memberId = member.id
    }

    if (!userId && !memberId) {
      const phone = args.phone?.trim()
      if (!phone) {
        return {
          data: null,
          error: 'Select a person with a phone number or an existing account.',
          loading: false,
        }
      }
      const ensured = await ensureDirectoryUserFromCampContact({
        full_name: args.fullName,
        phone,
        email: args.email,
        registrationId: args.campRegistrationId,
      })
      if (ensured.error || !ensured.data) {
        return { data: null, error: ensured.error ?? 'Could not prepare directory profile', loading: false }
      }
      userId = ensured.data.userId
      const member = await fetchMemberByUserIdFromConvex(userId)
      if (!member) {
        return { data: null, error: 'Member profile missing after setup', loading: false }
      }
      memberId = member.id
    }

    if (!userId || !memberId) {
      return { data: null, error: 'Could not resolve a member profile for RLC', loading: false }
    }

    return { data: { userId, memberId }, error: null, loading: false }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to prepare profile',
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
  userId?: string
  memberId?: string
  campRegistrationId?: string
  fullName?: string
  phone?: string
  email?: string
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
    const roles = args.rlcRoles?.length ? args.rlcRoles : ['member']

    if (args.linkAsMember) {
      let userId = args.userId
      let memberId = args.memberId

      if (args.type === 'campus_member' && !memberId && !userId) {
        return { data: null, error: 'Invalid import target', loading: false }
      }

      if (args.type === 'campus_member' && !memberId && userId) {
        const prepared = await preparePersonForRlcAction({
          userId,
          fullName: args.fullName ?? 'Member',
          phone: args.phone,
          email: args.email,
        })
        if (prepared.error || !prepared.data) {
          return { data: null, error: prepared.error ?? 'Could not prepare member profile', loading: false }
        }
        userId = prepared.data.userId
        memberId = prepared.data.memberId
      }

      const member = await bridge.addPersonToRlcInConvex({
        performedBy: args.performedBy,
        userId,
        memberId,
        campRegistrationId: args.type === 'camp_registration' ? args.campRegistrationId : undefined,
        rlcRoles: roles,
        rlcMembershipType: args.rlcMembershipType ?? 'full_member',
      })
      const [enriched] = await enrichRlcMembers([member])
      return { data: enriched, error: null, loading: false }
    }

    if (args.type === 'campus_member') {
      let memberId = args.memberId
      if (!memberId && args.userId) {
        const prepared = await preparePersonForRlcAction({
          userId: args.userId,
          fullName: args.fullName ?? 'Member',
          phone: args.phone,
          email: args.email,
        })
        if (prepared.error || !prepared.data) {
          return { data: null, error: prepared.error ?? 'Could not prepare member profile', loading: false }
        }
        memberId = prepared.data.memberId
      }
      if (!memberId) {
        return { data: null, error: 'Invalid import target', loading: false }
      }
      const visitor = await bridge.importCampusMemberToRlcInConvex({
        memberId,
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

export type BulkImportCampToRlcResult = {
  imported: number
  skipped: number
  failed: Array<{ camp_registration_id: string; full_name: string; error: string }>
}

export async function bulkImportCampToRlcAction(args: {
  campRegistrationIds: string[]
  performedBy: string
  linkAsMember?: boolean
  rlcMembershipType?: 'full_member' | 'associate' | 'visitor_converted'
}): Promise<ApiResponse<BulkImportCampToRlcResult>> {
  if (!isConvexDataSource()) {
    return { data: null, error: convexUnavailable(), loading: false }
  }

  const uniqueIds = Array.from(new Set(args.campRegistrationIds.filter(Boolean)))
  if (uniqueIds.length === 0) {
    return { data: { imported: 0, skipped: 0, failed: [] }, error: null, loading: false }
  }

  const result: BulkImportCampToRlcResult = {
    imported: 0,
    skipped: 0,
    failed: [],
  }

  const regNameById = new Map<string, string>()
  try {
    const { fetchAllCampYearsFromConvex, fetchRegistrationsFromConvex } = await import(
      '@/lib/convex/camp-bridge'
    )
    const campYears = await fetchAllCampYearsFromConvex()
    for (const year of campYears) {
      const regs = await fetchRegistrationsFromConvex(year.id)
      for (const reg of regs) {
        regNameById.set(reg.id, reg.full_name)
      }
    }
  } catch {
    // Optional name lookup for error rows.
  }

  for (const campRegistrationId of uniqueIds) {
    const fullName = regNameById.get(campRegistrationId) ?? 'Camper'
    const { data, error } = await importToRlcAction({
      type: 'camp_registration',
      campRegistrationId,
      fullName,
      performedBy: args.performedBy,
      linkAsMember: args.linkAsMember ?? false,
      rlcMembershipType: args.rlcMembershipType ?? 'full_member',
    })

    if (error) {
      if (/already|duplicate|exists/i.test(error)) {
        result.skipped += 1
      } else {
        result.failed.push({ camp_registration_id: campRegistrationId, full_name: fullName, error })
      }
      continue
    }

    if (data) result.imported += 1
    else result.skipped += 1
  }

  return { data: result, error: null, loading: false }
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

export async function loadRlcMemberAction(id: string): Promise<ApiResponse<Member>> {
  if (!isConvexDataSource()) {
    return { data: null, error: convexUnavailable(), loading: false }
  }
  try {
    const { getRlcMemberFromConvex } = await import('@/lib/convex/rlc-bridge')
    const member = await getRlcMemberFromConvex(id)
    if (!member) {
      return { data: null, error: 'Member not found', loading: false }
    }
    const [enriched] = await enrichRlcMembers([member])
    if (!enriched) {
      return { data: null, error: 'Member not found', loading: false }
    }
    return { data: enriched, error: null, loading: false }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to load member',
      loading: false,
    }
  }
}

export async function createRlcMemberAction(
  form: import('@/lib/types').CreateRlcMemberForm,
  performedBy: string
): Promise<ApiResponse<Member>> {
  if (!isConvexDataSource()) {
    return { data: null, error: convexUnavailable(), loading: false }
  }
  if (!form.first_name?.trim()) {
    return { data: null, error: 'First name is required', loading: false }
  }
  if (!form.phone?.trim()) {
    return { data: null, error: 'Phone number is required', loading: false }
  }
  try {
    const { createRlcMemberInConvex } = await import('@/lib/convex/rlc-bridge')
    const member = await createRlcMemberInConvex(
      {
        ...form,
        rlc_roles: form.rlc_roles?.length ? form.rlc_roles : ['member'],
        rlc_membership_type: form.rlc_membership_type ?? 'full_member',
      },
      performedBy
    )
    const [enriched] = await enrichRlcMembers([member])
    return { data: enriched ?? member, error: null, loading: false }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to add RLC member',
      loading: false,
    }
  }
}

export async function updateRlcMemberAction(args: {
  memberId: string
  performedBy: string
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
    const { updateRlcMemberInConvex } = await import('@/lib/convex/rlc-bridge')
    const member = await updateRlcMemberInConvex(args)
    const [enriched] = await enrichRlcMembers([member])
    return { data: enriched, error: null, loading: false }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to update member',
      loading: false,
    }
  }
}

export async function loadRlcAttendanceAction(args?: {
  serviceDate?: string
  fromDate?: string
  toDate?: string
  limit?: number
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
  customServiceId?: string
  method?: Attendance['method']
  createdBy?: string
  notes?: string
  status?: Attendance['status']
}): Promise<ApiResponse<{ already_checked_in: boolean; attendance: Attendance }>> {
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

export async function updateRlcAttendanceAction(args: {
  attendanceId: string
  notes?: string
  status?: Attendance['status']
}): Promise<ApiResponse<Attendance>> {
  if (!isConvexDataSource()) {
    return { data: null, error: convexUnavailable(), loading: false }
  }
  try {
    const { updateRlcAttendanceInConvex } = await import('@/lib/convex/rlc-bridge')
    const data = await updateRlcAttendanceInConvex(args)
    return { data, error: null, loading: false }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to update attendance',
      loading: false,
    }
  }
}

export async function deleteRlcAttendanceAction(
  attendanceId: string
): Promise<ApiResponse<{ deleted: boolean }>> {
  if (!isConvexDataSource()) {
    return { data: null, error: convexUnavailable(), loading: false }
  }
  try {
    const { deleteRlcAttendanceInConvex } = await import('@/lib/convex/rlc-bridge')
    const data = await deleteRlcAttendanceInConvex(attendanceId)
    return { data, error: null, loading: false }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to remove attendance',
      loading: false,
    }
  }
}

export async function resolveRlcScanAction(scanned: string): Promise<
  ApiResponse<{ type: 'visitor' | 'member'; visitor?: Visitor; member?: Member }>
> {
  if (!isConvexDataSource()) {
    return { data: null, error: convexUnavailable(), loading: false }
  }
  try {
    const { resolveRlcScanFromConvex } = await import('@/lib/convex/rlc-bridge')
    const data = await resolveRlcScanFromConvex(scanned)
    return { data, error: null, loading: false }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Scan lookup failed',
      loading: false,
    }
  }
}

export async function loadRlcCustomServicesAction(): Promise<
  ApiResponse<import('@/lib/types').RlcCustomService[]>
> {
  if (!isConvexDataSource()) {
    return { data: null, error: convexUnavailable(), loading: false }
  }
  try {
    const { listRlcCustomServicesFromConvex } = await import('@/lib/convex/rlc-bridge')
    const data = await listRlcCustomServicesFromConvex()
    return { data, error: null, loading: false }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to load custom services',
      loading: false,
    }
  }
}

export async function createRlcCustomServiceAction(args: {
  name: string
  createdBy?: string
}): Promise<ApiResponse<import('@/lib/types').RlcCustomService>> {
  if (!isConvexDataSource()) {
    return { data: null, error: convexUnavailable(), loading: false }
  }
  try {
    const { createRlcCustomServiceInConvex } = await import('@/lib/convex/rlc-bridge')
    const data = await createRlcCustomServiceInConvex(args)
    return { data, error: null, loading: false }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to save custom service',
      loading: false,
    }
  }
}

export async function searchRlcSponsorsAction(
  query: string
): Promise<ApiResponse<import('@/lib/types').RlcSponsorSearchResult[]>> {
  if (!isConvexDataSource()) {
    return { data: null, error: convexUnavailable(), loading: false }
  }
  const needle = query.trim()
  if (needle.length < 1) {
    return { data: [], error: null, loading: false }
  }

  try {
    const { loadMembersPage } = await import('@/lib/actions/core-data')
    const { searchRlcImportFromConvex } = await import('@/lib/convex/rlc-bridge')
    type RlcSponsorSearchResult = import('@/lib/types').RlcSponsorSearchResult

    const [membersPage, importRows] = await Promise.all([
      loadMembersPage(1, 15, needle),
      searchRlcImportFromConvex(needle),
    ])

    const results: RlcSponsorSearchResult[] = []
    const seenMemberIds = new Set<string>()

    for (const m of membersPage.data ?? []) {
      if (seenMemberIds.has(m.id)) continue
      seenMemberIds.add(m.id)
      results.push({
        key: `member:${m.id}`,
        member_id: m.id,
        user_id: m.user_id,
        full_name: m.user?.full_name?.trim() || 'Member',
        phone: m.user?.phone,
        email: m.user?.email,
        membership_id: m.user?.membership_id,
        source: 'member',
        badge: 'Member',
      })
    }

    for (const row of importRows) {
      if (row.member_id) {
        if (seenMemberIds.has(row.member_id)) continue
        seenMemberIds.add(row.member_id)
        results.push({
          key: `member:${row.member_id}`,
          member_id: row.member_id,
          user_id: row.user_id,
          full_name: row.full_name,
          phone: row.phone,
          email: row.email,
          membership_id: row.membership_id,
          source: 'campus_member',
          badge: 'Campus Gem',
        })
        continue
      }

      const campKey = row.camp_registration_id ? `camp:${row.camp_registration_id}` : row.user_id ? `user:${row.user_id}` : null
      if (!campKey) continue
      if (results.some((r) => r.key === campKey)) continue

      results.push({
        key: campKey,
        user_id: row.user_id,
        camp_registration_id: row.camp_registration_id,
        full_name: row.full_name,
        phone: row.phone,
        email: row.email,
        membership_id: row.membership_id,
        source: 'camp_registration',
        badge: 'Camp',
      })
    }

    return { data: results.slice(0, 20), error: null, loading: false }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Sponsor search failed',
      loading: false,
    }
  }
}

export async function resolveRlcSponsorToMemberAction(
  sponsor: import('@/lib/types').RlcSponsorSearchResult
): Promise<ApiResponse<{ memberId: string }>> {
  if (sponsor.member_id) {
    return { data: { memberId: sponsor.member_id }, error: null, loading: false }
  }
  const prepared = await preparePersonForRlcAction({
    userId: sponsor.user_id,
    fullName: sponsor.full_name,
    phone: sponsor.phone,
    email: sponsor.email,
    campRegistrationId: sponsor.camp_registration_id,
  })
  if (prepared.error || !prepared.data) {
    return { data: null, error: prepared.error ?? 'Could not link sponsor', loading: false }
  }
  return { data: { memberId: prepared.data.memberId }, error: null, loading: false }
}

export async function registerPublicRlcMemberAction(
  form: import('@/lib/types').CreateRlcMemberForm
): Promise<ApiResponse<{ id: string; first_name: string; check_in_code?: string }>> {
  const { PUBLIC_RLC_MEMBER_PERFORMED_BY } = await import('@/lib/constants/rlc')
  const result = await createRlcMemberAction(
    {
      ...form,
      rlc_roles: ['member'],
      rlc_membership_type: 'full_member',
    },
    PUBLIC_RLC_MEMBER_PERFORMED_BY
  )
  if (result.error || !result.data) {
    return { data: null, error: result.error ?? 'Registration failed', loading: false }
  }
  return {
    data: {
      id: result.data.id,
      first_name: form.first_name.trim(),
      check_in_code: result.data.check_in_code,
    },
    error: null,
    loading: false,
  }
}

export async function registerPublicRlcVisitorAction(
  form: CreateVisitorForm
): Promise<ApiResponse<{ id: string; first_name: string; check_in_code?: string }>> {
  if (!isConvexDataSource()) {
    return { data: null, error: convexUnavailable(), loading: false }
  }
  if (!form.first_name?.trim()) {
    return { data: null, error: 'First name is required', loading: false }
  }
  if (!form.visit_date) {
    return { data: null, error: 'Visit date is required', loading: false }
  }

  try {
    const { PUBLIC_RLC_PERFORMED_BY } = await import('@/lib/constants/rlc')
    const { createRlcVisitorInConvex } = await import('@/lib/convex/rlc-bridge')
    const visitor = await createRlcVisitorInConvex(
      {
        ...form,
        source: form.source ?? 'walk_in',
        pipeline_status: form.pipeline_status ?? 'first_visit',
        follow_up_status: form.follow_up_status ?? 'pending',
      },
      PUBLIC_RLC_PERFORMED_BY
    )
    return {
      data: { id: visitor.id, first_name: visitor.first_name, check_in_code: visitor.check_in_code },
      error: null,
      loading: false,
    }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Registration failed',
      loading: false,
    }
  }
}
