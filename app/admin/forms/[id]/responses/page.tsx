'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers'
import { getFormAdmin, listFormResponses } from '@/lib/actions/forms'
import type { ChurchForm, ChurchFormField, ChurchFormResponse } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/loading'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, BarChart3, PieChart, Users } from 'lucide-react'

function formatValue(value: unknown): string {
  if (value == null || value === '') return ''
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

type AnalyticsOption = { label: string; count: number; percent: number }
type FieldAnalytics = {
  fieldId: string
  label: string
  type: ChurchFormField['field_type']
  answered: number
  total: number
  options: AnalyticsOption[]
}

export default function FormResponsesPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<ChurchForm | null>(null)
  const [fields, setFields] = useState<ChurchFormField[]>([])
  const [responses, setResponses] = useState<ChurchFormResponse[]>([])

  const loadData = useCallback(async () => {
    setLoading(true)
    const [formResult, responsesResult] = await Promise.all([getFormAdmin(params.id), listFormResponses(params.id)])

    if (formResult.error || !formResult.data) {
      setForm(null)
      setFields([])
      setResponses([])
      toast({ variant: 'destructive', title: 'Error', description: formResult.error ?? 'Form not found' })
      setLoading(false)
      return
    }

    if (responsesResult.error) {
      toast({ variant: 'destructive', title: 'Error', description: responsesResult.error })
    }

    setForm(formResult.data.form)
    setFields(formResult.data.fields)
    setResponses(responsesResult.data)
    setLoading(false)
  }, [params.id, toast])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth?redirect=' + encodeURIComponent(`/admin/forms/${params.id}/responses`))
    }
  }, [authLoading, user, router, params.id])

  useEffect(() => {
    if (!user) return
    void loadData()
  }, [user, loadData])

  const fieldAnalytics = useMemo<FieldAnalytics[]>(() => {
    if (!fields.length) return []
    return fields.map((field) => {
      const buckets = new Map<string, number>()
      let answered = 0
      for (const response of responses) {
        const value = response.values[field.id]
        if (value == null || value === '') continue
        answered += 1
        if (Array.isArray(value)) {
          for (const item of value) {
            const key = String(item).trim()
            if (!key) continue
            buckets.set(key, (buckets.get(key) ?? 0) + 1)
          }
          continue
        }
        const key = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value).trim()
        if (!key) continue
        buckets.set(key, (buckets.get(key) ?? 0) + 1)
      }

      const denominator = field.field_type === 'checkbox' ? Math.max(answered, 1) : Math.max(responses.length, 1)
      const options = Array.from(buckets.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([label, count]) => ({
          label,
          count,
          percent: Math.round((count / denominator) * 100),
        }))

      return {
        fieldId: field.id,
        label: field.label,
        type: field.field_type,
        answered,
        total: responses.length,
        options,
      }
    })
  }, [fields, responses])

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (!user) return null

  if (!form) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
        <div className="mx-auto max-w-lg space-y-6">
          <Button variant="ghost" onClick={() => router.push('/admin/forms')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to forms
          </Button>
          <Card className="border-amber-200 bg-amber-50/50">
            <CardHeader>
              <CardTitle>Form or responses unavailable</CardTitle>
              <CardDescription>
                Check the URL, your permissions (Forms Hub), and that Convex is configured with
                CAMP_CONVEX_SERVER_SECRET.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => router.push('/admin/forms')}>Return to Forms Hub</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const averageCompletion =
    responses.length === 0
      ? 0
      : Math.round(
          fieldAnalytics.reduce((sum, item) => sum + (item.answered / Math.max(item.total, 1)) * 100, 0) /
            Math.max(fieldAnalytics.length, 1)
        )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-violet-50/30">
      <div className="mx-auto max-w-7xl space-y-6 p-6">
        <Button variant="ghost" onClick={() => router.push(`/admin/forms/${form.id}`)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to editor
        </Button>

        <Card className="border-blue-200/80 bg-gradient-to-r from-blue-50 to-white">
          <CardHeader>
            <CardTitle>{form.title} responses</CardTitle>
            <CardDescription>{responses.length} submissions collected from /f/{form.slug}</CardDescription>
          </CardHeader>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
            <CardHeader className="pb-2">
              <CardDescription>Total responses</CardDescription>
              <CardTitle className="text-3xl">{responses.length}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-blue-700">
              <Users className="mr-1 inline h-4 w-4" />
              Submissions captured
            </CardContent>
          </Card>
          <Card className="border-violet-200 bg-gradient-to-br from-violet-50 to-white">
            <CardHeader className="pb-2">
              <CardDescription>Questions</CardDescription>
              <CardTitle className="text-3xl">{fields.length}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-violet-700">
              <BarChart3 className="mr-1 inline h-4 w-4" />
              Analytics-ready fields
            </CardContent>
          </Card>
          <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
            <CardHeader className="pb-2">
              <CardDescription>Avg completion</CardDescription>
              <CardTitle className="text-3xl">{averageCompletion}%</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-emerald-700">
              <PieChart className="mr-1 inline h-4 w-4" />
              Across all questions
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Question analytics</CardTitle>
            <CardDescription>Google-Forms-style top answers and completion by question.</CardDescription>
          </CardHeader>
          <CardContent>
            {responses.length === 0 ? (
              <p className="text-sm text-muted-foreground">No responses yet.</p>
            ) : (
              <div className="space-y-4">
                {fieldAnalytics.map((analytics) => (
                  <Card key={analytics.fieldId} className="border-slate-200/80">
                    <CardHeader className="pb-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <CardTitle className="text-base">{analytics.label}</CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="capitalize">
                            {analytics.type.replace('_', ' ')}
                          </Badge>
                          <Badge variant="outline">
                            {analytics.answered}/{analytics.total} answered
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {analytics.options.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No answers submitted for this question yet.</p>
                      ) : (
                        analytics.options.map((option) => (
                          <div key={`${analytics.fieldId}-${option.label}`} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="truncate pr-3">{option.label}</span>
                              <span className="text-muted-foreground">
                                {option.count} ({option.percent}%)
                              </span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                              <div className="h-full rounded-full bg-blue-500" style={{ width: `${option.percent}%` }} />
                            </div>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>All submissions</CardTitle>
            <CardDescription>Raw response table for export and detailed review.</CardDescription>
          </CardHeader>
          <CardContent>
            {responses.length === 0 ? (
              <p className="text-sm text-muted-foreground">No responses yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Email</TableHead>
                      {fields.map((field) => (
                        <TableHead key={field.id}>{field.label}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {responses.map((response) => (
                      <TableRow key={response.id}>
                        <TableCell>{new Date(response.submitted_at).toLocaleString()}</TableCell>
                        <TableCell>{response.respondent_phone ?? ''}</TableCell>
                        <TableCell>{response.respondent_email ?? ''}</TableCell>
                        {fields.map((field) => (
                          <TableCell key={`${response.id}-${field.id}`}>
                            {formatValue(response.values[field.id])}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
