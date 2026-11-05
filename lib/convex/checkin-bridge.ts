import 'server-only'

import { getConvexHttpClient } from '@/lib/convex/http-client'
import { requireCoreServerSecret } from '@/lib/convex/core-bridge'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import type { ServiceType } from '@/lib/types'
import type { CheckinCongregation, CheckinSessionState } from '@/lib/attendance/checkin-session'

export type CheckinSession = {
  id: string
  token: string
  service_type: ServiceType
  service_date: string
  congregation: CheckinCongregation
  title?: string
  opens_at: number
  closes_at: number
  closed_at?: number
  created_by: string
  checkin_count: number
  state: CheckinSessionState
}

export type SelfCheckInResult =
  | { status: 'recorded' | 'already'; check_in_time: string }
  | { status: 'not_found' | Exclude<CheckinSessionState, 'open'> }

function mapSession(raw: unknown): CheckinSession | null {
  if (!raw || typeof raw !== 'object') return null
  const s = raw as CheckinSession
  return { ...s, id: String(s.id) }
}

export async function createCheckinSessionInConvex(args: {
  token: string
  service_type: ServiceType
  service_date: string
  congregation: CheckinCongregation
  title?: string
  opens_at: number
  closes_at: number
  created_by: string
}): Promise<CheckinSession> {
  const raw = await getConvexHttpClient().mutation(api.checkinSessions.createCheckinSessionWithSecret, {
    secret: requireCoreServerSecret(),
    ...args,
  })
  const session = mapSession(raw)
  if (!session) throw new Error('Check-in session was not created.')
  return session
}

export async function getCheckinSessionFromConvex(token: string): Promise<CheckinSession | null> {
  const raw = await getConvexHttpClient().query(api.checkinSessions.getCheckinSessionWithSecret, {
    secret: requireCoreServerSecret(),
    token,
  })
  return mapSession(raw)
}

export async function listOpenCheckinSessionsFromConvex(): Promise<CheckinSession[]> {
  const rows = (await getConvexHttpClient().query(api.checkinSessions.listOpenCheckinSessionsWithSecret, {
    secret: requireCoreServerSecret(),
  })) as unknown[]
  return rows.map(mapSession).filter((s): s is CheckinSession => s != null)
}

export async function closeCheckinSessionInConvex(token: string): Promise<CheckinSession | null> {
  const raw = await getConvexHttpClient().mutation(api.checkinSessions.closeCheckinSessionWithSecret, {
    secret: requireCoreServerSecret(),
    token,
  })
  return mapSession(raw)
}

export async function getSelfCheckInViewFromConvex(
  token: string,
  userId: string
): Promise<{ session: CheckinSession; checked_in_at: string | null } | null> {
  const raw = (await getConvexHttpClient().query(api.checkinSessions.getSelfCheckInViewWithSecret, {
    secret: requireCoreServerSecret(),
    token,
    user_id: userId,
  })) as { session: unknown; checked_in_at: string | null } | null
  const session = raw ? mapSession(raw.session) : null
  return session ? { session, checked_in_at: raw?.checked_in_at ?? null } : null
}

export async function selfCheckInInConvex(token: string, userId: string): Promise<SelfCheckInResult> {
  return (await getConvexHttpClient().mutation(api.checkinSessions.selfCheckInWithSecret, {
    secret: requireCoreServerSecret(),
    token,
    user_id: userId as Id<'users'>,
  })) as SelfCheckInResult
}
