'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { loadCampusGemBirthdaysAction } from '@/lib/actions/birthdays'
import type { BirthdayEntry } from '@/lib/birthdays/upcoming-birthdays'
import { UpcomingBirthdaysView } from '@/components/birthdays/upcoming-birthdays-view'
import { PageContainer } from '@/components/layout/page-container'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading'
import { ArrowLeft } from 'lucide-react'

export default function CampusGemBirthdaysPage() {
  const [entries, setEntries] = useState<BirthdayEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void loadCampusGemBirthdaysAction().then((result) => {
      if (result.error) setError(result.error)
      setEntries(result.data ?? [])
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <PageContainer className="space-y-4">
      <Button variant="ghost" size="sm" asChild className="w-fit px-0">
        <Link href="/admin">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Admin
        </Link>
      </Button>
      {error ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}
        </p>
      ) : null}
      <UpcomingBirthdaysView
        title="Campus Gem Birthdays"
        subtitle="Upcoming birthdays for Campus Gem members — filter by today, this week, next 30 days, or browse any calendar month."
        entries={entries}
        accentClass="text-primary"
      />
    </PageContainer>
  )
}
