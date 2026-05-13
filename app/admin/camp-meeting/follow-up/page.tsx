'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { campService } from '@/lib/services/camp-service'
import { getActiveCampYear, getCampYearById } from '@/lib/actions/camp'
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
    ArrowLeft, Users, UserCheck, UserX, Clock, CheckCircle2,
    AlertCircle, Filter, UserPlus, Eye, MessageSquare, Phone, Mail
} from 'lucide-react'
import { cn } from '@/lib/utils'

const FOLLOW_UP_STATUSES = ['pending', 'in_progress', 'completed'] as const

function FollowUpManagementContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { toast } = useToast()
    const { user } = useAuth()
    const mineOnly = searchParams.get('mine') === '1'
    const yearIdParam = searchParams.get('year')
    const [campYear, setCampYear] = useState<CampYear | null>(null)
    const [registrations, setRegistrations] = useState<CampRegistration[]>([])
    const [staffMembers, setStaffMembers] = useState<AppUser[]>([])
    const [loading, setLoading] = useState(true)

    // Filters
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all')
    const [assignedToFilter, setAssignedToFilter] = useState<string>('all')
    const [typeFilter, setTypeFilter] = useState<'all' | 'new' | 'returning'>('all')

    useEffect(() => {
        if (mineOnly && user?.id) {
            setAssignedToFilter(user.id)
        }
    }, [mineOnly, user?.id])

    useEffect(() => {
        loadData()
        loadStaffMembers()
    }, [yearIdParam])

    async function loadData() {
        setLoading(true)
        const { data: year } = yearIdParam
            ? await getCampYearById(yearIdParam)
            : await getActiveCampYear()
        if (year) {
            setCampYear(year)
            const { data } = await campService.getCampRegistrations(year.id)
            if (data) setRegistrations(data)
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
        const matchesStatus = statusFilter === 'all' || reg.follow_up_status === statusFilter
        const matchesAssigned = assignedToFilter === 'all' || 
            (assignedToFilter === 'unassigned' && !reg.assigned_to) ||
            reg.assigned_to === assignedToFilter
        const matchesType = typeFilter === 'all' ||
            (typeFilter === 'new' && reg.is_new_registrant) ||
            (typeFilter === 'returning' && !reg.is_new_registrant)

        return matchesStatus && matchesAssigned && matchesType
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
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push('/admin/camp-meeting')}
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back
                        </Button>
                        <div>
                            <h1 className="text-4xl font-bold tracking-tight text-gray-900">
                                {mineOnly ? 'My follow-ups' : 'Follow-up Management'}
                            </h1>
                            <p className="text-muted-foreground mt-1">
                                Camp Meeting {campYear.year} • {campYear.theme}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid gap-4 md:grid-cols-5">
                    <Card className="border-2">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold text-gray-700">
                                Total
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
                        </CardContent>
                    </Card>
                    <Card className="border-2">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                <Clock className="h-4 w-4 text-yellow-600" />
                                Pending
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-yellow-600">{stats.pending}</div>
                        </CardContent>
                    </Card>
                    <Card className="border-2">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 text-blue-600" />
                                In Progress
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-blue-600">{stats.inProgress}</div>
                        </CardContent>
                    </Card>
                    <Card className="border-2">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                Completed
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-green-600">{stats.completed}</div>
                        </CardContent>
                    </Card>
                    <Card className="border-2">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                <UserX className="h-4 w-4 text-red-600" />
                                Unassigned
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-red-600">{stats.unassigned}</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters */}
                <Card className="border-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Filter className="h-5 w-5" />
                            Filters
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-3">
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
                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Pending */}
                    <Card className="border-2">
                        <CardHeader className="bg-yellow-50 border-b">
                            <CardTitle className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Clock className="h-5 w-5 text-yellow-600" />
                                    Pending ({byStatus.pending.length})
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="space-y-3 max-h-[600px] overflow-y-auto">
                                {byStatus.pending.length === 0 ? (
                                    <p className="text-center text-gray-500 text-sm py-8">
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
                        <CardHeader className="bg-blue-50 border-b">
                            <CardTitle className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <AlertCircle className="h-5 w-5 text-blue-600" />
                                    In Progress ({byStatus.in_progress.length})
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="space-y-3 max-h-[600px] overflow-y-auto">
                                {byStatus.in_progress.length === 0 ? (
                                    <p className="text-center text-gray-500 text-sm py-8">
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
                        <CardHeader className="bg-green-50 border-b">
                            <CardTitle className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                                    Completed ({byStatus.completed.length})
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="space-y-3 max-h-[600px] overflow-y-auto">
                                {byStatus.completed.length === 0 ? (
                                    <p className="text-center text-gray-500 text-sm py-8">
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
    const fullName = registration.full_name || `${registration.first_name} ${registration.last_name}`.trim()

    return (
        <div className="p-4 bg-white border-2 rounded-lg hover:shadow-md transition-shadow cursor-pointer" onClick={onView}>
            <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                    <p className="font-semibold text-sm text-gray-900 truncate">{fullName}</p>
                    <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">{registration.role}</Badge>
                        {registration.is_new_registrant && (
                            <Badge variant="secondary" className="text-xs">New</Badge>
                        )}
                    </div>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); onView() }}
                >
                    <Eye className="h-4 w-4" />
                </Button>
            </div>

            <div className="space-y-2 mt-3 pt-3 border-t">
                {registration.assigned_user ? (
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <UserCheck className="h-3 w-3 text-blue-600" />
                            <span className="text-xs text-gray-600">{registration.assigned_user.full_name}</span>
                        </div>
                        <Select
                            value={registration.assigned_to || '__unassign__'}
                            onValueChange={(v) => onAssign(
                                registration.id,
                                v === '__unassign__' ? null : v
                            )}
                        >
                            <SelectTrigger className="h-7 text-xs" onClick={(e) => e.stopPropagation()}>
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
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <UserX className="h-3 w-3 text-red-600" />
                            <span className="text-xs text-gray-600">Unassigned</span>
                        </div>
                        <Select
                            value=""
                            onValueChange={(v) => onAssign(registration.id, v || null)}
                        >
                            <SelectTrigger className="h-7 text-xs" onClick={(e) => e.stopPropagation()}>
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
                    <SelectTrigger className="h-7 text-xs w-full" onClick={(e) => e.stopPropagation()}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                </Select>

                {registration.phone && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-2">
                        <Phone className="h-3 w-3" />
                        <span>{registration.phone}</span>
                    </div>
                )}
            </div>
        </div>
    )
}
