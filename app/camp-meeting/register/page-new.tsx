'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getActiveCampYear, registerCamper } from '@/lib/actions/camp'
import { CampYear, CampRegistrationForm } from '@/lib/types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { LoadingSpinner } from '@/components/ui/loading'
import { Textarea } from '@/components/ui/textarea'
import { AlertCircle } from 'lucide-react'

export default function CampRegistrationPage() {
    const router = useRouter()
    const { toast } = useToast()

    const [campYear, setCampYear] = useState<CampYear | null>(null)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [currentSection, setCurrentSection] = useState(1)
    const totalSections = 4

    const [formData, setFormData] = useState<CampRegistrationForm>({
        camp_year_id: '',
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        facebook_username: '',
        sex: 'Male',
        date_of_birth: '',
        age_bracket: '13-19',
        address_school_work: '',
        education_level: 'JHS 1',
        highest_qualification: 'JHS',
        residence: '',
        times_attended: 0,
        has_nhis_card: false,
        nhis_card_expiry_date: '',
        has_health_challenge: false,
        health_challenges: [],
        parent_name: '',
        parent_contact: '',
        role: 'Participant',
    })

    useEffect(() => {
        async function fetchYear() {
            const { data, error } = await getActiveCampYear()
            if (data) {
                setCampYear(data)
                setFormData(prev => ({ ...prev, camp_year_id: data.id }))
            } else if (error) {
                console.error(error)
            }
            setLoading(false)
        }
        fetchYear()
    }, [])

    const validateSection = (section: number): boolean => {
        switch (section) {
            case 1:
                return !!(formData.first_name && formData.last_name && formData.phone && formData.sex)
            case 2:
                return !!(formData.address_school_work && formData.education_level && formData.age_bracket && formData.residence)
            case 3:
                return !!(formData.parent_name && formData.parent_contact)
            case 4:
                return true
            default:
                return true
        }
    }

    const handleNext = () => {
        if (validateSection(currentSection)) {
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
        setCurrentSection(Math.max(currentSection - 1, 1))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.camp_year_id) return

        if (!validateSection(currentSection)) {
            toast({
                variant: 'destructive',
                title: 'Please complete all required fields',
            })
            return
        }

        setSubmitting(true)
        const res = await registerCamper(formData)

        if (res.success && res.data) {
            toast({
                title: "Registration Successful!",
                description: "See you at the camp!",
            })
            const params = new URLSearchParams()
            params.set('id', res.data.id)
            params.set('qr', res.data.qr_code)
            params.set('name', `${formData.first_name} ${formData.last_name}`)

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

    if (loading) return <div className="h-screen flex items-center justify-center"><LoadingSpinner /></div>

    if (!campYear) {
        return (
            <div className="h-screen flex items-center justify-center bg-gray-50">
                <Card className="max-w-md w-full">
                    <CardHeader>
                        <CardTitle>No Active Camp Meeting</CardTitle>
                        <CardDescription>Registration is currently closed.</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Campus GEM Camp Meeting {campYear.year}</h1>
                    <p className="mt-2 text-xl text-blue-600 font-semibold">{campYear.theme}</p>
                    <p className="mt-1 text-sm text-gray-500">
                        {new Date(campYear.start_date).toLocaleDateString()} - {new Date(campYear.end_date).toLocaleDateString()}
                    </p>
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800">
                            <strong>Registration Fee:</strong> 30 Cedis for accommodation
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                            Account: 059 194 8904 | Please bring your NHIS card
                        </p>
                    </div>
                </div>

                {/* Progress Indicator */}
                <div className="mb-6">
                    <div className="flex justify-between mb-2">
                        {[1, 2, 3, 4].map((num) => (
                            <div key={num} className={`flex-1 ${num < 4 ? 'mr-2' : ''}`}>
                                <div className={`h-2 rounded-full ${currentSection >= num ? 'bg-blue-600' : 'bg-gray-200'}`} />
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                        <span>Personal Info</span>
                        <span>Education & Location</span>
                        <span>Parent/Guardian</span>
                        <span>Health & Final</span>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>
                            {currentSection === 1 && 'Personal Information'}
                            {currentSection === 2 && 'Education & Location'}
                            {currentSection === 3 && 'Parent/Guardian Information'}
                            {currentSection === 4 && 'Health Information & Review'}
                        </CardTitle>
                        <CardDescription>
                            Section {currentSection} of {totalSections}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={currentSection === totalSections ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }}>
                            {/* Section 1: Personal Information */}
                            {currentSection === 1 && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="first_name">First Name *</Label>
                                            <Input
                                                id="first_name"
                                                required
                                                value={formData.first_name}
                                                onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                                                placeholder="John"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="last_name">Last Name *</Label>
                                            <Input
                                                id="last_name"
                                                required
                                                value={formData.last_name}
                                                onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                                                placeholder="Doe"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={formData.email}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                            placeholder="john@example.com"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="facebook_username">Facebook Username</Label>
                                        <Input
                                            id="facebook_username"
                                            value={formData.facebook_username}
                                            onChange={e => setFormData({ ...formData, facebook_username: e.target.value })}
                                            placeholder="@username"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="sex">Sex *</Label>
                                        <Select
                                            value={formData.sex}
                                            onValueChange={(val: 'Male' | 'Female') => setFormData({ ...formData, sex: val })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Male">Male</SelectItem>
                                                <SelectItem value="Female">Female</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="date_of_birth">Date of Birth</Label>
                                            <Input
                                                id="date_of_birth"
                                                type="date"
                                                value={formData.date_of_birth}
                                                onChange={e => setFormData({ ...formData, date_of_birth: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="age_bracket">Age Bracket *</Label>
                                            <Select
                                                value={formData.age_bracket}
                                                onValueChange={(val: any) => setFormData({ ...formData, age_bracket: val })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="1-12">1-12</SelectItem>
                                                    <SelectItem value="13-19">13-19</SelectItem>
                                                    <SelectItem value="20-29">20-29</SelectItem>
                                                    <SelectItem value="30-39">30-39</SelectItem>
                                                    <SelectItem value="40-49">40-49</SelectItem>
                                                    <SelectItem value="50+">50+</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Contact Number *</Label>
                                        <Input
                                            id="phone"
                                            type="tel"
                                            required
                                            value={formData.phone}
                                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                            placeholder="024XXXXXXX"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Section 2: Education & Location */}
                            {currentSection === 2 && (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="address_school_work">Address/School/Place of Work *</Label>
                                        <Textarea
                                            id="address_school_work"
                                            required
                                            value={formData.address_school_work}
                                            onChange={e => setFormData({ ...formData, address_school_work: e.target.value })}
                                            placeholder="Indicate N/A if you are neither a student nor working"
                                            rows={2}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="education_level">Level at School? *</Label>
                                        <Select
                                            value={formData.education_level}
                                            onValueChange={(val: any) => setFormData({ ...formData, education_level: val })}
                                        >
                                            <SelectTrigger>
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
                                        <Label htmlFor="highest_qualification">Course/Highest Qualification *</Label>
                                        <Select
                                            value={formData.highest_qualification}
                                            onValueChange={(val: 'JHS' | 'SHS' | 'University') => setFormData({ ...formData, highest_qualification: val })}
                                        >
                                            <SelectTrigger>
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
                                        <Label htmlFor="residence">Where do you reside? *</Label>
                                        <Input
                                            id="residence"
                                            required
                                            value={formData.residence}
                                            onChange={e => setFormData({ ...formData, residence: e.target.value })}
                                            placeholder="Example: Adenta, GA"
                                        />
                                        <p className="text-xs text-gray-500">Format: TOWN, REGION</p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="times_attended">How many times have you been to the camp? *</Label>
                                        <Select
                                            value={formData.times_attended?.toString()}
                                            onValueChange={(val) => setFormData({ ...formData, times_attended: parseInt(val) })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="0">0 (First Timer)</SelectItem>
                                                <SelectItem value="1">1</SelectItem>
                                                <SelectItem value="2">2</SelectItem>
                                                <SelectItem value="3">3</SelectItem>
                                                <SelectItem value="4">4</SelectItem>
                                                <SelectItem value="5">5</SelectItem>
                                                <SelectItem value="6">6+</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            )}

                            {/* Section 3: Parent/Guardian */}
                            {currentSection === 3 && (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="parent_name">Parent's Name *</Label>
                                        <Input
                                            id="parent_name"
                                            required
                                            value={formData.parent_name}
                                            onChange={e => setFormData({ ...formData, parent_name: e.target.value })}
                                            placeholder="Parent/Guardian Full Name"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="parent_contact">Parent's Contact Number *</Label>
                                        <Input
                                            id="parent_contact"
                                            type="tel"
                                            required
                                            value={formData.parent_contact}
                                            onChange={e => setFormData({ ...formData, parent_contact: e.target.value })}
                                            placeholder="024XXXXXXX"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Section 4: Health & Review */}
                            {currentSection === 4 && (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <div className="flex items-center space-x-2">
                                            <Checkbox
                                                id="has_nhis_card"
                                                checked={formData.has_nhis_card}
                                                onCheckedChange={(checked) => setFormData({ ...formData, has_nhis_card: checked === true })}
                                            />
                                            <Label htmlFor="has_nhis_card">Do you have an NHIS card? *</Label>
                                        </div>
                                        {formData.has_nhis_card && (
                                            <div className="ml-6 mt-2">
                                                <Label htmlFor="nhis_card_expiry_date">Date of Expiration</Label>
                                                <Input
                                                    id="nhis_card_expiry_date"
                                                    type="date"
                                                    value={formData.nhis_card_expiry_date}
                                                    onChange={e => setFormData({ ...formData, nhis_card_expiry_date: e.target.value })}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center space-x-2">
                                            <Checkbox
                                                id="has_health_challenge"
                                                checked={formData.has_health_challenge}
                                                onCheckedChange={(checked) => setFormData({ ...formData, has_health_challenge: checked === true })}
                                            />
                                            <Label htmlFor="has_health_challenge">Do you have any peculiar health challenge? *</Label>
                                        </div>
                                        {formData.has_health_challenge && (
                                            <div className="ml-6 mt-2 space-y-2">
                                                <Label>Please indicate the health challenge(s):</Label>
                                                <div className="space-y-2">
                                                    {['Asthma', 'Ulcer', 'other'].map((challenge) => (
                                                        <div key={challenge} className="flex items-center space-x-2">
                                                            <Checkbox
                                                                id={`health_${challenge}`}
                                                                checked={formData.health_challenges?.includes(challenge)}
                                                                onCheckedChange={(checked) => {
                                                                    const current = formData.health_challenges || []
                                                                    if (checked) {
                                                                        setFormData({ ...formData, health_challenges: [...current, challenge] })
                                                                    } else {
                                                                        setFormData({ ...formData, health_challenges: current.filter(c => c !== challenge) })
                                                                    }
                                                                }}
                                                            />
                                                            <Label htmlFor={`health_${challenge}`} className="font-normal">
                                                                {challenge.charAt(0).toUpperCase() + challenge.slice(1)}
                                                            </Label>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                        <p className="text-sm font-medium text-blue-900 mb-2">Registration Summary</p>
                                        <div className="text-xs text-blue-800 space-y-1">
                                            <p><strong>Name:</strong> {formData.first_name} {formData.last_name}</p>
                                            <p><strong>Contact:</strong> {formData.phone}</p>
                                            <p><strong>Times Attended:</strong> {formData.times_attended === 0 ? 'First Timer' : formData.times_attended}</p>
                                            <p><strong>Registration Fee:</strong> 30 Cedis</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Navigation Buttons */}
                            <div className="flex justify-between mt-6">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handlePrevious}
                                    disabled={currentSection === 1}
                                >
                                    Previous
                                </Button>
                                {currentSection < totalSections ? (
                                    <Button type="submit">
                                        Next
                                    </Button>
                                ) : (
                                    <Button type="submit" disabled={submitting}>
                                        {submitting ? (
                                            <>
                                                <LoadingSpinner size="sm" className="mr-2" />
                                                Registering...
                                            </>
                                        ) : (
                                            'Submit Registration'
                                        )}
                                    </Button>
                                )}
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}


