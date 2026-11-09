import 'server-only'

/**
 * Server-side access to the call center's Convex tables (convex/callCenter.ts): queue claims,
 * calling sessions and WhatsApp templates. Permission checks belong to the callers
 * (lib/actions/call-center.ts); this only talks to Convex with the server secret.
 */
import { getConvexHttpClient } from '@/lib/convex/http-client'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { requireCampAdminSecret } from '@/lib/convex/camp-bridge'
import type { CallTemplate } from '@/lib/calls/templates'

export type CallSessionRecord = {
  id: string
  list_key: string
  title: string
  segment: string
  started_by: string
  started_at: number
  ended_at?: number
  status: string
  same_gender?: boolean
}

export type SessionBoardRecord = {
  people: Array<{ user_id: string; name: string; joined_at: number; last_seen: number }>
  outcomes: Array<{ caller_id: string; target_id: string; target_name: string; outcome: string; at: number }>
}

const client = () => getConvexHttpClient()
const secret = () => requireCampAdminSecret()

export async function claimNext(args: { list_key: string; caller_id: string; candidate_ids: string[]; ttl_ms: number }): Promise<string | null> {
  return (await client().mutation(api.callCenter.claimNextWithSecret, { secret: secret(), ...args })) as string | null
}

export async function releaseClaim(args: { list_key: string; caller_id: string; target_id: string }): Promise<void> {
  await client().mutation(api.callCenter.releaseClaimWithSecret, { secret: secret(), ...args })
}

export async function listClaims(list_key: string): Promise<Array<{ target_id: string; caller_id: string; claimed_at: number }>> {
  return await client().query(api.callCenter.listClaimsWithSecret, { secret: secret(), list_key })
}

export async function getLiveSession(list_key: string): Promise<CallSessionRecord | null> {
  return (await client().query(api.callCenter.getLiveSessionWithSecret, { secret: secret(), list_key })) as CallSessionRecord | null
}

export async function startSession(args: { list_key: string; title: string; segment: string; started_by: string; same_gender?: boolean }): Promise<CallSessionRecord> {
  return (await client().mutation(api.callCenter.startSessionWithSecret, { secret: secret(), ...args })) as CallSessionRecord
}

export async function setSessionSegment(session_id: string, segment: string, same_gender?: boolean): Promise<void> {
  await client().mutation(api.callCenter.setSessionSegmentWithSecret, {
    secret: secret(),
    session_id: session_id as Id<'call_sessions'>,
    segment,
    ...(same_gender !== undefined ? { same_gender } : {}),
  })
}

export async function endSession(session_id: string): Promise<void> {
  await client().mutation(api.callCenter.endSessionWithSecret, { secret: secret(), session_id: session_id as Id<'call_sessions'> })
}

export async function heartbeat(args: { session_id: string; user_id: string; name: string }): Promise<void> {
  await client().mutation(api.callCenter.heartbeatWithSecret, {
    secret: secret(),
    session_id: args.session_id as Id<'call_sessions'>,
    user_id: args.user_id,
    name: args.name,
  })
}

export async function recordSessionOutcome(args: {
  session_id: string
  caller_id: string
  target_id: string
  target_name: string
  outcome: string
}): Promise<void> {
  await client().mutation(api.callCenter.recordSessionOutcomeWithSecret, {
    secret: secret(),
    ...args,
    session_id: args.session_id as Id<'call_sessions'>,
  })
}

export async function getSessionBoard(session_id: string): Promise<SessionBoardRecord> {
  return await client().query(api.callCenter.getSessionBoardWithSecret, { secret: secret(), session_id: session_id as Id<'call_sessions'> })
}

export async function listSavedTemplates(): Promise<CallTemplate[]> {
  return (await client().query(api.callCenter.listTemplatesWithSecret, { secret: secret() })) as CallTemplate[]
}

export async function saveTemplate(template: Omit<CallTemplate, 'isDefault' | 'mine'>, updated_by: string): Promise<void> {
  const { key, name, body, audience, position, archived, channel, owner_id } = template
  await client().mutation(api.callCenter.saveTemplateWithSecret, {
    secret: secret(),
    template: {
      key,
      name,
      body,
      audience,
      position,
      ...(archived !== undefined ? { archived } : {}),
      ...(channel && channel !== 'any' ? { channel } : {}),
      ...(owner_id ? { owner_id } : {}),
    },
    updated_by,
  })
}

export async function resetTemplate(key: string): Promise<void> {
  await client().mutation(api.callCenter.resetTemplateWithSecret, { secret: secret(), key })
}

export async function listNumberChanges(): Promise<Array<{ from_phone: string; to_phone: string }>> {
  return await client().query(api.callCenter.listNumberChangesWithSecret, { secret: secret() })
}

export async function setNumberChange(args: { from_phone: string; to_phone: string; set_by: string; context?: string }): Promise<void> {
  await client().mutation(api.callCenter.setNumberChangeWithSecret, { secret: secret(), ...args })
}

export type CallTeamRecord = { user_id: string; gender?: 'Male' | 'Female'; takes: 'all' | 'new' | 'returning'; max?: number; active: boolean }

export async function listCallTeam(): Promise<CallTeamRecord[]> {
  return (await client().query(api.callCenter.listCallTeamWithSecret, { secret: secret() })) as CallTeamRecord[]
}

export async function saveCallTeamMember(member: CallTeamRecord, added_by: string): Promise<void> {
  await client().mutation(api.callCenter.saveCallTeamMemberWithSecret, {
    secret: secret(),
    member: {
      user_id: member.user_id,
      takes: member.takes,
      active: member.active,
      ...(member.gender ? { gender: member.gender } : {}),
      ...(member.max != null ? { max: member.max } : {}),
    },
    added_by,
  })
}

export async function removeCallTeamMember(user_id: string): Promise<void> {
  await client().mutation(api.callCenter.removeCallTeamMemberWithSecret, { secret: secret(), user_id })
}

export async function callHistory(camp_year_id: string, list_key: string): Promise<{
  calls: import('@/lib/calls/history').CallRow[]
  sessions: import('@/lib/calls/history').CallSessionInfo[]
  callers: Record<string, string>
}> {
  // Rows are built by convex/callCenter.ts callHistoryWithSecret in exactly this shape.
  return (await client().query(api.callCenter.callHistoryWithSecret, { secret: secret(), camp_year_id, list_key })) as unknown as {
    calls: import('@/lib/calls/history').CallRow[]
    sessions: import('@/lib/calls/history').CallSessionInfo[]
    callers: Record<string, string>
  }
}
