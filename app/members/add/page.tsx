'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { createUserRecord, loadMemberByUserId, updateMemberAction } from '@/lib/actions/core-data'
import { generateMembershipId } from '@/lib/membershipId'
import { CreateUserForm } from '@/lib/types'
import { DashboardLayout } from '@/components/dashboard-layout'
import { cn } from '@/lib/utils'
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
  User,
  RotateCcw,
  Copy,
  X,
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
    is_visitor: false,
    hometown: '',
    area_of_residence: '',
    school_or_workplace: '',
    congregation: 'campus_gem',
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

      const { data: member } = await loadMemberByUserId(userData.id)
      if (member) {
        const { error: memberError } = await updateMemberAction(member.id, {
          dob: formData.dob || undefined,
          gender: formData.gender,
          address: formData.address || undefined,
          notes: formData.notes || undefined,
          hometown: formData.hometown || undefined,
          area_of_residence: formData.area_of_residence || undefined,
          school_or_workplace: formData.school_or_workplace || undefined,
          congregation: formData.congregation,
          emergency_contacts:
            formData.emergency_contact_name && formData.emergency_contact_phone
              ? [
                  {
                    name: formData.emergency_contact_name,
                    relation: formData.emergency_contact_relation || 'Emergency',
                    phone: formData.emergency_contact_phone,
                  },
                ]
              : [],
          date_of_baptism: formData.date_of_baptism || undefined,
          holy_ghost_baptism: formData.holy_ghost_baptism,
          date_of_holy_ghost_baptism: formData.date_of_holy_ghost_baptism || undefined,
          previous_church: formData.previous_church || undefined,
          reason_for_leaving: formData.reason_for_leaving || undefined,
          special_skills: formData.special_skills,
          interests: formData.interests,
          is_visitor: formData.is_visitor,
        })
        if (memberError) throw new Error(memberError)
      }

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
        return !!formData.phone
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
          <div className="animate-pulse text-lg text-neutral-500 dark:text-neutral-400">Loading…</div>
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
              <div className="flex items-center gap-2">
                <Input
                  id="membershipId"
                  value={membershipId}
                  readOnly
                  className="h-11 bg-neutral-50 font-mono font-semibold text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100 sm:h-10"
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
                    className="h-11 w-11 shrink-0 px-0 sm:h-10 sm:w-10"
                    aria-label="Copy membership ID"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {membershipId && (
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  This ID is auto-generated and can be copied for records
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
              <Label htmlFor="address">Residential Address</Label>
              <Textarea 
                id="address" 
                value={formData.address} 
                onChange={(e) => handleChange('address', e.target.value)} 
                rows={3} 
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="area_of_residence">Area of residence</Label>
                <Input
                  id="area_of_residence"
                  value={formData.area_of_residence ?? ''}
                  onChange={(e) => handleChange('area_of_residence', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="hometown">Hometown</Label>
                <Input
                  id="hometown"
                  value={formData.hometown ?? ''}
                  onChange={(e) => handleChange('hometown', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="school_or_workplace">School / workplace</Label>
                <Input
                  id="school_or_workplace"
                  value={formData.school_or_workplace ?? ''}
                  onChange={(e) => handleChange('school_or_workplace', e.target.value)}
                />
              </div>
              <div>
                <Label>Congregation</Label>
                <Select
                  value={formData.congregation ?? 'campus_gem'}
                  onValueChange={(v) => handleChange('congregation', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="campus_gem">Campus Gem</SelectItem>
                    <SelectItem value="rlc">Redemption Light</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                    <span key={index} className="flex items-center gap-1 rounded-md py-1 pl-2.5 pr-1 text-sm bg-neutral-100 text-neutral-700 dark:bg-neutral-700/60 dark:text-neutral-200">
                      {skill}
                      <button
                        type="button"
                        onClick={() => removeArrayItem('special_skills', skill)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded opacity-70 hover:opacity-100"
                        aria-label={`Remove ${skill}`}
                      >
                        <X className="h-3.5 w-3.5" />
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
                    <span key={index} className="flex items-center gap-1 rounded-md py-1 pl-2.5 pr-1 text-sm bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20">
                      {interest}
                      <button
                        type="button"
                        onClick={() => removeArrayItem('interests', interest)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded opacity-70 hover:opacity-100"
                        aria-label={`Remove ${interest}`}
                      >
                        <X className="h-3.5 w-3.5" />
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

  const stepIndex = steps.findIndex(s => s.key === currentStep)
  const current = steps[stepIndex]
  const StepIcon =
    currentStep === 'personal' ? User
    : currentStep === 'contact' ? Phone
    : currentStep === 'professional' ? Briefcase
    : currentStep === 'family' ? Heart
    : currentStep === 'spiritual' ? Calendar
    : FileText

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-4xl space-y-5 pb-28 sm:pb-0">
        <Link
          href="/members"
          className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 sm:min-h-9"
        >
          <ArrowLeft className="h-4 w-4" />
          Members
        </Link>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="app-page-title">Add member</h1>
            <p className="app-page-description mt-1">
              Step {stepIndex + 1} of {steps.length} · {current?.title}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadProgress} disabled={saving} className="h-11 flex-1 sm:h-10 sm:flex-none">
              <RotateCcw className="mr-2 h-4 w-4" />
              Load draft
            </Button>
            <Button variant="outline" onClick={saveProgress} disabled={saving} className="h-11 flex-1 sm:h-10 sm:flex-none">
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving…' : 'Save draft'}
            </Button>
          </div>
        </div>

        {/* Stepper: compact segmented bar on phones, labelled steps from sm */}
        <nav aria-label="Progress" className="dashboard-panel p-3 sm:p-4">
          <ol className="flex items-center gap-1.5 sm:gap-2">
            {steps.map((step, index) => {
              const active = currentStep === step.key
              const done = isStepComplete(step.key) && !active
              return (
                <li key={step.key} className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span
                    className={cn(
                      'h-1.5 rounded-full transition-colors',
                      active
                        ? 'bg-brand-600 dark:bg-brand-500'
                        : done
                          ? 'bg-emerald-500 dark:bg-emerald-400'
                          : 'bg-neutral-200 dark:bg-neutral-700'
                    )}
                    aria-hidden
                  />
                  <span
                    className={cn(
                      'hidden items-center gap-1 truncate text-xs font-medium sm:flex',
                      active
                        ? 'text-brand-700 dark:text-brand-300'
                        : done
                          ? 'text-emerald-700 dark:text-emerald-300'
                          : 'text-neutral-500 dark:text-neutral-400'
                    )}
                    aria-current={active ? 'step' : undefined}
                  >
                    {done ? <CheckCircle className="h-3.5 w-3.5 shrink-0" aria-hidden /> : <span className="tabular-nums">{index + 1}.</span>}
                    <span className="truncate">{step.title}</span>
                  </span>
                  <span className="sr-only sm:hidden">
                    {step.title}{active ? ' (current)' : done ? ' (complete)' : ''}
                  </span>
                </li>
              )
            })}
          </ol>
        </nav>

        <section className="dashboard-panel p-4 sm:p-6">
          <div className="mb-5">
            <h2 className="app-section-title flex items-center gap-2">
              <StepIcon className="h-4 w-4 text-neutral-500 dark:text-neutral-400" aria-hidden />
              {current?.title}
            </h2>
            {current?.description ? (
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{current.description}</p>
            ) : null}
          </div>

          {renderStepContent()}

          {/* Navigation: sticky above the bottom tab bar on phones, inline from sm */}
          <div className="fixed inset-x-4 bottom-20 z-30 flex items-center gap-2 rounded-xl border border-neutral-200/80 bg-white/95 p-2 shadow-lg backdrop-blur dark:border-white/10 dark:bg-neutral-900/95 sm:static sm:inset-auto sm:z-auto sm:mt-8 sm:justify-between sm:rounded-none sm:border-0 sm:border-t sm:bg-transparent sm:p-0 sm:pt-6 sm:shadow-none sm:backdrop-blur-none sm:dark:bg-transparent">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === steps[0].key}
              className="h-11 flex-1 sm:h-10 sm:flex-none"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>

            <span className="hidden text-sm tabular-nums text-neutral-500 dark:text-neutral-400 sm:inline">
              Step {stepIndex + 1} of {steps.length}
            </span>

            {isLastStep ? (
              <Button
                onClick={handleSubmit}
                disabled={!canProceed || loading}
                className="h-11 flex-1 sm:h-10 sm:flex-none"
              >
                {loading ? (
                  <>
                    <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden />
                    Adding…
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add member
                  </>
                )}
              </Button>
            ) : (
              <Button onClick={nextStep} disabled={!canProceed} className="h-11 flex-1 sm:h-10 sm:flex-none">
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </section>
      </div>
    </DashboardLayout>
  )
}
