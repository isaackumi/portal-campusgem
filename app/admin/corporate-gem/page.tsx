'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers'
import {
  ensureCorporateGemGroup,
  ensureCorporateGemRegistrationForm,
} from '@/lib/actions/corporate-gem'
import { loadCorporateGemBoardAction, type CorporateGemBoardGroup } from '@/lib/actions/corporate-gem-board'
import { publishCampusMemberRegistrationForm } from '@/lib/actions/campus-registration-form'
import { getGroupTypeBadgeClass, getGroupTypeLabel } from '@/lib/constants/groups'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading'
import { useToast } from '@/hooks/use-toast'
import {
  ArrowLeft,
  Briefcase,
  ClipboardList,
  Plus,
  Sparkles,
  UserPlus,
  Users,
} from 'lucide-react'

function BoardGroupCard({ group }: { group: CorporateGemBoardGroup }) {
  const router = useRouter()
  const { toast } = useToast()
  const [settingUpForm, setSettingUpForm] = useState(false)

  async function createRegistrationForm() {
    setSettingUpForm(true)
    const { data, created, error } = await ensureCorporateGemRegistrationForm(group.id, group.name)
    if (error || !data) {
      toast({ variant: 'destructive', title: 'Failed', description: error ?? 'Could not create form' })
      setSettingUpForm(false)
      return
    }
    if (created) await publishCampusMemberRegistrationForm(data.id)
    setSettingUpForm(false)
    toast({ title: created ? 'Form live' : 'Form ready', description: 'Share the public link with members.' })
    router.push(`/admin/forms/${data.id}`)
  }

  return (
    <Card className="flex h-full flex-col border-violet-200/80 bg-white shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 space-y-2">
            <CardTitle className="text-lg leading-tight">{group.name}</CardTitle>
            <Badge className={getGroupTypeBadgeClass(group.group_type)}>
              {getGroupTypeLabel(group.group_type)}
            </Badge>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-800">
            <Briefcase className="h-5 w-5" />
          </div>
        </div>
        {group.description ? <CardDescription className="line-clamp-2">{group.description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <p className="text-xs text-muted-foreground">Members</p>
            <p className="font-semibold">{group.memberCount}</p>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <p className="text-xs text-muted-foreground">Leaders / exec</p>
            <p className="font-semibold">
              {group.leaderCount} / {group.executiveCount}
            </p>
          </div>
        </div>
        <div className="mt-auto grid gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/groups/${group.id}`}>
              <Users className="mr-2 h-3.5 w-3.5" />
              Manage members
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-violet-200"
            disabled={settingUpForm}
            onClick={() => void createRegistrationForm()}
          >
            {settingUpForm ? 'Setting up...' : 'Corporate Gem registration form'}
          </Button>
          <Button size="sm" asChild>
            <Link href={`/admin/forms?group=${encodeURIComponent(group.id)}`}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              New form
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function CorporateGemAdminPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [board, setBoard] = useState<Awaited<ReturnType<typeof loadCorporateGemBoardAction>>['data']>(null)
  const [bootstrapping, setBootstrapping] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth?redirect=' + encodeURIComponent('/admin/corporate-gem'))
    }
  }, [authLoading, user, router])

  useEffect(() => {
    if (!user || user.role !== 'admin') return
    void loadBoard()
  }, [user])

  async function loadBoard() {
    setLoading(true)
    const { data, error } = await loadCorporateGemBoardAction()
    if (error) toast({ variant: 'destructive', title: 'Could not load', description: error })
    setBoard(data)
    setLoading(false)
  }

  async function bootstrapCorporateGem() {
    setBootstrapping(true)
    const { data: group, created, error } = await ensureCorporateGemGroup()
    if (error || !group) {
      toast({ variant: 'destructive', title: 'Setup failed', description: error ?? 'Unknown error' })
      setBootstrapping(false)
      return
    }
    const formResult = await ensureCorporateGemRegistrationForm(group.id, group.name)
    if (formResult.data && formResult.created) {
      await publishCampusMemberRegistrationForm(formResult.data.id)
    }
    setBootstrapping(false)
    toast({
      title: created ? 'Corporate Gem ready' : 'Already set up',
      description: 'You can add graduates and manage forms from this board.',
    })
    await loadBoard()
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
            <h2 className="text-xl font-semibold">Admin access required</h2>
            <Button className="mt-4" onClick={() => router.push('/dashboard')}>
              Go to dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const groups = board?.groups ?? []
  const totals = board?.totals ?? { groups: 0, members: 0, forms: 0 }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50/50 via-white to-slate-50">
      <div className="mx-auto max-w-7xl space-y-8 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <Button variant="ghost" onClick={() => router.push('/admin')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Admin
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">Corporate Gem</h1>
              <p className="mt-1 max-w-2xl text-muted-foreground">
                Graduates and working professionals — executives, leaders, members, activities, and forms. Promote
                students here when they finish campus.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href="/admin/users">Promote from users</Link>
            </Button>
            <Button disabled={bootstrapping} onClick={() => void bootstrapCorporateGem()}>
              <Sparkles className="mr-2 h-4 w-4" />
              {bootstrapping ? 'Setting up...' : 'Set up Corporate Gem'}
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-3 p-5">
              <Briefcase className="h-8 w-8 text-violet-700" />
              <div>
                <p className="text-sm text-muted-foreground">Units</p>
                <p className="text-2xl font-bold">{totals.groups}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-5">
              <Users className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Members</p>
                <p className="text-2xl font-bold">{totals.members}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-5">
              <ClipboardList className="h-8 w-8 text-emerald-600" />
              <div>
                <p className="text-sm text-muted-foreground">Forms</p>
                <p className="text-2xl font-bold">{totals.forms}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {groups.length === 0 ? (
          <Card className="border-dashed border-violet-200">
            <CardContent className="flex flex-col items-center py-14 text-center">
              <UserPlus className="mb-4 h-12 w-12 text-violet-300" />
              <h3 className="text-lg font-semibold">No Corporate Gem group yet</h3>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Click &quot;Set up Corporate Gem&quot; to create the default group and registration form, or add a group
                under Group Management with type Corporate Gem.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {groups.map((group) => (
              <BoardGroupCard key={group.id} group={group} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
