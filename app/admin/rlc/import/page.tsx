'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/components/providers'
import { importToRlcAction, searchRlcImportAction } from '@/lib/actions/rlc'
import type { RlcImportSearchResult } from '@/lib/types'
import { PageContainer } from '@/components/layout/page-container'
import { PhoneLink } from '@/components/contact/phone-link'
import { RlcPageHeader } from '@/components/rlc/rlc-page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { LoadingSpinner } from '@/components/ui/loading'
import { Tabs, ScrollableTabsList, TabsContent, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { Search, UserPlus, Upload, Users } from 'lucide-react'
import { RlcCampBulkImportPanel } from '@/components/rlc/rlc-camp-bulk-import-panel'
import { ImportVisitorToMemberPanel } from '@/components/rlc/import-visitor-to-member-panel'

function RlcImportContent() {
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [pageTab, setPageTab] = useState('search')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<RlcImportSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [importing, setImporting] = useState<string | null>(null)

  const runSearch = useCallback(
    async (needle: string) => {
      if (needle.trim().length < 2) return
      setSearching(true)
      const { data, error } = await searchRlcImportAction(needle.trim())
      setSearching(false)
      if (error) {
        toast({ variant: 'destructive', title: 'Search failed', description: error })
        return
      }
      setResults(data ?? [])
    },
    [toast]
  )

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'camp-bulk' || tab === 'visitors-bulk') setPageTab(tab)
  }, [searchParams])

  useEffect(() => {
    const q = searchParams.get('q')?.trim()
    if (!q || q.length < 2) return
    setQuery(q)
    void runSearch(q)
  }, [searchParams, runSearch])

  async function search() {
    await runSearch(query)
  }

  async function importRow(row: RlcImportSearchResult, asMember: boolean) {
    if (!user?.id) return
    const key = `${row.type}-${row.member_id ?? row.user_id ?? row.camp_registration_id}-${asMember ? 'member' : 'visitor'}`
    setImporting(key)
    const { data, error } = await importToRlcAction({
      type: row.type,
      userId: row.user_id,
      memberId: row.member_id,
      campRegistrationId: row.camp_registration_id,
      fullName: row.full_name,
      phone: row.phone,
      email: row.email,
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
      title: asMember ? 'Imported as direct RLC member' : 'Added to visitor pipeline',
      description: row.full_name,
    })
    if (asMember) {
      router.push('/admin/rlc/members')
    } else {
      router.push(`/admin/rlc/visitors/${data.id}`)
    }
  }

  function canImportAsMember(row: RlcImportSearchResult) {
    if (row.type === 'campus_member') return Boolean(row.user_id || row.member_id)
    return Boolean(row.camp_registration_id)
  }

  function canImportAsVisitor(row: RlcImportSearchResult) {
    if (row.type === 'campus_member') return Boolean(row.user_id || row.member_id)
    return Boolean(row.camp_registration_id)
  }

  return (
    <PageContainer>
      <RlcPageHeader
        title="Import to RLC"
        subtitle="Pull contacts from Campus Gem members or camp registrations into the mother church."
      />

      <Tabs value={pageTab} onValueChange={setPageTab} className="space-y-6">
        <ScrollableTabsList>
          <TabsTrigger value="search">
            <Search className="mr-2 h-4 w-4 shrink-0" />
            Search
          </TabsTrigger>
          <TabsTrigger value="camp-bulk">
            <Upload className="mr-2 h-4 w-4 shrink-0" />
            Bulk from Camp
          </TabsTrigger>
          <TabsTrigger value="visitors-bulk">
            <Users className="mr-2 h-4 w-4 shrink-0" />
            Bulk from Visitors
          </TabsTrigger>
        </ScrollableTabsList>

        <TabsContent value="search" className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Search directory</CardTitle>
          <CardDescription>Name, phone, email, or membership ID</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 sm:flex-row">
          <Input
            type="search"
            placeholder="e.g. Kwame, 024, CG-…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
          />
          <Button className="h-11 sm:h-10" onClick={search} disabled={searching}>
            <Search className="mr-2 h-4 w-4" />
            Search
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {results.map((row) => {
          const key = `${row.type}-${row.member_id ?? row.user_id ?? row.camp_registration_id}`
          const campYearLabel =
            row.type === 'camp_registration' && row.camp_years && row.camp_years.length > 0
              ? row.camp_years.length > 1
                ? `Camp ${row.camp_years.join(', ')} (${row.camp_registration_count ?? row.camp_years.length} registrations)`
                : `Camp ${row.camp_years[0]}`
              : null
          return (
            <Card key={key}>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="break-words font-semibold">{row.full_name}</p>
                    <Badge variant="outline">
                      {row.type === 'campus_member' ? 'Campus Gem' : 'Camp registration'}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
                    {row.phone ? <PhoneLink phone={row.phone} name={row.full_name} /> : null}
                    {row.email ? <span className="break-all">{row.email}</span> : null}
                    {row.membership_id ? <span className="font-mono text-xs">{row.membership_id}</span> : null}
                  </div>
                  {campYearLabel ? (
                    <p className="mt-1 text-xs text-muted-foreground">{campYearLabel}</p>
                  ) : null}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  {canImportAsMember(row) ? (
                    <Button
                      size="sm"
                      className="h-10 sm:h-8"
                      disabled={importing === `${key}-member`}
                      onClick={() => importRow(row, true)}
                    >
                      <Users className="mr-2 h-3.5 w-3.5" />
                      Import as direct member
                    </Button>
                  ) : null}
                  {canImportAsVisitor(row) ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-10 sm:h-8"
                      disabled={importing === `${key}-visitor`}
                      onClick={() => importRow(row, false)}
                    >
                      <UserPlus className="mr-2 h-3.5 w-3.5" />
                      {row.type === 'campus_member' ? 'Add as visitor' : 'Import as visitor'}
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
        </TabsContent>

        <TabsContent value="camp-bulk">
          <RlcCampBulkImportPanel />
        </TabsContent>

        <TabsContent value="visitors-bulk">
          <ImportVisitorToMemberPanel />
        </TabsContent>
      </Tabs>
    </PageContainer>
  )
}

export default function RlcImportPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center">
          <LoadingSpinner />
        </div>
      }
    >
      <RlcImportContent />
    </Suspense>
  )
}
