'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, RefreshCw } from 'lucide-react'

import { useAuth } from '@/components/providers'
import { CamperDirectoryMobileRow, createCamperDirectoryColumns } from '@/components/camp/camper-directory-columns'
import { StatCard } from '@/components/ui/stat-card'
import { DataTable } from '@/components/data-table/data-table'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/loading'
import { getCamperDirectory } from '@/lib/actions/camp'
import { CampDirectoryMergePanel } from '@/components/camp/camp-directory-merge-panel'
import type { CampCamperDirectoryRow } from '@/lib/types'

export default function CampDirectoryPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [rows, setRows] = useState<CampCamperDirectoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth?redirect=' + encodeURIComponent('/admin/camp-meeting/directory'))
    }
  }, [authLoading, user, router])

  useEffect(() => {
    if (!user) return
    void loadDirectory()
  }, [user])

  async function loadDirectory() {
    setLoading(true)
    const { data, error: loadError } = await getCamperDirectory()
    setRows(data)
    setError(loadError)
    setLoading(false)
  }

  const columns = useMemo(
    () =>
      createCamperDirectoryColumns(
        (registrationId) => {
          router.push(`/admin/camp-meeting/registrations/${registrationId}`)
        },
        () => void loadDirectory()
      ),
    [router]
  )

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div>
      <div className="mx-auto max-w-7xl space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => router.push('/admin/camp-meeting')}
              className="-ml-2 mb-2 inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 sm:min-h-9"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Back
            </button>
            <h1 className="app-page-title">Camper Directory</h1>
            <p className="app-page-description mt-1 max-w-3xl">
              One row per person (matched by phone, or by name when phone is missing). Year chips
              open that year&apos;s registration. Duplicate import rows with the same name and no
              phone are merged here automatically.
            </p>
          </div>
          <Button variant="outline" className="min-h-11 w-full sm:min-h-0 sm:w-auto" onClick={() => void loadDirectory()}>
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
          <StatCard label="Unique campers" value={rows.length} sub="Grouped by phone" />
          <StatCard
            label="Registrations"
            value={rows.reduce((sum, row) => sum + row.registration_count, 0)}
            sub="Across all camp years"
          />
          <StatCard
            label="Linked accounts"
            value={rows.filter((row) => row.user_id).length}
            sub="Matched to a login"
            className="col-span-2 md:col-span-1"
          />
        </div>

        <CampDirectoryMergePanel rows={rows} onMerged={() => void loadDirectory()} />

        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="app-section-title">All years</CardTitle>
            <CardDescription>
              Search by name, phone, email, or year. Use the row menu to promote with a Corporate Gem group role
              or grant a staff role and permissions (creates a directory profile when needed).
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            {error ? <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p> : null}
            <DataTable
              columns={columns}
              data={rows}
              searchKey="full_name"
              searchPlaceholder="Search campers..."
              renderMobileRow={(row) => (
                <CamperDirectoryMobileRow
                  row={row}
                  onOpenRegistration={(registrationId) =>
                    router.push(`/admin/camp-meeting/registrations/${registrationId}`)
                  }
                  onRefresh={() => void loadDirectory()}
                />
              )}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
