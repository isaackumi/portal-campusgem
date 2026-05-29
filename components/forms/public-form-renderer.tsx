'use client'

import { normalizeFormDisplayMode } from '@/lib/forms/display-mode'
import { usePublicForm } from '@/hooks/use-public-form'
import { PublicFormClassicView } from '@/components/forms/public-form-classic-view'
import { PublicFormSteppedView } from '@/components/forms/public-form-stepped-view'
import type { ChurchForm, ChurchFormField } from '@/lib/types'

type Props = {
  form: ChurchForm
  fields: ChurchFormField[]
  campusGroupName?: string | null
  campYearLabel?: string | null
  previewMode?: boolean
}

export function PublicFormRenderer({
  form,
  fields,
  campusGroupName,
  campYearLabel,
  previewMode = false,
}: Props) {
  const formKey = `${form.id}-${form.updated_at}-${form.accent_color ?? 'auto'}-${form.display_mode ?? 'stepped'}`

  const controller = usePublicForm({
    form,
    fields,
    campusGroupName,
    campYearLabel,
    previewMode,
  })

  const displayMode = normalizeFormDisplayMode(form.display_mode)

  if (displayMode === 'stepped') {
    return <PublicFormSteppedView key={formKey} controller={controller} />
  }

  return <PublicFormClassicView key={formKey} controller={controller} />
}
