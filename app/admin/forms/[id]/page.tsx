'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers'
import { getFormAdmin, saveFormFields, updateForm } from '@/lib/actions/forms'
import type { ChurchForm, ChurchFormField, ChurchFormFieldType } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LoadingSpinner } from '@/components/ui/loading'
import { useToast } from '@/hooks/use-toast'
import { ArrowDown, ArrowLeft, ArrowUp, Copy, Link2, Plus, Save, Trash2 } from 'lucide-react'

type EditableField = {
  client_id: string
  label: string
  description: string
  field_type: ChurchFormFieldType
  required: boolean
  options: string
  prefill_key: string
}

const FIELD_TYPES: Array<{ value: ChurchFormFieldType; label: string }> = [
  { value: 'short_text', label: 'Short answer' },
  { value: 'long_text', label: 'Paragraph' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'number', label: 'Number' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'date', label: 'Date' },
  { value: 'file', label: 'File link' },
]

const PREFILL_KEYS = [
  { value: 'none', label: 'No prefill' },
  { value: 'first_name', label: 'First name' },
  { value: 'last_name', label: 'Last name' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'residence', label: 'Residence' },
]

function toEditableField(field: ChurchFormField, index: number): EditableField {
  return {
    client_id: field.id || `field-${index}`,
    label: field.label,
    description: field.description ?? '',
    field_type: field.field_type,
    required: field.required,
    options: (field.options ?? []).join('\n'),
    prefill_key: field.prefill_key ?? 'none',
  }
}

function createEmptyField(index: number): EditableField {
  return {
    client_id: `new-${Date.now()}-${index}`,
    label: 'Untitled question',
    description: '',
    field_type: 'short_text',
    required: false,
    options: '',
    prefill_key: 'none',
  }
}

export default function FormEditorPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<ChurchForm | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('general')
  const [slug, setSlug] = useState('')
  const [status, setStatus] = useState<ChurchForm['status']>('draft')
  const [enableProfileLookup, setEnableProfileLookup] = useState(false)
  const [fields, setFields] = useState<EditableField[]>([])

  const publicUrl = useMemo(() => {
    if (!slug || typeof window === 'undefined') return `/f/${slug}`
    return `${window.location.origin}/f/${slug}`
  }, [slug])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth?redirect=' + encodeURIComponent(`/admin/forms/${params.id}`))
    }
  }, [authLoading, user, router, params.id])

  useEffect(() => {
    if (!user) return
    void loadForm()
  }, [user, params.id])

  async function loadForm() {
    setLoading(true)
    const { data, error } = await getFormAdmin(params.id)
    if (error || !data) {
      setForm(null)
      toast({ variant: 'destructive', title: 'Error', description: error ?? 'Form not found' })
      setLoading(false)
      return
    }

    setForm(data.form)
    setTitle(data.form.title)
    setDescription(data.form.description ?? '')
    setCategory(data.form.category ?? 'general')
    setSlug(data.form.slug)
    setStatus(data.form.status)
    setEnableProfileLookup(data.form.enable_profile_lookup)
    setFields(data.fields.map(toEditableField))
    setLoading(false)
  }

  function updateField(clientId: string, patch: Partial<EditableField>) {
    setFields((current) => current.map((field) => (field.client_id === clientId ? { ...field, ...patch } : field)))
  }

  function moveField(clientId: string, direction: -1 | 1) {
    setFields((current) => {
      const index = current.findIndex((field) => field.client_id === clientId)
      const target = index + direction
      if (index < 0 || target < 0 || target >= current.length) return current
      const next = [...current]
      const [item] = next.splice(index, 1)
      next.splice(target, 0, item)
      return next
    })
  }

  async function handleSave(publish = false) {
    if (!form) return
    setSaving(true)

    const formPatch = {
      title: title.trim(),
      description: description.trim() || undefined,
      category: category.trim() || 'general',
      slug: slug.trim(),
      enable_profile_lookup: enableProfileLookup,
      status: publish ? ('published' as const) : status,
    }

    const { error: updateError, data: updatedForm } = await updateForm(form.id, formPatch)
    if (updateError || !updatedForm) {
      setSaving(false)
      toast({ variant: 'destructive', title: 'Save failed', description: updateError ?? 'Unknown error' })
      return
    }

    const payload = fields.map((field, index) => ({
      label: field.label.trim() || `Question ${index + 1}`,
      description: field.description.trim() || undefined,
      field_type: field.field_type,
      required: field.required,
      options:
        field.field_type === 'dropdown'
          ? field.options
              .split('\n')
              .map((option) => option.trim())
              .filter(Boolean)
          : undefined,
      prefill_key: field.prefill_key === 'none' ? undefined : field.prefill_key,
      sort_order: index,
    }))

    const { error: fieldsError } = await saveFormFields(form.id, payload)
    setSaving(false)

    if (fieldsError) {
      toast({ variant: 'destructive', title: 'Save failed', description: fieldsError })
      return
    }

    setForm(updatedForm)
    setStatus(updatedForm.status)
    toast({
      title: publish ? 'Form published' : 'Form saved',
      description: publish ? 'The public link is ready to share.' : 'Draft updated successfully.',
    })
    await loadForm()
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(publicUrl)
      toast({ title: 'Link copied', description: publicUrl })
    } catch {
      toast({ variant: 'destructive', title: 'Copy failed', description: publicUrl })
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (!user) {
    return null
  }

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
              <CardTitle>Form not available</CardTitle>
              <CardDescription>
                This form could not be loaded. The link may be wrong, the form was deleted, or Convex
                credentials are missing.
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" onClick={() => router.push('/admin/forms')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to forms
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => router.push(`/admin/forms/${form.id}/responses`)}>
              View responses
            </Button>
            <Button variant="outline" onClick={() => void handleSave(false)} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              Save draft
            </Button>
            <Button onClick={() => void handleSave(true)} disabled={saving}>
              Publish
            </Button>
          </div>
        </div>

        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle>Form settings</CardTitle>
            <CardDescription>Title, share link, and optional phone lookup for returning campers.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="title">Form title</Label>
              <Input id="title" value={title} onChange={(event) => setTitle(event.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input id="category" value={category} onChange={(event) => setCategory(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as ChurchForm['status'])}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="slug">Public link slug</Label>
              <div className="flex gap-2">
                <Input id="slug" value={slug} onChange={(event) => setSlug(event.target.value)} />
                <Button type="button" variant="outline" onClick={() => void copyLink()}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy
                </Button>
              </div>
              <p className="flex items-center gap-1 text-xs text-blue-600">
                <Link2 className="h-3 w-3" />
                {publicUrl}
              </p>
            </div>
            <div className="flex items-center gap-2 md:col-span-2">
              <Checkbox
                id="profile-lookup"
                checked={enableProfileLookup}
                onCheckedChange={(checked) => setEnableProfileLookup(checked === true)}
              />
              <Label htmlFor="profile-lookup">Allow phone lookup to prefill known camp details</Label>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {fields.map((field, index) => (
            <Card key={field.client_id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-base">Question {index + 1}</CardTitle>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => moveField(field.client_id, -1)} disabled={index === 0}>
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => moveField(field.client_id, 1)}
                      disabled={index === fields.length - 1}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setFields((current) => current.filter((item) => item.client_id !== field.client_id))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label>Question</Label>
                  <Input value={field.label} onChange={(event) => updateField(field.client_id, { label: event.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={field.field_type}
                    onValueChange={(value) => updateField(field.client_id, { field_type: value as ChurchFormFieldType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FIELD_TYPES.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Prefill key</Label>
                  <Select
                    value={field.prefill_key}
                    onValueChange={(value) => updateField(field.client_id, { prefill_key: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PREFILL_KEYS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Help text</Label>
                  <Input
                    value={field.description}
                    onChange={(event) => updateField(field.client_id, { description: event.target.value })}
                  />
                </div>
                {field.field_type === 'dropdown' ? (
                  <div className="space-y-2 md:col-span-2">
                    <Label>Dropdown options (one per line)</Label>
                    <Textarea
                      value={field.options}
                      onChange={(event) => updateField(field.client_id, { options: event.target.value })}
                      rows={4}
                    />
                  </div>
                ) : null}
                <div className="flex items-center gap-2 md:col-span-2">
                  <Checkbox
                    checked={field.required}
                    onCheckedChange={(checked) => updateField(field.client_id, { required: checked === true })}
                  />
                  <Label>Required</Label>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Button variant="outline" onClick={() => setFields((current) => [...current, createEmptyField(current.length)])}>
          <Plus className="mr-2 h-4 w-4" />
          Add question
        </Button>
      </div>
    </div>
  )
}
