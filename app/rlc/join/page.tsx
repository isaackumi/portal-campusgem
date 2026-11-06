'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { registerPublicRlcMemberAction } from '@/lib/actions/rlc'
import { RLC_NAME } from '@/lib/constants/rlc'
import { emptyRlcMemberForm, RlcCreateMemberForm } from '@/components/rlc/rlc-create-member-form'
import type { CreateRlcMemberForm } from '@/lib/types'
import { Button } from '@/components/ui/button'
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
    <div className="min-h-[100dvh] bg-neutral-50 dark:bg-neutral-950">
      <div className="mx-auto w-full max-w-lg px-3 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-6 sm:px-4 sm:py-12">
        <div className="mb-6 px-1 text-center sm:mb-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-neutral-500 dark:text-neutral-400">
            <Church className="h-7 w-7" />
          </div>
          <p className="app-overline text-brand-700/80 dark:text-brand-300">{RLC_NAME}</p>
          <h1 className="app-page-title mt-1">Become a member</h1>
          <p className="app-page-description mt-2">
            Fill in your details so we can welcome you into the church family. Role is set to member.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 sm:space-y-6 [&_button[role=combobox]]:h-11 [&_button[role=combobox]]:text-base [&_input:not([type=checkbox]):not([type=radio])]:h-11 [&_input]:text-base [&_textarea]:text-base sm:[&_button[role=combobox]]:text-sm sm:[&_input]:text-sm sm:[&_textarea]:text-sm"
          aria-label="Member registration"
        >
          <p className="px-1 text-center text-xs text-muted-foreground">Your information is kept private and used for church membership only.</p>
          <RlcCreateMemberForm form={form} onChange={setForm} publicMode />

          <div className="fixed inset-x-0 bottom-0 z-20 border-t border-neutral-200 bg-white/95 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur dark:border-white/10 dark:bg-neutral-950/95 sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none sm:dark:bg-transparent">
            <div className="mx-auto max-w-lg">
              <Button type="submit" disabled={loading} size="lg" className="h-12 w-full text-base">
                {loading ? 'Submitting…' : 'Submit membership'}
              </Button>
            </div>
          </div>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          First-time visitor?{' '}
          <Link href="/rlc/visit" className="text-brand-700 underline-offset-2 hover:underline dark:text-brand-300">
            Register as a visitor
          </Link>
        </p>
      </div>
    </div>
  )
}
