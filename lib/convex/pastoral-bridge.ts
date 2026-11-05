import 'server-only'

import { getConvexHttpClient } from '@/lib/convex/http-client'
import { requireCoreServerSecret } from '@/lib/convex/core-bridge'
import { api } from '@/convex/_generated/api'
import type { AttendanceRowLite } from '@/lib/pastoral/absence'
import {
  DEFAULT_PASTORAL_SETTINGS,
  type PastoralSettings,
  type PastoralSnapshot,
} from '@/lib/pastoral/plan'

export type StoredPastoralSettings = PastoralSettings & {
  updated_at: number | null
  last_run_at: number | null
  last_run_summary: unknown
}

export async function fetchPastoralSettingsFromConvex(): Promise<StoredPastoralSettings> {
  const row = (await getConvexHttpClient().query(api.pastoral.getPastoralSettingsWithSecret, {
    secret: requireCoreServerSecret(),
  })) as Record<string, unknown> | null
  if (!row) return { ...DEFAULT_PASTORAL_SETTINGS, updated_at: null, last_run_at: null, last_run_summary: null }
  return {
    configured: true,
    alerts_enabled: Boolean(row.alerts_enabled),
    digest_enabled: Boolean(row.digest_enabled),
    weeks_threshold: Number(row.weeks_threshold) || DEFAULT_PASTORAL_SETTINGS.weeks_threshold,
    fallback_user_ids: Array.isArray(row.fallback_user_ids) ? (row.fallback_user_ids as string[]) : [],
    updated_at: typeof row.updated_at === 'number' ? row.updated_at : null,
    last_run_at: typeof row.last_run_at === 'number' ? row.last_run_at : null,
    last_run_summary: row.last_run_summary ?? null,
  }
}

export async function savePastoralSettingsInConvex(
  settings: Omit<PastoralSettings, 'configured'> & { updated_by?: string }
): Promise<void> {
  await getConvexHttpClient().mutation(api.pastoral.savePastoralSettingsWithSecret, {
    secret: requireCoreServerSecret(),
    alerts_enabled: settings.alerts_enabled,
    digest_enabled: settings.digest_enabled,
    weeks_threshold: settings.weeks_threshold,
    fallback_user_ids: settings.fallback_user_ids,
    updated_by: settings.updated_by,
  })
}

export async function recordPastoralRunInConvex(summary: Record<string, unknown>): Promise<void> {
  await getConvexHttpClient().mutation(api.pastoral.recordPastoralRunWithSecret, {
    secret: requireCoreServerSecret(),
    summary,
  })
}

export async function fetchPastoralSnapshotFromConvex(since: string): Promise<PastoralSnapshot> {
  const client = getConvexHttpClient()
  const secret = requireCoreServerSecret()
  const [people, attendance] = await Promise.all([
    client.query(api.pastoral.getPastoralPeopleWithSecret, { secret }),
    client.query(api.pastoral.listPastoralAttendanceWithSecret, { secret, since }),
  ])
  return { ...(people as Omit<PastoralSnapshot, 'attendance'>), attendance: attendance as AttendanceRowLite[] }
}

export async function recordPastoralAlertsInConvex(
  alerts: Array<{ member_id: string; streak: number; last_seen: string | null; recipients: string[] }>
): Promise<void> {
  if (!alerts.length) return
  await getConvexHttpClient().mutation(api.pastoral.recordPastoralAlertsWithSecret, {
    secret: requireCoreServerSecret(),
    alerts: alerts.map((a) => ({
      member_id: a.member_id,
      streak: a.streak,
      last_seen: a.last_seen ?? undefined,
      recipients: a.recipients,
    })),
  })
}
