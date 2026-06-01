'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CampRegistration, CampYear } from '@/lib/types'
import { campRegistrationsToGoogleFormCsv } from '@/lib/camp/google-form-import'
import { useCampRegistrations } from '@/lib/hooks/use-camp'
import { useAuth } from '@/components/providers'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { LoadingSpinner } from '@/components/ui/loading'
import { 
    Download, 
    Search, 
    Filter, 
    ArrowLeft,
    ArrowUpDown,
    ChevronUp,
    ChevronDown,
    Eye,
    Edit,
    CheckCircle2,
    XCircle,
    FileText,
    Users,
    Calendar,
    Phone,
    Mail,
    QrCode,
    Printer
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { CampAdminPageHeader } from '@/components/camp/camp-admin-page-header'

type SortField = 'full_name' | 'email' | 'phone' | 'role' | 'status' | 'payment_status' | 'created_at' | 'is_new_registrant'
type SortDirection = 'asc' | 'desc'

const ITEMS_PER_PAGE = 25

function RegistrationsPageContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const campYearId = searchParams.get('year')
    const { toast } = useToast()
    const { user, loading: authLoading } = useAuth()
    const { registrations, campYear, loading, error, refresh } = useCampRegistrations(campYearId)
    const [currentPage, setCurrentPage] = useState(1)
    
    // Filters
    const [search, setSearch] = useState('')
    const [roleFilter, setRoleFilter] = useState('all')
    const [statusFilter, setStatusFilter] = useState('all')
    const [paymentFilter, setPaymentFilter] = useState('all')
    const [typeFilter, setTypeFilter] = useState('all')
    
    // Sorting
    const [sortField, setSortField] = useState<SortField>('created_at')
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
    
    // Selection
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

    // Redirect to auth if not logged in
    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/auth?redirect=' + encodeURIComponent('/admin/camp-meeting/registrations'))
        }
    }, [user, authLoading, router])

    // Show loading or redirect if not authenticated
    if (authLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <LoadingSpinner />
            </div>
        )
    }

    if (!user) {
        return null // Will redirect via useEffect
    }

    // Filter registrations
    const filtered = registrations.filter(reg => {
        const matchesSearch = !search || 
            reg.full_name?.toLowerCase().includes(search.toLowerCase()) ||
            reg.email?.toLowerCase().includes(search.toLowerCase()) ||
            reg.phone?.toLowerCase().includes(search.toLowerCase()) ||
            reg.parent_contact?.toLowerCase().includes(search.toLowerCase()) ||
            reg.parent_name?.toLowerCase().includes(search.toLowerCase()) ||
            reg.qr_code?.toLowerCase().includes(search.toLowerCase()) ||
            `${reg.first_name} ${reg.last_name}`.toLowerCase().includes(search.toLowerCase())

        const matchesRole = roleFilter === 'all' || reg.role === roleFilter
        const matchesStatus = statusFilter === 'all' || reg.status === statusFilter
        const matchesPayment = paymentFilter === 'all' || reg.payment_status === paymentFilter
        const matchesType = typeFilter === 'all' || 
            (typeFilter === 'new' && reg.is_new_registrant) ||
            (typeFilter === 'returning' && !reg.is_new_registrant)

        return matchesSearch && matchesRole && matchesStatus && matchesPayment && matchesType
    })

    // Sort registrations
    const sorted = [...filtered].sort((a, b) => {
        let aValue: any, bValue: any

        switch (sortField) {
            case 'full_name':
                aValue = (a.full_name || `${a.first_name} ${a.last_name}`).toLowerCase()
                bValue = (b.full_name || `${b.first_name} ${b.last_name}`).toLowerCase()
                break
            case 'email':
                aValue = (a.email || '').toLowerCase()
                bValue = (b.email || '').toLowerCase()
                break
            case 'phone':
                aValue = (a.phone || '').toLowerCase()
                bValue = (b.phone || '').toLowerCase()
                break
            case 'role':
                aValue = a.role || ''
                bValue = b.role || ''
                break
            case 'status':
                aValue = a.status
                bValue = b.status
                break
            case 'payment_status':
                aValue = a.payment_status || 'pending'
                bValue = b.payment_status || 'pending'
                break
            case 'created_at':
                aValue = new Date(a.created_at).getTime()
                bValue = new Date(b.created_at).getTime()
                break
            case 'is_new_registrant':
                aValue = a.is_new_registrant ? 1 : 0
                bValue = b.is_new_registrant ? 1 : 0
                break
            default:
                return 0
        }

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
        return 0
    })

    // Paginate
    const totalPages = Math.ceil(sorted.length / ITEMS_PER_PAGE)
    const paginated = sorted.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    )

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
        } else {
            setSortField(field)
            setSortDirection('asc')
        }
        setCurrentPage(1)
    }

    const getSortIcon = (field: SortField) => {
        if (sortField !== field) {
            return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />
        }
        return sortDirection === 'asc' 
            ? <ChevronUp className="h-4 w-4 ml-1" />
            : <ChevronDown className="h-4 w-4 ml-1" />
    }

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(new Set(paginated.map(r => r.id)))
        } else {
            setSelectedIds(new Set())
        }
    }

    const handleSelectOne = (id: string, checked: boolean) => {
        const newSelected = new Set(selectedIds)
        if (checked) {
            newSelected.add(id)
        } else {
            newSelected.delete(id)
        }
        setSelectedIds(newSelected)
    }

    const exportToCSV = () => {
        const csvContent = campRegistrationsToGoogleFormCsv(filtered)

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `camp-registrations-${campYear?.year || new Date().getFullYear()}-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        window.URL.revokeObjectURL(url)
        
        toast({
            title: 'Export Complete',
            description: `${filtered.length} registrations exported to CSV`,
        })
    }

    const printQRCodes = () => {
        // Get registrations to print (selected ones or all filtered)
        const registrationsToPrint = selectedIds.size > 0
            ? filtered.filter(reg => selectedIds.has(reg.id))
            : filtered

        if (registrationsToPrint.length === 0) {
            toast({
                variant: 'destructive',
                title: 'No Registrations',
                description: 'Please select registrations or ensure there are registrations to print',
            })
            return
        }

        // Parse QR code data - use the full QR code JSON string for scanning
        const getQRValue = (qrCode: string | null | undefined): string => {
            if (!qrCode) return ''
            // Return the full QR code string (JSON) as it's stored in the database
            return qrCode
        }

        // Navigate to print page with registration IDs
        const ids = registrationsToPrint.map(reg => reg.id).join(',')
        const printUrl = `/admin/camp-meeting/registrations/print?ids=${ids}`
        window.open(printUrl, '_blank')

        toast({
            title: 'Opening Print Page',
            description: `Preparing ${registrationsToPrint.length} QR code(s) for printing`,
        })
    }

    const handleBulkStatusUpdate = async (newStatus: 'registered' | 'checked_in' | 'cancelled') => {
        if (selectedIds.size === 0) {
            toast({
                variant: 'destructive',
                title: 'No Selection',
                description: 'Please select registrations to update',
            })
            return
        }

        try {
            // Import campService dynamically to avoid client-side RLS issues
            const { campService } = await import('@/lib/services/camp-service')
            const updates = Array.from(selectedIds).map(id => 
                campService.updateRegistration(id, { status: newStatus })
            )
            await Promise.all(updates)
            
            // Refresh data using the hook
            await refresh()
            
            setSelectedIds(new Set())
            toast({
                title: 'Success',
                description: `Updated ${selectedIds.size} registration(s) to ${newStatus}`,
            })
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.message || 'Failed to update registrations',
            })
        }
    }

    const uniqueRoles = Array.from(new Set(registrations.map(r => r.role).filter(Boolean)))
    const stats = {
        total: registrations.length,
        checkedIn: registrations.filter(r => r.status === 'checked_in').length,
        newRegistrants: registrations.filter(r => r.is_new_registrant).length,
        paid: registrations.filter(r => r.payment_status === 'paid').length,
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <LoadingSpinner />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="max-w-7xl mx-auto p-6 space-y-6">
                <CampAdminPageHeader
                    title="Camp Registrations"
                    campYear={campYear}
                    actions={
                        <>
                            <Button onClick={printQRCodes} variant="outline" className="shadow-sm">
                                <Printer className="mr-2 h-4 w-4" />
                                Print QR Codes
                            </Button>
                            <Button onClick={exportToCSV} variant="outline" className="shadow-sm">
                                <Download className="mr-2 h-4 w-4" />
                                Export CSV
                            </Button>
                        </>
                    }
                />

                {/* Stats Cards */}
                <div className="grid gap-4 md:grid-cols-4">
                    <Card className="border-2">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold text-gray-700">
                                Total Registrations
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
                        </CardContent>
                    </Card>
                    <Card className="border-2">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold text-gray-700">
                                Checked In
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-green-600">{stats.checkedIn}</div>
                            <p className="text-xs text-gray-500 mt-1">
                                {stats.total > 0 ? Math.round((stats.checkedIn / stats.total) * 100) : 0}% of total
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="border-2">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold text-gray-700">
                                New Registrants
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-blue-600">{stats.newRegistrants}</div>
                            <p className="text-xs text-gray-500 mt-1">
                                {stats.total > 0 ? Math.round((stats.newRegistrants / stats.total) * 100) : 0}% of total
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="border-2">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold text-gray-700">
                                Paid
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-purple-600">{stats.paid}</div>
                            <p className="text-xs text-gray-500 mt-1">
                                {stats.total > 0 ? Math.round((stats.paid / stats.total) * 100) : 0}% of total
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters and Bulk Actions */}
                <Card className="border-2">
                    <CardHeader>
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search name, email, phone, QR code..."
                                    className="pl-8"
                                    value={search}
                                    onChange={e => {
                                        setSearch(e.target.value)
                                        setCurrentPage(1)
                                    }}
                                />
                            </div>
                            <div className="flex gap-2 flex-wrap">
                                <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setCurrentPage(1) }}>
                                    <SelectTrigger className="w-[140px]">
                                        <SelectValue placeholder="Role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Roles</SelectItem>
                                        {uniqueRoles.map(r => (
                                            <SelectItem key={r} value={r}>{r}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1) }}>
                                    <SelectTrigger className="w-[140px]">
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Status</SelectItem>
                                        <SelectItem value="registered">Registered</SelectItem>
                                        <SelectItem value="checked_in">Checked In</SelectItem>
                                        <SelectItem value="cancelled">Cancelled</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Select value={paymentFilter} onValueChange={(v) => { setPaymentFilter(v); setCurrentPage(1) }}>
                                    <SelectTrigger className="w-[140px]">
                                        <SelectValue placeholder="Payment" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Payments</SelectItem>
                                        <SelectItem value="pending">Pending</SelectItem>
                                        <SelectItem value="paid">Paid</SelectItem>
                                        <SelectItem value="confirmed">Confirmed</SelectItem>
                                        <SelectItem value="refunded">Refunded</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setCurrentPage(1) }}>
                                    <SelectTrigger className="w-[140px]">
                                        <SelectValue placeholder="Type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Types</SelectItem>
                                        <SelectItem value="new">New</SelectItem>
                                        <SelectItem value="returning">Returning</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        
                        {selectedIds.size > 0 && (
                            <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                                <span className="text-sm font-medium text-gray-700">
                                    {selectedIds.size} selected
                                </span>
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleBulkStatusUpdate('checked_in')}
                                    >
                                        <CheckCircle2 className="h-4 w-4 mr-1" />
                                        Mark Checked In
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setSelectedIds(new Set())}
                                    >
                                        Clear Selection
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border overflow-hidden">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-gray-50">
                                            <TableHead className="w-12">
                                                <Checkbox
                                                    checked={selectedIds.size > 0 && selectedIds.size === paginated.length}
                                                    onCheckedChange={handleSelectAll}
                                                />
                                            </TableHead>
                                            <TableHead>
                                                <button
                                                    onClick={() => handleSort('full_name')}
                                                    className="flex items-center font-semibold text-sm hover:text-gray-900 transition-colors"
                                                >
                                                    Name
                                                    {getSortIcon('full_name')}
                                                </button>
                                            </TableHead>
                                            <TableHead>
                                                <button
                                                    onClick={() => handleSort('email')}
                                                    className="flex items-center font-semibold text-sm hover:text-gray-900 transition-colors"
                                                >
                                                    Contact
                                                    {getSortIcon('email')}
                                                </button>
                                            </TableHead>
                                            <TableHead>
                                                <button
                                                    onClick={() => handleSort('role')}
                                                    className="flex items-center font-semibold text-sm hover:text-gray-900 transition-colors"
                                                >
                                                    Role
                                                    {getSortIcon('role')}
                                                </button>
                                            </TableHead>
                                            <TableHead>
                                                <button
                                                    onClick={() => handleSort('status')}
                                                    className="flex items-center font-semibold text-sm hover:text-gray-900 transition-colors"
                                                >
                                                    Status
                                                    {getSortIcon('status')}
                                                </button>
                                            </TableHead>
                                            <TableHead>
                                                <button
                                                    onClick={() => handleSort('payment_status')}
                                                    className="flex items-center font-semibold text-sm hover:text-gray-900 transition-colors"
                                                >
                                                    Payment
                                                    {getSortIcon('payment_status')}
                                                </button>
                                            </TableHead>
                                            <TableHead>
                                                <button
                                                    onClick={() => handleSort('is_new_registrant')}
                                                    className="flex items-center font-semibold text-sm hover:text-gray-900 transition-colors"
                                                >
                                                    Type
                                                    {getSortIcon('is_new_registrant')}
                                                </button>
                                            </TableHead>
                                            <TableHead>
                                                <button
                                                    onClick={() => handleSort('created_at')}
                                                    className="flex items-center font-semibold text-sm hover:text-gray-900 transition-colors"
                                                >
                                                    Date
                                                    {getSortIcon('created_at')}
                                                </button>
                                            </TableHead>
                                            <TableHead className="w-24">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginated.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={9} className="text-center h-24 text-muted-foreground">
                                                    No registrations found.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            paginated.map(reg => (
                                                <TableRow 
                                                    key={reg.id}
                                                    className={cn(
                                                        "hover:bg-gray-50 cursor-pointer transition-colors",
                                                        selectedIds.has(reg.id) && "bg-blue-50"
                                                    )}
                                                    onClick={() => router.push(`/admin/camp-meeting/registrations/${reg.id}`)}
                                                >
                                                    <TableCell onClick={(e) => e.stopPropagation()}>
                                                        <Checkbox
                                                            checked={selectedIds.has(reg.id)}
                                                            onCheckedChange={(checked) => handleSelectOne(reg.id, checked === true)}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="font-medium text-gray-900">
                                                            {reg.full_name || `${reg.first_name} ${reg.last_name}`}
                                                        </div>
                                                        {reg.is_new_registrant && (
                                                            <Badge variant="secondary" className="text-xs mt-1">
                                                                New
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="space-y-1">
                                                            {reg.email && (
                                                                <div className="flex items-center text-sm text-gray-600">
                                                                    <Mail className="h-3 w-3 mr-1" />
                                                                    {reg.email}
                                                                </div>
                                                            )}
                                                            {reg.phone && (
                                                                <div className="flex items-center text-sm text-gray-600">
                                                                    <Phone className="h-3 w-3 mr-1" />
                                                                    {reg.phone}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className="text-xs">
                                                            {reg.role}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            variant={reg.status === 'checked_in' ? 'default' : 'outline'}
                                                            className="text-xs"
                                                        >
                                                            {reg.status === 'checked_in' ? 'Checked In' : reg.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            variant={
                                                                reg.payment_status === 'paid' ? 'default' :
                                                                reg.payment_status === 'confirmed' ? 'default' :
                                                                'outline'
                                                            }
                                                            className="text-xs"
                                                        >
                                                            {reg.payment_status || 'pending'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        {reg.is_new_registrant ? (
                                                            <Badge variant="secondary" className="text-xs">New</Badge>
                                                        ) : (
                                                            <span className="text-xs text-gray-600">Returning</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-sm text-gray-600">
                                                        {new Date(reg.created_at).toLocaleDateString('en-US', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            year: 'numeric'
                                                        })}
                                                    </TableCell>
                                                    <TableCell onClick={(e) => e.stopPropagation()}>
                                                        <div className="flex items-center gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => router.push(`/admin/camp-meeting/registrations/${reg.id}`)}
                                                            >
                                                                <Eye className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between mt-4 pt-4 border-t">
                                <div className="text-sm text-gray-600">
                                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, sorted.length)} of {sorted.length} registrations
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                    >
                                        Previous
                                    </Button>
                                    <div className="flex items-center gap-1">
                                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                            let pageNum: number
                                            if (totalPages <= 5) {
                                                pageNum = i + 1
                                            } else if (currentPage <= 3) {
                                                pageNum = i + 1
                                            } else if (currentPage >= totalPages - 2) {
                                                pageNum = totalPages - 4 + i
                                            } else {
                                                pageNum = currentPage - 2 + i
                                            }
                                            return (
                                                <Button
                                                    key={pageNum}
                                                    variant={currentPage === pageNum ? 'default' : 'outline'}
                                                    size="sm"
                                                    onClick={() => setCurrentPage(pageNum)}
                                                    className="w-8"
                                                >
                                                    {pageNum}
                                                </Button>
                                            )
                                        })}
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                    >
                                        Next
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
            </div>
    )
}

export default function RegistrationsPage() {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-[40vh] items-center justify-center">
                    <LoadingSpinner />
                </div>
            }
        >
            <RegistrationsPageContent />
        </Suspense>
    )
}
