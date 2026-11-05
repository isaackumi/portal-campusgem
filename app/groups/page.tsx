'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers'
import { useGroups } from '@/lib/hooks/use-data'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { LoadingGrid, LoadingStats, LoadingPage } from '@/components/ui/loading'
import { ErrorDisplay, EmptyState } from '@/components/ui/error-display'
import { ErrorBoundary } from '@/components/error-boundary'
import { DashboardLayout } from '@/components/dashboard-layout'
import { StatCard } from '@/components/ui/stat-card'
import { QuickContactButtons } from '@/components/contact/phone-link'
import { useToast } from '@/hooks/use-toast'
import { exportGroupsSummaryAction } from '@/lib/actions/groups'
import { groupExportFilename, groupsSummaryToCsv } from '@/lib/groups/export'
import { downloadCsv } from '@/lib/csv'
import {
  Users,
  Search,
  Plus,
  Download,
  Calendar,
  MapPin,
  User,
  ArrowLeft,
  Settings,
  Edit,
  Crown,
  Star,
  Loader2,
} from 'lucide-react'

function GroupsContent() {
  const { user, loading: authLoading, can } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const canManage = can('groups.manage')
  const [exporting, setExporting] = useState(false)

  // Data hooks
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  
  const { 
    data: groups, 
    total, 
    hasMore, 
    error, 
    loading, 
    refetch, 
    loadMore, 
    search, 
    filter 
  } = useGroups(currentPage, 20, searchTerm, filterType)

  // Handle search
  const handleSearch = (term: string) => {
    setSearchTerm(term)
    setCurrentPage(1)
    search(term)
  }

  // Handle filter
  const handleFilter = (type: string) => {
    setFilterType(type)
    setCurrentPage(1)
    filter(type === 'all' ? '' : type)
  }

  // One row per group (leader, member count, schedule…), honouring the current search
  // and type filter. Per-group rosters come from each group's own Export.
  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await exportGroupsSummaryAction({ search: searchTerm, type: filterType })
      if (res.error || !res.data) throw new Error(res.error ?? 'Export failed')
      if (res.data.length === 0) {
        toast({ title: 'Nothing to export', description: 'No groups match the current filter.' })
        return
      }
      downloadCsv(groupExportFilename('groups'), groupsSummaryToCsv(res.data))
      toast({
        title: 'Export ready',
        description: `${res.data.length} group${res.data.length === 1 ? '' : 's'} saved to CSV.`,
      })
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Export failed',
        description: err instanceof Error ? err.message : 'Please try again.',
      })
    } finally {
      setExporting(false)
    }
  }

  // Show loading state
  if (authLoading || loading) {
    return <LoadingPage title="Loading Groups..." description="Fetching groups and ministries..." />
  }

  // Show error state
  if (error) {
    return (
      <div className="mx-auto max-w-7xl">
          <ErrorDisplay
            error={error}
            onRetry={refetch}
            variant="page"
            title="Failed to load groups"
          />
      </div>
    )
  }

  // Show nothing while redirecting
  if (!user) {
    return null
  }

  const getGroupTypeIcon = (type: string) => {
    switch (type) {
      case 'ministry': return <Settings className="h-4 w-4" />
      case 'fellowship': return <Users className="h-4 w-4" />
      case 'age_group': return <User className="h-4 w-4" />
      case 'special_interest': return <Star className="h-4 w-4" />
      case 'leadership': return <Crown className="h-4 w-4" />
      default: return <Users className="h-4 w-4" />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Group statistics
  const groupStats = {
    total: total || 0,
    ministries: groups?.filter(g => g.group_type === 'ministry').length || 0,
    fellowships: groups?.filter(g => g.group_type === 'fellowship').length || 0,
    ageGroups: groups?.filter(g => g.group_type === 'age_group').length || 0
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="-ml-1 mb-3 inline-flex min-h-11 items-center gap-2 rounded-md px-1 text-sm text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 sm:min-h-0"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <h1 className="app-page-title">
              Groups & Ministries
            </h1>
            <p className="app-page-description mt-1">
              {groupStats.total} total groups. Manage church groups, ministries, and fellowships.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="h-11 flex-1 sm:h-10 sm:flex-none"
              onClick={handleExport}
              disabled={exporting}
              title="Download a CSV of these groups"
              data-tour="groups-export"
            >
              {exporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Download className="mr-2 h-4 w-4" aria-hidden />
              )}
              {exporting ? 'Exporting…' : 'Export'}
            </Button>
            {canManage ? (
              <Button data-tour="groups-add" className="h-11 flex-1 sm:h-10 sm:flex-none" onClick={() => router.push('/groups/add')}>
                <Plus className="mr-2 h-4 w-4" />
                Create group
              </Button>
            ) : null}
          </div>
        </div>

        <section aria-label="Group totals" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <StatCard label="Total groups" value={groupStats.total} />
          <StatCard label="Ministries" value={groupStats.ministries} />
          <StatCard label="Fellowships" value={groupStats.fellowships} />
          <StatCard label="Age groups" value={groupStats.ageGroups} />
        </section>

        {/* Search and Filters */}
        <div data-tour="groups-filters" className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
            <Input
              type="search"
              placeholder="Search groups..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="h-11 w-full pl-10 sm:h-10"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => handleFilter(e.target.value)}
            aria-label="Group type"
            className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 sm:h-10 sm:w-48"
          >
            <option value="all">All types</option>
            <option value="ministry">Ministry</option>
            <option value="fellowship">Fellowship</option>
            <option value="age_group">Age group</option>
            <option value="special_interest">Special interest</option>
            <option value="leadership">Leadership</option>
          </select>
        </div>

        {/* Groups Grid */}
        {loading ? (
          <LoadingGrid count={6} />
        ) : groups && groups.length > 0 ? (
          <div data-tour="groups-list" className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {groups.map((group) => (
              <Card
                key={group.id}
                role="link"
                tabIndex={0}
                onClick={() => router.push(`/groups/${group.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') router.push(`/groups/${group.id}`)
                }}
                className="cursor-pointer transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
              >
                <CardHeader className="p-4 pb-3 sm:p-6 sm:pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="rounded-lg bg-neutral-100 p-2 text-neutral-600 dark:bg-neutral-700/60 dark:text-neutral-300">
                        {getGroupTypeIcon(group.group_type)}
                      </div>
                      <Badge variant="secondary" className="capitalize">
                        {group.group_type.replace('_', ' ')}
                      </Badge>
                    </div>
                    {canManage ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-11 w-11 shrink-0 p-0"
                        aria-label={`Open ${group.name} to edit`}
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/groups/${group.id}`)
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </div>
                  <CardTitle className="mt-2 break-words text-base font-semibold sm:text-lg">{group.name}</CardTitle>
                  {group.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-neutral-600 dark:text-neutral-400">{group.description}</p>
                  )}
                </CardHeader>
                <CardContent className="space-y-3 p-4 pt-0 sm:p-6 sm:pt-0">
                  {/* Leaders */}
                  {(group.leader || group.co_leader) && (
                    <div>
                      <h4 className="app-overline mb-1.5">Leadership</h4>
                      <div className="space-y-1">
                        {[
                          { person: group.leader, icon: <Crown className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" aria-label="Leader" /> },
                          { person: group.co_leader, icon: <Star className="h-3.5 w-3.5 shrink-0 text-brand-600 dark:text-brand-300" aria-label="Co-leader" /> },
                        ]
                          .filter((l) => l.person)
                          .map(({ person, icon }) => (
                            <div key={person!.id} className="flex min-h-10 items-center justify-between gap-2">
                              <div className="flex min-w-0 items-center gap-2">
                                {icon}
                                <span className="truncate text-sm text-neutral-800 dark:text-neutral-200">{person!.full_name}</span>
                              </div>
                              <QuickContactButtons
                                phone={person!.phone}
                                whatsapp={person!.whatsapp}
                                name={person!.full_name}
                              />
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Meeting Information */}
                  {group.meeting_schedule && (
                    <div className="flex items-start gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                      <Calendar className="mt-0.5 h-4 w-4 shrink-0" />
                      <span className="min-w-0 break-words">{group.meeting_schedule}</span>
                    </div>
                  )}

                  {group.meeting_location && (
                    <div className="flex items-start gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                      <span className="min-w-0 break-words">{group.meeting_location}</span>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-neutral-100 pt-3 text-sm dark:border-white/[0.06]">
                    {group.max_members ? (
                      <span className="text-neutral-500 dark:text-neutral-400">
                        Capacity <span className="font-medium text-neutral-900 dark:text-neutral-100">{group.max_members}</span>
                      </span>
                    ) : null}
                    <span className="text-neutral-500 dark:text-neutral-400">
                      Created <span className="font-medium text-neutral-900 dark:text-neutral-100">{formatDate(group.created_at)}</span>
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {/* Load More Button */}
            {hasMore && (
              <div className="col-span-full pt-2 text-center">
                <Button
                  variant="outline"
                  className="h-11 w-full sm:h-10 sm:w-auto"
                  onClick={loadMore}
                  disabled={loading}
                >
                  {loading ? 'Loading...' : 'Load more'}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <EmptyState
            title="No groups found"
            description={searchTerm || filterType !== 'all' 
              ? 'Try adjusting your search or filter criteria.'
              : 'Get started by creating your first group.'
            }
            icon={<Users className="h-12 w-12" />}
            action={
              canManage ? (
                <Button className="h-11 sm:h-10" onClick={() => router.push('/groups/add')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create group
                </Button>
              ) : undefined
            }
          />
        )}
    </div>
  )
}

export default function GroupsPage() {
  return (
    <ErrorBoundary>
      <DashboardLayout>
        <GroupsContent />
      </DashboardLayout>
    </ErrorBoundary>
  )
}
