'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getCampAnalyticsReport } from '@/lib/actions/camp-analytics'
import type { CampAnalyticsReport } from '@/lib/camp/analytics'
import type { CampYear } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CampAdminPageHeader } from '@/components/camp/camp-admin-page-header'
import { CampAnalyticsDashboard } from '@/components/camp/camp-analytics-dashboard'
import { downloadCampAnalyticsCsv } from '@/lib/camp/analytics-export'
import { Download, FileSpreadsheet, Layers } from 'lucide-react'

function CampAnalyticsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [years, setYears] = useState<CampYear[]>([])
  const [report, setReport] = useState<CampAnalyticsReport | null>(null)
  const [selectedYearId, setSelectedYearId] = useState<string | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async (yearParam: string | null) => {
    setLoading(true)
    setError(null)

    const requested = yearParam === 'all' || !yearParam ? 'all' : yearParam
    const result = await getCampAnalyticsReport(requested)

    if (result.error || !result.data) {
      setError(result.error ?? 'Failed to load analytics')
      setReport(null)
      setYears([])
    } else {
      setYears(result.data.years)
      setReport(result.data.report)
      setSelectedYearId(result.data.selectedYearId)
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    void loadData(searchParams.get('year'))
  }, [searchParams, loadData])

  function handleYearChange(value: string) {
    const next = value === 'all' ? 'all' : value
    setSelectedYearId(next)
    const params = new URLSearchParams(searchParams.toString())
    if (next === 'all') {
      params.set('year', 'all')
    } else {
      params.set('year', next)
    }
    router.replace(`/admin/camp-meeting/analytics?${params.toString()}`)
  }

  const activeYear =
    selectedYearId === 'all'
      ? null
      : years.find((year) => year.id === selectedYearId) ?? null

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="mb-4 text-muted-foreground">{error}</p>
            <Button onClick={() => void loadData(searchParams.get('year'))}>Try again</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!report || years.length === 0) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="mb-4 text-muted-foreground">No camp years found. Create a camp year to start tracking analytics.</p>
            <Button onClick={() => router.push('/admin/camp-meeting/years')}>Manage camp years</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="mx-auto max-w-7xl space-y-6 p-6">
        <CampAdminPageHeader
          title={selectedYearId === 'all' ? 'Camp analytics — all years' : 'Camp analytics'}
          campYear={activeYear}
          actions={
            <>
              {report ? (
                <Button variant="outline" onClick={() => downloadCampAnalyticsCsv(report)}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" /> Export analytics CSV
                </Button>
              ) : null}
              <Button variant="outline" onClick={() => router.push('/admin/camp-meeting/registrations')}>
                <Download className="mr-2 h-4 w-4" /> Registrations list
              </Button>
            </>
          }
        >
          <div className="flex flex-wrap items-center gap-2">
            <Select value={selectedYearId} onValueChange={handleYearChange}>
              <SelectTrigger className="w-[min(100%,16rem)] bg-white">
                <SelectValue placeholder="Select camp year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <span className="flex items-center gap-2">
                    <Layers className="h-3.5 w-3.5" />
                    All years combined
                  </span>
                </SelectItem>
                {years.map((year) => (
                  <SelectItem key={year.id} value={year.id}>
                    Camp {year.year}
                    {year.theme ? ` · ${year.theme}` : ''}
                    {year.is_active ? ' (active)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedYearId === 'all' ? (
              <span className="text-xs text-muted-foreground">
                Combined view deduplicates campers by phone for demographics
              </span>
            ) : null}
          </div>
        </CampAdminPageHeader>

        <CampAnalyticsDashboard report={report} />
      </div>
    </div>
  )
}

export default function CampAnalyticsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <LoadingSpinner />
        </div>
      }
    >
      <CampAnalyticsContent />
    </Suspense>
  )
}
