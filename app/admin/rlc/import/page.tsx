'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers'
import { importToRlcAction, searchRlcImportAction } from '@/lib/actions/rlc'
import type { RlcImportSearchResult } from '@/lib/types'
import { RlcPageHeader } from '@/components/rlc/rlc-page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { Search, UserPlus, Users } from 'lucide-react'

export default function RlcImportPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<RlcImportSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [importing, setImporting] = useState<string | null>(null)

  async function search() {
    if (query.trim().length < 2) return
    setSearching(true)
    const { data, error } = await searchRlcImportAction(query.trim())
    setSearching(false)
    if (error) {
      toast({ variant: 'destructive', title: 'Search failed', description: error })
      return
    }
    setResults(data ?? [])
  }

  async function importRow(row: RlcImportSearchResult, asMember: boolean) {
    if (!user?.id) return
    const key = `${row.type}-${row.member_id ?? row.camp_registration_id}-${asMember ? 'member' : 'visitor'}`
    setImporting(key)
    const { data, error } = await importToRlcAction({
      type: row.type,
      memberId: row.member_id,
      campRegistrationId: row.camp_registration_id,
      performedBy: user.id,
      linkAsMember: asMember,
      rlcMembershipType: 'full_member',
    })
    setImporting(null)
    if (error || !data) {
      toast({ variant: 'destructive', title: 'Import failed', description: error })
      return
    }
    toast({
      title: asMember ? 'Linked as RLC member' : 'Added to visitor pipeline',
      description: row.full_name,
    })
    if (!asMember && 'id' in data && data.id) {
      router.push(`/admin/rlc/visitors/${data.id}`)
    } else {
      router.push('/admin/rlc/members')
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <RlcPageHeader
        title="Import to RLC"
        subtitle="Pull contacts from Campus Gem members or camp registrations into the mother church."
      />

      <Card>
        <CardHeader>
          <CardTitle>Search directory</CardTitle>
          <CardDescription>Name, phone, email, or membership ID</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input
            placeholder="e.g. Kwame, 024, CG-…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
          />
          <Button onClick={search} disabled={searching}>
            <Search className="mr-2 h-4 w-4" />
            Search
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {results.map((row) => {
          const key = `${row.type}-${row.member_id ?? row.camp_registration_id}`
          return (
            <Card key={key}>
              <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{row.full_name}</p>
                    <Badge variant="outline">
                      {row.type === 'campus_member' ? 'Campus Gem' : 'Camp registration'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {[row.phone, row.email, row.membership_id].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {row.type === 'campus_member' && row.member_id ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={importing === `${key}-member`}
                        onClick={() => importRow(row, true)}
                      >
                        <Users className="mr-2 h-3.5 w-3.5" />
                        Link as member
                      </Button>
                      <Button
                        size="sm"
                        className="bg-rose-700 hover:bg-rose-800"
                        disabled={importing === `${key}-visitor`}
                        onClick={() => importRow(row, false)}
                      >
                        <UserPlus className="mr-2 h-3.5 w-3.5" />
                        Add as visitor
                      </Button>
                    </>
                  ) : row.camp_registration_id ? (
                    <Button
                      size="sm"
                      className="bg-rose-700 hover:bg-rose-800"
                      disabled={importing === `${key}-visitor`}
                      onClick={() => importRow(row, false)}
                    >
                      <UserPlus className="mr-2 h-3.5 w-3.5" />
                      Import visitor
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
