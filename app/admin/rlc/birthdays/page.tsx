'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { loadRlcBirthdaysAction } from '@/lib/actions/birthdays'
import type { BirthdayEntry } from '@/lib/birthdays/upcoming-birthdays'
import { UpcomingBirthdaysView } from '@/components/birthdays/upcoming-birthdays-view'
import { BirthdayHeadsUpCard } from '@/components/birthdays/birthday-heads-up-card'
import { useAuth } from '@/components/providers'
import { PageContainer } from '@/components/layout/page-container'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading'
import { RLC_NAME } from '@/lib/constants/rlc'
import { ArrowLeft } from 'lucide-react'

export default function RlcBirthdaysPage() {
  const [entries, setEntries] = useState<BirthdayEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { can } = useAuth()

  useEffect(() => {
    void loadRlcBirthdaysAction().then((result) => {
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
      <Button variant="ghost" size="sm" asChild className="-ml-2 h-11 w-fit px-2 sm:h-8">
        <Link href="/admin/rlc">
          <ArrowLeft className="mr-2 h-4 w-4" />
          RLC
        </Link>
      </Button>
      {error ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300">
          {error}
        </p>
      ) : null}
      {can('members.view') ? <BirthdayHeadsUpCard /> : null}
      <UpcomingBirthdaysView
        title={`${RLC_NAME} Birthdays`}
        subtitle="RLC members and active visitors with birthdays on file — includes today, weekly, 30-day upcoming, and month browse."
        entries={entries}
        accentClass="text-brand-700 dark:text-brand-300"
        smsModule="rlc"
      />
    </PageContainer>
  )
}
