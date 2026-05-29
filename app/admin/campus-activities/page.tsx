'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers'
import {
  loadCampusActivityBoardAction,
  type CampusActivityBoardGroup,
  type CampusActivityBoardData,
} from '@/lib/actions/campus-activity-board'
import { getGroupTypeBadgeClass, getGroupTypeLabel } from '@/lib/constants/groups'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  Sparkles,
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
    <Card className="flex h-full flex-col border-slate-200/80 bg-white shadow-sm transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 space-y-2">
            <CardTitle className="text-lg leading-tight">{group.name}</CardTitle>
            <Badge className={getGroupTypeBadgeClass(group.group_type)}>
              {getGroupTypeLabel(group.group_type)}
            </Badge>
          </div>
          {group.group_type === 'campus' ? (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
              <Building2 className="h-5 w-5" />
            </div>
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800">
              <Sparkles className="h-5 w-5" />
            </div>
          )}
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
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <p className="text-xs text-muted-foreground">Members</p>
            <p className="font-semibold text-slate-900">{group.memberCount}</p>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <p className="text-xs text-muted-foreground">Leaders / exec</p>
            <p className="font-semibold text-slate-900">
              {group.leaderCount} / {group.executiveCount}
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <p className="text-xs text-muted-foreground">Forms</p>
            <p className="font-semibold text-slate-900">{group.formCount}</p>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <p className="text-xs text-muted-foreground">Published</p>
            <p className="font-semibold text-slate-900">{group.publishedFormCount}</p>
          </div>
        </div>

        <div className="mt-auto grid gap-2">
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
                className="w-full border-indigo-200 text-indigo-900 hover:bg-indigo-50"
                disabled={settingUpStudentForm}
                onClick={() => void createStudentForm()}
              >
                {settingUpStudentForm ? 'Setting up...' : 'Student registration form'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full border-amber-200 text-amber-900 hover:bg-amber-50"
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
        <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {groups.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">{emptyHint}</CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
  const { user, loading: authLoading } = useAuth()
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
    if (!user || user.role !== 'admin') return
    void loadBoard()
  }, [user])

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

  if (user?.role !== 'admin') {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold text-gray-900">Admin access required</h2>
            <p className="mt-2 text-gray-600">Only administrators can manage campus and activity units.</p>
            <Button className="mt-4" onClick={() => router.push('/dashboard')}>
              Go to dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const totals = board?.totals ?? { campuses: 0, activities: 0, members: 0, forms: 0 }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <div className="mx-auto max-w-7xl space-y-8 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <Button variant="ghost" onClick={() => router.push('/admin')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Admin
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">Campus & Activities</h1>
              <p className="mt-1 max-w-2xl text-muted-foreground">
                University fellowships and church-wide events in one place — members, leaders, executives, and scoped
                forms.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href="/admin/groups">All groups</Link>
            </Button>
            <Button asChild>
              <Link href="/admin/groups">
                <Plus className="mr-2 h-4 w-4" />
                Add campus / activity
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-indigo-100 bg-white/80">
            <CardContent className="flex items-center gap-3 p-5">
              <Building2 className="h-8 w-8 text-indigo-600" />
              <div>
                <p className="text-sm text-muted-foreground">Campuses</p>
                <p className="text-2xl font-bold">{totals.campuses}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-amber-100 bg-white/80">
            <CardContent className="flex items-center gap-3 p-5">
              <CalendarDays className="h-8 w-8 text-amber-700" />
              <div>
                <p className="text-sm text-muted-foreground">Activities</p>
                <p className="text-2xl font-bold">{totals.activities}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/80">
            <CardContent className="flex items-center gap-3 p-5">
              <Users className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total members</p>
                <p className="text-2xl font-bold">{totals.members}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/80">
            <CardContent className="flex items-center gap-3 p-5">
              <ClipboardList className="h-8 w-8 text-emerald-600" />
              <div>
                <p className="text-sm text-muted-foreground">Scoped forms</p>
                <p className="text-2xl font-bold">{totals.forms}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {board ? (
          <div className="space-y-10">
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
          <Card className="border-red-200 bg-red-50/50">
            <CardContent className="space-y-4 py-10 text-center">
              <p className="font-medium text-red-900">Could not load board data</p>
              <p className="text-sm text-red-800/90">
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
