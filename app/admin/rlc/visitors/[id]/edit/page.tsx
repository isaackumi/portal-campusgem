'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers'
import { loadRlcVisitorAction, updateRlcVisitorAction } from '@/lib/actions/rlc'
import { serviceSelectValueToLabel, visitorToForm } from '@/lib/rlc/visitor-form'
import type { CreateVisitorForm } from '@/lib/types'
import { RlcVisitorForm } from '@/components/rlc/rlc-visitor-form'
import { PageContainer } from '@/components/layout/page-container'
import { RlcPageHeader } from '@/components/rlc/rlc-page-header'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading'
import { useToast } from '@/hooks/use-toast'

export default function EditRlcVisitorPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const id = String(params.id)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<CreateVisitorForm | null>(null)
  const [name, setName] = useState('')

  useEffect(() => {
    let cancelled = false
    loadRlcVisitorAction(id).then(({ data, error }) => {
      if (cancelled) return
      if (error || !data) {
        toast({ variant: 'destructive', title: 'Not found', description: error ?? 'Visitor not found' })
        router.push('/admin/rlc/visitors')
        return
      }
      setForm(visitorToForm(data))
      setName([data.first_name, data.last_name].filter(Boolean).join(' '))
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- toast/router stable enough; avoid re-fetch loops
  }, [id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.id || !form) return
    if (!form.first_name.trim()) {
      toast({ variant: 'destructive', title: 'First name is required' })
      return
    }
    setSaving(true)
    const payload = {
      ...form,
      service_attended: serviceSelectValueToLabel(form.service_attended),
    }
    const { error } = await updateRlcVisitorAction(id, payload, user.id)
    setSaving(false)
    if (error) {
      toast({ variant: 'destructive', title: 'Update failed', description: error })
      return
    }
    toast({ title: 'Visitor updated' })
    router.push(`/admin/rlc/visitors/${id}`)
  }

  if (loading || !form) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <PageContainer size="sm">
      <RlcPageHeader
        title={`Edit ${name}`}
        subtitle="Update visitor details if something was missed at registration."
        backHref={`/admin/rlc/visitors/${id}`}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <RlcVisitorForm form={form} onChange={setForm} showPipelineFields />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.push(`/admin/rlc/visitors/${id}`)}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving} className="bg-rose-700 hover:bg-rose-800">
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </form>
    </PageContainer>
  )
}
