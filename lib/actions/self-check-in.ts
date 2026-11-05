'use server'

import { guard, optionalSessionUser } from '@/lib/auth/action-guard'
import { siteOrigin } from '@/lib/site-url'
import {
  checkinSessionWindow,
  generateCheckinSessionToken,
  isCheckinSessionTokenFormat,
  isIsoDate,
  selfCheckInPath,
  type CheckinCongregation,
} from '@/lib/attendance/checkin-session'
import type { CheckinSession, SelfCheckInResult } from '@/lib/convex/checkin-bridge'
import type { ServiceType } from '@/lib/types'

const SERVICE_TYPES: ServiceType[] = [
  'sunday_service',
  'midweek_service',
  'prayer_meeting',
  'youth_service',
  'children_service',
  'special_event',
  'other',
]

export type CheckinSessionWithUrl = CheckinSession & { url: string }

function withUrl(session: CheckinSession): CheckinSessionWithUrl {
  return { ...session, url: `${siteOrigin()}${selfCheckInPath(session.token)}` }
}

function message(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

/** Usher/admin: open a self check-in session and get the URL to show as a QR code. */
export async function startCheckinSessionAction(input: {
  service_type: ServiceType
  service_date: string
  congregation: CheckinCongregation
  hours?: number
  title?: string
}): Promise<{ data: CheckinSessionWithUrl | null; error: string | null }> {
  const user = (await guard('attendance.manage')) ?? (await optionalSessionUser())
  if (!SERVICE_TYPES.includes(input.service_type)) return { data: null, error: 'Pick a service type.' }
  if (!isIsoDate(input.service_date)) return { data: null, error: 'Pick a valid date.' }
  if (input.congregation !== 'campus_gem' && input.congregation !== 'rlc') {
    return { data: null, error: 'Pick a congregation.' }
  }
  try {
    const { createCheckinSessionInConvex } = await import('@/lib/convex/checkin-bridge')
    const session = await createCheckinSessionInConvex({
      token: generateCheckinSessionToken(),
      service_type: input.service_type,
      service_date: input.service_date,
      congregation: input.congregation,
      title: input.title?.trim().slice(0, 120) || undefined,
      ...checkinSessionWindow(Date.now(), input.hours),
      created_by: user?.id ?? 'system',
    })
    return { data: withUrl(session), error: null }
  } catch (error) {
    return { data: null, error: message(error, 'Could not start self check-in.') }
  }
}

export async function listOpenCheckinSessionsAction(): Promise<{
  data: CheckinSessionWithUrl[] | null
  error: string | null
}> {
  await guard('attendance.manage')
  try {
    const { listOpenCheckinSessionsFromConvex } = await import('@/lib/convex/checkin-bridge')
    return { data: (await listOpenCheckinSessionsFromConvex()).map(withUrl), error: null }
  } catch (error) {
    return { data: null, error: message(error, 'Could not load check-in sessions.') }
  }
}

/** Live count and state for the projector page. */
export async function getCheckinSessionAction(
  token: string
): Promise<{ data: CheckinSessionWithUrl | null; error: string | null }> {
  await guard('attendance.manage')
  if (!isCheckinSessionTokenFormat(token)) return { data: null, error: 'Session not found.' }
  try {
    const { getCheckinSessionFromConvex } = await import('@/lib/convex/checkin-bridge')
    const session = await getCheckinSessionFromConvex(token)
    return session ? { data: withUrl(session), error: null } : { data: null, error: 'Session not found.' }
  } catch (error) {
    return { data: null, error: message(error, 'Could not load the session.') }
  }
}

export async function closeCheckinSessionAction(
  token: string
): Promise<{ data: CheckinSessionWithUrl | null; error: string | null }> {
  await guard('attendance.manage')
  if (!isCheckinSessionTokenFormat(token)) return { data: null, error: 'Session not found.' }
  try {
    const { closeCheckinSessionInConvex } = await import('@/lib/convex/checkin-bridge')
    const session = await closeCheckinSessionInConvex(token)
    return session ? { data: withUrl(session), error: null } : { data: null, error: 'Session not found.' }
  } catch (error) {
    return { data: null, error: message(error, 'Could not close the session.') }
  }
}

/**
 * Member: "I'm here". Checks in the signed-in user only; the client sends nothing but the
 * session token, which is validated (exists, open, not expired) in Convex.
 */
export async function selfCheckInAction(token: string): Promise<SelfCheckInResult | { status: 'error'; error: string }> {
  // guard() returns null inside a trusted scope; the member is still the session user.
  const user = (await guard('dashboard.view')) ?? (await optionalSessionUser())
  if (!user) return { status: 'error', error: 'Sign in to check in.' }
  if (!isCheckinSessionTokenFormat(token)) return { status: 'not_found' }
  try {
    const { selfCheckInInConvex } = await import('@/lib/convex/checkin-bridge')
    return await selfCheckInInConvex(token, user.id)
  } catch (error) {
    return { status: 'error', error: message(error, 'Could not check you in. Please try again.') }
  }
}
