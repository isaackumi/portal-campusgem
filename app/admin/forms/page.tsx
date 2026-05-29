'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/components/providers'
import { createFormFromTemplate } from '@/lib/actions/form-templates'
import { FORM_TEMPLATES, getFormTemplate, type FormTemplateId } from '@/lib/forms/templates'
import {
  ensureCampMeetingRegistrationForm,
  ensureEaglesCampMeetingGroup,
} from '@/lib/actions/camp-meeting-form'
import { getAllCampYears } from '@/lib/actions/camp'
import {
  ensureCampusMemberRegistrationForm,
  publishCampusMemberRegistrationForm,
} from '@/lib/actions/campus-registration-form'
import {
  CAMP_MEETING_REGISTRATION_CATEGORY,
  DEFAULT_EAGLES_CAMP_MEETING_GROUP_NAME,
} from '@/lib/constants/camp-meeting'
import { CAMPUS_MEMBER_REGISTRATION_CATEGORY } from '@/lib/forms/campus-member-registration'
import type { ChurchForm, CampYear } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LoadingSpinner } from '@/components/ui/loading'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { useFormsHub, useInvalidateFormsHub } from '@/lib/hooks/use-forms-hub'
import { FormPublicLink } from '@/components/forms/form-public-link'
import { DeleteFormDialog } from '@/components/forms/delete-form-dialog'
import { FormGroupSelect } from '@/components/forms/group-select'
import { getGroupTypeLabel } from '@/lib/constants/groups'
import { formatDateTime } from '@/lib/utils'
import {
  ArrowLeft,
  BarChart3,
  Building2,
  CalendarClock,
  ClipboardList,
  Copy,
  ExternalLink,
  FileText,
  Link2,
  Plus,
  Sparkles,
  Trash2,
  UserRound,
} from 'lucide-react'

function statusTone(status: ChurchForm['status']) {
  switch (status) {
    case 'published':
      return 'default'
    case 'closed':
      return 'secondary'
    default:
      return 'outline'
  }
}

function FormsHubGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-56 animate-pulse rounded-lg border border-slate-200 bg-white" />
      ))}
    </div>
  )
}

function FormsAdminContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const invalidateFormsHub = useInvalidateFormsHub()
  const [filterGroupId, setFilterGroupIdState] = useState(() => searchParams.get('group') ?? '')
  const [creating, setCreating] = useState(false)
  const [creatingTemplate, setCreatingTemplate] = useState(false)
  const [creatingCampMeetingTemplate, setCreatingCampMeetingTemplate] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('outreach')
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [templateId, setTemplateId] = useState<FormTemplateId>('blank')
  const [search, setSearch] = useState('')
  const [formToDelete, setFormToDelete] = useState<ChurchForm | null>(null)
  const [campYears, setCampYears] = useState<CampYear[]>([])
  const [selectedCampYearId, setSelectedCampYearId] = useState('')

  const { forms, groups, creatorsById, isLoading, isFetching, error, refetch } = useFormsHub(
    filterGroupId,
    Boolean(user)
  )

  const groupMap = useMemo(() => new Map(groups.map((group) => [group.id, group])), [groups])

  const setFilterGroupId = useCallback(
    (groupId: string) => {
      const next = groupId.trim()
      setFilterGroupIdState(next)

      const current = searchParams.get('group') ?? ''
      if (next === current) return

      const params = new URLSearchParams(searchParams.toString())
      if (next) params.set('group', next)
      else params.delete('group')
      const query = params.toString()
      router.replace(query ? `/admin/forms?${query}` : '/admin/forms', { scroll: false })
    },
    [router, searchParams]
  )

  useEffect(() => {
    const fromUrl = searchParams.get('group') ?? ''
    setFilterGroupIdState((prev) => (prev === fromUrl ? prev : fromUrl))
  }, [searchParams])

  const filteredForms = useMemo(() => {
    const query = search.trim().toLowerCase()
    return forms.filter((form) => {
      if (!query) return true
      const groupName = form.group_id ? groupMap.get(form.group_id)?.name ?? '' : ''
      return (
        form.title.toLowerCase().includes(query) ||
        form.slug.toLowerCase().includes(query) ||
        (form.category ?? '').toLowerCase().includes(query) ||
        groupName.toLowerCase().includes(query)
      )
    })
  }, [forms, search, groupMap])

  const stats = useMemo(() => {
    const published = forms.filter((f) => f.status === 'published').length
    const responses = forms.reduce((sum, f) => sum + (f.response_count ?? 0), 0)
    const campusForms = forms.filter((f) => {
      const g = f.group_id ? groupMap.get(f.group_id) : undefined
      return g?.group_type === 'campus'
    }).length
    return { total: forms.length, published, responses, campusForms }
  }, [forms, groupMap])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth?redirect=' + encodeURIComponent('/admin/forms'))
    }
  }, [authLoading, user, router])

  useEffect(() => {
    if (filterGroupId) setSelectedGroupId(filterGroupId)
  }, [filterGroupId])

  useEffect(() => {
    if (!user) return
    void getAllCampYears().then(({ data }) => {
      if (!data?.length) return
      setCampYears(data)
      const preferred = data.find((y) => y.registration_open) ?? data.find((y) => y.is_active) ?? data[0]
      setSelectedCampYearId((prev) => prev || preferred.id)
    })
  }, [user])

  const lastErrorRef = useRef<string | null>(null)
  useEffect(() => {
    if (!error || error === lastErrorRef.current) return
    lastErrorRef.current = error
    toast({ variant: 'destructive', title: 'Error', description: error })
  }, [error, toast])

  async function applyCampMeetingGroupSelection(): Promise<{ id: string; name: string } | null> {
    const { data, error, created } = await ensureEaglesCampMeetingGroup()
    if (error || !data) {
      toast({
        variant: 'destructive',
        title: 'Group setup failed',
        description: error ?? 'Could not set up Eagles camp meeting group.',
      })
      return null
    }
    if (created) await invalidateFormsHub()
    setSelectedGroupId(data.id)
    return { id: data.id, name: data.name }
  }

  async function handleCreate() {
    if (!title.trim()) {
      toast({ variant: 'destructive', title: 'Title required', description: 'Give the form a name.' })
      return
    }

    let groupId = selectedGroupId
    let groupName = groupId ? groupMap.get(groupId)?.name : undefined

    if (templateId === 'camp_meeting_registration') {
      if (!selectedCampYearId) {
        toast({
          variant: 'destructive',
          title: 'Camp year required',
          description: 'Every camp meeting form must belong to a camp year.',
        })
        return
      }
      const group = await applyCampMeetingGroupSelection()
      if (!group) return
      groupId = group.id
      groupName = group.name
    } else if (!groupId) {
      toast({
        variant: 'destructive',
        title: 'Group required',
        description: 'Assign this form to a campus fellowship or general activity.',
      })
      return
    }

    setCreating(true)
    const { data, error } = await createFormFromTemplate({
      templateId,
      group_id: groupId,
      group_name: groupName,
      title: title.trim(),
      description: description.trim() || undefined,
      category: category.trim() || undefined,
      camp_year_id: templateId === 'camp_meeting_registration' ? selectedCampYearId : undefined,
      created_by: user?.id,
    })
    setCreating(false)

    if (error || !data) {
      toast({ variant: 'destructive', title: 'Create failed', description: error ?? 'Unknown error' })
      return
    }

    await invalidateFormsHub()
    setCreateOpen(false)
    setTitle('')
    setDescription('')
    setTemplateId('blank')
    toast({
      title: 'Form created',
      description:
        templateId === 'blank'
          ? 'Add questions and publish when ready.'
          : 'Template questions were added — review and publish when ready.',
    })
    router.push(`/admin/forms/${data.id}`)
  }

  async function handleTemplateChange(next: FormTemplateId) {
    setTemplateId(next)
    const template = getFormTemplate(next)
    let groupName = selectedGroupId ? groupMap.get(selectedGroupId)?.name : undefined

    if (next === 'camp_meeting_registration') {
      const group = await applyCampMeetingGroupSelection()
      if (group) groupName = group.name
    }

    setTitle(template.defaultTitle(groupName))
    setDescription(template.defaultDescription(groupName))
    setCategory(template.category)
  }

  async function handleCreateCampMeetingRegistrationTemplate() {
    if (!selectedCampYearId) {
      toast({
        variant: 'destructive',
        title: 'Select a camp year',
        description: 'Camp meeting forms must be linked to one camp year.',
      })
      return
    }

    setCreatingCampMeetingTemplate(true)
    const { data, created, error } = await ensureCampMeetingRegistrationForm(selectedCampYearId)
    setCreatingCampMeetingTemplate(false)

    if (error || !data) {
      toast({ variant: 'destructive', title: 'Setup failed', description: error ?? 'Unknown error' })
      return
    }

    await invalidateFormsHub()
    toast({
      title: created ? 'Camp meeting form ready' : 'Form already exists',
      description: created
        ? `Created under ${DEFAULT_EAGLES_CAMP_MEETING_GROUP_NAME} — review and publish when ready.`
        : `Opening existing camp meeting form for ${DEFAULT_EAGLES_CAMP_MEETING_GROUP_NAME}.`,
    })
    router.push(`/admin/forms/${data.id}`)
  }

  async function handleCreateCampusRegistrationTemplate() {
    const groupId = selectedGroupId || filterGroupId
    if (!groupId) {
      toast({
        variant: 'destructive',
        title: 'Select a campus group',
        description: 'Choose a campus fellowship in the filter or create dialog first.',
      })
      return
    }
    const group = groupMap.get(groupId)
    if (!group) return

    setCreatingTemplate(true)
    const { data, created, error } = await ensureCampusMemberRegistrationForm(groupId, group.name)
    if (error || !data) {
      setCreatingTemplate(false)
      toast({ variant: 'destructive', title: 'Setup failed', description: error ?? 'Unknown error' })
      return
    }

    if (created) {
      await publishCampusMemberRegistrationForm(data.id)
    }

    setCreatingTemplate(false)
    await invalidateFormsHub()
    toast({
      title: created ? 'Registration form ready' : 'Form already exists',
      description: created
        ? 'Campus member registration template created and published.'
        : 'Opening existing registration form for this campus.',
    })
    router.push(`/admin/forms/${data.id}`)
  }

  function copyFormLink(slug: string) {
    const url = `${window.location.origin}/f/${slug}`
    void navigator.clipboard.writeText(url)
    toast({ title: 'Link copied', description: url })
  }

  if (authLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  const showGridSkeleton = isLoading && forms.length === 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/40">
      <div className="mx-auto max-w-7xl space-y-8 p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <Button variant="ghost" className="-ml-2" onClick={() => router.push('/admin')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Admin
            </Button>
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-indigo-600">Forms & Outreach</p>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">Forms Hub</h1>
              <p className="mt-2 max-w-2xl text-muted-foreground">
                Professional forms for campus ministries and church-wide activities — publish shareable links and
                review responses in one place.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href="/admin/campus-activities">
                <Building2 className="mr-2 h-4 w-4" />
                Campus board
              </Link>
            </Button>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button className="bg-indigo-600 hover:bg-indigo-700">
                  <Plus className="mr-2 h-4 w-4" />
                  New form
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create a new form</DialogTitle>
                  <DialogDescription>Assign it to a campus or activity, then add questions on the next screen.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Start from template</Label>
                    <Select value={templateId} onValueChange={(v) => void handleTemplateChange(v as FormTemplateId)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FORM_TEMPLATES.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      {getFormTemplate(templateId).description}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="form-title">Form name</Label>
                    <Input
                      id="form-title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. ATU fellowship sign-up"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Campus / Activity</Label>
                    <FormGroupSelect
                      groups={groups}
                      value={selectedGroupId}
                      disabled={templateId === 'camp_meeting_registration'}
                      onValueChange={(v) => setSelectedGroupId(v === '__none__' ? '' : v)}
                    />
                    {templateId === 'camp_meeting_registration' ? (
                      <>
                        <p className="text-sm text-muted-foreground">
                          Camp meeting forms are assigned to{' '}
                          <span className="font-medium text-slate-800">{DEFAULT_EAGLES_CAMP_MEETING_GROUP_NAME}</span>.
                        </p>
                        <div className="space-y-2 pt-2">
                          <Label>Camp year</Label>
                          <Select value={selectedCampYearId} onValueChange={setSelectedCampYearId}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select camp year" />
                            </SelectTrigger>
                            <SelectContent>
                              {campYears.map((year) => (
                                <SelectItem key={year.id} value={year.id}>
                                  Camp Meeting {year.year} — {year.theme}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="form-category">Category tag</Label>
                    <Input
                      id="form-category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="outreach"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="form-description">Description</Label>
                    <Textarea
                      id="form-description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      placeholder="Shown at the top of the public form"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => void handleCreate()} disabled={creating}>
                    {creating ? 'Creating...' : 'Create & edit questions'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-indigo-100 bg-white/90 shadow-sm">
            <CardContent className="flex items-center gap-3 p-5">
              <FileText className="h-8 w-8 text-indigo-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total forms</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/90 shadow-sm">
            <CardContent className="flex items-center gap-3 p-5">
              <ExternalLink className="h-8 w-8 text-emerald-600" />
              <div>
                <p className="text-sm text-muted-foreground">Published</p>
                <p className="text-2xl font-bold">{stats.published}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/90 shadow-sm">
            <CardContent className="flex items-center gap-3 p-5">
              <BarChart3 className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total responses</p>
                <p className="text-2xl font-bold">{stats.responses}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/90 shadow-sm">
            <CardContent className="flex items-center gap-3 p-5">
              <Building2 className="h-8 w-8 text-violet-600" />
              <div>
                <p className="text-sm text-muted-foreground">Campus forms</p>
                <p className="text-2xl font-bold">{stats.campusForms}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-amber-200/80 bg-gradient-to-r from-amber-50 to-orange-50/50 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-amber-700" />
              Campus member registration
            </CardTitle>
            <CardDescription>
              One-click template with name, phone, education, and camp prefill — ideal for campus ministry onboarding.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label>Campus group</Label>
              <FormGroupSelect
                groups={groups.filter((g) => g.group_type === 'campus')}
                value={selectedGroupId || filterGroupId}
                onValueChange={(v) => {
                  const id = v === '__none__' ? '' : v
                  setSelectedGroupId(id)
                  setFilterGroupId(id)
                }}
                placeholder="Select campus fellowship"
              />
            </div>
            <Button
              variant="secondary"
              className="border-amber-300 bg-white hover:bg-amber-50"
              disabled={creatingTemplate}
              onClick={() => void handleCreateCampusRegistrationTemplate()}
            >
              {creatingTemplate ? 'Setting up...' : 'Create registration form'}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-indigo-200/80 bg-gradient-to-r from-indigo-50 to-violet-50/50 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ClipboardList className="h-5 w-5 text-indigo-700" />
              Eagles camp meeting registration
            </CardTitle>
            <CardDescription>
              One camp meeting sign-up form per year under{' '}
              <span className="font-medium text-slate-800">{DEFAULT_EAGLES_CAMP_MEETING_GROUP_NAME}</span>.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label>Camp year</Label>
              <Select value={selectedCampYearId} onValueChange={setSelectedCampYearId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select camp year" />
                </SelectTrigger>
                <SelectContent>
                  {campYears.map((year) => (
                    <SelectItem key={year.id} value={year.id}>
                      Camp Meeting {year.year} — {year.theme}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="secondary"
              className="border-indigo-300 bg-white hover:bg-indigo-50"
              disabled={creatingCampMeetingTemplate}
              onClick={() => void handleCreateCampMeetingRegistrationTemplate()}
            >
              {creatingCampMeetingTemplate ? 'Setting up...' : 'Create camp meeting form'}
            </Button>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4 rounded-xl border bg-white/90 p-4 shadow-sm sm:flex-row sm:items-center">
          <div className="flex-1 space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Filter by group</Label>
            <FormGroupSelect
              groups={groups}
              value={filterGroupId}
              onValueChange={(v) => setFilterGroupId(v === '__none__' ? '' : v)}
              allowUnassigned
              placeholder="All groups"
            />
          </div>
          <div className="flex-1 space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Search</Label>
            <Input
              placeholder="Search by title, slug, or group..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {showGridSkeleton ? (
          <FormsHubGridSkeleton />
        ) : filteredForms.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <ClipboardList className="mb-4 h-12 w-12 text-slate-300" />
              <h3 className="text-lg font-semibold text-slate-900">
                {forms.length === 0 ? 'No forms yet' : 'No matching forms'}
              </h3>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                {forms.length === 0
                  ? 'Create a custom form or generate a campus member registration template to get started.'
                  : 'Try a different search or clear the group filter.'}
              </p>
              {forms.length === 0 ? (
                <Button className="mt-6" onClick={() => setCreateOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create your first form
                </Button>
              ) : (
                <Button className="mt-6" variant="outline" onClick={() => void refetch()}>
                  Refresh list
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div
            className={isFetching ? 'grid gap-4 opacity-60 transition-opacity sm:grid-cols-2 xl:grid-cols-3' : 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3'}
          >
            {filteredForms.map((form) => {
              const group = form.group_id ? groupMap.get(form.group_id) : undefined
              const isRegistration = form.category === CAMPUS_MEMBER_REGISTRATION_CATEGORY
              const isCampMeeting = form.category === CAMP_MEETING_REGISTRATION_CATEGORY
              const creatorName = form.created_by
                ? creatorsById[form.created_by] ?? 'Unknown user'
                : 'Unknown'
              return (
                <Card
                  key={form.id}
                  className="flex flex-col overflow-hidden border-slate-200/80 bg-white shadow-sm transition-shadow hover:shadow-md"
                >
                  <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="line-clamp-2 text-base leading-snug">{form.title}</CardTitle>
                      <Badge variant={statusTone(form.status)} className="shrink-0 capitalize">
                        {form.status}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {group ? (
                        <Badge variant="secondary" className="font-normal">
                          {group.name}
                        </Badge>
                      ) : null}
                      {isRegistration ? (
                        <Badge className="bg-amber-100 font-normal text-amber-900 hover:bg-amber-100">
                          Member registration
                        </Badge>
                      ) : isCampMeeting ? (
                        <Badge className="bg-indigo-100 font-normal text-indigo-900 hover:bg-indigo-100">
                          Camp meeting
                        </Badge>
                      ) : form.category ? (
                        <Badge variant="outline" className="font-normal">
                          {form.category}
                        </Badge>
                      ) : null}
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col gap-4 pt-4">
                    {form.description ? (
                      <p className="line-clamp-2 text-sm text-muted-foreground">{form.description}</p>
                    ) : null}
                    <div className="space-y-1.5 text-xs text-muted-foreground">
                      <p className="flex items-center gap-1.5">
                        <CalendarClock className="h-3.5 w-3.5 shrink-0" />
                        <span>Created {formatDateTime(form.created_at)}</span>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <UserRound className="h-3.5 w-3.5 shrink-0" />
                        <span>
                          By <span className="font-medium text-slate-700">{creatorName}</span>
                        </span>
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="rounded-lg bg-slate-50 px-3 py-2">
                        <p className="text-xs text-muted-foreground">Responses</p>
                        <p className="font-semibold">{form.response_count ?? 0}</p>
                      </div>
                      <div className="rounded-lg bg-slate-50 px-3 py-2">
                        <p className="text-xs text-muted-foreground">Scope</p>
                        <p className="truncate font-semibold">
                          {group ? getGroupTypeLabel(group.group_type) : 'Unassigned'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 truncate text-xs">
                      <Link2 className="h-3 w-3 shrink-0 text-muted-foreground" />
                      <FormPublicLink slug={form.slug} showPathOnly />
                    </div>
                    <div className="mt-auto grid grid-cols-2 gap-2">
                      <Button variant="outline" size="sm" onClick={() => copyFormLink(form.slug)}>
                        <Copy className="mr-1 h-3.5 w-3.5" />
                        Copy link
                      </Button>
                      <Button size="sm" onClick={() => router.push(`/admin/forms/${form.id}`)}>
                        Edit
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="col-span-2"
                        onClick={() => router.push(`/admin/forms/${form.id}/responses`)}
                      >
                        View responses
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="col-span-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => setFormToDelete(form)}
                      >
                        <Trash2 className="mr-1 h-3.5 w-3.5" />
                        Delete form
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
        <DeleteFormDialog
          form={formToDelete}
          open={formToDelete != null}
          onOpenChange={(open) => {
            if (!open) setFormToDelete(null)
          }}
          onDeleted={() => {
            setFormToDelete(null)
            void invalidateFormsHub()
          }}
        />
      </div>
    </div>
  )
}

export default function FormsAdminPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center">
          <LoadingSpinner />
        </div>
      }
    >
      <FormsAdminContent />
    </Suspense>
  )
}
