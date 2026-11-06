'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { DashboardLayout } from '@/components/dashboard-layout'
import { dataService } from '@/lib/services/data-service'
import { AppUser, Group } from '@/lib/types'
import {
  ArrowLeft,
  Users,
  Settings,
  Star,
  Calendar,
  MapPin,
  User,
  Shield,
  Mail,
  Phone,
  Clock,
  Target,
  Plus,
  X,
  Save,
  Flag,
} from 'lucide-react'

interface GroupFormData {
  name: string
  description: string
  group_type: string
  meeting_schedule: string
  meeting_location: string
  max_members: number | null
  is_open: boolean
  requires_approval: boolean
  leader_id: string
  co_leader_id: string | null
  permissions: {
    can_add_members: boolean
    can_remove_members: boolean
    can_send_messages: boolean
    can_schedule_events: boolean
    can_view_attendance: boolean
    can_manage_finances: boolean
  }
  tags: string[]
  contact_info: {
    email: string
    phone: string
    website: string
  }
}

export default function CreateGroupPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [members, setMembers] = useState<AppUser[]>([])
  const [newTag, setNewTag] = useState('')

  const [formData, setFormData] = useState<GroupFormData>({
    name: '',
    description: '',
    group_type: 'fellowship',
    meeting_schedule: '',
    meeting_location: '',
    max_members: null,
    is_open: true,
    requires_approval: false,
    leader_id: '',
    co_leader_id: null,
    permissions: {
      can_add_members: true,
      can_remove_members: true,
      can_send_messages: true,
      can_schedule_events: false,
      can_view_attendance: true,
      can_manage_finances: false,
    },
    tags: [],
    contact_info: {
      email: '',
      phone: '',
      website: ''
    }
  })

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      fetchMembers()
    }
  }, [user])

  const fetchMembers = async () => {
    try {
      setLoading(true)
      const res = await dataService.getAllMembers()
      if (res.error) {
        console.error('Error fetching members:', res.error)
        return
      }
      const list = (res.data ?? []).filter(u => ['admin', 'pastor', 'elder', 'finance_officer', 'member'].includes(u.role))
      setMembers(list)
    } catch (error) {
      console.error('Error fetching members:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handlePermissionChange = (permission: string, value: boolean | string) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [permission]: Boolean(value)
      }
    }))
  }

  const handleContactInfoChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      contact_info: {
        ...prev.contact_info,
        [field]: value
      }
    }))
  }

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }))
      setNewTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim() || !formData.leader_id) {
      alert('Please fill in all required fields')
      return
    }

    try {
      setSaving(true)

      const groupRes = await dataService.createGroup({
        name: formData.name.trim(),
        description: formData.description.trim(),
        group_type: formData.group_type as Group['group_type'],
        meeting_schedule: formData.meeting_schedule.trim(),
        meeting_location: formData.meeting_location.trim(),
        max_members: formData.max_members ?? undefined,
        is_open: formData.is_open,
        requires_approval: formData.requires_approval,
        leader_id: formData.leader_id,
        co_leader_id: formData.co_leader_id ?? undefined,
        is_active: true
      })

      if (groupRes.error || !groupRes.data?.id) {
        console.error('Error creating group:', groupRes.error)
        alert('Failed to create group. Please try again.')
        return
      }

      const groupId = groupRes.data.id

      if (formData.leader_id) {
        await dataService.addUserToGroup(groupId, formData.leader_id, 'leader')
      }
      if (formData.co_leader_id) {
        await dataService.addUserToGroup(groupId, formData.co_leader_id, 'co_leader')
      }

      alert('Group created successfully!')
      router.push('/groups')
    } catch (error) {
      console.error('Error creating group:', error)
      alert('Failed to create group. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const getGroupTypeIcon = (type: string) => {
    switch (type) {
      case 'ministry': return <Settings className="h-5 w-5" />
      case 'fellowship': return <Users className="h-5 w-5" />
      case 'age_group': return <User className="h-5 w-5" />
      case 'special_interest': return <Star className="h-5 w-5" />
      case 'leadership': return <Flag className="h-5 w-5" />
      default: return <Users className="h-5 w-5" />
    }
  }

  // Show loading state
  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-4xl animate-pulse">
          <div className="mb-6 h-8 w-1/2 rounded bg-neutral-200 dark:bg-neutral-700 sm:w-1/4"></div>
          <div className="space-y-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 rounded-xl bg-neutral-200 dark:bg-neutral-800"></div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // Show nothing while redirecting
  if (!user) {
    return null
  }

  return (
    <DashboardLayout>
    <div>
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <button
            type="button"
            onClick={() => router.push('/groups')}
            className="-ml-1 mb-3 inline-flex min-h-11 items-center gap-2 rounded-md px-1 text-sm text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 sm:min-h-0"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to groups
          </button>
          <h1 className="app-page-title">
            Create new group
          </h1>
          <p className="app-page-description mt-1">Set up a new church group, ministry, or fellowship</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="app-section-title flex items-center gap-2">
                <Users className="h-4 w-4 text-neutral-400 dark:text-neutral-500" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Group Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="e.g., Youth Fellowship, Children's Ministry"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="group_type">Group Type *</Label>
                  <Select value={formData.group_type} onValueChange={(value) => handleInputChange('group_type', value)}>
                    <SelectTrigger className="h-11 sm:h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fellowship">
                        <div className="flex items-center">
                          <Users className="h-4 w-4 mr-2" />
                          Fellowship
                        </div>
                      </SelectItem>
                      <SelectItem value="ministry">
                        <div className="flex items-center">
                          <Settings className="h-4 w-4 mr-2" />
                          Ministry
                        </div>
                      </SelectItem>
                      <SelectItem value="age_group">
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-2" />
                          Age Group
                        </div>
                      </SelectItem>
                      <SelectItem value="special_interest">
                        <div className="flex items-center">
                          <Star className="h-4 w-4 mr-2" />
                          Special Interest
                        </div>
                      </SelectItem>
                      <SelectItem value="leadership">
                        <div className="flex items-center">
                          Leadership
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe the purpose and activities of this group..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="max_members">Maximum Members</Label>
                  <Input
                    id="max_members"
                    type="number"
                    value={formData.max_members || ''}
                    onChange={(e) => handleInputChange('max_members', e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="Leave empty for unlimited"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Group Settings</Label>
                  <div className="space-y-2">
                    <div className="flex min-h-11 items-center gap-3">
                      <Checkbox
                        id="is_open"
                        checked={formData.is_open}
                        onCheckedChange={(checked) => handleInputChange('is_open', checked)}
                      />
                      <Label htmlFor="is_open" className="text-sm">Open for new members</Label>
                    </div>
                    <div className="flex min-h-11 items-center gap-3">
                      <Checkbox
                        id="requires_approval"
                        checked={formData.requires_approval}
                        onCheckedChange={(checked) => handleInputChange('requires_approval', checked)}
                      />
                      <Label htmlFor="requires_approval" className="text-sm">Requires approval to join</Label>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Leadership */}
          <Card>
            <CardHeader>
              <CardTitle className="app-section-title flex items-center gap-2">
                Leadership
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="leader">Group Leader *</Label>
                  <Select value={formData.leader_id} onValueChange={(value) => handleInputChange('leader_id', value)}>
                    <SelectTrigger className="h-11 sm:h-10">
                      <SelectValue placeholder="Select a leader" />
                    </SelectTrigger>
                    <SelectContent>
                      {members.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          <div className="flex items-center">
                            <div className="flex-1">
                              <p className="font-medium">{member.full_name}</p>
                              <p className="text-xs text-neutral-500 dark:text-neutral-400"><span className="font-mono">{member.membership_id}</span> · {member.role}</p>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="co_leader">Co-Leader (Optional)</Label>
                  <Select value={formData.co_leader_id || 'none'} onValueChange={(value) => handleInputChange('co_leader_id', value === 'none' ? null : value)}>
                    <SelectTrigger className="h-11 sm:h-10">
                      <SelectValue placeholder="Select a co-leader" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No co-leader</SelectItem>
                      {members.filter(m => m.id !== formData.leader_id).map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          <div className="flex items-center">
                            <div className="flex-1">
                              <p className="font-medium">{member.full_name}</p>
                              <p className="text-xs text-neutral-500 dark:text-neutral-400"><span className="font-mono">{member.membership_id}</span> · {member.role}</p>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Meeting Information */}
          <Card>
            <CardHeader>
              <CardTitle className="app-section-title flex items-center gap-2">
                <Calendar className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                Meeting Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="meeting_schedule">Meeting Schedule</Label>
                  <Input
                    id="meeting_schedule"
                    value={formData.meeting_schedule}
                    onChange={(e) => handleInputChange('meeting_schedule', e.target.value)}
                    placeholder="e.g., Every Sunday 10:00 AM"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="meeting_location">Meeting Location</Label>
                  <Input
                    id="meeting_location"
                    value={formData.meeting_location}
                    onChange={(e) => handleInputChange('meeting_location', e.target.value)}
                    placeholder="e.g., Main Hall, Room 101"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Permissions */}
          <Card>
            <CardHeader>
              <CardTitle className="app-section-title flex items-center gap-2">
                <Shield className="h-4 w-4 text-red-600 dark:text-red-400" />
                Group Permissions
              </CardTitle>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">Set what group members can do</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
                <div>
                  <div className="flex min-h-11 items-center gap-3">
                    <Checkbox
                      id="can_add_members"
                      checked={formData.permissions.can_add_members}
                      onCheckedChange={(checked) => handlePermissionChange('can_add_members', checked)}
                    />
                    <Label htmlFor="can_add_members" className="text-sm">Add new members</Label>
                  </div>
                  <div className="flex min-h-11 items-center gap-3">
                    <Checkbox
                      id="can_remove_members"
                      checked={formData.permissions.can_remove_members}
                      onCheckedChange={(checked) => handlePermissionChange('can_remove_members', checked)}
                    />
                    <Label htmlFor="can_remove_members" className="text-sm">Remove members</Label>
                  </div>
                  <div className="flex min-h-11 items-center gap-3">
                    <Checkbox
                      id="can_send_messages"
                      checked={formData.permissions.can_send_messages}
                      onCheckedChange={(checked) => handlePermissionChange('can_send_messages', checked)}
                    />
                    <Label htmlFor="can_send_messages" className="text-sm">Send messages</Label>
                  </div>
                </div>
                <div>
                  <div className="flex min-h-11 items-center gap-3">
                    <Checkbox
                      id="can_schedule_events"
                      checked={formData.permissions.can_schedule_events}
                      onCheckedChange={(checked) => handlePermissionChange('can_schedule_events', checked)}
                    />
                    <Label htmlFor="can_schedule_events" className="text-sm">Schedule events</Label>
                  </div>
                  <div className="flex min-h-11 items-center gap-3">
                    <Checkbox
                      id="can_view_attendance"
                      checked={formData.permissions.can_view_attendance}
                      onCheckedChange={(checked) => handlePermissionChange('can_view_attendance', checked)}
                    />
                    <Label htmlFor="can_view_attendance" className="text-sm">View attendance</Label>
                  </div>
                  <div className="flex min-h-11 items-center gap-3">
                    <Checkbox
                      id="can_manage_finances"
                      checked={formData.permissions.can_manage_finances}
                      onCheckedChange={(checked) => handlePermissionChange('can_manage_finances', checked)}
                    />
                    <Label htmlFor="can_manage_finances" className="text-sm">Manage finances</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="app-section-title flex items-center gap-2">
                <Phone className="h-4 w-4 text-neutral-400 dark:text-neutral-500" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact_email">Email</Label>
                  <Input
                    id="contact_email"
                    type="email"
                    value={formData.contact_info.email}
                    onChange={(e) => handleContactInfoChange('email', e.target.value)}
                    placeholder="group@campusgem.org"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_phone">Phone</Label>
                  <Input
                    id="contact_phone"
                    value={formData.contact_info.phone}
                    onChange={(e) => handleContactInfoChange('phone', e.target.value)}
                    placeholder="+233 XX XXX XXXX"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_website">Website</Label>
                <Input
                  id="contact_website"
                  value={formData.contact_info.website}
                  onChange={(e) => handleContactInfoChange('website', e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Tags */}
          <Card>
            <CardHeader>
              <CardTitle className="app-section-title flex items-center gap-2">
                <Target className="h-4 w-4 text-neutral-400 dark:text-neutral-500" />
                Tags
              </CardTitle>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">Add tags to help categorize this group</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  className="h-11 sm:h-10"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add a tag..."
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                />
                <Button type="button" onClick={addTag} variant="outline" className="h-11 w-11 shrink-0 p-0 sm:h-10 sm:w-10" aria-label="Add tag">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        aria-label={`Remove tag ${tag}`}
                        className="-my-1 -mr-1 ml-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full hover:text-red-600 dark:hover:text-red-400"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="sticky bottom-20 z-10 -mx-4 flex gap-3 border-t border-neutral-200/80 bg-white/95 px-4 py-3 backdrop-blur dark:border-white/[0.06] dark:bg-neutral-900/95 sm:static sm:mx-0 sm:justify-end sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none sm:dark:bg-transparent">
            <Button
              type="button"
              variant="outline"
              className="h-11 flex-1 sm:h-10 sm:flex-none"
              onClick={() => router.push('/groups')}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving || !formData.name.trim() || !formData.leader_id}
              className="h-11 flex-1 sm:h-10 sm:flex-none"
            >
              {saving ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 mr-2 border-b-2 border-current"></div>
                  Creating...
                </div>
              ) : (
                <div className="flex items-center">
                  <Save className="h-4 w-4 mr-2" />
                  Create group
                </div>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
    </DashboardLayout>
  )
}
