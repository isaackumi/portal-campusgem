'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers'
import { createRlcMemberAction } from '@/lib/actions/rlc'
import { emptyRlcMemberForm, RlcCreateMemberForm } from '@/components/rlc/rlc-create-member-form'
import { PageContainer } from '@/components/layout/page-container'
import { RlcPageHeader } from '@/components/rlc/rlc-page-header'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import type { CreateRlcMemberForm } from '@/lib/types'

export default function AddRlcMemberPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<CreateRlcMemberForm>(emptyRlcMemberForm())

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.id) {
      toast({ variant: 'destructive', title: 'Sign in required' })
      return
    }
    if (!form.first_name.trim()) {
      toast({ variant: 'destructive', title: 'First name is required' })
      return
    }
    if (!form.phone.trim()) {
      toast({ variant: 'destructive', title: 'Phone number is required' })
      return
    }
    setLoading(true)
    const { data, error } = await createRlcMemberAction(form, user.id)
    setLoading(false)
    if (error || !data) {
      toast({ variant: 'destructive', title: 'Could not add member', description: error ?? 'Try again' })
      return
    }
    toast({ title: 'Member added', description: `${form.first_name} is now an RLC member.` })
    router.push(`/admin/rlc/members/${data.id}/edit`)
  }

  return (
    <PageContainer size="sm">
      <RlcPageHeader
        title="Add RLC member"
        subtitle="Create a full member profile — contact, WhatsApp, work, and ministry roles."
        backHref="/admin/rlc/members"
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <RlcCreateMemberForm form={form} onChange={setForm} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.push('/admin/rlc/members')}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading} className="bg-rose-700 hover:bg-rose-800">
            {loading ? 'Saving…' : 'Add member'}
          </Button>
        </div>
      </form>
    </PageContainer>
  )
}
