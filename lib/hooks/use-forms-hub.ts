'use client'

import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { getFormsHubData, type FormsHubData } from '@/lib/actions/forms-hub'

export const formsHubQueryKey = (groupId: string) => ['forms-hub', groupId || 'all'] as const

async function fetchFormsHub(groupId: string): Promise<FormsHubData> {
  const { data, error } = await getFormsHubData(groupId || undefined)
  if (error || !data) {
    throw new Error(error ?? 'Failed to load Forms Hub')
  }
  return data
}

export function useFormsHub(groupId: string, enabled = true) {
  const query = useQuery({
    queryKey: formsHubQueryKey(groupId),
    queryFn: () => fetchFormsHub(groupId),
    enabled,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  })

  return {
    forms: query.data?.forms ?? [],
    groups: query.data?.groups ?? [],
    creatorsById: query.data?.creatorsById ?? {},
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error instanceof Error ? query.error.message : query.error ? String(query.error) : null,
    refetch: query.refetch,
  }
}

export function useInvalidateFormsHub() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: ['forms-hub'] })
}
