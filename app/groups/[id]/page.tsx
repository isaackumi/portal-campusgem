'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/components/providers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { groupRoleTone } from '@/lib/ui/chip-tones'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, ScrollableTabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { PhoneLink, QuickContactButtons } from '@/components/contact/phone-link'
import { DashboardLayout } from '@/components/dashboard-layout'
import { GroupSmsComposer } from '@/components/groups/group-sms-composer'
import { useToast } from '@/hooks/use-toast'
import { dataService } from '@/lib/services/data-service'
import { GROUP_MEMBERSHIP_ROLES, GROUP_MEMBERSHIP_ROLE_LABELS, GROUP_TYPES } from '@/lib/constants/groups'
import { groupExportFilename, groupMembersToCsv } from '@/lib/groups/export'
import { downloadCsv } from '@/lib/csv'
import { AppUser, Group, GroupMembership } from '@/lib/types'
import {
  ArrowLeft,
  Users,
  Settings,
  Crown,
  Star,
  Calendar,
  MapPin,
  Shield,
  UserPlus,
  UserMinus,
  Edit,
  Search,
  Download,
  MessageSquare,
  Eye,
} from 'lucide-react'

type GroupEditForm = {
  name: string
  description: string
  group_type: Group['group_type']
  meeting_schedule: string
  meeting_location: string
  max_members: string
  is_active: boolean
}

function groupToForm(group: Group): GroupEditForm {
  return {
    name: group.name,
    description: group.description ?? '',
    group_type: group.group_type,
    meeting_schedule: group.meeting_schedule ?? '',
    meeting_location: group.meeting_location ?? '',
    max_members: group.max_members ? String(group.max_members) : '',
    is_active: group.is_active,
  }
}

type GroupMemberRow = GroupMembership & {
  member?: GroupMembership['member']
}

export default function GroupDetailsPage() {
  const { user, loading: authLoading, can } = useAuth()
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const canManage = can('groups.manage')
  const canText = can('sms.send')

  const [group, setGroup] = useState<Group | null>(null)
  const [members, setMembers] = useState<GroupMemberRow[]>([])
  const [allMembers, setAllMembers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [membersLoading, setMembersLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [showAddMember, setShowAddMember] = useState(false)
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [selectedRole, setSelectedRole] = useState('member')
  const [editForm, setEditForm] = useState<GroupEditForm | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)

  const groupId = params.id as string

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (!user || !groupId) return
    void loadPage()
  }, [user, groupId])

  async function loadPage() {
    setLoading(true)
    await Promise.all([fetchGroupDetails(), fetchAllMembers()])
    await fetchGroupMembers()
    setLoading(false)
  }

  const fetchGroupDetails = async () => {
    try {
      const { data, error } = await dataService.getGroup(groupId)
      if (error) {
        console.error('Error fetching group:', error)
        return
      }
      setGroup(data ?? null)
    } catch (error) {
      console.error('Error fetching group:', error)
    }
  }

  const fetchGroupMembers = async () => {
    try {
      setMembersLoading(true)
      const { data: list, error } = await dataService.getGroupMembers(groupId)
      if (error) {
        console.error('Error fetching group members:', error)
        return
      }
      setMembers(list ?? [])
    } catch (error) {
      console.error('Error fetching group members:', error)
    } finally {
      setMembersLoading(false)
    }
  }

  function memberDisplayName(row: GroupMemberRow): string {
    return row.member?.user?.full_name?.trim() || 'Unknown member'
  }

  function memberMembershipId(row: GroupMemberRow): string {
    return row.member?.user?.membership_id?.trim() || '—'
  }

  function memberUserId(row: GroupMemberRow): string | undefined {
    return row.member?.user?.id ?? row.member?.user_id
  }

  const fetchAllMembers = async () => {
    try {
      const res = await dataService.getAllMembers()
      if (res.error) {
        console.error('Error fetching all members:', res.error)
        return
      }
      setAllMembers((res.data ?? []).filter(u => u.role !== 'visitor'))
    } catch (error) {
      console.error('Error fetching all members:', error)
    }
  }

  const addMemberToGroup = async () => {
    if (!selectedMemberId || !groupId || selectedMemberId === 'no-members') return

    try {
      const { error } = await dataService.addUserToGroup(groupId, selectedMemberId, selectedRole)

      if (error) {
        console.error('Error adding member:', error)
        alert('Failed to add member. They might already be in the group.')
        return
      }

      // Refresh members list
      fetchGroupMembers()
      setShowAddMember(false)
      setSelectedMemberId('')
      setSelectedRole('member')
      alert('Member added successfully!')
    } catch (error) {
      console.error('Error adding member:', error)
      alert('Failed to add member. Please try again.')
    }
  }

  const removeMemberFromGroup = async (membershipId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to remove ${memberName} from this group?`)) return

    try {
      const { error } = await dataService.removeGroupMember(membershipId)

      if (error) {
        console.error('Error removing member:', error)
        alert('Failed to remove member. Please try again.')
        return
      }

      // Refresh members list
      fetchGroupMembers()
      alert('Member removed successfully!')
    } catch (error) {
      console.error('Error removing member:', error)
      alert('Failed to remove member. Please try again.')
    }
  }

  const updateMemberRole = async (membershipId: string, newRole: string) => {
    try {
      const { error } = await dataService.updateGroupMembership(membershipId, { role: newRole as GroupMembership['role'] })

      if (error) {
        console.error('Error updating role:', error)
        alert('Failed to update role. Please try again.')
        return
      }

      // Refresh members list
      fetchGroupMembers()
      alert('Role updated successfully!')
    } catch (error) {
      console.error('Error updating role:', error)
      alert('Failed to update role. Please try again.')
    }
  }

  const exportMembers = () => {
    if (!group) return
    if (members.length === 0) {
      toast({ title: 'Nothing to export', description: 'This group has no members yet.' })
      return
    }
    downloadCsv(groupExportFilename(`${group.name}-members`), groupMembersToCsv(members))
    toast({
      title: 'Export ready',
      description: `${members.length} member${members.length === 1 ? '' : 's'} saved to CSV.`,
    })
  }

  const saveGroupEdit = async () => {
    if (!editForm || !group) return
    const name = editForm.name.trim()
    if (!name) {
      toast({ variant: 'destructive', title: 'Name is required' })
      return
    }
    const max = editForm.max_members.trim() ? Number(editForm.max_members) : undefined
    if (max !== undefined && (!Number.isInteger(max) || max < 1)) {
      toast({ variant: 'destructive', title: 'Capacity must be a whole number above 0' })
      return
    }
    setSavingEdit(true)
    try {
      const { data, error } = await dataService.updateGroup(group.id, {
        name,
        description: editForm.description.trim(),
        group_type: editForm.group_type,
        meeting_schedule: editForm.meeting_schedule.trim(),
        meeting_location: editForm.meeting_location.trim(),
        max_members: max,
        is_active: editForm.is_active,
      })
      if (error) throw new Error(error)
      if (data) setGroup((prev) => (prev ? { ...prev, ...data, leader: prev.leader, co_leader: prev.co_leader } : data))
      else await fetchGroupDetails()
      setEditForm(null)
      toast({ title: 'Group updated' })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Could not save',
        description: error instanceof Error ? error.message : 'Please try again.',
      })
    } finally {
      setSavingEdit(false)
    }
  }

  const getRoleIcon = (role: GroupMembership['role']) => {
    switch (role) {
      case 'leader': return <Crown className="h-3 w-3" />
      case 'co_leader': return <Star className="h-3 w-3" />
      case 'executive': return <Shield className="h-3 w-3" />
      default: return <Users className="h-3 w-3" />
    }
  }

  const filteredMembers = members.filter((row) => {
    const name = memberDisplayName(row).toLowerCase()
    const membershipId = memberMembershipId(row).toLowerCase()
    const matchesSearch =
      searchTerm === '' ||
      name.includes(searchTerm.toLowerCase()) ||
      membershipId.includes(searchTerm.toLowerCase())

    const matchesRole = roleFilter === 'all' || row.role === roleFilter

    return matchesSearch && matchesRole
  })

  const memberUserIds = new Set(members.map((row) => memberUserId(row)).filter(Boolean))
  const availableMembers = allMembers.filter((user) => !memberUserIds.has(user.id))

  // Show loading state
  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-6xl animate-pulse">
          <div className="mb-6 h-8 w-1/2 rounded bg-neutral-200 dark:bg-neutral-700 sm:w-1/4"></div>
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <div className="h-64 rounded-xl bg-neutral-200 dark:bg-neutral-800"></div>
              <div className="h-96 rounded-xl bg-neutral-200 dark:bg-neutral-800"></div>
            </div>
            <div className="space-y-6">
              <div className="h-48 rounded-xl bg-neutral-200 dark:bg-neutral-800"></div>
              <div className="h-32 rounded-xl bg-neutral-200 dark:bg-neutral-800"></div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!user) {
    return null
  }

  if (!group) {
    return (
      <DashboardLayout>
        <div className="py-12 text-center">
          <h2 className="app-section-title">Group not found</h2>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">This group may have been removed or the link is invalid.</p>
          <Button className="mt-4 h-11 sm:h-10" onClick={() => router.push('/groups')}>
            Back to groups
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  const leaders = [
    { person: group.leader, label: 'Leader', icon: Crown, tone: 'bg-amber-50 text-amber-600 dark:bg-amber-400/10 dark:text-amber-300' },
    { person: group.co_leader, label: 'Co-leader', icon: Star, tone: 'bg-brand-50 text-brand-600 dark:bg-brand-400/10 dark:text-brand-300' },
  ].filter((l) => l.person)

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl pb-6">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:mb-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => router.push('/groups')}
              className="-ml-1 mb-3 inline-flex min-h-11 items-center gap-2 rounded-md px-1 text-sm text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 sm:min-h-0"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to groups
            </button>
            <h1 className="app-page-title break-words">
              {group.name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              <Badge variant="secondary" className="capitalize">
                {group.group_type.replace('_', ' ')}
              </Badge>
              <span className="text-sm text-neutral-600 dark:text-neutral-400">
                {members.length} member{members.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canManage ? (
              <>
                <Button data-tour="group-add-member" className="h-11 flex-1 sm:h-10 sm:flex-none" onClick={() => setShowAddMember(true)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add member
                </Button>
                <Button
                  variant="outline"
                  className="h-11 flex-1 sm:h-10 sm:flex-none"
                  onClick={() => setEditForm(groupToForm(group))}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              </>
            ) : null}
            <Button
              variant="outline"
              className={canManage ? 'h-11 w-11 shrink-0 p-0 sm:h-10 sm:w-auto sm:px-4' : 'h-11 flex-1 sm:h-10 sm:flex-none'}
              onClick={exportMembers}
              disabled={membersLoading}
              aria-label="Export members to CSV"
              title="Export members to CSV"
              data-tour="group-export"
            >
              <Download className={canManage ? 'h-4 w-4 sm:mr-2' : 'mr-2 h-4 w-4'} />
              <span className={canManage ? 'hidden sm:inline' : undefined}>Export</span>
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Leadership first on phones: it's who people want to reach */}
          {leaders.length > 0 ? (
            <Card className="lg:col-start-3 lg:row-start-1">
              <CardHeader className="p-4 pb-2 sm:p-6 sm:pb-2">
                <CardTitle className="app-section-title flex items-center gap-2">
                  <Crown className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                  Leadership
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 p-4 pt-0 sm:p-6 sm:pt-0">
                {leaders.map(({ person, label, icon: Icon, tone }) => (
                  <div key={person!.id} className="flex min-h-14 items-center gap-3">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${tone}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">{person!.full_name}</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        {label}
                        {person!.phone ? (
                          <>
                            {' · '}
                            <PhoneLink phone={person!.phone} whatsapp={person!.whatsapp} name={person!.full_name} />
                          </>
                        ) : null}
                      </p>
                    </div>
                    <QuickContactButtons phone={person!.phone} whatsapp={person!.whatsapp} name={person!.full_name} />
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {/* Main Content */}
          <div className="min-w-0 space-y-6 lg:col-span-2 lg:col-start-1 lg:row-span-3 lg:row-start-1">
            <Tabs defaultValue="members" className="w-full">
              <ScrollableTabsList data-tour="group-tabs">
                <TabsTrigger value="members">Members</TabsTrigger>
                {canText ? <TabsTrigger value="messages" data-tour="group-message-tab">Message</TabsTrigger> : null}
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </ScrollableTabsList>

              {/* Members Tab */}
              <TabsContent value="members" className="mt-4 space-y-6">
                <Card>
                  <CardHeader className="p-4 pb-3 sm:p-6 sm:pb-3">
                    <CardTitle className="app-section-title flex items-center gap-2">
                      <Users className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                      Group members
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                    {/* Search and Filters */}
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
                        <Input
                          type="search"
                          placeholder="Search members..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="h-11 w-full pl-10 sm:h-10"
                        />
                      </div>
                      <Select value={roleFilter} onValueChange={setRoleFilter}>
                        <SelectTrigger className="h-11 w-full sm:h-10 sm:w-40" aria-label="Filter by role">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All roles</SelectItem>
                          {GROUP_MEMBERSHIP_ROLES.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Members List */}
                    {membersLoading ? (
                      <p className="py-6 text-center text-sm text-neutral-500 dark:text-neutral-400">Loading members…</p>
                    ) : null}
                    <ul className="divide-y divide-neutral-100 dark:divide-white/[0.06]">
                      {filteredMembers.map((groupMember) => {
                        const person = groupMember.member?.user
                        const name = memberDisplayName(groupMember)
                        return (
                          <li key={groupMember.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-400/10 dark:text-brand-300">
                                <Users className="h-5 w-5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-medium text-neutral-900 dark:text-neutral-100">{name}</p>
                                <p className="flex flex-wrap items-center gap-x-2 text-xs text-neutral-500 dark:text-neutral-400">
                                  <span className="font-mono">{memberMembershipId(groupMember)}</span>
                                  {person?.phone ? (
                                    <PhoneLink phone={person.phone} whatsapp={person.whatsapp} name={name} />
                                  ) : null}
                                </p>
                              </div>
                              <QuickContactButtons phone={person?.phone} whatsapp={person?.whatsapp} name={name} />
                            </div>
                            <div className="flex items-center gap-2 sm:justify-end">
                              <Badge
                                variant={groupRoleTone(groupMember.role)}
                                className={canManage ? 'hidden capitalize sm:inline-flex' : 'capitalize'}
                              >
                                {getRoleIcon(groupMember.role)}
                                {GROUP_MEMBERSHIP_ROLE_LABELS[groupMember.role]}
                              </Badge>
                              {canManage ? (
                                <>
                                  <Label htmlFor={`role-${groupMember.id}`} className="sr-only">
                                    Change role
                                  </Label>
                                  <Select
                                    value={groupMember.role}
                                    onValueChange={(value) => updateMemberRole(groupMember.id, value)}
                                  >
                                    <SelectTrigger id={`role-${groupMember.id}`} className="h-11 flex-1 sm:h-9 sm:w-36 sm:flex-none">
                                      <SelectValue placeholder="Change role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {GROUP_MEMBERSHIP_ROLES.map((item) => (
                                        <SelectItem key={item.value} value={item.value}>
                                          {item.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => removeMemberFromGroup(groupMember.id, name)}
                                    className="h-11 shrink-0 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-400/30 dark:text-red-300 dark:hover:bg-red-400/10 dark:hover:text-red-200 sm:h-9"
                                    aria-label={`Remove ${name} from group`}
                                  >
                                    <UserMinus className="h-4 w-4 sm:mr-1" />
                                    <span className="hidden sm:inline">Remove</span>
                                  </Button>
                                </>
                              ) : null}
                            </div>
                          </li>
                        )
                      })}
                    </ul>

                    {filteredMembers.length === 0 && !membersLoading && (
                      <div className="py-8 text-center">
                        <Users className="mx-auto mb-4 h-12 w-12 text-neutral-400 dark:text-neutral-500" />
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">No members found</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Message Tab: SMS to the whole group (sms.send only) */}
              {canText ? (
                <TabsContent value="messages" className="mt-4 space-y-6">
                  <Card>
                    <CardHeader className="p-4 pb-3 sm:p-6 sm:pb-3">
                      <CardTitle className="app-section-title flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                        Text the group
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                      <GroupSmsComposer groupId={group.id} groupName={group.name} memberships={members} />
                    </CardContent>
                  </Card>
                </TabsContent>
              ) : null}

              {/* Settings Tab */}
              <TabsContent value="settings" className="mt-4 space-y-6">
                <Card>
                  <CardHeader className="p-4 pb-3 sm:p-6 sm:pb-3">
                    <CardTitle className="app-section-title flex items-center gap-2">
                      <Settings className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                      Group settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                    <dl className="grid grid-cols-2 gap-4">
                      {[
                        ['Group type', group.group_type.replace('_', ' ')],
                        ['Max members', group.max_members || 'Unlimited'],
                        ['Status', group.is_active ? 'Active' : 'Inactive'],
                        ['Created', new Date(group.created_at).toLocaleDateString()],
                      ].map(([k, v]) => (
                        <div key={String(k)}>
                          <dt className="app-stat-label">{k}</dt>
                          <dd className="mt-0.5 text-sm capitalize text-neutral-800 dark:text-neutral-200">{v}</dd>
                        </div>
                      ))}
                    </dl>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Group Info */}
          {group.description || group.meeting_schedule || group.meeting_location ? (
            <Card className="lg:col-start-3">
              <CardHeader className="p-4 pb-2 sm:p-6 sm:pb-2">
                <CardTitle className="app-section-title flex items-center gap-2">
                  <Eye className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                  About
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
                {group.description && (
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">{group.description}</p>
                )}

                {group.meeting_schedule && (
                  <div className="flex items-start gap-2">
                    <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400 dark:text-neutral-500" />
                    <div className="min-w-0">
                      <p className="app-stat-label">Meeting schedule</p>
                      <p className="break-words text-sm text-neutral-700 dark:text-neutral-300">{group.meeting_schedule}</p>
                    </div>
                  </div>
                )}

                {group.meeting_location && (
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400 dark:text-neutral-500" />
                    <div className="min-w-0">
                      <p className="app-stat-label">Location</p>
                      <p className="break-words text-sm text-neutral-700 dark:text-neutral-300">{group.meeting_location}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}
        </div>

        {/* Edit Group Dialog */}
        <Dialog open={editForm != null} onOpenChange={(open) => (!open && !savingEdit ? setEditForm(null) : undefined)}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit group</DialogTitle>
              <DialogDescription>Leaders are changed from the member list (Role).</DialogDescription>
            </DialogHeader>
            {editForm ? (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-group-name">Name</Label>
                  <Input
                    id="edit-group-name"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="h-11 sm:h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-group-type">Type</Label>
                  <Select
                    value={editForm.group_type}
                    onValueChange={(value) => setEditForm({ ...editForm, group_type: value as Group['group_type'] })}
                  >
                    <SelectTrigger id="edit-group-type" className="h-11 sm:h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GROUP_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-group-description">Description</Label>
                  <Textarea
                    id="edit-group-description"
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-group-schedule">Meets</Label>
                    <Input
                      id="edit-group-schedule"
                      value={editForm.meeting_schedule}
                      onChange={(e) => setEditForm({ ...editForm, meeting_schedule: e.target.value })}
                      placeholder="e.g. Thursdays, 6pm"
                      className="h-11 sm:h-10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-group-location">Location</Label>
                    <Input
                      id="edit-group-location"
                      value={editForm.meeting_location}
                      onChange={(e) => setEditForm({ ...editForm, meeting_location: e.target.value })}
                      className="h-11 sm:h-10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-group-capacity">Capacity</Label>
                    <Input
                      id="edit-group-capacity"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      value={editForm.max_members}
                      onChange={(e) => setEditForm({ ...editForm, max_members: e.target.value })}
                      placeholder="No limit"
                      className="h-11 sm:h-10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-group-status">Status</Label>
                    <Select
                      value={editForm.is_active ? 'active' : 'inactive'}
                      onValueChange={(value) => setEditForm({ ...editForm, is_active: value === 'active' })}
                    >
                      <SelectTrigger id="edit-group-status" className="h-11 sm:h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ) : null}
            <DialogFooter className="gap-2">
              <Button variant="outline" className="h-11 sm:h-10" onClick={() => setEditForm(null)} disabled={savingEdit}>
                Cancel
              </Button>
              <Button className="h-11 sm:h-10" onClick={saveGroupEdit} disabled={savingEdit || !editForm?.name.trim()}>
                {savingEdit ? 'Saving…' : 'Save changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Member Dialog */}
        <Dialog
          open={showAddMember}
          onOpenChange={(open) => {
            setShowAddMember(open)
            if (!open) {
              setSelectedMemberId('')
              setSelectedRole('member')
            }
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add member to group</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="member-select">Member</Label>
                <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                  <SelectTrigger id="member-select" className="h-11 sm:h-10">
                    <SelectValue placeholder="Choose a member" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMembers.length === 0 ? (
                      <SelectItem value="no-members" disabled>No available members</SelectItem>
                    ) : (
                      availableMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          <div>
                            <p className="font-medium">{member.full_name}</p>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                              <span className="font-mono">{member.membership_id}</span> · {member.role}
                            </p>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="role-select">Role</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger id="role-select" className="h-11 sm:h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GROUP_MEMBERSHIP_ROLES.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                className="h-11 sm:h-10"
                onClick={() => {
                  setShowAddMember(false)
                  setSelectedMemberId('')
                  setSelectedRole('member')
                }}
              >
                Cancel
              </Button>
              <Button
                className="h-11 sm:h-10"
                onClick={addMemberToGroup}
                disabled={!selectedMemberId || selectedMemberId === 'no-members'}
              >
                Add member
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
