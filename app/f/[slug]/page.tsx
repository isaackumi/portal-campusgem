'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { getPublishedFormBySlug } from '@/lib/actions/forms'
import { PublicFormRenderer } from '@/components/forms/public-form-renderer'
import {
  PublicFormLoadingState,
  PublicFormNotFound,
} from '@/components/forms/public-form-layout'
import type { ChurchForm, ChurchFormField } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'

export default function PublicFormPage() {
  const params = useParams<{ slug: string }>()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<ChurchForm | null>(null)
  const [fields, setFields] = useState<ChurchFormField[]>([])
  const [campusGroupName, setCampusGroupName] = useState<string | null>(null)
  const [campYearLabel, setCampYearLabel] = useState<string | null>(null)

  useEffect(() => {
    void loadForm()
  }, [params.slug])

  async function loadForm() {
    setLoading(true)
    const { data, error } = await getPublishedFormBySlug(params.slug)
    if (error || !data) {
      toast({
        variant: 'destructive',
        title: 'Form unavailable',
        description: error ?? 'This form is not published.',
      })
      setLoading(false)
      return
    }
    setForm(data.form)
    setFields([...data.fields].sort((a, b) => a.sort_order - b.sort_order))
    setCampusGroupName(data.group_name ?? null)
    setCampYearLabel(data.camp_year_label ?? null)
    setLoading(false)
  }

  if (loading) return <PublicFormLoadingState />
  if (!form) return <PublicFormNotFound />

  return (
    <PublicFormRenderer
      form={form}
      fields={fields}
      campusGroupName={campusGroupName}
      campYearLabel={campYearLabel}
    />
  )
}
