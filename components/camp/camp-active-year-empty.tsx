'use client'

import Link from 'next/link'
import { Calendar, Upload, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type CampActiveYearEmptyProps = {
  title?: string
  description?: string
  error?: string | null
}

export function CampActiveYearEmpty({
  title = 'No active camp year',
  description = 'Choose a year to operate from, or create one and mark it active so dashboards, follow-up, and check-in know which season you are running.',
  error,
}: CampActiveYearEmptyProps) {
  return (
    <div className="mx-auto max-w-4xl">
      <Card className="overflow-hidden">
        <CardHeader className="space-y-4 p-5 sm:p-6">
          <div>
            <CardTitle className="app-section-title">{title}</CardTitle>
            <CardDescription className="mt-2 text-sm leading-relaxed sm:text-base">
              {error ?? description}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-5 pt-0 sm:p-6 sm:pt-0">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-neutral-200/80 bg-neutral-50/60 p-4 dark:border-white/[0.06] dark:bg-white/[0.03]">
              <Calendar className="mb-2 h-5 w-5 text-brand-600 dark:text-brand-300" aria-hidden />
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Set an active year</p>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                One active year powers admin dashboards and follow-up.
              </p>
            </div>
            <div className="rounded-xl border border-neutral-200/80 bg-neutral-50/60 p-4 dark:border-white/[0.06] dark:bg-white/[0.03]">
              <Upload className="mb-2 h-5 w-5 text-brand-600 dark:text-brand-300" aria-hidden />
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Import history</p>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                Bring in past Google Form or Excel registrations by year.
              </p>
            </div>
            <div className="rounded-xl border border-neutral-200/80 bg-neutral-50/60 p-4 dark:border-white/[0.06] dark:bg-white/[0.03]">
              <ArrowRight className="mb-2 h-5 w-5 text-brand-600 dark:text-brand-300" aria-hidden />
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Review past seasons</p>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                Open any year for analytics, SMS, and outreach assignments.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
            <Button asChild className="h-11 sm:h-10">
              <Link href="/admin/camp-meeting/years">Manage camp years</Link>
            </Button>
            <Button variant="outline" asChild className="h-11 sm:h-10">
              <Link href="/admin/camp-meeting/import">Import historical data</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
