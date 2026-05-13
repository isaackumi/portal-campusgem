'use client'

import { useEffect, useState } from 'react'
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
        paid: registrations.filter(r => r.payment_status === 'paid' || r.payment_status === 'confirmed').length,
        pending: registrations.filter(r => r.payment_status === 'pending' || !r.payment_status).length,
        refunded: registrations.filter(r => r.payment_status === 'refunded').length,
        totalAmount: registrations.reduce((sum, r) => sum + (r.payment_amount || 0), 0),
        paidAmount: registrations
            .filter(r => r.payment_status === 'paid' || r.payment_status === 'confirmed')
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
                                Payment Management
                            </h1>
                            <p className="text-muted-foreground mt-1">
                                Camp Meeting {campYear.year} • {campYear.theme}
                            </p>
                        </div>
                    </div>
                    <Button variant="outline" onClick={exportPayments}>
                        <Download className="mr-2 h-4 w-4" /> Export CSV
                    </Button>
                </div>

                {/* Stats Cards */}
                <div className="grid gap-4 md:grid-cols-5">
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
                            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                Paid
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-green-600">{stats.paid}</div>
                            <p className="text-xs text-gray-500 mt-1">
                                ₵{stats.paidAmount.toFixed(2)}
                            </p>
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
                            <p className="text-xs text-gray-500 mt-1">
                                ₵{stats.pendingAmount.toFixed(2)}
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="border-2">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-blue-600" />
                                Total Revenue
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-blue-600">₵{stats.totalAmount.toFixed(2)}</div>
                            <p className="text-xs text-gray-500 mt-1">
                                Expected total
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="border-2">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-purple-600" />
                                Collection Rate
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-purple-600">
                                {stats.totalAmount > 0 ? Math.round((stats.paidAmount / stats.totalAmount) * 100) : 0}%
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                {stats.paidAmount.toFixed(2)} / {stats.totalAmount.toFixed(2)}
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
                                    placeholder="Search name, email, phone..."
                                    className="pl-8"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <Select value={paymentFilter} onValueChange={(v: any) => setPaymentFilter(v)}>
                                <SelectTrigger className="w-[180px]">
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
                            <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                                <span className="text-sm font-medium text-gray-700">
                                    {selectedIds.size} selected
                                </span>
                                <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
                                    <DialogTrigger asChild>
                                        <Button size="sm" variant="outline">
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
                                    onClick={() => setSelectedIds(new Set())}
                                >
                                    Clear Selection
                                </Button>
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
                                                        "hover:bg-gray-50 transition-colors",
                                                        selectedIds.has(reg.id) && "bg-blue-50"
                                                    )}
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
                                                                <div className="text-sm text-gray-600">{reg.email}</div>
                                                            )}
                                                            {reg.phone && (
                                                                <div className="text-sm text-gray-600">{reg.phone}</div>
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
                                                                reg.payment_status === 'paid' || reg.payment_status === 'confirmed'
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
                                                    <TableCell className="text-xs text-gray-600">
                                                        {reg.payment_date
                                                            ? new Date(reg.payment_date).toLocaleDateString()
                                                            : '-'}
                                                    </TableCell>
                                                    <TableCell onClick={(e) => e.stopPropagation()}>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
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
