'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { loadRlcMembersAction } from '@/lib/actions/rlc'
import { RLC_MEMBERSHIP_TYPE_LABELS, RLC_ROLE_LABELS } from '@/lib/constants/rlc'
import { formatMembershipIdForDisplay } from '@/lib/membershipId'
import type { Member } from '@/lib/types'
import { PageContainer } from '@/components/layout/page-container'
import { AddMemberToRlcPanel } from '@/components/rlc/add-member-to-rlc-panel'
import { ImportVisitorToMemberPanel } from '@/components/rlc/import-visitor-to-member-panel'
import { RlcPageHeader } from '@/components/rlc/rlc-page-header'
import { RlcPublicVisitShare } from '@/components/rlc/rlc-public-visit-share'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { LoadingSpinner } from '@/components/ui/loading'
import { MoreHorizontal, Upload, Pencil, UserPlus, Users } from 'lucide-react'
import { PhoneLink, QuickContactButtons } from '@/components/contact/phone-link'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export default function RlcMembersPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  function reload() {
    loadRlcMembersAction().then(({ data }) => setMembers(data ?? []))
  }

  useEffect(() => {
    loadRlcMembersAction().then(({ data }) => {
      setMembers(data ?? [])
      setLoading(false)
    })
  }, [])

  const filtered = members.filter((m) => {
    const needle = query.trim().toLowerCase()
    if (!needle) return true
    const hay = [m.user?.full_name, m.user?.phone, m.user?.membership_id, m.user?.email]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return hay.includes(needle)
  })

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <PageContainer>
      <RlcPageHeader
        title="RLC Members"
        subtitle="Full-time and associate members linked to Redemption Light Chapel."
        actions={
          <>
            <Button asChild>
              <Link href="/admin/rlc/members/add">
                <UserPlus className="mr-2 h-4 w-4" />
                Add member
              </Link>
            </Button>
            <Button variant="outline" className="hidden sm:inline-flex" asChild>
              <a href="#import-visitors">
                <Users className="mr-2 h-4 w-4" />
                Import from visitors
              </a>
            </Button>
            <Button variant="outline" className="hidden sm:inline-flex" asChild>
              <Link href="/admin/rlc/import?tab=camp-bulk">
                <Upload className="mr-2 h-4 w-4" />
                Bulk from Camp
              </Link>
            </Button>
            <Button variant="outline" className="hidden sm:inline-flex" asChild>
              <Link href="/admin/rlc/import">
                <Upload className="mr-2 h-4 w-4" />
                Import from Campus Gem
              </Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="sm:hidden">
                  <MoreHorizontal className="mr-2 h-4 w-4" />
                  Import
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuItem asChild className="min-h-11">
                  <a href="#import-visitors">
                    <Users className="mr-2 h-4 w-4" />
                    Import from visitors
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="min-h-11">
                  <Link href="/admin/rlc/import?tab=camp-bulk">
                    <Upload className="mr-2 h-4 w-4" />
                    Bulk from Camp
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="min-h-11">
                  <Link href="/admin/rlc/import">
                    <Upload className="mr-2 h-4 w-4" />
                    Import from Campus Gem
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      <RlcPublicVisitShare kind="join" />

      <ImportVisitorToMemberPanel onImported={reload} />

      <AddMemberToRlcPanel onAdded={reload} />

      <div className="space-y-1.5">
        <Input type="search" placeholder="Search name, phone, membership ID…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <p className="app-meta">
          {filtered.length} of {members.length} member{members.length === 1 ? '' : 's'}
        </p>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No RLC members match your search.
            </CardContent>
          </Card>
        ) : (
          filtered.map((m) => {
            const name = m.user?.full_name ?? 'Member'
            return (
            <Card key={m.id}>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/admin/rlc/members/${m.id}/edit`}
                      className="min-w-0 break-words font-semibold text-neutral-900 hover:text-brand-700 dark:text-neutral-100 dark:hover:text-brand-300"
                    >
                      {name}
                    </Link>
                    <QuickContactButtons phone={m.user?.phone} name={name} className="-mt-1 shrink-0" />
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {m.rlc_membership_type ? (
                      <Badge variant="secondary">{RLC_MEMBERSHIP_TYPE_LABELS[m.rlc_membership_type]}</Badge>
                    ) : null}
                    {m.congregation === 'both' ? <Badge variant="outline">Campus Gem + RLC</Badge> : null}
                    {(m.rlc_roles ?? []).map((role) => (
                      <Badge key={role} variant="brand">
                        {RLC_ROLE_LABELS[role as keyof typeof RLC_ROLE_LABELS] ?? role}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 text-sm text-neutral-600 dark:text-neutral-400">
                    {m.user?.membership_id ? (
                      <span className="font-mono text-xs">{formatMembershipIdForDisplay(m.user.membership_id)}</span>
                    ) : null}
                    {m.user?.phone ? <PhoneLink phone={m.user.phone} name={name} /> : null}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="h-10 flex-1 sm:h-8 sm:flex-none" asChild>
                    <Link href={`/admin/rlc/members/${m.id}/edit`}>
                      <Pencil className="mr-2 h-3.5 w-3.5" />
                      Edit
                    </Link>
                  </Button>
                  {m.source_visitor_id ? (
                    <Button variant="ghost" size="sm" className="h-10 flex-1 sm:h-8 sm:flex-none" asChild>
                      <Link href={`/admin/rlc/visitors/${m.source_visitor_id}`}>Visitor record</Link>
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
            )
          })
        )}
      </div>
    </PageContainer>
  )
}
