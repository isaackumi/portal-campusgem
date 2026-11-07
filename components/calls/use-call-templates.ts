'use client'

import { useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/components/providers'
import { useActiveCampYear } from '@/lib/hooks/use-camp'
import { formatCampDate } from '@/lib/camp/camp-reminders'
import { listCallTemplatesAction } from '@/lib/actions/call-center'
import { fillCallTemplate, templatesFor, type CallTemplate, type TemplateAudience, type TemplateVars } from '@/lib/calls/templates'

/** The WhatsApp templates callers pick from (the app's set until the server answers). */
export function useCallTemplates(audience: TemplateAudience = 'camp') {
  const query = useQuery({
    queryKey: ['call-templates', audience],
    queryFn: async () => {
      const res = await listCallTemplatesAction({ audience })
      if (res.error || !res.data) throw new Error(res.error ?? 'Could not load the templates')
      return { templates: res.data, canEdit: res.canEdit }
    },
    staleTime: 5 * 60_000,
  })
  return {
    templates: query.data?.templates ?? templatesFor(audience, []),
    canEdit: query.data?.canEdit ?? false,
    loading: query.isLoading,
  }
}

/** Fills a template for one person: their name, the caller's, and the active camp's details. */
export function useFillTemplate() {
  const { user } = useAuth()
  const { campYear } = useActiveCampYear()
  return useCallback(
    (template: Pick<CallTemplate, 'body'>, person: { first_name?: string | null; full_name?: string | null }, extra: TemplateVars = {}) => {
      const full = person.full_name?.trim() ?? ''
      const start = campYear?.start_date ? formatCampDate(campYear.start_date) : ''
      const end = campYear?.end_date && campYear.end_date !== campYear.start_date ? formatCampDate(campYear.end_date) : ''
      const vars: TemplateVars = {
        firstName: person.first_name?.trim() || full.split(/\s+/)[0] || '',
        name: full,
        callerName: user?.full_name?.trim().split(/\s+/)[0] ?? '',
        ministry: 'Campus GEM',
        campYear: campYear?.year ?? null,
        campDates: end ? `${start} – ${end}` : start,
        venue: campYear?.venue ?? null,
        theme: campYear?.theme ?? null,
        ...extra,
      }
      return fillCallTemplate(template.body, vars)
    },
    [user?.full_name, campYear]
  )
}
