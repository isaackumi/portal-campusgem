/**
 * Email Service for Camp Meeting Communications
 * Provider abstraction supporting multiple email providers (Resend, SendGrid, AWS SES, etc.)
 */

import { CampCommunication, CampCommunicationFilter } from '@/lib/types'

export interface EmailProvider {
  name: string
  sendEmail(params: {
    to: string
    subject: string
    html?: string
    text?: string
    from?: string
  }): Promise<{ success: boolean; messageId?: string; error?: string }>
}

// Mock Email Provider for development
class MockEmailProvider implements EmailProvider {
  name = 'mock'

  async sendEmail(params: {
    to: string
    subject: string
    html?: string
    text?: string
    from?: string
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100))
    
    console.log('[Mock Email Provider] Sending email:', {
      to: params.to,
      subject: params.subject,
      from: params.from || 'noreply@campusgem.org'
    })

    return {
      success: true,
      messageId: `mock_email_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    }
  }
}

// Resend Email Provider
class ResendEmailProvider implements EmailProvider {
  name = 'resend'

  async sendEmail(params: {
    to: string
    subject: string
    html?: string
    text?: string
    from?: string
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const apiKey = process.env.RESEND_API_KEY
      if (!apiKey) {
        throw new Error('RESEND_API_KEY not configured')
      }

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: params.from || process.env.RESEND_FROM_EMAIL || 'noreply@campusgem.org',
          to: params.to,
          subject: params.subject,
          html: params.html,
          text: params.text,
        }),
      })

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(`Resend API error: ${response.status} - ${errorData}`)
      }

      const data = await response.json()
      return {
        success: true,
        messageId: data.id
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      }
    }
  }
}

// SendGrid Email Provider
class SendGridEmailProvider implements EmailProvider {
  name = 'sendgrid'

  async sendEmail(params: {
    to: string
    subject: string
    html?: string
    text?: string
    from?: string
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const apiKey = process.env.SENDGRID_API_KEY
      if (!apiKey) {
        throw new Error('SENDGRID_API_KEY not configured')
      }

      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{
            to: [{ email: params.to }],
            subject: params.subject,
          }],
          from: {
            email: params.from || process.env.SENDGRID_FROM_EMAIL || 'noreply@campusgem.org',
            name: 'Campus Gem Ministries',
          },
          content: [
            ...(params.html ? [{
              type: 'text/html',
              value: params.html,
            }] : []),
            ...(params.text ? [{
              type: 'text/plain',
              value: params.text,
            }] : []),
          ],
        }),
      })

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(`SendGrid API error: ${response.status} - ${errorData}`)
      }

      // SendGrid doesn't return message ID in the response headers
      const messageId = response.headers.get('x-message-id') || undefined

      return {
        success: true,
        messageId
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      }
    }
  }
}

export class EmailService {
  private provider: EmailProvider

  constructor() {
    // Determine provider from environment
    const providerType = process.env.NEXT_PUBLIC_EMAIL_PROVIDER || 'mock'
    
    switch (providerType) {
      case 'resend':
        this.provider = new ResendEmailProvider()
        break
      case 'sendgrid':
        this.provider = new SendGridEmailProvider()
        break
      default:
        this.provider = new MockEmailProvider()
    }
  }

  /**
   * Send email to a single recipient
   */
  async sendEmail(params: {
    to: string
    subject: string
    html?: string
    text?: string
    from?: string
    camp_year_id?: string
    sender_id?: string
    recipient_registration_id?: string
  }): Promise<{ success: boolean; communication?: CampCommunication; error?: string }> {
    try {
      // Send email via provider
      const result = await this.provider.sendEmail({
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
        from: params.from,
      })

      if (!result.success) {
        return {
          success: false,
          error: result.error,
        }
      }

      if (params.camp_year_id) {
        try {
          const { recordCampCommunication } = await import('@/lib/actions/camp')
          const logged = await recordCampCommunication({
            camp_year_id: params.camp_year_id,
            communication_type: 'email',
            sender_id: params.sender_id,
            recipient_type: 'individual',
            recipient_registration_id: params.recipient_registration_id,
            recipient_email: params.to,
            subject: params.subject,
            message_body: params.text || params.html || '',
            status: 'sent',
            provider_message_id: result.messageId,
            sent_at: new Date().toISOString(),
          })
          return {
            success: true,
            communication: logged.data ?? undefined,
          }
        } catch {
          return { success: true, communication: undefined }
        }
      }

      return { success: true }
    } catch (error: any) {
      console.error('Email service error:', error)
      return {
        success: false,
        error: error.message || 'Failed to send email',
      }
    }
  }

  /**
   * Send bulk emails to multiple recipients
   */
  async sendBulkEmails(params: {
    recipients: Array<{
      email: string
      name?: string
      registration_id?: string
    }>
    subject: string
    html?: string
    text?: string
    from?: string
    camp_year_id?: string
    sender_id?: string
    filter_criteria?: CampCommunicationFilter
  }): Promise<{
    success: number
    failed: number
    communications: CampCommunication[]
    errors: string[]
  }> {
    const results = {
      success: 0,
      failed: 0,
      communications: [] as CampCommunication[],
      errors: [] as string[],
    }

    // Send emails in batches to avoid rate limits
    const batchSize = 10
    for (let i = 0; i < params.recipients.length; i += batchSize) {
      const batch = params.recipients.slice(i, i + batchSize)
      
      const batchPromises = batch.map(async (recipient) => {
        const result = await this.sendEmail({
          to: recipient.email,
          subject: params.subject,
          html: params.html,
          text: params.text,
          from: params.from,
          camp_year_id: params.camp_year_id,
          sender_id: params.sender_id,
          recipient_registration_id: recipient.registration_id,
        })

        if (result.success && result.communication) {
          results.success++
          results.communications.push(result.communication)
        } else {
          results.failed++
          results.errors.push(`${recipient.email}: ${result.error}`)
        }

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100))
      })

      await Promise.all(batchPromises)

      // Delay between batches
      if (i + batchSize < params.recipients.length) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    if (params.camp_year_id && params.filter_criteria) {
      try {
        const { recordCampCommunication } = await import('@/lib/actions/camp')
        await recordCampCommunication({
          camp_year_id: params.camp_year_id,
          communication_type: 'email',
          sender_id: params.sender_id,
          recipient_type: 'bulk',
          subject: params.subject,
          message_body: params.text || params.html || '',
          filter_criteria: params.filter_criteria,
          status: results.failed === 0 ? 'sent' : 'pending',
          metadata: {
            total_recipients: params.recipients.length,
            successful: results.success,
            failed: results.failed,
          },
          sent_at: new Date().toISOString(),
        })
      } catch (_) {}
    }

    return results
  }
}

export const emailService = new EmailService()


