/**
 * Registration Notification Service
 * Handles email and SMS notifications for camp registrations (Firebase only, no Supabase).
 */

import { db } from '@/lib/firebase/server'
import { EmailService } from './email-service'
import { CampRegistration } from '@/lib/types'

const emailService = new EmailService()

type EmailNotifConfig = {
  recipient_emails?: string[]
  template_subject?: string
  template_body?: string
}

type SmsNotifConfig = {
  recipient_phones?: string[]
  template_body?: string
}

export async function sendRegistrationNotifications(registration: CampRegistration): Promise<{
  emailSent: boolean
  smsSent: boolean
  errors: string[]
}> {
  const errors: string[] = []
  let emailSent = false
  let smsSent = false

  try {
    const fullName = registration.full_name || `${registration.first_name} ${registration.last_name}`.trim()
    const campYear = (registration.camp_year as { year?: number })?.year ?? new Date().getFullYear()

    // Optional: load config from Firestore notification_config
    let emailConfig: EmailNotifConfig | null = null
    let smsConfig: SmsNotifConfig | null = null
    try {
      const emailSnap = await db
        .collection('notification_config')
        .where('camp_year_id', '==', registration.camp_year_id)
        .where('notification_type', '==', 'registration_email')
        .where('enabled', '==', true)
        .limit(1)
        .get()
      if (!emailSnap.empty) emailConfig = emailSnap.docs[0].data() as EmailNotifConfig
      const smsSnap = await db
        .collection('notification_config')
        .where('camp_year_id', '==', registration.camp_year_id)
        .where('notification_type', '==', 'registration_sms')
        .where('enabled', '==', true)
        .limit(1)
        .get()
      if (!smsSnap.empty) smsConfig = smsSnap.docs[0].data() as SmsNotifConfig
    } catch (_) {
      // no config collections
    }

    if (emailConfig?.recipient_emails?.length) {
      const subject = emailConfig.template_subject || `New Camp Meeting Registration - ${campYear}`
      const messageBody = (emailConfig.template_body || '')
        .replace(/\{\{name\}\}/g, fullName)
        .replace(/\{\{role\}\}/g, registration.role || 'Participant')
        .replace(/\{\{campYear\}\}/g, String(campYear))
        .replace(/\{\{phone\}\}/g, registration.phone)
        .replace(/\{\{email\}\}/g, registration.email || 'N/A')

      for (const recipientEmail of emailConfig.recipient_emails) {
        try {
          const result = await emailService.sendEmail({
            to: recipientEmail,
            subject,
            text: messageBody,
            camp_year_id: registration.camp_year_id,
            recipient_registration_id: registration.id
          })
          if (result.success) {
            emailSent = true
            try {
              await db.collection('email_logs').add({
                camp_year_id: registration.camp_year_id,
                registration_id: registration.id,
                recipient_email: recipientEmail,
                subject,
                message_body: messageBody,
                email_type: 'registration_notification',
                status: 'sent',
                sent_at: new Date()
              })
            } catch (_) {}
          } else {
            errors.push(`Failed to send email to ${recipientEmail}: ${result.error}`)
          }
        } catch (err) {
          errors.push(`Error sending email to ${recipientEmail}: ${err instanceof Error ? err.message : String(err)}`)
        }
      }
    } else {
      const defaultEmail = process.env.ADMIN_NOTIFICATION_EMAIL
      if (defaultEmail) {
        try {
          const subject = `New Camp Meeting Registration - ${campYear}`
          const messageBody = `New registration received:\n\nName: ${fullName}\nRole: ${registration.role || 'Participant'}\nPhone: ${registration.phone}\nEmail: ${registration.email || 'N/A'}\nCamp Year: ${campYear}`
          const result = await emailService.sendEmail({
            to: defaultEmail,
            subject,
            text: messageBody,
            camp_year_id: registration.camp_year_id,
            recipient_registration_id: registration.id
          })
          if (result.success) emailSent = true
        } catch (err) {
          errors.push(`Error sending default email: ${err instanceof Error ? err.message : String(err)}`)
        }
      }
    }

    if (smsConfig?.recipient_phones?.length) {
      const messageBody = (smsConfig.template_body || '')
        .replace(/\{\{name\}\}/g, fullName)
        .replace(/\{\{role\}\}/g, registration.role || 'Participant')
        .replace(/\{\{campYear\}\}/g, String(campYear))
        .replace(/\{\{phone\}\}/g, registration.phone)
      for (const recipientPhone of smsConfig.recipient_phones) {
        try {
          await db.collection('sms_logs').add({
            camp_year_id: registration.camp_year_id,
            registration_id: registration.id,
            recipient_phone: recipientPhone,
            message_body: messageBody,
            sms_type: 'registration_notification',
            status: 'pending',
            provider_name: 'system',
            metadata: { note: 'SMS provider integration needed' },
            created_at: new Date()
          })
          smsSent = true
        } catch (err) {
          errors.push(`Error logging SMS to ${recipientPhone}: ${err instanceof Error ? err.message : String(err)}`)
        }
      }
    }
  } catch (err) {
    errors.push(`Error in notification service: ${err instanceof Error ? err.message : String(err)}`)
  }

  return { emailSent, smsSent, errors }
}
