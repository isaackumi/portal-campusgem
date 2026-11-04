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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { PhoneLink, QuickContactButtons } from '@/components/contact/phone-link'
import { DashboardLayout } from '@/components/dashboard-layout'
import { dataService } from '@/lib/services/data-service'
import { GROUP_MEMBERSHIP_ROLES, GROUP_MEMBERSHIP_ROLE_LABELS } from '@/lib/constants/groups'
import { AppUser, Group, GroupMembership } from '@/lib/types'
import { 
  ArrowLeft,
  Users,
  Settings,
  Crown,
  Star,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Globe,
  Shield,
  UserPlus,
  UserMinus,
  Edit,
  MoreHorizontal,
  Search,
  Filter,
  Download,
  Send,
  MessageSquare,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Trash2,
  Mail as MailIcon,
  Phone as PhoneIcon
} from 'lucide-react'

type GroupMemberRow = GroupMembership & {
  member?: GroupMembership['member']
}

export default function GroupDetailsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()

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
  const [messageText, setMessageText] = useState('')

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

  const sendGroupMessage = async () => {
    if (!messageText.trim() || !groupId) return

    try {
      // This would integrate with your SMS system
      // For now, we'll just show a success message
      alert(`Message sent to ${members.length} group members!`)
      setMessageText('')
    } catch (error) {
      console.error('Error sending message:', error)
      alert('Failed to send message. Please try again.')
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
            <Button className="h-11 flex-1 sm:h-10 sm:flex-none" onClick={() => setShowAddMember(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add member
            </Button>
            <Button variant="outline" className="h-11 flex-1 sm:h-10 sm:flex-none">
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-11 w-11 shrink-0 p-0 sm:h-10 sm:w-10" aria-label="More actions">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem className="min-h-11 gap-2">
                  <Download className="h-4 w-4" />
                  Export members
                </DropdownMenuItem>
                <DropdownMenuItem className="min-h-11 gap-2">
                  <Calendar className="h-4 w-4" />
                  Schedule event
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
              <ScrollableTabsList>
                <TabsTrigger value="members">Members</TabsTrigger>
                <TabsTrigger value="messages">Messages</TabsTrigger>
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
                              <Badge variant={groupRoleTone(groupMember.role)} className="hidden capitalize sm:inline-flex">
                                {getRoleIcon(groupMember.role)}
                                {GROUP_MEMBERSHIP_ROLE_LABELS[groupMember.role]}
                              </Badge>
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

              {/* Messages Tab */}
              <TabsContent value="messages" className="mt-4 space-y-6">
                <Card>
                  <CardHeader className="p-4 pb-3 sm:p-6 sm:pb-3">
                    <CardTitle className="app-section-title flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                      Send group message
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
                    <div>
                      <Label htmlFor="message">Message</Label>
                      <textarea
                        id="message"
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        placeholder="Type your message here..."
                        className="mt-1.5 w-full rounded-xl border border-neutral-200 bg-white p-3 text-base text-neutral-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 sm:text-sm"
                        rows={4}
                      />
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        Goes to {members.length} member{members.length !== 1 ? 's' : ''}
                      </p>
                      <Button
                        onClick={sendGroupMessage}
                        disabled={!messageText.trim()}
                        className="h-11 w-full sm:h-10 sm:w-auto"
                      >
                        <Send className="mr-2 h-4 w-4" />
                        Send message
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

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
