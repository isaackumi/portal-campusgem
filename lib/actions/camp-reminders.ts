'use server'

/**
 * Automatic camp reminders (7 days and 1 day before camp), sent by the daily cron
 * `/api/cron/camp-reminders`, plus the admin card that shows and toggles them.
 */
import { revalidatePath } from 'next/cache'
import { guard } from '@/lib/auth/action-guard'
import { hasPermission } from '@/lib/auth/roles'
import { siteOrigin } from '@/lib/site-url'
import type { CampRegistration, CampYear } from '@/lib/types'
import { confirmLinkUrl, sampleConfirmLinkUrl } from '@/lib/camp/confirm-link'
import {
  autoRemindersEnabled,
  daysUntilCamp,
  planReminders,
  reminderSchedule,
  reminderSmsFor,
  reminderStageFor,
  type ReminderKind,
  type ReminderSkipReason,
  type ReminderStage,
} from '@/lib/camp/camp-reminders'

function requireConvexEnv(): void {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    throw new Error('NEXT_PUBLIC_CONVEX_URL is required for camp data')
  }
}

async function resolveYear(yearId?: string | null): Promise<CampYear | null> {
  const bridge = await import('@/lib/convex/camp-bridge')
  return yearId ? bridge.fetchCampYearByIdFromConvex(yearId) : bridge.fetchActiveCampYearFromConvex()
}

export type CampReminderJobResult = {
  date: string
  camp_year: number | null
  days_left: number | null
  stage: ReminderStage | null
  skipped?: 'no_active_year' | 'disabled' | 'not_due' | 'nobody_due'
  dry_run: boolean
  planned: number
  sent: number
  failed: number
  /** Not attempted because the time budget ran out; picked up next run (7-day only). */
  deferred: number
  by_kind: Partial<Record<ReminderKind, number>>
  skipped_counts?: Record<ReminderSkipReason, number>
  errors: string[]
}

const TIME_BUDGET_MS = 50_000
const CONCURRENCY = 5

/**
 * Send whichever reminder is due today for the active camp year. Never texts anyone
 * twice: each successful send stamps `reminder_7d_sent_at` / `reminder_1d_sent_at`.
 * `stage` overrides the date check (manual runs only).
 */
export async function runCampRemindersJob(input?: {
  dry_run?: boolean
  stage?: ReminderStage
  now?: Date
}): Promise<{ data: CampReminderJobResult | null; error: string | null }> {
  try {
    // Runs as the system from the cron; a signed-in caller also needs to be able to send SMS.
    const user = await guard('camp.manage')
    if (user && !hasPermission(user.role, 'sms.send', user.permissions)) {
      throw new Error('You need the "Send SMS" permission to send reminders.')
    }
    requireConvexEnv()
    const started = Date.now()
    const now = input?.now ?? new Date()
    const dryRun = Boolean(input?.dry_run)
    const result: CampReminderJobResult = {
      date: now.toISOString().slice(0, 10),
      camp_year: null,
      days_left: null,
      stage: null,
      dry_run: dryRun,
      planned: 0,
      sent: 0,
      failed: 0,
      deferred: 0,
      by_kind: {},
      errors: [],
    }

    const year = await resolveYear(null)
    if (!year) return { data: { ...result, skipped: 'no_active_year' }, error: null }
    result.camp_year = year.year
    result.days_left = daysUntilCamp(year.start_date, now)
    if (!autoRemindersEnabled(year)) return { data: { ...result, skipped: 'disabled' }, error: null }
    const stage = input?.stage ?? reminderStageFor(result.days_left)
    result.stage = stage
    if (!stage) return { data: { ...result, skipped: 'not_due' }, error: null }

    const bridge = await import('@/lib/convex/camp-bridge')
    const { sendSms, isValidSmsPhone, isSmsConfigured, getSmsProviderStatus } = await import('@/lib/comms/sms-client')
    if (!dryRun && !isSmsConfigured() && !getSmsProviderStatus().forceMock && process.env.VERCEL_ENV === 'production') {
      throw new Error('SMS is not configured on this server. Add the Hubtel keys, then try again.')
    }

    const regs = await bridge.fetchRegistrationsFromConvex(year.id)
    const plan = planReminders(regs, stage, isValidSmsPhone)
    // Skip people who replied STOP to an SMS.
    const { loadSmsOptOutSet, isOptedOut } = await import('@/lib/comms/opt-out')
    const optedOut = await loadSmsOptOutSet()
    if (optedOut.size) plan.send = plan.send.filter((p) => !isOptedOut(optedOut, p.registration.phone))
    result.planned = plan.send.length
    result.skipped_counts = plan.skipped
    if (plan.send.length === 0) return { data: { ...result, skipped: 'nobody_due' }, error: null }

    const tokens = dryRun ? new Map<string, string>() : await bridge.ensureConfirmTokensInConvex(plan.send.map((p) => p.registration.id))
    const origin = siteOrigin()
    const senderId = process.env.CAMP_SYSTEM_SENDER_ID?.trim() || 'system-camp-reminders'

    const sendOne = async ({ registration, kind }: (typeof plan.send)[number]): Promise<boolean> => {
      const token = tokens.get(registration.id)
      const link = token ? confirmLinkUrl(origin, token) : sampleConfirmLinkUrl(origin)
      const body = reminderSmsFor(registration, kind, {
        campYear: year.year,
        startDate: year.start_date,
        venue: year.venue,
        link,
      })
      const sms = await sendSms(registration.phone, body, { dryRun })
      try {
        await bridge.logCampCommunicationInConvex({
          camp_year_id: year.id,
          communication_type: 'sms',
          sender_id: senderId,
          recipient_type: 'bulk',
          recipient_registration_id: registration.id,
          recipient_phone: sms.normalizedPhone ?? registration.phone,
          message_body: body,
          status: sms.success ? 'sent' : 'failed',
          provider_message_id: sms.messageId,
          error_message: sms.error,
          metadata: {
            kind: 'auto_reminder',
            stage,
            reminder_kind: kind,
            recipient_name: registration.full_name,
            dry_run: dryRun || Boolean(sms.dryRun),
          },
          sent_at: sms.success ? new Date().toISOString() : undefined,
        })
      } catch (err) {
        console.warn('[camp-reminders] could not log SMS', err)
      }
      if (!sms.success) {
        result.errors.push(`${registration.full_name}: ${sms.error ?? 'SMS failed'}`)
        return false
      }
      result.by_kind[kind] = (result.by_kind[kind] ?? 0) + 1
      return true
    }

    for (let i = 0; i < plan.send.length; i += CONCURRENCY) {
      if (Date.now() - started > TIME_BUDGET_MS) {
        result.deferred = plan.send.length - i
        break
      }
      const chunk = plan.send.slice(i, i + CONCURRENCY)
      const outcomes = await Promise.all(chunk.map((item) => sendOne(item).catch(() => false)))
      const okIds = chunk.filter((_, k) => outcomes[k]).map((item) => item.registration.id)
      result.sent += okIds.length
      result.failed += chunk.length - okIds.length
      // Stamp as we go, so a timeout mid-run never causes a repeat tomorrow.
      if (okIds.length && !dryRun) await bridge.markRemindersSentInConvex(okIds, stage)
    }

    if (result.errors.length > 20) result.errors = [...result.errors.slice(0, 20), `…and ${result.errors.length - 20} more`]
    try {
      revalidatePath('/admin/camp-meeting/communications')
    } catch {
      // not in a request scope (cron)
    }
    return { data: result, error: null }
  } catch (error: unknown) {
    return { data: null, error: error instanceof Error ? error.message : 'Camp reminders failed' }
  }
}

export type ReminderPreview = {
  kind: ReminderKind
  label: string
  /** Who this sample is written for. */
  sampleName: string
  text: string
  count: number
}

export type CampRemindersStatus = {
  year: Pick<CampYear, 'id' | 'year' | 'start_date' | 'venue'>
  enabled: boolean
  /** Explicitly set on the year (false = on by default). */
  explicit: boolean
  days_left: number | null
  sevenDay: { runAt: string | null; count: number; alreadySent: number }
  dayBefore: { runAt: string | null; count: number; alreadySent: number }
  previews: ReminderPreview[]
  smsConfigured: boolean
}

const KIND_LABEL: Record<ReminderKind, string> = {
  confirm: '7 days before · not yet confirmed',
  see_you: '7 days before · confirmed',
  day_before: 'Day before · confirmed',
  day_before_maybe: 'Day before · not sure',
}

export async function getCampRemindersStatusAction(
  yearId?: string | null
): Promise<{ data: CampRemindersStatus | null; error: string | null }> {
  try {
    await guard('camp.manage')
    requireConvexEnv()
    const year = await resolveYear(yearId)
    if (!year) return { data: null, error: null }
    const bridge = await import('@/lib/convex/camp-bridge')
    const { isValidSmsPhone, isSmsConfigured } = await import('@/lib/comms/sms-client')
    const regs = await bridge.fetchRegistrationsFromConvex(year.id)
    const now = new Date()
    const seven = planReminders(regs, '7d', isValidSmsPhone)
    const oneDay = planReminders(regs, '1d', isValidSmsPhone)
    const schedule = reminderSchedule(year.start_date, now)
    const origin = siteOrigin()

    const previews: ReminderPreview[] = []
    const kinds: Array<{ kind: ReminderKind; from: Array<{ registration: CampRegistration; kind: ReminderKind }> }> = [
      { kind: 'confirm', from: seven.send },
      { kind: 'see_you', from: seven.send },
      { kind: 'day_before', from: oneDay.send },
      { kind: 'day_before_maybe', from: oneDay.send },
    ]
    for (const { kind, from } of kinds) {
      const matching = from.filter((p) => p.kind === kind)
      const sample = matching[0]?.registration ?? { first_name: 'Ama', full_name: 'Ama Mensah' }
      previews.push({
        kind,
        label: KIND_LABEL[kind],
        sampleName: matching[0] ? matching[0].registration.full_name : 'Example',
        count: matching.length,
        text: reminderSmsFor(sample, kind, {
          campYear: year.year,
          startDate: year.start_date,
          venue: year.venue,
          link: sampleConfirmLinkUrl(origin),
        }),
      })
    }

    return {
      data: {
        year: { id: year.id, year: year.year, start_date: year.start_date, venue: year.venue },
        enabled: autoRemindersEnabled(year),
        explicit: typeof year.auto_reminders === 'boolean',
        days_left: daysUntilCamp(year.start_date, now),
        sevenDay: { runAt: schedule.sevenDay, count: seven.send.length, alreadySent: seven.skipped.already_sent },
        dayBefore: { runAt: schedule.dayBefore, count: oneDay.send.length, alreadySent: oneDay.skipped.already_sent },
        previews,
        smsConfigured: isSmsConfigured(),
      },
      error: null,
    }
  } catch (error: unknown) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to load reminders' }
  }
}

export async function setCampAutoRemindersAction(
  yearId: string,
  enabled: boolean
): Promise<{ error: string | null }> {
  try {
    await guard('camp.manage')
    requireConvexEnv()
    if (!yearId) throw new Error('Choose a camp year.')
    const { setCampYearAutoRemindersInConvex } = await import('@/lib/convex/camp-bridge')
    await setCampYearAutoRemindersInConvex(yearId, Boolean(enabled))
    revalidatePath('/admin/camp-meeting')
    return { error: null }
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : 'Failed to update reminders' }
  }
}
