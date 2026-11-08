'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/components/providers'
import { AccessDenied } from '@/components/auth/access-denied'
import { CallHistoryView } from '@/components/calls/call-history-view'
import { loadCallHistoryAction } from '@/lib/actions/call-center'

/** Who called whom, what they said and when, grouped by session; and how each caller is doing. */
export default function CallHistoryPage() {
  const { can } = useAuth()
  const router = useRouter()
  const params = useSearchParams()
  const yearParam = params?.get('year') ?? null

  const history = useQuery({
    queryKey: ['call-history', yearParam],
    enabled: can('camp.manage'),
    queryFn: async () => {
      const res = await loadCallHistoryAction(yearParam)
      if (res.error || !res.data) throw new Error(res.error ?? 'Could not load the call history')
      return res.data
    },
    staleTime: 30_000,
  })

  if (!can('camp.manage')) return <AccessDenied permission="camp.manage" />

  return (
    <CallHistoryView
      data={history.data}
      loading={history.isLoading}
      error={history.error ? (history.error instanceof Error ? history.error.message : 'Could not load the call history.') : null}
      onYearChange={(id) => router.push(`/admin/camp-meeting/calls/history?year=${id}`)}
    />
  )
}
