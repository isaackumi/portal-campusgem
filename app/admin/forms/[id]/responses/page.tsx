'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers'
import { getFormAdmin, listFormResponses } from '@/lib/actions/forms'
import type { ChurchForm, ChurchFormField, ChurchFormResponse } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/loading'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft } from 'lucide-react'

function formatValue(value: unknown): string {
  if (value == null || value === '') return ''
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
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

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth?redirect=' + encodeURIComponent(`/admin/forms/${params.id}/responses`))
    }
  }, [authLoading, user, router, params.id])

  useEffect(() => {
    if (!user) return
    void loadData()
  }, [user, params.id])

  async function loadData() {
    setLoading(true)
    const [formResult, responsesResult] = await Promise.all([
      getFormAdmin(params.id),
      listFormResponses(params.id),
    ])

    if (formResult.error || !formResult.data) {
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
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (!form) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="mx-auto max-w-7xl space-y-6 p-6">
        <Button variant="ghost" onClick={() => router.push(`/admin/forms/${form.id}`)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to editor
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>{form.title} responses</CardTitle>
            <CardDescription>{responses.length} submissions collected from /f/{form.slug}</CardDescription>
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
