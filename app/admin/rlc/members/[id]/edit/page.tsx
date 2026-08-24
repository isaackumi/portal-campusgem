'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers'
import { loadRlcMemberAction, updateRlcMemberAction } from '@/lib/actions/rlc'
import type { Member } from '@/lib/types'
import { memberToRlcForm, RlcMemberForm, type RlcMemberFormState } from '@/components/rlc/rlc-member-form'
import { PageContainer } from '@/components/layout/page-container'
import { RlcPageHeader } from '@/components/rlc/rlc-page-header'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading'
import { useToast } from '@/hooks/use-toast'

export default function EditRlcMemberPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const id = String(params.id)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [member, setMember] = useState<Member | null>(null)
  const [form, setForm] = useState<RlcMemberFormState | null>(null)

  useEffect(() => {
    let cancelled = false
    loadRlcMemberAction(id).then(({ data, error }) => {
      if (cancelled) return
      if (error || !data) {
        toast({ variant: 'destructive', title: 'Not found', description: error ?? 'Member not found' })
        router.push('/admin/rlc/members')
        return
      }
      setMember(data)
      setForm(memberToRlcForm(data))
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
    if (form.rlcRoles.length === 0) {
      toast({ variant: 'destructive', title: 'Select at least one role' })
      return
    }
    setSaving(true)
    const { error } = await updateRlcMemberAction({
      memberId: id,
      performedBy: user.id,
      rlcRoles: form.rlcRoles,
      rlcMembershipType: form.rlcMembershipType,
    })
    setSaving(false)
    if (error) {
      toast({ variant: 'destructive', title: 'Update failed', description: error })
      return
    }
    toast({ title: 'Member updated' })
    router.push('/admin/rlc/members')
  }

  if (loading || !member || !form) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <PageContainer size="sm">
      <RlcPageHeader
        title={`Edit ${member.user?.full_name ?? 'Member'}`}
        subtitle="Update RLC membership type and ministry roles."
        backHref="/admin/rlc/members"
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <RlcMemberForm member={member} form={form} onChange={setForm} />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.push('/admin/rlc/members')}>
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
