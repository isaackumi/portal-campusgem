import 'server-only'

import { getConvexHttpClient } from '@/lib/convex/http-client'
import { requireCoreServerSecret } from '@/lib/convex/core-bridge'
import { api } from '@/convex/_generated/api'
import type { InboxMessage } from '@/lib/comms/inbound'

export type SenderMatch = {
  user_id?: string
  user_name?: string
  sms_opt_out: boolean
  visitor_id?: string
  visitor_name?: string
  camp_registration_id?: string
  camp_registration_name?: string
  sender_name?: string
}

export type StoredInboxMessage = InboxMessage & {
  from: string
  to?: string
  provider_message_id?: string
  user_id?: string
  visitor_id?: string
  camp_registration_id?: string
  keyword?: string
  handled_by?: string
}

export type OutboundSms = {
  id: string
  body: string
  at: number
  status: string
  sender_id?: string
  recipient_name?: string
}

function client() {
  return getConvexHttpClient()
}

function mapMessage(raw: Record<string, unknown>): StoredInboxMessage {
  return { ...(raw as unknown as StoredInboxMessage), id: String(raw.id) }
}

export async function matchSmsSenderFromConvex(phone: string): Promise<SenderMatch> {
  return (await client().query(api.smsInbox.matchSenderWithSecret, {
    secret: requireCoreServerSecret(),
    phone,
  })) as SenderMatch
}

export async function recordInboundSmsInConvex(args: {
  from: string
  phone: string
  to?: string
  body: string
  provider_message_id?: string
  keyword?: string
  tags: string[]
  opt_out?: boolean
}): Promise<{ id: string; duplicate: boolean }> {
  return client().mutation(api.smsInbox.recordInboundWithSecret, { secret: requireCoreServerSecret(), ...args })
}

export async function listInboxFromConvex(limit?: number): Promise<StoredInboxMessage[]> {
  const rows = (await client().query(api.smsInbox.listInboxWithSecret, {
    secret: requireCoreServerSecret(),
    limit,
  })) as Record<string, unknown>[]
  return rows.map(mapMessage)
}

export async function getInboxThreadFromConvex(phone: string): Promise<{
  inbound: StoredInboxMessage[]
  outbound: OutboundSms[]
  match: SenderMatch
}> {
  const raw = (await client().query(api.smsInbox.getThreadWithSecret, {
    secret: requireCoreServerSecret(),
    phone,
  })) as { inbound: Record<string, unknown>[]; outbound: OutboundSms[]; match: SenderMatch }
  return {
    inbound: raw.inbound.map(mapMessage),
    outbound: raw.outbound.map((o) => ({ ...o, id: String(o.id) })),
    match: raw.match,
  }
}

export async function markInboxThreadReadInConvex(phone: string, by?: string, unread?: boolean): Promise<void> {
  await client().mutation(api.smsInbox.markThreadReadWithSecret, { secret: requireCoreServerSecret(), phone, by, unread })
}

export async function setInboxThreadArchivedInConvex(phone: string, archived: boolean, by?: string): Promise<void> {
  await client().mutation(api.smsInbox.setThreadArchivedWithSecret, {
    secret: requireCoreServerSecret(),
    phone,
    archived,
    by,
  })
}

export async function markInboxThreadHandledInConvex(phone: string, by: string): Promise<void> {
  await client().mutation(api.smsInbox.markHandledWithSecret, { secret: requireCoreServerSecret(), phone, by })
}

export async function countUnreadInboxFromConvex(): Promise<number> {
  return client().query(api.smsInbox.countUnreadWithSecret, { secret: requireCoreServerSecret() })
}

export async function listOptedOutPhonesFromConvex(): Promise<string[]> {
  return client().query(api.smsInbox.listOptedOutPhonesWithSecret, { secret: requireCoreServerSecret() })
}

export async function setUserSmsOptOutInConvex(userId: string, optOut: boolean): Promise<void> {
  await client().mutation(api.smsInbox.setUserSmsOptOutWithSecret, {
    secret: requireCoreServerSecret(),
    user_id: userId,
    opt_out: optOut,
  })
}
