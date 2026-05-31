'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { loadRlcMembersAction } from '@/lib/actions/rlc'
import { RLC_MEMBERSHIP_TYPE_LABELS } from '@/lib/constants/rlc'
import { formatMembershipIdForDisplay } from '@/lib/membershipId'
import type { Member } from '@/lib/types'
import { RlcPageHeader } from '@/components/rlc/rlc-page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { LoadingSpinner } from '@/components/ui/loading'
import { Upload } from 'lucide-react'

export default function RlcMembersPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

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
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <RlcPageHeader
        title="RLC Members"
        subtitle="Full-time and associate members linked to Redemption Light Chapel."
        actions={
          <Button variant="outline" asChild>
            <Link href="/admin/rlc/import">
              <Upload className="mr-2 h-4 w-4" />
              Import from Campus Gem
            </Link>
          </Button>
        }
      />

      <Input placeholder="Search members…" value={query} onChange={(e) => setQuery(e.target.value)} />

      <div className="space-y-3">
        {filtered.map((m) => (
          <Card key={m.id} className="border-rose-100/80">
            <CardContent className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{m.user?.full_name ?? 'Member'}</p>
                  {m.rlc_membership_type ? (
                    <Badge variant="secondary">{RLC_MEMBERSHIP_TYPE_LABELS[m.rlc_membership_type]}</Badge>
                  ) : null}
                  {m.congregation === 'both' ? <Badge variant="outline">Campus Gem + RLC</Badge> : null}
                </div>
                <p className="text-sm text-muted-foreground">
                  {m.user?.membership_id ? formatMembershipIdForDisplay(m.user.membership_id) : ''}
                  {m.user?.phone ? ` · ${m.user.phone}` : ''}
                </p>
              </div>
              {m.source_visitor_id ? (
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/admin/rlc/visitors/${m.source_visitor_id}`}>Visitor record</Link>
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
