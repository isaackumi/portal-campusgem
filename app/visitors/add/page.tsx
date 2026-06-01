'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { dataService } from '@/lib/services/data-service'
import { CreateVisitorForm } from '@/lib/types'
import { useClientOnly } from '@/lib/hooks/use-client-only'
import { DashboardLayout } from '@/components/dashboard-layout'
import { 
  ArrowLeft, 
  UserPlus, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Users,
  Church,
  MessageSquare
} from 'lucide-react'

export default function AddVisitorPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [formData, setFormData] = useState<CreateVisitorForm>({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    address: '',
    visit_date: '', // Will be set after mount
    service_attended: '',
    how_heard_about_church: '',
    invited_by_member_id: 'none',
    follow_up_notes: '',
    follow_up_date: ''
  })
  const [loading, setLoading] = useState(false)
  const [members, setMembers] = useState<any[]>([])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth')
    }
  }, [user, authLoading, router])

  const isMounted = useClientOnly()

  // Set today's date after mount to prevent hydration mismatch
  useEffect(() => {
    if (isMounted && formData.visit_date === '') {
      setFormData(prev => ({
        ...prev,
        visit_date: new Date().toISOString().split('T')[0]
      }))
    }
  }, [isMounted, formData.visit_date])

  useEffect(() => {
    if (user) {
      fetchMembers()
    }
  }, [user])

  const fetchMembers = async () => {
    try {
      const { data, error } = await dataService.getMembers(1, 500)
      if (error) throw new Error(error)
      setMembers(data || [])
    } catch (error) {
      console.error('Error fetching members:', error)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target
    setFormData(prev => ({ ...prev, [id]: value }))
  }

  const handleSelectChange = (id: string, value: string) => {
    setFormData(prev => ({ ...prev, [id]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const payload = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        visit_date: formData.visit_date,
        service_attended: formData.service_attended,
        how_heard_about_church: formData.how_heard_about_church,
        invited_by_member_id: formData.invited_by_member_id === 'none' ? undefined : formData.invited_by_member_id,
        follow_up_notes: formData.follow_up_notes,
        follow_up_date: formData.follow_up_date || undefined,
        is_active: true,
        converted_to_member: false,
        follow_up_completed: false
      }

      const { error } = await dataService.createVisitor(payload)
      if (error) throw new Error(error)

      toast({
        title: "Success",
        description: `${formData.first_name} ${formData.last_name} has been added as a visitor!`,
      })
      router.push('/visitors')

    } catch (error: any) {
      console.error('Error adding visitor:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to add visitor. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-pulse text-primary text-lg">Loading...</div>
        </div>
      </DashboardLayout>
    )
  }

  if (!user) {
    return null
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.push('/visitors')}
            className="mr-3 text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Visitors
          </Button>
          <h1 className="text-3xl font-bold text-slate-900">
            Add New Visitor
          </h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Visitor Information</CardTitle>
            <p className="text-slate-600">Record information about a new church visitor.</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center">
                  <UserPlus className="h-5 w-5 mr-2 text-primary" />
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="first_name">First Name *</Label>
                    <Input 
                      id="first_name" 
                      value={formData.first_name} 
                      onChange={handleChange} 
                      required 
                    />
                  </div>
                  <div>
                    <Label htmlFor="last_name">Last Name</Label>
                    <Input 
                      id="last_name" 
                      value={formData.last_name} 
                      onChange={handleChange} 
                    />
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center">
                  <Phone className="h-5 w-5 mr-2 text-green-600" />
                  Contact Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input 
                      id="phone" 
                      type="tel" 
                      value={formData.phone} 
                      onChange={handleChange} 
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      value={formData.email} 
                      onChange={handleChange} 
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Textarea 
                    id="address" 
                    value={formData.address} 
                    onChange={handleChange} 
                    rows={3} 
                  />
                </div>
              </div>

              {/* Visit Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-purple-600" />
                  Visit Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="visit_date">Visit Date *</Label>
                    <Input 
                      id="visit_date" 
                      type="date" 
                      value={formData.visit_date} 
                      onChange={handleChange} 
                      required 
                    />
                  </div>
                  <div>
                    <Label htmlFor="service_attended">Service Attended</Label>
                    <Select onValueChange={(value) => handleSelectChange('service_attended', value)} value={formData.service_attended}>
                      <SelectTrigger id="service_attended">
                        <SelectValue placeholder="Select service" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sunday_morning">Sunday Morning Service</SelectItem>
                        <SelectItem value="sunday_evening">Sunday Evening Service</SelectItem>
                        <SelectItem value="midweek">Midweek Service</SelectItem>
                        <SelectItem value="youth_service">Youth Service</SelectItem>
                        <SelectItem value="children_service">Children Service</SelectItem>
                        <SelectItem value="special_event">Special Event</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="how_heard_about_church">How did they hear about the church?</Label>
                  <Select onValueChange={(value) => handleSelectChange('how_heard_about_church', value)} value={formData.how_heard_about_church}>
                    <SelectTrigger id="how_heard_about_church">
                      <SelectValue placeholder="Select option" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="friend_family">Friend/Family Member</SelectItem>
                      <SelectItem value="social_media">Social Media</SelectItem>
                      <SelectItem value="website">Website</SelectItem>
                      <SelectItem value="advertisement">Advertisement</SelectItem>
                      <SelectItem value="walk_in">Walk-in</SelectItem>
                      <SelectItem value="invitation_card">Invitation Card</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Invitation Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center">
                  <Users className="h-5 w-5 mr-2 text-orange-600" />
                  Invitation Information
                </h3>
                <div>
                  <Label htmlFor="invited_by_member_id">Invited by Member (Optional)</Label>
                  <Select onValueChange={(value) => handleSelectChange('invited_by_member_id', value)} value={formData.invited_by_member_id}>
                    <SelectTrigger id="invited_by_member_id">
                      <SelectValue placeholder="Select member who invited them" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No one (direct visit)</SelectItem>
                      {members.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.user?.full_name} ({member.user?.membership_id})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Follow-up Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center">
                  <MessageSquare className="h-5 w-5 mr-2 text-red-600" />
                  Follow-up Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="follow_up_date">Follow-up Date</Label>
                    <Input 
                      id="follow_up_date" 
                      type="date" 
                      value={formData.follow_up_date} 
                      onChange={handleChange} 
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="follow_up_notes">Follow-up Notes</Label>
                  <Textarea 
                    id="follow_up_notes" 
                    value={formData.follow_up_notes} 
                    onChange={handleChange} 
                    rows={3}
                    placeholder="Any notes about the visit or follow-up plans..."
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Adding Visitor...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <UserPlus className="h-5 w-5 mr-2" />
                    Add Visitor
                  </div>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
