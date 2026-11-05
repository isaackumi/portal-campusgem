'use server'

import { revalidatePath } from 'next/cache'
import { guard, optionalSessionUser } from '@/lib/auth/action-guard'
import {
  CAMP_OFFLINE_SYNC_BATCH,
  isNetworkError,
  isPermanentCheckInError,
  type CampCheckInSyncItem,
  type CampCheckInSyncResult,
} from '@/lib/camp/offline-checkin-queue'

const METHODS = new Set(['qr', 'manual', 'code', 'arrival'])

/**
 * Replay check-ins saved on a desk phone while offline. Safe to repeat: the server keeps one
 * attendance per session + camper, so an item that already landed comes back as "already".
 * The usher recorded as `checked_in_by` is the signed-in caller, not anything the phone sent.
 */
export async function syncOfflineCampCheckInsAction(
  items: CampCheckInSyncItem[]
): Promise<{ data: CampCheckInSyncResult[] | null; error: string | null }> {
  const user = (await guard('camp.manage')) ?? (await optionalSessionUser())
  if (!Array.isArray(items)) return { data: null, error: 'Nothing to sync.' }
  const batch = items.slice(0, CAMP_OFFLINE_SYNC_BATCH)
  const { recordCampSessionCheckInInConvex } = await import('@/lib/convex/camp-bridge')

  const results: CampCheckInSyncResult[] = []
  for (const item of batch) {
    const client_uuid = typeof item?.client_uuid === 'string' ? item.client_uuid : ''
    if (
      !client_uuid ||
      typeof item.registration_id !== 'string' ||
      typeof item.activity_id !== 'string' ||
      !METHODS.has(item.check_in_method)
    ) {
      results.push({ client_uuid, ok: false, error: 'Invalid check-in.', retryable: false })
      continue
    }
    try {
      const res = await recordCampSessionCheckInInConvex({
        activity_id: item.activity_id,
        registration_id: item.registration_id,
        performed_by: user?.id ?? 'system',
        check_in_method: item.check_in_method,
        checked_in_at: typeof item.checked_in_at === 'number' ? item.checked_in_at : undefined,
      })
      results.push({ client_uuid, ok: true, already_checked_in: res.already_checked_in })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Check-in failed'
      results.push({
        client_uuid,
        ok: false,
        error: message,
        retryable: isNetworkError(error) || !isPermanentCheckInError(message),
      })
    }
  }

  if (results.some((r) => r.ok)) {
    revalidatePath('/admin/camp-meeting/scan')
    revalidatePath('/admin/camp-meeting/registrations')
  }
  return { data: results, error: null }
}
