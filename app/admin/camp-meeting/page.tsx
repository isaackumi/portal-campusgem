'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading'
import { Badge } from '@/components/ui/badge'
import { CampRegistration, CampYear } from '@/lib/types'
import { useCampRegistrations } from '@/lib/hooks/use-camp'
import { useAuth } from '@/components/providers'
import { CampActiveYearEmpty } from '@/components/camp/camp-active-year-empty'
import { CampMyFollowUpsCard } from '@/components/camp/camp-my-follow-ups-card'
import { getPublishedCampFormForYear } from '@/lib/actions/forms'
import { 
  Users, 
  QrCode, 
  ClipboardList, 
  TrendingUp, 
  ArrowLeft, 
  Calendar, 
  MapPin,
  Clock,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  Sparkles,
  MessageSquare,
  Link as LinkIcon,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  Upload
} from 'lucide-react'

type SortField = 'name' | 'role' | 'status' | 'date' | 'type'
type SortDirection = 'asc' | 'desc'

export default function CampAdminDashboard() {
    const router = useRouter()
    const { user, loading: authLoading } = useAuth()
    const { registrations, campYear, loading, error, refresh } = useCampRegistrations()
    const [sortField, setSortField] = useState<SortField>('date')
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
    const [showRecentRegistrations, setShowRecentRegistrations] = useState(true)
    const [registrationLinkCopied, setRegistrationLinkCopied] = useState(false)
    const [refreshing, setRefreshing] = useState(false)
    const [registrationFormPath, setRegistrationFormPath] = useState('/camp-meeting/register')

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

    const registrationUrl =
        typeof window !== 'undefined' ? `${window.location.origin}${registrationFormPath}` : registrationFormPath

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

    const byRole = registrations.reduce((acc, curr) => {
        acc[curr.role] = (acc[curr.role] || 0) + 1
        return acc
    }, {} as Record<string, number>)

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 relative">
            {/* Sticky Back Navigation Button - Always Visible */}
            <div className="fixed bottom-6 right-6 z-50">
                <Button
                    variant="default"
                    size="lg"
                    onClick={() => router.push('/admin')}
                    className="rounded-full shadow-lg hover:shadow-xl transition-all duration-200 bg-blue-600 hover:bg-blue-700 text-white h-14 w-14 p-0"
                    title="Back to Admin Dashboard"
                >
                    <ArrowLeft className="h-6 w-6" />
                </Button>
            </div>

            {/* Sticky Header with Back Button */}
            <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push('/admin')}
                                className="hidden sm:flex items-center gap-2 hover:bg-gray-100"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                <span className="text-sm font-medium">Back to Admin</span>
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => router.push('/admin')}
                                className="sm:hidden"
                                title="Back"
                            >
                                <ArrowLeft className="h-5 w-5" />
                        </Button>
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <Sparkles className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-gray-900">
                                    Camp Meeting {campYear.year}
                                </h1>
                                    <p className="text-xs sm:text-sm text-gray-600 mt-0.5 font-medium">
                                        {campYear.theme}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                            <Button 
                                variant="outline"
                                size="sm"
                                onClick={handleRefresh}
                                disabled={refreshing || loading}
                                className="shadow-sm"
                                title="Refresh data"
                            >
                                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                            </Button>
                            <Button 
                                variant="outline"
                                size="sm"
                                onClick={() => router.push('/admin/camp-meeting/registrations')}
                                className="hidden md:flex shadow-sm"
                            >
                                <ClipboardList className="mr-2 h-4 w-4" /> 
                                <span className="hidden lg:inline">Manage</span>
                            </Button>
                            <Button 
                                size="sm"
                                onClick={() => router.push('/admin/camp-meeting/scan')}
                                className="shadow-sm bg-blue-600 hover:bg-blue-700"
                            >
                                <QrCode className="mr-2 h-4 w-4" /> 
                                <span className="hidden sm:inline">Scanner</span>
                            </Button>
                        </div>
                                </div>
                    {/* Camp Year Details */}
                    <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-gray-600 mt-3 pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                                    <span>
                                        {new Date(campYear.start_date).toLocaleDateString('en-US', {
                                    month: 'short',
                                            day: 'numeric',
                                            year: 'numeric'
                                        })}
                                    </span>
                                </div>
                                {campYear.venue && (
                            <div className="flex items-center gap-1.5">
                                <MapPin className="h-3.5 w-3.5" />
                                        <span>{campYear.venue}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 pb-24">

                {/* Quick Actions - Registration Link & SMS Management */}
                <div className="grid gap-4 md:grid-cols-3">
                    <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push('/admin/camp-meeting/import')}>
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-purple-900 text-lg">
                                <Upload className="h-5 w-5" />
                                Import Historical Data
                            </CardTitle>
                            <CardDescription className="text-purple-700 text-sm">
                                Import past camp registrations from Excel
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-purple-600 leading-relaxed">
                                Upload Excel files for previous camp years to enable historical analytics
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white hover:shadow-md transition-shadow">
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-blue-900 text-lg">
                                <LinkIcon className="h-5 w-5" />
                                Registration Form Link
                            </CardTitle>
                            <CardDescription className="text-blue-700 text-sm">
                                Share this link for public registration
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex items-center gap-2 p-3 bg-white rounded-lg border-2 border-blue-200 shadow-sm">
                                <input
                                    type="text"
                                    readOnly
                                    value={registrationUrl}
                                    className="flex-1 text-xs sm:text-sm font-mono bg-transparent border-none outline-none text-gray-700 truncate"
                                />
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={copyRegistrationLink}
                                    className="flex-shrink-0 border-blue-300 hover:bg-blue-50"
                                >
                                    {registrationLinkCopied ? (
                                        <>
                                            <Check className="h-4 w-4 mr-1 text-green-600" />
                                            <span className="hidden sm:inline">Copied!</span>
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="h-4 w-4 sm:mr-1" />
                                            <span className="hidden sm:inline">Copy</span>
                                        </>
                                    )}
                                </Button>
                            </div>
                            <p className="text-xs text-blue-600 leading-relaxed">
                                Click copy to share this link via SMS, Email, or WhatsApp
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-white hover:shadow-md transition-shadow">
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-green-900 text-lg">
                                <MessageSquare className="h-5 w-5" />
                                Communications
                            </CardTitle>
                            <CardDescription className="text-green-700 text-sm">
                                Send bulk SMS and manage notifications
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <p className="text-sm text-green-800 leading-relaxed">
                                Send SMS messages to filtered groups of registrations. Configure templates and track delivery status.
                            </p>
                            <div className="space-y-2">
                            <Button
                                onClick={() => router.push('/admin/camp-meeting/communications')}
                                    className="w-full bg-green-600 hover:bg-green-700 text-white shadow-sm"
                            >
                                <MessageSquare className="mr-2 h-4 w-4" />
                                    <span className="hidden sm:inline">Manage SMS</span>
                                    <span className="sm:hidden">SMS</span>
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => router.push('/admin/camp-meeting/notifications')}
                                    className="w-full border-green-300 text-green-700 hover:bg-green-50"
                            >
                                <Calendar className="mr-2 h-4 w-4" />
                                    <span className="hidden sm:inline">Notification Settings</span>
                                    <span className="sm:hidden">Settings</span>
                            </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {user ? (
                    <CampMyFollowUpsCard
                        userId={user.id}
                        registrations={registrations}
                        onOpenQueue={() => router.push('/admin/camp-meeting/follow-up?mine=1')}
                        onOpenRegistration={(registrationId) =>
                            router.push(`/admin/camp-meeting/registrations/${registrationId}`)
                        }
                    />
                ) : null}

                {/* Stats Cards */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Card className="border-2 border-blue-200 hover:shadow-lg transition-all duration-200 hover:border-blue-300 cursor-pointer" onClick={() => router.push('/admin/camp-meeting/registrations')}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                            <CardTitle className="text-sm font-semibold text-gray-700">
                                Total Registrations
                            </CardTitle>
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <Users className="h-5 w-5 text-blue-600" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-gray-900 mb-1">{total}</div>
                            <p className="text-xs text-gray-500">
                                All registered participants
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-2 border-green-200 hover:shadow-lg transition-all duration-200 hover:border-green-300 cursor-pointer" onClick={() => router.push('/admin/camp-meeting/scan')}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                            <CardTitle className="text-sm font-semibold text-gray-700">
                                Checked In
                            </CardTitle>
                            <div className="p-2 bg-green-100 rounded-lg">
                                <TrendingUp className="h-5 w-5 text-green-600" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-green-600 mb-1">{checkedIn}</div>
                            <p className="text-xs text-gray-500">
                                {total > 0 ? Math.round((checkedIn / total) * 100) : 0}% Attendance Rate
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-2 border-purple-200 hover:shadow-lg transition-all duration-200 hover:border-purple-300">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                            <CardTitle className="text-sm font-semibold text-gray-700">
                                New First Timers
                            </CardTitle>
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <Users className="h-5 w-5 text-purple-600" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-purple-600 mb-1">{newRegistrants}</div>
                            <p className="text-xs text-gray-500">
                                {total > 0 ? Math.round((newRegistrants / total) * 100) : 0}% of total registrations
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-2 border-orange-200 hover:shadow-lg transition-all duration-200 hover:border-orange-300">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                            <CardTitle className="text-sm font-semibold text-gray-700">
                                Top Role
                            </CardTitle>
                            <div className="p-2 bg-orange-100 rounded-lg">
                                <Users className="h-5 w-5 text-orange-600" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl sm:text-3xl font-bold text-orange-600 mb-1 truncate">
                                {Object.entries(byRole).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'}
                            </div>
                            <p className="text-xs text-gray-500">
                                {Object.entries(byRole).sort((a, b) => b[1] - a[1])[0]?.[1] || 0} participants
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Content Grid */}
                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Role Distribution */}
                    <Card className="lg:col-span-2 border-2 hover:shadow-md transition-shadow">
                        <CardHeader className="border-b bg-gray-50/50">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Users className="h-5 w-5 text-blue-600" />
                                Role Distribution
                            </CardTitle>
                            <CardDescription className="text-sm">
                                Breakdown of participants by role
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            {Object.keys(byRole).length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    <Users className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                                    <p className="text-sm">No role data available</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                {Object.entries(byRole)
                                    .sort((a, b) => b[1] - a[1])
                                    .map(([role, count]) => {
                                        const percentage = total > 0 ? (count / total) * 100 : 0
                                        return (
                                            <div key={role} className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-semibold text-gray-700">{role}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-bold text-gray-900">{count}</span>
                                                        <Badge variant="outline" className="text-xs">
                                                            {Math.round(percentage)}%
                                                        </Badge>
                                                    </div>
                                                </div>
                                                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                                                    <div
                                                            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500 shadow-sm"
                                                        style={{ width: `${percentage}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )
                                    })}
                            </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Recent Registrations */}
                    <Card className="border-2 hover:shadow-md transition-shadow">
                        <CardHeader className="border-b bg-gray-50/50">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <Clock className="h-5 w-5 text-blue-600" />
                                        Recent Registrations
                                    </CardTitle>
                                    <CardDescription className="text-sm">
                                        Latest {recentRegistrations.length} registrations
                                    </CardDescription>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowRecentRegistrations(!showRecentRegistrations)}
                                    className="text-xs"
                                >
                                    {showRecentRegistrations ? 'Hide' : 'Show'}
                                </Button>
                            </div>
                        </CardHeader>
                        {showRecentRegistrations && (
                            <CardContent className="pt-4">
                                {recentRegistrations.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        <Users className="h-10 w-10 mx-auto mb-2 text-gray-400" />
                                        <p className="text-sm">No registrations yet</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2.5">
                                        {recentRegistrations.map((reg) => (
                                            <div
                                                key={reg.id}
                                                className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all duration-150 cursor-pointer border border-gray-200 hover:border-gray-300 hover:shadow-sm"
                                                onClick={() => router.push(`/admin/camp-meeting/registrations/${reg.id}`)}
                                            >
                                                <div className="flex items-start justify-between mb-1.5">
                                                    <span className="font-semibold text-sm text-gray-900 truncate flex-1">
                                                        {reg.full_name}
                                                    </span>
                                                    {reg.is_new_registrant && (
                                                        <Badge variant="secondary" className="text-xs ml-2 flex-shrink-0">
                                                            New
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                                                    <span className="truncate">{reg.role}</span>
                                                    <span className="ml-2 flex-shrink-0">{new Date(reg.created_at).toLocaleDateString()}</span>
                                                </div>
                                                <div>
                                                    <Badge
                                                        variant={reg.status === 'checked_in' ? 'default' : 'outline'}
                                                        className="text-xs"
                                                    >
                                                        {reg.status === 'checked_in' ? 'Checked In' : 'Registered'}
                                                    </Badge>
                                                </div>
                                            </div>
                                        ))}
                                        <Button
                                            variant="outline"
                                            className="w-full mt-4 border-blue-200 hover:bg-blue-50 hover:border-blue-300"
                                            onClick={() => router.push('/admin/camp-meeting/registrations')}
                                        >
                                            View All Registrations
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        )}
                    </Card>
                </div>

                {/* Registrations Table with Sorting */}
                {registrations.length > 0 && (
                    <Card className="border-2 hover:shadow-md transition-shadow">
                        <CardHeader className="border-b bg-gray-50/50">
                            <div className="flex items-center justify-between flex-wrap gap-3">
                                <div>
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <ClipboardList className="h-5 w-5 text-blue-600" />
                                        All Registrations
                                    </CardTitle>
                                    <CardDescription className="text-sm">
                                        {registrations.length} total registration{registrations.length !== 1 ? 's' : ''}
                                    </CardDescription>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => router.push('/admin/camp-meeting/registrations')}
                                    className="shadow-sm"
                                >
                                    View Full Page
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <div className="overflow-x-auto -mx-6 px-6">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-gray-200">
                                            <th className="text-left py-3 px-3 sm:px-4">
                                                <button
                                                    onClick={() => handleSort('name')}
                                                    className="flex items-center font-semibold text-xs sm:text-sm text-gray-700 hover:text-gray-900 transition-colors"
                                                >
                                                    Name
                                                    {getSortIcon('name')}
                                                </button>
                                            </th>
                                            <th className="text-left py-3 px-3 sm:px-4 hidden sm:table-cell">
                                                <button
                                                    onClick={() => handleSort('role')}
                                                    className="flex items-center font-semibold text-xs sm:text-sm text-gray-700 hover:text-gray-900 transition-colors"
                                                >
                                                    Role
                                                    {getSortIcon('role')}
                                                </button>
                                            </th>
                                            <th className="text-left py-3 px-3 sm:px-4 hidden md:table-cell">
                                                <button
                                                    onClick={() => handleSort('type')}
                                                    className="flex items-center font-semibold text-xs sm:text-sm text-gray-700 hover:text-gray-900 transition-colors"
                                                >
                                                    Type
                                                    {getSortIcon('type')}
                                                </button>
                                            </th>
                                            <th className="text-left py-3 px-3 sm:px-4">
                                                <button
                                                    onClick={() => handleSort('status')}
                                                    className="flex items-center font-semibold text-xs sm:text-sm text-gray-700 hover:text-gray-900 transition-colors"
                                                >
                                                    Status
                                                    {getSortIcon('status')}
                                                </button>
                                            </th>
                                            <th className="text-left py-3 px-3 sm:px-4 hidden lg:table-cell">
                                                <button
                                                    onClick={() => handleSort('date')}
                                                    className="flex items-center font-semibold text-xs sm:text-sm text-gray-700 hover:text-gray-900 transition-colors"
                                                >
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
                                                className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                                                onClick={() => router.push(`/admin/camp-meeting/registrations/${reg.id}`)}
                                            >
                                                <td className="py-3 px-3 sm:px-4">
                                                    <div className="font-medium text-sm text-gray-900">{reg.full_name}</div>
                                                    {reg.email && (
                                                        <div className="text-xs text-gray-500 truncate max-w-[200px]">{reg.email}</div>
                                                    )}
                                                    <div className="sm:hidden mt-1">
                                                        <Badge variant="outline" className="text-xs mr-2">
                                                            {reg.role}
                                                        </Badge>
                                                        {reg.is_new_registrant && (
                                                            <Badge variant="secondary" className="text-xs">
                                                                New
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-3 sm:px-4 hidden sm:table-cell">
                                                    <Badge variant="outline" className="text-xs">
                                                        {reg.role}
                                                    </Badge>
                                                </td>
                                                <td className="py-3 px-3 sm:px-4 hidden md:table-cell">
                                                    {reg.is_new_registrant ? (
                                                        <Badge variant="secondary" className="text-xs">
                                                            New
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-xs text-gray-600">Returning</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-3 sm:px-4">
                                                    <Badge
                                                        variant={reg.status === 'checked_in' ? 'default' : 'outline'}
                                                        className="text-xs"
                                                    >
                                                        {reg.status === 'checked_in' ? 'Checked In' : reg.status}
                                                    </Badge>
                                                </td>
                                                <td className="py-3 px-3 sm:px-4 text-xs sm:text-sm text-gray-600 hidden lg:table-cell">
                                                    {new Date(reg.created_at).toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        year: 'numeric'
                                                    })}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {sortedRegistrations.length > 15 && (
                                    <div className="p-4 text-center border-t">
                                        <Button
                                            variant="outline"
                                            onClick={() => router.push('/admin/camp-meeting/registrations')}
                                            className="shadow-sm"
                                        >
                                            View All {registrations.length} Registrations
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}
