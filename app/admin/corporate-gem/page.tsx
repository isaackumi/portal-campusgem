'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers'
import { AccessDenied } from '@/components/auth/access-denied'
import {
  ensureCorporateGemGroup,
  ensureCorporateGemRegistrationForm,
} from '@/lib/actions/corporate-gem'
import { loadCorporateGemBoardAction, type CorporateGemBoardGroup } from '@/lib/actions/corporate-gem-board'
import { publishCampusMemberRegistrationForm } from '@/lib/actions/campus-registration-form'
import { getGroupTypeLabel } from '@/lib/constants/groups'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/ui/stat-card'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading'
import { useToast } from '@/hooks/use-toast'
import {
  ArrowLeft,
  Briefcase,
  ClipboardList,
  Plus,
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
    <Card className="flex h-full flex-col border-violet-200/80 bg-white shadow-sm dark:border-violet-400/20 dark:bg-neutral-800/60">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 space-y-2">
            <CardTitle className="text-lg leading-tight">{group.name}</CardTitle>
            <Badge variant="secondary" className="capitalize">
              {getGroupTypeLabel(group.group_type)}
            </Badge>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-neutral-500 dark:text-neutral-400">
            <Briefcase className="h-5 w-5" />
          </div>
        </div>
        {group.description ? <CardDescription className="line-clamp-2">{group.description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-lg bg-neutral-50 px-3 py-2 dark:bg-white/[0.04]">
            <p className="text-xs text-muted-foreground">Members</p>
            <p className="font-semibold">{group.memberCount}</p>
          </div>
          <div className="rounded-lg bg-neutral-50 px-3 py-2 dark:bg-white/[0.04]">
            <p className="text-xs text-muted-foreground">Leaders / exec</p>
            <p className="font-semibold">
              {group.leaderCount} / {group.executiveCount}
            </p>
          </div>
        </div>
        <div className="mt-auto grid gap-2 [&_a]:h-10 [&_button]:h-10 sm:[&_a]:h-8 sm:[&_button]:h-8">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/groups/${group.id}`}>
              <Users className="mr-2 h-3.5 w-3.5" />
              Manage members
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-violet-200 dark:border-violet-400/20"
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
  const { user, loading: authLoading, can } = useAuth()
  const allowed = can('groups.manage')
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

  if (!allowed) {
    return <AccessDenied permission="groups.manage" />
  }

  const groups = board?.groups ?? []
  const totals = board?.totals ?? { groups: 0, members: 0, forms: 0 }

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
              <h1 className="app-page-title">Corporate Gem</h1>
              <p className="app-page-description mt-1 max-w-2xl">
                Graduates and working professionals — executives, leaders, members, activities, and forms. Promote
                students here when they finish campus.
              </p>
            </div>
          </div>
          <div className="flex gap-2 [&>*]:h-11 [&>*]:flex-1 sm:[&>*]:h-10 sm:[&>*]:flex-none">
            <Button variant="outline" asChild>
              <Link href="/admin/users">
                <span className="sm:hidden">Promote</span>
                <span className="hidden sm:inline">Promote from users</span>
              </Link>
            </Button>
            <Button disabled={bootstrapping} onClick={() => void bootstrapCorporateGem()}>
              {bootstrapping ? 'Setting up...' : (
                <>
                  <span className="sm:hidden">Set up</span>
                  <span className="hidden sm:inline">Set up Corporate Gem</span>
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <StatCard className="p-3 sm:p-5" label="Units" value={totals.groups} />
          <StatCard className="p-3 sm:p-5" label="Members" value={totals.members} />
          <StatCard className="p-3 sm:p-5" label="Forms" value={totals.forms} />
        </div>

        {groups.length === 0 ? (
          <Card className="border-dashed border-violet-200 dark:border-violet-400/20">
            <CardContent className="flex flex-col items-center py-14 text-center">
              <UserPlus className="mb-4 h-12 w-12 text-violet-300 dark:text-violet-400/60" />
              <h3 className="text-lg font-semibold">No Corporate Gem group yet</h3>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Click &quot;Set up Corporate Gem&quot; to create the default group and registration form, or add a group
                under Group Management with type Corporate Gem.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
            {groups.map((group) => (
              <BoardGroupCard key={group.id} group={group} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
