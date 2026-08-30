export type CommsModule = 'church' | 'rlc' | 'camp'
export type CommsChannel = 'email' | 'sms'
export type CommsAudienceType = 'individual' | 'group' | 'bulk'
export type CommsStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced'
export type CommsEntityType = 'member' | 'visitor' | 'registration' | 'group' | 'manual'

export interface CommsRecipient {
  id: string
  name: string
  email?: string
  phone?: string
  entity_type: CommsEntityType
  entity_id: string
  module: CommsModule
  /** Template variables for personalization */
  variables?: Record<string, string>
}

export interface CommunicationRecord {
  id: string
  module: CommsModule
  channel: CommsChannel
  audience_type: CommsAudienceType
  sender_id?: string
  batch_id?: string
  recipient_name?: string
  recipient_email?: string
  recipient_phone?: string
  recipient_entity_type?: CommsEntityType
  recipient_entity_id?: string
  subject?: string
  message_body: string
  filter_criteria?: Record<string, unknown>
  status: CommsStatus
  provider_message_id?: string
  error_message?: string
  metadata?: Record<string, unknown>
  created_at: string
  sent_at?: string
  delivered_at?: string
}

export interface CommsStats {
  total: number
  sent: number
  failed: number
  pending: number
  email: number
  sms: number
}

export interface SendCommsRequest {
  module: CommsModule
  channel: CommsChannel
  audience_type: CommsAudienceType
  sender_id: string
  subject?: string
  message_body: string
  recipients: CommsRecipient[]
  batch_id?: string
  filter_criteria?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

export interface SendCommsResult {
  batch_id: string
  success_count: number
  error_count: number
  errors: string[]
  records: CommunicationRecord[]
}

export const COMMS_MODULE_LABELS: Record<CommsModule, string> = {
  church: 'Campus Gem',
  rlc: 'Redemption Light Chapel',
  camp: 'Camp Meeting',
}

export const COMMS_CHANNEL_LABELS: Record<CommsChannel, string> = {
  email: 'Email',
  sms: 'SMS',
}

export const COMMS_STATUS_LABELS: Record<CommsStatus, string> = {
  pending: 'Pending',
  sent: 'Sent',
  delivered: 'Delivered',
  failed: 'Failed',
  bounced: 'Bounced',
}
