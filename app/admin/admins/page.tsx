'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { 
  UserPlus, 
  Search, 
  Shield,
  Users,
  Mail,
  Phone,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAllUsers, useCreateUser, useUpdateUser } from '@/lib/hooks/use-data'
import { useAuth } from '@/components/providers'
import { AppUser } from '@/lib/types'
import { LoadingSpinner } from '@/components/ui/loading'

export default function AdminManagementPage() {
  const { user: currentUser } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  
  // State management
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingAdmin, setEditingAdmin] = useState<AppUser | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  
  // Form state for creating/editing admins
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    membership_id: '',
    join_year: new Date().getFullYear(),
  })

  // Data hooks
  const { data: allUsers, loading, error, refetch } = useAllUsers()
  const { createUser, loading: creating } = useCreateUser()
  const { updateUser, loading: updating } = useUpdateUser()

  // Filter to only admin users
  const adminUsers = useMemo(() => {
    if (!allUsers) return []
    return allUsers.filter(user => user.role === 'admin')
  }, [allUsers])

  // Filter and search admins
  const filteredAdmins = useMemo(() => {
    if (!adminUsers) return []
    
    return adminUsers.filter(admin => {
      const matchesSearch = searchTerm === '' || 
        admin.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        admin.phone?.includes(searchTerm) ||
        admin.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        admin.membership_id?.toLowerCase().includes(searchTerm.toLowerCase())
      
      return matchesSearch
    })
  }, [adminUsers, searchTerm])

  const stats = useMemo(() => {
    return {
      total: adminUsers.length,
      active: adminUsers.filter(a => true).length, // All admins are considered active
    }
  }, [adminUsers])

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Access Denied</h2>
            <p className="text-slate-600 mb-4">You must be an administrator to access this page.</p>
            <Button onClick={() => router.push('/dashboard')}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Handlers
  const handleCreateAdmin = async () => {
    if (!formData.full_name || !formData.phone) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Full name and phone number are required.',
      })
      return
    }

    try {
      const result = await createUser({
        ...formData,
        role: 'admin' as const, // Force admin role
        membership_id: formData.membership_id || undefined,
      })

      if (!result) {
        throw new Error('Failed to create admin')
      }

      toast({
        title: 'Admin Created',
        description: `${formData.full_name} has been created as an administrator.`,
      })

      // Reset form
      setFormData({
        full_name: '',
        phone: '',
        email: '',
        membership_id: '',
        join_year: new Date().getFullYear(),
      })
      setShowCreateDialog(false)
      refetch()
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error Creating Admin',
        description: error.message || 'Failed to create administrator.',
      })
    }
  }

  const handleEditAdmin = async () => {
    if (!editingAdmin) return

    if (!formData.full_name || !formData.phone) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Full name and phone number are required.',
      })
      return
    }

    try {
      const result = await updateUser(editingAdmin.id, {
        full_name: formData.full_name,
        phone: formData.phone,
        email: formData.email || undefined,
        membership_id: formData.membership_id || undefined,
        join_year: formData.join_year,
        // Keep role as admin - cannot change
      })

      if (!result) {
        throw new Error('Failed to update admin')
      }

      toast({
        title: 'Admin Updated',
        description: `${formData.full_name} has been updated.`,
      })

      setShowEditDialog(false)
      setEditingAdmin(null)
      refetch()
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error Updating Admin',
        description: error.message || 'Failed to update administrator.',
      })
    }
  }

  const openEditDialog = (admin: AppUser) => {
    setEditingAdmin(admin)
    setFormData({
      full_name: admin.full_name,
      phone: admin.phone || '',
      email: admin.email || '',
      membership_id: admin.membership_id,
      join_year: admin.join_year,
    })
    setShowEditDialog(true)
  }

  const resetForm = () => {
    setFormData({
      full_name: '',
      phone: '',
      email: '',
      membership_id: '',
      join_year: new Date().getFullYear(),
    })
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Admin Management</h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage system administrators. Only admins can access this page.
            </p>
          </div>
          <Button onClick={() => { resetForm(); setShowCreateDialog(true) }}>
            <UserPlus className="mr-2 h-4 w-4" />
            Create Admin
          </Button>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Administrators</CardDescription>
              <CardTitle className="text-3xl">{stats.total}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-slate-500">
                Active: {stats.active}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Security Notice</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-start space-x-2">
                <Shield className="h-5 w-5 text-primary mt-0.5" />
                <div className="text-sm text-slate-600">
                  Admin users have full system access. Only create admins you trust.
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Administrators</CardTitle>
            <CardDescription>View and manage system administrators</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by name, phone, email, or membership ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-900">Error Loading Admins</p>
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              )}

              {/* Admin List */}
              <div className="space-y-2">
                {filteredAdmins.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>No administrators found.</p>
                    {searchTerm && (
                      <p className="text-sm mt-2">Try adjusting your search terms.</p>
                    )}
                  </div>
                ) : (
                  filteredAdmins.map((admin) => (
                    <Card key={admin.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                              <Shield className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <h3 className="font-semibold text-slate-900">{admin.full_name}</h3>
                                <Badge variant="default" className="bg-primary">Admin</Badge>
                              </div>
                              <div className="flex items-center space-x-4 mt-1 text-sm text-slate-500">
                                {admin.phone && (
                                  <div className="flex items-center space-x-1">
                                    <Phone className="h-3 w-3" />
                                    <span>{admin.phone}</span>
                                  </div>
                                )}
                                {admin.email && (
                                  <div className="flex items-center space-x-1">
                                    <Mail className="h-3 w-3" />
                                    <span>{admin.email}</span>
                                  </div>
                                )}
                                {admin.membership_id && (
                                  <span className="font-mono text-xs">{admin.membership_id}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(admin)}
                            >
                              Edit
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Create Admin Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Administrator</DialogTitle>
              <DialogDescription>
                Create a new administrator account. This user will have full system access.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium mb-1">Security Warning</p>
                    <p>Admin users have full access to all system features. Only create administrators you trust.</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="John Doe"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="024XXXXXXX"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="john@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="membership_id">Membership ID</Label>
                  <Input
                    id="membership_id"
                    value={formData.membership_id}
                    onChange={(e) => setFormData({ ...formData, membership_id: e.target.value })}
                    placeholder="EA-2024-001"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="join_year">Join Year</Label>
                <Input
                  id="join_year"
                  type="number"
                  value={formData.join_year}
                  onChange={(e) => setFormData({ ...formData, join_year: parseInt(e.target.value) || new Date().getFullYear() })}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                  disabled={creating}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateAdmin} disabled={creating}>
                  {creating ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Creating...
                    </>
                  ) : (
                    'Create Admin'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Admin Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Administrator</DialogTitle>
              <DialogDescription>
                Update administrator information. Role cannot be changed.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_full_name">Full Name *</Label>
                  <Input
                    id="edit_full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_phone">Phone Number *</Label>
                  <Input
                    id="edit_phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_email">Email</Label>
                  <Input
                    id="edit_email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_membership_id">Membership ID</Label>
                  <Input
                    id="edit_membership_id"
                    value={formData.membership_id}
                    onChange={(e) => setFormData({ ...formData, membership_id: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_join_year">Join Year</Label>
                <Input
                  id="edit_join_year"
                  type="number"
                  value={formData.join_year}
                  onChange={(e) => setFormData({ ...formData, join_year: parseInt(e.target.value) || new Date().getFullYear() })}
                />
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-slate-600" />
                  <span className="text-sm text-slate-600">
                    Role: <strong>Administrator</strong> (cannot be changed)
                  </span>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowEditDialog(false)}
                  disabled={updating}
                >
                  Cancel
                </Button>
                <Button onClick={handleEditAdmin} disabled={updating}>
                  {updating ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Updating...
                    </>
                  ) : (
                    'Update Admin'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
    </div>
  )
}
