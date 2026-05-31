'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers'
import { createRlcVisitorAction } from '@/lib/actions/rlc'
import { serviceSelectValueToLabel } from '@/lib/rlc/visitor-form'
import type { CreateVisitorForm } from '@/lib/types'
import { RlcVisitorForm } from '@/components/rlc/rlc-visitor-form'
import { RlcPageHeader } from '@/components/rlc/rlc-page-header'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { useClientOnly } from '@/lib/hooks/use-client-only'

export default function AddRlcVisitorPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const isMounted = useClientOnly()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<CreateVisitorForm>({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    address: '',
    visit_date: '',
    service_attended: 'sunday_service',
    how_heard_about_church: '',
    invited_by_member_ids: [],
    assigned_follow_up_member_id: undefined,
    follow_up_notes: '',
    source: 'walk_in',
    gender: undefined,
    date_of_birth: '',
    occupation: '',
    marital_status: undefined,
  })

  useEffect(() => {
    if (isMounted && !form.visit_date) {
      setForm((f) => ({ ...f, visit_date: new Date().toISOString().split('T')[0] }))
    }
  }, [isMounted, form.visit_date])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.id) return
    if (!form.first_name.trim()) {
      toast({ variant: 'destructive', title: 'First name is required' })
      return
    }
    setLoading(true)
    const { data, error } = await createRlcVisitorAction(
      { ...form, service_attended: serviceSelectValueToLabel(form.service_attended) },
      user.id
    )
    setLoading(false)
    if (error || !data) {
      toast({ variant: 'destructive', title: 'Failed', description: error ?? 'Could not save visitor' })
      return
    }
    toast({ title: 'Visitor registered', description: `${form.first_name} added to RLC pipeline.` })
    router.push(`/admin/rlc/visitors/${data.id}`)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <RlcPageHeader
        title="Register RLC Visitor"
        subtitle="Capture complete visitor details for follow-up and conversion."
        backHref="/admin/rlc/visitors"
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <RlcVisitorForm form={form} onChange={setForm} />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.push('/admin/rlc/visitors')}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading} className="bg-rose-700 hover:bg-rose-800">
            {loading ? 'Saving…' : 'Register visitor'}
          </Button>
        </div>
      </form>
    </div>
  )
}
