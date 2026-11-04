'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers'
import { getFormAdmin, listFormResponses } from '@/lib/actions/forms'
import { formatResponseValue } from '@/lib/forms/analytics'
import type { ChurchForm, ChurchFormField, ChurchFormResponse } from '@/lib/types'
import { FormAnalyticsDashboard } from '@/components/forms/form-analytics-dashboard'
import { Button } from '@/components/ui/button'
import { PhoneLink, QuickContactButtons } from '@/components/contact/phone-link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/loading'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft } from 'lucide-react'

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
      <div>
        <div className="mx-auto max-w-lg space-y-6">
          <Button variant="ghost" className="-ml-2 h-11 px-2 sm:h-10" onClick={() => router.push('/admin/forms')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to forms
          </Button>
          <Card>
            <CardHeader>
              <CardTitle>Form unavailable</CardTitle>
              <CardDescription>Check the form ID and your admin access.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mx-auto w-full min-w-0 max-w-7xl space-y-4 sm:space-y-6">
        <Button variant="ghost" className="-ml-2 h-11 px-2 sm:h-10" onClick={() => router.push(`/admin/forms/${form.id}`)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to editor
        </Button>

        <div className="min-w-0">
          <p className="app-overline">Responses</p>
          <h1 className="app-page-title break-words">{form.title}</h1>
          <p className="app-page-description mt-1">
            {responses.length} submission{responses.length === 1 ? '' : 's'} from{' '}
            <span className="font-mono text-xs">/f/{form.slug}</span>
          </p>
        </div>

        <FormAnalyticsDashboard fields={fields} responses={responses} />

        <Card>
          <CardHeader>
            <CardTitle>All submissions</CardTitle>
            <CardDescription>Raw response table for export and detailed review.</CardDescription>
          </CardHeader>
          <CardContent>
            {responses.length === 0 ? (
              <p className="text-sm text-muted-foreground">No responses yet.</p>
            ) : (
              <>
              <ul className="-mx-2 space-y-3 md:hidden">
                {responses.map((response) => {
                  const location =
                    response.respondent_location_label ??
                    (response.respondent_latitude != null && response.respondent_longitude != null
                      ? `${response.respondent_latitude.toFixed(4)}, ${response.respondent_longitude.toFixed(4)}`
                      : null)
                  const preview = fields.slice(0, 3)
                  const rest = fields.slice(3)
                  return (
                    <li key={response.id} className="rounded-xl border border-neutral-200 p-3 dark:border-white/10">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 space-y-0.5">
                          <p className="text-xs text-muted-foreground">{new Date(response.submitted_at).toLocaleString()}</p>
                          {response.respondent_phone ? (
                            <PhoneLink phone={response.respondent_phone} className="text-sm" />
                          ) : null}
                          {response.respondent_email ? (
                            <p className="break-all text-sm text-neutral-600 dark:text-neutral-300">{response.respondent_email}</p>
                          ) : null}
                          {location ? <p className="text-xs text-muted-foreground">{location}</p> : null}
                        </div>
                        <QuickContactButtons phone={response.respondent_phone} />
                      </div>
                      <dl className="mt-3 space-y-2 border-t border-neutral-100 pt-3 text-sm dark:border-white/10">
                        {preview.map((field) => (
                          <div key={field.id} className="min-w-0">
                            <dt className="text-xs text-muted-foreground">{field.label}</dt>
                            <dd className="break-words text-neutral-900 dark:text-neutral-100">
                              {formatResponseValue(response.values[field.id])}
                            </dd>
                          </div>
                        ))}
                      </dl>
                      {rest.length > 0 ? (
                        <details className="group mt-2">
                          <summary className="flex min-h-11 cursor-pointer list-none items-center text-sm font-medium text-brand-700 dark:text-brand-300">
                            <span className="group-open:hidden">Show all {fields.length} answers</span>
                            <span className="hidden group-open:inline">Hide answers</span>
                          </summary>
                          <dl className="space-y-2 text-sm">
                            {rest.map((field) => (
                              <div key={field.id} className="min-w-0">
                                <dt className="text-xs text-muted-foreground">{field.label}</dt>
                                <dd className="break-words text-neutral-900 dark:text-neutral-100">
                                  {formatResponseValue(response.values[field.id])}
                                </dd>
                              </div>
                            ))}
                          </dl>
                        </details>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Location</TableHead>
                      {fields.map((field) => (
                        <TableHead key={field.id}>{field.label}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {responses.map((response) => (
                      <TableRow key={response.id}>
                        <TableCell>{new Date(response.submitted_at).toLocaleString()}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {response.respondent_phone ? <PhoneLink phone={response.respondent_phone} /> : '—'}
                        </TableCell>
                        <TableCell>{response.respondent_email ?? '—'}</TableCell>
                        <TableCell>
                          {response.respondent_location_label ??
                            (response.respondent_latitude != null && response.respondent_longitude != null
                              ? `${response.respondent_latitude.toFixed(4)}, ${response.respondent_longitude.toFixed(4)}`
                              : '—')}
                        </TableCell>
                        {fields.map((field) => (
                          <TableCell key={`${response.id}-${field.id}`}>
                            {formatResponseValue(response.values[field.id])}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
