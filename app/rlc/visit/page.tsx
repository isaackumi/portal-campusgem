'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { registerPublicRlcVisitorAction } from '@/lib/actions/rlc'
import { RLC_NAME } from '@/lib/constants/rlc'
import { validateVisitorPhoneFields } from '@/lib/rlc/visitor-phone'
import { serviceSelectValueToLabel } from '@/lib/rlc/visitor-form'
import type { CreateVisitorForm } from '@/lib/types'
import { RlcVisitorForm } from '@/components/rlc/rlc-visitor-form'
import { Button } from '@/components/ui/button'
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
    whatsapp: '',
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
    const phoneError = validateVisitorPhoneFields(form)
    if (phoneError) {
      toast({ variant: 'destructive', title: 'Invalid phone number', description: phoneError })
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
      `/rlc/visit/success?name=${encodeURIComponent(data.first_name)}&id=${encodeURIComponent(data.id)}${
        data.check_in_code ? `&code=${encodeURIComponent(data.check_in_code)}` : ''
      }`
    )
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-brand-50/80 via-white to-white dark:from-neutral-900 dark:via-neutral-950 dark:to-neutral-950">
      <div className="mx-auto w-full max-w-lg px-3 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-6 sm:px-4 sm:py-12">
        <div className="mb-6 px-1 text-center sm:mb-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-800 dark:bg-brand-400/10 dark:text-brand-300">
            <Church className="h-7 w-7" />
          </div>
          <p className="app-overline text-brand-700/80 dark:text-brand-300">{RLC_NAME}</p>
          <h1 className="app-page-title mt-1">Welcome — first time here?</h1>
          <p className="app-page-description mt-2">
            Register as a visitor so our team can follow up with you. Takes about 2 minutes.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 sm:space-y-6 [&_button[role=combobox]]:h-11 [&_button[role=combobox]]:text-base [&_input:not([type=checkbox]):not([type=radio])]:h-11 [&_input]:text-base [&_textarea]:text-base sm:[&_button[role=combobox]]:text-sm sm:[&_input]:text-sm sm:[&_textarea]:text-sm"
          aria-label="Visitor registration"
        >
          <p className="px-1 text-center text-xs text-muted-foreground">Your information is kept private and used for church follow-up only.</p>
          <RlcVisitorForm form={form} onChange={setForm} publicMode />

          <div className="fixed inset-x-0 bottom-0 z-20 border-t border-neutral-200 bg-white/95 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur dark:border-white/10 dark:bg-neutral-950/95 sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none sm:dark:bg-transparent">
            <div className="mx-auto max-w-lg">
              <Button type="submit" disabled={loading} size="lg" className="h-12 w-full text-base">
                {loading ? 'Submitting…' : 'Submit registration'}
              </Button>
            </div>
          </div>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Already a member?{' '}
          <Link href="/auth" className="text-brand-700 underline-offset-2 hover:underline dark:text-brand-300">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
