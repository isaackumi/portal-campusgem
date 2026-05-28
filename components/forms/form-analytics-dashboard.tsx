'use client'

import { useMemo } from 'react'
import type { ChurchFormField, ChurchFormResponse } from '@/lib/types'
import { buildFormAnalyticsReport } from '@/lib/forms/analytics'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PieChart } from '@/components/forms/pie-chart'
import { CumulativeChart } from '@/components/forms/cumulative-chart'
import { BarChart3, LineChart, PieChartIcon } from 'lucide-react'

type Props = {
  fields: ChurchFormField[]
  responses: ChurchFormResponse[]
}

export function FormAnalyticsDashboard({ fields, responses }: Props) {
  const report = useMemo(() => buildFormAnalyticsReport(fields, responses), [fields, responses])

  if (responses.length === 0) {
    return <p className="text-sm text-muted-foreground">No responses yet — analytics will appear here.</p>
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total responses</CardDescription>
            <CardTitle className="text-3xl">{report.totalResponses}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Unique phones</CardDescription>
            <CardTitle className="text-3xl">{report.uniquePhones}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Last 7 days</CardDescription>
            <CardTitle className="text-3xl">{report.last7Days}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg completion</CardDescription>
            <CardTitle className="text-3xl">{report.averageCompletion}%</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LineChart className="h-5 w-5 text-blue-600" />
            Cumulative submissions
          </CardTitle>
          <CardDescription>Running total of form responses over time.</CardDescription>
        </CardHeader>
        <CardContent>
          <CumulativeChart points={report.cumulative} />
        </CardContent>
      </Card>

      {report.demographics.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-violet-600" />
              Demographics
            </CardTitle>
            <CardDescription>Distribution from mapped prefill fields (sex, age, education, etc.).</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 lg:grid-cols-2">
              {report.demographics.map((chart) => (
                <div key={chart.key} className="rounded-lg border bg-white p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-medium text-slate-900">{chart.title}</h3>
                    <Badge variant="outline">{chart.answered} answered</Badge>
                  </div>
                  <PieChart slices={chart.slices} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-emerald-600" />
            Question breakdown
          </CardTitle>
          <CardDescription>Per-question distributions and completion rates.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {report.fieldAnalytics.map((field) => (
            <div key={field.fieldId} className="rounded-lg border p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-medium">{field.label}</h3>
                <div className="flex gap-2">
                  <Badge variant="secondary" className="capitalize">
                    {field.type.replace('_', ' ')}
                  </Badge>
                  <Badge variant="outline">
                    {field.answered}/{field.total} answered
                  </Badge>
                </div>
              </div>
              {field.slices.length > 0 ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  <PieChart slices={field.slices} size={140} />
                  <div className="space-y-2">
                    {field.slices.map((slice) => (
                      <div key={slice.label} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="truncate pr-2">{slice.label}</span>
                          <span className="text-muted-foreground">
                            {slice.count} ({slice.percent}%)
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${slice.percent}%`, backgroundColor: slice.color }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No answers for this question yet.</p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
