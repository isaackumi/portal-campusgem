/**
 * Registration notification helpers for camp registrations (Convex-backed app).
 * Uses ADMIN_NOTIFICATION_EMAIL when set; optional per-year templates can be added later via Convex.
 */

import { EmailService } from './email-service'
import type { CampRegistration } from '@/lib/types'

const emailService = new EmailService()

export async function sendRegistrationNotifications(registration: CampRegistration): Promise<{
  emailSent: boolean
  smsSent: boolean
  errors: string[]
}> {
  const errors: string[] = []
  let emailSent = false
  const smsSent = false

  try {
    const fullName = registration.full_name || `${registration.first_name} ${registration.last_name}`.trim()
    const campYear = (registration.camp_year as { year?: number })?.year ?? new Date().getFullYear()

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
          recipient_registration_id: registration.id,
        })
        if (result.success) emailSent = true
      } catch (err) {
        errors.push(`Error sending default email: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  } catch (err) {
    errors.push(`Error in notification service: ${err instanceof Error ? err.message : String(err)}`)
  }

  return { emailSent, smsSent, errors }
}
