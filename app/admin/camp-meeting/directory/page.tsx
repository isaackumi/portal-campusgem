'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Database, Users } from 'lucide-react'

import { useAuth } from '@/components/providers'
import { createCamperDirectoryColumns } from '@/components/camp/camper-directory-columns'
import { DataTable } from '@/components/data-table/data-table'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/loading'
import { getCamperDirectory } from '@/lib/actions/camp'
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
      createCamperDirectoryColumns((registrationId) => {
        router.push(`/admin/camp-meeting/registrations/${registrationId}`)
      }),
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="mx-auto max-w-7xl space-y-6 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <Button variant="ghost" onClick={() => router.push('/admin/camp-meeting')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Camp Admin
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">Camper Directory</h1>
              <p className="mt-1 max-w-3xl text-muted-foreground">
                One row per phone number across every imported and live camp year. Year chips open that
                year&apos;s registration. New public registration still uses phone lookup to prefill the
                active year and blocks duplicate sign-up for that year only.
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={() => void loadDirectory()}>
            Refresh
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Unique campers</CardDescription>
              <CardTitle className="text-3xl">{rows.length}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <Users className="mb-1 inline h-4 w-4" /> Grouped by phone
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total registrations</CardDescription>
              <CardTitle className="text-3xl">
                {rows.reduce((sum, row) => sum + row.registration_count, 0)}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <Database className="mb-1 inline h-4 w-4" /> Across all camp years
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Linked accounts</CardDescription>
              <CardTitle className="text-3xl">{rows.filter((row) => row.user_id).length}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Camp history matched to a chMS login
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All years</CardTitle>
            <CardDescription>
              Search by name, phone, email, or year. Click a year chip to open that registration.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}
            <DataTable
              columns={columns}
              data={rows}
              searchKey="full_name"
              searchPlaceholder="Search campers..."
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
