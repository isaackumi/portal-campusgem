'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/components/providers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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

  const getRoleColor = (role: GroupMembership['role']) => {
    switch (role) {
      case 'leader': return 'bg-yellow-100 text-yellow-800'
      case 'co_leader': return 'bg-slate-100 text-slate-700'
      case 'executive': return 'bg-purple-100 text-purple-800'
      case 'volunteer': return 'bg-orange-100 text-orange-800'
      case 'member': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
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
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-6">
                <div className="h-64 bg-gray-200 rounded"></div>
                <div className="h-96 bg-gray-200 rounded"></div>
              </div>
              <div className="space-y-6">
                <div className="h-48 bg-gray-200 rounded"></div>
                <div className="h-32 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (!group) {
    return (
      <DashboardLayout>
        <div className="py-12 text-center">
          <h2 className="text-lg font-semibold text-slate-900">Group not found</h2>
          <p className="mt-2 text-sm text-muted-foreground">This group may have been removed or the link is invalid.</p>
          <Button className="mt-4" onClick={() => router.push('/groups')}>
            Back to Groups
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center mb-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => router.push('/groups')}
                className="mr-3 text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Groups
              </Button>
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              {group.name}
            </h1>
            <div className="flex items-center space-x-4">
              <Badge className="bg-slate-100 text-slate-700 capitalize">
                {group.group_type.replace('_', ' ')}
              </Badge>
              <span className="text-slate-600">
                {members.length} member{members.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Edit Group
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="members" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="members">Members</TabsTrigger>
                <TabsTrigger value="messages">Messages</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              {/* Members Tab */}
              <TabsContent value="members" className="space-y-6">
                {/* Members Header */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center">
                        <Users className="h-5 w-5 mr-2" />
                        Group Members
                      </CardTitle>
                      <Button 
                        onClick={() => setShowAddMember(true)}
                        className=""
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add Member
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Search and Filters */}
                    <div className="flex flex-col md:flex-row gap-4 mb-6">
                      <div className="flex-1">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            placeholder="Search members..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>
                      <div>
                        <Select value={roleFilter} onValueChange={setRoleFilter}>
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Roles</SelectItem>
                            {GROUP_MEMBERSHIP_ROLES.map((item) => (
                              <SelectItem key={item.value} value={item.value}>
                                {item.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Members List */}
                    <div className="space-y-3">
                      {membersLoading ? (
                        <p className="py-6 text-center text-sm text-muted-foreground">Loading members…</p>
                      ) : null}
                      {filteredMembers.map((groupMember) => (
                        <div
                          key={groupMember.id}
                          className="flex flex-col gap-3 rounded-lg bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100">
                              <Users className="h-5 w-5 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-medium text-slate-900">
                                {memberDisplayName(groupMember)}
                              </p>
                              <p className="text-sm text-slate-500">{memberMembershipId(groupMember)}</p>
                              {groupMember.member?.user?.phone ? (
                                <p className="text-xs text-slate-500">{groupMember.member.user.phone}</p>
                              ) : null}
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                            <Badge className={`${getRoleColor(groupMember.role)} flex items-center gap-1 capitalize`}>
                              {getRoleIcon(groupMember.role)}
                              {GROUP_MEMBERSHIP_ROLE_LABELS[groupMember.role]}
                            </Badge>
                            <div className="flex items-center gap-2">
                              <Label htmlFor={`role-${groupMember.id}`} className="sr-only">
                                Change role
                              </Label>
                              <Select
                                value={groupMember.role}
                                onValueChange={(value) => updateMemberRole(groupMember.id, value)}
                              >
                                <SelectTrigger id={`role-${groupMember.id}`} className="w-36 bg-white">
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
                                onClick={() =>
                                  removeMemberFromGroup(groupMember.id, memberDisplayName(groupMember))
                                }
                                className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                                aria-label={`Remove ${memberDisplayName(groupMember)} from group`}
                              >
                                <UserMinus className="mr-1 h-4 w-4" />
                                Remove
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {filteredMembers.length === 0 && !membersLoading && (
                      <div className="text-center py-8">
                        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-slate-500">No members found</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Messages Tab */}
              <TabsContent value="messages" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <MessageSquare className="h-5 w-5 mr-2" />
                      Send Group Message
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="message">Message</Label>
                      <textarea
                        id="message"
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        placeholder="Type your message here..."
                        className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900"
                        rows={4}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-slate-600">
                        Message will be sent to {members.length} member{members.length !== 1 ? 's' : ''}
                      </p>
                      <Button 
                        onClick={sendGroupMessage}
                        disabled={!messageText.trim()}
                        className=""
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Send Message
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Settings Tab */}
              <TabsContent value="settings" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Settings className="h-5 w-5 mr-2" />
                      Group Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Group Type</Label>
                        <p className="text-sm text-slate-600 capitalize">{group.group_type.replace('_', ' ')}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Max Members</Label>
                        <p className="text-sm text-slate-600">{group.max_members || 'Unlimited'}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Status</Label>
                        <p className="text-sm text-slate-600">{group.is_active ? 'Active' : 'Inactive'}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Created</Label>
                        <p className="text-sm text-slate-600">{new Date(group.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Group Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Eye className="h-5 w-5 mr-2" />
                  Group Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {group.description && (
                  <div>
                    <Label className="text-sm font-medium">Description</Label>
                    <p className="text-sm text-slate-600 mt-1">{group.description}</p>
                  </div>
                )}

                {group.meeting_schedule && (
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium">Meeting Schedule</p>
                      <p className="text-sm text-slate-600">{group.meeting_schedule}</p>
                    </div>
                  </div>
                )}

                {group.meeting_location && (
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium">Location</p>
                      <p className="text-sm text-slate-600">{group.meeting_location}</p>
                    </div>
                  </div>
                )}

              </CardContent>
            </Card>

            {/* Leadership */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Crown className="h-5 w-5 mr-2" />
                  Leadership
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {group.leader && (
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                      <Crown className="h-4 w-4 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{group.leader.full_name}</p>
                      <p className="text-xs text-slate-500">Leader</p>
                    </div>
                  </div>
                )}

                {group.co_leader && (
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                      <Star className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{group.co_leader.full_name}</p>
                      <p className="text-xs text-slate-500">Co-Leader</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setShowAddMember(true)}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Member
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Send Message
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Event
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Download className="h-4 w-4 mr-2" />
                  Export Members
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Add Member Modal */}
        {showAddMember && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Add Member to Group</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="member-select">Select Member</Label>
                  <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                    <SelectTrigger>
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
                            <p className="text-xs text-slate-500">{member.membership_id} • {member.role}</p>
                          </div>
                        </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="role-select">Role</Label>
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger>
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
                <div className="flex justify-end space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAddMember(false)
                      setSelectedMemberId('')
                      setSelectedRole('member')
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={addMemberToGroup}
                    disabled={!selectedMemberId || selectedMemberId === 'no-members'}
                    className=""
                  >
                    Add Member
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
    </DashboardLayout>
  )
}
