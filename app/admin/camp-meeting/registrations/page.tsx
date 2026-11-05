'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CampRegistration, CampYear } from '@/lib/types'
import { campRegistrationsToGoogleFormCsv } from '@/lib/camp/google-form-import'
import { backfillCampCheckInCodes, sendCampTemplateSmsToRegistrationsAction } from '@/lib/actions/camp'
import {
  getCampMessageTemplate,
  personalizeCampMessage,
} from '@/lib/camp/sms-templates'
import { useCampRegistrations } from '@/lib/hooks/use-camp'
import { useAuth } from '@/components/providers'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ImportContactWarningsBadge } from '@/components/camp/import-contact-warnings'
import { Checkbox } from '@/components/ui/checkbox'
import { LoadingSpinner } from '@/components/ui/loading'
import { CampSmsReviewDialog } from '@/components/camp/camp-sms-review-dialog'
import { EditRegistrationDialog } from '@/components/camp/edit-registration-dialog'
import { StatCard } from '@/components/ui/stat-card'
import { PhoneLink, QuickContactButtons } from '@/components/contact/phone-link'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
    Printer,
    MessageSquare,
    BedDouble,
    MoreHorizontal,
    ChevronRight
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { CampAdminPageHeader } from '@/components/camp/camp-admin-page-header'
import { formatRelativeWhen } from '@/lib/camp/relative-time'

type SortField = 'full_name' | 'email' | 'phone' | 'role' | 'status' | 'payment_status' | 'created_at' | 'is_new_registrant'
type SortDirection = 'asc' | 'desc'

const ITEMS_PER_PAGE = 25

function RegistrationsPageContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const campYearId = searchParams.get('year')
    const { toast } = useToast()
    const { user, loading: authLoading, can } = useAuth()
    const canEditRegistrations = can('camp.manage') || can('camp.payments')
    const [editingRegistration, setEditingRegistration] = useState<CampRegistration | null>(null)
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
    const [backfillingCodes, setBackfillingCodes] = useState(false)
    const [sendingBulkSms, setSendingBulkSms] = useState(false)
    const [bulkSmsReview, setBulkSmsReview] = useState<{
        template_id: 'registration_confirmation' | 'room_allocation'
        previewBody: string
        sampleNames: string[]
    } | null>(null)

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
            reg.check_in_code?.toLowerCase().includes(search.toLowerCase()) ||
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

    const printQRCodes = (layout: 'sheet' | 'slips' = 'sheet') => {
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

        const ids = registrationsToPrint.map(reg => reg.id).join(',')
        const layoutParam = layout === 'slips' ? '&layout=slips' : ''
        const printUrl = `/admin/camp-meeting/registrations/print?ids=${ids}${layoutParam}`
        window.open(printUrl, '_blank')

        toast({
            title: 'Opening print page',
            description: `Preparing ${registrationsToPrint.length} ${layout === 'slips' ? 'slip(s)' : 'QR code(s)'} for printing`,
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

    function openBulkSmsReview(template_id: 'registration_confirmation' | 'room_allocation') {
        if (!campYear?.id || !user?.id) return
        if (selectedIds.size === 0) {
            toast({
                variant: 'destructive',
                title: 'No selection',
                description: 'Select registrations first',
            })
            return
        }
        const selected = registrations.filter((r) => selectedIds.has(r.id))
        const sample = selected[0]
        const previewBody = personalizeCampMessage(
            getCampMessageTemplate(template_id)?.body || '',
            {
                fullName: sample?.full_name,
                firstName: sample?.first_name,
                lastName: sample?.last_name,
                phone: sample?.phone,
                checkInCode: sample?.check_in_code,
                campYear: campYear.year,
                theme: campYear.theme,
                venue: campYear.venue,
            }
        )
        setBulkSmsReview({
            template_id,
            previewBody,
            sampleNames: selected.slice(0, 8).map((r) => r.full_name || 'Camper'),
        })
    }

    async function confirmBulkSms() {
        if (!campYear?.id || !user?.id || !bulkSmsReview) return
        setSendingBulkSms(true)
        const { data, error } = await sendCampTemplateSmsToRegistrationsAction({
            camp_year_id: campYear.id,
            sender_id: user.id,
            registration_ids: Array.from(selectedIds),
            template_id: bulkSmsReview.template_id,
        })
        setSendingBulkSms(false)
        if (error || !data) {
            toast({
                variant: 'destructive',
                title: 'SMS failed',
                description: error ?? 'Could not send',
            })
            return
        }
        toast({
            title:
                data.success_count > 0
                    ? `Sent ${data.success_count} SMS`
                    : 'No SMS delivered',
            variant: data.success_count > 0 ? 'default' : 'destructive',
            description: `${bulkSmsReview.template_id === 'room_allocation' ? 'Room' : 'Confirmation'}${
                data.skipped_count || data.error_count
                    ? ` · ${data.skipped_count} skipped, ${data.error_count} failed`
                    : ''
            }${data.errors[0] ? ` · ${data.errors[0]}` : ''}`,
        })
        if (data.success_count > 0) setBulkSmsReview(null)
    }

    const missingCheckInCodes = registrations.filter((r) => !r.check_in_code?.trim()).length

    async function assignMissingCheckInCodes() {
        if (!campYear?.id) return
        setBackfillingCodes(true)
        const { data, error } = await backfillCampCheckInCodes(campYear.id)
        setBackfillingCodes(false)
        if (error || !data) {
            toast({ variant: 'destructive', title: 'Failed', description: error ?? 'Unknown error' })
            return
        }
        await refresh()
        toast({
            title: 'Camp codes assigned',
            description: `Added GEM codes to ${data.updated} registration(s).`,
        })
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
        <>
        <div>
            <div className="mx-auto max-w-7xl space-y-4 pb-28 sm:space-y-6 lg:pb-6">
                <CampAdminPageHeader
                    title="Camp Registrations"
                    campYear={campYear}
                    actions={
                        <>
                            <Button onClick={() => printQRCodes('slips')} variant="outline" className="hidden shadow-sm sm:inline-flex">
                                <Printer className="mr-2 h-4 w-4" />
                                Print QR slips
                            </Button>
                            <Button onClick={() => printQRCodes('sheet')} variant="outline" className="hidden shadow-sm sm:inline-flex">
                                <Printer className="mr-2 h-4 w-4" />
                                Print QR sheet
                            </Button>
                            <Button data-tour="camp-reg-export" onClick={exportToCSV} variant="outline" className="shadow-sm">
                                <Download className="mr-2 h-4 w-4" />
                                Export CSV
                            </Button>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="shadow-sm sm:hidden">
                                        <MoreHorizontal className="mr-2 h-4 w-4" aria-hidden />
                                        More
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                    <DropdownMenuItem className="min-h-11" onSelect={() => printQRCodes('slips')}>
                                        <Printer className="mr-2 h-4 w-4" aria-hidden />
                                        Print QR slips
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="min-h-11" onSelect={() => printQRCodes('sheet')}>
                                        <Printer className="mr-2 h-4 w-4" aria-hidden />
                                        Print QR sheet
                                    </DropdownMenuItem>
                                    {missingCheckInCodes > 0 ? (
                                        <DropdownMenuItem
                                            className="min-h-11"
                                            disabled={backfillingCodes}
                                            onSelect={() => void assignMissingCheckInCodes()}
                                        >
                                            <QrCode className="mr-2 h-4 w-4" aria-hidden />
                                            {backfillingCodes ? 'Assigning codes…' : `Assign camp codes (${missingCheckInCodes})`}
                                        </DropdownMenuItem>
                                    ) : null}
                                </DropdownMenuContent>
                            </DropdownMenu>
                            {missingCheckInCodes > 0 ? (
                                <Button
                                    variant="secondary"
                                    className="hidden shadow-sm sm:inline-flex"
                                    disabled={backfillingCodes}
                                    onClick={() => void assignMissingCheckInCodes()}
                                >
                                    {backfillingCodes
                                        ? 'Assigning codes…'
                                        : `Assign camp codes (${missingCheckInCodes})`}
                                </Button>
                            ) : null}
                        </>
                    }
                />

                {/* Stats Cards */}
                <div data-tour="camp-reg-stats" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                    <StatCard label="Registrations" value={stats.total} />
                    <StatCard
                        label="Checked in"
                        value={stats.checkedIn}
                        tone="success"
                        sub={`${stats.total > 0 ? Math.round((stats.checkedIn / stats.total) * 100) : 0}% of total`}
                    />
                    <StatCard
                        label="New registrants"
                        value={stats.newRegistrants}
                        sub={`${stats.total > 0 ? Math.round((stats.newRegistrants / stats.total) * 100) : 0}% of total`}
                    />
                    <StatCard
                        label="Paid"
                        value={stats.paid}
                        sub={`${stats.total > 0 ? Math.round((stats.paid / stats.total) * 100) : 0}% of total`}
                    />
                </div>

                {/* Filters and Bulk Actions */}
                <Card>
                    <CardHeader className="p-4 sm:p-6">
                        <div data-tour="camp-reg-filters" className="flex flex-col gap-3 md:flex-row md:gap-4">
                            <div className="relative w-full flex-1 md:max-w-md">
                                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Search name, email, phone, QR code..."
                                    className="h-11 pl-8 md:h-10"
                                    value={search}
                                    onChange={e => {
                                        setSearch(e.target.value)
                                        setCurrentPage(1)
                                    }}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                                <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setCurrentPage(1) }}>
                                    <SelectTrigger className="h-11 w-full sm:h-10 sm:w-[140px]">
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
                                    <SelectTrigger className="h-11 w-full sm:h-10 sm:w-[140px]">
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
                                    <SelectTrigger className="h-11 w-full sm:h-10 sm:w-[140px]">
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
                                    <SelectTrigger className="h-11 w-full sm:h-10 sm:w-[140px]">
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
                        
                    </CardHeader>
                    <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                        <div className="md:hidden" data-tour="camp-reg-list">
                            {paginated.length > 0 ? (
                                <label className="mb-2 flex min-h-11 items-center gap-3 px-1 text-sm text-neutral-600 dark:text-neutral-400">
                                    <Checkbox
                                        checked={selectedIds.size > 0 && selectedIds.size === paginated.length}
                                        onCheckedChange={handleSelectAll}
                                    />
                                    Select all on this page
                                </label>
                            ) : null}
                            <ul className="divide-y divide-neutral-200/80 rounded-xl border border-neutral-200/80 dark:divide-white/[0.06] dark:border-white/10">
                                {paginated.length === 0 ? (
                                    <li className="p-6 text-center text-sm text-neutral-500 dark:text-neutral-400">No registrations found.</li>
                                ) : (
                                    paginated.map(reg => {
                                        const name = reg.full_name || `${reg.first_name} ${reg.last_name}`
                                        return (
                                            <li
                                                key={reg.id}
                                                className={cn(
                                                    'flex min-h-11 items-start gap-3 p-3',
                                                    selectedIds.has(reg.id) && 'bg-brand-50/60 dark:bg-brand-400/10'
                                                )}
                                            >
                                                <div className="flex h-10 items-center">
                                                    <Checkbox
                                                        aria-label={`Select ${name}`}
                                                        checked={selectedIds.has(reg.id)}
                                                        onCheckedChange={(checked) => handleSelectOne(reg.id, checked === true)}
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    className="min-w-0 flex-1 text-left"
                                                    onClick={() => router.push(`/admin/camp-meeting/registrations/${reg.id}`)}
                                                >
                                                    <span className="block truncate font-medium text-neutral-900 dark:text-neutral-100">{name}</span>
                                                    <span className="mt-0.5 block truncate text-xs text-neutral-500 dark:text-neutral-400">
                                                        {[reg.role, reg.phone].filter(Boolean).join(' · ')}
                                                    </span>
                                                    <span className="mt-1.5 flex flex-wrap gap-1">
                                                        <Badge variant={reg.status === 'checked_in' ? 'success' : 'outline'} className="text-xs">
                                                            {reg.status === 'checked_in' ? 'Checked in' : reg.status}
                                                        </Badge>
                                                        <Badge
                                                            variant={reg.payment_status === 'paid' || reg.payment_status === 'confirmed' ? 'success' : 'outline'}
                                                            className="text-xs"
                                                        >
                                                            {reg.payment_status || 'pending'}
                                                        </Badge>
                                                        {reg.is_new_registrant ? <Badge variant="brand" className="text-xs">New</Badge> : null}
                                                    </span>
                                                    <ImportContactWarningsBadge warnings={reg.import_warnings} className="mt-1" />
                                                </button>
                                                <QuickContactButtons phone={reg.phone} whatsapp={reg.whatsapp} name={name} className="pt-0.5" />
                                            </li>
                                        )
                                    })
                                )}
                            </ul>
                        </div>
                        <div className="hidden overflow-hidden rounded-md border md:block" data-tour="camp-reg-table">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-neutral-50 dark:bg-white/[0.03]">
                                            <TableHead className="w-12">
                                                <Checkbox
                                                    checked={selectedIds.size > 0 && selectedIds.size === paginated.length}
                                                    onCheckedChange={handleSelectAll}
                                                />
                                            </TableHead>
                                            <TableHead>
                                                <button
                                                    onClick={() => handleSort('full_name')}
                                                    className="flex items-center font-semibold text-sm transition-colors hover:text-neutral-900 dark:hover:text-neutral-100"
                                                >
                                                    Name
                                                    {getSortIcon('full_name')}
                                                </button>
                                            </TableHead>
                                            <TableHead>
                                                <button
                                                    onClick={() => handleSort('email')}
                                                    className="flex items-center font-semibold text-sm transition-colors hover:text-neutral-900 dark:hover:text-neutral-100"
                                                >
                                                    Contact
                                                    {getSortIcon('email')}
                                                </button>
                                            </TableHead>
                                            <TableHead>
                                                <button
                                                    onClick={() => handleSort('role')}
                                                    className="flex items-center font-semibold text-sm transition-colors hover:text-neutral-900 dark:hover:text-neutral-100"
                                                >
                                                    Role
                                                    {getSortIcon('role')}
                                                </button>
                                            </TableHead>
                                            <TableHead>
                                                <button
                                                    onClick={() => handleSort('status')}
                                                    className="flex items-center font-semibold text-sm transition-colors hover:text-neutral-900 dark:hover:text-neutral-100"
                                                >
                                                    Status
                                                    {getSortIcon('status')}
                                                </button>
                                            </TableHead>
                                            <TableHead>
                                                <button
                                                    onClick={() => handleSort('payment_status')}
                                                    className="flex items-center font-semibold text-sm transition-colors hover:text-neutral-900 dark:hover:text-neutral-100"
                                                >
                                                    Payment
                                                    {getSortIcon('payment_status')}
                                                </button>
                                            </TableHead>
                                            <TableHead>
                                                <button
                                                    onClick={() => handleSort('is_new_registrant')}
                                                    className="flex items-center font-semibold text-sm transition-colors hover:text-neutral-900 dark:hover:text-neutral-100"
                                                >
                                                    Type
                                                    {getSortIcon('is_new_registrant')}
                                                </button>
                                            </TableHead>
                                                    <TableHead>
                                                <button
                                                    onClick={() => handleSort('created_at')}
                                                    className="flex items-center font-semibold text-sm transition-colors hover:text-neutral-900 dark:hover:text-neutral-100"
                                                >
                                                    Registered
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
                                                        "cursor-pointer transition-colors hover:bg-neutral-50 dark:hover:bg-white/[0.03]",
                                                        selectedIds.has(reg.id) && "bg-neutral-50 dark:bg-white/[0.03]"
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
                                                        <div className="font-medium text-neutral-900 dark:text-neutral-100">
                                                            {reg.full_name || `${reg.first_name} ${reg.last_name}`}
                                                        </div>
                                                        {reg.is_new_registrant && (
                                                            <Badge variant="secondary" className="text-xs mt-1">
                                                                New
                                                            </Badge>
                                                        )}
                                                        <ImportContactWarningsBadge
                                                            warnings={reg.import_warnings}
                                                            className="mt-1"
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="space-y-1">
                                                            {reg.email && (
                                                                <div className="flex items-center text-sm text-neutral-600 dark:text-neutral-400">
                                                                    <Mail className="h-3 w-3 mr-1" />
                                                                    {reg.email}
                                                                </div>
                                                            )}
                                                            {reg.phone && (
                                                                <div className="flex items-center text-sm text-neutral-600 dark:text-neutral-400">
                                                                    <Phone className="h-3 w-3 mr-1" aria-hidden />
                                                                    <PhoneLink
                                                                        phone={reg.phone}
                                                                        whatsapp={reg.whatsapp}
                                                                        name={reg.full_name || `${reg.first_name} ${reg.last_name}`}
                                                                    />
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
                                                            <span className="text-xs text-neutral-600 dark:text-neutral-400">Returning</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-sm text-neutral-600 dark:text-neutral-400">
                                                        {(() => {
                                                            const when = formatRelativeWhen(reg.created_at)
                                                            return (
                                                                <div title={when.absolute}>
                                                                    <div className="font-medium text-neutral-800 dark:text-neutral-200">
                                                                        {when.absoluteDate}
                                                                    </div>
                                                                    <div className="text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
                                                                        {when.absoluteTime}
                                                                        {when.relative ? ` · ${when.relative}` : ''}
                                                                    </div>
                                                                </div>
                                                            )
                                                        })()}
                                                    </TableCell>
                                                    <TableCell onClick={(e) => e.stopPropagation()}>
                                                        <div className="flex items-center gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                aria-label={`View ${reg.full_name || 'registration'}`}
                                                                title="View"
                                                                onClick={() => router.push(`/admin/camp-meeting/registrations/${reg.id}`)}
                                                            >
                                                                <Eye className="h-4 w-4" />
                                                            </Button>
                                                            {canEditRegistrations ? (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    aria-label={`Edit ${reg.full_name || 'registration'}`}
                                                                    title="Edit"
                                                                    onClick={() => setEditingRegistration(reg)}
                                                                >
                                                                    <Edit className="h-4 w-4" />
                                                                </Button>
                                                            ) : null}
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
                            <div className="mt-4 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="text-sm text-neutral-600 dark:text-neutral-400">
                                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, sorted.length)} of {sorted.length} registrations
                                </div>
                                <div className="flex items-center justify-between gap-2 sm:justify-start">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="min-h-11 sm:min-h-9"
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                    >
                                        Previous
                                    </Button>
                                    <div className="hidden items-center gap-1 sm:flex">
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
                                    <span className="text-sm tabular-nums text-neutral-600 dark:text-neutral-400 sm:hidden">
                                        {currentPage} / {totalPages}
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="min-h-11 sm:min-h-9"
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

            {selectedIds.size > 0 && (
                <div className="fixed inset-x-3 bottom-20 z-40 mx-auto max-w-3xl rounded-2xl border border-neutral-200/80 bg-white p-3 shadow-lg dark:border-white/10 dark:bg-neutral-900 lg:bottom-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                        <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                            {selectedIds.size} selected
                        </span>
                        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                            <Button
                                size="sm"
                                variant="outline"
                                className="min-h-11 cursor-pointer sm:min-h-9"
                                onClick={() => handleBulkStatusUpdate('checked_in')}
                            >
                                <CheckCircle2 className="mr-1 h-4 w-4" aria-hidden />
                                Check in
                            </Button>
                            <Button
                                size="sm"
                                className="min-h-11 cursor-pointer sm:min-h-9"
                                disabled={sendingBulkSms}
                                onClick={() => openBulkSmsReview('registration_confirmation')}
                            >
                                <MessageSquare className="mr-1 h-4 w-4" aria-hidden />
                                {sendingBulkSms ? 'Sending…' : 'SMS confirmation'}
                            </Button>
                            <Button
                                size="sm"
                                variant="secondary"
                                className="min-h-11 cursor-pointer sm:min-h-9"
                                disabled={sendingBulkSms}
                                onClick={() => openBulkSmsReview('room_allocation')}
                            >
                                <BedDouble className="mr-1 h-4 w-4" aria-hidden />
                                SMS room
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                className="min-h-11 cursor-pointer sm:min-h-9"
                                onClick={() => setSelectedIds(new Set())}
                            >
                                Clear
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <EditRegistrationDialog
                open={Boolean(editingRegistration)}
                onOpenChange={(open) => {
                    if (!open) setEditingRegistration(null)
                }}
                registration={editingRegistration}
                onSaved={() => refresh()}
            />

            <CampSmsReviewDialog
                open={Boolean(bulkSmsReview)}
                onOpenChange={(open) => {
                    if (!open && !sendingBulkSms) setBulkSmsReview(null)
                }}
                title={
                    bulkSmsReview?.template_id === 'room_allocation'
                        ? 'Review room SMS'
                        : 'Review confirmation SMS'
                }
                description="Nothing is sent until you confirm. Each selected camper gets a personalized message."
                recipientName={`${selectedIds.size} selected`}
                recipientCount={selectedIds.size}
                sampleRecipientNames={bulkSmsReview?.sampleNames ?? []}
                previewBody={bulkSmsReview?.previewBody ?? ''}
                sending={sendingBulkSms}
                onConfirm={() => void confirmBulkSms()}
            />
        </>
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
