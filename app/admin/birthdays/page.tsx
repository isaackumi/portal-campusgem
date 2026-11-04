'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { loadCampusGemBirthdaysAction } from '@/lib/actions/birthdays'
import type { BirthdayEntry } from '@/lib/birthdays/upcoming-birthdays'
import { UpcomingBirthdaysView } from '@/components/birthdays/upcoming-birthdays-view'
import { PageContainer } from '@/components/layout/page-container'
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
      <Link
        href="/admin"
        className="-ml-2 inline-flex min-h-11 w-fit items-center gap-1 rounded-md px-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 sm:min-h-9"
      >
        <ArrowLeft className="h-4 w-4" />
        Admin
      </Link>
      {error ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200">
          {error}
        </p>
      ) : null}
      <UpcomingBirthdaysView
        title="Campus Gem birthdays"
        subtitle="Upcoming birthdays for Campus Gem members. Filter by today, this week, next 30 days, or browse any calendar month."
        entries={entries}
        smsModule="church"
      />
    </PageContainer>
  )
}
