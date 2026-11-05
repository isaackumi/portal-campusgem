'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, GraduationCap, MapPin, RefreshCw, Search, Sparkles, Users } from 'lucide-react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { PageHeader } from '@/components/layout/page-header'
import { AccessDenied } from '@/components/auth/access-denied'
import { useAuth } from '@/components/providers'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { LoadingSpinner } from '@/components/ui/loading'
import { StatCard } from '@/components/ui/stat-card'
import { PersonAvatar } from '@/components/ui/person'
import { PhoneLink } from '@/components/contact/phone-link'
import { useToast } from '@/hooks/use-toast'
import {
  addCampusMembersAction,
  listCampusesAction,
  unassignedStudentsAction,
  type CampusCard,
  type CampusSuggestion,
} from '@/lib/actions/campuses'

export default function CampusesPage() {
  const { user, loading: authLoading, can } = useAuth()
  const router = useRouter()
  const allowed = can('groups.manage') || can('campus.lead')
  const [campuses, setCampuses] = useState<CampusCard[] | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await listCampusesAction()
    if (res.error || !res.data) {
      setError(res.error ?? 'Could not load campuses')
      return
    }
    setError(null)
    setIsAdmin(res.data.isAdmin)
    // A leader of exactly one campus goes straight to it.
    if (!res.data.isAdmin && res.data.campuses.length === 1) {
      router.replace(`/campuses/${encodeURIComponent(res.data.campuses[0].key)}`)
      return
    }
    setCampuses(res.data.campuses)
  }, [router])

  useEffect(() => {
    if (user && allowed) void load()
  }, [user, allowed, load])

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[400px] items-center justify-center"><LoadingSpinner /></div>
      </DashboardLayout>
    )
  }
  if (!allowed) {
    return (
      <DashboardLayout>
        <AccessDenied permission="campus.lead" />
      </DashboardLayout>
    )
  }

  const totals = (campuses ?? []).reduce(
    (acc, c) => ({ members: acc.members + c.member_count, leaders: acc.leaders + c.leader_count }),
    { members: 0, leaders: 0 }
  )

  return (
    <DashboardLayout>
      <PageHeader
        eyebrow="Campus Gem"
        title="Campuses"
        description={isAdmin ? 'Every campus fellowship, its people and forms.' : 'The campus fellowships you lead.'}
        actions={
          isAdmin ? (
            <Button asChild variant="outline" className="h-11 sm:h-10">
              <Link href="/admin/groups">Add or edit campuses</Link>
            </Button>
          ) : null
        }
      />

      {error ? (
        <div className="dashboard-panel p-5 text-sm text-red-700 dark:text-red-300">{error}</div>
      ) : campuses === null ? (
        <div className="flex min-h-[200px] items-center justify-center"><LoadingSpinner /></div>
      ) : campuses.length === 0 ? (
        <div className="dashboard-panel p-8 text-center">
          <GraduationCap className="mx-auto h-10 w-10 text-neutral-400 dark:text-neutral-500" aria-hidden />
          <h2 className="app-section-title mt-3">{isAdmin ? 'No campuses yet' : 'You don’t lead a campus yet'}</h2>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            {isAdmin
              ? 'Create a group of type “Campus fellowship” under Groups.'
              : 'Ask an administrator to make you leader or co-leader of your campus.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {isAdmin ? (
            <section aria-label="Campus totals" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
              <StatCard label="Campuses" value={campuses.length} icon={GraduationCap} />
              <StatCard label="Students tagged" value={totals.members} icon={Users} sub="Active campus members" />
              <StatCard label="Leaders" value={totals.leaders} sub="Leaders and co-leaders" className="col-span-2 lg:col-span-1" />
            </section>
          ) : null}

          <ul data-tour="campus-list" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {campuses.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/campuses/${encodeURIComponent(c.key)}`}
                  className="dashboard-panel group flex h-full flex-col p-5 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="app-section-title truncate">{c.name}</h2>
                      {c.meeting_location ? (
                        <p className="mt-1 flex items-center gap-1 text-[13px] text-neutral-500 dark:text-neutral-400">
                          <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                          <span className="truncate">{c.meeting_location}</span>
                        </p>
                      ) : null}
                    </div>
                    {c.short_code ? <Badge variant="brand" className="font-mono">{c.short_code}</Badge> : null}
                  </div>
                  <dl className="mt-4 grid grid-cols-3 gap-2">
                    {[
                      ['Members', c.member_count],
                      ['Leaders', c.leader_count],
                      ['Executives', c.executive_count],
                    ].map(([label, value]) => (
                      <div key={label as string}>
                        <dt className="app-stat-label">{label}</dt>
                        <dd className="text-lg font-semibold tabular-nums text-neutral-900 dark:text-white">{value}</dd>
                      </div>
                    ))}
                  </dl>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-600 dark:text-brand-300">
                    Open campus
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          {isAdmin ? <UnassignedStudents onChanged={load} /> : null}
        </div>
      )}
    </DashboardLayout>
  )
}

/** Admins: people with no campus who look like they belong to one, across all campuses. */
function UnassignedStudents({ onChanged }: { onChanged: () => void }) {
  const { toast } = useToast()
  const [data, setData] = useState<{ campuses: Array<{ id: string; key: string; label: string }>; people: CampusSuggestion[] } | null>(null)
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('')
  const [campusFilter, setCampusFilter] = useState<string>('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const res = await unassignedStudentsAction()
    setLoading(false)
    if (res.error || !res.data) {
      toast({ title: 'Could not look for students', description: res.error ?? undefined, variant: 'destructive' })
      return
    }
    setData(res.data)
    setSelected(new Set())
  }

  const labels = useMemo(() => new Map((data?.campuses ?? []).map((c) => [c.id, c.label])), [data])
  const rows = useMemo(() => {
    const q = filter.trim().toLowerCase()
    return (data?.people ?? []).filter(
      (p) =>
        (campusFilter === 'all' || (p.campus_ids ?? []).includes(campusFilter)) &&
        (!q || p.full_name.toLowerCase().includes(q) || p.reasons.some((r) => r.toLowerCase().includes(q)))
    )
  }, [data, filter, campusFilter])

  // Only people with one clear campus can be added in bulk.
  const chosen = rows.filter((p) => selected.has(p.user_id) && (p.campus_ids?.length ?? 0) === 1)

  async function addSelected() {
    const byCampus = new Map<string, string[]>()
    for (const p of chosen) {
      const id = p.campus_ids![0]
      byCampus.set(id, [...(byCampus.get(id) ?? []), p.user_id])
    }
    setSaving(true)
    let added = 0
    for (const [campusId, ids] of Array.from(byCampus.entries())) {
      const res = await addCampusMembersAction(campusId, ids)
      if (res.error) toast({ title: 'Some were not added', description: res.error, variant: 'destructive' })
      added += res.data?.added ?? 0
    }
    setSaving(false)
    toast({ title: `${added} added to their campus` })
    onChanged()
    await load()
  }

  return (
    <section className="dashboard-panel overflow-hidden" aria-labelledby="unassigned-title">
      <div className="flex flex-col gap-3 border-b border-neutral-200/80 p-5 dark:border-white/[0.06] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="unassigned-title" className="app-section-title flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand-600 dark:text-brand-300" aria-hidden />
            Unassigned students
          </h2>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            People with no campus whose school, residence or form answers match a campus.
          </p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading} className="h-11 sm:h-10">
          {loading ? <LoadingSpinner size="sm" className="mr-2" /> : <RefreshCw className="mr-2 h-4 w-4" aria-hidden />}
          {data ? 'Look again' : 'Find students'}
        </Button>
      </div>

      {data ? (
        <>
          <div className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" aria-hidden />
              <Input
                type="search"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter by name or reason"
                className="h-11 pl-10 sm:h-10"
                aria-label="Filter unassigned students"
              />
            </div>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Campus">
              {[{ id: 'all', label: 'All' }, ...data.campuses].map((c) => (
                <Button
                  key={c.id}
                  size="sm"
                  variant={campusFilter === c.id ? 'default' : 'outline'}
                  onClick={() => setCampusFilter(c.id)}
                  className="h-11 sm:h-8"
                >
                  {c.label}
                </Button>
              ))}
            </div>
          </div>
          {rows.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-neutral-600 dark:text-neutral-400">
              No matches. Add short codes and aliases (e.g. “Winneba”) to campuses under Groups to find more.
            </p>
          ) : (
            <ul className="divide-y divide-neutral-100 border-t border-neutral-200/80 dark:divide-white/[0.06] dark:border-white/[0.06]">
              {rows.map((p) => {
                const ambiguous = (p.campus_ids?.length ?? 0) !== 1
                return (
                  <li key={p.user_id} className="flex items-start gap-3 px-4 py-3 sm:px-5">
                    <Checkbox
                      className="mt-1"
                      checked={selected.has(p.user_id)}
                      disabled={ambiguous}
                      onCheckedChange={(v) =>
                        setSelected((prev) => {
                          const next = new Set(prev)
                          if (v === true) next.add(p.user_id)
                          else next.delete(p.user_id)
                          return next
                        })
                      }
                      aria-label={`Select ${p.full_name}`}
                    />
                    <PersonAvatar name={p.full_name} seed={p.user_id} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{p.full_name}</span>
                        {(p.campus_ids ?? []).map((id) => (
                          <Badge key={id} variant={ambiguous ? 'warning' : 'brand'} className="font-mono">
                            {labels.get(id) ?? '?'}
                          </Badge>
                        ))}
                        {ambiguous ? <span className="text-xs text-amber-700 dark:text-amber-300">Matches several: open the campus to add</span> : null}
                      </div>
                      <p className="mt-0.5 text-[13px] text-neutral-500 dark:text-neutral-400">{p.reasons.join(' · ')}</p>
                    </div>
                    {p.phone ? <PhoneLink phone={p.phone} name={p.full_name} className="hidden text-[13px] sm:inline-flex" /> : null}
                  </li>
                )
              })}
            </ul>
          )}
          {chosen.length > 0 ? (
            <div className="fixed inset-x-4 bottom-20 z-30 mx-auto flex max-w-md items-center justify-between gap-3 rounded-xl border border-neutral-200/80 bg-white/95 p-3 shadow-lg backdrop-blur dark:border-white/10 dark:bg-neutral-900/95 sm:bottom-6">
              <span className="text-sm text-neutral-700 dark:text-neutral-200">{chosen.length} selected</span>
              <Button onClick={addSelected} disabled={saving} className="h-11 sm:h-10">
                {saving ? <LoadingSpinner size="sm" className="mr-2" /> : null}
                Add to their campus
              </Button>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  )
}
