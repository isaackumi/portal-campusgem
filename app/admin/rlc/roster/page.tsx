'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { loadRlcMembersAction } from '@/lib/actions/rlc'
import { RLC_ROLE_LABELS, RLC_ROLES } from '@/lib/constants/rlc'
import type { Member } from '@/lib/types'
import { PageContainer } from '@/components/layout/page-container'
import { RlcPageHeader } from '@/components/rlc/rlc-page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/loading'

export default function RlcRosterPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRlcMembersAction().then(({ data }) => {
      setMembers(data ?? [])
      setLoading(false)
    })
  }, [])

  const grouped = useMemo(() => {
    return RLC_ROLES.map((role) => ({
      role,
      people: members.filter((member) => member.rlc_roles?.includes(role)),
    })).filter((group) => group.people.length > 0)
  }, [members])

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <PageContainer className="space-y-6">
      <RlcPageHeader
        title="Ministry roster"
        subtitle="Who currently holds usher, choir, protocol, and other RLC roles."
        actions={
          <Button variant="outline" asChild>
            <Link href="/admin/rlc/members">Manage members</Link>
          </Button>
        }
      />

      {grouped.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No ministry roles assigned yet. Add people to RLC with roles from members or visitors.
          </CardContent>
        </Card>
      ) : (
        grouped.map((group) => (
          <Card key={group.role} className="border-rose-100/80">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {RLC_ROLE_LABELS[group.role]}
                <Badge variant="secondary">{group.people.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {group.people.map((member) => (
                <div key={`${group.role}-${member.id}`} className="rounded-lg border bg-white p-3">
                  <p className="font-medium">{member.user?.full_name ?? 'Member'}</p>
                  <p className="text-xs text-muted-foreground">
                    {[member.user?.phone, member.user?.membership_id].filter(Boolean).join(' · ')}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        ))
      )}
    </PageContainer>
  )
}
