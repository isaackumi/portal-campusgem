'use server'

import type { ApiResponse } from '@/lib/types'

export async function syncAndBackfillCampFormExtrasAction(): Promise<
  ApiResponse<{
    forms_scanned: number
    fields_updated: number
    responses_scanned: number
    registrations_patched: number
  }>
> {
  try {
    const {
      syncCampMeetingFormPrefillKeysInConvex,
      backfillCampRegistrationExtrasInConvex,
    } = await import('@/lib/convex/forms-bridge')

    const synced = await syncCampMeetingFormPrefillKeysInConvex()
    const backfilled = await backfillCampRegistrationExtrasInConvex()

    return {
      data: {
        forms_scanned: synced.forms_scanned,
        fields_updated: synced.fields_updated,
        responses_scanned: backfilled.responses_scanned,
        registrations_patched: backfilled.registrations_patched,
      },
      error: null,
      loading: false,
    }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to sync camp form extras',
      loading: false,
    }
  }
}
