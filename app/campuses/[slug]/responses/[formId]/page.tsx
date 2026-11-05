'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { useAuth } from '@/components/providers'
import { AccessDenied } from '@/components/auth/access-denied'
import { LoadingSpinner } from '@/components/ui/loading'
import { PhoneLink } from '@/components/contact/phone-link'
import { formatResponseValue } from '@/lib/forms/analytics'
import { findCampusIdForKey, listCampusFormResponsesAction } from '@/lib/actions/campuses'
import type { ChurchForm, ChurchFormField, ChurchFormResponse } from '@/lib/types'

/** Read-only responses for a campus form (campus leaders; admins use /admin/forms). */
export default function CampusFormResponsesPage() {
  const params = useParams()
  const key = String(params.slug ?? '')
  const formId = String(params.formId ?? '')
  const { user, loading: authLoading, can } = useAuth()
  const allowed = can('groups.manage') || can('campus.lead')
  const [data, setData] = useState<{ form: ChurchForm; fields: ChurchFormField[]; responses: ChurchFormResponse[] } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user || !allowed) return
    let alive = true
    ;(async () => {
      const groupId = await findCampusIdForKey(key)
      if (!groupId) {
        if (alive) setError('Campus not found.')
        return
      }
      const res = await listCampusFormResponsesAction(groupId, formId)
      if (!alive) return
      if (res.error || !res.data) setError(res.error ?? 'Could not load responses')
      else setData(res.data)
    })()
    return () => {
      alive = false
    }
  }, [user, allowed, key, formId])

  if (!authLoading && !allowed) {
    return (
      <DashboardLayout>
        <AccessDenied permission="campus.lead" />
      </DashboardLayout>
    )
  }

  const fields = (data?.fields ?? []).slice().sort((a, b) => a.sort_order - b.sort_order)

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <Link
          href={`/campuses/${encodeURIComponent(key)}`}
          className="inline-flex min-h-9 items-center gap-1 text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to campus
        </Link>
        {error ? (
          <div className="dashboard-panel p-5 text-sm text-red-700 dark:text-red-300">{error}</div>
        ) : !data ? (
          <div className="flex min-h-[300px] items-center justify-center"><LoadingSpinner /></div>
        ) : (
          <>
            <div>
              <p className="app-overline mb-2">Form responses · read only</p>
              <h1 className="app-page-title">{data.form.title}</h1>
              <p className="app-page-description mt-1">{data.responses.length} response{data.responses.length === 1 ? '' : 's'}</p>
            </div>
            {data.responses.length === 0 ? (
              <div className="dashboard-panel p-6 text-center text-sm text-neutral-600 dark:text-neutral-400">No responses yet.</div>
            ) : (
              <ul className="space-y-3">
                {data.responses.map((r) => (
                  <li key={r.id} className="dashboard-panel p-4 sm:p-5">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{r.respondent_name || 'Anonymous'}</p>
                      <p className="text-[13px] text-neutral-500 dark:text-neutral-400">{new Date(r.submitted_at).toLocaleString()}</p>
                    </div>
                    {r.respondent_phone ? (
                      <div className="mt-1 text-[13px]"><PhoneLink phone={r.respondent_phone} name={r.respondent_name} /></div>
                    ) : null}
                    <dl className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
                      {fields.map((f) => (
                        <div key={f.id} className="min-w-0">
                          <dt className="app-stat-label">{f.label}</dt>
                          <dd className="break-words text-sm text-neutral-800 dark:text-neutral-200">{formatResponseValue(r.values[f.id])}</dd>
                        </div>
                      ))}
                    </dl>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
