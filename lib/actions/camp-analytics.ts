'use server'

import {
  buildCampAnalyticsReport,
  type CampAnalyticsReport,
} from '@/lib/camp/analytics'
import type { CampRegistration, CampYear } from '@/lib/types'

function requireConvexEnv(): void {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    throw new Error('NEXT_PUBLIC_CONVEX_URL is required for camp analytics')
  }
}

export async function getCampAnalyticsReport(selectedYearId: string | 'all'): Promise<{
  data: {
    report: CampAnalyticsReport
    years: CampYear[]
    selectedYearId: string | 'all'
  } | null
  error: string | null
}> {
  requireConvexEnv()
  try {
    const { getAllCampYears, getCampRegistrations } = await import('@/lib/actions/camp')
    const yearsResult = await getAllCampYears()
    if (yearsResult.error) {
      return { data: null, error: yearsResult.error }
    }

    const years = yearsResult.data ?? []
    if (years.length === 0) {
      return {
        data: {
          report: buildCampAnalyticsReport([], {}, 'all'),
          years: [],
          selectedYearId: 'all',
        },
        error: null,
      }
    }

    const registrationsByYearId: Record<string, CampRegistration[]> = {}
    await Promise.all(
      years.map(async (year) => {
        const result = await getCampRegistrations(year.id)
        registrationsByYearId[year.id] = result.data ?? []
      })
    )

    const resolvedYearId =
      selectedYearId === 'all'
        ? 'all'
        : years.some((year) => year.id === selectedYearId)
          ? selectedYearId
          : years.find((year) => year.is_active)?.id ?? years[0].id

    const report = buildCampAnalyticsReport(years, registrationsByYearId, resolvedYearId)

    return {
      data: {
        report,
        years: [...years].sort((a, b) => b.year - a.year),
        selectedYearId: resolvedYearId,
      },
      error: null,
    }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to load camp analytics',
    }
  }
}
