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
import { dataService } from '@/lib/services/data-service'
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

interface GroupMemberWithUser {
  id: string
  group_id: string
  member_id: string
  role: 'leader' | 'co_leader' | 'member' | 'volunteer'
  joined_date: string
  is_active: boolean
  notes?: string
  created_at: string
  member: AppUser
}

export default function GroupDetailsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()

  const [group, setGroup] = useState<Group | null>(null)
  const [members, setMembers] = useState<GroupMemberWithUser[]>([])
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
    if (user && groupId) {
      fetchGroupDetails()
      fetchGroupMembers()
      fetchAllMembers()
    }
  }, [user, groupId])

  const fetchGroupDetails = async () => {
    try {
      setLoading(true)
      const { data, error } = await dataService.getGroup(groupId)
      if (error) {
        console.error('Error fetching group:', error)
        return
      }
      setGroup(data ?? null)
    } catch (error) {
      console.error('Error fetching group:', error)
    } finally {
      setLoading(false)
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
      const withUser: GroupMemberWithUser[] = (list ?? []).map(m => ({
        id: m.id,
        group_id: m.group_id,
        member_id: m.member_id,
        role: m.role,
        joined_date: m.joined_date ?? '',
        is_active: m.is_active ?? true,
        created_at: m.created_at ?? '',
        member: allMembers.find(u => u.id === m.member_id) ?? ({ id: m.member_id, full_name: '', membership_id: '', role: 'member' } as AppUser)
      }))
      setMembers(withUser)
    } catch (error) {
      console.error('Error fetching group members:', error)
    } finally {
      setMembersLoading(false)
    }
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

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'leader': return 'bg-yellow-100 text-yellow-800'
      case 'co_leader': return 'bg-blue-100 text-blue-800'
      case 'admin': return 'bg-red-100 text-red-800'
      case 'member': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'leader': return <Crown className="h-3 w-3" />
      case 'co_leader': return <Star className="h-3 w-3" />
      case 'admin': return <Shield className="h-3 w-3" />
      default: return <Users className="h-3 w-3" />
    }
  }

  const filteredMembers = members.filter(member => {
    const matchesSearch = searchTerm === '' || 
      member.member.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.member.membership_id?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRole = roleFilter === 'all' || member.role === roleFilter
    
    return matchesSearch && matchesRole
  })

  const availableMembers = allMembers.filter(member => 
    !members.some(groupMember => groupMember.member_id === member.id)
  )

  // Show loading state
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
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

  // Show nothing while redirecting
  if (!user || !group) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center mb-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => router.push('/groups')}
                className="mr-3 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Groups
              </Button>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
              {group.name}
            </h1>
            <div className="flex items-center space-x-4">
              <Badge className="bg-blue-100 text-blue-800 capitalize">
                {group.group_type.replace('_', ' ')}
              </Badge>
              <span className="text-gray-600">
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
                        className="bg-blue-600 hover:bg-blue-700"
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
                            <SelectItem value="leader">Leaders</SelectItem>
                            <SelectItem value="co_leader">Co-Leaders</SelectItem>
                            <SelectItem value="admin">Admins</SelectItem>
                            <SelectItem value="member">Members</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Members List */}
                    <div className="space-y-3">
                      {filteredMembers.map((groupMember) => (
                        <div key={groupMember.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <Users className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{groupMember.member.full_name}</p>
                              <p className="text-sm text-gray-500">{groupMember.member.membership_id}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <Badge className={`${getRoleColor(groupMember.role)} flex items-center gap-1`}>
                              {getRoleIcon(groupMember.role)}
                              {groupMember.role.replace('_', ' ')}
                            </Badge>
                            <Select
                              value={groupMember.role}
                              onValueChange={(value) => updateMemberRole(groupMember.id, value)}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="member">Member</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="co_leader">Co-Leader</SelectItem>
                                <SelectItem value="leader">Leader</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeMemberFromGroup(groupMember.id, groupMember.member.full_name)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <UserMinus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {filteredMembers.length === 0 && (
                      <div className="text-center py-8">
                        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">No members found</p>
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
                        className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={4}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-600">
                        Message will be sent to {members.length} member{members.length !== 1 ? 's' : ''}
                      </p>
                      <Button 
                        onClick={sendGroupMessage}
                        disabled={!messageText.trim()}
                        className="bg-blue-600 hover:bg-blue-700"
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
                        <p className="text-sm text-gray-600 capitalize">{group.group_type.replace('_', ' ')}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Max Members</Label>
                        <p className="text-sm text-gray-600">{group.max_members || 'Unlimited'}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Status</Label>
                        <p className="text-sm text-gray-600">{group.is_active ? 'Active' : 'Inactive'}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Created</Label>
                        <p className="text-sm text-gray-600">{new Date(group.created_at).toLocaleDateString()}</p>
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
                    <p className="text-sm text-gray-600 mt-1">{group.description}</p>
                  </div>
                )}

                {group.meeting_schedule && (
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium">Meeting Schedule</p>
                      <p className="text-sm text-gray-600">{group.meeting_schedule}</p>
                    </div>
                  </div>
                )}

                {group.meeting_location && (
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium">Location</p>
                      <p className="text-sm text-gray-600">{group.meeting_location}</p>
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
                      <p className="text-xs text-gray-500">Leader</p>
                    </div>
                  </div>
                )}

                {group.co_leader && (
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Star className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{group.co_leader.full_name}</p>
                      <p className="text-xs text-gray-500">Co-Leader</p>
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
                            <p className="text-xs text-gray-500">{member.membership_id} • {member.role}</p>
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
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="co_leader">Co-Leader</SelectItem>
                      <SelectItem value="leader">Leader</SelectItem>
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
                    className="bg-blue-600 hover:bg-blue-700"
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
  )
}
