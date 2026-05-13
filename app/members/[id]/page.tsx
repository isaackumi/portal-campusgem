'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/components/providers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { dataService } from '@/lib/services/data-service'
import { useQuery } from '@tanstack/react-query'
import { Member, AppUser, Dependant, GroupMembership, Attendance } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import { calculateProfileCompletion, getCompletionColor, getCompletionMessage, getNextSteps } from '@/lib/profile-completion'
import { 
  ArrowLeft, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Briefcase, 
  Heart,
  Users,
  Edit,
  Camera,
  CheckCircle,
  Circle,
  Droplets,
  Church,
  Star,
  FileText
} from 'lucide-react'

interface MemberWithDetails extends Member {
  user: AppUser
  dependants: Dependant[]
  group_memberships: (GroupMembership & { group: { name: string; group_type: string } })[]
}

export default function MemberProfilePage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()

  const [attendanceHistory, setAttendanceHistory] = useState<Attendance[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    role: '',
    address: '',
    occupation: '',
    place_of_work: '',
    marital_status: '',
    spouse_name: '',
    children_count: 0,
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relation: ''
  })

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth')
    }
  }, [user, authLoading, router])

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    // Reset form to original values
    if (memberQuery.data?.data) {
      const memberData = memberQuery.data.data
      setEditForm({
        full_name: memberData.user?.full_name || '',
        phone: memberData.user?.phone || '',
        email: memberData.user?.email || '',
        role: memberData.user?.role || '',
        address: memberData.address || '',
        occupation: memberData.user?.occupation || '',
        place_of_work: memberData.user?.place_of_work || '',
        marital_status: memberData.user?.marital_status || '',
        spouse_name: memberData.user?.spouse_name || '',
        children_count: memberData.user?.children_count || 0,
        emergency_contact_name: memberData.user?.emergency_contact_name || '',
        emergency_contact_phone: memberData.user?.emergency_contact_phone || '',
        emergency_contact_relation: memberData.user?.emergency_contact_relation || ''
      })
    }
  }

  const handleSaveEdit = async () => {
    if (!memberQuery.data?.data?.user) return

    try {
      setLoading(true)
      
      const userId = memberQuery.data.data.user.id
      const memberId = memberQuery.data.data.id
      const { error: userError } = await dataService.updateUser(userId, {
        full_name: editForm.full_name,
        phone: editForm.phone,
        email: editForm.email,
        role: editForm.role as any,
        occupation: editForm.occupation,
        place_of_work: editForm.place_of_work,
        marital_status:
          editForm.marital_status === ''
            ? undefined
            : (editForm.marital_status as AppUser['marital_status']),
        spouse_name: editForm.spouse_name,
        children_count: editForm.children_count,
        emergency_contact_name: editForm.emergency_contact_name,
        emergency_contact_phone: editForm.emergency_contact_phone,
        emergency_contact_relation: editForm.emergency_contact_relation
      })
      if (userError) throw new Error(userError)

      const { error: memberError } = await dataService.updateMember(memberId, { address: editForm.address })
      if (memberError) throw new Error(memberError)

      toast({
        title: "Profile Updated",
        description: "Member information has been successfully updated.",
        variant: "default"
      })

      setIsEditing(false)
      // Refresh member data
      memberQuery.refetch()
    } catch (error) {
      console.error('Error updating member:', error)
      toast({
        title: "Update Failed",
        description: "Failed to update member information. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const memberQuery = useQuery({
    queryKey: ['member-profile', params.id],
    queryFn: async () => dataService.getMember(params.id as string),
    enabled: Boolean(user && params.id),
    staleTime: 30_000
  })

  const attendanceQuery = useQuery({
    queryKey: ['member-attendance', params.id],
    queryFn: async () => dataService.getAttendanceByMember(params.id as string, 50),
    enabled: Boolean(user && params.id),
    staleTime: 30_000
  })

  // Initialize edit form when member data loads
  useEffect(() => {
    if (memberQuery.data?.data) {
      const memberData = memberQuery.data.data
      setEditForm({
        full_name: memberData.user?.full_name || '',
        phone: memberData.user?.phone || '',
        email: memberData.user?.email || '',
        role: memberData.user?.role || '',
        address: memberData.address || '',
        occupation: memberData.user?.occupation || '',
        place_of_work: memberData.user?.place_of_work || '',
        marital_status: memberData.user?.marital_status || '',
        spouse_name: memberData.user?.spouse_name || '',
        children_count: memberData.user?.children_count || 0,
        emergency_contact_name: memberData.user?.emergency_contact_name || '',
        emergency_contact_phone: memberData.user?.emergency_contact_phone || '',
        emergency_contact_relation: memberData.user?.emergency_contact_relation || ''
      })
    }
  }, [memberQuery.data])

  useEffect(() => {
    if (attendanceQuery.data?.data) setAttendanceHistory(attendanceQuery.data.data as Attendance[])
  }, [attendanceQuery.data])

  // Get member data
  const member = memberQuery.data?.data
  const attendance = attendanceQuery.data?.data || []

  // Calculate profile completion using frontend logic
  const profileCompletion = member ? calculateProfileCompletion(member.user!, member) : null

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'visitor': return 'bg-blue-100 text-blue-800'
      case 'inactive': return 'bg-gray-100 text-gray-800'
      case 'transferred': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800'
      case 'pastor': return 'bg-red-100 text-red-800'
      case 'elder': return 'bg-blue-100 text-blue-800'
      case 'finance_officer': return 'bg-green-100 text-green-800'
      case 'member': return 'bg-gray-100 text-gray-800'
      case 'visitor': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (authLoading || memberQuery.isLoading || memberQuery.isFetching) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="animate-pulse text-blue-600 text-lg">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (!member) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Member not found</h3>
            <p className="text-gray-500 mb-4">The member you're looking for doesn't exist.</p>
            <Button onClick={() => router.push('/members')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Members
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => router.push('/members')}
              className="mr-3 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Members
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
                Member Profile
              </h1>
              <p className="text-gray-600">{member.user?.full_name}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {user?.role === 'admin' && (
              <Button 
                variant="outline" 
                onClick={isEditing ? handleSaveEdit : handleEdit}
                disabled={loading}
              >
                {isEditing ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                ) : (
                  <>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Profile
                  </>
                )}
              </Button>
            )}
            {isEditing && (
              <Button variant="outline" onClick={handleCancelEdit}>
                Cancel
              </Button>
            )}
            <Button variant="outline">
              <Camera className="h-4 w-4 mr-2" />
              Change Photo
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Profile Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Profile Card */}
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    {member.profile_photo_url ? (
                      <img 
                        src={member.profile_photo_url} 
                        alt={member.user?.full_name}
                        className="w-24 h-24 rounded-full object-cover"
                      />
                    ) : (
                      <User className="h-12 w-12 text-white" />
                    )}
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
                    {member.user?.full_name}
                  </h2>
                  <div className="flex items-center justify-center space-x-2 mb-3">
                    <Badge className={getRoleColor(member.user?.role || 'member')}>
                      {member.user?.role}
                    </Badge>
                    <Badge className={getStatusColor(member.status || 'active')}>
                      {member.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-center space-x-2 mb-4">
                    <p className="text-sm text-gray-500">
                      ID: <span className="font-mono text-blue-600 font-semibold">{member.user?.membership_id}</span>
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (member.user?.membership_id) {
                          navigator.clipboard.writeText(member.user.membership_id)
                          toast({
                            title: "Copied!",
                            description: "Membership ID copied to clipboard",
                          })
                        }
                      }}
                      className="p-1 h-6 w-6"
                    >
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Profile Completion */}
{profileCompletion && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Profile Completion
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Overall Progress</span>
                    <span className={`text-sm font-bold ${getCompletionColor(profileCompletion.percentage)}`}>
                      {profileCompletion.percentage}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${profileCompletion.percentage}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {getCompletionMessage(profileCompletion.percentage)}
                  </div>
                  
                  {/* Detailed Breakdown */}
                  <div className="space-y-2 pt-2 border-t border-gray-100">
                    <div className="text-xs font-medium text-gray-600">Progress by Section:</div>
                    {Object.entries(profileCompletion.details).map(([section, data]) => (
                      <div key={section} className="flex items-center justify-between text-xs">
                        <span className="capitalize text-gray-600">{section.replace('_', ' ')}</span>
                        <span className="text-gray-500">{data.completed}/{data.total}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
            )}

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <Calendar className="h-4 w-4 mr-2" />
                  View Attendance
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Heart className="h-4 w-4 mr-2" />
                  Add Dependant
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Users className="h-4 w-4 mr-2" />
                  Join Group
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="h-4 w-4 mr-2" />
                  View Documents
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Detailed Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">First Name</label>
                    <p className="text-gray-900">{member.user?.first_name || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Middle Name</label>
                    <p className="text-gray-900">{member.user?.middle_name || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Last Name</label>
                    <p className="text-gray-900">{member.user?.last_name || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Gender</label>
                    <p className="text-gray-900 capitalize">{member.gender || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Date of Birth</label>
                    <p className="text-gray-900">{member.dob ? formatDate(member.dob) : 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Marital Status</label>
                    <p className="text-gray-900 capitalize">{member.user?.marital_status || 'Not provided'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Phone className="h-5 w-5 mr-2" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="full_name">Full Name</Label>
                        <Input
                          id="full_name"
                          value={editForm.full_name}
                          onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="role">Role</Label>
                        <Select value={editForm.role} onValueChange={(value) => setEditForm(prev => ({ ...prev, role: value }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="pastor">Pastor</SelectItem>
                            <SelectItem value="elder">Elder</SelectItem>
                            <SelectItem value="finance_officer">Finance Officer</SelectItem>
                            <SelectItem value="member">Member</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="phone">Primary Phone</Label>
                        <Input
                          id="phone"
                          value={editForm.phone}
                          onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={editForm.email}
                          onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="address">Address</Label>
                        <Input
                          id="address"
                          value={editForm.address}
                          onChange={(e) => setEditForm(prev => ({ ...prev, address: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="occupation">Occupation</Label>
                        <Input
                          id="occupation"
                          value={editForm.occupation}
                          onChange={(e) => setEditForm(prev => ({ ...prev, occupation: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="place_of_work">Place of Work</Label>
                        <Input
                          id="place_of_work"
                          value={editForm.place_of_work}
                          onChange={(e) => setEditForm(prev => ({ ...prev, place_of_work: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="marital_status">Marital Status</Label>
                        <Select value={editForm.marital_status} onValueChange={(value) => setEditForm(prev => ({ ...prev, marital_status: value }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="single">Single</SelectItem>
                            <SelectItem value="married">Married</SelectItem>
                            <SelectItem value="divorced">Divorced</SelectItem>
                            <SelectItem value="widowed">Widowed</SelectItem>
                            <SelectItem value="separated">Separated</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="spouse_name">Spouse Name</Label>
                        <Input
                          id="spouse_name"
                          value={editForm.spouse_name}
                          onChange={(e) => setEditForm(prev => ({ ...prev, spouse_name: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="children_count">Children Count</Label>
                        <Input
                          id="children_count"
                          type="number"
                          value={editForm.children_count}
                          onChange={(e) => setEditForm(prev => ({ ...prev, children_count: parseInt(e.target.value) || 0 }))}
                        />
                      </div>
                    </div>
                    <div className="border-t pt-4">
                      <h4 className="font-medium text-gray-900 mb-3">Emergency Contact</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="emergency_contact_name">Contact Name</Label>
                          <Input
                            id="emergency_contact_name"
                            value={editForm.emergency_contact_name}
                            onChange={(e) => setEditForm(prev => ({ ...prev, emergency_contact_name: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="emergency_contact_phone">Contact Phone</Label>
                          <Input
                            id="emergency_contact_phone"
                            value={editForm.emergency_contact_phone}
                            onChange={(e) => setEditForm(prev => ({ ...prev, emergency_contact_phone: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="emergency_contact_relation">Relationship</Label>
                          <Input
                            id="emergency_contact_relation"
                            value={editForm.emergency_contact_relation}
                            onChange={(e) => setEditForm(prev => ({ ...prev, emergency_contact_relation: e.target.value }))}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Primary Phone</label>
                      <p className="text-gray-900">{member.user?.phone || 'Not provided'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Secondary Phone</label>
                      <p className="text-gray-900">{member.user?.secondary_phone || 'Not provided'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Email</label>
                      <p className="text-gray-900">{member.user?.email || 'Not provided'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Address</label>
                      <p className="text-gray-900">{member.address || 'Not provided'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Emergency Contact</label>
                      <p className="text-gray-900">
                        {member.user?.emergency_contact_name 
                          ? `${member.user.emergency_contact_name} (${member.user.emergency_contact_relation}) - ${member.user.emergency_contact_phone}`
                          : 'Not provided'
                        }
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Professional Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Briefcase className="h-5 w-5 mr-2" />
                  Professional Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Occupation</label>
                    <p className="text-gray-900">{member.user?.occupation || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Place of Work</label>
                    <p className="text-gray-900">{member.user?.place_of_work || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Spouse Name</label>
                    <p className="text-gray-900">{member.user?.spouse_name || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Number of Children</label>
                    <p className="text-gray-900">{member.user?.children_count || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Spiritual Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Church className="h-5 w-5 mr-2" />
                  Spiritual Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Date of Baptism</label>
                    <p className="text-gray-900">{member.date_of_baptism ? formatDate(member.date_of_baptism) : 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Holy Ghost Baptism</label>
                    <div className="flex items-center">
                      {member.holy_ghost_baptism ? (
                        <CheckCircle className="h-4 w-4 text-green-600 mr-1" />
                      ) : (
                        <Circle className="h-4 w-4 text-gray-400 mr-1" />
                      )}
                      <span className="text-gray-900">
                        {member.holy_ghost_baptism ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Date of Holy Ghost Baptism</label>
                    <p className="text-gray-900">
                      {member.date_of_holy_ghost_baptism ? formatDate(member.date_of_holy_ghost_baptism) : 'Not provided'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Previous Church</label>
                    <p className="text-gray-900">{member.previous_church || 'Not provided'}</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-gray-500">Reason for Leaving Previous Church</label>
                    <p className="text-gray-900">{member.reason_for_leaving || 'Not provided'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Skills & Interests */}
            {(member.special_skills?.length || member.interests?.length) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Star className="h-5 w-5 mr-2" />
                    Skills & Interests
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {member.special_skills?.length && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Special Skills</label>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {member.special_skills.map((skill, index) => (
                            <Badge key={index} variant="secondary">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {member.interests?.length && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Interests</label>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {member.interests.map((interest, index) => (
                            <Badge key={index} variant="outline">
                              {interest}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Group Memberships */}
            {member.group_memberships?.length && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Users className="h-5 w-5 mr-2" />
                    Group Memberships
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {member.group_memberships.map((membership) => (
                      <div key={membership.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{membership.group?.name || 'Unknown Group'}</p>
                          <p className="text-sm text-gray-500 capitalize">{membership.group?.group_type || 'Unknown Type'}</p>
                        </div>
                        <Badge variant="outline">{membership.role}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Attendance History */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  Attendance History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {attendanceHistory.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No attendance records found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {attendanceHistory.map((attendance) => (
                      <div key={attendance.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {formatDate(attendance.service_date)}
                            </p>
                            <p className="text-sm text-gray-500 capitalize">
                              {attendance.service_type?.replace('_', ' ')} • {attendance.method}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">
                            {new Date(attendance.check_in_time).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                          <Badge variant="outline" className="mt-1">
                            {attendance.method}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Attendance Stats */}
                {attendanceHistory.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h4 className="font-medium text-gray-900 mb-4">Attendance Summary</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600">{attendanceHistory.length}</p>
                        <p className="text-sm text-gray-500">Total Services</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">
                          {Math.round((attendanceHistory.length / Math.max(1, Math.floor((Date.now() - new Date(member?.created_at || '').getTime()) / (7 * 24 * 60 * 60 * 1000)))) * 100)}%
                        </p>
                        <p className="text-sm text-gray-500">Weekly Average</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-purple-600">
                          {attendanceHistory.filter(a => new Date(a.service_date) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length}
                        </p>
                        <p className="text-sm text-gray-500">Last 30 Days</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Dependants */}
            {member.dependants?.length && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Heart className="h-5 w-5 mr-2" />
                    Dependants ({member.dependants.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {member.dependants.map((dependant) => (
                      <div key={dependant.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">
                            {dependant.first_name} {dependant.last_name}
                          </p>
                          <p className="text-sm text-gray-500 capitalize">
                            {dependant.relationship} • {dependant.dob ? formatDate(dependant.dob) : 'No DOB'}
                          </p>
                        </div>
                        {dependant.is_member && (
                          <Badge variant="secondary">Member</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            {member.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <FileText className="h-5 w-5 mr-2" />
                    Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-900 whitespace-pre-wrap">{member.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
