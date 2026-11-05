'use server'

/**
 * Missed-church alerts and the weekly leader summary: one text per group leader,
 * sent by the Monday cron `/api/cron/pastoral-alerts`, plus the /admin/pastoral-care page.
 */
import { revalidatePath } from 'next/cache'
import { guard } from '@/lib/auth/action-guard'
import { hasPermission, isStaffRole } from '@/lib/auth/roles'
import { smsSegmentInfo } from '@/lib/comms/sms-segments'
import { toIsoDate } from '@/lib/pastoral/absence'
import type { AppUser } from '@/lib/types'
import {
  planPastoralRun,
  type LapsedMember,
  type PastoralSettings,
  type PlannedMessage,
} from '@/lib/pastoral/plan'

/** Attendance history read per run: enough for the 12-week alert cap plus the 8-week look-back. */
const HISTORY_WEEKS = 30
const TIME_BUDGET_MS = 50_000
const CONCURRENCY = 5

function requireConvexEnv(): void {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) throw new Error('NEXT_PUBLIC_CONVEX_URL is required')
}

async function loadPlan(settings: PastoralSettings, now: Date) {
  const bridge = await import('@/lib/convex/pastoral-bridge')
  const { isValidSmsPhone } = await import('@/lib/comms/sms-client')
  const since = toIsoDate(new Date(now.getTime() - HISTORY_WEEKS * 7 * 86_400_000))
  const snapshot = await bridge.fetchPastoralSnapshotFromConvex(since)
  const plan = planPastoralRun(snapshot, settings, { now, isValidPhone: isValidSmsPhone })
  for (const m of plan.messages) m.segments = smsSegmentInfo(m.text).segments
  return { plan, snapshot }
}

export type PastoralJobResult = {
  date: string
  dry_run: boolean
  skipped?: 'not_configured' | 'disabled' | 'nothing_to_send'
  lapsed: number
  planned: number
  sent: number
  failed: number
  deferred: number
  alerts_recorded: number
  errors: string[]
  messages?: Array<Pick<PlannedMessage, 'name' | 'phone' | 'text' | 'segments'>>
}

/**
 * The weekly run. On a schedule (no signed-in user) it only sends once an admin has saved
 * the settings. A signed-in caller needs Manage members, and Send SMS to actually send.
 * Each alert is recorded only after a text carrying it went out, so a failed run repeats.
 */
export async function runPastoralCareJob(input?: {
  dry_run?: boolean
  now?: Date
}): Promise<{ data: PastoralJobResult | null; error: string | null }> {
  try {
    const user = await guard('members.manage')
    return await runJob(user, input)
  } catch (error: unknown) {
    return { data: null, error: error instanceof Error ? error.message : 'Pastoral care run failed' }
  }
}

/** `user` is null for the scheduled run (asSystem). */
async function runJob(
  user: AppUser | null,
  input?: { dry_run?: boolean; now?: Date }
): Promise<{ data: PastoralJobResult | null; error: string | null }> {
  try {
    const dryRun = Boolean(input?.dry_run)
    if (user && !dryRun && !hasPermission(user.role, 'sms.send', user.permissions)) {
      throw new Error('You need the "Send SMS" permission to send these texts.')
    }
    requireConvexEnv()
    const started = Date.now()
    const now = input?.now ?? new Date()
    const result: PastoralJobResult = {
      date: toIsoDate(now),
      dry_run: dryRun,
      lapsed: 0,
      planned: 0,
      sent: 0,
      failed: 0,
      deferred: 0,
      alerts_recorded: 0,
      errors: [],
    }

    const bridge = await import('@/lib/convex/pastoral-bridge')
    const settings = await bridge.fetchPastoralSettingsFromConvex()
    // No surprise texts on first deploy: scheduled runs wait for the settings to be saved.
    if (!user && !settings.configured) return { data: { ...result, skipped: 'not_configured' }, error: null }
    if (!settings.alerts_enabled && !settings.digest_enabled) return { data: { ...result, skipped: 'disabled' }, error: null }

    const { sendSms, isSmsConfigured, getSmsProviderStatus } = await import('@/lib/comms/sms-client')
    if (!dryRun && !isSmsConfigured() && !getSmsProviderStatus().forceMock && process.env.VERCEL_ENV === 'production') {
      throw new Error('SMS is not configured on this server. Add the Hubtel keys, then try again.')
    }

    const { plan } = await loadPlan(settings, now)
    result.lapsed = plan.lapsed.length
    result.planned = plan.messages.length
    if (dryRun) result.messages = plan.messages.map(({ name, phone, text, segments }) => ({ name, phone, text, segments }))
    if (!plan.messages.length) return { data: { ...result, skipped: 'nothing_to_send' }, error: null }

    const { logCommunicationInConvex } = await import('@/lib/convex/comms-bridge')
    const senderId = user?.id ?? 'system-pastoral-care'
    const batchId = `pastoral-${result.date}`
    const deliveredTo = new Map<string, string[]>()

    const sendOne = async (msg: PlannedMessage): Promise<boolean> => {
      const sms = await sendSms(msg.phone, msg.text, { dryRun })
      if (!dryRun) {
        try {
          await logCommunicationInConvex({
            module: 'church',
            channel: 'sms',
            audience_type: 'individual',
            sender_id: senderId,
            batch_id: batchId,
            recipient_name: msg.name,
            recipient_phone: sms.normalizedPhone ?? msg.phone,
            recipient_entity_type: 'manual',
            recipient_entity_id: msg.user_id,
            message_body: msg.text,
            status: sms.success ? 'sent' : 'failed',
            provider_message_id: sms.messageId,
            error_message: sms.error,
            metadata: { kind: 'pastoral_weekly', alert_member_ids: msg.alert_member_ids, groups: msg.groups },
            sent_at: sms.success ? new Date().toISOString() : undefined,
          })
        } catch (err) {
          console.warn('[pastoral-care] could not log SMS', err)
        }
      }
      if (!sms.success) {
        result.errors.push(`${msg.name}: ${sms.error ?? 'SMS failed'}`)
        return false
      }
      for (const id of msg.alert_member_ids) deliveredTo.set(id, [...(deliveredTo.get(id) ?? []), msg.user_id])
      return true
    }

    for (let i = 0; i < plan.messages.length; i += CONCURRENCY) {
      if (Date.now() - started > TIME_BUDGET_MS) {
        result.deferred = plan.messages.length - i
        break
      }
      const chunk = plan.messages.slice(i, i + CONCURRENCY)
      const outcomes = await Promise.all(chunk.map((m) => sendOne(m).catch(() => false)))
      const ok = outcomes.filter(Boolean).length
      result.sent += ok
      result.failed += chunk.length - ok
    }

    if (!dryRun) {
      const toRecord = plan.alerts
        .filter((a) => deliveredTo.has(a.member_id))
        .map((a) => ({ ...a, recipients: deliveredTo.get(a.member_id) ?? [] }))
      await bridge.recordPastoralAlertsInConvex(toRecord)
      result.alerts_recorded = toRecord.length
      await bridge
        .recordPastoralRunInConvex({
          date: result.date,
          sent: result.sent,
          failed: result.failed,
          deferred: result.deferred,
          alerts: result.alerts_recorded,
          by: user?.full_name ?? 'schedule',
        })
        .catch(() => undefined)
    }

    if (result.errors.length > 20) result.errors = [...result.errors.slice(0, 20), `…and ${result.errors.length - 20} more`]
    try {
      revalidatePath('/admin/pastoral-care')
    } catch {
      // not in a request scope (cron)
    }
    return { data: result, error: null }
  } catch (error: unknown) {
    return { data: null, error: error instanceof Error ? error.message : 'Pastoral care run failed' }
  }
}

export type PastoralContactOption = { id: string; full_name: string; role: string }

export type PastoralCareOverview = {
  settings: Omit<PastoralSettings, 'configured'> & { configured: boolean }
  last_run_at: number | null
  last_run_summary: Record<string, unknown> | null
  /** Scheduled runs will actually send. */
  scheduled_active: boolean
  as_of: string
  last_sunday: string
  lapsed: LapsedMember[]
  preview: PlannedMessage[]
  skipped: { no_phone: Array<{ user_id: string; name: string }>; no_recipient: string[] }
  contacts: PastoralContactOption[]
  sms_configured: boolean
}

/** Settings, this week's preview (dry run) and the current lapsed list. */
export async function getPastoralCareOverviewAction(): Promise<{
  data: PastoralCareOverview | null
  error: string | null
}> {
  try {
    await guard('members.manage')
    requireConvexEnv()
    const bridge = await import('@/lib/convex/pastoral-bridge')
    const { isSmsConfigured } = await import('@/lib/comms/sms-client')
    const stored = await bridge.fetchPastoralSettingsFromConvex()
    const now = new Date()
    const { plan, snapshot } = await loadPlan(stored, now)
    const fallback = new Set(stored.fallback_user_ids)
    const contacts = snapshot.users
      .filter((u) => isStaffRole(u.role) || fallback.has(u.id))
      .map((u) => ({ id: u.id, full_name: u.full_name, role: u.role }))
      .sort((a, b) => a.full_name.localeCompare(b.full_name))
    const { configured, alerts_enabled, digest_enabled, weeks_threshold, fallback_user_ids } = stored
    return {
      data: {
        settings: { configured, alerts_enabled, digest_enabled, weeks_threshold, fallback_user_ids },
        last_run_at: stored.last_run_at,
        last_run_summary: (stored.last_run_summary as Record<string, unknown> | null) ?? null,
        scheduled_active: configured && (alerts_enabled || digest_enabled),
        as_of: plan.as_of,
        last_sunday: plan.last_sunday,
        lapsed: plan.lapsed,
        preview: plan.messages,
        skipped: plan.skipped,
        contacts,
        sms_configured: isSmsConfigured(),
      },
      error: null,
    }
  } catch (error: unknown) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to load pastoral care' }
  }
}

export async function savePastoralSettingsAction(input: {
  alerts_enabled: boolean
  digest_enabled: boolean
  weeks_threshold: number
  fallback_user_ids: string[]
}): Promise<{ error: string | null }> {
  try {
    const user = await guard('members.manage')
    requireConvexEnv()
    const weeks = Math.round(Number(input.weeks_threshold))
    if (!Number.isFinite(weeks) || weeks < 2 || weeks > 8) throw new Error('Choose between 2 and 8 Sundays.')
    const ids = Array.from(new Set((input.fallback_user_ids ?? []).filter((id) => typeof id === 'string' && id))).slice(0, 20)
    const { savePastoralSettingsInConvex } = await import('@/lib/convex/pastoral-bridge')
    await savePastoralSettingsInConvex({
      alerts_enabled: Boolean(input.alerts_enabled),
      digest_enabled: Boolean(input.digest_enabled),
      weeks_threshold: weeks,
      fallback_user_ids: ids,
      updated_by: user?.id,
    })
    revalidatePath('/admin/pastoral-care')
    return { error: null }
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : 'Failed to save settings' }
  }
}

/** "Send now" on the page: same as the Monday run, needs Send SMS too. */
export async function sendPastoralTextsNowAction(): Promise<{ data: PastoralJobResult | null; error: string | null }> {
  try {
    const user = await guard('members.manage')
    // A second guard() would pass trivially inside the trusted scope, so check directly.
    if (user && !hasPermission(user.role, 'sms.send', user.permissions)) {
      throw new Error('You need the "Send SMS" permission to send these texts.')
    }
    return await runJob(user, { dry_run: false })
  } catch (error: unknown) {
    return { data: null, error: error instanceof Error ? error.message : 'Pastoral care run failed' }
  }
}
