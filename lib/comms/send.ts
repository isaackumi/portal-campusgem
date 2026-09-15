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
import {
  getMissingSmsEnvKeys,
  isSmsConfigured,
  isValidSmsPhone,
  normalizeSmsPhone,
  resolveSmsProvider,
  sendSms,
} from '@/lib/comms/sms-client'
import { EmailService } from '@/lib/services/email-service'

const emailService = new EmailService()

function canDeliver(recipient: CommsRecipient, channel: CommsChannel): boolean {
  if (channel === 'email') return Boolean(recipient.email?.trim())
  return isValidSmsPhone(recipient.phone)
}

export async function sendCommunications(request: SendCommsRequest): Promise<SendCommsResult> {
  if (
    request.channel === 'sms' &&
    !request.dry_run &&
    !request.force_mock &&
    !isSmsConfigured()
  ) {
    const missing = getMissingSmsEnvKeys()
    throw new Error(
      `SMS is not configured (provider=${resolveSmsProvider()}). Missing: ${
        missing.join(', ') || 'Hubtel credentials'
      }. Add HUBTEL_CLIENT_ID and HUBTEL_CLIENT_SECRET in Vercel → Environment Variables (Production), then Redeploy.`
    )
  }

  const batch_id = request.batch_id ?? randomUUID()
  const errors: string[] = []
  let success_count = 0
  let error_count = 0
  const records: CommunicationRecord[] = []
  const smsGapMs = Math.max(0, Number(process.env.SMS_BULK_GAP_MS ?? 150))
  const smsProvider = resolveSmsProvider()

  const { logCommunicationInConvex } = await import('@/lib/convex/comms-bridge')

  for (let index = 0; index < request.recipients.length; index++) {
    const recipient = request.recipients[index]
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
      const reason =
        request.channel === 'email'
          ? 'No email'
          : recipient.phone?.trim()
            ? `Invalid phone (${recipient.phone})`
            : 'No phone'
      errors.push(`${recipient.name}: ${reason}`)
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
        error_message: reason,
        metadata: {
          ...request.metadata,
          provider: request.channel === 'sms' ? smsProvider : 'email',
          dry_run: Boolean(request.dry_run),
        },
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
          metadata: { ...request.metadata, provider: 'email' },
          sent_at: result.success ? new Date().toISOString() : undefined,
        })

        if (result.success) success_count++
        else {
          error_count++
          errors.push(`${recipient.name}: ${result.error ?? 'Email failed'}`)
        }
        records.push(logged)
      } else {
        if (index > 0 && smsGapMs > 0 && !request.dry_run) {
          await new Promise((resolve) => setTimeout(resolve, smsGapMs))
        }
        const result = await sendSms(recipient.phone!, body, {
          dryRun: request.dry_run,
          forceMock: request.force_mock,
        })
        const normalized = result.normalizedPhone ?? normalizeSmsPhone(recipient.phone!)
        const logged = await logCommunicationInConvex({
          module: request.module,
          channel: 'sms',
          audience_type: request.audience_type,
          sender_id: request.sender_id,
          batch_id,
          recipient_name: recipient.name,
          recipient_phone: normalized,
          recipient_entity_type: recipient.entity_type,
          recipient_entity_id: recipient.entity_id,
          message_body: body,
          filter_criteria: request.filter_criteria,
          status: result.success ? 'sent' : 'failed',
          provider_message_id: result.messageId,
          error_message: result.error,
          metadata: {
            ...request.metadata,
            provider: result.provider,
            dry_run: Boolean(result.dryRun || request.dry_run),
            raw_phone: recipient.phone,
            normalized_phone: normalized,
          },
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
        metadata: {
          ...request.metadata,
          provider: request.channel === 'sms' ? smsProvider : 'email',
          dry_run: Boolean(request.dry_run),
        },
      })
      records.push(logged)
    }
  }

  return { batch_id, success_count, error_count, errors, records }
}

export type { CommsModule, CommsRecipient }
