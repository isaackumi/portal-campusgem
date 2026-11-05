'use server'

/**
 * Confirmation-call campaign for the active (or chosen) camp year.
 *
 * - Camp managers split registrants among callers and text callers their lists.
 * - Callers (`camp.calls`) see only the people assigned to them and record outcomes.
 */
import { revalidatePath } from 'next/cache'
import { guard } from '@/lib/auth/action-guard'
import { hasPermission } from '@/lib/auth/roles'
import { siteOrigin } from '@/lib/site-url'
import type { AppUser, CampAttendanceConfirmation, CampRegistration, CampYear } from '@/lib/types'
import {
  buildCallListSms,
  distributeEvenly,
  isCallOutcome,
  isOpenCall,
  progressByCaller,
} from '@/lib/camp/call-campaign'

export type CallBoardCaller = {
  id: string
  full_name: string
  phone?: string
  role: AppUser['role']
  /** Holds `camp.calls`, so they can open the call list in the app. */
  can_use_app: boolean
}

export type CallBoardData = {
  year: CampYear | null
  years: Array<Pick<CampYear, 'id' | 'year' | 'is_active'>>
  registrations: CampRegistration[]
  /** Everyone who can be given a call list (managers only; empty for callers). */
  people: CallBoardCaller[]
  me: { id: string; full_name: string }
  canManage: boolean
  canSms: boolean
}

function requireConvexEnv(): void {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    throw new Error('NEXT_PUBLIC_CONVEX_URL is required for camp data')
  }
}

function toCaller(user: AppUser): CallBoardCaller {
  return {
    id: user.id,
    full_name: user.full_name,
    phone: user.phone,
    role: user.role,
    can_use_app: hasPermission(user.role, 'camp.calls', user.permissions),
  }
}

function appOrigin(): string {
  return siteOrigin()
}

export async function getCallBoardAction(
  yearId?: string | null
): Promise<{ data: CallBoardData | null; error: string | null }> {
  try {
    const user = await guard('camp.calls')
    requireConvexEnv()
    if (!user) throw new Error('Sign in to open the call list.')
    const canManage = hasPermission(user.role, 'camp.manage', user.permissions)
    const canSms = hasPermission(user.role, 'sms.send', user.permissions)

    const bridge = await import('@/lib/convex/camp-bridge')
    const allYears = await bridge.fetchAllCampYearsFromConvex()
    const year = yearId
      ? await bridge.fetchCampYearByIdFromConvex(yearId)
      : (await bridge.fetchActiveCampYearFromConvex()) ??
        [...allYears].sort((a, b) => b.year - a.year)[0] ??
        null

    let registrations = year ? await bridge.fetchRegistrationsFromConvex(year.id) : []
    if (!canManage) {
      // Callers only get what they need to make the call, not health or guardian details.
      registrations = registrations
        .filter((r) => r.assigned_to === user.id)
        .map((r) => ({
          id: r.id,
          camp_year_id: r.camp_year_id,
          full_name: r.full_name,
          first_name: r.first_name,
          last_name: r.last_name,
          email: '',
          phone: r.phone,
          whatsapp: r.whatsapp,
          residence: r.residence,
          sex: r.sex,
          role: r.role,
          is_new_registrant: r.is_new_registrant,
          status: r.status,
          assigned_to: r.assigned_to,
          attendance_confirmation: r.attendance_confirmation,
          confirmation_note: r.confirmation_note,
          call_attempts: r.call_attempts,
          last_called_at: r.last_called_at,
          qr_code: '',
          created_at: r.created_at,
          updated_at: r.updated_at,
        }))
    }

    let people: CallBoardCaller[] = []
    if (canManage) {
      const { fetchUsersFromConvex } = await import('@/lib/convex/core-bridge')
      const users = await fetchUsersFromConvex()
      people = users
        .filter((u) => u.role !== 'visitor')
        .map(toCaller)
        .sort((a, b) => Number(b.can_use_app) - Number(a.can_use_app) || a.full_name.localeCompare(b.full_name))
    }

    return {
      data: {
        year,
        years: [...allYears]
          .sort((a, b) => b.year - a.year)
          .map((y) => ({ id: y.id, year: y.year, is_active: y.is_active })),
        registrations,
        people,
        me: { id: user.id, full_name: user.full_name },
        canManage,
        canSms,
      },
      error: null,
    }
  } catch (error: unknown) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to load the call list' }
  }
}

/**
 * Assign registrants to callers.
 * - `single`: everyone goes to `caller_ids[0]`.
 * - `spread`: balanced across `caller_ids`, counting what each already has open.
 * - `clear`: remove the caller.
 */
export async function assignCallersAction(input: {
  registration_ids: string[]
  caller_ids: string[]
  mode: 'single' | 'spread' | 'clear'
}): Promise<{ updated: number; error: string | null }> {
  try {
    await guard('camp.manage')
    requireConvexEnv()
    const ids = Array.from(new Set(input.registration_ids.filter(Boolean)))
    if (ids.length === 0) throw new Error('Select at least one registrant.')

    const bridge = await import('@/lib/convex/camp-bridge')
    let assignments: Array<{ registration_id: string; assigned_to: string | null }>
    if (input.mode === 'clear') {
      assignments = ids.map((registration_id) => ({ registration_id, assigned_to: null }))
    } else {
      const callers = Array.from(new Set(input.caller_ids.filter(Boolean)))
      if (callers.length === 0) throw new Error('Choose at least one caller.')
      if (input.mode === 'single') {
        assignments = ids.map((registration_id) => ({ registration_id, assigned_to: callers[0] }))
      } else {
        // Balance against each caller's existing open list in this year.
        const first = await bridge.fetchRegistrationFromConvex(ids[0])
        const yearRegs = first ? await bridge.fetchRegistrationsFromConvex(first.camp_year_id) : []
        const selected = new Set(ids)
        const load = new Map<string, number>()
        progressByCaller(yearRegs.filter((r) => !selected.has(r.id))).forEach((row, callerId) =>
          load.set(callerId, row.open)
        )
        assignments = distributeEvenly(ids, callers, load)
      }
    }

    const updated = await bridge.setCallAssignmentsInConvex(assignments)
    revalidatePath('/admin/camp-meeting')
    revalidatePath('/admin/camp-meeting/calls')
    revalidatePath('/admin/camp-meeting/follow-up')
    return { updated, error: null }
  } catch (error: unknown) {
    return { updated: 0, error: error instanceof Error ? error.message : 'Failed to assign callers' }
  }
}

export async function recordCallOutcomeAction(input: {
  registration_id: string
  outcome: CampAttendanceConfirmation
  note?: string
  count_attempt?: boolean
}): Promise<{ data: CampRegistration | null; error: string | null }> {
  try {
    const user = await guard('camp.calls')
    requireConvexEnv()
    if (!user) throw new Error('Sign in to record calls.')
    if (!isCallOutcome(input.outcome)) throw new Error('Choose a call outcome.')

    const bridge = await import('@/lib/convex/camp-bridge')
    const reg = await bridge.fetchRegistrationFromConvex(input.registration_id)
    if (!reg) throw new Error('This registration no longer exists.')
    const canManage = hasPermission(user.role, 'camp.manage', user.permissions)
    if (!canManage && reg.assigned_to !== user.id) {
      throw new Error('This person is not on your call list.')
    }

    const data = await bridge.recordCallOutcomeInConvex({
      registration_id: reg.id,
      outcome: input.outcome,
      note: input.note?.slice(0, 500),
      performed_by: user.id,
      count_attempt: input.count_attempt,
    })
    revalidatePath('/admin/camp-meeting/calls')
    return { data, error: null }
  } catch (error: unknown) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to save the call' }
  }
}

export type CallListSmsResult = {
  callers: number
  messages: number
  failed: Array<{ caller: string; reason: string }>
  dry_run: boolean
}

/**
 * Text each caller their own list (names + numbers) with a link to mark outcomes.
 * Only open calls are listed unless `include_settled` is set.
 */
export async function sendCallListsBySmsAction(input: {
  camp_year_id: string
  caller_ids?: string[]
  include_settled?: boolean
  dry_run?: boolean
}): Promise<{ data: CallListSmsResult | null; error: string | null }> {
  try {
    const user = await guard('camp.manage')
    requireConvexEnv()
    if (user && !hasPermission(user.role, 'sms.send', user.permissions)) {
      throw new Error('You need the "Send SMS" permission to text call lists.')
    }

    const bridge = await import('@/lib/convex/camp-bridge')
    const { fetchUserFromConvex } = await import('@/lib/convex/core-bridge')
    const { sendSms, isValidSmsPhone, isSmsConfigured } = await import('@/lib/comms/sms-client')
    const dryRun = Boolean(input.dry_run)
    if (!dryRun && !isSmsConfigured()) {
      throw new Error('SMS is not configured on this server. Add the Hubtel keys, then try again.')
    }

    const year = await bridge.fetchCampYearByIdFromConvex(input.camp_year_id)
    if (!year) throw new Error('Camp year not found.')
    const regs = await bridge.fetchRegistrationsFromConvex(year.id)

    const byCaller = new Map<string, CampRegistration[]>()
    for (const reg of regs) {
      if (!reg.assigned_to || reg.status === 'cancelled') continue
      if (!input.include_settled && !isOpenCall(reg)) continue
      if (input.caller_ids?.length && !input.caller_ids.includes(reg.assigned_to)) continue
      byCaller.set(reg.assigned_to, [...(byCaller.get(reg.assigned_to) ?? []), reg])
    }
    if (byCaller.size === 0) throw new Error('No open calls are assigned to the chosen callers.')

    const link = `${appOrigin()}/admin/camp-meeting/calls`
    const failed: CallListSmsResult['failed'] = []
    let messages = 0
    let callers = 0

    for (const [callerId, list] of Array.from(byCaller.entries())) {
      const caller = await fetchUserFromConvex(callerId)
      const name = caller?.full_name ?? 'Unknown caller'
      if (!caller?.phone || !isValidSmsPhone(caller.phone)) {
        failed.push({ caller: name, reason: 'No valid phone number on their profile' })
        continue
      }
      const canOpen = hasPermission(caller.role, 'camp.calls', caller.permissions)
      const bodies = buildCallListSms({
        callerName: caller.full_name,
        campYear: year.year,
        entries: list
          .sort((a, b) => a.full_name.localeCompare(b.full_name))
          .map((r) => ({ name: r.full_name, phone: r.phone, outcome: r.attendance_confirmation })),
        link: canOpen ? link : null,
      })

      let callerOk = true
      for (const body of bodies) {
        const result = await sendSms(caller.phone, body, { dryRun })
        await bridge.logCampCommunicationInConvex({
          camp_year_id: year.id,
          communication_type: 'sms',
          sender_id: user?.id ?? 'system',
          recipient_type: 'individual',
          recipient_phone: result.normalizedPhone ?? caller.phone,
          message_body: body,
          status: result.success ? 'sent' : 'failed',
          provider_message_id: result.messageId,
          error_message: result.error,
          metadata: {
            kind: 'call_list',
            caller_id: caller.id,
            recipient_name: caller.full_name,
            entries: list.length,
            dry_run: dryRun || Boolean(result.dryRun),
          },
          sent_at: result.success ? new Date().toISOString() : undefined,
        })
        if (result.success) messages += 1
        else {
          callerOk = false
          failed.push({ caller: name, reason: result.error ?? 'SMS failed' })
          break
        }
      }
      if (callerOk) callers += 1
    }

    revalidatePath('/admin/camp-meeting/communications')
    return { data: { callers, messages, failed, dry_run: dryRun }, error: null }
  } catch (error: unknown) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to text call lists' }
  }
}

/** Grant `camp.calls` to people who were given a list but cannot open it yet. */
export async function grantCallAccessAction(
  userIds: string[]
): Promise<{ granted: number; texted: number; error: string | null }> {
  try {
    await guard('users.manage')
    const { fetchUserFromConvex } = await import('@/lib/convex/core-bridge')
    const { updateUserAccess } = await import('@/lib/actions/access')
    let granted = 0
    let texted = 0
    for (const id of Array.from(new Set(userIds))) {
      const target = await fetchUserFromConvex(id)
      if (!target || hasPermission(target.role, 'camp.calls', target.permissions)) continue
      const res = await updateUserAccess(id, target.role, [...(target.permissions ?? []), 'camp.calls'], { notify: true })
      if (res.error) throw new Error(`${target.full_name}: ${res.error}`)
      granted += 1
      if (res.sms?.sent) texted += 1
    }
    return { granted, texted, error: null }
  } catch (error: unknown) {
    return { granted: 0, texted: 0, error: error instanceof Error ? error.message : 'Failed to grant access' }
  }
}
