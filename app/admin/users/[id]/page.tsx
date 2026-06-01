'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers'
import { useUserById } from '@/lib/hooks/use-data'
import { dataService } from '@/lib/services/data-service'
import { ROLE_LABELS } from '@/lib/auth/roles'
import type { AppUser } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading'
import { ArrowLeft, Calendar, Edit, Mail, Phone, Shield, User } from 'lucide-react'

function roleBadgeVariant(role: AppUser['role']) {
  switch (role) {
    case 'admin':
      return 'default' as const
    case 'pastor':
    case 'elder':
      return 'secondary' as const
    default:
      return 'outline' as const
  }
}

export default function AdminUserDetailPage() {
  const { user: currentUser, loading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const userId = params.id as string

  const { data: user, loading, error } = useUserById(userId)
  const [memberId, setMemberId] = useState<string | null>(null)
  const [memberLoading, setMemberLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && currentUser?.role !== 'admin') {
      router.push('/dashboard')
    }
  }, [authLoading, currentUser, router])

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
  }, [userId])

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (currentUser?.role !== 'admin') {
    return null
  }

  if (error || !user) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <User className="mx-auto mb-4 h-12 w-12 text-gray-300" />
        <h2 className="text-lg font-semibold text-slate-900">User not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {error ?? 'This account may have been removed.'}
        </p>
        <Button className="mt-6" variant="outline" asChild>
          <Link href="/admin/users">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to users
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" className="-ml-2" asChild>
          <Link href="/admin/users">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to users
          </Link>
        </Button>
        <div className="flex gap-2">
          {memberId ? (
            <Button variant="outline" asChild>
              <Link href={`/members/${memberId}`}>Open member profile</Link>
            </Button>
          ) : null}
          <Button variant="secondary" asChild>
            <Link href="/admin/users">
              <Edit className="mr-2 h-4 w-4" />
              Edit user
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-2xl">{user.full_name}</CardTitle>
              <CardDescription className="mt-1">
                {user.membership_id ? `ID: ${user.membership_id}` : 'No membership ID'}
              </CardDescription>
            </div>
            <Badge variant={roleBadgeVariant(user.role)} className="capitalize">
              {ROLE_LABELS[user.role] ?? user.role}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span>{user.phone || '—'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span>{user.email || '—'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>Joined {user.join_year}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span className="capitalize">{user.marital_status?.replace('_', ' ') || '—'}</span>
          </div>
          {user.occupation ? (
            <div className="sm:col-span-2 text-sm">
              <span className="font-medium text-muted-foreground">Occupation: </span>
              {user.occupation}
              {user.place_of_work ? ` at ${user.place_of_work}` : ''}
            </div>
          ) : null}
          {user.emergency_contact_name ? (
            <div className="sm:col-span-2 rounded-lg bg-slate-50 p-3 text-sm">
              <p className="font-medium text-slate-900">Emergency contact</p>
              <p className="mt-1 text-muted-foreground">
                {user.emergency_contact_name}
                {user.emergency_contact_phone ? ` · ${user.emergency_contact_phone}` : ''}
                {user.emergency_contact_relation ? ` (${user.emergency_contact_relation})` : ''}
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {!memberLoading && !memberId ? (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="py-4 text-sm text-amber-900">
            This user has no linked member profile yet. Member-only fields (address, groups, attendance)
            appear after a member record exists.
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
