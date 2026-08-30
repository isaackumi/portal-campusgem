import { api } from '@/convex/_generated/api'
import type {
  CommunicationRecord,
  CommsChannel,
  CommsModule,
  CommsStats,
} from '@/lib/comms/types'
import { getConvexHttpClient } from '@/lib/convex/http-client'

function requireCoreServerSecret(): string {
  const secret = process.env.CAMP_CONVEX_SERVER_SECRET
  if (!secret) throw new Error('CAMP_CONVEX_SERVER_SECRET is not configured')
  return secret
}

function docToRecord(doc: Record<string, unknown>): CommunicationRecord {
  const id = String(doc._id ?? doc.id ?? '')
  return {
    id,
    module: doc.module as CommsModule,
    channel: doc.channel as CommsChannel,
    audience_type: doc.audience_type as CommunicationRecord['audience_type'],
    sender_id: doc.sender_id as string | undefined,
    batch_id: doc.batch_id as string | undefined,
    recipient_name: doc.recipient_name as string | undefined,
    recipient_email: doc.recipient_email as string | undefined,
    recipient_phone: doc.recipient_phone as string | undefined,
    recipient_entity_type: doc.recipient_entity_type as CommunicationRecord['recipient_entity_type'],
    recipient_entity_id: doc.recipient_entity_id as string | undefined,
    subject: doc.subject as string | undefined,
    message_body: String(doc.message_body ?? ''),
    filter_criteria: doc.filter_criteria as Record<string, unknown> | undefined,
    status: doc.status as CommunicationRecord['status'],
    provider_message_id: doc.provider_message_id as string | undefined,
    error_message: doc.error_message as string | undefined,
    metadata: doc.metadata as Record<string, unknown> | undefined,
    created_at: new Date(Number(doc._creationTime ?? doc.updated_at ?? Date.now())).toISOString(),
    sent_at: doc.sent_at ? new Date(Number(doc.sent_at)).toISOString() : undefined,
    delivered_at: doc.delivered_at ? new Date(Number(doc.delivered_at)).toISOString() : undefined,
  }
}

export async function fetchCommunicationsFromConvex(filters?: {
  module?: CommsModule
  channel?: CommsChannel
  batch_id?: string
  limit?: number
}): Promise<CommunicationRecord[]> {
  const client = getConvexHttpClient()
  const secret = requireCoreServerSecret()
  const docs = (await client.query(api.comms.listCommunicationsWithSecret, {
    secret,
    module: filters?.module,
    channel: filters?.channel,
    batch_id: filters?.batch_id,
    limit: filters?.limit,
  })) as Record<string, unknown>[]
  return docs.map(docToRecord)
}

export async function logCommunicationInConvex(
  record: Omit<CommunicationRecord, 'id' | 'created_at'> & {
    sent_at?: string
    delivered_at?: string
  }
): Promise<CommunicationRecord> {
  const client = getConvexHttpClient()
  const secret = requireCoreServerSecret()
  const doc = (await client.mutation(api.comms.logCommunicationWithSecret, {
    secret,
    module: record.module,
    channel: record.channel,
    audience_type: record.audience_type,
    sender_id: record.sender_id,
    batch_id: record.batch_id,
    recipient_name: record.recipient_name,
    recipient_email: record.recipient_email,
    recipient_phone: record.recipient_phone,
    recipient_entity_type: record.recipient_entity_type,
    recipient_entity_id: record.recipient_entity_id,
    subject: record.subject,
    message_body: record.message_body,
    filter_criteria: record.filter_criteria,
    status: record.status,
    provider_message_id: record.provider_message_id,
    error_message: record.error_message,
    metadata: record.metadata,
    sent_at: record.sent_at ? Date.parse(record.sent_at) : undefined,
    delivered_at: record.delivered_at ? Date.parse(record.delivered_at) : undefined,
  })) as Record<string, unknown>
  return docToRecord(doc)
}

export async function fetchCommsStatsFromConvex(module?: CommsModule): Promise<CommsStats> {
  const client = getConvexHttpClient()
  const secret = requireCoreServerSecret()
  return (await client.query(api.comms.getCommunicationStatsWithSecret, {
    secret,
    module,
  })) as CommsStats
}
