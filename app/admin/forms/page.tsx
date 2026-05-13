'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers'
import { createForm, listForms } from '@/lib/actions/forms'
import type { ChurchForm } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, ClipboardList, Link2, Plus } from 'lucide-react'

export default function FormsAdminPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const [forms, setForms] = useState<ChurchForm[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('outreach')

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth?redirect=' + encodeURIComponent('/admin/forms'))
    }
  }, [authLoading, user, router])

  useEffect(() => {
    if (!user) return
    void loadForms()
  }, [user])

  async function loadForms() {
    setLoading(true)
    const { data, error } = await listForms()
    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error })
    } else {
      setForms(data)
    }
    setLoading(false)
  }

  async function handleCreate() {
    if (!title.trim()) {
      toast({ variant: 'destructive', title: 'Title required', description: 'Give the form a name.' })
      return
    }

    setCreating(true)
    const { data, error } = await createForm({
      title: title.trim(),
      description: description.trim() || undefined,
      category: category.trim() || 'general',
      created_by: user?.id,
    })
    setCreating(false)

    if (error || !data) {
      toast({ variant: 'destructive', title: 'Create failed', description: error ?? 'Unknown error' })
      return
    }

    toast({ title: 'Form created', description: 'Add questions and publish when ready.' })
    router.push(`/admin/forms/${data.id}`)
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="mx-auto max-w-6xl space-y-6 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <Button variant="ghost" onClick={() => router.push('/admin')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Admin
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">Forms Hub</h1>
              <p className="mt-1 text-muted-foreground">
                Create outreach and event forms, publish shareable links, and review responses in one place.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>New form</CardTitle>
              <CardDescription>Start with a title. You can add questions on the next screen.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="form-title">Form name</Label>
                <Input
                  id="form-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Youth outreach sign-up"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="form-category">Category</Label>
                <Input
                  id="form-category"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  placeholder="outreach"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="form-description">Description</Label>
                <Textarea
                  id="form-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Shown at the top of the public form"
                  rows={4}
                />
              </div>
              <Button onClick={handleCreate} disabled={creating} className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                {creating ? 'Creating...' : 'Create form'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                All forms
              </CardTitle>
              <CardDescription>Camp meeting stays on its own registration flow. Everything else lives here.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {forms.length === 0 ? (
                <p className="text-sm text-muted-foreground">No forms yet.</p>
              ) : (
                forms.map((form) => (
                  <div
                    key={form.id}
                    className="flex flex-col gap-3 rounded-lg border bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-semibold text-gray-900">{form.title}</h2>
                        <Badge variant={form.status === 'published' ? 'default' : 'secondary'}>
                          {form.status}
                        </Badge>
                        {form.category ? <Badge variant="outline">{form.category}</Badge> : null}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {form.response_count ?? 0} responses
                      </p>
                      <p className="mt-1 flex items-center gap-1 text-xs text-blue-600">
                        <Link2 className="h-3 w-3" />
                        /f/{form.slug}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => router.push(`/admin/forms/${form.id}/responses`)}>
                        Responses
                      </Button>
                      <Button onClick={() => router.push(`/admin/forms/${form.id}`)}>Edit</Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
