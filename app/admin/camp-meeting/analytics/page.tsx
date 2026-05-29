'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getActiveCampYear, getCampYearById, getCampRegistrations } from '@/lib/actions/camp'
import { CampRegistration, CampYear } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CampAdminPageHeader } from '@/components/camp/camp-admin-page-header'
import { 
    ArrowLeft, Users, TrendingUp, TrendingDown, BarChart3, PieChart,
    DollarSign, CheckCircle2, XCircle, Calendar, MapPin, GraduationCap,
    Heart, UserCheck, UserX, Clock, Download, Filter, Shield, Phone, ClipboardList
} from 'lucide-react'

function countByLabel<T>(items: T[], getLabel: (item: T) => string): Record<string, number> {
    return items.reduce((acc, item) => {
        const label = getLabel(item)
        acc[label] = (acc[label] ?? 0) + 1
        return acc
    }, {} as Record<string, number>)
}

function BreakdownBars({
    title,
    description,
    icon: Icon,
    iconClassName,
    entries,
    total,
    barClassName,
}: {
    title: string
    description: string
    icon: typeof Heart
    iconClassName: string
    entries: Record<string, number>
    total: number
    barClassName: string
}) {
    return (
        <Card className="border-2">
            <CardHeader className="bg-gray-50 border-b">
                <CardTitle className="flex items-center gap-2">
                    <Icon className={`h-5 w-5 ${iconClassName}`} />
                    {title}
                </CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
                <div className="space-y-4 max-h-[400px] overflow-y-auto">
                    {Object.entries(entries)
                        .sort((a, b) => b[1] - a[1])
                        .map(([label, count]) => {
                            const percentage = total > 0 ? (count / total) * 100 : 0
                            return (
                                <div key={label} className="space-y-2">
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-sm font-semibold text-gray-700">{label}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-gray-900">{count}</span>
                                            <Badge variant="outline" className="text-xs">
                                                {Math.round(percentage)}%
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${barClassName}`}
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                </div>
                            )
                        })}
                </div>
            </CardContent>
        </Card>
    )
}

function CampAnalyticsContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [campYear, setCampYear] = useState<CampYear | null>(null)
    const [registrations, setRegistrations] = useState<CampRegistration[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadData()
    }, [searchParams])

    async function loadData() {
        try {
            setLoading(true)
            const yearId = searchParams.get('year')
            
            let year: CampYear | null = null
            
            if (yearId) {
                // Fetch specific camp year using server action (bypasses RLS)
                const result = await getCampYearById(yearId)
                if (result.error) {
                    console.error('Error fetching camp year:', result.error)
                } else {
                    year = result.data
                }
            }
            
            // If no year ID provided or fetch failed, get active year
            if (!year) {
                const result = await getActiveCampYear()
                year = result.data
            }
            
            if (year) {
                setCampYear(year)
                // Use server action to get registrations (bypasses RLS)
                const result = await getCampRegistrations(year.id)
                if (result.data) {
                    setRegistrations(result.data)
                } else if (result.error) {
                    console.error('Error fetching registrations:', result.error)
                }
            }
        } catch (error: any) {
            console.error('Error loading analytics data:', error)
        } finally {
            setLoading(false)
        }
    }

    // Calculate statistics
    const stats = {
        total: registrations.length,
        checkedIn: registrations.filter(r => r.status === 'checked_in').length,
        registered: registrations.filter(r => r.status === 'registered').length,
        cancelled: registrations.filter(r => r.status === 'cancelled').length,
        newRegistrants: registrations.filter(r => r.is_new_registrant).length,
        returning: registrations.filter(r => !r.is_new_registrant).length,
        paid: registrations.filter(r => r.payment_status === 'paid' || r.payment_status === 'confirmed').length,
        pending: registrations.filter(r => r.payment_status === 'pending').length,
        followUpPending: registrations.filter(r => r.follow_up_status === 'pending').length,
        followUpInProgress: registrations.filter(r => r.follow_up_status === 'in_progress').length,
        followUpCompleted: registrations.filter(r => r.follow_up_status === 'completed').length,
        followUpUnassigned: registrations.filter(r => !r.follow_up_status).length,
    }

    const followUpTotal =
        stats.followUpPending + stats.followUpInProgress + stats.followUpCompleted + stats.followUpUnassigned

    // Demographics
    const byGender = registrations.reduce((acc, r) => {
        const gender = r.sex || 'Unknown'
        acc[gender] = (acc[gender] || 0) + 1
        return acc
    }, {} as Record<string, number>)

    const byAgeBracket = registrations.reduce((acc, r) => {
        const bracket = r.age_bracket || 'Unknown'
        acc[bracket] = (acc[bracket] || 0) + 1
        return acc
    }, {} as Record<string, number>)

    const byEducation = registrations.reduce((acc, r) => {
        const edu = r.education_level || r.highest_qualification || 'Unknown'
        acc[edu] = (acc[edu] || 0) + 1
        return acc
    }, {} as Record<string, number>)

    const byRole = registrations.reduce((acc, r) => {
        const role = r.role || 'Unknown'
        acc[role] = (acc[role] || 0) + 1
        return acc
    }, {} as Record<string, number>)

    const byResidence = registrations.reduce((acc, r) => {
        if (!r.residence) return acc
        // Extract region from "Town, Region" format
        const parts = r.residence.split(',').map(p => p.trim())
        const region = parts.length > 1 ? parts[1] : parts[0]
        acc[region] = (acc[region] || 0) + 1
        return acc
    }, {} as Record<string, number>)

    const byNhis = countByLabel(registrations, (registration) => {
        if (registration.has_nhis_card === true) return 'Has NHIS card'
        if (registration.has_nhis_card === false) return 'No NHIS card'
        return 'Not recorded'
    })

    const byHealth = countByLabel(registrations, (registration) => {
        if (registration.has_health_challenge === true) return 'Reported health challenge'
        if (registration.has_health_challenge === false) return 'No reported health challenge'
        return 'Not recorded'
    })

    const byTimesAttended = countByLabel(registrations, (registration) => {
        const times = registration.times_attended
        if (times == null) return 'Attendance history not recorded'
        if (times <= 0) return 'First camp'
        if (times === 1) return 'Attended once before'
        if (times <= 3) return '2-3 previous camps'
        return '4+ previous camps'
    })

    const byParentContact = countByLabel(registrations, (registration) => {
        const hasName = Boolean(registration.parent_name?.trim())
        const hasContact = Boolean(registration.parent_contact?.trim())
        if (hasName && hasContact) return 'Complete parent/guardian contact'
        if (hasName || hasContact) return 'Partial parent/guardian contact'
        return 'Missing parent/guardian contact'
    })

    const bySchoolWork = countByLabel(
        registrations.filter((registration) => registration.address_school_work?.trim()),
        (registration) => registration.address_school_work!.trim()
    )

    const healthChallengeDetails = registrations.reduce((acc, registration) => {
        if (!registration.has_health_challenge) return acc
        for (const challenge of registration.health_challenges ?? []) {
            const label = challenge.trim()
            if (!label) continue
            acc[label] = (acc[label] ?? 0) + 1
        }
        return acc
    }, {} as Record<string, number>)

    // Payment analytics
    const paymentStats = {
        totalAmount: registrations.reduce((sum, r) => sum + (r.payment_amount || 0), 0),
        paidAmount: registrations
            .filter(r => r.payment_status === 'paid' || r.payment_status === 'confirmed')
            .reduce((sum, r) => sum + (r.payment_amount || 0), 0),
        pendingAmount: registrations
            .filter(r => r.payment_status === 'pending')
            .reduce((sum, r) => sum + (r.payment_amount || 0), 0),
    }

    // Registration trends (by day)
    const byDate = registrations.reduce((acc, r) => {
        const date = new Date(r.created_at).toISOString().split('T')[0]
        acc[date] = (acc[date] || 0) + 1
        return acc
    }, {} as Record<string, number>)

    const sortedDates = Object.keys(byDate).sort()
    const recentDates = sortedDates.slice(-7) // Last 7 days

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <LoadingSpinner />
            </div>
        )
    }

    if (!campYear) {
        return (
            <div className="p-6 max-w-4xl mx-auto">
                <Card>
                    <CardContent className="py-12 text-center">
                        <p className="text-muted-foreground mb-4">No active camp year found.</p>
                        <Button onClick={() => router.push('/admin/camp-meeting/years')}>
                            Manage Camp Years
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="max-w-7xl mx-auto p-6 space-y-6">
                <CampAdminPageHeader
                    title="Camp Analytics"
                    campYear={campYear}
                    actions={
                        <Button variant="outline" onClick={() => router.push('/admin/camp-meeting/registrations')}>
                            <Download className="mr-2 h-4 w-4" /> Export Data
                        </Button>
                    }
                />

                {/* Overview Stats */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card className="border-2">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                Total Registrations
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
                            <p className="text-xs text-gray-500 mt-1">
                                {stats.newRegistrants} new, {stats.returning} returning
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-2">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                Checked In
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-green-600">{stats.checkedIn}</div>
                            <p className="text-xs text-gray-500 mt-1">
                                {stats.total > 0 ? Math.round((stats.checkedIn / stats.total) * 100) : 0}% attendance rate
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-2">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-blue-600" />
                                Payments Received
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-blue-600">₵{paymentStats.paidAmount.toFixed(2)}</div>
                            <p className="text-xs text-gray-500 mt-1">
                                {stats.paid} paid, {stats.pending} pending
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-2">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-purple-600" />
                                Pending Revenue
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-purple-600">₵{paymentStats.pendingAmount.toFixed(2)}</div>
                            <p className="text-xs text-gray-500 mt-1">
                                {stats.pending} registrations pending payment
                            </p>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card className="border-2">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                <Clock className="h-4 w-4 text-amber-600" />
                                Follow-up Pending
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-amber-600">{stats.followUpPending}</div>
                            <p className="text-xs text-gray-500 mt-1">
                                {followUpTotal > 0
                                    ? `${Math.round((stats.followUpPending / followUpTotal) * 100)}% of tracked follow-ups`
                                    : 'No follow-up status recorded'}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-2">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                <UserCheck className="h-4 w-4 text-blue-600" />
                                Follow-up In Progress
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-blue-600">{stats.followUpInProgress}</div>
                            <p className="text-xs text-gray-500 mt-1">
                                {stats.followUpUnassigned} without a follow-up status
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-2">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                Follow-up Completed
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-green-600">{stats.followUpCompleted}</div>
                            <p className="text-xs text-gray-500 mt-1">
                                {followUpTotal > 0
                                    ? `${Math.round((stats.followUpCompleted / followUpTotal) * 100)}% completion rate`
                                    : 'No follow-up status recorded'}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-2">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                <Heart className="h-4 w-4 text-rose-600" />
                                Follow-up Coverage
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-rose-600">
                                {stats.total > 0
                                    ? Math.round(
                                          ((stats.followUpPending +
                                              stats.followUpInProgress +
                                              stats.followUpCompleted) /
                                              stats.total) *
                                              100
                                      )
                                    : 0}
                                %
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                Registrants with an assigned follow-up status
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Detailed Analytics */}
                <div className="grid gap-6 lg:grid-cols-2">
                    {/* Role Distribution */}
                    <Card className="border-2">
                        <CardHeader className="bg-gray-50 border-b">
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5 text-blue-600" />
                                Role Distribution
                            </CardTitle>
                            <CardDescription>
                                Breakdown by participant role
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="space-y-4">
                                {Object.entries(byRole)
                                    .sort((a, b) => b[1] - a[1])
                                    .map(([role, count]) => {
                                        const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0
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
                                                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
                                                        style={{ width: `${percentage}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )
                                    })}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Demographics - Gender */}
                    <Card className="border-2">
                        <CardHeader className="bg-gray-50 border-b">
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5 text-green-600" />
                                Gender Distribution
                            </CardTitle>
                            <CardDescription>
                                Breakdown by gender
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="space-y-4">
                                {Object.entries(byGender)
                                    .sort((a, b) => b[1] - a[1])
                                    .map(([gender, count]) => {
                                        const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0
                                        return (
                                            <div key={gender} className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-semibold text-gray-700">{gender}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-bold text-gray-900">{count}</span>
                                                        <Badge variant="outline" className="text-xs">
                                                            {Math.round(percentage)}%
                                                        </Badge>
                                                    </div>
                                                </div>
                                                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full transition-all duration-500"
                                                        style={{ width: `${percentage}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )
                                    })}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Age Distribution */}
                    <Card className="border-2">
                        <CardHeader className="bg-gray-50 border-b">
                            <CardTitle className="flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-purple-600" />
                                Age Distribution
                            </CardTitle>
                            <CardDescription>
                                Breakdown by age bracket
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="space-y-4">
                                {Object.entries(byAgeBracket)
                                    .sort((a, b) => {
                                        const order = ['1-12', '13-19', '20-29', '30-39', '40-49', '50+', 'Unknown']
                                        return order.indexOf(a[0]) - order.indexOf(b[0])
                                    })
                                    .map(([bracket, count]) => {
                                        const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0
                                        return (
                                            <div key={bracket} className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-semibold text-gray-700">{bracket}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-bold text-gray-900">{count}</span>
                                                        <Badge variant="outline" className="text-xs">
                                                            {Math.round(percentage)}%
                                                        </Badge>
                                                    </div>
                                                </div>
                                                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full transition-all duration-500"
                                                        style={{ width: `${percentage}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )
                                    })}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Education Level */}
                    <Card className="border-2">
                        <CardHeader className="bg-gray-50 border-b">
                            <CardTitle className="flex items-center gap-2">
                                <GraduationCap className="h-5 w-5 text-orange-600" />
                                Education Level
                            </CardTitle>
                            <CardDescription>
                                Breakdown by education level
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="space-y-4 max-h-[400px] overflow-y-auto">
                                {Object.entries(byEducation)
                                    .sort((a, b) => b[1] - a[1])
                                    .slice(0, 10)
                                    .map(([edu, count]) => {
                                        const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0
                                        return (
                                            <div key={edu} className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-semibold text-gray-700">{edu}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-bold text-gray-900">{count}</span>
                                                        <Badge variant="outline" className="text-xs">
                                                            {Math.round(percentage)}%
                                                        </Badge>
                                                    </div>
                                                </div>
                                                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-orange-500 to-orange-600 rounded-full transition-all duration-500"
                                                        style={{ width: `${percentage}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )
                                    })}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Registration Trends */}
                    <Card className="border-2 lg:col-span-2">
                        <CardHeader className="bg-gray-50 border-b">
                            <CardTitle className="flex items-center gap-2">
                                <BarChart3 className="h-5 w-5 text-blue-600" />
                                Registration Trends (Last 7 Days)
                            </CardTitle>
                            <CardDescription>
                                Daily registration count over time
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            {recentDates.length > 0 ? (
                                <div className="space-y-4">
                                    {recentDates.map(date => {
                                        const count = byDate[date]
                                        const maxCount = Math.max(...Object.values(byDate))
                                        const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0
                                        return (
                                            <div key={date} className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-semibold text-gray-700">
                                                        {new Date(date).toLocaleDateString('en-US', {
                                                            weekday: 'short',
                                                            month: 'short',
                                                            day: 'numeric'
                                                        })}
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-bold text-gray-900">{count}</span>
                                                        <Badge variant="outline" className="text-xs">
                                                            Registration{count !== 1 ? 's' : ''}
                                                        </Badge>
                                                    </div>
                                                </div>
                                                <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
                                                        style={{ width: `${percentage}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                <p className="text-center text-gray-500 py-8">No registration data available</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Regional Distribution */}
                    {Object.keys(byResidence).length > 0 && (
                        <Card className="border-2 lg:col-span-2">
                            <CardHeader className="bg-gray-50 border-b">
                                <CardTitle className="flex items-center gap-2">
                                    <MapPin className="h-5 w-5 text-red-600" />
                                    Regional Distribution
                                </CardTitle>
                                <CardDescription>
                                    Breakdown by region of residence
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="grid md:grid-cols-2 gap-6">
                                    {Object.entries(byResidence)
                                        .sort((a, b) => b[1] - a[1])
                                        .slice(0, 10)
                                        .map(([region, count]) => {
                                            const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0
                                            return (
                                                <div key={region} className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm font-semibold text-gray-700">{region}</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-bold text-gray-900">{count}</span>
                                                            <Badge variant="outline" className="text-xs">
                                                                {Math.round(percentage)}%
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full transition-all duration-500"
                                                            style={{ width: `${percentage}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            )
                                        })}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                <div className="space-y-3">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Planning insights</h2>
                        <p className="text-sm text-muted-foreground">
                            Imported form fields for medical planning, parent outreach, and returning-camper trends
                        </p>
                    </div>
                    <div className="grid gap-6 lg:grid-cols-2">
                        <BreakdownBars
                            title="NHIS coverage"
                            description="NHIS card responses for on-site medical planning"
                            icon={Shield}
                            iconClassName="text-teal-600"
                            entries={byNhis}
                            total={stats.total}
                            barClassName="bg-gradient-to-r from-teal-500 to-teal-600"
                        />
                        <BreakdownBars
                            title="Health challenges"
                            description="Self-reported health challenge responses"
                            icon={Heart}
                            iconClassName="text-rose-600"
                            entries={byHealth}
                            total={stats.total}
                            barClassName="bg-gradient-to-r from-rose-500 to-rose-600"
                        />
                        <BreakdownBars
                            title="Camp attendance history"
                            description="How many previous camps registrants reported"
                            icon={ClipboardList}
                            iconClassName="text-indigo-600"
                            entries={byTimesAttended}
                            total={stats.total}
                            barClassName="bg-gradient-to-r from-indigo-500 to-indigo-600"
                        />
                        <BreakdownBars
                            title="Parent/guardian contact"
                            description="Coverage for minors and emergency follow-up"
                            icon={Phone}
                            iconClassName="text-amber-600"
                            entries={byParentContact}
                            total={stats.total}
                            barClassName="bg-gradient-to-r from-amber-500 to-amber-600"
                        />
                        {Object.keys(healthChallengeDetails).length > 0 ? (
                            <BreakdownBars
                                title="Reported health conditions"
                                description="Named conditions from imported responses"
                                icon={Heart}
                                iconClassName="text-red-600"
                                entries={healthChallengeDetails}
                                total={stats.total}
                                barClassName="bg-gradient-to-r from-red-500 to-red-600"
                            />
                        ) : null}
                        {Object.keys(bySchoolWork).length > 0 ? (
                            <BreakdownBars
                                title="School / work locations"
                                description="Top reported address, school, or workplace entries"
                                icon={GraduationCap}
                                iconClassName="text-orange-600"
                                entries={Object.fromEntries(
                                    Object.entries(bySchoolWork)
                                        .sort((a, b) => b[1] - a[1])
                                        .slice(0, 12)
                                )}
                                total={stats.total}
                                barClassName="bg-gradient-to-r from-orange-500 to-orange-600"
                            />
                        ) : null}
                    </div>
                </div>

                {/* Payment Status Breakdown */}
                <Card className="border-2">
                    <CardHeader className="bg-gray-50 border-b">
                        <CardTitle className="flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-green-600" />
                            Payment Status Breakdown
                        </CardTitle>
                        <CardDescription>
                            Payment analytics and revenue tracking
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="grid md:grid-cols-4 gap-6">
                            <div className="text-center p-4 bg-green-50 rounded-lg border-2 border-green-200">
                                <div className="text-2xl font-bold text-green-600">₵{paymentStats.paidAmount.toFixed(2)}</div>
                                <div className="text-sm text-gray-600 mt-1">Paid</div>
                                <Badge variant="default" className="mt-2">{stats.paid} registrations</Badge>
                            </div>
                            <div className="text-center p-4 bg-yellow-50 rounded-lg border-2 border-yellow-200">
                                <div className="text-2xl font-bold text-yellow-600">₵{paymentStats.pendingAmount.toFixed(2)}</div>
                                <div className="text-sm text-gray-600 mt-1">Pending</div>
                                <Badge variant="outline" className="mt-2">{stats.pending} registrations</Badge>
                            </div>
                            <div className="text-center p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                                <div className="text-2xl font-bold text-blue-600">₵{paymentStats.totalAmount.toFixed(2)}</div>
                                <div className="text-sm text-gray-600 mt-1">Total Expected</div>
                                <Badge variant="outline" className="mt-2">{stats.total} registrations</Badge>
                            </div>
                            <div className="text-center p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
                                <div className="text-2xl font-bold text-purple-600">
                                    {stats.total > 0 ? Math.round((paymentStats.paidAmount / paymentStats.totalAmount) * 100) : 0}%
                                </div>
                                <div className="text-sm text-gray-600 mt-1">Collection Rate</div>
                                <Badge variant="outline" className="mt-2">Payment Progress</Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

export default function CampAnalyticsPage() {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-[40vh] items-center justify-center">
                    <LoadingSpinner />
                </div>
            }
        >
            <CampAnalyticsContent />
        </Suspense>
    )
}
