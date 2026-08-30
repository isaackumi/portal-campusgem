import { randomUUID } from 'crypto'
import type {
  CommunicationRecord,
  CommsChannel,
  CommsModule,
  CommsRecipient,
  SendCommsRequest,
  SendCommsResult,
} from '@/lib/comms/types'
import { personalizeMessage } from '@/lib/comms/recipients'
import { sendSms } from '@/lib/comms/sms-client'
import { EmailService } from '@/lib/services/email-service'

const emailService = new EmailService()

function canDeliver(recipient: CommsRecipient, channel: CommsChannel): boolean {
  return channel === 'email' ? Boolean(recipient.email?.trim()) : Boolean(recipient.phone?.trim())
}

export async function sendCommunications(request: SendCommsRequest): Promise<SendCommsResult> {
  const batch_id = request.batch_id ?? randomUUID()
  const errors: string[] = []
  let success_count = 0
  let error_count = 0
  const records: CommunicationRecord[] = []

  const { logCommunicationInConvex } = await import('@/lib/convex/comms-bridge')

  for (const recipient of request.recipients) {
    const variables = {
      name: recipient.name.split(' ')[0] ?? recipient.name,
      full_name: recipient.name,
      ...(recipient.variables ?? {}),
    }
    const body = personalizeMessage(request.message_body, variables)
    const subject = request.subject
      ? personalizeMessage(request.subject, variables)
      : undefined

    if (!canDeliver(recipient, request.channel)) {
      error_count++
      errors.push(`${recipient.name}: No ${request.channel === 'email' ? 'email' : 'phone'}`)
      const logged = await logCommunicationInConvex({
        module: request.module,
        channel: request.channel,
        audience_type: request.audience_type,
        sender_id: request.sender_id,
        batch_id,
        recipient_name: recipient.name,
        recipient_email: recipient.email,
        recipient_phone: recipient.phone,
        recipient_entity_type: recipient.entity_type,
        recipient_entity_id: recipient.entity_id,
        subject,
        message_body: body,
        filter_criteria: request.filter_criteria,
        status: 'failed',
        error_message: `Missing ${request.channel === 'email' ? 'email' : 'phone'}`,
        metadata: request.metadata,
      })
      records.push(logged)
      continue
    }

    try {
      if (request.channel === 'email') {
        const result = await emailService.sendEmail({
          to: recipient.email!,
          subject: subject ?? 'Message from Campus Gem Ministries',
          text: body,
          html: `<p>${body.replace(/\n/g, '<br>')}</p>`,
          sender_id: request.sender_id,
        })

        const logged = await logCommunicationInConvex({
          module: request.module,
          channel: 'email',
          audience_type: request.audience_type,
          sender_id: request.sender_id,
          batch_id,
          recipient_name: recipient.name,
          recipient_email: recipient.email,
          recipient_entity_type: recipient.entity_type,
          recipient_entity_id: recipient.entity_id,
          subject,
          message_body: body,
          filter_criteria: request.filter_criteria,
          status: result.success ? 'sent' : 'failed',
          provider_message_id: result.communication?.provider_message_id,
          error_message: result.error,
          metadata: request.metadata,
          sent_at: result.success ? new Date().toISOString() : undefined,
        })

        if (result.success) success_count++
        else {
          error_count++
          errors.push(`${recipient.name}: ${result.error ?? 'Email failed'}`)
        }
        records.push(logged)
      } else {
        const result = await sendSms(recipient.phone!, body)
        const logged = await logCommunicationInConvex({
          module: request.module,
          channel: 'sms',
          audience_type: request.audience_type,
          sender_id: request.sender_id,
          batch_id,
          recipient_name: recipient.name,
          recipient_phone: recipient.phone,
          recipient_entity_type: recipient.entity_type,
          recipient_entity_id: recipient.entity_id,
          message_body: body,
          filter_criteria: request.filter_criteria,
          status: result.success ? 'sent' : 'failed',
          provider_message_id: result.messageId,
          error_message: result.error,
          metadata: request.metadata,
          sent_at: result.success ? new Date().toISOString() : undefined,
        })

        if (result.success) success_count++
        else {
          error_count++
          errors.push(`${recipient.name}: ${result.error ?? 'SMS failed'}`)
        }
        records.push(logged)
      }
    } catch (error: unknown) {
      error_count++
      const message = error instanceof Error ? error.message : 'Send failed'
      errors.push(`${recipient.name}: ${message}`)
      const logged = await logCommunicationInConvex({
        module: request.module,
        channel: request.channel,
        audience_type: request.audience_type,
        sender_id: request.sender_id,
        batch_id,
        recipient_name: recipient.name,
        recipient_email: recipient.email,
        recipient_phone: recipient.phone,
        recipient_entity_type: recipient.entity_type,
        recipient_entity_id: recipient.entity_id,
        subject,
        message_body: body,
        filter_criteria: request.filter_criteria,
        status: 'failed',
        error_message: message,
        metadata: request.metadata,
      })
      records.push(logged)
    }
  }

  return { batch_id, success_count, error_count, errors, records }
}

export type { CommsModule, CommsRecipient }
