'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading'
import { Badge } from '@/components/ui/badge'
import { StatCard } from '@/components/ui/stat-card'
import { CampAdminPageHeader } from '@/components/camp/camp-admin-page-header'
import { useCampRegistrations } from '@/lib/hooks/use-camp'
import { useAuth } from '@/components/providers'
import { CampActiveYearEmpty } from '@/components/camp/camp-active-year-empty'
import { CampMyFollowUpsCard } from '@/components/camp/camp-my-follow-ups-card'
import { CampDailySummaryShare } from '@/components/camp/camp-daily-summary-share'
import { buildLiveRegistrationPulse } from '@/lib/camp/analytics'
import { getPublishedCampFormForYear } from '@/lib/actions/forms'
import {
  QrCode,
  ClipboardList,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  MessageSquare,
  Copy,
  Check,
  RefreshCw,
  Upload,
} from 'lucide-react'

type SortField = 'name' | 'role' | 'status' | 'date' | 'type'
type SortDirection = 'asc' | 'desc'

export default function CampAdminDashboard() {
    const router = useRouter()
    const { user, loading: authLoading } = useAuth()
    const { registrations, campYear, loading, error, refresh } = useCampRegistrations()
    const [sortField, setSortField] = useState<SortField>('date')
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
    const [registrationLinkCopied, setRegistrationLinkCopied] = useState(false)
    const [refreshing, setRefreshing] = useState(false)
    const [registrationFormPath, setRegistrationFormPath] = useState('/camp-meeting/register')
    const [registrationUrl, setRegistrationUrl] = useState('/camp-meeting/register')

    useEffect(() => {
        if (!campYear?.id) return
        void getPublishedCampFormForYear(campYear.id).then(({ data }) => {
            if (data?.slug) {
                setRegistrationFormPath(`/f/${data.slug}`)
            } else {
                setRegistrationFormPath('/camp-meeting/register')
            }
        })
    }, [campYear?.id])

    useEffect(() => {
        setRegistrationUrl(`${window.location.origin}${registrationFormPath}`)
    }, [registrationFormPath])

    // Redirect to auth if not logged in
    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/auth?redirect=' + encodeURIComponent('/admin/camp-meeting'))
        }
    }, [user, authLoading, router])

    const handleRefresh = async () => {
        setRefreshing(true)
        try {
            await refresh()
        } finally {
            setRefreshing(false)
        }
    }

    if (authLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <LoadingSpinner />
            </div>
        )
    }

    if (!user) {
        return null
    }

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
        } else {
            setSortField(field)
            setSortDirection('asc')
        }
    }

    const sortedRegistrations = [...registrations].sort((a, b) => {
        let aValue: any, bValue: any

        switch (sortField) {
            case 'name':
                aValue = a.full_name.toLowerCase()
                bValue = b.full_name.toLowerCase()
                break
            case 'role':
                aValue = a.role || ''
                bValue = b.role || ''
                break
            case 'status':
                aValue = a.status
                bValue = b.status
                break
            case 'date':
                aValue = new Date(a.created_at).getTime()
                bValue = new Date(b.created_at).getTime()
                break
            case 'type':
                aValue = a.is_new_registrant ? 'new' : 'returning'
                bValue = b.is_new_registrant ? 'new' : 'returning'
                break
            default:
                return 0
        }

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
        return 0
    })

    const recentRegistrations = sortedRegistrations.slice(0, 10)

    const getSortIcon = (field: SortField) => {
        if (sortField !== field) {
            return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />
        }
        return sortDirection === 'asc' 
            ? <ChevronUp className="h-4 w-4 ml-1" />
            : <ChevronDown className="h-4 w-4 ml-1" />
    }

    const copyRegistrationLink = async () => {
        try {
            await navigator.clipboard.writeText(registrationUrl)
            setRegistrationLinkCopied(true)
            setTimeout(() => setRegistrationLinkCopied(false), 3000)
        } catch (err) {
            console.error('Failed to copy:', err)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <LoadingSpinner />
            </div>
        )
    }

    if (error && !campYear) {
        return <CampActiveYearEmpty title="Error loading data" error={error} />
    }

    if (!campYear) {
        return <CampActiveYearEmpty />
    }

        // Calculate Stats
    const total = registrations.length
    const checkedIn = registrations.filter(r => r.status === 'checked_in').length
    const newRegistrants = registrations.filter(r => r.is_new_registrant).length
    const returning = total - newRegistrants
    const livePulse = buildLiveRegistrationPulse(registrations)

    const byRole = registrations.reduce((acc, curr) => {
        acc[curr.role] = (acc[curr.role] || 0) + 1
        return acc
    }, {} as Record<string, number>)

    const checkInRate = total > 0 ? Math.round((checkedIn / total) * 100) : 0
    const newRate = total > 0 ? Math.round((newRegistrants / total) * 100) : 0

    return (
        <div className="mx-auto max-w-7xl space-y-6">
            <CampAdminPageHeader
                title="Camp meeting"
                campYear={campYear}
                backHref="/admin"
                actions={
                    <>
                        <Button
                            variant="outline"
                            onClick={() => void handleRefresh()}
                            disabled={refreshing || loading}
                        >
                            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => router.push('/admin/camp-meeting/registrations')}
                        >
                            <ClipboardList className="mr-2 h-4 w-4" />
                            Registrations
                        </Button>
                        <Button onClick={() => router.push('/admin/camp-meeting/scan')}>
                            <QrCode className="mr-2 h-4 w-4" />
                            Scanner
                        </Button>
                    </>
                }
            />

            <section aria-label="Camp totals" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <button
                    type="button"
                    onClick={() => router.push('/admin/camp-meeting/registrations')}
                    className="rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
                >
                    <StatCard label="Registrations" value={total} sub="All participants" className="h-full" />
                </button>
                <button
                    type="button"
                    onClick={() => router.push('/admin/camp-meeting/scan')}
                    className="rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
                >
                    <StatCard
                        label="Checked in"
                        value={checkedIn}
                        sub={`${checkInRate}% of registrations`}
                        tone={checkedIn > 0 ? 'success' : 'default'}
                        className="h-full"
                    />
                </button>
                <StatCard
                    label="New"
                    value={newRegistrants}
                    sub={`${newRate}% first-time`}
                />
                <StatCard label="Returning" value={returning} sub="Registered in a previous year" />
            </section>

            <section className="grid gap-6 lg:grid-cols-3">
                <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-800 lg:col-span-2">
                    <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Registration link</h2>
                    <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                        Share this for public registration.
                    </p>
                    <div className="mt-4 flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 dark:border-neutral-600 dark:bg-neutral-900/40">
                        <input
                            type="text"
                            readOnly
                            value={registrationUrl}
                            aria-label="Registration link"
                            className="min-w-0 flex-1 truncate bg-transparent text-sm text-neutral-700 outline-none dark:text-neutral-200"
                        />
                        <Button size="sm" variant="outline" onClick={() => void copyRegistrationLink()}>
                            {registrationLinkCopied ? (
                                <>
                                    <Check className="mr-1 h-4 w-4 text-emerald-600" />
                                    Copied
                                </>
                            ) : (
                                <>
                                    <Copy className="mr-1 h-4 w-4" />
                                    Copy
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    <button
                        type="button"
                        onClick={() => router.push('/admin/camp-meeting/communications')}
                        className="flex flex-1 items-center justify-between rounded-xl border border-neutral-200 bg-white px-5 py-4 text-left transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700"
                    >
                        <span>
                            <span className="block text-sm font-semibold text-neutral-900 dark:text-neutral-100">Communications</span>
                            <span className="mt-1 block text-xs text-neutral-500 dark:text-neutral-400">SMS, email, and delivery</span>
                        </span>
                        <MessageSquare className="h-5 w-5 text-neutral-400" />
                    </button>
                    <button
                        type="button"
                        onClick={() => router.push('/admin/camp-meeting/import')}
                        className="flex flex-1 items-center justify-between rounded-xl border border-neutral-200 bg-white px-5 py-4 text-left transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700"
                    >
                        <span>
                            <span className="block text-sm font-semibold text-neutral-900 dark:text-neutral-100">Import history</span>
                            <span className="mt-1 block text-xs text-neutral-500 dark:text-neutral-400">Past years from Excel</span>
                        </span>
                        <Upload className="h-5 w-5 text-neutral-400" />
                    </button>
                    <button
                        type="button"
                        onClick={() => router.push('/admin/camp-meeting/notifications')}
                        className="flex flex-1 items-center justify-between rounded-xl border border-neutral-200 bg-white px-5 py-4 text-left transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700"
                    >
                        <span>
                            <span className="block text-sm font-semibold text-neutral-900 dark:text-neutral-100">Notification settings</span>
                            <span className="mt-1 block text-xs text-neutral-500 dark:text-neutral-400">Templates for new registrations</span>
                        </span>
                        <ClipboardList className="h-5 w-5 text-neutral-400" />
                    </button>
                </div>
            </section>

            <CampMyFollowUpsCard
                userId={user.id}
                registrations={registrations}
                onOpenQueue={() => router.push('/admin/camp-meeting/follow-up?mine=1')}
                onOpenRegistration={(registrationId) =>
                    router.push(`/admin/camp-meeting/registrations/${registrationId}`)
                }
            />

            {total > 0 ? (
                <CampDailySummaryShare
                    variant="card"
                    yearId={campYear.id}
                    input={{
                        year: campYear.year,
                        theme: campYear.theme,
                        total,
                        newRegistrants,
                        returning,
                        pulse: livePulse,
                        registrationUrl,
                    }}
                />
            ) : null}

            <section className="grid gap-6 lg:grid-cols-3">
                <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-800 lg:col-span-2">
                    <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Role distribution</h2>
                    <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Participants by role</p>
                    {Object.keys(byRole).length === 0 ? (
                        <p className="mt-6 text-sm text-neutral-500 dark:text-neutral-400">No role data yet.</p>
                    ) : (
                        <div className="mt-5 space-y-4">
                            {Object.entries(byRole)
                                .sort((a, b) => b[1] - a[1])
                                .map(([role, count]) => {
                                    const percentage = total > 0 ? (count / total) * 100 : 0
                                    return (
                                        <div key={role}>
                                            <div className="flex items-center justify-between gap-3 text-sm">
                                                <span className="font-medium text-neutral-800 dark:text-neutral-100">{role}</span>
                                                <span className="shrink-0 tabular-nums text-neutral-500 dark:text-neutral-400">
                                                    {count}
                                                    <span className="ml-2">{Math.round(percentage)}%</span>
                                                </span>
                                            </div>
                                            <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-700">
                                                <div
                                                    className="h-full rounded-full bg-brand-600"
                                                    style={{ width: `${percentage}%` }}
                                                />
                                            </div>
                                        </div>
                                    )
                                })}
                        </div>
                    )}
                </div>

                <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-800">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Recent</h2>
                            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                                Latest {recentRegistrations.length}
                            </p>
                        </div>
                    </div>
                    {recentRegistrations.length === 0 ? (
                        <p className="mt-6 text-sm text-neutral-500 dark:text-neutral-400">No registrations yet.</p>
                    ) : (
                        <div className="mt-4 divide-y divide-neutral-100 dark:divide-neutral-700">
                            {recentRegistrations.map((reg) => (
                                <button
                                    key={reg.id}
                                    type="button"
                                    onClick={() => router.push(`/admin/camp-meeting/registrations/${reg.id}`)}
                                    className="flex w-full flex-col gap-1 py-3 text-left"
                                >
                                    <span className="flex items-center justify-between gap-2">
                                        <span className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                                            {reg.full_name}
                                        </span>
                                        {reg.is_new_registrant ? (
                                            <Badge variant="secondary" className="shrink-0">New</Badge>
                                        ) : null}
                                    </span>
                                    <span className="flex items-center justify-between gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                                        <span className="truncate">{reg.role}</span>
                                        <span className="shrink-0">
                                            {reg.status === 'checked_in' ? 'Checked in' : 'Registered'}
                                        </span>
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                    <Button
                        variant="outline"
                        className="mt-4 w-full"
                        onClick={() => router.push('/admin/camp-meeting/registrations')}
                    >
                        View all registrations
                    </Button>
                </div>
            </section>

            {registrations.length > 0 ? (
                <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800">
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-neutral-200 px-5 py-4 dark:border-neutral-700">
                        <div>
                            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Registrations</h2>
                            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                                {registrations.length} total
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push('/admin/camp-meeting/registrations')}
                        >
                            Open full list
                        </Button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-neutral-200 text-left dark:border-neutral-700">
                                    <th className="px-5 py-3 font-medium text-neutral-500 dark:text-neutral-400">
                                        <button type="button" onClick={() => handleSort('name')} className="inline-flex items-center">
                                            Name
                                            {getSortIcon('name')}
                                        </button>
                                    </th>
                                    <th className="hidden px-3 py-3 font-medium text-neutral-500 dark:text-neutral-400 sm:table-cell">
                                        <button type="button" onClick={() => handleSort('role')} className="inline-flex items-center">
                                            Role
                                            {getSortIcon('role')}
                                        </button>
                                    </th>
                                    <th className="hidden px-3 py-3 font-medium text-neutral-500 dark:text-neutral-400 md:table-cell">
                                        <button type="button" onClick={() => handleSort('type')} className="inline-flex items-center">
                                            Type
                                            {getSortIcon('type')}
                                        </button>
                                    </th>
                                    <th className="px-3 py-3 font-medium text-neutral-500 dark:text-neutral-400">
                                        <button type="button" onClick={() => handleSort('status')} className="inline-flex items-center">
                                            Status
                                            {getSortIcon('status')}
                                        </button>
                                    </th>
                                    <th className="hidden px-5 py-3 font-medium text-neutral-500 dark:text-neutral-400 lg:table-cell">
                                        <button type="button" onClick={() => handleSort('date')} className="inline-flex items-center">
                                            Date
                                            {getSortIcon('date')}
                                        </button>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedRegistrations.slice(0, 15).map((reg) => (
                                    <tr
                                        key={reg.id}
                                        onClick={() => router.push(`/admin/camp-meeting/registrations/${reg.id}`)}
                                        className="cursor-pointer border-b border-neutral-100 last:border-0 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-700/50"
                                    >
                                        <td className="px-5 py-3">
                                            <div className="font-medium text-neutral-900 dark:text-neutral-100">{reg.full_name}</div>
                                            {reg.email ? (
                                                <div className="max-w-[16rem] truncate text-xs text-neutral-500 dark:text-neutral-400">{reg.email}</div>
                                            ) : null}
                                        </td>
                                        <td className="hidden px-3 py-3 text-neutral-700 dark:text-neutral-300 sm:table-cell">{reg.role}</td>
                                        <td className="hidden px-3 py-3 text-neutral-600 dark:text-neutral-400 md:table-cell">
                                            {reg.is_new_registrant ? 'New' : 'Returning'}
                                        </td>
                                        <td className="px-3 py-3">
                                            <Badge variant={reg.status === 'checked_in' ? 'default' : 'outline'}>
                                                {reg.status === 'checked_in' ? 'Checked in' : 'Registered'}
                                            </Badge>
                                        </td>
                                        <td className="hidden px-5 py-3 text-neutral-600 dark:text-neutral-400 lg:table-cell">
                                            {new Date(reg.created_at).toLocaleDateString('en-GB', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric',
                                            })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {sortedRegistrations.length > 15 ? (
                        <div className="border-t border-neutral-200 px-5 py-4 text-center dark:border-neutral-700">
                            <Button variant="outline" onClick={() => router.push('/admin/camp-meeting/registrations')}>
                                View all {registrations.length}
                            </Button>
                        </div>
                    ) : null}
                </section>
            ) : null}
        </div>
    )
}
