'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { useAuth } from '@/components/providers'
import { WhatsappLogo } from '@/components/icons/whatsapp-logo'
import { hasPermission } from '@/lib/auth/roles'
import { buildFormWhatsAppShareUrl } from '@/lib/forms/whatsapp-share'
import type { ChurchForm } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { usePublicFormTheme } from '@/components/forms/public-form-theme-context'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { BarChart3, LogIn, Share2 } from 'lucide-react'

type Props = {
  form: ChurchForm
  campYearLabel?: string | null
  previewMode?: boolean
}

export function PublicFormToolbar({ form, campYearLabel, previewMode }: Props) {
  const { user, loading } = useAuth()
  const { toast } = useToast()
  const theme = usePublicFormTheme()

  const publicUrl = useMemo(() => {
    if (typeof window === 'undefined') return `/f/${form.slug}`
    return `${window.location.origin}/f/${form.slug}`
  }, [form.slug])

  if (previewMode) return null

  const whatsappHref = buildFormWhatsAppShareUrl({
    formTitle: form.title,
    publicUrl,
    campYearLabel: campYearLabel ?? undefined,
  })

  const canManageForms = Boolean(user?.role && hasPermission(user.role, 'forms.manage'))
  const authRedirect = `/auth?redirect=${encodeURIComponent(`/f/${form.slug}`)}`

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 sm:mb-6">
      <div className="flex flex-wrap items-center gap-2">
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium text-white shadow-sm transition hover:opacity-95',
            theme.button
          )}
        >
          <WhatsappLogo className="h-4 w-4" />
          Share on WhatsApp
        </a>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-10 rounded-full bg-white/90"
          onClick={() => {
            void navigator.clipboard.writeText(publicUrl).then(() => {
              toast({ title: 'Link copied', description: publicUrl })
            })
          }}
        >
          <Share2 className="mr-1.5 h-4 w-4" />
          Copy link
        </Button>
      </div>

      {!loading ? (
        canManageForms ? (
          <Button variant="secondary" size="sm" className="h-10 rounded-full bg-white/90" asChild>
            <Link href={`/admin/forms/${form.id}/responses`}>
              <BarChart3 className="mr-1.5 h-4 w-4" />
              View responses
            </Link>
          </Button>
        ) : (
          <Button variant="ghost" size="sm" className="h-10 rounded-full text-slate-600" asChild>
            <Link href={authRedirect}>
              <LogIn className="mr-1.5 h-4 w-4" />
              Admin login
            </Link>
          </Button>
        )
      ) : null}
    </div>
  )
}
