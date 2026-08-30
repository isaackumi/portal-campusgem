'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { registerPublicRlcMemberAction } from '@/lib/actions/rlc'
import { RLC_NAME } from '@/lib/constants/rlc'
import { emptyRlcMemberForm, RlcCreateMemberForm } from '@/components/rlc/rlc-create-member-form'
import type { CreateRlcMemberForm } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Church } from 'lucide-react'

export default function PublicRlcJoinPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<CreateRlcMemberForm>(emptyRlcMemberForm())

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.first_name.trim()) {
      toast({ variant: 'destructive', title: 'First name is required' })
      return
    }
    if (!form.phone.trim()) {
      toast({ variant: 'destructive', title: 'Phone number is required' })
      return
    }
    setLoading(true)
    const { data, error } = await registerPublicRlcMemberAction(form)
    setLoading(false)
    if (error || !data) {
      toast({ variant: 'destructive', title: 'Registration failed', description: error ?? 'Please try again.' })
      return
    }
    router.push(
      `/rlc/join/success?name=${encodeURIComponent(data.first_name)}&id=${encodeURIComponent(data.id)}${
        data.check_in_code ? `&code=${encodeURIComponent(data.check_in_code)}` : ''
      }`
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50/80 via-white to-white">
      <div className="mx-auto w-full max-w-lg px-4 py-8 sm:py-12">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-800">
            <Church className="h-7 w-7" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wide text-rose-700/80">{RLC_NAME}</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900 sm:text-3xl">Become a member</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Fill in your details so we can welcome you into the church family. Role is set to member.
          </p>
        </div>

        <Card className="border-rose-100/80 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Member registration</CardTitle>
            <CardDescription>Your information is kept private and used for church membership only.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <RlcCreateMemberForm form={form} onChange={setForm} publicMode />
              <Button
                type="submit"
                disabled={loading}
                className="h-11 w-full bg-rose-700 text-base hover:bg-rose-800"
              >
                {loading ? 'Submitting…' : 'Submit membership'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          First-time visitor?{' '}
          <Link href="/rlc/visit" className="text-rose-700 underline-offset-2 hover:underline">
            Register as a visitor
          </Link>
        </p>
      </div>
    </div>
  )
}
