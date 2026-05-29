'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { EmailService } from '@/lib/services/email-service'
import { getCampCommunications, recordCampCommunication } from '@/lib/actions/camp'
import { CampRegistration, CampCommunication } from '@/lib/types'
import { useCampRegistrations } from '@/lib/hooks/use-camp'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { LoadingSpinner } from '@/components/ui/loading'
import { useToast } from '@/hooks/use-toast'
import { CampAdminPageHeader } from '@/components/camp/camp-admin-page-header'
import { useAuth } from '@/components/providers'
import {
    Send, ArrowLeft, Mail, MessageSquare, Users, Filter,
    Search, CheckCircle2, XCircle, Clock, AlertCircle,
    Phone, FileText, Eye, RefreshCw
} from 'lucide-react'
import { cn } from '@/lib/utils'

const emailService = new EmailService()

export default function BulkCommunicationsPage() {
    const router = useRouter()
    const { toast } = useToast()
    const { user, loading: authLoading } = useAuth()
    const { registrations, campYear, loading: registrationsLoading, refresh: refreshRegistrations } = useCampRegistrations()
    const [communications, setCommunications] = useState<CampCommunication[]>([])
    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)

    // Filters
    const [roleFilter, setRoleFilter] = useState('all')
    const [statusFilter, setStatusFilter] = useState('all')
    const [paymentFilter, setPaymentFilter] = useState('all')
    const [typeFilter, setTypeFilter] = useState('all')
    const [searchQuery, setSearchQuery] = useState('')

    // Message form
    const [communicationType, setCommunicationType] = useState<'email' | 'sms'>('email')
    const [subject, setSubject] = useState('')
    const [messageBody, setMessageBody] = useState('')
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [selectAll, setSelectAll] = useState(false)

    // Redirect to auth if not logged in
    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/auth?redirect=' + encodeURIComponent('/admin/camp-meeting/communications'))
        }
    }, [user, authLoading, router])

    useEffect(() => {
        if (campYear) {
            loadCommunications()
        }
    }, [campYear])

    async function loadCommunications() {
        if (!campYear) return
        try {
            setLoading(true)
            const { data, error } = await getCampCommunications(campYear.id)
            if (error) {
                throw new Error(error)
            }
            setCommunications(data ?? [])
        } catch (error) {
            console.error('Error loading communications:', error)
        } finally {
            setLoading(false)
        }
    }

    const filteredRegistrations = useMemo(() => registrations.filter(reg => {
        const matchesSearch = !searchQuery ||
            reg.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            reg.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            reg.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            `${reg.first_name} ${reg.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())

        const matchesRole = roleFilter === 'all' || reg.role === roleFilter
        const matchesStatus = statusFilter === 'all' || reg.status === statusFilter
        const matchesPayment = paymentFilter === 'all' || reg.payment_status === paymentFilter
        const matchesType = typeFilter === 'all' ||
            (typeFilter === 'new' && reg.is_new_registrant) ||
            (typeFilter === 'returning' && !reg.is_new_registrant)

        return matchesSearch && matchesRole && matchesStatus && matchesPayment && matchesType
    }), [registrations, searchQuery, roleFilter, statusFilter, paymentFilter, typeFilter])

    const filteredRegistrationIds = useMemo(
        () => filteredRegistrations.map((registration) => registration.id),
        [filteredRegistrations]
    )

    // Auto-select all filtered when selectAll is true
    useEffect(() => {
        if (selectAll) {
            setSelectedIds(new Set(filteredRegistrationIds))
        } else {
            setSelectedIds(new Set())
        }
    }, [selectAll, filteredRegistrationIds])

    const handleSelectAll = (checked: boolean) => {
        setSelectAll(checked)
    }

    const handleSelectOne = (id: string, checked: boolean) => {
        const newSelected = new Set(selectedIds)
        if (checked) {
            newSelected.add(id)
        } else {
            newSelected.delete(id)
        }
        setSelectedIds(newSelected)
        setSelectAll(newSelected.size === filteredRegistrations.length)
    }

    const replaceTemplateVariables = (template: string, registration: CampRegistration): string => {
        return template
            .replace(/{{name}}/g, registration.full_name || `${registration.first_name} ${registration.last_name}`)
            .replace(/{{firstName}}/g, registration.first_name || '')
            .replace(/{{lastName}}/g, registration.last_name || '')
            .replace(/{{role}}/g, registration.role || 'Participant')
            .replace(/{{campYear}}/g, campYear?.year?.toString() || new Date().getFullYear().toString())
            .replace(/{{phone}}/g, registration.phone || '')
            .replace(/{{email}}/g, registration.email || '')
            .replace(/{{qrCode}}/g, registration.qr_code || '')
    }

    const handleSend = async () => {
        if (!campYear || !user) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Please log in to send communications'
            })
            return
        }

        if (selectedIds.size === 0) {
            toast({
                variant: 'destructive',
                title: 'No Recipients',
                description: 'Please select at least one recipient'
            })
            return
        }

        if (communicationType === 'email' && !subject.trim()) {
            toast({
                variant: 'destructive',
                title: 'Missing Subject',
                description: 'Email subject is required'
            })
            return
        }

        if (!messageBody.trim()) {
            toast({
                variant: 'destructive',
                title: 'Empty Message',
                description: 'Please enter a message'
            })
            return
        }

        setSending(true)
        const selectedRegistrations = filteredRegistrations.filter(r => selectedIds.has(r.id))
        let successCount = 0
        let errorCount = 0
        const errors: string[] = []

        try {
            for (const registration of selectedRegistrations) {
                try {
                    const personalizedMessage = replaceTemplateVariables(messageBody, registration)
                    const personalizedSubject = subject ? replaceTemplateVariables(subject, registration) : ''

                    if (communicationType === 'email') {
                        if (!registration.email) {
                            errors.push(`${registration.full_name}: No email address`)
                            errorCount++
                            continue
                        }

                        const result = await emailService.sendEmail({
                            to: registration.email,
                            subject: personalizedSubject,
                            text: personalizedMessage,
                            html: `<p>${personalizedMessage.replace(/\n/g, '<br>')}</p>`,
                            camp_year_id: campYear.id,
                            sender_id: user.id,
                            recipient_registration_id: registration.id
                        })

                        if (result.success) {
                            successCount++
                        } else {
                            errors.push(`${registration.full_name}: ${result.error || 'Failed to send'}`)
                            errorCount++
                        }
                    } else {
                        // SMS
                        if (!registration.phone) {
                            errors.push(`${registration.full_name}: No phone number`)
                            errorCount++
                            continue
                        }

                        const logged = await recordCampCommunication({
                            camp_year_id: campYear.id,
                            communication_type: 'sms',
                            sender_id: user.id,
                            recipient_type: 'individual',
                            recipient_registration_id: registration.id,
                            recipient_phone: registration.phone,
                            message_body: personalizedMessage,
                            status: 'sent',
                            sent_at: new Date().toISOString(),
                        })

                        if (logged.error) {
                            errors.push(`${registration.full_name}: ${logged.error}`)
                            errorCount++
                            continue
                        }

                        successCount++
                    }
                } catch (error: any) {
                    errors.push(`${registration.full_name}: ${error.message}`)
                    errorCount++
                }
            }

            toast({
                title: 'Messages Sent',
                description: `Successfully sent to ${successCount} recipient(s). ${errorCount > 0 ? `${errorCount} failed.` : ''}`,
            })

            // Clear form and selection
            setSelectedIds(new Set())
            setSelectAll(false)
            setMessageBody('')
            setSubject('')

            // Reload communications history and refresh registrations
            await loadCommunications()
            await refreshRegistrations()
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.message || 'Failed to send messages'
            })
        } finally {
            setSending(false)
        }
    }

    const uniqueRoles = Array.from(new Set((registrations || []).map(r => r.role).filter(Boolean)))
    const recipients = filteredRegistrations.filter(r => selectedIds.has(r.id))
    const canSendEmail = recipients.filter(r => r.email).length
    const canSendSMS = recipients.filter(r => r.phone).length

    if (loading || registrationsLoading) {
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
                <CampAdminPageHeader title="Bulk Communications" campYear={campYear} />

                <Tabs defaultValue="send" className="space-y-6">
                    <TabsList>
                        <TabsTrigger value="send">
                            <Send className="mr-2 h-4 w-4" />
                            Send Messages
                        </TabsTrigger>
                        <TabsTrigger value="history">
                            <FileText className="mr-2 h-4 w-4" />
                            Communication History
                        </TabsTrigger>
                    </TabsList>

                    {/* Send Messages Tab */}
                    <TabsContent value="send" className="space-y-6">
                        {/* Filters */}
                        <Card className="border-2">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Filter className="h-5 w-5" />
                                    Filter Recipients
                                </CardTitle>
                                <CardDescription>
                                    Select criteria to filter registrations
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                                    <div className="space-y-2">
                                        <Label>Search</Label>
                                        <div className="relative">
                                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                placeholder="Search name, email, phone..."
                                                className="pl-8"
                                                value={searchQuery}
                                                onChange={e => setSearchQuery(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Role" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Roles</SelectItem>
                                            {uniqueRoles.map(r => (
                                                <SelectItem key={r} value={r}>{r}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Status</SelectItem>
                                            <SelectItem value="registered">Registered</SelectItem>
                                            <SelectItem value="checked_in">Checked In</SelectItem>
                                            <SelectItem value="cancelled">Cancelled</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Payment" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Payments</SelectItem>
                                            <SelectItem value="pending">Pending</SelectItem>
                                            <SelectItem value="paid">Paid</SelectItem>
                                            <SelectItem value="confirmed">Confirmed</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Types</SelectItem>
                                            <SelectItem value="new">New</SelectItem>
                                            <SelectItem value="returning">Returning</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="mt-4 flex items-center justify-between pt-4 border-t">
                                    <div>
                                        <p className="text-sm font-medium text-gray-700">
                                            {filteredRegistrations.length} registration(s) match your filters
                                        </p>
                                        {selectedIds.size > 0 && (
                                            <p className="text-sm text-gray-600 mt-1">
                                                {selectedIds.size} selected
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            id="select-all"
                                            checked={selectAll}
                                            onCheckedChange={handleSelectAll}
                                        />
                                        <Label htmlFor="select-all" className="text-sm cursor-pointer">
                                            Select All
                                        </Label>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Recipients List */}
                        {filteredRegistrations.length > 0 && (
                            <Card className="border-2">
                                <CardHeader>
                                    <CardTitle>Select Recipients</CardTitle>
                                    <CardDescription>
                                        Check the boxes to select recipients. Selected: {selectedIds.size} / {filteredRegistrations.length}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="max-h-[300px] overflow-y-auto space-y-2">
                                        {filteredRegistrations.map(reg => (
                                            <div
                                                key={reg.id}
                                                className={cn(
                                                    "flex items-center gap-3 p-3 rounded-lg border-2 transition-colors",
                                                    selectedIds.has(reg.id) ? "bg-blue-50 border-blue-300" : "bg-white border-gray-200"
                                                )}
                                            >
                                                <Checkbox
                                                    checked={selectedIds.has(reg.id)}
                                                    onCheckedChange={(checked) => handleSelectOne(reg.id, checked === true)}
                                                />
                                                <div className="flex-1">
                                                    <p className="font-medium text-gray-900">
                                                        {reg.full_name || `${reg.first_name} ${reg.last_name}`}
                                                    </p>
                                                    <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                                                        {reg.email && (
                                                            <div className="flex items-center gap-1">
                                                                <Mail className="h-3 w-3" />
                                                                <span>{reg.email}</span>
                                                            </div>
                                                        )}
                                                        {reg.phone && (
                                                            <div className="flex items-center gap-1">
                                                                <Phone className="h-3 w-3" />
                                                                <span>{reg.phone}</span>
                                                            </div>
                                                        )}
                                                        <Badge variant="outline" className="text-xs">
                                                            {reg.role}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Message Form */}
                        <Card className="border-2">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    {communicationType === 'email' ? (
                                        <Mail className="h-5 w-5" />
                                    ) : (
                                        <MessageSquare className="h-5 w-5" />
                                    )}
                                    Compose Message
                                </CardTitle>
                                <CardDescription>
                                    {selectedIds.size > 0 
                                        ? `Sending to ${selectedIds.size} recipient(s)`
                                        : 'Select recipients above to send messages'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <Label>Communication Type</Label>
                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            variant={communicationType === 'email' ? 'default' : 'outline'}
                                            onClick={() => setCommunicationType('email')}
                                        >
                                            <Mail className="mr-2 h-4 w-4" />
                                            Email
                                            {selectedIds.size > 0 && (
                                                <Badge variant="secondary" className="ml-2">
                                                    {canSendEmail}
                                                </Badge>
                                            )}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant={communicationType === 'sms' ? 'default' : 'outline'}
                                            onClick={() => setCommunicationType('sms')}
                                        >
                                            <MessageSquare className="mr-2 h-4 w-4" />
                                            SMS
                                            {selectedIds.size > 0 && (
                                                <Badge variant="secondary" className="ml-2">
                                                    {canSendSMS}
                                                </Badge>
                                            )}
                                        </Button>
                                    </div>
                                </div>

                                {communicationType === 'email' && (
                                    <div className="space-y-2">
                                        <Label htmlFor="subject">Subject *</Label>
                                        <Input
                                            id="subject"
                                            required
                                            value={subject}
                                            onChange={e => setSubject(e.target.value)}
                                            placeholder="Email subject line"
                                        />
                                        <p className="text-xs text-gray-500">
                                            You can use template variables: {`{{name}}`}, {`{{role}}`}, {`{{campYear}}`}
                                        </p>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label htmlFor="message">Message Body *</Label>
                                    <Textarea
                                        id="message"
                                        required
                                        value={messageBody}
                                        onChange={e => setMessageBody(e.target.value)}
                                        placeholder={
                                            communicationType === 'email'
                                                ? 'Email message...'
                                                : 'SMS message (160 characters recommended)...'
                                        }
                                        rows={8}
                                        maxLength={communicationType === 'sms' ? 1600 : undefined}
                                    />
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs text-gray-500">
                                            Template variables: {`{{name}}`}, {`{{firstName}}`}, {`{{lastName}}`}, {`{{role}}`}, {`{{campYear}}`}, {`{{phone}}`}, {`{{email}}`}, {`{{qrCode}}`}
                                        </p>
                                        {communicationType === 'sms' && (
                                            <p className="text-xs text-gray-500">
                                                {messageBody.length} / 160 characters
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {selectedIds.size > 0 && (
                                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                                        <p className="text-sm font-medium text-blue-900 mb-2">
                                            Ready to send to {selectedIds.size} recipient(s)
                                        </p>
                                        <div className="text-xs text-blue-700 space-y-1">
                                            {communicationType === 'email' && (
                                                <p>• {canSendEmail} recipients have email addresses</p>
                                            )}
                                            {communicationType === 'sms' && (
                                                <p>• {canSendSMS} recipients have phone numbers</p>
                                            )}
                                            {communicationType === 'email' && canSendEmail < selectedIds.size && (
                                                <p className="text-orange-600">
                                                    ⚠️ {selectedIds.size - canSendEmail} recipients will be skipped (no email)
                                                </p>
                                            )}
                                            {communicationType === 'sms' && canSendSMS < selectedIds.size && (
                                                <p className="text-orange-600">
                                                    ⚠️ {selectedIds.size - canSendSMS} recipients will be skipped (no phone)
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <Button
                                    onClick={handleSend}
                                    disabled={sending || selectedIds.size === 0 || !messageBody.trim() || (communicationType === 'email' && !subject.trim())}
                                    className="w-full"
                                    size="lg"
                                >
                                    {sending ? (
                                        <>
                                            <LoadingSpinner size="sm" className="mr-2" />
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="mr-2 h-4 w-4" />
                                            Send {selectedIds.size} {communicationType === 'email' ? 'Email(s)' : 'SMS'}
                                        </>
                                    )}
                                </Button>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Communication History Tab */}
                    <TabsContent value="history" className="space-y-6">
                        <Card className="border-2">
                            <CardHeader className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <FileText className="h-5 w-5" />
                                        Communication History
                                    </CardTitle>
                                    <CardDescription>
                                        Recent {communications.length} communications
                                    </CardDescription>
                                </div>
                                <Button variant="outline" size="sm" onClick={loadCommunications}>
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Refresh
                                </Button>
                            </CardHeader>
                            <CardContent>
                                {communications.length === 0 ? (
                                    <div className="text-center py-12 text-gray-500">
                                        <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                        <p>No communications sent yet</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {communications.map(comm => (
                                            <div
                                                key={comm.id}
                                                className="p-4 border-2 rounded-lg bg-white hover:shadow-md transition-shadow"
                                            >
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex items-center gap-3">
                                                        {comm.communication_type === 'email' ? (
                                                            <div className="p-2 bg-blue-100 rounded-lg">
                                                                <Mail className="h-5 w-5 text-blue-600" />
                                                            </div>
                                                        ) : (
                                                            <div className="p-2 bg-green-100 rounded-lg">
                                                                <MessageSquare className="h-5 w-5 text-green-600" />
                                                            </div>
                                                        )}
                                                        <div>
                                                            <p className="font-semibold text-gray-900">
                                                                {comm.communication_type === 'email'
                                                                    ? comm.recipient_email || 'Bulk Email'
                                                                    : comm.recipient_phone || 'Bulk SMS'}
                                                            </p>
                                                            {comm.subject && (
                                                                <p className="text-sm text-gray-600 mt-1">{comm.subject}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <Badge
                                                        variant={
                                                            comm.status === 'sent' || comm.status === 'delivered'
                                                                ? 'default'
                                                                : comm.status === 'failed' || comm.status === 'bounced'
                                                                ? 'destructive'
                                                                : 'outline'
                                                        }
                                                    >
                                                        {comm.status}
                                                    </Badge>
                                                </div>

                                                <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md mb-3">
                                                    {comm.message_body}
                                                </div>

                                                <div className="flex items-center justify-between text-xs text-gray-500">
                                                    <div className="flex items-center gap-4">
                                                        <div className="flex items-center gap-1">
                                                            <Clock className="h-3 w-3" />
                                                            <span>
                                                                {new Date(comm.created_at).toLocaleString()}
                                                            </span>
                                                        </div>
                                                        {comm.recipient_registration && (
                                                            <div className="flex items-center gap-1">
                                                                <Users className="h-3 w-3" />
                                                                <span>
                                                                    {(comm.recipient_registration as any).full_name || 'Recipient'}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {comm.sender && (
                                                            <div className="flex items-center gap-1">
                                                                <Eye className="h-3 w-3" />
                                                                <span>By: {comm.sender.full_name}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {comm.recipient_type === 'bulk' && (
                                                        <Badge variant="outline" className="text-xs">
                                                            Bulk Send
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}
