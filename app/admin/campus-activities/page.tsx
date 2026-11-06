'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers'
import { AccessDenied } from '@/components/auth/access-denied'
import {
  loadCampusActivityBoardAction,
  type CampusActivityBoardGroup,
  type CampusActivityBoardData,
} from '@/lib/actions/campus-activity-board'
import { getGroupTypeLabel } from '@/lib/constants/groups'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/ui/stat-card'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading'
import { useToast } from '@/hooks/use-toast'
import {
  ensureCampusMemberRegistrationForm,
  publishCampusMemberRegistrationForm,
} from '@/lib/actions/campus-registration-form'
import { ensureStudentRegistrationForm } from '@/lib/actions/student-registration-form'
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  ClipboardList,
  MapPin,
  Plus,
  Users,
} from 'lucide-react'

function BoardGroupCard({ group }: { group: CampusActivityBoardGroup }) {
  const router = useRouter()
  const { toast } = useToast()
  const [settingUpRegistration, setSettingUpRegistration] = useState(false)
  const [settingUpStudentForm, setSettingUpStudentForm] = useState(false)

  async function createRegistrationForm() {
    setSettingUpRegistration(true)
    const { data, created, error } = await ensureCampusMemberRegistrationForm(group.id, group.name)
    if (error || !data) {
      toast({ variant: 'destructive', title: 'Failed', description: error ?? 'Could not create form' })
      setSettingUpRegistration(false)
      return
    }
    if (created) await publishCampusMemberRegistrationForm(data.id)
    setSettingUpRegistration(false)
    toast({
      title: created ? 'Registration form live' : 'Form ready',
      description: 'Share the public link with new campus members.',
    })
    router.push(`/admin/forms/${data.id}`)
  }

  async function createStudentForm() {
    setSettingUpStudentForm(true)
    const { data, created, error } = await ensureStudentRegistrationForm(group.id, group.name)
    if (error || !data) {
      toast({ variant: 'destructive', title: 'Failed', description: error ?? 'Could not create form' })
      setSettingUpStudentForm(false)
      return
    }
    if (created) await publishCampusMemberRegistrationForm(data.id)
    setSettingUpStudentForm(false)
    toast({
      title: created ? 'Student form live' : 'Form ready',
      description: 'Hall, level, program, prayer request, and WhatsApp-friendly phone fields included.',
    })
    router.push(`/admin/forms/${data.id}`)
  }

  return (
    <Card className="flex h-full flex-col border-neutral-200/80 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-white/10 dark:bg-neutral-800/60">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 space-y-2">
            <CardTitle className="break-words text-lg leading-tight">{group.name}</CardTitle>
            <Badge variant="secondary" className="capitalize">
              {getGroupTypeLabel(group.group_type)}
            </Badge>
          </div>
        </div>
        {group.description ? (
          <CardDescription className="line-clamp-2">{group.description}</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        {group.meeting_location ? (
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {group.meeting_location}
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-lg bg-neutral-50 px-3 py-2 dark:bg-white/[0.04]">
            <p className="text-xs text-muted-foreground">Members</p>
            <p className="font-semibold text-neutral-900 dark:text-neutral-100">{group.memberCount}</p>
          </div>
          <div className="rounded-lg bg-neutral-50 px-3 py-2 dark:bg-white/[0.04]">
            <p className="text-xs text-muted-foreground">Leaders / exec</p>
            <p className="font-semibold text-neutral-900 dark:text-neutral-100">
              {group.leaderCount} / {group.executiveCount}
            </p>
          </div>
          <div className="rounded-lg bg-neutral-50 px-3 py-2 dark:bg-white/[0.04]">
            <p className="text-xs text-muted-foreground">Forms</p>
            <p className="font-semibold text-neutral-900 dark:text-neutral-100">{group.formCount}</p>
          </div>
          <div className="rounded-lg bg-neutral-50 px-3 py-2 dark:bg-white/[0.04]">
            <p className="text-xs text-muted-foreground">Published</p>
            <p className="font-semibold text-neutral-900 dark:text-neutral-100">{group.publishedFormCount}</p>
          </div>
        </div>

        <div className="mt-auto grid gap-2 [&_a]:h-10 [&_button]:h-10 sm:[&_a]:h-8 sm:[&_button]:h-8">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/groups/${group.id}`}>
              <Users className="mr-2 h-3.5 w-3.5" />
              Manage members
            </Link>
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" size="sm" asChild>
              <Link href={`/admin/forms?group=${encodeURIComponent(group.id)}`}>
                <ClipboardList className="mr-1.5 h-3.5 w-3.5" />
                View forms
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link href={`/admin/forms?group=${encodeURIComponent(group.id)}`}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                New form
              </Link>
            </Button>
          </div>
          {group.group_type === 'campus' ? (
            <>
              <Button
                variant="outline"
                size="sm"
                className="w-full border-neutral-200 text-neutral-900 hover:bg-neutral-50 dark:border-white/10 dark:text-neutral-100 dark:hover:bg-white/[0.06]"
                disabled={settingUpStudentForm}
                onClick={() => void createStudentForm()}
              >
                {settingUpStudentForm ? 'Setting up...' : 'Student registration form'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full border-amber-200 text-amber-900 hover:bg-amber-50 dark:border-amber-400/20 dark:text-amber-300 dark:hover:bg-amber-400/10"
                disabled={settingUpRegistration}
                onClick={() => void createRegistrationForm()}
              >
                {settingUpRegistration ? 'Setting up...' : 'Legacy member form'}
              </Button>
            </>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

function Section({
  title,
  description,
  groups,
  emptyHint,
}: {
  title: string
  description: string
  groups: CampusActivityBoardGroup[]
  emptyHint: string
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="app-section-title">{title}</h2>
        <p className="app-meta">{description}</p>
      </div>
      {groups.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">{emptyHint}</CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
          {groups.map((group) => (
            <BoardGroupCard key={group.id} group={group} />
          ))}
        </div>
      )}
    </section>
  )
}

export default function CampusActivitiesAdminPage() {
  const router = useRouter()
  const { user, loading: authLoading, can } = useAuth()
  const allowed = can('groups.manage')
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [board, setBoard] = useState<CampusActivityBoardData | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth?redirect=' + encodeURIComponent('/admin/campus-activities'))
    }
  }, [authLoading, user, router])

  useEffect(() => {
    if (!user) return
    if (!allowed) {
      setLoading(false)
      return
    }
    void loadBoard()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, allowed])

  async function loadBoard() {
    setLoading(true)
    setLoadError(null)
    const { data, error } = await loadCampusActivityBoardAction()
    if (error) {
      setLoadError(error)
      toast({ variant: 'destructive', title: 'Could not load board', description: error })
      setBoard(null)
    } else {
      setBoard(data)
    }
    setLoading(false)
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (!allowed) {
    return <AccessDenied permission="groups.manage" />
  }

  const totals = board?.totals ?? { campuses: 0, activities: 0, members: 0, forms: 0 }

  return (
    <div>
      <div className="mx-auto w-full min-w-0 max-w-7xl space-y-6 sm:space-y-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 space-y-2">
            <Button variant="ghost" className="-ml-2 h-11 px-2 sm:h-10" onClick={() => router.push('/admin')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Admin
            </Button>
            <div>
              <h1 className="app-page-title">Campus & Activities</h1>
              <p className="app-page-description mt-1 max-w-2xl">
                University fellowships and church-wide events in one place — members, leaders, executives, and scoped
                forms.
              </p>
            </div>
          </div>
          <div className="flex gap-2 [&>*]:h-11 [&>*]:flex-1 sm:[&>*]:h-10 sm:[&>*]:flex-none">
            <Button variant="outline" asChild>
              <Link href="/admin/groups">All groups</Link>
            </Button>
            <Button asChild>
              <Link href="/admin/groups">
                <Plus className="mr-2 h-4 w-4" />
                <span className="sm:hidden">Add group</span>
                <span className="hidden sm:inline">Add campus / activity</span>
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard className="p-4 sm:p-5" label="Campuses" value={totals.campuses} icon={Building2} />
          <StatCard className="p-4 sm:p-5" label="Activities" value={totals.activities} icon={CalendarDays} />
          <StatCard className="p-4 sm:p-5" label="Total members" value={totals.members} icon={Users} />
          <StatCard className="p-4 sm:p-5" label="Scoped forms" value={totals.forms} icon={ClipboardList} />
        </div>

        {board ? (
          <div className="space-y-8 sm:space-y-10">
            <Section
              title="Campus fellowships"
              description="University chapters — leaders, executives, and members per campus."
              groups={board.campuses}
              emptyHint="No campus groups yet. Create one under Group Management (type: Campus fellowship)."
            />
            <Section
              title="General activities & events"
              description="Church-wide events like Love Feat, Fun Fair, and outreach drives."
              groups={board.activities}
              emptyHint="No activity groups yet. Create one under Group Management (type: General activity / event)."
            />
          </div>
        ) : (
          <Card className="border-red-200 bg-red-50/50 dark:border-red-400/20 dark:bg-red-400/10">
            <CardContent className="space-y-4 py-10 text-center">
              <p className="font-medium text-red-900 dark:text-red-300">Could not load board data</p>
              <p className="text-sm text-red-800/90 dark:text-red-300">
                {loadError ??
                  'Check NEXT_PUBLIC_CONVEX_URL and CAMP_CONVEX_SERVER_SECRET, then push Convex functions with `bunx convex dev --once`.'}
              </p>
              <Button variant="outline" onClick={() => void loadBoard()}>
                Try again
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
