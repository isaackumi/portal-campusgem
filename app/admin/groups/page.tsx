'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Eye, 
  Users, 
  Calendar,
  MapPin,
  Shield,
  Crown,
  User,
  UserPlus,
  UserMinus,
  Settings
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useGroups, useCreateGroup, useUpdateGroup, useDeleteGroup, useAllUsers, useAddUserToGroup, useRemoveUserFromGroup } from '@/lib/hooks/use-data'
import { useAuth } from '@/components/providers'
import { Group, AppUser } from '@/lib/types'

export default function GroupsManagementPage() {
  const { user: currentUser } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  
  // State management
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingGroup, setEditingGroup] = useState<Group | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [showMembersDialog, setShowMembersDialog] = useState(false)
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false)
  
  // Form state for creating/editing groups
  const [formData, setFormData] = useState<{
    name: string
    description: string
    group_type: 'ministry' | 'fellowship' | 'age_group' | 'special_interest' | 'leadership'
    meeting_location: string
    meeting_schedule: string
    is_active: boolean
    max_members: number | undefined
  }>({
    name: '',
    description: '',
    group_type: 'ministry',
    meeting_location: '',
    meeting_schedule: '',
    is_active: true,
    max_members: undefined
  })

  // Data hooks
  const { data: groups, loading, error, refetch } = useGroups(1, 100)
  const { data: users } = useAllUsers()
  const { createGroup, loading: creating } = useCreateGroup()
  const { updateGroup, loading: updating } = useUpdateGroup()
  const { deleteGroup, loading: deleting } = useDeleteGroup()
  const { addUserToGroup, loading: addingMember } = useAddUserToGroup()
  const { removeUserFromGroup, loading: removingMember } = useRemoveUserFromGroup()

  const filteredGroups = useMemo(() => {
    if (!groups) return []
    
    return groups.filter(group => {
      const matchesSearch = searchTerm === '' || 
        group.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.meeting_location?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesType = typeFilter === 'all' || group.group_type === typeFilter
      
      return matchesSearch && matchesType
    })
  }, [groups, searchTerm, typeFilter])

  const uniqueTypes = useMemo(() => {
    if (!groups) return []
    const types = groups.map(g => g.group_type).filter(Boolean)
    return Array.from(new Set(types))
  }, [groups])

  const stats = useMemo(() => {
    if (!groups) return { total: 0, ministries: 0, fellowships: 0, age_groups: 0, other: 0 }
    
    return {
      total: groups.length,
      ministries: groups.filter(g => g.group_type === 'ministry').length,
      fellowships: groups.filter(g => g.group_type === 'fellowship').length,
      age_groups: groups.filter(g => g.group_type === 'age_group').length,
      other: groups.filter(g => !['ministry', 'fellowship', 'age_group'].includes(g.group_type || '')).length
    }
  }, [groups])

  if (currentUser?.role !== 'admin') {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-4">You don't have permission to access this page.</p>
            <Button onClick={() => router.push('/dashboard')}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Handlers
  const handleCreateGroup = async () => {
    try {
      const result = await createGroup(formData)
      if (result) {
        toast({
          title: "Group Created",
          description: `${formData.name} has been successfully created.`,
          variant: "default"
        })
        setShowCreateDialog(false)
        resetForm()
        refetch()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create group. Please try again.",
        variant: "destructive"
      })
    }
  }

  const handleUpdateGroup = async () => {
    if (!editingGroup) return
    
    try {
      const result = await updateGroup(editingGroup.id, formData)
      if (result) {
        toast({
          title: "Group Updated",
          description: `${formData.name} has been successfully updated.`,
          variant: "default"
        })
        setShowEditDialog(false)
        setEditingGroup(null)
        resetForm()
        refetch()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update group. Please try again.",
        variant: "destructive"
      })
    }
  }

  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    if (!confirm(`Are you sure you want to delete ${groupName}? This action cannot be undone.`)) {
      return
    }
    
    try {
      const result = await deleteGroup(groupId)
      if (result) {
        toast({
          title: "Group Deleted",
          description: `${groupName} has been successfully deleted.`,
          variant: "default"
        })
        refetch()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete group. Please try again.",
        variant: "destructive"
      })
    }
  }

  const handleAddMemberToGroup = async (userId: string, role: string = 'member') => {
    if (!selectedGroup) return
    
    try {
      const result = await addUserToGroup(selectedGroup.id, userId, role)
      if (result) {
        toast({
          title: "Member Added",
          description: "Member has been successfully added to the group.",
          variant: "default"
        })
        setShowAddMemberDialog(false)
        refetch()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add member to group. Please try again.",
        variant: "destructive"
      })
    }
  }

  const handleRemoveMemberFromGroup = async (userId: string, userName: string) => {
    if (!selectedGroup) return
    
    if (!confirm(`Are you sure you want to remove ${userName} from this group?`)) {
      return
    }
    
    try {
      const result = await removeUserFromGroup(selectedGroup.id, userId)
      if (result) {
        toast({
          title: "Member Removed",
          description: `${userName} has been successfully removed from the group.`,
          variant: "default"
        })
        refetch()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove member from group. Please try again.",
        variant: "destructive"
      })
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      group_type: 'ministry' as const,
      meeting_location: '',
      meeting_schedule: '',
      is_active: true,
      max_members: undefined
    })
  }

  const openEditDialog = (group: Group) => {
    setEditingGroup(group)
    setFormData({
      name: group.name || '',
      description: group.description || '',
      group_type: group.group_type || 'ministry',
      meeting_location: group.meeting_location || '',
      meeting_schedule: group.meeting_schedule || '',
      is_active: group.is_active,
      max_members: group.max_members
    })
    setShowEditDialog(true)
  }

  const openMembersDialog = (group: Group) => {
    setSelectedGroup(group)
    setShowMembersDialog(true)
  }

  const getGroupTypeIcon = (type: string) => {
    switch (type) {
      case 'ministry': return <Users className="h-4 w-4" />
      case 'department': return <Settings className="h-4 w-4" />
      case 'committee': return <Shield className="h-4 w-4" />
      default: return <Users className="h-4 w-4" />
    }
  }

  const getGroupTypeColor = (type: string) => {
    switch (type) {
      case 'ministry': return 'bg-blue-100 text-blue-800'
      case 'department': return 'bg-green-100 text-green-800'
      case 'committee': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading groups...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Users className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Groups</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => refetch()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Group Management</h1>
              <p className="text-gray-600 mt-2">Manage church groups, ministries, and departments</p>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Group
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Group</DialogTitle>
                  <DialogDescription>
                    Add a new group, ministry, or department to the church.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Group Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter group name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="group_type">Group Type *</Label>
                      <Select value={formData.group_type} onValueChange={(value) => setFormData(prev => ({ ...prev, group_type: value as 'ministry' | 'fellowship' | 'age_group' | 'special_interest' | 'leadership' }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ministry">Ministry</SelectItem>
                          <SelectItem value="department">Department</SelectItem>
                          <SelectItem value="committee">Committee</SelectItem>
                          <SelectItem value="fellowship">Fellowship</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Enter group description"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="meeting_location"
                        value={formData.meeting_location}
                        onChange={(e) => setFormData(prev => ({ ...prev, meeting_location: e.target.value }))}
                        placeholder="Meeting location"
                      />
                    </div>
                    <div>
                      <Label htmlFor="meeting_schedule">Meeting Schedule</Label>
                      <Input
                        id="meeting_schedule"
                        value={formData.meeting_schedule}
                        onChange={(e) => setFormData(prev => ({ ...prev, meeting_schedule: e.target.value }))}
                        placeholder="e.g., Every Sunday at 10:00 AM"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="max_members">Max Members</Label>
                      <Input
                        id="max_members"
                        type="number"
                        value={formData.max_members || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, max_members: e.target.value ? parseInt(e.target.value) : undefined }))}
                        placeholder="Maximum number of members"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="is_active"
                        checked={formData.is_active}
                        onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                        className="rounded"
                      />
                      <Label htmlFor="is_active">Active Group</Label>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateGroup} disabled={creating}>
                      {creating ? 'Creating...' : 'Create Group'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Groups</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Ministries</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.ministries}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Fellowships</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.fellowships}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Calendar className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Age Groups</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.age_groups}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-gray-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Other</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.other}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search groups by name, description, or location..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {uniqueTypes.map(type => (
                      <SelectItem key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Groups List */}
        <Card>
          <CardHeader>
            <CardTitle>Groups ({filteredGroups.length})</CardTitle>
            <CardDescription>
              Manage church groups, ministries, and departments
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredGroups.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No groups found</h3>
                <p className="text-gray-600">Try adjusting your search or filters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredGroups.map((group) => (
                  <Card key={group.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            {getGroupTypeIcon(group.group_type || '')}
                          </div>
                          <div>
                            <CardTitle className="text-lg">{group.name}</CardTitle>
                            <Badge className={getGroupTypeColor(group.group_type || '')}>
                              {group.group_type}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openMembersDialog(group)}
                          >
                            <Users className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(group)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteGroup(group.id, group.name || 'Group')}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {group.description && (
                        <p className="text-gray-600 text-sm mb-4">{group.description}</p>
                      )}
                      
                      <div className="space-y-2 text-sm text-gray-500">
                        {group.meeting_location && (
                          <div className="flex items-center">
                            <MapPin className="h-3 w-3 mr-2" />
                            {group.meeting_location}
                          </div>
                        )}
                        {group.meeting_schedule && (
                          <div className="flex items-center">
                            <Calendar className="h-3 w-3 mr-2" />
                            {group.meeting_schedule}
                          </div>
                        )}
                        {group.max_members && (
                          <div className="flex items-center">
                            <Users className="h-3 w-3 mr-2" />
                            Max: {group.max_members} members
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Group Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Group</DialogTitle>
              <DialogDescription>
                Update group information and settings.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit_name">Group Name *</Label>
                  <Input
                    id="edit_name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter group name"
                  />
                </div>
                <div>
                  <Label htmlFor="edit_group_type">Group Type *</Label>
                  <Select value={formData.group_type} onValueChange={(value) => setFormData(prev => ({ ...prev, group_type: value as 'ministry' | 'fellowship' | 'age_group' | 'special_interest' | 'leadership' }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ministry">Ministry</SelectItem>
                      <SelectItem value="department">Department</SelectItem>
                      <SelectItem value="committee">Committee</SelectItem>
                      <SelectItem value="fellowship">Fellowship</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="edit_description">Description</Label>
                <Textarea
                  id="edit_description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter group description"
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateGroup} disabled={updating}>
                  {updating ? 'Updating...' : 'Update Group'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Group Members Dialog */}
        <Dialog open={showMembersDialog} onOpenChange={setShowMembersDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Group Members - {selectedGroup?.name}</DialogTitle>
              <DialogDescription>
                Manage group members and their roles.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  {selectedGroup?.members?.length || 0} members
                </p>
                <Button onClick={() => setShowAddMemberDialog(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Member
                </Button>
              </div>
              
              {selectedGroup?.members && selectedGroup.members.length > 0 ? (
                <div className="space-y-2">
                  {selectedGroup.members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">{member.member?.user?.full_name || 'Unknown'}</p>
                          <p className="text-sm text-gray-500">{member.role}</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveMemberFromGroup(member.member_id, member.member?.user?.full_name || 'Member')}
                        className="text-red-600 hover:text-red-700"
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No members in this group yet.</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Member Dialog */}
        <Dialog open={showAddMemberDialog} onOpenChange={setShowAddMemberDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Member to Group</DialogTitle>
              <DialogDescription>
                Select a member to add to {selectedGroup?.name}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {users && users.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">{user.full_name}</p>
                          <p className="text-sm text-gray-500">{user.role}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleAddMemberToGroup(user.id)}
                        disabled={addingMember}
                      >
                        {addingMember ? 'Adding...' : 'Add'}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No users available.</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
    </div>
  )
}
