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
import { Save } from 'lucide-react'

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

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault()
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
    toast({ title: 'RLC settings saved' })
    router.push('/admin/rlc/members')
  }

  if (loading || !member || !form) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  const memberName = member.user?.full_name?.trim() || 'Member'

  return (
    <PageContainer size="lg" className="pb-24 lg:pb-8">
      <RlcPageHeader
        title={memberName}
        subtitle="Update RLC membership type and ministry roles. Contact details are edited separately in the directory."
        backHref="/admin/rlc/members"
        actions={
          <>
            <Button type="button" variant="outline" onClick={() => router.push('/admin/rlc/members')}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={saving}
              className="bg-rose-700 hover:bg-rose-800"
              onClick={() => void handleSubmit()}
            >
              <Save className="mr-2 h-4 w-4" aria-hidden />
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </>
        }
      />

      <form onSubmit={handleSubmit} className="mt-6">
        <RlcMemberForm member={member} form={form} onChange={setForm} />
      </form>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-white/80 lg:hidden">
        <div className="mx-auto flex max-w-lg gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => router.push('/admin/rlc/members')}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={saving}
            className="flex-1 bg-rose-700 hover:bg-rose-800"
            onClick={() => void handleSubmit()}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </div>
    </PageContainer>
  )
}
