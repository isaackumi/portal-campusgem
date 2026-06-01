'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
    getOpenRegistrationCampYear,
    getCampYearById,
    getCampYearByYear,
    lookupCampRegistrationByPhone,
    registerCamper,
} from '@/lib/actions/camp'
import { birthdayPartsFromIsoDate } from '@/lib/camp/birthday'
import { isValidPhone } from '@/lib/phone'
import { CampRegistration, CampYear, CampRegistrationForm } from '@/lib/types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { LoadingSpinner } from '@/components/ui/loading'
import { Textarea } from '@/components/ui/textarea'
import { AlertCircle, ChevronRight, ChevronLeft, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

function CampRegistrationPageContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { toast } = useToast()

    const [campYear, setCampYear] = useState<CampYear | null>(null)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [lookupLoading, setLookupLoading] = useState(false)
    const [lookupDone, setLookupDone] = useState(false)
    const [alreadyRegistered, setAlreadyRegistered] = useState(false)
    const [currentSection, setCurrentSection] = useState(1)
    const totalSections = 4
    const monthOptions = [
        { value: '1', label: 'January' },
        { value: '2', label: 'February' },
        { value: '3', label: 'March' },
        { value: '4', label: 'April' },
        { value: '5', label: 'May' },
        { value: '6', label: 'June' },
        { value: '7', label: 'July' },
        { value: '8', label: 'August' },
        { value: '9', label: 'September' },
        { value: '10', label: 'October' },
        { value: '11', label: 'November' },
        { value: '12', label: 'December' },
    ]

    const [formData, setFormData] = useState<CampRegistrationForm & { has_nhis_card?: boolean | null, has_health_challenge?: boolean | null }>({
        camp_year_id: '',
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        facebook_username: '',
        sex: 'Male',
        date_of_birth: '',
        birth_month: undefined,
        birth_day: undefined,
        age_bracket: '13-19',
        address_school_work: '',
        education_level: 'JHS 1',
        highest_qualification: 'JHS',
        residence: '',
        times_attended: 0,
        has_nhis_card: null as any, // Initialize as null to require explicit Yes/No selection
        nhis_card_expiry_date: '',
        has_health_challenge: null as any, // Initialize as null to require explicit Yes/No selection
        health_challenges: [],
        other_health_challenge: '',
        parent_name: '',
        parent_contact: '',
        role: 'Participant',
    })

    useEffect(() => {
        async function fetchYear() {
            setLoading(true)
            const yearIdParam = searchParams.get('yearId')
            const yearParam = searchParams.get('year')
            let data: CampYear | null = null
            let error: string | null = null

            if (yearIdParam) {
                ;({ data, error } = await getCampYearById(yearIdParam))
            } else if (yearParam) {
                const parsedYear = Number.parseInt(yearParam, 10)
                if (Number.isFinite(parsedYear)) {
                    ;({ data, error } = await getCampYearByYear(parsedYear))
                } else {
                    error = 'Invalid year parameter'
                }
            } else {
                ;({ data, error } = await getOpenRegistrationCampYear())
            }

            if (data) {
                setCampYear(data)
                setFormData(prev => ({ ...prev, camp_year_id: data.id }))
            } else if (error) {
                console.error(error)
                setCampYear(null)
            }
            setLoading(false)
        }
        fetchYear()
    }, [searchParams])

    const applyReturningProfile = (profile: CampRegistration) => {
        setFormData((prev) => ({
            ...prev,
            first_name: profile.first_name || prev.first_name,
            last_name: profile.last_name || prev.last_name,
            email: profile.email || prev.email,
            facebook_username: profile.facebook_username || prev.facebook_username,
            sex: profile.sex || prev.sex,
            date_of_birth: profile.date_of_birth || prev.date_of_birth,
            birth_month: profile.birth_month ?? prev.birth_month,
            birth_day: profile.birth_day ?? prev.birth_day,
            age_bracket: profile.age_bracket || prev.age_bracket,
            address_school_work: profile.address_school_work || prev.address_school_work,
            education_level: profile.education_level || prev.education_level,
            highest_qualification: profile.highest_qualification || prev.highest_qualification,
            residence: profile.residence || prev.residence,
            times_attended: profile.times_attended ?? prev.times_attended,
            has_nhis_card: profile.has_nhis_card ?? prev.has_nhis_card,
            nhis_card_expiry_date: profile.nhis_card_expiry_date || prev.nhis_card_expiry_date,
            has_health_challenge: profile.has_health_challenge ?? prev.has_health_challenge,
            health_challenges: profile.health_challenges || prev.health_challenges,
            parent_name: profile.parent_name || prev.parent_name,
            parent_contact: profile.parent_contact || prev.parent_contact,
            role: profile.role || prev.role,
        }))
    }

    const handlePhoneLookup = async () => {
        if (!campYear || !formData.phone.trim()) {
            toast({
                variant: 'destructive',
                title: 'Phone number required',
                description: 'Enter your contact number before looking up your details.',
            })
            return
        }

        if (!isValidPhone(formData.phone)) {
            toast({
                variant: 'destructive',
                title: 'Invalid phone number',
                description: 'Use a valid Ghana mobile number.',
            })
            return
        }

        setLookupLoading(true)
        try {
            const result = await lookupCampRegistrationByPhone(formData.phone, campYear.id)
            if (result.error) {
                throw new Error(result.error)
            }

            setLookupDone(true)
            setAlreadyRegistered(result.already_registered_this_year)

            if (result.already_registered_this_year) {
                toast({
                    title: 'Already registered',
                    description: `This phone number is already registered for Camp Meeting ${campYear.year}.`,
                })
                return
            }

            if (result.profile) {
                applyReturningProfile(result.profile)
                toast({
                    title: 'Details found',
                    description: 'We filled in your previous camp details. Review and update anything that changed.',
                })
            } else {
                toast({
                    title: 'No previous registration found',
                    description: 'Continue with a new registration for this year.',
                })
            }
        } catch (error: unknown) {
            toast({
                variant: 'destructive',
                title: 'Lookup failed',
                description: error instanceof Error ? error.message : 'Could not look up your details.',
            })
        } finally {
            setLookupLoading(false)
        }
    }

    const validateSection = (section: number): boolean => {
        switch (section) {
            case 1:
                return !!(formData.first_name && formData.last_name && formData.phone && formData.sex)
            case 2:
                return !!(formData.address_school_work && formData.education_level && formData.age_bracket && formData.residence)
            case 3:
                return !!(formData.parent_name && formData.parent_contact)
            case 4:
                // Both questions must be answered (true or false, not null/undefined)
                return (formData.has_nhis_card === true || formData.has_nhis_card === false) &&
                       (formData.has_health_challenge === true || formData.has_health_challenge === false)
            default:
                return true
        }
    }

    const handleNext = () => {
        if (validateSection(currentSection)) {
            // Scroll to top on section change
            window.scrollTo({ top: 0, behavior: 'smooth' })
            setCurrentSection(Math.min(currentSection + 1, totalSections))
        } else {
            toast({
                variant: 'destructive',
                title: 'Please complete all required fields',
                description: 'All fields marked with * are required.',
            })
        }
    }

    const handlePrevious = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' })
        setCurrentSection(Math.max(currentSection - 1, 1))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.camp_year_id || alreadyRegistered) return

        if (!validateSection(currentSection)) {
            toast({
                variant: 'destructive',
                title: 'Please complete all required fields',
                description: 'Please answer all questions with Yes or No.',
            })
            return
        }

        setSubmitting(true)
        // Ensure boolean values are set (convert null to false if needed)
        const submissionData = {
            ...formData,
            has_nhis_card: formData.has_nhis_card ?? false,
            has_health_challenge: formData.has_health_challenge ?? false,
        }
        const res = await registerCamper(submissionData as CampRegistrationForm)

        if (res.success && res.data) {
            toast({
                title: "Registration Successful!",
                description: "See you at the camp!",
            })
            const params = new URLSearchParams()
            params.set('id', res.data.id)
            params.set('qr', res.data.qr_code)
            params.set('name', `${formData.first_name} ${formData.last_name}`)
            if (res.data.check_in_code) params.set('code', res.data.check_in_code)
            if (res.data.role) params.set('role', res.data.role)
            if (typeof window !== 'undefined') {
                params.set('register', encodeURIComponent(`${window.location.origin}/camp-meeting/register`))
            }

            router.push(`/camp-meeting/success?${params.toString()}`)
        } else {
            toast({
                variant: "destructive",
                title: "Registration Failed",
                description: res.error || "Please try again later.",
            })
            setSubmitting(false)
        }
    }

    if (loading) return <div className="h-screen flex items-center justify-center bg-white"><LoadingSpinner /></div>

    if (!campYear || !campYear.registration_open) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white px-4">
                <div className="max-w-md w-full text-center">
                    <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h1 className="text-2xl font-semibold text-slate-900 mb-2">
                        {campYear ? `Camp Meeting ${campYear.year}` : 'No Active Camp Meeting'}
                    </h1>
                    <p className="text-slate-600">
                        {campYear
                            ? 'Registration is not open for this camp year.'
                            : 'Registration is currently closed.'}
                    </p>
                </div>
            </div>
        )
    }

    const sectionTitles = [
        'Personal Information',
        'Education & Location',
        'Parent/Guardian Information',
        'Health Information & Review'
    ]

    return (
        <div className="min-h-screen bg-white">
            {/* Flyer Image - Google Forms Style */}
            {campYear.flyer_image_url && (
                <div className="w-full bg-white border-b border-slate-200">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
                        <div className="flex justify-center">
                            <div className="relative w-full max-w-3xl">
                                <img 
                                    src={campYear.flyer_image_url} 
                                    alt={`Campus GEM Camp Meeting ${campYear.year} Flyer`}
                                    className="w-full h-auto rounded-lg shadow-sm border border-slate-200"
                                    style={{ maxHeight: '600px', objectFit: 'contain' }}
                                    onError={(e) => {
                                        // Hide image if it fails to load
                                        e.currentTarget.style.display = 'none'
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Header - Google Forms Style */}
            <div className="border-b border-slate-200 bg-white sticky top-0 z-10 shadow-sm">
                <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4">
                    <div className="text-center sm:text-left">
                        <h1 className="text-xl sm:text-2xl font-normal text-slate-900">
                            Campus GEM Camp Meeting {campYear.year}
                        </h1>
                        <p className="text-sm sm:text-base text-primary mt-1 font-medium">
                            {campYear.theme}
                        </p>
                        <p className="text-xs sm:text-sm text-slate-500 mt-1">
                            {new Date(campYear.start_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} - {new Date(campYear.end_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </p>
                    </div>
                    
                    {/* Progress Bar - Mobile Optimized */}
                    <div className="mt-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs sm:text-sm font-medium text-slate-700">
                                Section {currentSection} of {totalSections}
                            </span>
                            <span className="text-xs text-slate-500">
                                {Math.round((currentSection / totalSections) * 100)}% Complete
                            </span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary transition-all duration-300 ease-out"
                                style={{ width: `${(currentSection / totalSections) * 100}%` }}
                            />
                        </div>
                    </div>

                    {/* Fee Notice - Mobile Friendly */}
                    <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                        <p className="text-xs sm:text-sm text-slate-900 font-medium">
                            Registration Fee: ₵30 for accommodation
                        </p>
                        <p className="text-xs text-slate-700 mt-1">
                            Mobile Money: 059 194 8904 | Please bring your NHIS card
                        </p>
                    </div>
                </div>
            </div>

            {/* Form Content */}
            <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
                {/* Section Title */}
                <div className="mb-6 pb-4 border-b border-slate-200">
                    <h2 className="text-lg sm:text-xl font-normal text-slate-900">
                        {sectionTitles[currentSection - 1]}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1">
                        Fields marked with <span className="text-red-500">*</span> are required
                    </p>
                </div>

                <form onSubmit={currentSection === totalSections ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }}>
                    {/* Section 1: Personal Information */}
                    {currentSection === 1 && (
                        <div className="space-y-6">
                            {/* First Name & Last Name - Stack on mobile */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="first_name" className="text-sm font-normal text-slate-700">
                                        First Name <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="first_name"
                                        required
                                        value={formData.first_name}
                                        onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                                        placeholder="Enter your first name"
                                        className="h-11 text-base bg-white border-gray-300 focus:border-slate-900 focus:ring-slate-900"
                                        autoFocus
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="last_name" className="text-sm font-normal text-slate-700">
                                        Last Name <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="last_name"
                                        required
                                        value={formData.last_name}
                                        onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                                        placeholder="Enter your last name"
                                        className="h-11 text-base bg-white border-gray-300 focus:border-slate-900 focus:ring-slate-900"
                                    />
                                </div>
                            </div>

                            {/* Phone - Most important on mobile */}
                            <div className="space-y-2">
                                <Label htmlFor="phone" className="text-sm font-normal text-slate-700">
                                    Contact Number <span className="text-red-500">*</span>
                                </Label>
                                <div className="flex flex-col gap-2 sm:flex-row">
                                    <Input
                                        id="phone"
                                        type="tel"
                                        required
                                        value={formData.phone}
                                        onChange={e => {
                                            setLookupDone(false)
                                            setAlreadyRegistered(false)
                                            setFormData({ ...formData, phone: e.target.value })
                                        }}
                                        placeholder="0241234567"
                                        className="h-11 text-base bg-white border-gray-300 focus:border-slate-900 focus:ring-slate-900"
                                        inputMode="tel"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="h-11"
                                        onClick={handlePhoneLookup}
                                        disabled={lookupLoading || !formData.phone.trim()}
                                    >
                                        {lookupLoading ? 'Looking up...' : 'Find my details'}
                                    </Button>
                                </div>
                                <p className="text-xs text-slate-500">
                                    Returning campers can look up previous details with the same phone number.
                                </p>
                                {alreadyRegistered && campYear && (
                                    <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                                        This phone number is already registered for Camp Meeting {campYear.year}.
                                    </div>
                                )}
                                {lookupDone && !alreadyRegistered && (
                                    <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900">
                                        Review the pre-filled details below before you submit.
                                    </div>
                                )}
                            </div>

                            {/* Email */}
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-sm font-normal text-slate-700">
                                    Email Address
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="your.email@example.com"
                                    className="h-11 text-base bg-white border-gray-300 focus:border-slate-900 focus:ring-slate-900"
                                    inputMode="email"
                                />
                            </div>

                            {/* Sex */}
                            <div className="space-y-2">
                                <Label htmlFor="sex" className="text-sm font-normal text-slate-700">
                                    Sex <span className="text-red-500">*</span>
                                </Label>
                                <Select
                                    value={formData.sex}
                                    onValueChange={(val: 'Male' | 'Female') => setFormData({ ...formData, sex: val })}
                                >
                                    <SelectTrigger className="h-11 text-base bg-white border-gray-300 focus:border-slate-900 focus:ring-slate-900">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Male">Male</SelectItem>
                                        <SelectItem value="Female">Female</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Date of Birth & Age Bracket */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="date_of_birth" className="text-sm font-normal text-slate-700">
                                        Date of Birth
                                    </Label>
                                    <Input
                                        id="date_of_birth"
                                        type="date"
                                        value={formData.date_of_birth}
                                        onChange={e => {
                                            const dateOfBirth = e.target.value
                                            const birthday = birthdayPartsFromIsoDate(dateOfBirth)
                                            setFormData({
                                                ...formData,
                                                date_of_birth: dateOfBirth,
                                                birth_month: birthday.birth_month,
                                                birth_day: birthday.birth_day,
                                            })
                                        }}
                                        className="h-11 text-base bg-white border-gray-300 focus:border-slate-900 focus:ring-slate-900"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="age_bracket" className="text-sm font-normal text-slate-700">
                                        Age Bracket <span className="text-red-500">*</span>
                                    </Label>
                                    <Select
                                        value={formData.age_bracket}
                                        onValueChange={(val: any) => setFormData({ ...formData, age_bracket: val })}
                                    >
                                        <SelectTrigger className="h-11 text-base bg-white border-gray-300 focus:border-slate-900 focus:ring-slate-900">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="1-12">1-12 years</SelectItem>
                                            <SelectItem value="13-19">13-19 years</SelectItem>
                                            <SelectItem value="20-29">20-29 years</SelectItem>
                                            <SelectItem value="30-39">30-39 years</SelectItem>
                                            <SelectItem value="40-49">40-49 years</SelectItem>
                                            <SelectItem value="50+">50+ years</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="birth_month" className="text-sm font-normal text-slate-700">
                                        Birthday month
                                    </Label>
                                    <Select
                                        value={formData.birth_month != null ? String(formData.birth_month) : ''}
                                        onValueChange={(value) =>
                                            setFormData({
                                                ...formData,
                                                birth_month: value ? Number(value) : undefined,
                                            })
                                        }
                                    >
                                        <SelectTrigger className="h-11 text-base bg-white border-gray-300 focus:border-slate-900 focus:ring-slate-900">
                                            <SelectValue placeholder="Select month" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {monthOptions.map((month) => (
                                                <SelectItem key={month.value} value={month.value}>
                                                    {month.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="birth_day" className="text-sm font-normal text-slate-700">
                                        Birthday day
                                    </Label>
                                    <Input
                                        id="birth_day"
                                        type="number"
                                        min={1}
                                        max={31}
                                        value={formData.birth_day ?? ''}
                                        onChange={(e) => {
                                            const value = e.target.value
                                            setFormData({
                                                ...formData,
                                                birth_day: value ? Number(value) : undefined,
                                            })
                                        }}
                                        placeholder="Day"
                                        className="h-11 text-base bg-white border-gray-300 focus:border-slate-900 focus:ring-slate-900"
                                        inputMode="numeric"
                                    />
                                </div>
                            </div>
                            <p className="text-xs text-slate-500">
                                We use month and day only for birthday reminders, not your full birth year.
                            </p>

                            {/* Facebook - Optional */}
                            <div className="space-y-2">
                                <Label htmlFor="facebook_username" className="text-sm font-normal text-slate-700">
                                    Facebook Username
                                </Label>
                                <Input
                                    id="facebook_username"
                                    value={formData.facebook_username}
                                    onChange={e => setFormData({ ...formData, facebook_username: e.target.value })}
                                    placeholder="@username or username"
                                    className="h-11 text-base bg-white border-gray-300 focus:border-slate-900 focus:ring-slate-900"
                                />
                            </div>
                        </div>
                    )}

                    {/* Section 2: Education & Location */}
                    {currentSection === 2 && (
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="address_school_work" className="text-sm font-normal text-slate-700">
                                    Address/School/Place of Work <span className="text-red-500">*</span>
                                </Label>
                                <Textarea
                                    id="address_school_work"
                                    required
                                    value={formData.address_school_work}
                                    onChange={e => setFormData({ ...formData, address_school_work: e.target.value })}
                                    placeholder="Enter your address, school, or place of work. Type 'N/A' if not applicable."
                                    rows={3}
                                    className="text-base bg-white border-gray-300 focus:border-slate-900 focus:ring-slate-900 resize-none"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="education_level" className="text-sm font-normal text-slate-700">
                                    Level at School? <span className="text-red-500">*</span>
                                </Label>
                                <Select
                                    value={formData.education_level}
                                    onValueChange={(val: any) => setFormData({ ...formData, education_level: val })}
                                >
                                    <SelectTrigger className="h-11 text-base bg-white border-gray-300 focus:border-slate-900 focus:ring-slate-900">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="JHS 1">JHS 1</SelectItem>
                                        <SelectItem value="JHS 2">JHS 2</SelectItem>
                                        <SelectItem value="JHS 3">JHS 3</SelectItem>
                                        <SelectItem value="SHS 1">SHS 1</SelectItem>
                                        <SelectItem value="SHS 2">SHS 2</SelectItem>
                                        <SelectItem value="SHS 3">SHS 3</SelectItem>
                                        <SelectItem value="COMPLETED SHS">COMPLETED SHS</SelectItem>
                                        <SelectItem value="LEVEL 100">LEVEL 100</SelectItem>
                                        <SelectItem value="LEVEL 200">LEVEL 200</SelectItem>
                                        <SelectItem value="LEVEL 300">LEVEL 300</SelectItem>
                                        <SelectItem value="LEVEL 400">LEVEL 400</SelectItem>
                                        <SelectItem value="GRADUATED">GRADUATED</SelectItem>
                                        <SelectItem value="POSTGRADUATE">POSTGRADUATE</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="highest_qualification" className="text-sm font-normal text-slate-700">
                                    Course/Highest Qualification <span className="text-red-500">*</span>
                                </Label>
                                <Select
                                    value={formData.highest_qualification}
                                    onValueChange={(val: 'JHS' | 'SHS' | 'University') => setFormData({ ...formData, highest_qualification: val })}
                                >
                                    <SelectTrigger className="h-11 text-base bg-white border-gray-300 focus:border-slate-900 focus:ring-slate-900">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="JHS">JHS</SelectItem>
                                        <SelectItem value="SHS">SHS</SelectItem>
                                        <SelectItem value="University">University</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="residence" className="text-sm font-normal text-slate-700">
                                    Where do you reside? <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="residence"
                                    required
                                    value={formData.residence}
                                    onChange={e => setFormData({ ...formData, residence: e.target.value })}
                                    placeholder="Example: Adenta, Greater Accra"
                                    className="h-11 text-base bg-white border-gray-300 focus:border-slate-900 focus:ring-slate-900"
                                />
                                <p className="text-xs text-slate-500">Format: Town, Region (e.g., Adenta, Greater Accra)</p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="times_attended" className="text-sm font-normal text-slate-700">
                                    How many times have you been to the camp? <span className="text-red-500">*</span>
                                </Label>
                                <Select
                                    value={formData.times_attended?.toString()}
                                    onValueChange={(val) => setFormData({ ...formData, times_attended: parseInt(val) })}
                                >
                                    <SelectTrigger className="h-11 text-base bg-white border-gray-300 focus:border-slate-900 focus:ring-slate-900">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="0">0 (First Timer)</SelectItem>
                                        <SelectItem value="1">1 time</SelectItem>
                                        <SelectItem value="2">2 times</SelectItem>
                                        <SelectItem value="3">3 times</SelectItem>
                                        <SelectItem value="4">4 times</SelectItem>
                                        <SelectItem value="5">5 times</SelectItem>
                                        <SelectItem value="6">6+ times</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    {/* Section 3: Parent/Guardian */}
                    {currentSection === 3 && (
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="parent_name" className="text-sm font-normal text-slate-700">
                                    Parent/Guardian Name <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="parent_name"
                                    required
                                    value={formData.parent_name}
                                    onChange={e => setFormData({ ...formData, parent_name: e.target.value })}
                                    placeholder="Enter parent or guardian full name"
                                    className="h-11 text-base bg-white border-gray-300 focus:border-slate-900 focus:ring-slate-900"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="parent_contact" className="text-sm font-normal text-slate-700">
                                    Parent/Guardian Contact Number <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="parent_contact"
                                    type="tel"
                                    required
                                    value={formData.parent_contact}
                                    onChange={e => setFormData({ ...formData, parent_contact: e.target.value })}
                                    placeholder="0241234567"
                                    className="h-11 text-base bg-white border-gray-300 focus:border-slate-900 focus:ring-slate-900"
                                    inputMode="tel"
                                />
                            </div>
                        </div>
                    )}

                    {/* Section 4: Health & Review */}
                    {currentSection === 4 && (
                        <div className="space-y-6">
                            {/* NHIS Card Question */}
                            <div className="space-y-3">
                                <Label className="text-sm font-normal text-slate-700">
                                    Do you have an NHIS card? <span className="text-red-500">*</span>
                                </Label>
                                <div className="flex gap-3">
                                    <Button
                                        type="button"
                                        variant={formData.has_nhis_card === true ? "default" : "outline"}
                                        onClick={() => setFormData({ ...formData, has_nhis_card: true })}
                                        className={cn(
                                            "flex-1 h-11 text-base font-normal",
                                            formData.has_nhis_card === true 
                                                ? " border-slate-900" 
                                                : "bg-white border-gray-300 text-slate-700 hover:bg-slate-50"
                                        )}
                                    >
                                        Yes
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={formData.has_nhis_card === false ? "default" : "outline"}
                                        onClick={() => {
                                            setFormData({ 
                                                ...formData, 
                                                has_nhis_card: false,
                                                nhis_card_expiry_date: '' // Clear expiry date when No is selected
                                            })
                                        }}
                                        className={cn(
                                            "flex-1 h-11 text-base font-normal",
                                            formData.has_nhis_card === false 
                                                ? " border-slate-900" 
                                                : "bg-white border-gray-300 text-slate-700 hover:bg-slate-50"
                                        )}
                                    >
                                        No
                                    </Button>
                                </div>
                                {formData.has_nhis_card === true && (
                                    <div className="mt-4">
                                        <Label htmlFor="nhis_card_expiry_date" className="text-sm font-normal text-slate-700">
                                            NHIS Card Expiry Date
                                        </Label>
                                        <Input
                                            id="nhis_card_expiry_date"
                                            type="date"
                                            value={formData.nhis_card_expiry_date}
                                            onChange={e => setFormData({ ...formData, nhis_card_expiry_date: e.target.value })}
                                            className="h-11 text-base bg-white border-gray-300 focus:border-slate-900 focus:ring-slate-900 mt-2"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Health Challenge Question */}
                            <div className="space-y-3">
                                <Label className="text-sm font-normal text-slate-700">
                                    Do you have any peculiar health challenge? <span className="text-red-500">*</span>
                                </Label>
                                <div className="flex gap-3">
                                    <Button
                                        type="button"
                                        variant={formData.has_health_challenge === true ? "default" : "outline"}
                                        onClick={() => setFormData({ ...formData, has_health_challenge: true })}
                                        className={cn(
                                            "flex-1 h-11 text-base font-normal",
                                            formData.has_health_challenge === true 
                                                ? " border-slate-900" 
                                                : "bg-white border-gray-300 text-slate-700 hover:bg-slate-50"
                                        )}
                                    >
                                        Yes
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={formData.has_health_challenge === false ? "default" : "outline"}
                                        onClick={() => {
                                            setFormData({ 
                                                ...formData, 
                                                has_health_challenge: false,
                                                health_challenges: [], // Clear health challenges when No is selected
                                                other_health_challenge: '' // Clear other health challenge text
                                            })
                                        }}
                                        className={cn(
                                            "flex-1 h-11 text-base font-normal",
                                            formData.has_health_challenge === false 
                                                ? " border-slate-900" 
                                                : "bg-white border-gray-300 text-slate-700 hover:bg-slate-50"
                                        )}
                                    >
                                        No
                                    </Button>
                                </div>
                                {formData.has_health_challenge === true && (
                                    <div className="mt-4 space-y-3">
                                        <Label className="text-sm font-normal text-slate-700">
                                            Please indicate the health challenge(s):
                                        </Label>
                                        <div className="space-y-2">
                                            {['Asthma', 'Ulcer', 'other'].map((challenge) => (
                                                <div key={challenge} className="flex items-start space-x-3">
                                                    <Checkbox
                                                        id={`health_${challenge}`}
                                                        checked={formData.health_challenges?.includes(challenge)}
                                                        onCheckedChange={(checked) => {
                                                            const current = formData.health_challenges || []
                                                            if (checked) {
                                                                setFormData({ ...formData, health_challenges: [...current, challenge] })
                                                            } else {
                                                                setFormData({ 
                                                                    ...formData, 
                                                                    health_challenges: current.filter(c => c !== challenge),
                                                                    other_health_challenge: challenge === 'other' ? '' : formData.other_health_challenge 
                                                                })
                                                            }
                                                        }}
                                                        className="mt-1 h-5 w-5 border-gray-300"
                                                    />
                                                    <Label htmlFor={`health_${challenge}`} className="text-sm font-normal text-slate-700 cursor-pointer flex-1">
                                                        {challenge.charAt(0).toUpperCase() + challenge.slice(1)}
                                                    </Label>
                                                </div>
                                            ))}
                                            {formData.health_challenges?.includes('other') && (
                                                <div className="ml-8 mt-2">
                                                    <Input
                                                        id="other_health_challenge"
                                                        value={formData.other_health_challenge || ''}
                                                        onChange={e => setFormData({ ...formData, other_health_challenge: e.target.value })}
                                                        placeholder="Please specify your health challenge"
                                                        className="h-11 text-base bg-white border-gray-300 focus:border-slate-900 focus:ring-slate-900"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Summary */}
                            <div className="mt-8 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                                <div className="flex items-center gap-2 mb-3">
                                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                                    <h3 className="text-sm font-medium text-slate-900">Registration Summary</h3>
                                </div>
                                <div className="space-y-2 text-sm text-slate-700">
                                    <div className="flex justify-between">
                                        <span className="text-slate-600">Name:</span>
                                        <span className="font-medium">{formData.first_name} {formData.last_name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-600">Contact:</span>
                                        <span className="font-medium">{formData.phone}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-600">Times Attended:</span>
                                        <span className="font-medium">{formData.times_attended === 0 ? 'First Timer' : `${formData.times_attended} time(s)`}</span>
                                    </div>
                                    <div className="flex justify-between pt-2 border-t border-slate-200">
                                        <span className="text-slate-600">Registration Fee:</span>
                                        <span className="font-bold text-primary">₵30.00</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Navigation Buttons - Mobile Optimized */}
                    <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 mt-8 pt-6 border-t border-slate-200">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handlePrevious}
                            disabled={currentSection === 1}
                            className="h-12 text-base w-full sm:w-auto border-gray-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft className="h-5 w-5 mr-1" />
                            Previous
                        </Button>
                        {currentSection < totalSections ? (
                            <Button 
                                type="submit" 
                                className="h-12 text-base w-full sm:w-auto"
                            >
                                Next
                                <ChevronRight className="h-5 w-5 ml-1" />
                            </Button>
                        ) : (
                            <Button 
                                type="submit" 
                                disabled={submitting || alreadyRegistered}
                                className="h-12 text-base w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                            >
                                {submitting ? (
                                    <>
                                        <LoadingSpinner size="sm" className="mr-2" />
                                        Submitting...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="h-5 w-5 mr-2" />
                                        Submit Registration
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </form>
            </div>

            {/* Footer - Mobile Friendly */}
            <div className="border-t border-slate-200 bg-slate-50 mt-12">
                <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 text-center">
                    <p className="text-xs text-slate-500">
                        Campus GEM Ministries | Camp Meeting Registration
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                        Your information is secure and confidential
                    </p>
                </div>
            </div>
        </div>
    )
}

export default function CampRegistrationPage() {
    return (
        <Suspense fallback={<div className="h-screen flex items-center justify-center bg-white"><LoadingSpinner /></div>}>
            <CampRegistrationPageContent />
        </Suspense>
    )
}
