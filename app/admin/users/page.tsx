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
  UserPlus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Eye, 
  Users, 
  UserCheck, 
  UserX,
  Mail,
  Phone,
  Calendar,
  Shield,
  Crown,
  User
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAllUsers, useCreateUser, useUpdateUser, useDeleteUser } from '@/lib/hooks/use-data'
import { useAuth } from '@/components/providers'
import { AppUser } from '@/lib/types'

export default function UsersManagementPage() {
  const { user: currentUser } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  
  // State management
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingUser, setEditingUser] = useState<AppUser | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  
  // Form state for creating/editing users
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    role: 'member' as 'admin' | 'pastor' | 'elder' | 'finance_officer' | 'member' | 'visitor',
    membership_id: '',
    join_year: new Date().getFullYear(),
    marital_status: '' as 'single' | 'married' | 'divorced' | 'widowed' | 'separated' | '',
    occupation: '',
    place_of_work: '',
    address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relation: ''
  })

  // Data hooks
  const { data: users, loading, error, refetch } = useAllUsers()
  const { createUser, loading: creating } = useCreateUser()
  const { updateUser, loading: updating } = useUpdateUser()
  const { deleteUser, loading: deleting } = useDeleteUser()

  // Filter and search users (must run before any early return — same order every render)
  const filteredUsers = useMemo(() => {
    if (!users) return []
    
    return users.filter(user => {
      const matchesSearch = searchTerm === '' || 
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phone?.includes(searchTerm) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.membership_id?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesRole = roleFilter === 'all' || user.role === roleFilter
      const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' ? true : false) // Simplified for now
      
      return matchesSearch && matchesRole && matchesStatus
    })
  }, [users, searchTerm, roleFilter, statusFilter])

  // Get unique roles for filter
  const uniqueRoles = useMemo(() => {
    if (!users) return []
    const roles = users.map(u => u.role).filter(Boolean)
    return Array.from(new Set(roles))
  }, [users])

  // Statistics
  const stats = useMemo(() => {
    if (!users) return { total: 0, admins: 0, members: 0, pastors: 0, elders: 0 }
    
    return {
      total: users.length,
      admins: users.filter(u => u.role === 'admin').length,
      members: users.filter(u => u.role === 'member').length,
      pastors: users.filter(u => u.role === 'pastor').length,
      elders: users.filter(u => u.role === 'elder').length
    }
  }, [users])

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
  const handleCreateUser = async () => {
    try {
      const result = await createUser({
        ...formData,
        role: formData.role as 'admin' | 'pastor' | 'elder' | 'finance_officer' | 'member' | 'visitor',
        marital_status: formData.marital_status || undefined
      })
      if (result) {
        toast({
          title: "User Created",
          description: `${formData.full_name} has been successfully created.`,
          variant: "default"
        })
        setShowCreateDialog(false)
        resetForm()
        refetch()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create user. Please try again.",
        variant: "destructive"
      })
    }
  }

  const handleUpdateUser = async () => {
    if (!editingUser) return
    
    try {
      const result = await updateUser(editingUser.id, {
        ...formData,
        role: formData.role as 'admin' | 'pastor' | 'elder' | 'finance_officer' | 'member' | 'visitor',
        marital_status: formData.marital_status || undefined
      })
      if (result) {
        toast({
          title: "User Updated",
          description: `${formData.full_name} has been successfully updated.`,
          variant: "default"
        })
        setShowEditDialog(false)
        setEditingUser(null)
        resetForm()
        refetch()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update user. Please try again.",
        variant: "destructive"
      })
    }
  }

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`)) {
      return
    }
    
    try {
      const result = await deleteUser(userId)
      if (result) {
        toast({
          title: "User Deleted",
          description: `${userName} has been successfully deleted.`,
          variant: "default"
        })
        refetch()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete user. Please try again.",
        variant: "destructive"
      })
    }
  }

  const resetForm = () => {
    setFormData({
      full_name: '',
      phone: '',
      email: '',
      role: 'member',
      membership_id: '',
      join_year: new Date().getFullYear(),
      marital_status: '',
      occupation: '',
      place_of_work: '',
      address: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      emergency_contact_relation: ''
    })
  }

  const openEditDialog = (user: AppUser) => {
    setEditingUser(user)
    setFormData({
      full_name: user.full_name || '',
      phone: user.phone || '',
      email: user.email || '',
      role: user.role || 'member',
      membership_id: user.membership_id || '',
      join_year: user.join_year || new Date().getFullYear(),
      marital_status: user.marital_status || '',
      occupation: user.occupation || '',
      place_of_work: user.place_of_work || '',
      address: '',
      emergency_contact_name: user.emergency_contact_name || '',
      emergency_contact_phone: user.emergency_contact_phone || '',
      emergency_contact_relation: user.emergency_contact_relation || ''
    })
    setShowEditDialog(true)
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Crown className="h-4 w-4" />
      case 'pastor': return <Shield className="h-4 w-4" />
      case 'elder': return <UserCheck className="h-4 w-4" />
      default: return <User className="h-4 w-4" />
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800'
      case 'pastor': return 'bg-purple-100 text-purple-800'
      case 'elder': return 'bg-yellow-100 text-yellow-800'
      case 'member': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading users...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <UserX className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Users</h2>
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
              <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
              <p className="text-gray-600 mt-2">Manage church members and their roles</p>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New User</DialogTitle>
                  <DialogDescription>
                    Add a new member to the church management system.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="full_name">Full Name *</Label>
                      <Input
                        id="full_name"
                        value={formData.full_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                        placeholder="Enter full name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="Enter phone number"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="Enter email address"
                      />
                    </div>
                    <div>
                      <Label htmlFor="role">Role *</Label>
                      <Select value={formData.role} onValueChange={(value) => setFormData(prev => ({ ...prev, role: value as 'admin' | 'pastor' | 'elder' | 'finance_officer' | 'member' | 'visitor' }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="elder">Elder</SelectItem>
                          <SelectItem value="pastor">Pastor</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="membership_id">Membership ID</Label>
                      <Input
                        id="membership_id"
                        value={formData.membership_id}
                        onChange={(e) => setFormData(prev => ({ ...prev, membership_id: e.target.value }))}
                        placeholder="Auto-generated if empty"
                      />
                    </div>
                    <div>
                      <Label htmlFor="join_year">Join Year</Label>
                      <Input
                        id="join_year"
                        type="number"
                        value={formData.join_year}
                        onChange={(e) => setFormData(prev => ({ ...prev, join_year: parseInt(e.target.value) }))}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="Enter address"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="occupation">Occupation</Label>
                      <Input
                        id="occupation"
                        value={formData.occupation}
                        onChange={(e) => setFormData(prev => ({ ...prev, occupation: e.target.value }))}
                        placeholder="Enter occupation"
                      />
                    </div>
                    <div>
                      <Label htmlFor="place_of_work">Place of Work</Label>
                      <Input
                        id="place_of_work"
                        value={formData.place_of_work}
                        onChange={(e) => setFormData(prev => ({ ...prev, place_of_work: e.target.value }))}
                        placeholder="Enter place of work"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateUser} disabled={creating}>
                      {creating ? 'Creating...' : 'Create User'}
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
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Crown className="h-8 w-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Admins</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.admins}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Shield className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pastors</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.pastors}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <UserCheck className="h-8 w-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Elders</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.elders}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <User className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Members</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.members}</p>
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
                    placeholder="Search users by name, phone, email, or membership ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {uniqueRoles.map(role => (
                      <SelectItem key={role} value={role}>
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users List */}
        <Card>
          <CardHeader>
            <CardTitle>Users ({filteredUsers.length})</CardTitle>
            <CardDescription>
              Manage church members and their roles
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <UserX className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
                <p className="text-gray-600">Try adjusting your search or filters.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        {getRoleIcon(user.role)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-medium text-gray-900">{user.full_name}</h3>
                          <Badge className={getRoleColor(user.role)}>
                            {user.role}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          {user.phone && (
                            <span className="flex items-center">
                              <Phone className="h-3 w-3 mr-1" />
                              {user.phone}
                            </span>
                          )}
                          {user.email && (
                            <span className="flex items-center">
                              <Mail className="h-3 w-3 mr-1" />
                              {user.email}
                            </span>
                          )}
                          {user.membership_id && (
                            <span className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              {user.membership_id}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/members/${user.id}`)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(user)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteUser(user.id, user.full_name || 'User')}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit User Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Update user information and role.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit_full_name">Full Name *</Label>
                  <Input
                    id="edit_full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                    placeholder="Enter full name"
                  />
                </div>
                <div>
                  <Label htmlFor="edit_phone">Phone Number *</Label>
                  <Input
                    id="edit_phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Enter phone number"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit_email">Email</Label>
                  <Input
                    id="edit_email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter email address"
                  />
                </div>
                <div>
                  <Label htmlFor="edit_role">Role *</Label>
                  <Select value={formData.role} onValueChange={(value) => setFormData(prev => ({ ...prev, role: value as 'admin' | 'pastor' | 'elder' | 'finance_officer' | 'member' | 'visitor' }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="elder">Elder</SelectItem>
                      <SelectItem value="pastor">Pastor</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateUser} disabled={updating}>
                  {updating ? 'Updating...' : 'Update User'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
    </div>
  )
}
