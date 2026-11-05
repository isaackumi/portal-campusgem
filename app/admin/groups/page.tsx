'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StatCard } from '@/components/ui/stat-card'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { PhoneLink, QuickContactButtons } from '@/components/contact/phone-link'
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
import { AccessDenied } from '@/components/auth/access-denied'
import { LoadingSpinner } from '@/components/ui/loading'
import { Group, AppUser } from '@/lib/types'
import { GROUP_MEMBERSHIP_ROLES, GROUP_TYPES, getGroupTypeLabel } from '@/lib/constants/groups'
import {
  CampusIdentityFields,
  EMPTY_CAMPUS_IDENTITY,
  campusIdentityFromGroup,
  type CampusIdentityValue,
} from '@/components/campus/campus-identity-fields'
import { setCampusIdentityAction } from '@/lib/actions/campuses'

export default function GroupsManagementPage() {
  const { user: currentUser, loading: authLoading, can } = useAuth()
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
  const [selectedMembershipRole, setSelectedMembershipRole] = useState<'leader' | 'co_leader' | 'executive' | 'member' | 'volunteer'>('member')
  
  // Form state for creating/editing groups
  const [formData, setFormData] = useState<{
    name: string
    description: string
    group_type: Group['group_type']
    meeting_location: string
    meeting_schedule: string
    is_active: boolean
    max_members: number | undefined
  }>({
    name: '',
    description: '',
    group_type: 'campus',
    meeting_location: '',
    meeting_schedule: '',
    is_active: true,
    max_members: undefined
  })

  const [campusIdentity, setCampusIdentity] = useState<CampusIdentityValue>(EMPTY_CAMPUS_IDENTITY)

  /** Campus groups: save short code / link / aliases after the group itself is saved. */
  const saveCampusIdentity = async (groupId: string) => {
    const res = await setCampusIdentityAction(groupId, campusIdentity)
    if (res.error) {
      toast({ title: 'Campus tag not saved', description: res.error, variant: 'destructive' })
    }
  }

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
    if (!groups) return { total: 0, campuses: 0, activities: 0, fellowships: 0, other: 0 }
    
    return {
      total: groups.length,
      campuses: groups.filter(g => g.group_type === 'campus').length,
      activities: groups.filter(g => g.group_type === 'activity').length,
      fellowships: groups.filter(g => g.group_type === 'fellowship').length,
      other: groups.filter(g => !['campus', 'activity', 'fellowship'].includes(g.group_type || '')).length
    }
  }, [groups])

  if (authLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (!can('groups.manage')) {
    return <AccessDenied permission="groups.manage" />
  }

  // Handlers
  const handleCreateGroup = async () => {
    try {
      const result = await createGroup(formData)
      if (result) {
        if (formData.group_type === 'campus' && result.id) await saveCampusIdentity(result.id)
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
        if (formData.group_type === 'campus') await saveCampusIdentity(editingGroup.id)
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
      group_type: 'campus' as const,
      meeting_location: '',
      meeting_schedule: '',
      is_active: true,
      max_members: undefined
    })
    setCampusIdentity(EMPTY_CAMPUS_IDENTITY)
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
    setCampusIdentity(campusIdentityFromGroup(group))
    setShowEditDialog(true)
  }

  const openMembersDialog = (group: Group) => {
    setSelectedGroup(group)
    setShowMembersDialog(true)
  }

  const getGroupTypeIcon = (type: string) => {
    switch (type) {
      case 'campus': return <Crown className="h-4 w-4" />
      case 'activity': return <Calendar className="h-4 w-4" />
      case 'ministry': return <Users className="h-4 w-4" />
      case 'leadership': return <Shield className="h-4 w-4" />
      default: return <Users className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-neutral-900 dark:border-neutral-100"></div>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">Loading groups...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Users className="mx-auto mb-4 h-12 w-12 text-red-500 dark:text-red-400" />
            <h2 className="app-section-title mb-2">Couldn&apos;t load groups</h2>
            <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-400">{error}</p>
            <Button className="h-11 sm:h-10" onClick={() => refetch()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6">
        {/* Header */}
        <div>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <h1 className="app-page-title">Group management</h1>
              <p className="app-page-description mt-2">Manage campus fellowships, event activities, and ministry groups</p>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="h-11 w-full sm:h-10 sm:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Group
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Group</DialogTitle>
                  <DialogDescription>
                    Add a new campus fellowship, activity, or ministry group.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                      <Select value={formData.group_type} onValueChange={(value) => setFormData(prev => ({ ...prev, group_type: value as Group['group_type'] }))}>
                        <SelectTrigger>
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

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                    <div className="flex min-h-11 items-center gap-3 sm:mt-6">
                      <input
                        type="checkbox"
                        id="is_active"
                        checked={formData.is_active}
                        onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                        className="h-5 w-5 rounded border-neutral-300 text-brand-600 dark:border-neutral-600 dark:bg-neutral-800"
                      />
                      <Label htmlFor="is_active">Active Group</Label>
                    </div>
                  </div>

                  {formData.group_type === 'campus' ? (
                    <CampusIdentityFields idPrefix="create" value={campusIdentity} onChange={setCampusIdentity} />
                  ) : null}

                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button variant="outline" className="h-11 sm:h-10" onClick={() => setShowCreateDialog(false)}>
                      Cancel
                    </Button>
                    <Button className="h-11 sm:h-10" onClick={handleCreateGroup} disabled={creating}>
                      {creating ? 'Creating...' : 'Create group'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-5">
          <StatCard label="Total groups" value={stats.total} />
          <StatCard label="Campuses" value={stats.campuses} />
          
          <StatCard label="Activities" value={stats.activities} />
          <StatCard label="Fellowships" value={stats.fellowships} />
          
          <StatCard label="Other" value={stats.other} className="col-span-2 md:col-span-1" />
        </div>

        {/* Search and Filters */}
        <div>
          <div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
                  <Input
                    type="search"
                    placeholder="Search name, description or location..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-11 w-full pl-10 sm:h-10"
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="h-11 w-full sm:h-10 sm:w-40" aria-label="Filter by type">
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
          </div>
        </div>

        {/* Groups List */}
        <section aria-labelledby="groups-heading">
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <h2 id="groups-heading" className="app-section-title">Groups</h2>
            <span className="text-sm tabular-nums text-neutral-500 dark:text-neutral-400">{filteredGroups.length} shown</span>
          </div>
            {filteredGroups.length === 0 ? (
              <div className="dashboard-panel py-12 text-center">
                <Users className="mx-auto mb-4 h-12 w-12 text-neutral-400 dark:text-neutral-500" />
                <h3 className="app-section-title mb-1">No groups found</h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Try adjusting your search or filters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
                {filteredGroups.map((group) => (
                  <Card key={group.id} className="flex flex-col transition-shadow hover:shadow-lg">
                    <CardHeader className="p-4 pb-3 sm:p-6 sm:pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 dark:bg-neutral-700/60 dark:text-neutral-300">
                            {getGroupTypeIcon(group.group_type || '')}
                          </div>
                          <div className="min-w-0">
                            <CardTitle className="break-words text-base font-semibold">{group.name}</CardTitle>
                            <Badge variant="secondary" className="mt-1 capitalize">
                              {getGroupTypeLabel(group.group_type)}
                            </Badge>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-10 w-10 shrink-0 p-0" aria-label={`Actions for ${group.name}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem className="min-h-11 gap-2" onSelect={() => openEditDialog(group)}>
                              <Edit className="h-4 w-4" />
                              Edit group
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="min-h-11 gap-2 text-red-600 focus:text-red-700 dark:text-red-400 dark:focus:text-red-300"
                              onSelect={() => handleDeleteGroup(group.id, group.name || 'Group')}
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete group
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-1 flex-col p-4 pt-0 sm:p-6 sm:pt-0">
                      {group.description && (
                        <p className="mb-3 line-clamp-3 text-sm text-neutral-600 dark:text-neutral-400">{group.description}</p>
                      )}
                      
                      <div className="space-y-2 text-sm text-neutral-500 dark:text-neutral-400">
                        {group.meeting_location && (
                          <div className="flex items-start gap-2">
                            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            <span className="min-w-0 break-words">{group.meeting_location}</span>
                          </div>
                        )}
                        {group.meeting_schedule && (
                          <div className="flex items-start gap-2">
                            <Calendar className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            <span className="min-w-0 break-words">{group.meeting_schedule}</span>
                          </div>
                        )}
                        {group.max_members && (
                          <div className="flex items-center gap-2">
                            <Users className="h-3.5 w-3.5 shrink-0" />
                            Max {group.max_members} members
                          </div>
                        )}
                      </div>
                      <div className="mt-auto grid grid-cols-2 gap-2 pt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-11 sm:h-9"
                          onClick={() => openMembersDialog(group)}
                        >
                          <Users className="mr-2 h-3.5 w-3.5" />
                          Members
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-11 sm:h-9"
                          onClick={() => router.push(`/admin/forms?group=${encodeURIComponent(group.id)}`)}
                        >
                          <Plus className="mr-2 h-3.5 w-3.5" />
                          Scoped form
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
        </section>

        {/* Edit Group Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Group</DialogTitle>
              <DialogDescription>
                Update group information and settings.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                  <Select value={formData.group_type} onValueChange={(value) => setFormData(prev => ({ ...prev, group_type: value as Group['group_type'] }))}>
                    <SelectTrigger>
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

              {formData.group_type === 'campus' ? (
                <CampusIdentityFields idPrefix="edit" value={campusIdentity} onChange={setCampusIdentity} />
              ) : null}

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="outline" className="h-11 sm:h-10" onClick={() => setShowEditDialog(false)}>
                  Cancel
                </Button>
                <Button className="h-11 sm:h-10" onClick={handleUpdateGroup} disabled={updating}>
                  {updating ? 'Updating...' : 'Update Group'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Group Members Dialog */}
        <Dialog open={showMembersDialog} onOpenChange={setShowMembersDialog}>
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="break-words">{selectedGroup?.name} members</DialogTitle>
              <DialogDescription>
                Manage group members and their roles.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  {selectedGroup?.members?.length || 0} members
                </p>
                <Button className="h-11 sm:h-10" onClick={() => setShowAddMemberDialog(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Member
                </Button>
              </div>
              
              {selectedGroup?.members && selectedGroup.members.length > 0 ? (
                <ul className="divide-y divide-neutral-100 rounded-lg border border-neutral-200/80 dark:divide-white/[0.06] dark:border-white/[0.08]">
                  {selectedGroup.members.map((member) => {
                    const person = member.member?.user
                    const name = person?.full_name || 'Unknown'
                    return (
                    <li key={member.id} className="flex min-h-14 items-center gap-3 px-3 py-2">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-400/10 dark:text-brand-300">
                          <User className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-neutral-900 dark:text-neutral-100">{name}</p>
                          <p className="flex flex-wrap items-center gap-x-2 text-xs capitalize text-neutral-500 dark:text-neutral-400">
                            {member.role.replace('_', ' ')}
                            {person?.phone ? (
                              <span className="normal-case">
                                <PhoneLink phone={person.phone} whatsapp={person.whatsapp} name={name} />
                              </span>
                            ) : null}
                          </p>
                        </div>
                      <QuickContactButtons phone={person?.phone} whatsapp={person?.whatsapp} name={name} />
                      <Button
                        variant="outline"
                        size="sm"
                        aria-label={`Remove ${name} from group`}
                        onClick={() => handleRemoveMemberFromGroup(member.member_id, member.member?.user?.full_name || 'Member')}
                        className="h-10 w-10 shrink-0 p-0 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 sm:h-9 sm:w-9"
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    </li>
                    )
                  })}
                </ul>
              ) : (
                <div className="text-center py-8">
                  <Users className="mx-auto mb-4 h-12 w-12 text-neutral-400 dark:text-neutral-500" />
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">No members in this group yet.</p>
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
              <div className="space-y-2">
                <Label htmlFor="membership-role">Role in this group</Label>
                <Select
                  value={selectedMembershipRole}
                  onValueChange={(value) => setSelectedMembershipRole(value as 'leader' | 'co_leader' | 'executive' | 'member' | 'volunteer')}
                >
                  <SelectTrigger id="membership-role" className="h-11 sm:h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GROUP_MEMBERSHIP_ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {users && users.length > 0 ? (
                <div className="max-h-[50vh] space-y-2 overflow-y-auto sm:max-h-60">
                  {users.map((user) => (
                    <div key={user.id} className="flex min-h-14 items-center justify-between gap-3 rounded-lg border border-neutral-200/80 p-3 hover:bg-neutral-50 dark:border-white/[0.08] dark:hover:bg-white/[0.04]">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-400/10 dark:text-brand-300">
                          <User className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-neutral-900 dark:text-neutral-100">{user.full_name}</p>
                          <p className="text-sm capitalize text-neutral-500 dark:text-neutral-400">{user.role}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="h-10 shrink-0 sm:h-9"
                        onClick={() => handleAddMemberToGroup(user.id, selectedMembershipRole)}
                        disabled={addingMember}
                      >
                        {addingMember ? 'Adding...' : 'Add'}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <User className="mx-auto mb-4 h-12 w-12 text-neutral-400 dark:text-neutral-500" />
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">No users available.</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
    </div>
  )
}
