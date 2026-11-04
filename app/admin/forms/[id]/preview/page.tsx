'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers'
import { getFormAdmin } from '@/lib/actions/forms'
import { loadGroupById } from '@/lib/actions/core-data'
import { getCampYearById } from '@/lib/actions/camp'
import { PublicFormRenderer } from '@/components/forms/public-form-renderer'
import { PublicFormLoadingState } from '@/components/forms/public-form-layout'
import type { ChurchForm, ChurchFormField } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading'
import { ArrowLeft, ExternalLink } from 'lucide-react'

export default function FormPreviewPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<ChurchForm | null>(null)
  const [fields, setFields] = useState<ChurchFormField[]>([])
  const [campusGroupName, setCampusGroupName] = useState<string | null>(null)
  const [campYearLabel, setCampYearLabel] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth?redirect=' + encodeURIComponent(`/admin/forms/${params.id}/preview`))
    }
  }, [authLoading, user, router, params.id])

  useEffect(() => {
    if (!user) return
    void loadPreview()
  }, [user, params.id])

  async function loadPreview() {
    setLoading(true)
    const { data, error } = await getFormAdmin(params.id)
    if (error || !data) {
      setForm(null)
      setLoading(false)
      return
    }

    setForm(data.form)
    setFields([...data.fields].sort((a, b) => a.sort_order - b.sort_order))

    if (data.form.group_id) {
      const groupRes = await loadGroupById(data.form.group_id)
      setCampusGroupName(groupRes.data?.name ?? null)
    } else {
      setCampusGroupName(null)
    }

    if (data.form.camp_year_id) {
      const yearRes = await getCampYearById(data.form.camp_year_id)
      if (yearRes.data) {
        setCampYearLabel(
          `${yearRes.data.year}${yearRes.data.theme ? ` · ${yearRes.data.theme}` : ''}`
        )
      }
    } else {
      setCampYearLabel(null)
    }

    setLoading(false)
  }

  if (authLoading || (user && loading)) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#eceff1] dark:bg-neutral-950">
        <LoadingSpinner />
      </div>
    )
  }

  if (!user) return null

  if (!form) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-[#eceff1] p-6 dark:bg-neutral-950">
        <p className="text-neutral-600 dark:text-neutral-300">Form not found.</p>
        <Button variant="outline" asChild>
          <Link href="/admin/forms">Back to Forms Hub</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="sticky top-0 z-[60] flex items-center justify-between gap-2 border-b border-neutral-200 bg-white/95 px-3 py-2 backdrop-blur dark:border-white/10 dark:bg-neutral-900/95 sm:px-6">
        <Button variant="ghost" size="sm" className="-ml-2 h-10 px-2" asChild>
          <Link href={`/admin/forms/${form.id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to editor
          </Link>
        </Button>
        <div className="flex min-w-0 items-center gap-2">
          <span className="hidden truncate text-sm text-neutral-500 dark:text-neutral-400 sm:inline">
            Preview · {form.display_mode === 'classic' ? 'Classic' : 'Step-by-step'}
          </span>
          {form.status === 'published' ? (
            <Button variant="outline" size="sm" className="h-10" asChild>
              <a href={`/f/${form.slug}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Live link
              </a>
            </Button>
          ) : null}
        </div>
      </div>
      <PublicFormRenderer
        form={form}
        fields={fields}
        campusGroupName={campusGroupName}
        campYearLabel={campYearLabel}
        previewMode
      />
    </div>
  )
}
