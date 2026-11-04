'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers'
import { useUserById } from '@/lib/hooks/use-data'
import { dataService } from '@/lib/services/data-service'
import { ROLE_LABELS } from '@/lib/auth/roles'
import type { AppUser } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading'
import { EditUserDialog } from '@/components/users/edit-user-dialog'
import { PersonAvatar } from '@/components/ui/person'
import { PhoneLink, QuickContactButtons } from '@/components/contact/phone-link'
import { roleTone } from '@/lib/ui/chip-tones'
import { cn } from '@/lib/utils'
import {
  AlertTriangle,
  ArrowLeft,
  Briefcase,
  Calendar,
  Edit,
  Mail,
  Phone,
  Shield,
  User,
  type LucideIcon,
} from 'lucide-react'

export default function AdminUserDetailPage() {
  const { user: currentUser, loading: authLoading, can } = useAuth()
  const allowed = can('users.manage')
  const router = useRouter()
  const params = useParams()
  const userId = params.id as string

  const { data: user, loading, error, refetch } = useUserById(userId)
  const [memberId, setMemberId] = useState<string | null>(null)
  const [memberLoading, setMemberLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [memberReload, setMemberReload] = useState(0)

  useEffect(() => {
    if (!authLoading && currentUser && !allowed) {
      router.push('/dashboard')
    }
  }, [authLoading, currentUser, allowed, router])

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    setMemberLoading(true)
    void dataService.getMemberByUserId(userId).then((res) => {
      if (cancelled) return
      setMemberId(res.data?.id ?? null)
      setMemberLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [userId, memberReload])

  if (authLoading || (loading && !user)) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (!allowed) {
    return null
  }

  if (error || !user) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <User className="mx-auto mb-4 h-12 w-12 text-neutral-300 dark:text-neutral-600" />
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">User not found</h2>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          {error ?? 'This account may have been removed.'}
        </p>
        <Button className="mt-6 h-11 sm:h-10" variant="outline" asChild>
          <Link href="/admin/users">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to users
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link
        href="/admin/users"
        className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 sm:min-h-9"
      >
        <ArrowLeft className="h-4 w-4" />
        Users
      </Link>

      <section className="dashboard-panel p-4 sm:p-5">
        <div className="flex items-start gap-4">
          <PersonAvatar name={user.full_name} seed={user.id} size="lg" className="h-14 w-14 text-base sm:h-16 sm:w-16" />
          <div className="min-w-0 flex-1">
            <h1 className="app-page-title break-words">{user.full_name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant={roleTone(user.role)} className="capitalize">
                {ROLE_LABELS[user.role] ?? user.role}
              </Badge>
              <span className="font-mono text-sm text-neutral-600 dark:text-neutral-300">
                {user.membership_id || 'No membership ID'}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-neutral-200/80 pt-4 dark:border-white/[0.06]">
          <QuickContactButtons phone={user.phone} whatsapp={user.whatsapp} name={user.full_name} />
          <div className="ml-auto flex w-full gap-2 sm:w-auto">
            {memberId ? (
              <Button variant="outline" asChild className="h-11 flex-1 sm:h-10 sm:flex-none">
                <Link href={`/members/${memberId}`}>
                  <User className="mr-2 h-4 w-4" aria-hidden />
                  Member profile
                </Link>
              </Button>
            ) : null}
            <Button onClick={() => setEditOpen(true)} className="h-11 flex-1 sm:h-10 sm:flex-none">
              <Edit className="mr-2 h-4 w-4" aria-hidden />
              Edit user
            </Button>
          </div>
        </div>
      </section>

      <section className="dashboard-panel p-4 sm:p-5">
        <h2 className="app-section-title mb-4">Details</h2>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Detail icon={Phone} label="Phone">
            {user.phone ? <PhoneLink phone={user.phone} whatsapp={user.whatsapp} name={user.full_name} /> : null}
          </Detail>
          {user.secondary_phone ? (
            <Detail icon={Phone} label="Secondary phone">
              <PhoneLink phone={user.secondary_phone} name={user.full_name} />
            </Detail>
          ) : null}
          {user.whatsapp && user.whatsapp !== user.phone ? (
            <Detail icon={Phone} label="WhatsApp">
              <PhoneLink phone={user.whatsapp} whatsapp={user.whatsapp} name={user.full_name} />
            </Detail>
          ) : null}
          <Detail icon={Mail} label="Email">
            {user.email ? (
              <a href={`mailto:${user.email}`} className="break-all hover:text-brand-600 dark:hover:text-brand-300">
                {user.email}
              </a>
            ) : null}
          </Detail>
          <Detail icon={Calendar} label="Joined">
            {user.join_year ? String(user.join_year) : null}
          </Detail>
          <Detail icon={Shield} label="Marital status">
            {user.marital_status ? <span className="capitalize">{user.marital_status.replace('_', ' ')}</span> : null}
          </Detail>
          {user.occupation ? (
            <Detail icon={Briefcase} label="Occupation" className="sm:col-span-2">
              {user.occupation}
              {user.place_of_work ? ` at ${user.place_of_work}` : ''}
            </Detail>
          ) : null}
        </dl>

        {user.emergency_contact_name || user.emergency_contact_phone ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-neutral-50 p-3 text-sm dark:bg-neutral-800/60">
            <div className="min-w-0">
              <p className="app-overline">Emergency contact</p>
              <p className="mt-1 text-neutral-900 dark:text-neutral-100">
                {user.emergency_contact_name || 'Unnamed'}
                {user.emergency_contact_relation ? (
                  <span className="text-neutral-500 dark:text-neutral-400"> · {user.emergency_contact_relation}</span>
                ) : null}
              </p>
              {user.emergency_contact_phone ? (
                <PhoneLink phone={user.emergency_contact_phone} name={user.emergency_contact_name} />
              ) : null}
            </div>
            <QuickContactButtons phone={user.emergency_contact_phone} name={user.emergency_contact_name} />
          </div>
        ) : null}
      </section>

      {!memberLoading && !memberId ? (
        <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-900 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>
            This user has no linked member profile yet. Member-only fields (address, groups, attendance)
            appear after a member record exists.
          </p>
        </div>
      ) : null}

      <EditUserDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        userId={user.id}
        onSaved={() => {
          refetch()
          setMemberReload((n) => n + 1)
        }}
      />
    </div>
  )
}

function Detail({
  icon: Icon,
  label,
  children,
  className,
}: {
  icon: LucideIcon
  label: string
  children?: ReactNode
  className?: string
}) {
  const empty = children === null || children === undefined || children === ''
  return (
    <div className={cn('flex min-w-0 gap-3', className)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400 dark:text-neutral-500" aria-hidden />
      <div className="min-w-0">
        <dt className="app-stat-label">{label}</dt>
        <dd className={cn('mt-0.5 text-sm', empty ? 'text-neutral-400 dark:text-neutral-500' : 'text-neutral-900 dark:text-neutral-100')}>
          {empty ? '—' : children}
        </dd>
      </div>
    </div>
  )
}
