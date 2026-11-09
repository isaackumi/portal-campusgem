'use client'

import { useEffect, useState } from 'react'
import { isPaid } from '@/convex/lib/states/campRegistration'
import { useRouter } from 'next/navigation'
import { campService } from '@/lib/services/camp-service'
import { getActiveCampYear } from '@/lib/actions/camp'
import { CampRegistration, CampYear } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { LoadingSpinner } from '@/components/ui/loading'
import { CampAdminPageHeader } from '@/components/camp/camp-admin-page-header'
import { StatCard } from '@/components/ui/stat-card'
import { PhoneLink, QuickContactButtons } from '@/components/contact/phone-link'
import { useToast } from '@/hooks/use-toast'
import {
    ArrowLeft, DollarSign, CheckCircle2, XCircle, Clock, Download,
    Search, Filter, Eye, Edit, CreditCard, TrendingUp, FileText
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function PaymentManagementPage() {
    const router = useRouter()
    const { toast } = useToast()
    const [campYear, setCampYear] = useState<CampYear | null>(null)
    const [registrations, setRegistrations] = useState<CampRegistration[]>([])
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState(false)

    // Filters
    const [paymentFilter, setPaymentFilter] = useState<'all' | 'pending' | 'paid' | 'confirmed' | 'refunded'>('all')
    const [searchQuery, setSearchQuery] = useState('')

    // Bulk update
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [bulkDialogOpen, setBulkDialogOpen] = useState(false)
    const [bulkPaymentData, setBulkPaymentData] = useState({
        payment_status: 'paid' as 'pending' | 'paid' | 'confirmed' | 'refunded',
        payment_amount: 30.00,
        payment_reference: '',
        payment_date: new Date().toISOString().split('T')[0]
    })

    // Single update dialog
    const [updateDialogOpen, setUpdateDialogOpen] = useState(false)
    const [editingRegistration, setEditingRegistration] = useState<CampRegistration | null>(null)
    const [paymentData, setPaymentData] = useState({
        payment_status: 'pending' as 'pending' | 'paid' | 'confirmed' | 'refunded',
        payment_amount: 30.00,
        payment_reference: '',
        payment_date: ''
    })

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        const { data: year } = await getActiveCampYear()
        if (year) {
            setCampYear(year)
            const { data } = await campService.getCampRegistrations(year.id)
            if (data) setRegistrations(data)
        }
        setLoading(false)
    }

    const filteredRegistrations = registrations.filter(reg => {
        const matchesSearch = !searchQuery ||
            reg.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            reg.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            reg.phone?.toLowerCase().includes(searchQuery.toLowerCase())

        const matchesPayment = paymentFilter === 'all' || reg.payment_status === paymentFilter

        return matchesSearch && matchesPayment
    })

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(new Set(filteredRegistrations.map(r => r.id)))
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

    const openUpdateDialog = (reg: CampRegistration) => {
        setEditingRegistration(reg)
        setPaymentData({
            payment_status: reg.payment_status || 'pending',
            payment_amount: reg.payment_amount || 30.00,
            payment_reference: reg.payment_reference || '',
            payment_date: reg.payment_date
                ? new Date(reg.payment_date).toISOString().split('T')[0]
                : new Date().toISOString().split('T')[0]
        })
        setUpdateDialogOpen(true)
    }

    const handleUpdatePayment = async () => {
        if (!editingRegistration) return

        setUpdating(true)
        try {
            const res = await campService.updateRegistration(editingRegistration.id, {
                payment_status: paymentData.payment_status,
                payment_amount: paymentData.payment_amount,
                payment_reference: paymentData.payment_reference || undefined,
                payment_date: paymentData.payment_date ? new Date(paymentData.payment_date).toISOString() : undefined
            })

            if (res.error) throw new Error(res.error)

            toast({
                title: 'Success',
                description: 'Payment information updated'
            })
            setUpdateDialogOpen(false)
            loadData()
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.message || 'Failed to update payment'
            })
        } finally {
            setUpdating(false)
        }
    }

    const handleBulkUpdate = async () => {
        if (selectedIds.size === 0) {
            toast({
                variant: 'destructive',
                title: 'No Selection',
                description: 'Please select registrations to update'
            })
            return
        }

        setUpdating(true)
        try {
            const updates = Array.from(selectedIds).map(id =>
                campService.updateRegistration(id, {
                    payment_status: bulkPaymentData.payment_status,
                    payment_amount: bulkPaymentData.payment_amount,
                    payment_reference: bulkPaymentData.payment_reference || undefined,
                    payment_date: bulkPaymentData.payment_date ? new Date(bulkPaymentData.payment_date).toISOString() : undefined
                })
            )

            await Promise.all(updates)
            toast({
                title: 'Success',
                description: `Updated payment for ${selectedIds.size} registration(s)`
            })
            setSelectedIds(new Set())
            setBulkDialogOpen(false)
            loadData()
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.message || 'Failed to update payments'
            })
        } finally {
            setUpdating(false)
        }
    }

    const exportPayments = () => {
        const headers = [
            'First Name', 'Last Name', 'Email', 'Phone', 'Role', 'Payment Status',
            'Amount', 'Reference', 'Payment Date', 'Registration Date'
        ]

        const rows = filteredRegistrations.map(reg => [
            reg.first_name || '',
            reg.last_name || '',
            reg.email || '',
            reg.phone || '',
            reg.role || '',
            reg.payment_status || 'pending',
            (reg.payment_amount || 0).toFixed(2),
            reg.payment_reference || '',
            reg.payment_date ? new Date(reg.payment_date).toLocaleDateString() : '',
            new Date(reg.created_at).toLocaleDateString()
        ])

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell =>
                typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell
            ).join(','))
        ].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `camp-payments-${campYear?.year || new Date().getFullYear()}-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        window.URL.revokeObjectURL(url)

        toast({
            title: 'Export Complete',
            description: `${filteredRegistrations.length} payment records exported`,
        })
    }

    const stats = {
        total: registrations.length,
        paid: registrations.filter(r => isPaid(r.payment_status)).length,
        pending: registrations.filter(r => r.payment_status === 'pending' || !r.payment_status).length,
        refunded: registrations.filter(r => r.payment_status === 'refunded').length,
        totalAmount: registrations.reduce((sum, r) => sum + (r.payment_amount || 0), 0),
        paidAmount: registrations
            .filter(r => isPaid(r.payment_status))
            .reduce((sum, r) => sum + (r.payment_amount || 0), 0),
        pendingAmount: registrations
            .filter(r => r.payment_status === 'pending' || !r.payment_status)
            .reduce((sum, r) => sum + (r.payment_amount || 0), 0),
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
                    title="Payment Management"
                    campYear={campYear}
                    actions={
                        <Button variant="outline" onClick={exportPayments} className="h-11 sm:h-10">
                            <Download className="mr-2 h-4 w-4" /> Export CSV
                        </Button>
                    }
                />

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
                    <StatCard label="Registrations" value={stats.total} icon={CreditCard} className="col-span-2 lg:col-span-1" />
                    <StatCard label="Paid" value={stats.paid} sub={`₵${stats.paidAmount.toFixed(2)}`} tone="success" icon={CheckCircle2} />
                    <StatCard label="Pending" value={stats.pending} sub={`₵${stats.pendingAmount.toFixed(2)}`} tone="warning" icon={Clock} />
                    <StatCard label="Expected" value={`₵${stats.totalAmount.toFixed(2)}`} sub="Expected total" icon={DollarSign} />
                    <StatCard
                        label="Collected"
                        value={`${stats.totalAmount > 0 ? Math.round((stats.paidAmount / stats.totalAmount) * 100) : 0}%`}
                        sub={`₵${stats.paidAmount.toFixed(2)} of ₵${stats.totalAmount.toFixed(2)}`}
                        icon={TrendingUp}
                    />
                </div>

                {/* Filters and Bulk Actions */}
                <Card>
                    <CardHeader className="p-4 sm:p-6">
                        <div className="flex flex-col gap-3 md:flex-row md:gap-4">
                            <div className="relative flex-1 md:max-w-md">
                                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Search name, email, phone..."
                                    className="h-11 pl-8 md:h-10"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <Select value={paymentFilter} onValueChange={(v: any) => setPaymentFilter(v)}>
                                <SelectTrigger className="h-11 w-full md:h-10 md:w-[180px]">
                                    <SelectValue placeholder="Payment Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="paid">Paid</SelectItem>
                                    <SelectItem value="confirmed">Confirmed</SelectItem>
                                    <SelectItem value="refunded">Refunded</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {selectedIds.size > 0 && (
                            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-neutral-200/80 pt-4 dark:border-white/10">
                                <span className="w-full text-sm font-medium text-neutral-700 dark:text-neutral-300 sm:w-auto">
                                    {selectedIds.size} selected
                                </span>
                                <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
                                    <DialogTrigger asChild>
                                        <Button size="sm" variant="outline" className="h-11 flex-1 sm:h-9 sm:flex-none">
                                            <Edit className="h-4 w-4 mr-1" />
                                            Bulk Update
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Bulk Update Payment</DialogTitle>
                                            <DialogDescription>
                                                Update payment for {selectedIds.size} selected registration(s)
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-4 py-4">
                                            <div className="space-y-2">
                                                <Label>Payment Status</Label>
                                                <Select
                                                    value={bulkPaymentData.payment_status}
                                                    onValueChange={(v: any) => setBulkPaymentData({ ...bulkPaymentData, payment_status: v })}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="pending">Pending</SelectItem>
                                                        <SelectItem value="paid">Paid</SelectItem>
                                                        <SelectItem value="confirmed">Confirmed</SelectItem>
                                                        <SelectItem value="refunded">Refunded</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Amount (₵)</Label>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    value={bulkPaymentData.payment_amount}
                                                    onChange={e => setBulkPaymentData({ ...bulkPaymentData, payment_amount: parseFloat(e.target.value) || 0 })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Reference (Optional)</Label>
                                                <Input
                                                    value={bulkPaymentData.payment_reference}
                                                    onChange={e => setBulkPaymentData({ ...bulkPaymentData, payment_reference: e.target.value })}
                                                    placeholder="Transaction reference"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Payment Date</Label>
                                                <Input
                                                    type="date"
                                                    value={bulkPaymentData.payment_date}
                                                    onChange={e => setBulkPaymentData({ ...bulkPaymentData, payment_date: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button variant="outline" onClick={() => setBulkDialogOpen(false)}>
                                                Cancel
                                            </Button>
                                            <Button onClick={handleBulkUpdate} disabled={updating}>
                                                {updating ? 'Updating...' : 'Update Payments'}
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-11 flex-1 sm:h-9 sm:flex-none"
                                    onClick={() => setSelectedIds(new Set())}
                                >
                                    Clear Selection
                                </Button>
                            </div>
                        )}
                    </CardHeader>
                    <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                        {/* Mobile: card list */}
                        <div className="space-y-2 md:hidden">
                            {filteredRegistrations.length > 0 ? (
                                <label className="flex min-h-11 items-center gap-3 px-1 text-sm text-neutral-600 dark:text-neutral-400">
                                    <Checkbox
                                        checked={selectedIds.size > 0 && selectedIds.size === filteredRegistrations.length}
                                        onCheckedChange={(c) => handleSelectAll(c === true)}
                                    />
                                    Select all ({filteredRegistrations.length})
                                </label>
                            ) : (
                                <p className="py-10 text-center text-sm text-neutral-500 dark:text-neutral-400">No registrations found.</p>
                            )}
                            {filteredRegistrations.map(reg => {
                                const name = reg.full_name || `${reg.first_name} ${reg.last_name}`
                                const paid = isPaid(reg.payment_status)
                                return (
                                    <div
                                        key={reg.id}
                                        className={cn(
                                            'rounded-xl border border-neutral-200/80 bg-white p-3 dark:border-white/10 dark:bg-neutral-800/60',
                                            selectedIds.has(reg.id) && 'ring-2 ring-brand-500/40'
                                        )}
                                    >
                                        <div className="flex items-start gap-3">
                                            <Checkbox
                                                className="mt-1"
                                                aria-label={`Select ${name}`}
                                                checked={selectedIds.has(reg.id)}
                                                onCheckedChange={(checked) => handleSelectOne(reg.id, checked === true)}
                                            />
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="truncate font-medium text-neutral-900 dark:text-neutral-100">{name}</p>
                                                    {reg.is_new_registrant && <Badge variant="secondary" className="shrink-0">New</Badge>}
                                                </div>
                                                <div className="mt-0.5 text-sm text-neutral-600 dark:text-neutral-400">
                                                    <PhoneLink phone={reg.phone} whatsapp={reg.whatsapp} name={name} />
                                                </div>
                                            </div>
                                            <QuickContactButtons phone={reg.phone} whatsapp={reg.whatsapp} name={name} />
                                        </div>
                                        <div className="mt-3 flex flex-wrap items-center gap-2 pl-7">
                                            <Badge variant={paid ? 'success' : reg.payment_status === 'refunded' ? 'danger' : 'warning'}>
                                                {reg.payment_status || 'pending'}
                                            </Badge>
                                            <span className="font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                                                ₵{(reg.payment_amount || 0).toFixed(2)}
                                            </span>
                                            {reg.role ? <Badge variant="outline">{reg.role}</Badge> : null}
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="ml-auto h-11 min-w-11"
                                                onClick={() => openUpdateDialog(reg)}
                                            >
                                                <Edit className="h-4 w-4" />
                                                Update
                                            </Button>
                                        </div>
                                        {(reg.payment_reference || reg.payment_date) && (
                                            <p className="mt-2 pl-7 text-xs text-neutral-500 dark:text-neutral-400">
                                                {reg.payment_reference ? <span className="font-mono">{reg.payment_reference}</span> : null}
                                                {reg.payment_reference && reg.payment_date ? ' · ' : ''}
                                                {reg.payment_date ? new Date(reg.payment_date).toLocaleDateString() : ''}
                                            </p>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                        <div className="hidden overflow-hidden rounded-md border border-neutral-200/80 dark:border-white/10 md:block">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-neutral-50 dark:bg-white/[0.03]">
                                            <TableHead className="w-12">
                                                <Checkbox
                                                    checked={selectedIds.size > 0 && selectedIds.size === filteredRegistrations.length}
                                                    onCheckedChange={handleSelectAll}
                                                />
                                            </TableHead>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Contact</TableHead>
                                            <TableHead>Role</TableHead>
                                            <TableHead>Payment Status</TableHead>
                                            <TableHead>Amount</TableHead>
                                            <TableHead>Reference</TableHead>
                                            <TableHead>Payment Date</TableHead>
                                            <TableHead className="w-24">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredRegistrations.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={9} className="text-center h-24 text-muted-foreground">
                                                    No registrations found.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredRegistrations.map(reg => (
                                                <TableRow
                                                    key={reg.id}
                                                    className={cn(
                                                        "transition-colors hover:bg-neutral-50 dark:hover:bg-white/[0.03]",
                                                        selectedIds.has(reg.id) && "bg-neutral-50 dark:bg-white/[0.03]"
                                                    )}
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
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="space-y-1 text-sm text-neutral-600 dark:text-neutral-400">
                                                            {reg.email && <div>{reg.email}</div>}
                                                            {reg.phone && (
                                                                <div className="flex items-center gap-2">
                                                                    <PhoneLink phone={reg.phone} whatsapp={reg.whatsapp} name={reg.full_name || reg.first_name} />
                                                                    <QuickContactButtons phone={reg.phone} whatsapp={reg.whatsapp} name={reg.full_name || reg.first_name} />
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
                                                            variant={
                                                                isPaid(reg.payment_status)
                                                                    ? 'default'
                                                                    : reg.payment_status === 'refunded'
                                                                    ? 'destructive'
                                                                    : 'outline'
                                                            }
                                                            className="text-xs"
                                                        >
                                                            {reg.payment_status || 'pending'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="font-semibold">
                                                        ₵{(reg.payment_amount || 0).toFixed(2)}
                                                    </TableCell>
                                                    <TableCell className="text-xs font-mono">
                                                        {reg.payment_reference || '-'}
                                                    </TableCell>
                                                    <TableCell className="text-xs text-neutral-600 dark:text-neutral-400">
                                                        {reg.payment_date
                                                            ? new Date(reg.payment_date).toLocaleDateString()
                                                            : '-'}
                                                    </TableCell>
                                                    <TableCell onClick={(e) => e.stopPropagation()}>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            aria-label="Update payment"
                                                            onClick={() => openUpdateDialog(reg)}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Update Payment Dialog */}
                <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Update Payment Information</DialogTitle>
                            <DialogDescription>
                                Update payment details for {editingRegistration?.full_name || editingRegistration?.first_name}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Payment Status</Label>
                                <Select
                                    value={paymentData.payment_status}
                                    onValueChange={(v: any) => setPaymentData({ ...paymentData, payment_status: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="pending">Pending</SelectItem>
                                        <SelectItem value="paid">Paid</SelectItem>
                                        <SelectItem value="confirmed">Confirmed</SelectItem>
                                        <SelectItem value="refunded">Refunded</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Amount (₵)</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={paymentData.payment_amount}
                                    onChange={e => setPaymentData({ ...paymentData, payment_amount: parseFloat(e.target.value) || 0 })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Reference (Optional)</Label>
                                <Input
                                    value={paymentData.payment_reference}
                                    onChange={e => setPaymentData({ ...paymentData, payment_reference: e.target.value })}
                                    placeholder="Transaction reference"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Payment Date</Label>
                                <Input
                                    type="date"
                                    value={paymentData.payment_date}
                                    onChange={e => setPaymentData({ ...paymentData, payment_date: e.target.value })}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setUpdateDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleUpdatePayment} disabled={updating}>
                                {updating ? 'Updating...' : 'Update Payment'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    )
}
