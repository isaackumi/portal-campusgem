'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { campService } from '@/lib/services/camp-service'
import { getActiveCampYear, getAllCampYears, getCampYearById } from '@/lib/actions/camp'
import { dataService } from '@/lib/services/data-service'
import { CampRegistration, CampYear, AppUser } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LoadingSpinner } from '@/components/ui/loading'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/components/providers'
import {
    Users, UserCheck, UserX, Clock, CheckCircle2,
    AlertCircle, Filter, UserPlus, Eye, MessageSquare, Phone, Mail, BedDouble
} from 'lucide-react'
import Link from 'next/link'
import { classifyFollowUpSla, type FollowUpSlaBucket } from '@/lib/camp/follow-up-sla'
import { cn } from '@/lib/utils'
import { CampAdminPageHeader } from '@/components/camp/camp-admin-page-header'
import { PhoneLink, QuickContactButtons } from '@/components/contact/phone-link'
import { useCampFollowUpMessage } from '@/components/camp/use-camp-follow-up-message'

const FOLLOW_UP_STATUSES = ['pending', 'in_progress', 'completed'] as const
const SLA_FILTERS = ['all', 'overdue', 'due_soon', 'healthy'] as const
type SlaFilter = (typeof SLA_FILTERS)[number]

function FollowUpManagementContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { toast } = useToast()
    const { user } = useAuth()
    const mineOnly = searchParams.get('mine') === '1'
    const yearIdParam = searchParams.get('year')
    const statusParam = searchParams.get('status')
    const slaParam = searchParams.get('sla')
    const [campYear, setCampYear] = useState<CampYear | null>(null)
    const [activeYear, setActiveYear] = useState<CampYear | null>(null)
    const [availableYears, setAvailableYears] = useState<CampYear[]>([])
    const [registrations, setRegistrations] = useState<CampRegistration[]>([])
    const [staffMembers, setStaffMembers] = useState<AppUser[]>([])
    const [loading, setLoading] = useState(true)

    // Filters
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all')
    const [slaFilter, setSlaFilter] = useState<SlaFilter>('all')
    const [assignedToFilter, setAssignedToFilter] = useState<string>('all')
    const [typeFilter, setTypeFilter] = useState<'all' | 'new' | 'returning'>('all')

    useEffect(() => {
        if (mineOnly && user?.id) {
            setAssignedToFilter(user.id)
        }
    }, [mineOnly, user?.id])

    useEffect(() => {
        if (statusParam && FOLLOW_UP_STATUSES.includes(statusParam as (typeof FOLLOW_UP_STATUSES)[number])) {
            setStatusFilter(statusParam as (typeof FOLLOW_UP_STATUSES)[number])
        }
    }, [statusParam])

    useEffect(() => {
        if (slaParam && SLA_FILTERS.includes(slaParam as SlaFilter)) {
            setSlaFilter(slaParam as SlaFilter)
        }
    }, [slaParam])

    useEffect(() => {
        loadData()
        loadStaffMembers()
    }, [yearIdParam])

    async function loadData() {
        setLoading(true)
        const [{ data: years }, { data: active }] = await Promise.all([
            getAllCampYears(),
            getActiveCampYear(),
        ])
        const sorted = [...(years ?? [])].sort((a, b) => b.year - a.year)
        setAvailableYears(sorted)
        setActiveYear(active ?? null)

        const { data: year } = yearIdParam
            ? await getCampYearById(yearIdParam)
            : { data: active ?? sorted.find((y) => y.is_active) ?? sorted[0] ?? null }
        if (year) {
            setCampYear(year)
            const { data } = await campService.getCampRegistrations(year.id)
            if (data) setRegistrations(data)
            else setRegistrations([])
        } else {
            setCampYear(null)
            setRegistrations([])
        }
        setLoading(false)
    }

    async function loadStaffMembers() {
        const { data } = await dataService.getAllUsers()
        const staff = (data ?? []).filter(u => ['admin', 'pastor', 'elder', 'finance_officer'].includes(u.role))
        setStaffMembers(staff)
    }

    const handleAssignStaff = async (registrationId: string, staffId: string | null) => {
        try {
            const res = await campService.updateRegistration(registrationId, { assigned_to: staffId ?? undefined })
            if (res.error) throw new Error(res.error)
            toast({
                title: 'Success',
                description: staffId ? 'Staff member assigned' : 'Assignment removed'
            })
            loadData()
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.message || 'Failed to update assignment'
            })
        }
    }

    const handleUpdateStatus = async (registrationId: string, status: typeof FOLLOW_UP_STATUSES[number]) => {
        try {
            const res = await campService.updateRegistration(registrationId, { follow_up_status: status })
            if (res.error) throw new Error(res.error)
            toast({
                title: 'Success',
                description: `Follow-up status updated to ${status.replace('_', ' ')}`
            })
            loadData()
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.message || 'Failed to update status'
            })
        }
    }

    // Filter registrations
    const filteredRegistrations = registrations.filter(reg => {
        const effectiveStatus = reg.follow_up_status ?? 'pending'
        const matchesStatus =
            statusFilter === 'all' ||
            effectiveStatus === statusFilter ||
            (statusFilter === 'pending' && !reg.follow_up_status)
        const matchesSla =
            slaFilter === 'all' ||
            classifyFollowUpSla(reg) === (slaFilter as FollowUpSlaBucket)
        const matchesAssigned = assignedToFilter === 'all' || 
            (assignedToFilter === 'unassigned' && !reg.assigned_to) ||
            reg.assigned_to === assignedToFilter
        const matchesType = typeFilter === 'all' ||
            (typeFilter === 'new' && reg.is_new_registrant) ||
            (typeFilter === 'returning' && !reg.is_new_registrant)

        return matchesStatus && matchesSla && matchesAssigned && matchesType
    })

    // Group by status
    const byStatus = {
        pending: filteredRegistrations.filter(r => r.follow_up_status === 'pending' || !r.follow_up_status),
        in_progress: filteredRegistrations.filter(r => r.follow_up_status === 'in_progress'),
        completed: filteredRegistrations.filter(r => r.follow_up_status === 'completed'),
    }

    // Group by assigned staff
    const byStaff = filteredRegistrations.reduce((acc, reg) => {
        const key = reg.assigned_to || 'unassigned'
        if (!acc[key]) acc[key] = []
        acc[key].push(reg)
        return acc
    }, {} as Record<string, CampRegistration[]>)

    const stats = {
        total: filteredRegistrations.length,
        pending: byStatus.pending.length,
        inProgress: byStatus.in_progress.length,
        completed: byStatus.completed.length,
        unassigned: filteredRegistrations.filter(r => !r.assigned_to).length,
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <LoadingSpinner />
            </div>
        )
    }

    if (!campYear) {
        return (
            <div className="mx-auto max-w-4xl">
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
        <div>
            <div className="mx-auto max-w-7xl space-y-4 sm:space-y-6">
                <CampAdminPageHeader
                    title={mineOnly ? 'My follow-ups' : 'Follow-up Management'}
                    campYear={campYear}
                    actions={
                        campYear ? (
                            <Button variant="outline" asChild>
                                <Link href={`/admin/camp-meeting/rooms?year=${campYear.id}`}>
                                    <BedDouble className="mr-2 h-4 w-4" />
                                    Rooms
                                </Link>
                            </Button>
                        ) : null
                    }
                >
                    {campYear?.is_active || campYear?.id === activeYear?.id ? (
                        <Badge variant="success">Active year</Badge>
                    ) : campYear ? (
                        <Badge variant="secondary">Historical year</Badge>
                    ) : null}
                    {slaFilter !== 'all' ? (
                        <Badge variant="secondary" className="capitalize">
                            SLA: {slaFilter.replace('_', ' ')}
                        </Badge>
                    ) : null}
                    {statusFilter !== 'all' ? (
                        <Badge variant="outline" className="capitalize">
                            Status: {statusFilter.replace('_', ' ')}
                        </Badge>
                    ) : null}
                </CampAdminPageHeader>

                {availableYears.length > 0 ? (
                    <Card>
                        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">Camp year for assignments</p>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                    Follow-up owners are assigned only for registrations in the selected season.
                                </p>
                            </div>
                            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                                <Select
                                    value={campYear?.id}
                                    onValueChange={(yearId) => {
                                        const params = new URLSearchParams(searchParams.toString())
                                        params.set('year', yearId)
                                        router.push(`/admin/camp-meeting/follow-up?${params.toString()}`)
                                    }}
                                >
                                    <SelectTrigger className="min-h-11 flex-1 sm:min-h-10 sm:w-[11rem] sm:flex-none">
                                        <SelectValue placeholder="Select year" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableYears.map((year) => (
                                            <SelectItem key={year.id} value={year.id}>
                                                {year.year}
                                                {year.is_active || year.id === activeYear?.id ? ' (active)' : ''}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {campYear && activeYear && campYear.id !== activeYear.id ? (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="min-h-11 flex-1 sm:min-h-10 sm:flex-none"
                                        onClick={() => {
                                            const params = new URLSearchParams(searchParams.toString())
                                            params.set('year', activeYear.id)
                                            router.push(`/admin/camp-meeting/follow-up?${params.toString()}`)
                                        }}
                                    >
                                        Jump to active
                                    </Button>
                                ) : null}
                            </div>
                        </CardContent>
                    </Card>
                ) : null}

                {/* Stats Cards */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-5">
                    {([
                        { label: 'Total', value: stats.total, icon: Users, tone: 'text-neutral-500 dark:text-neutral-400' },
                        { label: 'Pending', value: stats.pending, icon: Clock, tone: 'text-amber-600 dark:text-amber-400' },
                        { label: 'In progress', value: stats.inProgress, icon: AlertCircle, tone: 'text-brand-600 dark:text-brand-300' },
                        { label: 'Completed', value: stats.completed, icon: CheckCircle2, tone: 'text-emerald-600 dark:text-emerald-400' },
                        { label: 'Unassigned', value: stats.unassigned, icon: UserX, tone: 'text-red-600 dark:text-red-400' },
                    ] as const).map(({ label, value, icon: Icon, tone }, i) => (
                        <div
                            key={label}
                            className={cn('dashboard-panel p-3 sm:p-5', i === 4 && 'col-span-2 md:col-span-1')}
                        >
                            <p className="app-stat-label flex items-center gap-1.5">
                                <Icon className={cn('h-3.5 w-3.5', tone)} aria-hidden />
                                {label}
                            </p>
                            <p className="app-stat-value mt-1">{value}</p>
                        </div>
                    ))}
                </div>

                {/* Filters */}
                <Card>
                    <CardHeader className="p-4 pb-2 sm:p-6 sm:pb-2">
                        <CardTitle className="app-section-title flex items-center gap-2">
                            <Filter className="h-4 w-4" aria-hidden />
                            Filters
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-2 sm:p-6 sm:pt-2">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 [&_button[role=combobox]]:min-h-11 sm:[&_button[role=combobox]]:min-h-10">
                            <Select value={slaFilter} onValueChange={(v: SlaFilter) => setSlaFilter(v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="SLA health" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All SLA buckets</SelectItem>
                                    <SelectItem value="overdue">Overdue</SelectItem>
                                    <SelectItem value="due_soon">Due soon</SelectItem>
                                    <SelectItem value="healthy">Healthy</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Follow-up Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="in_progress">In Progress</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={assignedToFilter} onValueChange={setAssignedToFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Assigned To" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Assignments</SelectItem>
                                    <SelectItem value="unassigned">Unassigned</SelectItem>
                                    {staffMembers.map(staff => (
                                        <SelectItem key={staff.id} value={staff.id}>
                                            {staff.full_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={typeFilter} onValueChange={(v: any) => setTypeFilter(v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Types</SelectItem>
                                    <SelectItem value="new">New Registrants</SelectItem>
                                    <SelectItem value="returning">Returning</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {/* Follow-up Queue */}
                <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
                    {/* Pending */}
                    <Card className="border-2">
                        <CardHeader className="border-b border-neutral-200/80 bg-amber-50 p-4 dark:border-white/[0.06] dark:bg-amber-400/10">
                            <CardTitle className="app-section-title flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" aria-hidden />
                                    Pending ({byStatus.pending.length})
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 sm:p-4">
                            <div className="space-y-3 lg:max-h-[600px] lg:overflow-y-auto">
                                {byStatus.pending.length === 0 ? (
                                    <p className="py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
                                        No pending follow-ups
                                    </p>
                                ) : (
                                    byStatus.pending.map(reg => (
                                        <RegistrationCard
                                            key={reg.id}
                                            registration={reg}
                                            staffMembers={staffMembers}
                                            onAssign={handleAssignStaff}
                                            onUpdateStatus={handleUpdateStatus}
                                            onView={() => router.push(`/admin/camp-meeting/registrations/${reg.id}`)}
                                        />
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* In Progress */}
                    <Card className="border-2">
                        <CardHeader className="border-b border-neutral-200/80 bg-neutral-50 p-4 dark:border-white/[0.06] dark:bg-white/[0.03]">
                            <CardTitle className="app-section-title flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <AlertCircle className="h-5 w-5 text-brand-600 dark:text-brand-300" aria-hidden />
                                    In Progress ({byStatus.in_progress.length})
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 sm:p-4">
                            <div className="space-y-3 lg:max-h-[600px] lg:overflow-y-auto">
                                {byStatus.in_progress.length === 0 ? (
                                    <p className="py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
                                        No in-progress follow-ups
                                    </p>
                                ) : (
                                    byStatus.in_progress.map(reg => (
                                        <RegistrationCard
                                            key={reg.id}
                                            registration={reg}
                                            staffMembers={staffMembers}
                                            onAssign={handleAssignStaff}
                                            onUpdateStatus={handleUpdateStatus}
                                            onView={() => router.push(`/admin/camp-meeting/registrations/${reg.id}`)}
                                        />
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Completed */}
                    <Card className="border-2">
                        <CardHeader className="border-b border-neutral-200/80 bg-emerald-50 p-4 dark:border-white/[0.06] dark:bg-emerald-400/10">
                            <CardTitle className="app-section-title flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden />
                                    Completed ({byStatus.completed.length})
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 sm:p-4">
                            <div className="space-y-3 lg:max-h-[600px] lg:overflow-y-auto">
                                {byStatus.completed.length === 0 ? (
                                    <p className="py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
                                        No completed follow-ups
                                    </p>
                                ) : (
                                    byStatus.completed.map(reg => (
                                        <RegistrationCard
                                            key={reg.id}
                                            registration={reg}
                                            staffMembers={staffMembers}
                                            onAssign={handleAssignStaff}
                                            onUpdateStatus={handleUpdateStatus}
                                            onView={() => router.push(`/admin/camp-meeting/registrations/${reg.id}`)}
                                        />
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}

export default function FollowUpManagementPage() {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-[40vh] items-center justify-center">
                    <LoadingSpinner />
                </div>
            }
        >
            <FollowUpManagementContent />
        </Suspense>
    )
}

interface RegistrationCardProps {
    registration: CampRegistration
    staffMembers: AppUser[]
    onAssign: (registrationId: string, staffId: string | null) => void
    onUpdateStatus: (registrationId: string, status: 'pending' | 'in_progress' | 'completed') => void
    onView: () => void
}

function RegistrationCard({
    registration,
    staffMembers,
    onAssign,
    onUpdateStatus,
    onView
}: RegistrationCardProps) {
  const followUpMessage = useCampFollowUpMessage()
    const fullName = registration.full_name || `${registration.first_name} ${registration.last_name}`.trim()

    return (
        <div
            className="cursor-pointer rounded-lg border border-neutral-200/80 bg-white p-3 transition-shadow hover:shadow-md dark:border-white/[0.06] dark:bg-neutral-800/60 sm:p-4"
            onClick={onView}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{fullName}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <Badge variant="outline" className="text-xs capitalize">{registration.role}</Badge>
                        {registration.is_new_registrant && (
                            <Badge variant="secondary" className="text-xs">New</Badge>
                        )}
                    </div>
                    {registration.phone ? (
                        <div className="mt-1.5 text-xs text-neutral-600 dark:text-neutral-300">
                            <PhoneLink phone={registration.phone} whatsapp={registration.whatsapp} name={fullName} message={followUpMessage(registration)} />
                        </div>
                    ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                    <QuickContactButtons phone={registration.phone} whatsapp={registration.whatsapp} name={fullName} message={followUpMessage(registration)} />
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 sm:h-9 sm:w-9"
                        aria-label={`View ${fullName}`}
                        onClick={(e) => { e.stopPropagation(); onView() }}
                    >
                        <Eye className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <div className="mt-3 space-y-2 border-t border-neutral-200/80 pt-3 dark:border-white/[0.06]">
                {registration.assigned_user ? (
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                            <UserCheck className="h-3 w-3 shrink-0 text-brand-600 dark:text-brand-300" />
                            <span className="truncate text-xs text-neutral-600 dark:text-neutral-300">{registration.assigned_user.full_name}</span>
                        </div>
                        <Select
                            value={registration.assigned_to || '__unassign__'}
                            onValueChange={(v) => onAssign(
                                registration.id,
                                v === '__unassign__' ? null : v
                            )}
                        >
                            <SelectTrigger className="h-10 w-[9.5rem] text-xs sm:h-8" onClick={(e) => e.stopPropagation()}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__unassign__">Unassign</SelectItem>
                                {staffMembers.map(staff => (
                                    <SelectItem key={staff.id} value={staff.id}>
                                        {staff.full_name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                ) : (
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <UserX className="h-3 w-3 text-red-600 dark:text-red-400" />
                            <span className="text-xs text-neutral-600 dark:text-neutral-300">Unassigned</span>
                        </div>
                        <Select onValueChange={(v) => onAssign(registration.id, v || null)}>
                            <SelectTrigger className="h-10 w-[9.5rem] text-xs sm:h-8" onClick={(e) => e.stopPropagation()}>
                                <SelectValue placeholder="Assign" />
                            </SelectTrigger>
                            <SelectContent>
                                {staffMembers.map(staff => (
                                    <SelectItem key={staff.id} value={staff.id}>
                                        {staff.full_name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                <Select
                    value={registration.follow_up_status || 'pending'}
                    onValueChange={(v: any) => onUpdateStatus(registration.id, v)}
                >
                    <SelectTrigger className="h-10 w-full text-xs sm:h-8" onClick={(e) => e.stopPropagation()}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                </Select>

            </div>
        </div>
    )
}
