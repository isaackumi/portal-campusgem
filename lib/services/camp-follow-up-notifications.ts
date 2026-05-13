import { EmailService } from '@/lib/services/email-service'
import { fetchUserFromConvex } from '@/lib/convex/core-bridge'

function appOrigin(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  return 'http://localhost:3000'
}

export async function notifyFollowUpAssignment(args: {
  assigneeUserId: string
  camperName?: string
  registrationId?: string
  campYearId?: string
  campYearLabel?: string
  assignedCount?: number
  sampleNames?: string[]
}): Promise<void> {
  const assignee = await fetchUserFromConvex(args.assigneeUserId)
  if (!assignee?.email) return

  const origin = appOrigin()
  const queueUrl = `${origin}/admin/camp-meeting/follow-up?mine=1`
  const count = args.assignedCount ?? 1
  const yearLabel = args.campYearLabel ? ` for Camp Meeting ${args.campYearLabel}` : ''
  const subject =
    count === 1 && args.camperName
      ? `Follow-up assigned: ${args.camperName}`
      : `You have ${count} new camp follow-up${count === 1 ? '' : 's'}${yearLabel}`

  const detailUrl =
    count === 1 && args.registrationId
      ? `${origin}/admin/camp-meeting/registrations/${args.registrationId}`
      : queueUrl

  const lines =
    count === 1 && args.camperName
      ? [
          `Hello ${assignee.full_name},`,
          '',
          `You were assigned to follow up with ${args.camperName}${yearLabel}.`,
          `Open the registration: ${detailUrl}`,
          `Or view your queue: ${queueUrl}`,
        ]
      : [
          `Hello ${assignee.full_name},`,
          '',
          `${count} camper${count === 1 ? '' : 's'} ${count === 1 ? 'was' : 'were'} assigned to you${yearLabel}.`,
          ...(args.sampleNames?.length
            ? ['', 'Includes:', ...args.sampleNames.map((name) => `- ${name}`)]
            : []),
          '',
          `Open your follow-up queue: ${queueUrl}`,
        ]

  const emailService = new EmailService()
  await emailService.sendEmail({
    to: assignee.email,
    subject,
    text: lines.join('\n'),
    camp_year_id: args.campYearId,
    recipient_registration_id: args.registrationId,
  })
}
