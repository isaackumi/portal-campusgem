'use client'

import { useCallback } from 'react'
import { useAuth } from '@/components/providers'
import { useActiveCampYear } from '@/lib/hooks/use-camp'
import { buildCampFollowUpMessage } from '@/lib/camp/follow-up-message'

/**
 * Returns a function that builds the pre-filled WhatsApp/SMS follow-up message for a
 * registrant, signed by whoever is logged in and naming the active camp.
 */
export function useCampFollowUpMessage() {
  const { user } = useAuth()
  const { campYear } = useActiveCampYear()
  return useCallback(
    (registrant: { first_name?: string | null; full_name?: string | null }) =>
      buildCampFollowUpMessage({ registrant, callerName: user?.full_name, camp: campYear }),
    [user?.full_name, campYear]
  )
}
