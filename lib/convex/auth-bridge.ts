import 'server-only'

import { getConvexHttpClient } from '@/lib/convex/http-client'
import { requireCoreServerSecret } from '@/lib/convex/core-bridge'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'

export type AccessLogKind = 'access' | 'secondary_phone' | 'link_duplicate' | 'signin_text'

export type AccessLogEntry = {
  id: string
  user_id: string
  user_name: string
  actor_id?: string
  actor_name: string
  kind: AccessLogKind
  from_role?: string
  to_role?: string
  added: string[]
  removed: string[]
  note?: string
  at: number
}

export async function issueSigninCodeInConvex(args: {
  userId: string
  codeHash: string
  sentTo: string
  ttlMs: number
}) {
  return getConvexHttpClient().mutation(api.authCodes.issueAuthCodeWithSecret, {
    secret: requireCoreServerSecret(),
    user_id: args.userId as Id<'users'>,
    code_hash: args.codeHash,
    sent_to: args.sentTo,
    ttl_ms: args.ttlMs,
  })
}

export async function discardSigninCodeInConvex(id: string): Promise<void> {
  await getConvexHttpClient().mutation(api.authCodes.discardAuthCodeWithSecret, {
    secret: requireCoreServerSecret(),
    id: id as Id<'auth_codes'>,
  })
}

export async function verifySigninCodeInConvex(userId: string, codeHash: string) {
  return getConvexHttpClient().mutation(api.authCodes.verifyAuthCodeWithSecret, {
    secret: requireCoreServerSecret(),
    user_id: userId as Id<'users'>,
    code_hash: codeHash,
  })
}

export async function logAccessChangeInConvex(entry: Omit<AccessLogEntry, 'id' | 'at'>): Promise<void> {
  await getConvexHttpClient().mutation(api.accessLog.logAccessChangeWithSecret, {
    secret: requireCoreServerSecret(),
    ...entry,
    user_id: entry.user_id as Id<'users'>,
    actor_id: entry.actor_id ? (entry.actor_id as Id<'users'>) : undefined,
  })
}

export async function listAccessLogFromConvex(userId?: string, limit?: number): Promise<AccessLogEntry[]> {
  const rows = await getConvexHttpClient().query(api.accessLog.listAccessLogWithSecret, {
    secret: requireCoreServerSecret(),
    user_id: userId ? (userId as Id<'users'>) : undefined,
    limit,
  })
  return (rows as AccessLogEntry[]).map((r) => ({ ...r, id: String(r.id) }))
}
