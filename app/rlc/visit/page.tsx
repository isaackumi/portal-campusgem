'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { registerPublicRlcVisitorAction } from '@/lib/actions/rlc'
import { RLC_NAME } from '@/lib/constants/rlc'
import { serviceSelectValueToLabel } from '@/lib/rlc/visitor-form'
import type { CreateVisitorForm } from '@/lib/types'
import { RlcVisitorForm } from '@/components/rlc/rlc-visitor-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useClientOnly } from '@/lib/hooks/use-client-only'
import { Church } from 'lucide-react'

export default function PublicRlcVisitPage() {
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
    if (!form.first_name.trim()) {
      toast({ variant: 'destructive', title: 'First name is required' })
      return
    }
    setLoading(true)
    const { data, error } = await registerPublicRlcVisitorAction({
      ...form,
      service_attended: serviceSelectValueToLabel(form.service_attended),
    })
    setLoading(false)
    if (error || !data) {
      toast({ variant: 'destructive', title: 'Registration failed', description: error ?? 'Please try again.' })
      return
    }
    router.push(
      `/rlc/visit/success?name=${encodeURIComponent(data.first_name)}&id=${encodeURIComponent(data.id)}`
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
          <h1 className="mt-1 text-2xl font-semibold text-slate-900 sm:text-3xl">Welcome — first time here?</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Register as a visitor so our team can follow up with you. Takes about 2 minutes.
          </p>
        </div>

        <Card className="border-rose-100/80 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Visitor registration</CardTitle>
            <CardDescription>Your information is kept private and used for church follow-up only.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <RlcVisitorForm form={form} onChange={setForm} publicMode />

              <Button
                type="submit"
                disabled={loading}
                className="h-11 w-full bg-rose-700 text-base hover:bg-rose-800"
              >
                {loading ? 'Submitting…' : 'Submit registration'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Already a member?{' '}
          <Link href="/auth" className="text-rose-700 underline-offset-2 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
