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

export default function CampRegistrationPage() {
    const router = useRouter()
    const { toast } = useToast()

    const [campYear, setCampYear] = useState<CampYear | null>(null)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)

    const [formData, setFormData] = useState<CampRegistrationForm>({
        camp_year_id: '',
        first_name: '',
        last_name: '',
        full_name: '',
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
        is_new_registrant: true,
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.camp_year_id) return

        setSubmitting(true)
        const res = await registerCamper(formData)

        if (res.success && res.data) {
            toast({
                title: "Registration Successful!",
                description: "See you at the camp!",
            })
            // Correctly construct the URL query parameters
            const params = new URLSearchParams()
            params.set('id', res.data.id)
            params.set('qr', res.data.qr_code)
            params.set('name', res.data.full_name)

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
            <div className="h-screen flex items-center justify-center bg-slate-50">
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
        <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-slate-900">Campus GEM Camp Meeting</h1>
                    <p className="mt-2 text-xl text-primary font-semibold">{campYear.year}: {campYear.theme}</p>
                    <p className="mt-1 text-sm text-slate-500">
                        {new Date(campYear.start_date).toLocaleDateString()} - {new Date(campYear.end_date).toLocaleDateString()}
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Register Now</CardTitle>
                        <CardDescription>Fill in your details to secure your spot.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="full_name">Full Name</Label>
                                <Input
                                    id="full_name"
                                    required
                                    value={formData.full_name}
                                    onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                    placeholder="John Doe"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="john@example.com"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone Number</Label>
                                <Input
                                    id="phone"
                                    type="tel"
                                    required
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="024XXXXXXX"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="role">I am attending as a...</Label>
                                <Select
                                    value={formData.role}
                                    onValueChange={val => setFormData({ ...formData, role: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select your role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Participant">Participant</SelectItem>
                                        <SelectItem value="Volunteer">Volunteer</SelectItem>
                                        <SelectItem value="Music Team">Music Team</SelectItem>
                                        <SelectItem value="Media Team">Media Team</SelectItem>
                                        <SelectItem value="Protocol">Protocol</SelectItem>
                                        <SelectItem value="Medical">Medical</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-center space-x-2 py-2">
                                <Checkbox
                                    id="is_new"
                                    checked={formData.is_new_registrant}
                                    onCheckedChange={(checked) => setFormData({ ...formData, is_new_registrant: checked === true })}
                                />
                                <Label htmlFor="is_new">I am a First Timer / New Attendee</Label>
                            </div>

                            <Button type="submit" className="w-full" disabled={submitting}>
                                {submitting ? <LoadingSpinner size="sm" className="mr-2" /> : null}
                                {submitting ? 'Registering...' : 'Register'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
