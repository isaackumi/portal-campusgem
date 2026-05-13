'use client'

import Link from 'next/link'
import { Calendar, Sparkles, Upload, ArrowRight } from 'lucide-react'
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
      <Card className="overflow-hidden border-blue-100 bg-gradient-to-br from-white via-blue-50/40 to-indigo-50/60 shadow-sm">
        <CardHeader className="space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <CardTitle className="text-2xl">{title}</CardTitle>
            <CardDescription className="mt-2 text-base leading-relaxed">
              {error ?? description}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/80 bg-white/80 p-4">
              <Calendar className="mb-2 h-5 w-5 text-blue-600" />
              <p className="text-sm font-medium text-gray-900">Set an active year</p>
              <p className="mt-1 text-xs text-muted-foreground">
                One active year powers admin dashboards and follow-up.
              </p>
            </div>
            <div className="rounded-xl border border-white/80 bg-white/80 p-4">
              <Upload className="mb-2 h-5 w-5 text-blue-600" />
              <p className="text-sm font-medium text-gray-900">Import history</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Bring in past Google Form or Excel registrations by year.
              </p>
            </div>
            <div className="rounded-xl border border-white/80 bg-white/80 p-4">
              <ArrowRight className="mb-2 h-5 w-5 text-blue-600" />
              <p className="text-sm font-medium text-gray-900">Review past seasons</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Open any year hub for analytics, SMS, and outreach assignments.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/admin/camp-meeting/years">Manage camp years</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin/camp-meeting/import">Import historical data</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
