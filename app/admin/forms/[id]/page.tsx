'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useAuth } from '@/components/providers'
import { getFormAdmin, saveFormFields, updateForm } from '@/lib/actions/forms'
import { CAMP_MEETING_REGISTRATION_CATEGORY } from '@/lib/constants/camp-meeting'
import { getAllCampYears } from '@/lib/actions/camp'
import { buildFormWhatsAppShareUrl } from '@/lib/forms/whatsapp-share'
import type { ChurchForm, CampYear, ChurchFormField, ChurchFormFieldType } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FORM_PREFILL_KEY_GROUPS } from '@/lib/forms/prefill'
import { PUBLIC_FORM_ACCENT_OPTIONS, isValidCoverImageUrl } from '@/lib/forms/public-form-theme'
import { FORM_DISPLAY_MODE_OPTIONS, type FormDisplayMode } from '@/lib/forms/display-mode'
import {
  FieldOptionsEditor,
  fieldTypeUsesOptions,
  parseFieldOptionsText,
} from '@/components/forms/field-options-editor'
import { FormPublicLink } from '@/components/forms/form-public-link'
import { DeleteFormDialog } from '@/components/forms/delete-form-dialog'
import { FormGroupSelect } from '@/components/forms/group-select'
import { useGroups } from '@/lib/hooks/use-data'
import { LoadingSpinner } from '@/components/ui/loading'
import { useToast } from '@/hooks/use-toast'
import { cn, formatDateTime } from '@/lib/utils'
import { ArrowLeft, CalendarClock, Copy, Eye, GripVertical, Link2, Plus, Save, Trash2, UserRound } from 'lucide-react'

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
  { value: 'phone', label: 'Phone number' },
  { value: 'number', label: 'Number' },
  { value: 'radio', label: 'Multiple choice (one answer)' },
  { value: 'dropdown', label: 'Dropdown (one answer)' },
  { value: 'checkbox', label: 'Checkboxes (one or many)' },
  { value: 'date', label: 'Date' },
  { value: 'file', label: 'File link' },
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

function SortableQuestionCard({
  field,
  index,
  onUpdate,
  onRemove,
}: {
  field: EditableField
  index: number
  onUpdate: (clientId: string, patch: Partial<EditableField>) => void
  onRemove: (clientId: string) => void
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: field.client_id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && 'relative z-10')}>
      <Card
        className={cn(
          'overflow-hidden border-slate-200/80 bg-white shadow-sm transition-shadow',
          isDragging && 'opacity-40 ring-2 ring-slate-300/60'
        )}
      >
        <CardHeader className="border-b border-slate-100 bg-slate-50/80 pb-3 pt-4">
          <div className="flex items-start gap-2">
            <button
              type="button"
              ref={setActivatorNodeRef}
              className={cn(
                'mt-0.5 flex h-9 w-9 shrink-0 touch-none items-center justify-center rounded-md border border-transparent text-muted-foreground',
                'hover:border-slate-200 hover:bg-white hover:text-foreground',
                'cursor-grab active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
              )}
              aria-label="Drag to reorder question"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1 pt-1">
              <CardTitle className="text-base font-medium text-slate-800">Question {index + 1}</CardTitle>
              <p className="mt-0.5 truncate text-sm text-muted-foreground">{field.label || 'Untitled question'}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => onRemove(field.client_id)}
              aria-label="Delete question"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 pt-5 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label>Question</Label>
            <Input value={field.label} onChange={(event) => onUpdate(field.client_id, { label: event.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={field.field_type}
              onValueChange={(value) => onUpdate(field.client_id, { field_type: value as ChurchFormFieldType })}
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
              onValueChange={(value) => onUpdate(field.client_id, { prefill_key: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {FORM_PREFILL_KEY_GROUPS.map((group) => (
                  <SelectGroup key={group.label}>
                    <SelectLabel>{group.label}</SelectLabel>
                    {group.keys.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Help text</Label>
            <Input
              value={field.description}
              onChange={(event) => onUpdate(field.client_id, { description: event.target.value })}
            />
          </div>
          {fieldTypeUsesOptions(field.field_type) ? (
            <FieldOptionsEditor
              fieldType={field.field_type}
              value={field.options}
              onChange={(options) => onUpdate(field.client_id, { options })}
            />
          ) : null}
          <div className="flex items-center gap-2 md:col-span-2">
            <Checkbox
              checked={field.required}
              onCheckedChange={(checked) => onUpdate(field.client_id, { required: checked === true })}
            />
            <Label>Required</Label>
          </div>
        </CardContent>
      </Card>
    </div>
  )
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
  const [groupId, setGroupId] = useState('')
  const [status, setStatus] = useState<ChurchForm['status']>('draft')
  const [enableProfileLookup, setEnableProfileLookup] = useState(false)
  const [captureRespondentLocation, setCaptureRespondentLocation] = useState(false)
  const [coverImageUrl, setCoverImageUrl] = useState('')
  const [accentColor, setAccentColor] = useState('auto')
  const [displayMode, setDisplayMode] = useState<FormDisplayMode>('classic')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [campYearId, setCampYearId] = useState('')
  const [campYears, setCampYears] = useState<CampYear[]>([])
  const [fields, setFields] = useState<EditableField[]>([])
  const [creatorName, setCreatorName] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const { data: groups } = useGroups(1, 300)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const activeField = useMemo(() => fields.find((f) => f.client_id === activeId) ?? null, [fields, activeId])
  const activeQuestionNumber = useMemo(() => {
    if (!activeId) return 0
    const i = fields.findIndex((f) => f.client_id === activeId)
    return i >= 0 ? i + 1 : 0
  }, [activeId, fields])

  const publicUrl = useMemo(() => {
    if (!slug || typeof window === 'undefined') return `/f/${slug}`
    return `${window.location.origin}/f/${slug}`
  }, [slug])

  useEffect(() => {
    if (!user) return
    void getAllCampYears().then(({ data }) => {
      if (data) setCampYears(data)
    })
  }, [user])

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
    setCreatorName(data.creator_name ?? null)
    setTitle(data.form.title)
    setDescription(data.form.description ?? '')
    setCategory(data.form.category ?? 'general')
    setSlug(data.form.slug)
    setGroupId(data.form.group_id ?? '')
    setStatus(data.form.status)
    setEnableProfileLookup(data.form.enable_profile_lookup)
    setCaptureRespondentLocation(data.form.capture_respondent_location)
    setCoverImageUrl(data.form.cover_image_url ?? '')
    setAccentColor(data.form.accent_color ?? 'auto')
    setDisplayMode(data.form.display_mode === 'stepped' ? 'stepped' : 'classic')
    setCampYearId(data.form.camp_year_id ?? '')
    setFields(data.fields.map(toEditableField))
    setLoading(false)
  }

  function updateField(clientId: string, patch: Partial<EditableField>) {
    setFields((current) => current.map((field) => (field.client_id === clientId ? { ...field, ...patch } : field)))
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)
    if (!over || active.id === over.id) return
    setFields((items) => {
      const oldIndex = items.findIndex((item) => item.client_id === active.id)
      const newIndex = items.findIndex((item) => item.client_id === over.id)
      if (oldIndex < 0 || newIndex < 0) return items
      return arrayMove(items, oldIndex, newIndex)
    })
  }

  function handleDragCancel() {
    setActiveId(null)
  }

  async function handleSave(publish = false) {
    if (!form) return

    if (category === CAMP_MEETING_REGISTRATION_CATEGORY && !campYearId) {
      toast({
        variant: 'destructive',
        title: 'Camp year required',
        description: 'Camp meeting forms must be linked to a camp year.',
      })
      return
    }

    setSaving(true)

    const formPatch = {
      title: title.trim(),
      description: description.trim() || undefined,
      category: category.trim() || 'general',
      group_id: groupId || null,
      slug: slug.trim(),
      enable_profile_lookup: enableProfileLookup,
      capture_respondent_location: captureRespondentLocation,
      cover_image_url: coverImageUrl.trim() || null,
      accent_color: accentColor === 'auto' ? null : accentColor,
      display_mode: displayMode,
      camp_year_id:
        category === CAMP_MEETING_REGISTRATION_CATEGORY ? campYearId || null : null,
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
      options: fieldTypeUsesOptions(field.field_type) ? parseFieldOptionsText(field.options) : undefined,
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
            <Button variant="outline" asChild>
              <Link href={`/admin/forms/${form.id}/preview`} target="_blank">
                <Eye className="mr-2 h-4 w-4" />
                Preview
              </Link>
            </Button>
            <Button variant="outline" onClick={() => router.push(`/admin/forms/${form.id}/responses`)}>
              View responses
            </Button>
            <Button
              variant="outline"
              className="text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
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
            <div className="flex flex-wrap gap-x-4 gap-y-1 pt-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <CalendarClock className="h-4 w-4 shrink-0" />
                Created {formatDateTime(form.created_at)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <UserRound className="h-4 w-4 shrink-0" />
                By{' '}
                <span className="font-medium text-slate-800">{creatorName ?? 'Unknown user'}</span>
              </span>
            </div>
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
                placeholder="Shown in a colored box below the header on the public form"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="cover-image">Header image URL (optional)</Label>
              <Input
                id="cover-image"
                value={coverImageUrl}
                onChange={(event) => setCoverImageUrl(event.target.value)}
                placeholder="https://… banner or flyer (shown at top on mobile)"
              />
              <p className="text-xs text-muted-foreground">
                Paste a link to a banner, flyer, or photo. Leave empty for a colored gradient header.
              </p>
              {isValidCoverImageUrl(coverImageUrl) ? (
                <div className="overflow-hidden rounded-lg border bg-slate-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={coverImageUrl.trim()}
                    alt="Header preview"
                    className="max-h-36 w-full object-cover"
                  />
                </div>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="accent">Public form color theme</Label>
              <Select value={accentColor} onValueChange={setAccentColor}>
                <SelectTrigger id="accent">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PUBLIC_FORM_ACCENT_OPTIONS.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="display-mode">Public form layout</Label>
              <Select value={displayMode} onValueChange={(value) => setDisplayMode(value as FormDisplayMode)}>
                <SelectTrigger id="display-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORM_DISPLAY_MODE_OPTIONS.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {FORM_DISPLAY_MODE_OPTIONS.find((option) => option.id === displayMode)?.description}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input id="category" value={category} onChange={(event) => setCategory(event.target.value)} />
            </div>
            {category === CAMP_MEETING_REGISTRATION_CATEGORY ? (
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="camp-year">Camp year</Label>
                <Select value={campYearId || undefined} onValueChange={setCampYearId}>
                  <SelectTrigger id="camp-year">
                    <SelectValue placeholder="Select camp year (required)" />
                  </SelectTrigger>
                  <SelectContent>
                    {campYears.map((year) => (
                      <SelectItem key={year.id} value={year.id}>
                        Camp Meeting {year.year} — {year.theme}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Only one camp meeting registration form is allowed per year.</p>
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="group">Campus / Activity scope</Label>
              <FormGroupSelect
                id="group"
                groups={groups ?? []}
                value={groupId}
                onValueChange={(value) => setGroupId(value === '__none__' ? '' : value)}
                allowUnassigned
                placeholder="Assign to a campus or activity"
              />
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
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Link2 className="h-3 w-3 text-muted-foreground" />
                {slug ? (
                  <FormPublicLink slug={slug} className="text-sm" />
                ) : (
                  <span className="text-muted-foreground">Set a slug to generate the public link</span>
                )}
              </div>
              {slug ? (
                <a
                  href={buildFormWhatsAppShareUrl({ formTitle: title, publicUrl })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex text-sm font-medium text-emerald-700 hover:underline"
                >
                  Share public link on WhatsApp
                </a>
              ) : null}
            </div>
            <div className="flex items-center gap-2 md:col-span-2">
              <Checkbox
                id="profile-lookup"
                checked={enableProfileLookup}
                onCheckedChange={(checked) => setEnableProfileLookup(checked === true)}
              />
              <div className="space-y-1">
                <Label htmlFor="profile-lookup">Ask for phone first and prefill from camp records</Label>
                <p className="text-sm text-muted-foreground">
                  Respondents see a phone step at the top of the public form (even if you do not add a separate Phone
                  question). They can tap &quot;Find my details&quot; to fill fields that have a prefill key below.
                  Add a Phone number question if you also want phone stored as its own answered field.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 md:col-span-2">
              <Checkbox
                id="capture-location"
                checked={captureRespondentLocation}
                onCheckedChange={(checked) => setCaptureRespondentLocation(checked === true)}
              />
              <div className="space-y-1">
                <Label htmlFor="capture-location">Offer optional GPS location on the public form</Label>
                <p className="text-sm text-muted-foreground">
                  Respondents can tap &quot;Use my location&quot; to share an approximate area (with browser
                  permission). Stored with their submission for outreach planning.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-2">
          <div className="flex flex-col gap-1 px-0.5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Questions</h2>
              <p className="text-sm text-muted-foreground">
                Drag the grip handle to reorder. Order is saved when you save or publish the form.
              </p>
            </div>
          </div>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <SortableContext items={fields.map((f) => f.client_id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-4 pt-2">
                {fields.map((field, index) => (
                  <SortableQuestionCard
                    key={field.client_id}
                    field={field}
                    index={index}
                    onUpdate={updateField}
                    onRemove={(clientId) =>
                      setFields((current) => current.filter((item) => item.client_id !== clientId))
                    }
                  />
                ))}
              </div>
            </SortableContext>
            <DragOverlay adjustScale={false}>
              {activeField ? (
                <Card className="w-[min(100vw-2rem,56rem)] cursor-grabbing border-slate-200 shadow-2xl ring-2 ring-slate-400/30">
                  <CardHeader className="border-b border-slate-100 bg-slate-50/90 pb-3 pt-4">
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-muted-foreground">
                        <GripVertical className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1 pt-1">
                        <CardTitle className="text-base font-medium text-slate-800">
                          Question {activeQuestionNumber || 1}
                        </CardTitle>
                        <p className="mt-0.5 truncate text-sm text-muted-foreground">
                          {activeField.label || 'Untitled question'}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>

        <Button variant="outline" onClick={() => setFields((current) => [...current, createEmptyField(current.length)])}>
          <Plus className="mr-2 h-4 w-4" />
          Add question
        </Button>

        <DeleteFormDialog
          form={form}
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          onDeleted={() => router.push('/admin/forms')}
        />
      </div>
    </div>
  )
}
