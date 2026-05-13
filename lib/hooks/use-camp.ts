import { useCallback } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { getActiveCampYear, getCampRegistrations, getCampYearById } from '@/lib/actions/camp'
import { CampRegistration, CampYear } from '@/lib/types'

async function loadCampYear(campYearId?: string | null): Promise<CampYear | null> {
  if (campYearId) {
    const { data, error } = await getCampYearById(campYearId)
    if (error) throw new Error(error)
    if (!data) throw new Error('Camp year not found')
    return data
  }

  const { data, error } = await getActiveCampYear()
  if (error) throw new Error(error)
  return data
}

async function loadCampRegistrations(yearId: string): Promise<CampRegistration[]> {
  const result = await getCampRegistrations(yearId)
  if (result.error) {
    throw new Error(result.error)
  }
  return result.data ?? []
}

/**
 * Hook to fetch and manage active camp year
 */
export function useActiveCampYear() {
  const query = useQuery({
    queryKey: ['camp-year', 'active'],
    queryFn: async () => {
      const { data, error } = await getActiveCampYear()
      if (error) throw new Error(error)
      return data
    },
    staleTime: 30_000,
    retry: 1,
  })

  return {
    campYear: query.data ?? null,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : query.error ? String(query.error) : null,
    refetch: () => query.refetch(),
  }
}

/**
 * Hook to fetch and manage camp registrations
 * Automatically fetches registrations for the active camp year
 */
export function useCampRegistrations(campYearId?: string | null) {
  const yearKey = campYearId ?? 'active'

  const yearQuery = useQuery({
    queryKey: ['camp-year', yearKey],
    queryFn: () => loadCampYear(campYearId),
    staleTime: 30_000,
    retry: 1,
  })

  const registrationsQuery = useQuery({
    queryKey: ['camp-registrations', yearQuery.data?.id ?? yearKey],
    queryFn: () => loadCampRegistrations(yearQuery.data!.id),
    enabled: Boolean(yearQuery.data?.id),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    retry: 1,
  })

  const refresh = useCallback(async () => {
    await Promise.all([yearQuery.refetch(), registrationsQuery.refetch()])
  }, [yearQuery.refetch, registrationsQuery.refetch])

  const yearError =
    yearQuery.error instanceof Error
      ? yearQuery.error.message
      : yearQuery.error
        ? String(yearQuery.error)
        : null
  const registrationsError =
    registrationsQuery.error instanceof Error
      ? registrationsQuery.error.message
      : registrationsQuery.error
        ? String(registrationsQuery.error)
        : null

  return {
    registrations: registrationsQuery.data ?? [],
    campYear: yearQuery.data ?? null,
    loading:
      yearQuery.isLoading ||
      (Boolean(yearQuery.data?.id) && registrationsQuery.isLoading && !registrationsQuery.data),
    error: yearError ?? registrationsError,
    refetch: refresh,
    refresh,
  }
}

/**
 * Hook to fetch camp registrations for a specific camp year
 */
export function useCampRegistrationsByYear(campYearId: string | null) {
  const query = useQuery({
    queryKey: ['camp-registrations', campYearId],
    queryFn: () => loadCampRegistrations(campYearId!),
    enabled: Boolean(campYearId),
    staleTime: 30_000,
    retry: 1,
  })

  return {
    registrations: query.data ?? [],
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : query.error ? String(query.error) : null,
    refetch: () => query.refetch(),
  }
}
