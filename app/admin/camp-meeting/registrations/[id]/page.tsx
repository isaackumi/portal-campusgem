'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { campService } from '@/lib/services/camp-service'
import { dataService } from '@/lib/services/data-service'
import { CampRegistration, CampInteraction, AppUser } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/components/providers'
import { 
    User, Phone, Mail, Calendar, MessageSquare, ArrowLeft, 
    Download, QrCode, CheckCircle2, XCircle, Edit, DollarSign,
    UserPlus, UserMinus, FileText, MapPin, GraduationCap,
    Heart, Shield, Clock, CreditCard, Send, Cake, Sparkles
} from 'lucide-react'
import QRCode from 'react-qr-code'
import {
    memberDobIsoFromCampRegistration,
    MEMBER_DOB_PLACEHOLDER_YEAR,
} from '@/lib/camp/birthday'

type DirectoryRole = 'admin' | 'pastor' | 'elder' | 'finance_officer' | 'member' | 'visitor'

export default function RegistrationDetailPage() {
    const { id } = useParams() as { id: string }
    const router = useRouter()
    const { toast } = useToast()
    const { user } = useAuth()

    const [data, setData] = useState<CampRegistration | null>(null)
    const [staffMembers, setStaffMembers] = useState<AppUser[]>([])
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState(false)
    const [addingNote, setAddingNote] = useState(false)
    const [newInteraction, setNewInteraction] = useState({ type: 'note', notes: '' })
    const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false)
    const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
    const [statusDialogOpen, setStatusDialogOpen] = useState(false)

    const [bMonth, setBMonth] = useState('')
    const [bDay, setBDay] = useState('')
    const [bYear, setBYear] = useState('')
    const [promoteRole, setPromoteRole] = useState<DirectoryRole>('member')
    const [linkedUser, setLinkedUser] = useState<AppUser | null>(null)
    const [promoting, setPromoting] = useState(false)
    const [savingBirth, setSavingBirth] = useState(false)
    const [syncingDob, setSyncingDob] = useState(false)
    
    // Payment form
    const [paymentForm, setPaymentForm] = useState({
        payment_status: 'pending' as 'pending' | 'paid' | 'confirmed' | 'refunded',
        payment_amount: 30.00,
        payment_reference: '',
        payment_date: new Date().toISOString().split('T')[0]
    })

    useEffect(() => {
        loadData()
        loadStaffMembers()
    }, [id])

    useEffect(() => {
        if (!data) return
        setBMonth(data.birth_month != null ? String(data.birth_month) : '')
        setBDay(data.birth_day != null ? String(data.birth_day) : '')
        const iso = data.date_of_birth?.trim()
        setBYear(iso && /^\d{4}-\d{1,2}-\d{1,2}$/.test(iso) ? iso.slice(0, 4) : '')
    }, [data?.id, data?.birth_month, data?.birth_day, data?.date_of_birth])

    useEffect(() => {
        if (!data?.user_id) {
            setLinkedUser(null)
            return
        }
        let cancelled = false
        ;(async () => {
            const res = await dataService.getUserById(data.user_id!)
            if (!cancelled && res.data) setLinkedUser(res.data)
        })()
        return () => {
            cancelled = true
        }
    }, [data?.user_id])

    async function loadData() {
        const res = await campService.getRegistration(id)
        if (res.data) {
            setData(res.data)
            if (res.data.payment_status) {
                setPaymentForm(prev => ({
                    ...prev,
                    payment_status: res.data!.payment_status || 'pending',
                    payment_amount: res.data!.payment_amount || 30.00,
                    payment_reference: res.data!.payment_reference || '',
                    payment_date: res.data!.payment_date 
                        ? new Date(res.data!.payment_date).toISOString().split('T')[0]
                        : new Date().toISOString().split('T')[0]
                }))
            }
        }
        setLoading(false)
    }

    async function loadStaffMembers() {
        const { data } = await dataService.getAllUsers()
        const staff = (data ?? []).filter(u => ['admin', 'pastor', 'elder', 'finance_officer'].includes(u.role))
        setStaffMembers(staff)
    }

    const handleAddInteraction = async () => {
        if (!user || !data) return
        if (!newInteraction.notes) {
            toast({
                variant: 'destructive',
                title: 'Required',
                description: 'Please enter interaction notes'
            })
            return
        }

        setAddingNote(true)
        const res = await campService.addInteraction({
            registration_id: data.id,
            performed_by: user.id,
            interaction_type: newInteraction.type as any,
            notes: newInteraction.notes
        })

        if (res.error) {
            toast({ 
                title: "Failed to add interaction", 
                description: res.error, 
                variant: "destructive" 
            })
        } else {
            toast({ title: "Interaction added successfully" })
            setNewInteraction({ type: 'note', notes: '' })
            loadData()
        }
        setAddingNote(false)
    }

    const handleAssignStaff = async (staffId: string | null) => {
        if (!data) return
        
        setUpdating(true)
        try {
            const res = await campService.updateRegistration(data.id, { assigned_to: staffId ?? undefined })
            if (res.error) {
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: res.error
                })
            } else {
                toast({
                    title: 'Success',
                    description: staffId ? 'Staff member assigned' : 'Assignment removed'
                })
                setAssignmentDialogOpen(false)
                loadData()
            }
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.message || 'Failed to update assignment'
            })
        } finally {
            setUpdating(false)
        }
    }

    const handleUpdateStatus = async (newStatus: 'registered' | 'checked_in' | 'cancelled') => {
        if (!data) return
        
        setUpdating(true)
        try {
            const res = await campService.updateRegistration(data.id, { status: newStatus })
            if (res.error) {
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: res.error
                })
            } else {
                toast({
                    title: 'Success',
                    description: `Status updated to ${newStatus}`
                })
                setStatusDialogOpen(false)
                loadData()
            }
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.message || 'Failed to update status'
            })
        } finally {
            setUpdating(false)
        }
    }

    const handleUpdatePayment = async () => {
        if (!data) return
        
        setUpdating(true)
        try {
            const res = await campService.updateRegistration(data.id, {
                payment_status: paymentForm.payment_status,
                payment_amount: paymentForm.payment_amount,
                payment_reference: paymentForm.payment_reference || undefined,
                payment_date: paymentForm.payment_date ? new Date(paymentForm.payment_date).toISOString() : undefined
            })
            if (res.error) {
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: res.error
                })
            } else {
                toast({
                    title: 'Success',
                    description: 'Payment information updated'
                })
                setPaymentDialogOpen(false)
                loadData()
            }
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

    const handleSaveRegistrationBirthday = async () => {
        if (!data) return
        const m = parseInt(bMonth, 10)
        const d = parseInt(bDay, 10)
        if (!Number.isFinite(m) || !Number.isFinite(d) || m < 1 || m > 12 || d < 1 || d > 31) {
            toast({
                variant: 'destructive',
                title: 'Birthday',
                description: 'Enter a valid month (1–12) and day (1–31).',
            })
            return
        }
        const yRaw = bYear.trim()
        const y = yRaw ? parseInt(yRaw, 10) : undefined
        if (yRaw && (!Number.isFinite(y) || (y ?? 0) < 1900 || (y ?? 0) > 2100)) {
            toast({
                variant: 'destructive',
                title: 'Year',
                description: 'Enter a valid year or leave it blank for recurring birthdays only.',
            })
            return
        }
        setSavingBirth(true)
        try {
            const iso =
                y != null && Number.isFinite(y)
                    ? `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
                    : undefined
            const patch: Partial<CampRegistration> = {
                birth_month: m,
                birth_day: d,
            }
            if (iso) patch.date_of_birth = iso
            const res = await campService.updateRegistration(data.id, patch)
            if (res.error) {
                toast({ variant: 'destructive', title: 'Error', description: res.error })
            } else {
                toast({
                    title: 'Saved',
                    description: iso
                        ? 'Birth date saved on this registration.'
                        : `Month and day saved. Member records use year ${MEMBER_DOB_PLACEHOLDER_YEAR} until you add a real year.`,
                })
                loadData()
            }
        } finally {
            setSavingBirth(false)
        }
    }

    const handlePromoteToDirectory = async () => {
        if (!data) return
        const m = bMonth.trim() ? parseInt(bMonth, 10) : data.birth_month
        const d = bDay.trim() ? parseInt(bDay, 10) : data.birth_day
        const yRaw = bYear.trim()
        const y = yRaw ? parseInt(yRaw, 10) : undefined
        if (m == null || d == null || !Number.isFinite(m) || !Number.isFinite(d) || m < 1 || m > 12 || d < 1 || d > 31) {
            toast({
                variant: 'destructive',
                title: 'Birthday required',
                description: 'Set month and day on the registration (or in the fields above) before promoting.',
            })
            return
        }
        const preview = memberDobIsoFromCampRegistration(
            {
                date_of_birth: data.date_of_birth,
                birth_month: data.birth_month,
                birth_day: data.birth_day,
            },
            { birth_month: m, birth_day: d, birth_year: y }
        )
        if (!preview) {
            toast({
                variant: 'destructive',
                title: 'Birthday required',
                description: 'Could not build a date of birth for the member profile.',
            })
            return
        }
        setPromoting(true)
        try {
            const res = await campService.promoteToDirectory(data.id, {
                role: promoteRole,
                birth_month: m,
                birth_day: d,
                birth_year: y,
            })
            if (res.error) {
                toast({ variant: 'destructive', title: 'Promotion failed', description: res.error })
            } else {
                toast({
                    title: 'Linked to directory',
                    description: 'They can sign in with this phone number (direct login).',
                })
                loadData()
            }
        } finally {
            setPromoting(false)
        }
    }

    const handleSyncBirthToMember = async () => {
        if (!data?.user_id) return
        setSyncingDob(true)
        try {
            const res = await campService.syncRegistrationBirthdayToMember(data.id)
            if (res.error) {
                toast({ variant: 'destructive', title: 'Sync failed', description: res.error })
            } else {
                toast({
                    title: 'Member birthday updated',
                    description: 'Upcoming birthdays on the dashboard use the member record.',
                })
            }
        } finally {
            setSyncingDob(false)
        }
    }

    const downloadQRCode = () => {
        if (!data) return
        
        // Parse QR code data
        let qrData = data.qr_code
        try {
            qrData = JSON.parse(data.qr_code)
        } catch {
            // Already a string, use as is
        }
        
        const qrString = typeof qrData === 'string' ? qrData : JSON.stringify(qrData)
        
        // Create canvas to convert QR to image
        const svg = document.getElementById('qr-code-svg')
        if (!svg) return
        
        const svgData = new XMLSerializer().serializeToString(svg)
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        const img = new Image()
        
        img.onload = () => {
            canvas.width = img.width
            canvas.height = img.height
            ctx?.drawImage(img, 0, 0)
            
            canvas.toBlob((blob) => {
                if (!blob) return
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `camp-qr-${data.full_name || data.first_name}-${data.qr_code.slice(0, 10)}.png`
                a.click()
                URL.revokeObjectURL(url)
            })
        }
        
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <LoadingSpinner />
            </div>
        )
    }

    if (!data) {
        return (
            <div className="p-6 max-w-5xl mx-auto">
                <Card>
                    <CardContent className="py-12 text-center">
                        <p className="text-muted-foreground">Registration not found</p>
                        <Button variant="outline" onClick={() => router.back()} className="mt-4">
                            <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const fullName = data.full_name || `${data.first_name} ${data.last_name}`.trim()
    const qrScanValue = data.qr_code

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="max-w-7xl mx-auto p-6 space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push('/admin/camp-meeting/registrations')}
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Registrations
                        </Button>
                        <div>
                            <h1 className="text-4xl font-bold tracking-tight text-gray-900">
                                Registration Details
                            </h1>
                            <p className="text-muted-foreground mt-1">{fullName}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline">
                                    <Edit className="mr-2 h-4 w-4" /> Update Status
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Update Registration Status</DialogTitle>
                                    <DialogDescription>
                                        Change the status of this registration
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <Button
                                        variant={data.status === 'registered' ? 'default' : 'outline'}
                                        className="w-full justify-start"
                                        onClick={() => handleUpdateStatus('registered')}
                                        disabled={updating || data.status === 'registered'}
                                    >
                                        <Clock className="mr-2 h-4 w-4" />
                                        Registered
                                    </Button>
                                    <Button
                                        variant={data.status === 'checked_in' ? 'default' : 'outline'}
                                        className="w-full justify-start"
                                        onClick={() => handleUpdateStatus('checked_in')}
                                        disabled={updating || data.status === 'checked_in'}
                                    >
                                        <CheckCircle2 className="mr-2 h-4 w-4" />
                                        Checked In
                                    </Button>
                                    <Button
                                        variant={data.status === 'cancelled' ? 'default' : 'outline'}
                                        className="w-full justify-start"
                                        onClick={() => handleUpdateStatus('cancelled')}
                                        disabled={updating || data.status === 'cancelled'}
                                    >
                                        <XCircle className="mr-2 h-4 w-4" />
                                        Cancelled
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Main Content - Left 2 columns */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Profile Information */}
                        <Card className="border-2">
                            <CardHeader className="bg-gray-50 border-b">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <CardTitle className="text-2xl">{fullName}</CardTitle>
                                        <CardDescription className="flex flex-wrap items-center gap-2 mt-2">
                                            <Badge
                                                className={
                                                    data.is_new_registrant
                                                        ? 'border border-amber-200 bg-amber-50 text-amber-950 shadow-none'
                                                        : 'border border-slate-200 bg-slate-100 text-slate-800 shadow-none'
                                                }
                                            >
                                                {data.is_new_registrant ? 'First timer' : 'Returning'}
                                            </Badge>
                                            <Badge
                                                className={
                                                    data.status === 'checked_in'
                                                        ? 'border border-emerald-200 bg-emerald-50 text-emerald-950 shadow-none'
                                                        : data.status === 'cancelled'
                                                          ? 'border border-red-200 bg-red-50 text-red-900 shadow-none'
                                                          : 'border border-blue-200 bg-blue-50 text-blue-900 shadow-none'
                                                }
                                            >
                                                {data.status === 'checked_in'
                                                    ? 'Checked in'
                                                    : data.status === 'cancelled'
                                                      ? 'Cancelled'
                                                      : 'Registered'}
                                            </Badge>
                                            {data.payment_status && (
                                                <Badge
                                                    className={
                                                        data.payment_status === 'paid' ||
                                                        data.payment_status === 'confirmed'
                                                            ? 'border border-green-200 bg-green-50 text-green-900 shadow-none'
                                                            : data.payment_status === 'refunded'
                                                              ? 'border border-violet-200 bg-violet-50 text-violet-900 shadow-none'
                                                              : 'border border-orange-200 bg-orange-50 text-orange-950 shadow-none'
                                                    }
                                                >
                                                    Payment: {data.payment_status}
                                                </Badge>
                                            )}
                                            <Badge className="border border-indigo-200 bg-indigo-50 text-indigo-950 shadow-none">
                                                {data.role}
                                            </Badge>
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div>
                                            <Label className="text-xs text-gray-500 uppercase">Contact Information</Label>
                                            <div className="space-y-2 mt-2">
                                                {data.email && (
                                                    <div className="flex items-center text-sm">
                                                        <Mail className="h-4 w-4 mr-3 text-gray-400" />
                                                        <span>{data.email}</span>
                                                    </div>
                                                )}
                                                {data.phone && (
                                                    <div className="flex items-center text-sm">
                                                        <Phone className="h-4 w-4 mr-3 text-gray-400" />
                                                        <span>{data.phone}</span>
                                                    </div>
                                                )}
                                                {data.facebook_username && (
                                                    <div className="flex items-center text-sm">
                                                        <User className="h-4 w-4 mr-3 text-gray-400" />
                                                        <span>@{data.facebook_username}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div>
                                            <Label className="text-xs text-gray-500 uppercase">Registration</Label>
                                            <div className="space-y-2 mt-2">
                                                <div className="flex items-center text-sm">
                                                    <Calendar className="h-4 w-4 mr-3 text-gray-400" />
                                                    <span>Registered: {new Date(data.created_at).toLocaleDateString('en-US', {
                                                        month: 'long',
                                                        day: 'numeric',
                                                        year: 'numeric'
                                                    })}</span>
                                                </div>
                                                {data.times_attended !== undefined && (
                                                    <div className="flex items-center text-sm">
                                                        <Clock className="h-4 w-4 mr-3 text-gray-400" />
                                                        <span>Times attended: {data.times_attended}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        {data.address_school_work && (
                                            <div>
                                                <Label className="text-xs text-gray-500 uppercase">Address/School/Work</Label>
                                                <div className="flex items-start text-sm mt-2">
                                                    <MapPin className="h-4 w-4 mr-3 text-gray-400 mt-0.5" />
                                                    <span>{data.address_school_work}</span>
                                                </div>
                                            </div>
                                        )}

                                        {(data.education_level || data.highest_qualification) && (
                                            <div>
                                                <Label className="text-xs text-gray-500 uppercase">Education</Label>
                                                <div className="space-y-2 mt-2">
                                                    {data.education_level && (
                                                        <div className="flex items-center text-sm">
                                                            <GraduationCap className="h-4 w-4 mr-3 text-gray-400" />
                                                            <span>{data.education_level}</span>
                                                        </div>
                                                    )}
                                                    {data.highest_qualification && (
                                                        <div className="flex items-center text-sm">
                                                            <FileText className="h-4 w-4 mr-3 text-gray-400" />
                                                            <span>{data.highest_qualification}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {data.residence && (
                                            <div>
                                                <Label className="text-xs text-gray-500 uppercase">Residence</Label>
                                                <div className="flex items-center text-sm mt-2">
                                                    <MapPin className="h-4 w-4 mr-3 text-gray-400" />
                                                    <span>{data.residence}</span>
                                                </div>
                                            </div>
                                        )}

                                        {data.parent_name && (
                                            <div>
                                                <Label className="text-xs text-gray-500 uppercase">Parent/Guardian</Label>
                                                <div className="space-y-2 mt-2">
                                                    <div className="flex items-center text-sm">
                                                        <User className="h-4 w-4 mr-3 text-gray-400" />
                                                        <span>{data.parent_name}</span>
                                                    </div>
                                                    {data.parent_contact && (
                                                        <div className="flex items-center text-sm">
                                                            <Phone className="h-4 w-4 mr-3 text-gray-400" />
                                                            <span>{data.parent_contact}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {data.has_health_challenge && data.health_challenges && data.health_challenges.length > 0 && (
                                    <div className="mt-6 pt-6 border-t">
                                        <Label className="text-xs text-gray-500 uppercase flex items-center gap-2">
                                            <Heart className="h-4 w-4" /> Health Information
                                        </Label>
                                        <div className="mt-2">
                                            <div className="flex flex-wrap gap-2">
                                                {data.health_challenges.map((challenge, idx) => (
                                                    <Badge
                                                        key={idx}
                                                        className="text-xs border-rose-200 bg-rose-50 text-rose-900"
                                                    >
                                                        {challenge}
                                                    </Badge>
                                                ))}
                                            </div>
                                            {data.has_nhis_card && (
                                                <div className="mt-2 text-sm text-gray-600">
                                                    <Shield className="h-4 w-4 inline mr-1" />
                                                    Has NHIS Card
                                                    {data.nhis_card_expiry_date && (
                                                        <span> (Expires: {new Date(data.nhis_card_expiry_date).toLocaleDateString()})</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Interactions & Notes */}
                        <Card className="border-2">
                            <CardHeader className="bg-gray-50 border-b">
                                <CardTitle className="flex items-center gap-2">
                                    <MessageSquare className="h-5 w-5" /> Engagement & Notes
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2 mb-6">
                                    {data.interactions && data.interactions.length > 0 ? (
                                        data.interactions
                                            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                                            .map((interaction) => (
                                                <div key={interaction.id} className="relative pl-6 border-l-2 border-gray-200">
                                                    <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-gray-400" />
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <Badge
                                                                variant="outline"
                                                                className="text-xs capitalize border-violet-200 bg-violet-50 text-violet-900"
                                                            >
                                                                {interaction.interaction_type}
                                                            </Badge>
                                                            <span className="text-xs text-gray-400">
                                                                {new Date(interaction.created_at).toLocaleString()}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-gray-800 bg-gray-50 p-3 rounded-md">
                                                            {interaction.notes}
                                                        </p>
                                                        <p className="text-xs text-gray-400 mt-1">
                                                            By: {interaction.performer?.full_name || 'System'}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))
                                    ) : (
                                        <p className="text-center text-gray-400 py-8">No interactions recorded yet.</p>
                                    )}
                                </div>

                                <div className="border-t pt-4 space-y-3">
                                    <Select
                                        value={newInteraction.type}
                                        onValueChange={v => setNewInteraction({ ...newInteraction, type: v })}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="note">Note</SelectItem>
                                            <SelectItem value="call">Phone Call</SelectItem>
                                            <SelectItem value="sms">SMS Sent</SelectItem>
                                            <SelectItem value="email">Email Sent</SelectItem>
                                            <SelectItem value="status_change">Status Change</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Textarea
                                        placeholder="Add a note or interaction details..."
                                        value={newInteraction.notes}
                                        onChange={e => setNewInteraction({ ...newInteraction, notes: e.target.value })}
                                        rows={4}
                                    />
                                    <Button
                                        className="w-full"
                                        onClick={handleAddInteraction}
                                        disabled={addingNote || !newInteraction.notes}
                                    >
                                        {addingNote ? (
                                            <>
                                                <LoadingSpinner size="sm" className="mr-2" />
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <MessageSquare className="mr-2 h-4 w-4" />
                                                Save Interaction
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar - Right column */}
                    <div className="space-y-6">
                        {/* QR Code */}
                        <Card className="border-2">
                            <CardHeader className="bg-gray-50 border-b">
                                <CardTitle className="flex items-center gap-2">
                                    <QrCode className="h-5 w-5" /> QR Code
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="flex flex-col items-center space-y-4">
                                    <div className="bg-white p-4 rounded-lg border-2 border-dashed">
                                        <QRCode
                                            id="qr-code-svg"
                                            value={qrScanValue}
                                            size={200}
                                            level="H"
                                        />
                                    </div>
                                    <div className="w-full space-y-0.5 rounded bg-gray-100 p-3 text-center">
                                        <p className="font-semibold text-gray-900">{fullName}</p>
                                        <p className="text-sm text-gray-600">{data.role || 'Participant'}</p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        className="w-full"
                                        onClick={downloadQRCode}
                                    >
                                        <Download className="mr-2 h-4 w-4" />
                                        Download QR Code
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Directory & birthdays (member record for login + upcoming birthdays) */}
                        <Card className="border-2 border-violet-100 bg-gradient-to-br from-violet-50/80 to-white shadow-sm">
                            <CardHeader className="border-b border-violet-100 bg-violet-50/50">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Sparkles className="h-5 w-5 text-violet-600" />
                                    Church directory
                                </CardTitle>
                                <CardDescription>
                                    Upcoming birthdays use the <strong>member</strong> date of birth. Month and day are
                                    required; year is optional (defaults to {MEMBER_DOB_PLACEHOLDER_YEAR} for recurring
                                    reminders until you add a real year).
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-6">
                                {linkedUser && (
                                    <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 p-3 text-sm">
                                        <p className="font-medium text-emerald-950">Linked directory user</p>
                                        <p className="text-emerald-900">{linkedUser.full_name}</p>
                                        <p className="text-xs text-emerald-800">
                                            {linkedUser.phone} · {linkedUser.membership_id} · {linkedUser.role}
                                        </p>
                                    </div>
                                )}
                                <div className="grid grid-cols-3 gap-2">
                                    <div>
                                        <Label className="text-xs">Month</Label>
                                        <Input
                                            inputMode="numeric"
                                            placeholder="1–12"
                                            value={bMonth}
                                            onChange={(e) => setBMonth(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs">Day</Label>
                                        <Input
                                            inputMode="numeric"
                                            placeholder="1–31"
                                            value={bDay}
                                            onChange={(e) => setBDay(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs">Year (optional)</Label>
                                        <Input
                                            inputMode="numeric"
                                            placeholder={`e.g. 1998`}
                                            value={bYear}
                                            onChange={(e) => setBYear(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <Button
                                    variant="outline"
                                    className="w-full border-violet-200"
                                    onClick={handleSaveRegistrationBirthday}
                                    disabled={savingBirth}
                                >
                                    <Cake className="mr-2 h-4 w-4" />
                                    {savingBirth ? 'Saving…' : 'Save on registration'}
                                </Button>
                                {data.user_id && (
                                    <Button
                                        variant="secondary"
                                        className="w-full"
                                        onClick={handleSyncBirthToMember}
                                        disabled={syncingDob}
                                    >
                                        {syncingDob ? 'Syncing…' : 'Copy birthday → linked member'}
                                    </Button>
                                )}
                                <div className="space-y-2">
                                    <Label className="text-xs">Role after promote</Label>
                                    <Select
                                        value={promoteRole}
                                        onValueChange={(v) => setPromoteRole(v as DirectoryRole)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="member">Member</SelectItem>
                                            <SelectItem value="visitor">Visitor</SelectItem>
                                            <SelectItem value="elder">Elder</SelectItem>
                                            <SelectItem value="pastor">Pastor</SelectItem>
                                            <SelectItem value="finance_officer">Finance officer</SelectItem>
                                            <SelectItem value="admin">Admin</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button
                                    className="w-full bg-violet-600 hover:bg-violet-700"
                                    onClick={handlePromoteToDirectory}
                                    disabled={promoting}
                                >
                                    {promoting ? 'Working…' : linkedUser ? 'Update & re-link directory' : 'Promote to directory (phone login)'}
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Assignment */}
                        <Card className="border-2">
                            <CardHeader className="bg-gray-50 border-b">
                                <CardTitle className="flex items-center gap-2">
                                    <UserPlus className="h-5 w-5" /> Follow-Up Assignment
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6">
                                {data.assigned_user ? (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                                            <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                                                {data.assigned_user.full_name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium text-gray-900">{data.assigned_user.full_name}</p>
                                                <p className="text-xs text-gray-500">{data.assigned_user.role}</p>
                                            </div>
                                        </div>
                                        <Dialog open={assignmentDialogOpen} onOpenChange={setAssignmentDialogOpen}>
                                            <DialogTrigger asChild>
                                                <Button variant="outline" className="w-full">
                                                    <Edit className="mr-2 h-4 w-4" />
                                                    Change Assignment
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>Assign Staff Member</DialogTitle>
                                                    <DialogDescription>
                                                        Assign or change the staff member responsible for follow-up
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <div className="space-y-4 py-4">
                                                    <Button
                                                        variant="outline"
                                                        className="w-full justify-start"
                                                        onClick={() => handleAssignStaff(null)}
                                                        disabled={updating}
                                                    >
                                                        <UserMinus className="mr-2 h-4 w-4" />
                                                        Remove Assignment
                                                    </Button>
                                                    <div className="max-h-[300px] overflow-y-auto space-y-2">
                                                        {staffMembers.map((staff) => (
                                                            <Button
                                                                key={staff.id}
                                                                variant={data.assigned_to === staff.id ? 'default' : 'outline'}
                                                                className="w-full justify-start"
                                                                onClick={() => handleAssignStaff(staff.id)}
                                                                disabled={updating || data.assigned_to === staff.id}
                                                            >
                                                                <User className="mr-2 h-4 w-4" />
                                                                {staff.full_name} ({staff.role})
                                                            </Button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                ) : (
                                    <Dialog open={assignmentDialogOpen} onOpenChange={setAssignmentDialogOpen}>
                                        <DialogTrigger asChild>
                                            <Button variant="outline" className="w-full">
                                                <UserPlus className="mr-2 h-4 w-4" />
                                                Assign Staff Member
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Assign Staff Member</DialogTitle>
                                                <DialogDescription>
                                                    Select a staff member for follow-up
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="space-y-2 py-4 max-h-[400px] overflow-y-auto">
                                                {staffMembers.map((staff) => (
                                                    <Button
                                                        key={staff.id}
                                                        variant="outline"
                                                        className="w-full justify-start"
                                                        onClick={() => handleAssignStaff(staff.id)}
                                                        disabled={updating}
                                                    >
                                                        <User className="mr-2 h-4 w-4" />
                                                        {staff.full_name} ({staff.role})
                                                    </Button>
                                                ))}
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                )}
                            </CardContent>
                        </Card>

                        {/* Payment Information */}
                        <Card className="border-2">
                            <CardHeader className="bg-gray-50 border-b">
                                <CardTitle className="flex items-center gap-2">
                                    <CreditCard className="h-5 w-5" /> Payment Information
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-4">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600">Status:</span>
                                        <Badge
                                            className={
                                                data.payment_status === 'paid' ||
                                                data.payment_status === 'confirmed'
                                                    ? 'border border-green-200 bg-green-50 text-green-900 shadow-none'
                                                    : data.payment_status === 'refunded'
                                                      ? 'border border-violet-200 bg-violet-50 text-violet-900 shadow-none'
                                                      : 'border border-orange-200 bg-orange-50 text-orange-950 shadow-none'
                                            }
                                        >
                                            {data.payment_status || 'pending'}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600">Amount:</span>
                                        <span className="font-semibold">₵{data.payment_amount?.toFixed(2) || '30.00'}</span>
                                    </div>
                                    {data.payment_reference && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-600">Reference:</span>
                                            <span className="text-sm font-mono">{data.payment_reference}</span>
                                        </div>
                                    )}
                                    {data.payment_date && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-600">Date:</span>
                                            <span className="text-sm">
                                                {new Date(data.payment_date).toLocaleDateString()}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" className="w-full">
                                            <DollarSign className="mr-2 h-4 w-4" />
                                            Update Payment
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Update Payment Information</DialogTitle>
                                            <DialogDescription>
                                                Update payment status and details
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-4 py-4">
                                            <div className="space-y-2">
                                                <Label>Payment Status</Label>
                                                <Select
                                                    value={paymentForm.payment_status}
                                                    onValueChange={(v: any) => setPaymentForm({ ...paymentForm, payment_status: v })}
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
                                                    value={paymentForm.payment_amount}
                                                    onChange={e => setPaymentForm({ ...paymentForm, payment_amount: parseFloat(e.target.value) || 0 })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Reference (Optional)</Label>
                                                <Input
                                                    value={paymentForm.payment_reference}
                                                    onChange={e => setPaymentForm({ ...paymentForm, payment_reference: e.target.value })}
                                                    placeholder="Transaction reference"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Payment Date</Label>
                                                <Input
                                                    type="date"
                                                    value={paymentForm.payment_date}
                                                    onChange={e => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
                                                Cancel
                                            </Button>
                                            <Button onClick={handleUpdatePayment} disabled={updating}>
                                                {updating ? 'Updating...' : 'Update Payment'}
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    )
}
