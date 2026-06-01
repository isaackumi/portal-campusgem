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
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { createUserRecord } from '@/lib/actions/core-data'
import { generateMembershipId } from '@/lib/membershipId'
import { CreateUserForm } from '@/lib/types'
import { DashboardLayout } from '@/components/dashboard-layout'
import { 
  ArrowLeft, 
  UserPlus, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Users, 
  Briefcase, 
  Heart, 
  FileText,
  CheckCircle,
  Circle,
  Save,
  ArrowRight,
  User
} from 'lucide-react'

type OnboardingStep = 'personal' | 'contact' | 'professional' | 'family' | 'spiritual' | 'additional'

const steps: { key: OnboardingStep; title: string; description: string }[] = [
  { key: 'personal', title: 'Personal Information', description: 'Basic personal details' },
  { key: 'contact', title: 'Contact Information', description: 'Phone numbers and addresses' },
  { key: 'professional', title: 'Professional Details', description: 'Occupation and work information' },
  { key: 'family', title: 'Family Information', description: 'Marital status and family details' },
  { key: 'spiritual', title: 'Spiritual Background', description: 'Baptism and church history' },
  { key: 'additional', title: 'Additional Information', description: 'Skills, interests, and notes' }
]

export default function AddMemberPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [currentStep, setCurrentStep] = useState<OnboardingStep>('personal')
  const [formData, setFormData] = useState<CreateUserForm>({
    first_name: '',
    middle_name: '',
    last_name: '',
    phone: '',
    secondary_phone: '',
    email: '',
    role: 'member',
    occupation: '',
    place_of_work: '',
    marital_status: 'single',
    spouse_name: '',
    children_count: 0,
    address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relation: '',
    dob: '',
    gender: 'male',
    date_of_baptism: '',
    holy_ghost_baptism: false,
    date_of_holy_ghost_baptism: '',
    previous_church: '',
    reason_for_leaving: '',
    special_skills: [],
    interests: [],
    notes: '',
    join_year: new Date().getFullYear(),
    membership_id: '',
    is_visitor: false
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [membershipId, setMembershipId] = useState('')

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (formData.phone && formData.dob) {
      const joinYear = formData.join_year || new Date().getFullYear()
      setMembershipId(generateMembershipId(formData.phone, joinYear))
    } else {
      setMembershipId('')
    }
  }, [formData.phone, formData.dob, formData.join_year])

  const handleChange = (field: keyof CreateUserForm, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleArrayChange = (field: keyof CreateUserForm, value: string) => {
    const currentArray = (formData[field] as string[]) || []
    if (value.trim() && !currentArray.includes(value.trim())) {
      setFormData(prev => ({ ...prev, [field]: [...currentArray, value.trim()] }))
    }
  }

  const removeArrayItem = (field: keyof CreateUserForm, item: string) => {
    const currentArray = (formData[field] as string[]) || []
    setFormData(prev => ({ ...prev, [field]: currentArray.filter(i => i !== item) }))
  }

  const saveProgress = async () => {
    setSaving(true)
    try {
      // Save to localStorage for now (in a real app, you'd save to database)
      localStorage.setItem('member_onboarding_progress', JSON.stringify(formData))
      toast({
        title: "Progress Saved",
        description: "Your progress has been saved. You can continue later.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save progress.",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const loadProgress = () => {
    try {
      const saved = localStorage.getItem('member_onboarding_progress')
      if (saved) {
        const savedData = JSON.parse(saved)
        setFormData(prev => ({ ...prev, ...savedData }))
        toast({
          title: "Progress Loaded",
          description: "Your saved progress has been loaded.",
        })
      }
    } catch (error) {
      console.error('Error loading progress:', error)
    }
  }

  const handleSubmit = async () => {
    setLoading(true)

    try {
      const fullName = `${formData.first_name} ${formData.middle_name ? formData.middle_name + ' ' : ''}${formData.last_name}`.trim()
      const { data: userData, error: userError } = await createUserRecord({
        full_name: fullName,
        membership_id: membershipId,
        phone: formData.phone,
        email: formData.email,
        role: formData.role,
        join_year: formData.join_year,
      })

      if (userError || !userData) throw new Error(userError ?? 'Failed to create user')

      // Member profile is created by createUser; update member with extra fields if needed later
      const memberError = null

      if (memberError) throw memberError

      // Profile completion is now calculated in the frontend - no database updates needed

      // Clear saved progress
      localStorage.removeItem('member_onboarding_progress')

      toast({
        title: "Success",
        description: `${formData.first_name} ${formData.last_name} has been added as a new ${formData.is_visitor ? 'visitor' : 'member'}!`,
      })
      router.push('/members')

    } catch (error: any) {
      console.error('Error adding member:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to add member. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const nextStep = () => {
    const currentIndex = steps.findIndex(step => step.key === currentStep)
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1].key)
    }
  }

  const prevStep = () => {
    const currentIndex = steps.findIndex(step => step.key === currentStep)
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1].key)
    }
  }

  const isStepComplete = (step: OnboardingStep): boolean => {
    switch (step) {
      case 'personal':
        return !!(formData.first_name && formData.last_name && formData.dob && formData.gender)
      case 'contact':
        return !!(formData.phone && formData.address)
      case 'professional':
        return true // Optional fields
      case 'family':
        return !!(formData.marital_status)
      case 'spiritual':
        return true // Optional fields
      case 'additional':
        return true // Optional fields
      default:
        return false
    }
  }

  const canProceed = isStepComplete(currentStep)
  const isLastStep = currentStep === steps[steps.length - 1].key

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

  const renderStepContent = () => {
    switch (currentStep) {
      case 'personal':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="first_name">First Name *</Label>
                <Input 
                  id="first_name" 
                  value={formData.first_name} 
                  onChange={(e) => handleChange('first_name', e.target.value)} 
                  required 
                />
              </div>
              <div>
                <Label htmlFor="middle_name">Middle Name</Label>
                <Input 
                  id="middle_name" 
                  value={formData.middle_name} 
                  onChange={(e) => handleChange('middle_name', e.target.value)} 
                />
              </div>
              <div>
                <Label htmlFor="last_name">Last Name *</Label>
                <Input 
                  id="last_name" 
                  value={formData.last_name} 
                  onChange={(e) => handleChange('last_name', e.target.value)} 
                  required 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dob">Date of Birth *</Label>
                <Input 
                  id="dob" 
                  type="date" 
                  value={formData.dob} 
                  onChange={(e) => handleChange('dob', e.target.value)} 
                  required 
                />
              </div>
              <div>
                <Label htmlFor="gender">Gender *</Label>
                <Select onValueChange={(value) => handleChange('gender', value)} value={formData.gender} required>
                  <SelectTrigger id="gender">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="membershipId">Generated Membership ID</Label>
              <div className="flex items-center space-x-2">
                <Input 
                  id="membershipId" 
                  value={membershipId} 
                  readOnly 
                  className="bg-slate-50 font-mono text-primary font-semibold" 
                />
                {membershipId && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(membershipId)
                      toast({
                        title: "Copied!",
                        description: "Membership ID copied to clipboard",
                      })
                    }}
                    className="px-3"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </Button>
                )}
              </div>
              {membershipId && (
                <p className="text-xs text-slate-500 mt-1">
                  💡 This ID is auto-generated and can be copied for records
                </p>
              )}
            </div>
          </div>
        )

      case 'contact':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Primary Phone *</Label>
                <Input 
                  id="phone" 
                  type="tel" 
                  value={formData.phone} 
                  onChange={(e) => handleChange('phone', e.target.value)} 
                  required 
                />
              </div>
              <div>
                <Label htmlFor="secondary_phone">Secondary Phone</Label>
                <Input 
                  id="secondary_phone" 
                  type="tel" 
                  value={formData.secondary_phone} 
                  onChange={(e) => handleChange('secondary_phone', e.target.value)} 
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input 
                id="email" 
                type="email" 
                value={formData.email} 
                onChange={(e) => handleChange('email', e.target.value)} 
              />
            </div>

            <div>
              <Label htmlFor="address">Residential Address *</Label>
              <Textarea 
                id="address" 
                value={formData.address} 
                onChange={(e) => handleChange('address', e.target.value)} 
                rows={3} 
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="emergency_contact_name">Emergency Contact Name</Label>
                <Input 
                  id="emergency_contact_name" 
                  value={formData.emergency_contact_name} 
                  onChange={(e) => handleChange('emergency_contact_name', e.target.value)} 
                />
              </div>
              <div>
                <Label htmlFor="emergency_contact_relation">Relationship</Label>
                <Input 
                  id="emergency_contact_relation" 
                  value={formData.emergency_contact_relation} 
                  onChange={(e) => handleChange('emergency_contact_relation', e.target.value)} 
                />
              </div>
              <div>
                <Label htmlFor="emergency_contact_phone">Emergency Contact Phone</Label>
                <Input 
                  id="emergency_contact_phone" 
                  type="tel" 
                  value={formData.emergency_contact_phone} 
                  onChange={(e) => handleChange('emergency_contact_phone', e.target.value)} 
                />
              </div>
            </div>
          </div>
        )

      case 'professional':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="occupation">Occupation</Label>
                <Input 
                  id="occupation" 
                  value={formData.occupation} 
                  onChange={(e) => handleChange('occupation', e.target.value)} 
                />
              </div>
              <div>
                <Label htmlFor="place_of_work">Place of Work</Label>
                <Input 
                  id="place_of_work" 
                  value={formData.place_of_work} 
                  onChange={(e) => handleChange('place_of_work', e.target.value)} 
                />
              </div>
            </div>
          </div>
        )

      case 'family':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="marital_status">Marital Status *</Label>
                <Select onValueChange={(value) => handleChange('marital_status', value)} value={formData.marital_status} required>
                  <SelectTrigger id="marital_status">
                    <SelectValue placeholder="Select marital status" />
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
                <Label htmlFor="children_count">Number of Children</Label>
                <Input 
                  id="children_count" 
                  type="number" 
                  min="0"
                  value={formData.children_count} 
                  onChange={(e) => handleChange('children_count', parseInt(e.target.value) || 0)} 
                />
              </div>
            </div>

            {formData.marital_status === 'married' && (
              <div>
                <Label htmlFor="spouse_name">Spouse Name</Label>
                <Input 
                  id="spouse_name" 
                  value={formData.spouse_name} 
                  onChange={(e) => handleChange('spouse_name', e.target.value)} 
                />
              </div>
            )}
          </div>
        )

      case 'spiritual':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date_of_baptism">Date of Water Baptism</Label>
                <Input 
                  id="date_of_baptism" 
                  type="date" 
                  value={formData.date_of_baptism} 
                  onChange={(e) => handleChange('date_of_baptism', e.target.value)} 
                />
              </div>
              <div>
                <Label htmlFor="date_of_holy_ghost_baptism">Date of Holy Ghost Baptism</Label>
                <Input 
                  id="date_of_holy_ghost_baptism" 
                  type="date" 
                  value={formData.date_of_holy_ghost_baptism} 
                  onChange={(e) => handleChange('date_of_holy_ghost_baptism', e.target.value)} 
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="holy_ghost_baptism" 
                checked={formData.holy_ghost_baptism}
                onCheckedChange={(checked) => handleChange('holy_ghost_baptism', checked)}
              />
              <Label htmlFor="holy_ghost_baptism">Has received Holy Ghost Baptism</Label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="previous_church">Previous Church</Label>
                <Input 
                  id="previous_church" 
                  value={formData.previous_church} 
                  onChange={(e) => handleChange('previous_church', e.target.value)} 
                />
              </div>
              <div>
                <Label htmlFor="reason_for_leaving">Reason for Leaving Previous Church</Label>
                <Input 
                  id="reason_for_leaving" 
                  value={formData.reason_for_leaving} 
                  onChange={(e) => handleChange('reason_for_leaving', e.target.value)} 
                />
              </div>
            </div>
          </div>
        )

      case 'additional':
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="role">Church Role</Label>
              <Select onValueChange={(value) => handleChange('role', value)} value={formData.role} required>
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="visitor">Visitor</SelectItem>
                  <SelectItem value="elder">Elder</SelectItem>
                  <SelectItem value="pastor">Pastor</SelectItem>
                  <SelectItem value="finance_officer">Finance Officer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="is_visitor" 
                checked={formData.is_visitor}
                onCheckedChange={(checked) => handleChange('is_visitor', checked)}
              />
              <Label htmlFor="is_visitor">Register as visitor (not full member)</Label>
            </div>

            <div>
              <Label htmlFor="special_skills">Special Skills (Press Enter to add)</Label>
              <Input 
                placeholder="Enter skill and press Enter"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleArrayChange('special_skills', e.currentTarget.value)
                    e.currentTarget.value = ''
                  }
                }}
              />
              {formData.special_skills && formData.special_skills.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.special_skills.map((skill, index) => (
                    <span key={index} className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-sm flex items-center gap-1">
                      {skill}
                      <button
                        type="button"
                        onClick={() => removeArrayItem('special_skills', skill)}
                        className="text-primary hover:text-slate-700"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="interests">Interests (Press Enter to add)</Label>
              <Input 
                placeholder="Enter interest and press Enter"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleArrayChange('interests', e.currentTarget.value)
                    e.currentTarget.value = ''
                  }
                }}
              />
              {formData.interests && formData.interests.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.interests.map((interest, index) => (
                    <span key={index} className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm flex items-center gap-1">
                      {interest}
                      <button
                        type="button"
                        onClick={() => removeArrayItem('interests', interest)}
                        className="text-green-600 hover:text-green-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea 
                id="notes" 
                value={formData.notes} 
                onChange={(e) => handleChange('notes', e.target.value)} 
                rows={4}
                placeholder="Any additional information about this person..."
              />
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => router.push('/members')}
              className="mr-3 text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Members
            </Button>
            <h1 className="text-3xl font-bold text-slate-900">
              Add New Member
            </h1>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={loadProgress} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              Load Progress
            </Button>
            <Button variant="outline" onClick={saveProgress} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Progress'}
            </Button>
          </div>
        </div>

        {/* Enhanced Progress Steps */}
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.key} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div className={`relative flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 ${
                      currentStep === step.key 
                        ? 'border-slate-900 bg-primary text-white shadow-lg scale-110' 
                        : isStepComplete(step.key)
                        ? 'border-green-600 bg-green-600 text-white shadow-md'
                        : 'border-gray-300 bg-white text-gray-400 hover:border-gray-400'
                    }`}>
                      {isStepComplete(step.key) && currentStep !== step.key ? (
                        <CheckCircle className="h-6 w-6" />
                      ) : (
                        <span className="text-sm font-bold">{index + 1}</span>
                      )}
                      {currentStep === step.key && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full border-2 border-white animate-pulse"></div>
                      )}
                    </div>
                    <div className="mt-2 text-center max-w-24">
                      <p className={`text-xs font-medium transition-colors ${
                        currentStep === step.key ? 'text-primary' : isStepComplete(step.key) ? 'text-green-600' : 'text-slate-500'
                      }`}>
                        {step.title}
                      </p>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-1 mx-6 rounded-full transition-colors duration-300 ${
                      isStepComplete(steps[index + 1].key) ? 'bg-green-600' : 
                      currentStep === steps[index + 1].key ? 'bg-slate-200' : 'bg-gray-200'
                    }`}>
                      <div className={`h-full rounded-full transition-all duration-500 ${
                        isStepComplete(steps[index + 1].key) ? 'w-full bg-green-600' : 
                        currentStep === steps[index + 1].key ? 'w-1/2 bg-amber-400' : 'w-0'
                      }`}></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {/* Progress Summary */}
            <div className="mt-6 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700">Overall Progress</p>
                  <p className="text-xs text-slate-500">Complete all steps to finish onboarding</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-primary">
                    {Math.round((steps.findIndex(s => s.key === currentStep) + 1) / steps.length * 100)}%
                  </p>
                  <p className="text-xs text-slate-500">
                    Step {steps.findIndex(s => s.key === currentStep) + 1} of {steps.length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold flex items-center">
              {currentStep === 'personal' && <User className="h-6 w-6 mr-2" />}
              {currentStep === 'contact' && <Phone className="h-6 w-6 mr-2" />}
              {currentStep === 'professional' && <Briefcase className="h-6 w-6 mr-2" />}
              {currentStep === 'family' && <Heart className="h-6 w-6 mr-2" />}
              {currentStep === 'spiritual' && <Calendar className="h-6 w-6 mr-2" />}
              {currentStep === 'additional' && <FileText className="h-6 w-6 mr-2" />}
              {steps.find(s => s.key === currentStep)?.title}
            </CardTitle>
            <p className="text-slate-600">
              {steps.find(s => s.key === currentStep)?.description}
            </p>
          </CardHeader>
          <CardContent>
            {renderStepContent()}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t">
              <Button 
                variant="outline" 
                onClick={prevStep}
                disabled={currentStep === steps[0].key}
              >
                Previous
              </Button>
              
              <div className="flex items-center space-x-2">
                <span className="text-sm text-slate-500">
                  Step {steps.findIndex(s => s.key === currentStep) + 1} of {steps.length}
                </span>
              </div>

              {isLastStep ? (
                <Button 
                  onClick={handleSubmit} 
                  disabled={!canProceed || loading}
                  className=""
                >
                  {loading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Adding Member...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <UserPlus className="h-5 w-5 mr-2" />
                      Add Member
                    </div>
                  )}
                </Button>
              ) : (
                <Button 
                  onClick={nextStep}
                  disabled={!canProceed}
                  className=""
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}