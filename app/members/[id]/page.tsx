'use client'

import { useState, useEffect, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { useAuth } from '@/components/providers'
import { DashboardLayout } from '@/components/dashboard-layout'
import { HouseholdCard } from '@/components/members/household-card'
import { LoadingSpinner } from '@/components/ui/loading'
import { Meter } from '@/components/ui/meter'
import { PersonAvatar } from '@/components/ui/person'
import { PhoneLink, QuickContactButtons } from '@/components/contact/phone-link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { memberStatusTone, roleTone } from '@/lib/ui/chip-tones'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { MemberCampusControl } from '@/components/campus/member-campus-control'
import { dataService } from '@/lib/services/data-service'
import { useQuery } from '@tanstack/react-query'
import { Member, AppUser, Dependant, GroupMembership, Attendance } from '@/lib/types'
import { cn, formatDate } from '@/lib/utils'
import { calculateProfileCompletion, getCompletionMessage } from '@/lib/profile-completion'
import { 
  ArrowLeft,
  User,
  Phone,
  Calendar,
  Briefcase,
  Heart,
  Users,
  Edit,
  CheckCircle,
  Circle,
  Church,
  Star,
  FileText,
  Copy,
  type LucideIcon,
} from 'lucide-react'

interface MemberWithDetails extends Member {
  user: AppUser
  dependants: Dependant[]
  group_memberships: (GroupMembership & { group: { name: string; group_type: string } })[]
}

export default function MemberProfilePage() {
  const { user, loading: authLoading, can } = useAuth()
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
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
    queryFn: async () => {
      const id = params.id as string
      const byMemberId = await dataService.getMember(id)
      if (byMemberId.data) return byMemberId
      return await dataService.getMemberByUserId(id)
    },
    enabled: Boolean(user && params.id),
    staleTime: 30_000,
  })

  const resolvedMemberId = memberQuery.data?.data?.id

  const attendanceQuery = useQuery({
    queryKey: ['member-attendance', resolvedMemberId],
    queryFn: async () => dataService.getAttendanceByMember(resolvedMemberId as string, 50),
    enabled: Boolean(user && resolvedMemberId),
    staleTime: 30_000,
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

  // "Edit profile" from the members list links here with ?edit=true
  useEffect(() => {
    if (searchParams.get('edit') === 'true' && memberQuery.data?.data && can('members.manage')) {
      setIsEditing(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, memberQuery.data?.data])

  useEffect(() => {
    if (attendanceQuery.data?.data) setAttendanceHistory(attendanceQuery.data.data as Attendance[])
  }, [attendanceQuery.data])

  useEffect(() => {
    if (memberQuery.isLoading || memberQuery.data?.data) return
    const id = params.id as string
    if (!id) return
    void dataService.getUserById(id).then((res) => {
      if (res.data) router.replace(`/admin/users/${id}`)
    })
  }, [memberQuery.isLoading, memberQuery.data?.data, params.id, router])

  // Get member data
  const member = memberQuery.data?.data
  const attendance = attendanceQuery.data?.data || []

  // Calculate profile completion using frontend logic
  const profileCompletion = member ? calculateProfileCompletion(member.user!, member) : null

  if (authLoading || memberQuery.isLoading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[400px] items-center justify-center">
          <LoadingSpinner />
        </div>
      </DashboardLayout>
    )
  }

  if (!user) {
    return null
  }

  if (!member) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-md py-12 text-center">
          <User className="mx-auto mb-4 h-12 w-12 text-neutral-400 dark:text-neutral-500" />
          <h2 className="app-section-title mb-2">Member not found</h2>
          <p className="mb-6 text-sm text-neutral-500 dark:text-neutral-400">
            The member you&apos;re looking for doesn&apos;t exist.
          </p>
          <Button onClick={() => router.push('/members')} className="h-11 w-full sm:h-10 sm:w-auto">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to members
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  const fullName = member.user?.full_name || 'Member'
  const completionTone = (pct: number) =>
    pct >= 80 ? 'success' : pct >= 50 ? 'warning' : 'danger'
  const weeklyAverage = Math.round(
    (attendanceHistory.length /
      Math.max(1, Math.floor((Date.now() - new Date(member?.created_at || '').getTime()) / (7 * 24 * 60 * 60 * 1000)))) *
      100
  )
  const last30 = attendanceHistory.filter(
    (a) => new Date(a.service_date) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  ).length

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-6 pb-24 lg:pb-0">
        <Link
          href="/members"
          className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 sm:min-h-9"
        >
          <ArrowLeft className="h-4 w-4" />
          Members
        </Link>

        {/* Identity header */}
        <section className="dashboard-panel p-4 sm:p-5" data-tour="member-header">
          <div className="flex items-start gap-4">
            {member.profile_photo_url ? (
              <img
                src={member.profile_photo_url}
                alt={fullName}
                className="h-16 w-16 shrink-0 rounded-full object-cover sm:h-20 sm:w-20"
              />
            ) : (
              <PersonAvatar name={fullName} seed={member.id} size="lg" className="h-16 w-16 text-lg sm:h-20 sm:w-20" />
            )}
            <div className="min-w-0 flex-1">
              <h1 className="app-page-title break-words">{fullName}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <Badge variant={roleTone(member.user?.role || 'member')} className="capitalize">
                  {(member.user?.role || 'member').replace(/_/g, ' ')}
                </Badge>
                <Badge variant={memberStatusTone(member.status || 'active')} className="capitalize">
                  {member.status}
                </Badge>
                <MemberCampusControl memberId={member.id} userId={member.user_id || member.user?.id} />
              </div>
              {member.user?.membership_id ? (
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(member.user!.membership_id!)
                    toast({ title: 'Copied', description: 'Membership ID copied to clipboard' })
                  }}
                  className="mt-1 inline-flex min-h-9 items-center gap-1.5 font-mono text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white"
                  aria-label="Copy membership ID"
                >
                  {member.user.membership_id}
                  <Copy className="h-3.5 w-3.5" aria-hidden />
                </button>
              ) : null}
            </div>
            {can('members.manage') && !isEditing ? (
              <Button variant="outline" onClick={handleEdit} className="hidden shrink-0 sm:inline-flex" data-tour="member-edit">
                <Edit className="mr-2 h-4 w-4" />
                Edit profile
              </Button>
            ) : null}
          </div>

          {member.user?.phone || member.user?.email ? (
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-neutral-200/80 pt-4 dark:border-white/[0.06]">
              <QuickContactButtons
                phone={member.user?.phone}
                whatsapp={member.user?.whatsapp}
                name={fullName}
              />
              <div className="flex min-w-0 flex-col gap-0.5 text-sm text-neutral-700 dark:text-neutral-300">
                {member.user?.phone ? (
                  <PhoneLink phone={member.user.phone} whatsapp={member.user.whatsapp} name={fullName} />
                ) : null}
                {member.user?.email ? (
                  <a
                    href={`mailto:${member.user.email}`}
                    className="truncate text-neutral-600 hover:text-brand-600 dark:text-neutral-400 dark:hover:text-brand-300"
                  >
                    {member.user.email}
                  </a>
                ) : null}
              </div>
            </div>
          ) : null}
        </section>

        {/* Mobile edit bar (sits above the bottom tab bar) */}
        {can('members.manage') ? (
          <div className="fixed inset-x-4 bottom-20 z-30 flex gap-2 rounded-xl border border-neutral-200/80 bg-white/95 p-2 shadow-lg backdrop-blur dark:border-white/10 dark:bg-neutral-900/95 sm:hidden">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={handleCancelEdit} className="h-11 flex-1">
                  Cancel
                </Button>
                <Button onClick={handleSaveEdit} disabled={loading} className="h-11 flex-1">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Save
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={handleEdit} className="h-11 flex-1">
                <Edit className="mr-2 h-4 w-4" />
                Edit profile
              </Button>
            )}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Side column */}
          <div className="space-y-6 lg:col-span-1">
            {profileCompletion && (
              <section className="dashboard-panel p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="app-section-title">Profile completion</h2>
                  <span className="text-sm font-semibold tabular-nums text-neutral-900 dark:text-white">
                    {profileCompletion.percentage}%
                  </span>
                </div>
                <Meter
                  value={profileCompletion.percentage}
                  max={100}
                  tone={completionTone(profileCompletion.percentage)}
                  label="Profile completion"
                  className="mt-3"
                />
                <p className="mt-2 text-[13px] text-neutral-500 dark:text-neutral-400">
                  {getCompletionMessage(profileCompletion.percentage)}
                </p>
                <dl className="mt-4 space-y-1.5 border-t border-neutral-200/80 pt-3 text-[13px] dark:border-white/[0.06]">
                  {Object.entries(profileCompletion.details).map(([section, data]) => (
                    <div key={section} className="flex items-center justify-between">
                      <dt className="capitalize text-neutral-600 dark:text-neutral-400">{section.replace('_', ' ')}</dt>
                      <dd className="tabular-nums text-neutral-500 dark:text-neutral-400">
                        {data.completed}/{data.total}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}

            {/* Attendance summary */}
            <section className="dashboard-panel p-4 sm:p-5" data-tour="member-attendance">
              <h2 className="app-section-title">Attendance</h2>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <div>
                  <p className="app-stat-value">{attendanceHistory.length}</p>
                  <p className="app-stat-label mt-0.5">Services</p>
                </div>
                <div>
                  <p className="app-stat-value">{weeklyAverage}%</p>
                  <p className="app-stat-label mt-0.5">Weekly avg</p>
                </div>
                <div>
                  <p className="app-stat-value">{last30}</p>
                  <p className="app-stat-label mt-0.5">Last 30 days</p>
                </div>
              </div>
            </section>

            {member.user_id || member.user?.id ? (
              <HouseholdCard userId={member.user?.id || member.user_id} fullName={fullName} />
            ) : null}
          </div>

          {/* Main column */}
          <div className="space-y-6 lg:col-span-2">
            {/* Contact information */}
            <Section icon={Phone} title="Contact">
              {isEditing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <EditField label="Full name" id="full_name">
                      <Input
                        id="full_name"
                        className="h-11 sm:h-10"
                        value={editForm.full_name}
                        onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                      />
                    </EditField>
                    <EditField label="Role" id="role">
                      <Select value={editForm.role} onValueChange={(value) => setEditForm(prev => ({ ...prev, role: value }))}>
                        <SelectTrigger id="role" className="h-11 sm:h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="pastor">Pastor</SelectItem>
                          <SelectItem value="elder">Elder</SelectItem>
                          <SelectItem value="finance_officer">Finance officer</SelectItem>
                          <SelectItem value="member">Member</SelectItem>
                        </SelectContent>
                      </Select>
                    </EditField>
                    <EditField label="Primary phone" id="phone">
                      <Input
                        id="phone"
                        type="tel"
                        inputMode="tel"
                        className="h-11 sm:h-10"
                        value={editForm.phone}
                        onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                      />
                    </EditField>
                    <EditField label="Email" id="email">
                      <Input
                        id="email"
                        type="email"
                        inputMode="email"
                        className="h-11 sm:h-10"
                        value={editForm.email}
                        onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                      />
                    </EditField>
                    <EditField label="Address" id="address">
                      <Input
                        id="address"
                        className="h-11 sm:h-10"
                        value={editForm.address}
                        onChange={(e) => setEditForm(prev => ({ ...prev, address: e.target.value }))}
                      />
                    </EditField>
                    <EditField label="Occupation" id="occupation">
                      <Input
                        id="occupation"
                        className="h-11 sm:h-10"
                        value={editForm.occupation}
                        onChange={(e) => setEditForm(prev => ({ ...prev, occupation: e.target.value }))}
                      />
                    </EditField>
                    <EditField label="Place of work" id="place_of_work">
                      <Input
                        id="place_of_work"
                        className="h-11 sm:h-10"
                        value={editForm.place_of_work}
                        onChange={(e) => setEditForm(prev => ({ ...prev, place_of_work: e.target.value }))}
                      />
                    </EditField>
                    <EditField label="Marital status" id="marital_status">
                      <Select value={editForm.marital_status} onValueChange={(value) => setEditForm(prev => ({ ...prev, marital_status: value }))}>
                        <SelectTrigger id="marital_status" className="h-11 sm:h-10">
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
                    </EditField>
                    <EditField label="Spouse name" id="spouse_name">
                      <Input
                        id="spouse_name"
                        className="h-11 sm:h-10"
                        value={editForm.spouse_name}
                        onChange={(e) => setEditForm(prev => ({ ...prev, spouse_name: e.target.value }))}
                      />
                    </EditField>
                    <EditField label="Children" id="children_count">
                      <Input
                        id="children_count"
                        type="number"
                        inputMode="numeric"
                        className="h-11 sm:h-10"
                        value={editForm.children_count}
                        onChange={(e) => setEditForm(prev => ({ ...prev, children_count: parseInt(e.target.value) || 0 }))}
                      />
                    </EditField>
                  </div>
                  <div className="border-t border-neutral-200/80 pt-4 dark:border-white/[0.06]">
                    <h3 className="app-overline mb-3">Emergency contact</h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <EditField label="Name" id="emergency_contact_name">
                        <Input
                          id="emergency_contact_name"
                          className="h-11 sm:h-10"
                          value={editForm.emergency_contact_name}
                          onChange={(e) => setEditForm(prev => ({ ...prev, emergency_contact_name: e.target.value }))}
                        />
                      </EditField>
                      <EditField label="Phone" id="emergency_contact_phone">
                        <Input
                          id="emergency_contact_phone"
                          type="tel"
                          inputMode="tel"
                          className="h-11 sm:h-10"
                          value={editForm.emergency_contact_phone}
                          onChange={(e) => setEditForm(prev => ({ ...prev, emergency_contact_phone: e.target.value }))}
                        />
                      </EditField>
                      <EditField label="Relationship" id="emergency_contact_relation">
                        <Input
                          id="emergency_contact_relation"
                          className="h-11 sm:h-10"
                          value={editForm.emergency_contact_relation}
                          onChange={(e) => setEditForm(prev => ({ ...prev, emergency_contact_relation: e.target.value }))}
                        />
                      </EditField>
                    </div>
                  </div>
                  <div className="hidden justify-end gap-2 sm:flex">
                    <Button variant="outline" onClick={handleCancelEdit}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveEdit} disabled={loading}>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Save changes
                    </Button>
                  </div>
                </div>
              ) : (
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Primary phone">
                    {member.user?.phone ? (
                      <PhoneLink phone={member.user.phone} whatsapp={member.user.whatsapp} name={fullName} />
                    ) : null}
                  </Field>
                  <Field label="Secondary phone">
                    {member.user?.secondary_phone ? (
                      <PhoneLink phone={member.user.secondary_phone} name={fullName} />
                    ) : null}
                  </Field>
                  {member.user?.whatsapp && member.user.whatsapp !== member.user.phone ? (
                    <Field label="WhatsApp">
                      <PhoneLink phone={member.user.whatsapp} whatsapp={member.user.whatsapp} name={fullName} />
                    </Field>
                  ) : null}
                  <Field label="Email">
                    {member.user?.email ? <span className="break-all">{member.user.email}</span> : null}
                  </Field>
                  <Field label="Address">{member.address}</Field>
                  <Field label="Emergency contact" className="sm:col-span-2">
                    {member.user?.emergency_contact_name || member.user?.emergency_contact_phone ? (
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p>
                            {member.user?.emergency_contact_name || 'Unnamed'}
                            {member.user?.emergency_contact_relation ? (
                              <span className="text-neutral-500 dark:text-neutral-400">
                                {' '}· {member.user.emergency_contact_relation}
                              </span>
                            ) : null}
                          </p>
                          {member.user?.emergency_contact_phone ? (
                            <PhoneLink
                              phone={member.user.emergency_contact_phone}
                              name={member.user.emergency_contact_name}
                              className="text-sm"
                            />
                          ) : null}
                        </div>
                        <QuickContactButtons
                          phone={member.user?.emergency_contact_phone}
                          name={member.user?.emergency_contact_name}
                        />
                      </div>
                    ) : null}
                  </Field>
                  {member.emergency_contacts?.filter((c) => c?.name || c?.phone).map((contact, i) => (
                    <Field key={`${contact.phone}-${i}`} label="Other emergency contact" className="sm:col-span-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p>
                            {contact.name}
                            {contact.relation ? (
                              <span className="text-neutral-500 dark:text-neutral-400"> · {contact.relation}</span>
                            ) : null}
                          </p>
                          <PhoneLink phone={contact.phone} name={contact.name} className="text-sm" />
                        </div>
                        <QuickContactButtons phone={contact.phone} name={contact.name} />
                      </div>
                    </Field>
                  ))}
                </dl>
              )}
            </Section>

            <Section icon={User} title="Personal">
              <dl className="grid grid-cols-2 gap-4">
                <Field label="First name">{member.user?.first_name}</Field>
                <Field label="Middle name">{member.user?.middle_name}</Field>
                <Field label="Last name">{member.user?.last_name}</Field>
                <Field label="Gender" capitalize>{member.gender}</Field>
                <Field label="Date of birth">{member.dob ? formatDate(member.dob) : null}</Field>
                <Field label="Marital status" capitalize>{member.user?.marital_status}</Field>
              </dl>
            </Section>

            <Section icon={Briefcase} title="Work and family">
              <dl className="grid grid-cols-2 gap-4">
                <Field label="Occupation">{member.user?.occupation}</Field>
                <Field label="Place of work">{member.user?.place_of_work}</Field>
                <Field label="Spouse">{member.user?.spouse_name}</Field>
                <Field label="Children">{String(member.user?.children_count || 0)}</Field>
              </dl>
            </Section>

            <Section icon={Church} title="Spiritual">
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Date of baptism">
                  {member.date_of_baptism ? formatDate(member.date_of_baptism) : null}
                </Field>
                <Field label="Holy Ghost baptism">
                  <span className="inline-flex items-center gap-1.5">
                    {member.holy_ghost_baptism ? (
                      <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
                    ) : (
                      <Circle className="h-4 w-4 text-neutral-400 dark:text-neutral-500" aria-hidden />
                    )}
                    {member.holy_ghost_baptism ? 'Yes' : 'No'}
                  </span>
                </Field>
                <Field label="Date of Holy Ghost baptism">
                  {member.date_of_holy_ghost_baptism ? formatDate(member.date_of_holy_ghost_baptism) : null}
                </Field>
                <Field label="Previous church">{member.previous_church}</Field>
                <Field label="Reason for leaving previous church" className="sm:col-span-2">
                  {member.reason_for_leaving}
                </Field>
              </dl>
            </Section>

            {member.special_skills?.length || member.interests?.length ? (
              <Section icon={Star} title="Skills and interests">
                <div className="space-y-4">
                  {member.special_skills?.length ? (
                    <div>
                      <p className="app-stat-label">Special skills</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {member.special_skills.map((skill, index) => (
                          <Badge key={index} variant="secondary">{skill}</Badge>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {member.interests?.length ? (
                    <div>
                      <p className="app-stat-label">Interests</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {member.interests.map((interest, index) => (
                          <Badge key={index} variant="outline">{interest}</Badge>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </Section>
            ) : null}

            {member.group_memberships?.length ? (
              <Section icon={Users} title="Groups">
                <ul className="divide-y divide-neutral-100 dark:divide-white/[0.06]">
                  {member.group_memberships.map((membership) => (
                    <li key={membership.id} className="flex min-h-11 items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                          {membership.group?.name || 'Unknown group'}
                        </p>
                        <p className="text-[13px] capitalize text-neutral-500 dark:text-neutral-400">
                          {membership.group?.group_type || 'Unknown type'}
                        </p>
                      </div>
                      <Badge variant="outline" className="shrink-0 capitalize">{membership.role}</Badge>
                    </li>
                  ))}
                </ul>
              </Section>
            ) : null}

            {member.dependants?.length ? (
              <Section icon={Heart} title={`Dependants (${member.dependants.length})`}>
                <ul className="divide-y divide-neutral-100 dark:divide-white/[0.06]">
                  {member.dependants.map((dependant) => (
                    <li key={dependant.id} className="flex min-h-11 items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                          {dependant.first_name} {dependant.last_name}
                        </p>
                        <p className="text-[13px] capitalize text-neutral-500 dark:text-neutral-400">
                          {dependant.relationship} · {dependant.dob ? formatDate(dependant.dob) : 'No date of birth'}
                        </p>
                      </div>
                      {dependant.is_member && <Badge variant="secondary">Member</Badge>}
                    </li>
                  ))}
                </ul>
              </Section>
            ) : null}

            <Section icon={Calendar} title="Attendance history">
              {attendanceHistory.length === 0 ? (
                <div className="py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
                  <Calendar className="mx-auto mb-3 h-10 w-10 text-neutral-300 dark:text-neutral-600" />
                  No attendance records yet
                </div>
              ) : (
                <ul className="divide-y divide-neutral-100 dark:divide-white/[0.06]">
                  {attendanceHistory.map((attendance) => (
                    <li key={attendance.id} className="flex min-h-11 items-center gap-3 py-2.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-400/10">
                        <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                          {formatDate(attendance.service_date)}
                        </p>
                        <p className="truncate text-[13px] capitalize text-neutral-500 dark:text-neutral-400">
                          {attendance.service_type?.replace(/_/g, ' ')} · {attendance.method}
                        </p>
                      </div>
                      <span className="shrink-0 text-[13px] tabular-nums text-neutral-600 dark:text-neutral-400">
                        {new Date(attendance.check_in_time).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            {member.notes && (
              <Section icon={FileText} title="Notes">
                <p className="whitespace-pre-wrap text-sm text-neutral-700 dark:text-neutral-300">{member.notes}</p>
              </Section>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon
  title: string
  children: ReactNode
}) {
  return (
    <section className="dashboard-panel p-4 sm:p-5">
      <h2 className="app-section-title mb-4 flex items-center gap-2">
        <Icon className="h-4 w-4 text-neutral-500 dark:text-neutral-400" aria-hidden />
        {title}
      </h2>
      {children}
    </section>
  )
}

function Field({
  label,
  children,
  className,
  capitalize,
}: {
  label: string
  children?: ReactNode
  className?: string
  capitalize?: boolean
}) {
  const empty = children === null || children === undefined || children === ''
  return (
    <div className={cn('min-w-0', className)}>
      <dt className="app-stat-label">{label}</dt>
      <dd
        className={cn(
          'mt-0.5 break-words text-sm',
          empty ? 'text-neutral-400 dark:text-neutral-500' : 'text-neutral-900 dark:text-neutral-100',
          capitalize && 'capitalize'
        )}
      >
        {empty ? 'Not provided' : children}
      </dd>
    </div>
  )
}

function EditField({ label, id, children }: { label: string; id: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  )
}
