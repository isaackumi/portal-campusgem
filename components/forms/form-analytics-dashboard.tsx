'use client'

import { useMemo } from 'react'
import type { ChurchFormField, ChurchFormResponse } from '@/lib/types'
import { buildFormAnalyticsReport } from '@/lib/forms/analytics'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AnalyticsPieChart } from '@/components/charts/analytics-pie-chart'
import { AnalyticsCumulativeChart, AnalyticsCompletionChart, AnalyticsHorizontalBarChart } from '@/components/charts/analytics-charts'
import { BarChart3, LineChart, PieChartIcon, ListChecks } from 'lucide-react'

type Props = {
  fields: ChurchFormField[]
  responses: ChurchFormResponse[]
}

export function FormAnalyticsDashboard({ fields, responses }: Props) {
  const report = useMemo(() => buildFormAnalyticsReport(fields, responses), [fields, responses])

  const completionRows = useMemo(
    () =>
      report.fieldAnalytics.map((field) => ({
        name: field.label,
        rate: field.total > 0 ? Math.round((field.answered / field.total) * 100) : 0,
        answered: field.answered,
        total: field.total,
      })),
    [report.fieldAnalytics]
  )

  if (responses.length === 0) {
    return <p className="text-sm text-muted-foreground">No responses yet — analytics will appear here.</p>
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total responses</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{report.totalResponses}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Unique phones</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{report.uniquePhones}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Last 7 days</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{report.last7Days}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg completion</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{report.averageCompletion}%</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LineChart className="h-5 w-5 text-blue-600" />
            Submission timeline
          </CardTitle>
          <CardDescription>Daily responses and cumulative total — hover or tap data points for details.</CardDescription>
        </CardHeader>
        <CardContent>
          <AnalyticsCumulativeChart points={report.cumulative} height={300} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-emerald-600" />
            Completion by question
          </CardTitle>
          <CardDescription>How fully each question is answered across all submissions.</CardDescription>
        </CardHeader>
        <CardContent>
          <AnalyticsCompletionChart rows={completionRows} />
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
                  <AnalyticsPieChart slices={chart.slices} height={240} />
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
          <CardDescription>Per-question distributions with interactive charts for choice-based fields.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {report.fieldAnalytics.map((field) => (
            <div key={field.fieldId} className="rounded-lg border p-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
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
                <div className="grid gap-6 lg:grid-cols-2">
                  {field.slices.length <= 8 ? (
                    <AnalyticsPieChart slices={field.slices} height={220} innerRadius="45%" />
                  ) : null}
                  <AnalyticsHorizontalBarChart
                    data={field.slices.map((slice) => ({
                      name: slice.label,
                      value: slice.count,
                      percent: slice.percent,
                      fill: slice.color,
                    }))}
                    barColor="#10b981"
                  />
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
