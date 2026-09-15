'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { EmailService } from '@/lib/services/email-service'
import { getCampCommunications, resendCampCommunicationAction, sendCampBulkSmsAction } from '@/lib/actions/camp'
import { getCommsProviderStatusAction } from '@/lib/actions/comms'
import { CampRegistration, CampCommunication } from '@/lib/types'
import { isValidSmsPhone } from '@/lib/comms/sms-client'
import {
  CAMP_MESSAGE_TEMPLATES,
  CAMP_TEMPLATE_VARIABLE_CHIPS,
  personalizeCampMessage,
  type CampMessageTemplateId,
} from '@/lib/camp/sms-templates'
import {
  SmsProviderBanner,
  type SmsProviderStatus,
  commsMetaBadge,
} from '@/components/comms/sms-provider-banner'
import { useCampRegistrations } from '@/lib/hooks/use-camp'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, ScrollableTabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { LoadingSpinner } from '@/components/ui/loading'
import { useToast } from '@/hooks/use-toast'
import { CampAdminPageHeader } from '@/components/camp/camp-admin-page-header'
import { useAuth } from '@/components/providers'
import {
    Send, Mail, MessageSquare, Users, Filter,
    Search, Clock, Phone, FileText, Eye, RefreshCw, AlertTriangle, LayoutTemplate
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
    const [smsStatus, setSmsStatus] = useState<SmsProviderStatus | null>(null)
    const [dryRun, setDryRun] = useState(false)
    const [forceMock, setForceMock] = useState(false)
    const [resendingId, setResendingId] = useState<string | null>(null)
    const [templateId, setTemplateId] = useState<CampMessageTemplateId | 'custom'>('custom')

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
        void getCommsProviderStatusAction().then((res) => {
            if (res.data) setSmsStatus(res.data)
        })
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
            console.error('Error loading communications', error)
        } finally {
            setLoading(false)
        }
    }

    async function handleResend(comm: CampCommunication) {
        if (!user?.id || !campYear) return
        const canResend =
            comm.status === 'sent' ||
            comm.status === 'delivered' ||
            comm.status === 'failed' ||
            comm.status === 'bounced'
        if (!canResend) return
        if (comm.communication_type === 'sms' && !comm.recipient_phone) return
        if (comm.communication_type === 'email' && !comm.recipient_email) return

        setResendingId(comm.id)
        const { data, error } = await resendCampCommunicationAction({
            sender_id: user.id,
            camp_year_id: campYear.id,
            camp_year: campYear.year,
            communication: {
                id: comm.id,
                communication_type: comm.communication_type,
                recipient_registration_id: comm.recipient_registration_id,
                recipient_email: comm.recipient_email,
                recipient_phone: comm.recipient_phone,
                subject: comm.subject,
                message_body: comm.message_body,
                status: comm.status,
                recipient_name:
                    (comm.recipient_registration as { full_name?: string } | undefined)?.full_name ??
                    null,
            },
        })
        setResendingId(null)

        if (error || !data?.success) {
            toast({
                variant: 'destructive',
                title: 'Resend failed',
                description: error ?? 'Could not deliver',
            })
            return
        }

        toast({
            title: 'Message resent',
            description:
                data.provider != null
                    ? `Sent via ${data.provider}`
                    : 'A new message was logged in history',
        })
        await loadCommunications()
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
        return personalizeCampMessage(template, {
            fullName: registration.full_name,
            firstName: registration.first_name,
            lastName: registration.last_name,
            role: registration.role,
            campYear: campYear?.year,
            phone: registration.phone,
            email: registration.email,
            checkInCode: registration.check_in_code,
            qrCode: registration.check_in_code || registration.qr_code,
            theme: campYear?.theme,
            venue: campYear?.venue,
        })
    }

    function applyTemplate(id: CampMessageTemplateId | 'custom') {
        setTemplateId(id)
        if (id === 'custom') return
        const tpl = CAMP_MESSAGE_TEMPLATES.find((t) => t.id === id)
        if (!tpl) return
        if (tpl.channel === 'email' || tpl.channel === 'both') {
            if (tpl.subject) setSubject(tpl.subject)
        }
        setMessageBody(tpl.body)
        if (tpl.channel === 'sms') setCommunicationType('sms')
        else if (tpl.channel === 'email') setCommunicationType('email')
    }

    function insertVariable(key: string) {
        const token = `{{${key}}}`
        setMessageBody((prev) => (prev ? `${prev}${prev.endsWith(' ') ? '' : ' '}${token}` : token))
        setTemplateId('custom')
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
            if (communicationType === 'sms') {
                const bulk = await sendCampBulkSmsAction({
                    camp_year_id: campYear.id,
                    sender_id: user.id,
                    message_template: messageBody,
                    camp_year: campYear.year,
                    dry_run: dryRun,
                    force_mock: forceMock,
                    filter_criteria: {
                        role: roleFilter,
                        status: statusFilter,
                        payment: paymentFilter,
                        type: typeFilter,
                        search: searchQuery || undefined,
                    },
                    recipients: selectedRegistrations.map((r) => ({
                        id: r.id,
                        full_name: r.full_name,
                        first_name: r.first_name,
                        last_name: r.last_name,
                        phone: r.phone,
                        email: r.email,
                        role: r.role,
                        qr_code: r.qr_code,
                    })),
                })
                if (bulk.error || !bulk.data) {
                    throw new Error(bulk.error ?? 'Failed to send SMS')
                }
                successCount = bulk.data.success_count
                errorCount = bulk.data.error_count
                errors.push(...bulk.data.errors)
            } else {
                for (const registration of selectedRegistrations) {
                    try {
                        const personalizedMessage = replaceTemplateVariables(messageBody, registration)
                        const personalizedSubject = subject
                            ? replaceTemplateVariables(subject, registration)
                            : ''

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
                            recipient_registration_id: registration.id,
                        })

                        if (result.success) {
                            successCount++
                        } else {
                            errors.push(`${registration.full_name}: ${result.error || 'Failed to send'}`)
                            errorCount++
                        }
                    } catch (error: unknown) {
                        const message = error instanceof Error ? error.message : 'Failed to send'
                        errors.push(`${registration.full_name}: ${message}`)
                        errorCount++
                    }
                }
            }

            toast({
                title:
                    errorCount > 0 && successCount === 0
                        ? 'Send failed'
                        : dryRun && communicationType === 'sms'
                          ? 'Dry run complete'
                          : 'Messages Sent',
                variant: errorCount > 0 && successCount === 0 ? 'destructive' : 'default',
                description: `Successfully sent to ${successCount} recipient(s). ${errorCount > 0 ? `${errorCount} failed.` : ''}${
                    errors.length ? ` ${errors.slice(0, 3).join(' · ')}` : ''
                }`,
            })

            // Clear form and selection
            setSelectedIds(new Set())
            setSelectAll(false)
            setMessageBody('')
            setSubject('')

            // Reload communications history and refresh registrations
            await loadCommunications()
            await refreshRegistrations()
        } catch (error: unknown) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error instanceof Error ? error.message : 'Failed to send messages',
            })
        } finally {
            setSending(false)
        }
    }

    const uniqueRoles = Array.from(new Set((registrations || []).map(r => r.role).filter(Boolean)))
    const recipients = filteredRegistrations.filter(r => selectedIds.has(r.id))
    const canSendEmail = recipients.filter(r => r.email).length
    const canSendSMS = recipients.filter((r) => isValidSmsPhone(r.phone)).length
    const invalidSmsPhones = recipients.filter((r) => r.phone && !isValidSmsPhone(r.phone)).length
    const missingSmsPhones = recipients.filter((r) => !r.phone?.trim()).length

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
            <div className="mx-auto max-w-7xl space-y-6 px-3 py-4 sm:p-6">
                <CampAdminPageHeader title="Bulk Communications" campYear={campYear} />

                <SmsProviderBanner
                    status={smsStatus}
                    dryRun={dryRun}
                    onDryRunChange={setDryRun}
                    forceMock={forceMock}
                    onForceMockChange={setForceMock}
                    senderId={user?.id}
                />

                <Tabs defaultValue="send" className="space-y-6">
                    <ScrollableTabsList>
                        <TabsTrigger value="send">
                            <Send className="mr-2 h-4 w-4 shrink-0" />
                            Send
                        </TabsTrigger>
                        <TabsTrigger value="history">
                            <FileText className="mr-2 h-4 w-4 shrink-0" />
                            History
                        </TabsTrigger>
                    </ScrollableTabsList>

                    {/* Send Messages Tab */}
                    <TabsContent value="send" className="space-y-6">
                        {/* Filters */}
                        <Card className="border border-slate-200 shadow-sm">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Filter className="h-5 w-5 text-slate-600" aria-hidden />
                                    Filter Recipients
                                </CardTitle>
                                <CardDescription>
                                    Narrow who appears in the list below
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                                    <div className="space-y-2">
                                        <Label htmlFor="camp-comms-search">Search</Label>
                                        <div className="relative">
                                            <Search
                                                className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                                                aria-hidden
                                            />
                                            <Input
                                                id="camp-comms-search"
                                                placeholder="Name, email, or phone"
                                                className="h-11 pl-8"
                                                value={searchQuery}
                                                onChange={e => setSearchQuery(e.target.value)}
                                                aria-label="Search registrations"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="camp-comms-role">Role</Label>
                                        <Select value={roleFilter} onValueChange={setRoleFilter}>
                                            <SelectTrigger id="camp-comms-role" className="h-11">
                                                <SelectValue placeholder="Role" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Roles</SelectItem>
                                                {uniqueRoles.map(r => (
                                                    <SelectItem key={r} value={r}>{r}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="camp-comms-status">Status</Label>
                                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                                            <SelectTrigger id="camp-comms-status" className="h-11">
                                                <SelectValue placeholder="Status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Status</SelectItem>
                                                <SelectItem value="registered">Registered</SelectItem>
                                                <SelectItem value="checked_in">Checked In</SelectItem>
                                                <SelectItem value="cancelled">Cancelled</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="camp-comms-payment">Payment</Label>
                                        <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                                            <SelectTrigger id="camp-comms-payment" className="h-11">
                                                <SelectValue placeholder="Payment" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Payments</SelectItem>
                                                <SelectItem value="pending">Pending</SelectItem>
                                                <SelectItem value="paid">Paid</SelectItem>
                                                <SelectItem value="confirmed">Confirmed</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="camp-comms-type">Type</Label>
                                        <Select value={typeFilter} onValueChange={setTypeFilter}>
                                            <SelectTrigger id="camp-comms-type" className="h-11">
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

                                <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-slate-800">
                                            {filteredRegistrations.length} match
                                            {selectedIds.size > 0 ? ` · ${selectedIds.size} selected` : ''}
                                        </p>
                                    </div>
                                    <div className="flex min-h-11 items-center gap-2">
                                        <Checkbox
                                            id="select-all"
                                            checked={selectAll}
                                            onCheckedChange={handleSelectAll}
                                        />
                                        <Label htmlFor="select-all" className="cursor-pointer text-sm">
                                            Select all matching
                                        </Label>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Recipients List */}
                        {filteredRegistrations.length > 0 && (
                            <Card className="border border-slate-200 shadow-sm">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Users className="h-5 w-5 text-slate-600" aria-hidden />
                                        Select Recipients
                                    </CardTitle>
                                    <CardDescription>
                                        Tap a row to select. {selectedIds.size} of {filteredRegistrations.length} selected.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div
                                        className="max-h-[320px] space-y-2 overflow-y-auto pr-1"
                                        role="listbox"
                                        aria-label="Camp registration recipients"
                                        aria-multiselectable="true"
                                    >
                                        {filteredRegistrations.map(reg => {
                                            const selected = selectedIds.has(reg.id)
                                            const label =
                                                reg.full_name ||
                                                `${reg.first_name ?? ''} ${reg.last_name ?? ''}`.trim() ||
                                                'Recipient'
                                            return (
                                            <button
                                                key={reg.id}
                                                type="button"
                                                role="option"
                                                aria-selected={selected}
                                                onClick={() => handleSelectOne(reg.id, !selected)}
                                                className={cn(
                                                    'flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors duration-200',
                                                    selected
                                                        ? 'border-emerald-300 bg-emerald-50/80'
                                                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                                                )}
                                            >
                                                <Checkbox
                                                    checked={selected}
                                                    onCheckedChange={(checked) =>
                                                        handleSelectOne(reg.id, checked === true)
                                                    }
                                                    onClick={(e) => e.stopPropagation()}
                                                    aria-label={`Select ${label}`}
                                                    className="shrink-0"
                                                />
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate font-medium text-slate-900">
                                                        {label}
                                                    </p>
                                                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
                                                        {reg.email ? (
                                                            <span className="inline-flex items-center gap-1 truncate">
                                                                <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                                                {reg.email}
                                                            </span>
                                                        ) : null}
                                                        {reg.phone ? (
                                                            <span className="inline-flex items-center gap-1">
                                                                <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                                                {reg.phone}
                                                            </span>
                                                        ) : null}
                                                        <Badge variant="outline" className="text-xs">
                                                            {reg.role}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </button>
                                            )
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Message Form */}
                        <Card className="border border-slate-200 shadow-sm">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    {communicationType === 'email' ? (
                                        <Mail className="h-5 w-5 text-slate-600" aria-hidden />
                                    ) : (
                                        <MessageSquare className="h-5 w-5 text-emerald-600" aria-hidden />
                                    )}
                                    Compose Message
                                </CardTitle>
                                <CardDescription>
                                    {selectedIds.size > 0
                                        ? `Ready for ${selectedIds.size} recipient${selectedIds.size === 1 ? '' : 's'} — names and codes inject automatically.`
                                        : 'Pick a template, then select recipients above.'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-5">
                                <div className="space-y-2">
                                    <Label id="camp-comms-channel-label">Channel</Label>
                                    <div
                                        className="flex flex-wrap gap-2"
                                        role="group"
                                        aria-labelledby="camp-comms-channel-label"
                                    >
                                        <Button
                                            type="button"
                                            variant={communicationType === 'email' ? 'default' : 'outline'}
                                            className="min-h-11 cursor-pointer transition-colors duration-200"
                                            aria-pressed={communicationType === 'email'}
                                            onClick={() => setCommunicationType('email')}
                                        >
                                            <Mail className="mr-2 h-4 w-4" aria-hidden />
                                            Email
                                            {selectedIds.size > 0 ? (
                                                <Badge variant="secondary" className="ml-2">
                                                    {canSendEmail}
                                                </Badge>
                                            ) : null}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant={communicationType === 'sms' ? 'default' : 'outline'}
                                            className="min-h-11 cursor-pointer transition-colors duration-200"
                                            aria-pressed={communicationType === 'sms'}
                                            onClick={() => setCommunicationType('sms')}
                                        >
                                            <MessageSquare className="mr-2 h-4 w-4" aria-hidden />
                                            SMS
                                            {selectedIds.size > 0 ? (
                                                <Badge variant="secondary" className="ml-2">
                                                    {canSendSMS}
                                                </Badge>
                                            ) : null}
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2">
                                        <LayoutTemplate className="h-4 w-4 text-slate-500" aria-hidden />
                                        Message template
                                    </Label>
                                    <div
                                        className="grid gap-2 sm:grid-cols-2"
                                        role="listbox"
                                        aria-label="Message templates"
                                    >
                                        <button
                                            type="button"
                                            role="option"
                                            aria-selected={templateId === 'custom'}
                                            onClick={() => applyTemplate('custom')}
                                            className={cn(
                                                'min-h-14 cursor-pointer rounded-lg border px-3 py-2.5 text-left transition-colors duration-200',
                                                templateId === 'custom'
                                                    ? 'border-slate-900 bg-slate-900 text-white'
                                                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                                            )}
                                        >
                                            <p className="text-sm font-medium">Custom message</p>
                                            <p
                                                className={cn(
                                                    'mt-0.5 text-xs',
                                                    templateId === 'custom' ? 'text-slate-300' : 'text-slate-500'
                                                )}
                                            >
                                                Write freely or start from a preset
                                            </p>
                                        </button>
                                        {CAMP_MESSAGE_TEMPLATES.filter(
                                            (t) => t.channel === 'both' || t.channel === communicationType
                                        ).map((t) => {
                                            const active = templateId === t.id
                                            return (
                                                <button
                                                    key={t.id}
                                                    type="button"
                                                    role="option"
                                                    aria-selected={active}
                                                    onClick={() => applyTemplate(t.id)}
                                                    className={cn(
                                                        'min-h-14 cursor-pointer rounded-lg border px-3 py-2.5 text-left transition-colors duration-200',
                                                        active
                                                            ? 'border-emerald-600 bg-emerald-50 ring-1 ring-emerald-600/30'
                                                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                                                    )}
                                                >
                                                    <p className="text-sm font-medium text-slate-900">{t.label}</p>
                                                    <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
                                                        {t.description}
                                                    </p>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>

                                {communicationType === 'email' ? (
                                    <div className="space-y-2">
                                        <Label htmlFor="subject">Subject</Label>
                                        <Input
                                            id="subject"
                                            required
                                            className="h-11"
                                            value={subject}
                                            onChange={(e) => {
                                                setSubject(e.target.value)
                                                setTemplateId('custom')
                                            }}
                                            placeholder="Email subject line"
                                        />
                                    </div>
                                ) : null}

                                <div className="space-y-2">
                                    <Label htmlFor="message">Message</Label>
                                    <Textarea
                                        id="message"
                                        required
                                        value={messageBody}
                                        onChange={(e) => {
                                            setMessageBody(e.target.value)
                                            setTemplateId('custom')
                                        }}
                                        placeholder={
                                            communicationType === 'email'
                                                ? 'Write your email… Use Insert chips below for personalization.'
                                                : 'Write your SMS… Keep it short; variables expand per person.'
                                        }
                                        rows={7}
                                        maxLength={communicationType === 'sms' ? 1600 : undefined}
                                        className="min-h-[140px] resize-y"
                                    />
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-xs font-medium text-slate-600">Insert:</span>
                                        {CAMP_TEMPLATE_VARIABLE_CHIPS.map((chip) => (
                                            <button
                                                key={chip.key}
                                                type="button"
                                                onClick={() => insertVariable(chip.key)}
                                                className="inline-flex min-h-9 cursor-pointer items-center rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 transition-colors duration-150 hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                                                aria-label={`Insert ${chip.label} variable`}
                                            >
                                                {chip.label}
                                            </button>
                                        ))}
                                        {communicationType === 'sms' ? (
                                            <span
                                                className={cn(
                                                    'ml-auto text-xs tabular-nums',
                                                    messageBody.length > 160 ? 'font-medium text-amber-700' : 'text-slate-500'
                                                )}
                                            >
                                                {messageBody.length} chars
                                                {messageBody.length > 160 ? ' · may split' : ''}
                                            </span>
                                        ) : null}
                                    </div>
                                </div>

                                {messageBody.trim() && filteredRegistrations[0] ? (
                                    <div
                                        className="rounded-lg border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4"
                                        aria-live="polite"
                                    >
                                        <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-900">
                                            <Eye className="h-4 w-4 text-slate-500" aria-hidden />
                                            Live preview
                                            <span className="font-normal text-slate-500">
                                                (
                                                {(
                                                    filteredRegistrations.find((r) => selectedIds.has(r.id)) ||
                                                    filteredRegistrations[0]
                                                ).full_name || 'sample'}
                                                )
                                            </span>
                                        </div>
                                        {communicationType === 'email' && subject.trim() ? (
                                            <p className="mb-2 text-sm font-semibold text-slate-800">
                                                {replaceTemplateVariables(
                                                    subject,
                                                    filteredRegistrations.find((r) => selectedIds.has(r.id)) ||
                                                        filteredRegistrations[0]
                                                )}
                                            </p>
                                        ) : null}
                                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                                            {replaceTemplateVariables(
                                                messageBody,
                                                filteredRegistrations.find((r) => selectedIds.has(r.id)) ||
                                                    filteredRegistrations[0]
                                            )}
                                        </p>
                                    </div>
                                ) : null}

                                {selectedIds.size > 0 ? (
                                    <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4">
                                        <p className="mb-2 text-sm font-medium text-slate-900">
                                            Delivery check · {selectedIds.size} selected
                                        </p>
                                        <div className="space-y-1.5 text-sm text-slate-700">
                                            {communicationType === 'email' ? (
                                                <p>{canSendEmail} have an email address</p>
                                            ) : (
                                                <p>{canSendSMS} have a valid Ghana mobile number</p>
                                            )}
                                            {communicationType === 'sms' && missingSmsPhones > 0 ? (
                                                <p className="flex items-start gap-2 text-amber-800">
                                                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                                                    {missingSmsPhones} missing phone — will be skipped
                                                </p>
                                            ) : null}
                                            {communicationType === 'sms' && invalidSmsPhones > 0 ? (
                                                <p className="flex items-start gap-2 text-amber-800">
                                                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                                                    {invalidSmsPhones} invalid phone format — will be skipped
                                                </p>
                                            ) : null}
                                            {communicationType === 'email' && canSendEmail < selectedIds.size ? (
                                                <p className="flex items-start gap-2 text-amber-800">
                                                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                                                    {selectedIds.size - canSendEmail} without email — will be skipped
                                                </p>
                                            ) : null}
                                            {communicationType === 'sms' && canSendSMS < selectedIds.size ? (
                                                <p className="flex items-start gap-2 text-amber-800">
                                                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                                                    {selectedIds.size - canSendSMS} missing or invalid phone — will be
                                                    skipped
                                                </p>
                                            ) : null}
                                        </div>
                                    </div>
                                ) : null}

                                <Button
                                    onClick={handleSend}
                                    disabled={
                                        sending ||
                                        selectedIds.size === 0 ||
                                        !messageBody.trim() ||
                                        (communicationType === 'email' && !subject.trim())
                                    }
                                    className="min-h-12 w-full cursor-pointer transition-opacity duration-200"
                                    size="lg"
                                    aria-busy={sending}
                                >
                                    {sending ? (
                                        <>
                                            <LoadingSpinner size="sm" className="mr-2" />
                                            Sending…
                                        </>
                                    ) : (
                                        <>
                                            <Send className="mr-2 h-4 w-4" aria-hidden />
                                            Send {selectedIds.size || ''}{' '}
                                            {communicationType === 'email'
                                                ? 'email(s)'
                                                : dryRun
                                                  ? 'SMS (dry run)'
                                                  : 'SMS'}
                                        </>
                                    )}
                                </Button>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Communication History Tab */}
                    <TabsContent value="history" className="space-y-6">
                        <Card className="border border-slate-200 shadow-sm">
                            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <FileText className="h-5 w-5 text-slate-600" aria-hidden />
                                        Communication History
                                    </CardTitle>
                                    <CardDescription>
                                        {communications.length} recent message
                                        {communications.length === 1 ? '' : 's'}
                                    </CardDescription>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="min-h-10 cursor-pointer"
                                    onClick={loadCommunications}
                                    aria-label="Refresh communication history"
                                >
                                    <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
                                    Refresh
                                </Button>
                            </CardHeader>
                            <CardContent>
                                {communications.length === 0 ? (
                                    <div className="text-center py-12 text-slate-500">
                                        <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                        <p>No communications sent yet</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {communications.map(comm => (
                                            <div
                                                key={comm.id}
                                                className="rounded-lg border border-slate-200 bg-white p-4 transition-shadow duration-200 hover:shadow-sm"
                                            >
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex items-center gap-3">
                                                        {comm.communication_type === 'email' ? (
                                                            <div className="p-2 bg-slate-100 rounded-lg">
                                                                <Mail className="h-5 w-5 text-primary" />
                                                            </div>
                                                        ) : (
                                                            <div className="p-2 bg-green-100 rounded-lg">
                                                                <MessageSquare className="h-5 w-5 text-green-600" />
                                                            </div>
                                                        )}
                                                        <div>
                                                            <p className="font-semibold text-slate-900">
                                                                {comm.communication_type === 'email'
                                                                    ? comm.recipient_email || 'Bulk Email'
                                                                    : comm.recipient_phone || 'Bulk SMS'}
                                                            </p>
                                                            {comm.subject && (
                                                                <p className="text-sm text-slate-600 mt-1">{comm.subject}</p>
                                                            )}
                                                            <div className="mt-1 flex flex-wrap gap-1">
                                                              {commsMetaBadge(comm.metadata).provider ? (
                                                                <Badge variant="outline" className="font-mono text-[10px]">
                                                                  {String(commsMetaBadge(comm.metadata).provider)}
                                                                </Badge>
                                                              ) : null}
                                                              {commsMetaBadge(comm.metadata).dryRun ? (
                                                                <Badge variant="secondary">dry-run</Badge>
                                                              ) : null}
                                                              {typeof comm.metadata?.batch_id === 'string' ? (
                                                                <Badge variant="outline" className="font-mono text-[10px]">
                                                                  batch {String(comm.metadata.batch_id).slice(0, 8)}
                                                                </Badge>
                                                              ) : null}
                                                            </div>
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

                                                <div className="text-sm text-slate-700 bg-slate-50 p-3 rounded-md mb-3">
                                                    {comm.message_body}
                                                </div>
                                                {comm.provider_message_id ? (
                                                  <p className="mb-2 font-mono text-[11px] text-slate-500">
                                                    id {comm.provider_message_id}
                                                  </p>
                                                ) : null}
                                                {comm.error_message ? (
                                                  <p className="mb-2 text-xs text-red-600">{comm.error_message}</p>
                                                ) : null}

                                                <div className="flex items-center justify-between text-xs text-slate-500">
                                                    <div className="flex items-center gap-4">
                                                        <div className="flex items-center gap-1">
                                                            <Clock className="h-3 w-3" />
                                                            <span>
                                                                {new Date(comm.sent_at || comm.created_at).toLocaleString()}
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
                                                    <div className="flex items-center gap-2">
                                                        {(comm.status === 'sent' ||
                                                            comm.status === 'delivered' ||
                                                            comm.status === 'failed' ||
                                                            comm.status === 'bounced') &&
                                                        (comm.communication_type === 'sms'
                                                            ? Boolean(comm.recipient_phone)
                                                            : Boolean(comm.recipient_email)) ? (
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                className="min-h-10 cursor-pointer"
                                                                disabled={resendingId === comm.id}
                                                                aria-label={`Resend ${comm.communication_type} to ${
                                                                    comm.recipient_phone ||
                                                                    comm.recipient_email ||
                                                                    'recipient'
                                                                }`}
                                                                onClick={() => void handleResend(comm)}
                                                            >
                                                                <RefreshCw
                                                                    className={cn(
                                                                        'mr-1.5 h-3.5 w-3.5',
                                                                        resendingId === comm.id && 'animate-spin'
                                                                    )}
                                                                />
                                                                {resendingId === comm.id ? 'Resending…' : 'Resend'}
                                                            </Button>
                                                        ) : null}
                                                        {comm.recipient_type === 'bulk' && (
                                                            <Badge variant="outline" className="text-xs">
                                                                Bulk Send
                                                            </Badge>
                                                        )}
                                                    </div>
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
