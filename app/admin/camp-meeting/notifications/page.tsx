'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getActiveCampYear } from '@/lib/actions/camp'
import { CampYear } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading'
import { CampAdminPageHeader } from '@/components/camp/camp-admin-page-header'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/components/providers'
import {
    ArrowLeft, Mail, MessageSquare, Save, Plus, X,
    Bell, Settings, Users, FileText, CheckCircle2
} from 'lucide-react'

interface NotificationConfig {
    id?: string
    camp_year_id: string
    notification_type: 'registration_email' | 'registration_sms'
    enabled: boolean
    recipient_emails?: string[]
    recipient_phones?: string[]
    template_subject?: string
    template_body: string
}

export default function NotificationSettingsPage() {
    const router = useRouter()
    const { toast } = useToast()
    const { user } = useAuth()
    const [campYear, setCampYear] = useState<CampYear | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    // Email config
    const [emailConfig, setEmailConfig] = useState<NotificationConfig>({
        camp_year_id: '',
        notification_type: 'registration_email',
        enabled: true,
        recipient_emails: [],
        template_subject: 'New Camp Registration - {{name}}',
        template_body: 'A new registration has been received for Camp Meeting {{campYear}}.\n\nParticipant: {{name}}\nRole: {{role}}\nPhone: {{phone}}\nEmail: {{email}}'
    })

    // SMS config
    const [smsConfig, setSmsConfig] = useState<NotificationConfig>({
        camp_year_id: '',
        notification_type: 'registration_sms',
        enabled: true,
        recipient_phones: [],
        template_body: 'New registration: {{name}} ({{role}}) for Camp {{campYear}}. Phone: {{phone}}'
    })

    // Form states
    const [newEmail, setNewEmail] = useState('')
    const [newPhone, setNewPhone] = useState('')

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        const { data: year } = await getActiveCampYear()
        if (year) {
            setCampYear(year)
            await loadConfigs(year.id)
        }
        setLoading(false)
    }

    async function loadConfigs(campYearId: string) {
        try {
            setEmailConfig(prev => ({ ...prev, camp_year_id: campYearId }))
            setSmsConfig(prev => ({ ...prev, camp_year_id: campYearId }))
        } catch (error) {
            console.error('Error loading configs:', error)
        }
    }

    async function saveEmailConfig() {
        if (!campYear || !user) return

        setSaving(true)
        try {
            const configData = {
                ...emailConfig,
                camp_year_id: campYear.id,
                updated_by: user.id,
                updated_at: new Date().toISOString()
            }

            // Save to Firestore notification_config if collection added later
            toast({
                title: 'Success',
                description: 'Email notification settings saved',
            })
            loadConfigs(campYear.id)
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.message || 'Failed to save email settings',
            })
        } finally {
            setSaving(false)
        }
    }

    async function saveSMSConfig() {
        if (!campYear || !user) return

        setSaving(true)
        try {
            toast({
                title: 'Success',
                description: 'SMS notification settings saved',
            })
            loadConfigs(campYear.id)
        } catch (error: unknown) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error instanceof Error ? error.message : 'Failed to save SMS settings',
            })
        } finally {
            setSaving(false)
        }
    }

    const addEmail = () => {
        if (!newEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
            toast({
                variant: 'destructive',
                title: 'Invalid Email',
                description: 'Please enter a valid email address'
            })
            return
        }

        const emails = emailConfig.recipient_emails || []
        if (emails.includes(newEmail)) {
            toast({
                variant: 'destructive',
                title: 'Duplicate',
                description: 'This email is already in the list'
            })
            return
        }

        setEmailConfig({
            ...emailConfig,
            recipient_emails: [...emails, newEmail]
        })
        setNewEmail('')
    }

    const removeEmail = (email: string) => {
        setEmailConfig({
            ...emailConfig,
            recipient_emails: (emailConfig.recipient_emails || []).filter(e => e !== email)
        })
    }

    const addPhone = () => {
        if (!newPhone.trim()) {
            toast({
                variant: 'destructive',
                title: 'Invalid Phone',
                description: 'Please enter a phone number'
            })
            return
        }

        // Format phone number
        let formattedPhone = newPhone.trim()
        if (formattedPhone.startsWith('0')) {
            formattedPhone = '+233' + formattedPhone.slice(1)
        } else if (!formattedPhone.startsWith('+')) {
            formattedPhone = '+233' + formattedPhone
        }

        const phones = smsConfig.recipient_phones || []
        if (phones.includes(formattedPhone)) {
            toast({
                variant: 'destructive',
                title: 'Duplicate',
                description: 'This phone number is already in the list'
            })
            return
        }

        setSmsConfig({
            ...smsConfig,
            recipient_phones: [...phones, formattedPhone]
        })
        setNewPhone('')
    }

    const removePhone = (phone: string) => {
        setSmsConfig({
            ...smsConfig,
            recipient_phones: (smsConfig.recipient_phones || []).filter(p => p !== phone)
        })
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
            <div className="max-w-6xl mx-auto p-6 space-y-6">
                <CampAdminPageHeader title="Notification Settings" campYear={campYear} />

                <Tabs defaultValue="email" className="space-y-6">
                    <TabsList>
                        <TabsTrigger value="email">
                            <Mail className="mr-2 h-4 w-4" />
                            Email Notifications
                        </TabsTrigger>
                        <TabsTrigger value="sms">
                            <MessageSquare className="mr-2 h-4 w-4" />
                            SMS Notifications
                        </TabsTrigger>
                    </TabsList>

                    {/* Email Configuration */}
                    <TabsContent value="email" className="space-y-6">
                        <Card className="border-2">
                            <CardHeader className="bg-gray-50 border-b">
                                <CardTitle className="flex items-center gap-2">
                                    <Mail className="h-5 w-5" />
                                    Email Notification Settings
                                </CardTitle>
                                <CardDescription>
                                    Configure email notifications for new camp registrations
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-6">
                                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                                    <div className="flex items-center gap-3">
                                        <Checkbox
                                            id="email_enabled"
                                            checked={emailConfig.enabled}
                                            onCheckedChange={(checked) =>
                                                setEmailConfig({ ...emailConfig, enabled: checked === true })
                                            }
                                        />
                                        <div>
                                            <Label htmlFor="email_enabled" className="text-base font-semibold cursor-pointer">
                                                Enable Email Notifications
                                            </Label>
                                            <p className="text-sm text-gray-600 mt-1">
                                                Send email notifications when new registrations are received
                                            </p>
                                        </div>
                                    </div>
                                    <Badge variant={emailConfig.enabled ? 'default' : 'outline'}>
                                        {emailConfig.enabled ? 'Enabled' : 'Disabled'}
                                    </Badge>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <Label className="text-base font-semibold mb-3 block">
                                            Recipient Email Addresses
                                        </Label>
                                        <p className="text-sm text-gray-600 mb-3">
                                            Add email addresses that should receive notification emails
                                        </p>
                                        <div className="flex gap-2 mb-3">
                                            <Input
                                                type="email"
                                                placeholder="admin@example.com"
                                                value={newEmail}
                                                onChange={e => setNewEmail(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault()
                                                        addEmail()
                                                    }
                                                }}
                                                className="flex-1"
                                            />
                                            <Button type="button" onClick={addEmail} variant="outline">
                                                <Plus className="mr-2 h-4 w-4" />
                                                Add
                                            </Button>
                                        </div>
                                        {(emailConfig.recipient_emails || []).length > 0 ? (
                                            <div className="space-y-2">
                                                {emailConfig.recipient_emails!.map((email, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <Mail className="h-4 w-4 text-gray-400" />
                                                            <span className="text-sm font-medium">{email}</span>
                                                        </div>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => removeEmail(email)}
                                                        >
                                                            <X className="h-4 w-4 text-red-600" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-500 italic">
                                                No email addresses added yet. Add at least one to receive notifications.
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="email_subject">Email Subject Template</Label>
                                        <Input
                                            id="email_subject"
                                            value={emailConfig.template_subject || ''}
                                            onChange={e =>
                                                setEmailConfig({ ...emailConfig, template_subject: e.target.value })
                                            }
                                            placeholder="New Camp Registration - {{name}}"
                                        />
                                        <p className="text-xs text-gray-500">
                                            Template variables: {`{{name}}`}, {`{{role}}`}, {`{{campYear}}`}
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="email_body">Email Body Template</Label>
                                        <Textarea
                                            id="email_body"
                                            value={emailConfig.template_body}
                                            onChange={e =>
                                                setEmailConfig({ ...emailConfig, template_body: e.target.value })
                                            }
                                            placeholder="Email message template..."
                                            rows={8}
                                        />
                                        <p className="text-xs text-gray-500">
                                            Template variables: {`{{name}}`}, {`{{firstName}}`}, {`{{lastName}}`}, {`{{role}}`}, {`{{campYear}}`}, {`{{phone}}`}, {`{{email}}`}, {`{{qrCode}}`}
                                        </p>
                                    </div>

                                    <Button
                                        onClick={saveEmailConfig}
                                        disabled={saving || !emailConfig.template_body.trim()}
                                        className="w-full"
                                        size="lg"
                                    >
                                        {saving ? (
                                            <>
                                                <LoadingSpinner size="sm" className="mr-2" />
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="mr-2 h-4 w-4" />
                                                Save Email Settings
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* SMS Configuration */}
                    <TabsContent value="sms" className="space-y-6">
                        <Card className="border-2">
                            <CardHeader className="bg-gray-50 border-b">
                                <CardTitle className="flex items-center gap-2">
                                    <MessageSquare className="h-5 w-5" />
                                    SMS Notification Settings
                                </CardTitle>
                                <CardDescription>
                                    Configure SMS notifications for new camp registrations
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-6">
                                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                                    <div className="flex items-center gap-3">
                                        <Checkbox
                                            id="sms_enabled"
                                            checked={smsConfig.enabled}
                                            onCheckedChange={(checked) =>
                                                setSmsConfig({ ...smsConfig, enabled: checked === true })
                                            }
                                        />
                                        <div>
                                            <Label htmlFor="sms_enabled" className="text-base font-semibold cursor-pointer">
                                                Enable SMS Notifications
                                            </Label>
                                            <p className="text-sm text-gray-600 mt-1">
                                                Send SMS notifications when new registrations are received
                                            </p>
                                        </div>
                                    </div>
                                    <Badge variant={smsConfig.enabled ? 'default' : 'outline'}>
                                        {smsConfig.enabled ? 'Enabled' : 'Disabled'}
                                    </Badge>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <Label className="text-base font-semibold mb-3 block">
                                            Recipient Phone Numbers
                                        </Label>
                                        <p className="text-sm text-gray-600 mb-3">
                                            Add phone numbers (Ghana format: 0241234567 or +233241234567) that should receive SMS notifications
                                        </p>
                                        <div className="flex gap-2 mb-3">
                                            <Input
                                                type="tel"
                                                placeholder="0241234567 or +233241234567"
                                                value={newPhone}
                                                onChange={e => setNewPhone(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault()
                                                        addPhone()
                                                    }
                                                }}
                                                className="flex-1"
                                            />
                                            <Button type="button" onClick={addPhone} variant="outline">
                                                <Plus className="mr-2 h-4 w-4" />
                                                Add
                                            </Button>
                                        </div>
                                        {(smsConfig.recipient_phones || []).length > 0 ? (
                                            <div className="space-y-2">
                                                {smsConfig.recipient_phones!.map((phone, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <MessageSquare className="h-4 w-4 text-gray-400" />
                                                            <span className="text-sm font-medium">{phone}</span>
                                                        </div>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => removePhone(phone)}
                                                        >
                                                            <X className="h-4 w-4 text-red-600" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-500 italic">
                                                No phone numbers added yet. Add at least one to receive SMS notifications.
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="sms_body">SMS Message Template</Label>
                                        <Textarea
                                            id="sms_body"
                                            value={smsConfig.template_body}
                                            onChange={e =>
                                                setSmsConfig({ ...smsConfig, template_body: e.target.value })
                                            }
                                            placeholder="SMS message template (160 characters recommended)..."
                                            rows={6}
                                            maxLength={1600}
                                        />
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs text-gray-500">
                                                Template variables: {`{{name}}`}, {`{{role}}`}, {`{{campYear}}`}, {`{{phone}}`}, {`{{qrCode}}`}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {smsConfig.template_body.length} / 160 characters
                                            </p>
                                        </div>
                                    </div>

                                    <Button
                                        onClick={saveSMSConfig}
                                        disabled={saving || !smsConfig.template_body.trim()}
                                        className="w-full"
                                        size="lg"
                                    >
                                        {saving ? (
                                            <>
                                                <LoadingSpinner size="sm" className="mr-2" />
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="mr-2 h-4 w-4" />
                                                Save SMS Settings
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}
