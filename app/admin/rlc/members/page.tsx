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
import { Upload, Pencil, UserPlus, Users } from 'lucide-react'

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
            <Button className="w-full bg-rose-700 hover:bg-rose-800 sm:w-auto" asChild>
              <Link href="/admin/rlc/members/add">
                <UserPlus className="mr-2 h-4 w-4" />
                Add member
              </Link>
            </Button>
            <Button variant="outline" className="w-full sm:w-auto" asChild>
              <a href="#import-visitors">
                <Users className="mr-2 h-4 w-4" />
                Import from visitors
              </a>
            </Button>
            <Button variant="outline" className="w-full sm:w-auto" asChild>
              <Link href="/admin/rlc/import?tab=camp-bulk">
                <Upload className="mr-2 h-4 w-4" />
                Bulk from Camp
              </Link>
            </Button>
            <Button variant="outline" className="w-full sm:w-auto" asChild>
              <Link href="/admin/rlc/import">
                <Upload className="mr-2 h-4 w-4" />
                Import from Campus Gem
              </Link>
            </Button>
          </>
        }
      />

      <RlcPublicVisitShare kind="join" className="mb-6" />

      <ImportVisitorToMemberPanel onImported={reload} />

      <AddMemberToRlcPanel onAdded={reload} />

      <Input placeholder="Search members…" value={query} onChange={(e) => setQuery(e.target.value)} />

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No RLC members match your search.
            </CardContent>
          </Card>
        ) : (
          filtered.map((m) => (
            <Card key={m.id} className="border-rose-100/80">
              <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{m.user?.full_name ?? 'Member'}</p>
                    {m.rlc_membership_type ? (
                      <Badge variant="secondary">{RLC_MEMBERSHIP_TYPE_LABELS[m.rlc_membership_type]}</Badge>
                    ) : null}
                    {m.congregation === 'both' ? <Badge variant="outline">Campus Gem + RLC</Badge> : null}
                    {(m.rlc_roles ?? []).map((role) => (
                      <Badge key={role} variant="outline" className="border-rose-200 text-rose-800">
                        {RLC_ROLE_LABELS[role as keyof typeof RLC_ROLE_LABELS] ?? role}
                      </Badge>
                    ))}
                  </div>
                  <p className="mt-1 break-all text-sm text-muted-foreground">
                    {m.user?.membership_id ? formatMembershipIdForDisplay(m.user.membership_id) : ''}
                    {m.user?.phone ? ` · ${m.user.phone}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" className="w-full sm:w-auto" asChild>
                    <Link href={`/admin/rlc/members/${m.id}/edit`}>
                      <Pencil className="mr-2 h-3.5 w-3.5" />
                      Edit
                    </Link>
                  </Button>
                  {m.source_visitor_id ? (
                    <Button variant="ghost" size="sm" className="w-full sm:w-auto" asChild>
                      <Link href={`/admin/rlc/visitors/${m.source_visitor_id}`}>Visitor record</Link>
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </PageContainer>
  )
}
