'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { getPublishedFormBySlug, submitFormResponse } from '@/lib/actions/forms'
import { lookupCampRegistrationByPhone } from '@/lib/actions/camp'
import type { ChurchForm, ChurchFormField } from '@/lib/types'
import { isValidPhone } from '@/lib/phone'
import { applyCampProfilePrefill } from '@/lib/forms/prefill'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LoadingSpinner } from '@/components/ui/loading'
import { useToast } from '@/hooks/use-toast'
import { CheckCircle2 } from 'lucide-react'

export default function PublicFormPage() {
  const params = useParams<{ slug: string }>()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [form, setForm] = useState<ChurchForm | null>(null)
  const [fields, setFields] = useState<ChurchFormField[]>([])
  const [values, setValues] = useState<Record<string, unknown>>({})

  const phoneField = useMemo(() => fields.find((field) => field.field_type === 'phone'), [fields])

  useEffect(() => {
    void loadForm()
  }, [params.slug])

  async function loadForm() {
    setLoading(true)
    const { data, error } = await getPublishedFormBySlug(params.slug)
    if (error || !data) {
      toast({ variant: 'destructive', title: 'Form unavailable', description: error ?? 'This form is not published.' })
      setLoading(false)
      return
    }
    setForm(data.form)
    setFields(data.fields)
    setLoading(false)
  }

  function setFieldValue(fieldId: string, value: unknown) {
    setValues((current) => ({ ...current, [fieldId]: value }))
  }

  function toggleCheckboxOption(fieldId: string, option: string, checked: boolean) {
    setValues((current) => {
      const existing = Array.isArray(current[fieldId]) ? (current[fieldId] as string[]) : []
      const next = checked ? Array.from(new Set([...existing, option])) : existing.filter((item) => item !== option)
      return { ...current, [fieldId]: next }
    })
  }

  async function handleLookup() {
    if (!form?.enable_profile_lookup || !phoneField) return
    const phone = String(values[phoneField.id] ?? '').trim()
    if (!isValidPhone(phone)) {
      toast({ variant: 'destructive', title: 'Invalid phone', description: 'Enter a valid Ghana phone number first.' })
      return
    }

    setLookupLoading(true)
    const { profile, error } = await lookupCampRegistrationByPhone(phone)
    setLookupLoading(false)

    if (error) {
      toast({ variant: 'destructive', title: 'Lookup failed', description: error })
      return
    }

    if (!profile) {
      toast({ title: 'No previous record', description: 'Continue filling the form manually.' })
      return
    }

    const { values: nextValues, filledCount } = applyCampProfilePrefill(fields, profile, values)
    setValues(nextValues)
    toast({
      title: 'Details found',
      description:
        filledCount > 0
          ? `We prefilled ${filledCount} field${filledCount === 1 ? '' : 's'} from your previous camp record.`
          : 'We found your record, but no fields on this form are mapped for prefill yet.',
    })
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!form) return

    setSubmitting(true)
    const { error } = await submitFormResponse({
      slug: form.slug,
      values,
    })
    setSubmitting(false)

    if (error) {
      toast({ variant: 'destructive', title: 'Submission failed', description: error })
      return
    }

    setSubmitted(true)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f0f4f8]">
        <LoadingSpinner />
      </div>
    )
  }

  if (!form) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f0f4f8] p-6">
        <Card className="max-w-lg w-full">
          <CardHeader>
            <CardTitle>Form not found</CardTitle>
            <CardDescription>This link may be unpublished or no longer available.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f0f4f8] p-6">
        <Card className="max-w-lg w-full text-center">
          <CardHeader>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle>Response recorded</CardTitle>
            <CardDescription>Thank you for completing {form.title}.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f0f4f8] py-10 px-4">
      <form onSubmit={handleSubmit} className="mx-auto flex max-w-3xl flex-col gap-4">
        <Card className="border-t-8 border-t-blue-600 shadow-sm">
          <CardHeader>
            <CardTitle className="text-3xl font-normal">{form.title}</CardTitle>
            {form.description ? <CardDescription className="text-base">{form.description}</CardDescription> : null}
          </CardHeader>
        </Card>

        {form.enable_profile_lookup && phoneField ? (
          <Card>
            <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-2">
                <Label htmlFor="lookup-phone">Phone lookup</Label>
                <Input
                  id="lookup-phone"
                  value={String(values[phoneField.id] ?? '')}
                  onChange={(event) => setFieldValue(phoneField.id, event.target.value)}
                  placeholder="0541234567"
                />
              </div>
              <Button type="button" variant="outline" onClick={() => void handleLookup()} disabled={lookupLoading}>
                {lookupLoading ? 'Looking up...' : 'Find my details'}
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {fields.map((field) => (
          <Card key={field.id}>
            <CardContent className="space-y-3 pt-6">
              <div>
                <Label className="text-base">
                  {field.label}
                  {field.required ? <span className="text-red-500"> *</span> : null}
                </Label>
                {field.description ? <p className="text-sm text-muted-foreground">{field.description}</p> : null}
              </div>

              {field.field_type === 'long_text' ? (
                <Textarea
                  value={String(values[field.id] ?? '')}
                  onChange={(event) => setFieldValue(field.id, event.target.value)}
                  rows={4}
                />
              ) : null}

              {field.field_type === 'dropdown' ? (
                <Select
                  value={String(values[field.id] ?? '')}
                  onValueChange={(value) => setFieldValue(field.id, value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an option" />
                  </SelectTrigger>
                  <SelectContent>
                    {(field.options ?? []).map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}

              {field.field_type === 'checkbox' ? (
                (field.options ?? []).length > 0 ? (
                  <div className="space-y-2">
                    {(field.options ?? []).map((option) => {
                      const selected = Array.isArray(values[field.id]) && (values[field.id] as string[]).includes(option)
                      return (
                        <label key={option} className="flex items-center gap-2">
                          <Checkbox
                            checked={selected}
                            onCheckedChange={(checked) => toggleCheckboxOption(field.id, option, checked === true)}
                          />
                          <span className="text-sm text-muted-foreground">{option}</span>
                        </label>
                      )
                    })}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={values[field.id] === true}
                      onCheckedChange={(checked) => setFieldValue(field.id, checked === true)}
                    />
                    <span className="text-sm text-muted-foreground">Yes</span>
                  </div>
                )
              ) : null}

              {['short_text', 'email', 'phone', 'number', 'date', 'file'].includes(field.field_type) ? (
                <Input
                  type={
                    field.field_type === 'email'
                      ? 'email'
                      : field.field_type === 'number'
                        ? 'number'
                        : field.field_type === 'date'
                          ? 'date'
                          : 'text'
                  }
                  value={String(values[field.id] ?? '')}
                  onChange={(event) => setFieldValue(field.id, event.target.value)}
                  placeholder={field.field_type === 'file' ? 'Paste a file link' : undefined}
                />
              ) : null}
            </CardContent>
          </Card>
        ))}

        <div className="flex justify-end">
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit'}
          </Button>
        </div>
      </form>
    </div>
  )
}
