'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, ExternalLink, FileText, UserPlus } from 'lucide-react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { useAuth } from '@/components/providers'
import { AccessDenied } from '@/components/auth/access-denied'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading'
import { Tabs, TabsContent, ScrollableTabsList, TabsTrigger } from '@/components/ui/tabs'
import { GroupSmsComposer } from '@/components/groups/group-sms-composer'
import { CampusMembersPanel } from '@/components/campus/campus-members-panel'
import { CampusOnboardingPanel } from '@/components/campus/campus-onboarding-panel'
import { CampusOutreachPanel } from '@/components/outreach/campus-outreach-panel'
import { useToast } from '@/hooks/use-toast'
import { loadCampusPageAction, sendCampusSmsAction, setupCampusFormAction, type CampusPageData } from '@/lib/actions/campuses'
import { CAMPUS_MEMBER_REGISTRATION_CATEGORY } from '@/lib/forms/campus-member-registration'
import { STUDENT_REGISTRATION_CATEGORY } from '@/lib/constants/corporate-gem'

export default function CampusPage() {
  const params = useParams()
  const key = String(params.slug ?? '')
  const { user, loading: authLoading, can } = useAuth()
  const [data, setData] = useState<CampusPageData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const allowed = can('groups.manage') || can('campus.lead')

  const load = useCallback(async () => {
    const res = await loadCampusPageAction(key)
    if (res.error || !res.data) setError(res.error ?? 'Could not load this campus')
    else {
      setError(null)
      setData(res.data)
    }
  }, [key])

  useEffect(() => {
    if (user && allowed) void load()
  }, [user, allowed, load])

  if (authLoading || (allowed && !data && !error)) {
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
  if (error || !data) {
    return (
      <DashboardLayout>
        <div className="dashboard-panel mx-auto max-w-md p-6 text-center">
          <h1 className="app-section-title">Can’t open this campus</h1>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{error}</p>
          <Button asChild variant="outline" className="mt-4 h-11 sm:h-10">
            <Link href="/campuses">Back to campuses</Link>
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  return <CampusView data={data} reload={load} />
}

function CampusView({ data, reload }: { data: CampusPageData; reload: () => Promise<void> }) {
  const { group, memberships, access } = data
  const label = group.short_code || group.name
  const canManage = access === 'manage'
  const leaders = memberships.filter((m) => m.role === 'leader' || m.role === 'co_leader').length
  const [tab, setTab] = useState('members')

  // /campuses/ug?tab=outreach opens that tab.
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('tab')
    if (t) setTab(t)
  }, [])

  const facts = [
    `${memberships.length} ${memberships.length === 1 ? 'member' : 'members'}`,
    leaders ? `${leaders} ${leaders === 1 ? 'leader' : 'leaders'}` : 'no leader yet',
    group.meeting_location,
    group.meeting_schedule,
  ].filter(Boolean)

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <div>
          <div className="flex items-center justify-between gap-3">
            <Link
              href="/campuses"
              className="-ml-1 inline-flex min-h-10 items-center gap-1 px-1 text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Campuses
            </Link>
            {data.isAdmin ? (
              <Link
                href={`/groups/${group.id}`}
                className="inline-flex min-h-10 items-center px-1 text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
              >
                Settings
              </Link>
            ) : null}
          </div>
          <h1 className="app-page-title mt-1 flex flex-wrap items-center gap-2">
            {group.name}
            {group.short_code ? <Badge variant="brand" className="font-mono text-sm">{group.short_code}</Badge> : null}
            {!canManage ? <Badge variant="secondary">View only</Badge> : null}
          </h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{facts.join(' · ')}</p>
          {group.description ? (
            <p className="mt-2 line-clamp-2 max-w-2xl text-sm text-neutral-600 dark:text-neutral-400">{group.description}</p>
          ) : null}
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <ScrollableTabsList>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="leaders">Leaders</TabsTrigger>
            <TabsTrigger value="outreach">Outreach</TabsTrigger>
            <TabsTrigger value="forms">Forms</TabsTrigger>
            {canManage ? <TabsTrigger value="onboarding">Add students</TabsTrigger> : null}
            {data.canText ? <TabsTrigger value="text">Text</TabsTrigger> : null}
          </ScrollableTabsList>

          <TabsContent value="members" className="mt-4">
            <CampusMembersPanel
              groupId={group.id}
              label={label}
              memberships={memberships}
              canManage={canManage}
              canAssignLeader={data.canAssignLeader}
              onChanged={reload}
            />
          </TabsContent>

          <TabsContent value="leaders" className="mt-4">
            <CampusMembersPanel
              groupId={group.id}
              label={label}
              memberships={memberships}
              canManage={canManage}
              canAssignLeader={data.canAssignLeader}
              leadersOnly
              onChanged={reload}
            />
          </TabsContent>

          <TabsContent value="outreach" className="mt-4">
            <CampusOutreachPanel groupId={group.id} campusKey={data.key} />
          </TabsContent>

          <TabsContent value="forms" className="mt-4">
            <CampusForms data={data} onChanged={reload} />
          </TabsContent>

          {canManage ? (
            <TabsContent value="onboarding" className="mt-4">
              <CampusOnboardingPanel groupId={group.id} label={label} joinUrl={data.joinUrl} onChanged={reload} />
            </TabsContent>
          ) : null}

          {data.canText ? (
            <TabsContent value="text" className="mt-4">
              <section className="dashboard-panel p-5">
                <h2 className="app-section-title mb-3">Text everyone on {label}</h2>
                <GroupSmsComposer groupId={group.id} groupName={label} memberships={memberships} sendAction={sendCampusSmsAction} />
              </section>
            </TabsContent>
          ) : null}
        </Tabs>
      </div>
    </DashboardLayout>
  )
}

function CampusForms({ data, onChanged }: { data: CampusPageData; onChanged: () => Promise<void> }) {
  const { toast } = useToast()
  const { can } = useAuth()
  const [busy, setBusy] = useState<'campus' | 'student' | null>(null)
  const canManage = data.access === 'manage'
  const has = useMemo(
    () => ({
      campus: data.forms.some((f) => f.category === CAMPUS_MEMBER_REGISTRATION_CATEGORY),
      student: data.forms.some((f) => f.category === STUDENT_REGISTRATION_CATEGORY),
    }),
    [data.forms]
  )

  async function setup(kind: 'campus' | 'student') {
    setBusy(kind)
    const res = await setupCampusFormAction(data.group.id, kind)
    setBusy(null)
    if (res.error || !res.data) {
      toast({ title: 'Form not set up', description: res.error ?? undefined, variant: 'destructive' })
      return
    }
    toast({ title: res.data.created ? 'Form created and published' : 'Form already exists' })
    await onChanged()
  }

  // Admins with forms.manage get the full editor; everyone else the campus-scoped read-only view.
  const responsesHref = (formId: string) =>
    can('forms.manage')
      ? `/admin/forms/${formId}/responses`
      : `/campuses/${encodeURIComponent(data.key)}/responses/${formId}`

  return (
    <section className="dashboard-panel overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-neutral-200/80 p-5 dark:border-white/[0.06] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="app-section-title">Forms</h2>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">Registration and other forms that belong to this campus.</p>
        </div>
        {canManage ? (
          <div className="flex flex-wrap gap-2">
            {!has.campus ? (
              <Button variant="outline" onClick={() => setup('campus')} disabled={busy !== null} className="h-11 sm:h-10">
                {busy === 'campus' ? <LoadingSpinner size="sm" className="mr-2" /> : <UserPlus className="mr-2 h-4 w-4" aria-hidden />}
                Set up registration form
              </Button>
            ) : null}
            {!has.student ? (
              <Button variant="outline" onClick={() => setup('student')} disabled={busy !== null} className="h-11 sm:h-10">
                {busy === 'student' ? <LoadingSpinner size="sm" className="mr-2" /> : <FileText className="mr-2 h-4 w-4" aria-hidden />}
                Set up student sign-up
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
      {data.forms.length === 0 ? (
        <p className="p-5 text-sm text-neutral-600 dark:text-neutral-400">No forms yet.{canManage ? ' Set up a registration form above.' : ''}</p>
      ) : (
        <ul className="divide-y divide-neutral-100 dark:divide-white/[0.06]">
          {data.forms.map((f) => (
            <li key={f.id} className="flex flex-wrap items-center gap-3 px-5 py-3 sm:flex-nowrap">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{f.title}</p>
                <div className="mt-0.5 flex items-center gap-2 text-[13px] text-neutral-500 dark:text-neutral-400">
                  <Badge variant={f.status === 'published' ? 'success' : 'secondary'} className="capitalize">{f.status}</Badge>
                  <span className="tabular-nums">{f.response_count ?? 0} response{f.response_count === 1 ? '' : 's'}</span>
                </div>
              </div>
              <div className="flex gap-2">
                {f.status === 'published' ? (
                  <Button asChild variant="outline" size="sm" className="h-11 sm:h-9">
                    <a href={`/f/${f.slug}`} target="_blank" rel="noreferrer">
                      <ExternalLink className="mr-1.5 h-4 w-4" aria-hidden />
                      Open form
                    </a>
                  </Button>
                ) : null}
                <Button asChild size="sm" className="h-11 sm:h-9">
                  <Link href={responsesHref(f.id)}>Responses</Link>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
