'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StatCard } from '@/components/ui/stat-card'
import { PhoneLink, QuickContactButtons } from '@/components/contact/phone-link'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { chipLabel, roleTone } from '@/lib/ui/chip-tones'
import { PersonAvatar, displayName } from '@/components/ui/person'
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
import { promoteUserToCorporateGem } from '@/lib/actions/corporate-gem'
import { AddToRlcDialog } from '@/components/rlc/add-to-rlc-dialog'
import { useAllUsers, useCreateUser, useDeleteUser } from '@/lib/hooks/use-data'
import { useAuth } from '@/components/providers'
import { AccessDenied } from '@/components/auth/access-denied'
import { LoadingSpinner } from '@/components/ui/loading'
import { AppUser } from '@/lib/types'
import { dataService } from '@/lib/services/data-service'
import { EditUserDialog } from '@/components/users/edit-user-dialog'

export default function UsersManagementPage() {
  const { loading: authLoading, can } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  
  // State management
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [promotingUserId, setPromotingUserId] = useState<string | null>(null)
  const [rlcUser, setRlcUser] = useState<AppUser | null>(null)
  const [rlcMemberId, setRlcMemberId] = useState<string | undefined>()
  const [rlcExistingRoles, setRlcExistingRoles] = useState<string[]>([])
  
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
    emergency_contact_relation: '',
    member_id: '',
    dob_month: '',
    dob_day: '',
    dob_year: ''
  })

  // Data hooks
  const { data: users, loading, error, refetch } = useAllUsers()
  const { createUser, loading: creating } = useCreateUser()
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

  if (authLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (!can('users.manage')) {
    return <AccessDenied permission="users.manage" />
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
      emergency_contact_relation: '',
      member_id: '',
      dob_month: '',
      dob_day: '',
      dob_year: ''
    })
  }

  async function handleViewUser(user: AppUser) {
    const memberRes = await dataService.getMemberByUserId(user.id)
    if (memberRes.data?.id) {
      router.push(`/members/${memberRes.data.id}`)
      return
    }
    router.push(`/admin/users/${user.id}`)
  }

  function openAddToRlc(user: AppUser) {
    setRlcUser(user)
    setRlcMemberId(undefined)
    setRlcExistingRoles([])
    void dataService.getMemberByUserId(user.id).then((memberRes) => {
      setRlcMemberId(memberRes.data?.id)
      setRlcExistingRoles(memberRes.data?.rlc_roles ?? [])
    })
  }

  async function handlePromoteToCorporateGem(user: AppUser) {
    setPromotingUserId(user.id)
    const { data, group, error } = await promoteUserToCorporateGem(user.id)
    setPromotingUserId(null)
    if (error || !data) {
      toast({ variant: 'destructive', title: 'Promotion failed', description: error ?? 'Could not add to Corporate Gem' })
      return
    }
    toast({
      title: 'Added to Corporate Gem',
      description: `${user.full_name} is now in ${group?.name ?? 'Corporate Gem'} as ${data.role}.`,
    })
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="dashboard-panel w-full max-w-md p-6 text-center">
          <UserX className="mx-auto mb-4 h-12 w-12 text-red-500 dark:text-red-400" />
          <h2 className="app-section-title mb-2">Couldn&apos;t load users</h2>
          <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-400">{error}</p>
          <Button onClick={() => refetch()} className="h-11 w-full sm:h-10 sm:w-auto">
            Try again
          </Button>
        </div>
      </div>
    )
  }

  const createField = 'h-11 sm:h-10'

  return (
    <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="app-page-title">Users</h1>
            <p className="app-page-description mt-1">Manage church members and their roles</p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="h-11 w-full sm:h-10 sm:w-auto">
                <UserPlus className="mr-2 h-4 w-4" />
                Add user
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create new user</DialogTitle>
                <DialogDescription>
                  Add a new member to the church management system.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="full_name">Full name *</Label>
                    <Input
                      id="full_name"
                      className={createField}
                      value={formData.full_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                      placeholder="Enter full name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Phone number *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      inputMode="tel"
                      className={createField}
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="Enter phone number"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      inputMode="email"
                      className={createField}
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Enter email address"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="role">Role *</Label>
                    <Select value={formData.role} onValueChange={(value) => setFormData(prev => ({ ...prev, role: value as 'admin' | 'pastor' | 'elder' | 'finance_officer' | 'member' | 'visitor' }))}>
                      <SelectTrigger id="role" className={createField}>
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
                  <div className="space-y-1.5">
                    <Label htmlFor="membership_id">Membership ID</Label>
                    <Input
                      id="membership_id"
                      className={createField}
                      value={formData.membership_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, membership_id: e.target.value }))}
                      placeholder="Auto-generated if empty"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="join_year">Join year</Label>
                    <Input
                      id="join_year"
                      type="number"
                      inputMode="numeric"
                      className={createField}
                      value={formData.join_year}
                      onChange={(e) => setFormData(prev => ({ ...prev, join_year: parseInt(e.target.value) }))}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Enter address"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="occupation">Occupation</Label>
                    <Input
                      id="occupation"
                      className={createField}
                      value={formData.occupation}
                      onChange={(e) => setFormData(prev => ({ ...prev, occupation: e.target.value }))}
                      placeholder="Enter occupation"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="place_of_work">Place of work</Label>
                    <Input
                      id="place_of_work"
                      className={createField}
                      value={formData.place_of_work}
                      onChange={(e) => setFormData(prev => ({ ...prev, place_of_work: e.target.value }))}
                      placeholder="Enter place of work"
                    />
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)} className={createField}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateUser} disabled={creating} className={createField}>
                    {creating ? 'Creating…' : 'Create user'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-5">
          <StatCard label="Total users" value={stats.total} className="col-span-2 md:col-span-1" />
          <StatCard label="Admins" value={stats.admins} />
          <StatCard label="Pastors" value={stats.pastors} />
          <StatCard label="Elders" value={stats.elders} />
          <StatCard label="Members" value={stats.members} />
        </div>

        {/* Search and filters */}
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
            <Input
              type="search"
              placeholder="Search name, phone, email or ID"
              aria-label="Search users"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-11 pl-10 sm:h-10"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="h-11 sm:h-10 sm:w-36" aria-label="Filter by role">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                {uniqueRoles.map(role => (
                  <SelectItem key={role} value={role}>
                    {chipLabel(role)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-11 sm:h-10 sm:w-36" aria-label="Filter by status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Users list */}
        <section className="dashboard-panel overflow-hidden">
          <div className="border-b border-neutral-200/80 px-4 py-3 dark:border-white/[0.06] sm:px-5">
            <h2 className="app-section-title">
              Users <span className="tabular-nums text-neutral-500 dark:text-neutral-400">({filteredUsers.length})</span>
            </h2>
          </div>
          {filteredUsers.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <UserX className="mx-auto mb-4 h-12 w-12 text-neutral-400 dark:text-neutral-500" />
              <h3 className="app-section-title mb-1">No users found</h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">Try adjusting your search or filters.</p>
            </div>
          ) : (
            <ul className="divide-y divide-neutral-100 dark:divide-white/[0.06]">
              {filteredUsers.map((user) => {
                const name = displayName(user.full_name)
                return (
                  <li
                    key={user.id}
                    className="flex min-h-14 cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 sm:px-5"
                    onClick={() => void handleViewUser(user)}
                  >
                    <PersonAvatar name={user.full_name} seed={user.id} />
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-2">
                        <button
                          type="button"
                          className="min-w-0 truncate text-left text-sm font-medium text-neutral-900 hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 dark:text-neutral-100 dark:hover:text-brand-300"
                          onClick={(e) => {
                            e.stopPropagation()
                            void handleViewUser(user)
                          }}
                        >
                          {name}
                        </button>
                        <Badge variant={roleTone(user.role)} className="shrink-0 capitalize">
                          {chipLabel(user.role)}
                        </Badge>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[13px] text-neutral-500 dark:text-neutral-400">
                        {user.phone ? (
                          <PhoneLink phone={user.phone} whatsapp={user.whatsapp} name={name} />
                        ) : null}
                        {user.membership_id && (
                          <span className="font-mono">{user.membership_id}</span>
                        )}
                        {user.email && (
                          <span className="hidden min-w-0 max-w-[16rem] items-center truncate md:inline-flex">
                            <Mail className="mr-1 h-3 w-3 shrink-0" aria-hidden />
                            <span className="truncate">{user.email}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <QuickContactButtons
                        phone={user.phone}
                        whatsapp={user.whatsapp}
                        name={name}
                        className="hidden min-[400px]:inline-flex"
                      />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-11 w-11 sm:h-9 sm:w-9"
                            aria-label={`Actions for ${name}`}
                          >
                            <MoreHorizontal className="h-4 w-4" aria-hidden />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuItem className="min-h-11 sm:min-h-9" onClick={() => void handleViewUser(user)}>
                            <Eye className="mr-2 h-4 w-4" aria-hidden />
                            View profile
                          </DropdownMenuItem>
                          <DropdownMenuItem className="min-h-11 sm:min-h-9" onClick={() => setEditingUserId(user.id)}>
                            <Edit className="mr-2 h-4 w-4" aria-hidden />
                            Edit details
                          </DropdownMenuItem>
                          <DropdownMenuItem className="min-h-11 sm:min-h-9" onClick={() => openAddToRlc(user)}>
                            <UserPlus className="mr-2 h-4 w-4" aria-hidden />
                            Add to RLC
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="min-h-11 sm:min-h-9"
                            disabled={promotingUserId === user.id}
                            onClick={() => void handlePromoteToCorporateGem(user)}
                          >
                            <UserPlus className="mr-2 h-4 w-4" aria-hidden />
                            {promotingUserId === user.id ? 'Adding to Corporate Gem…' : 'Add to Corporate Gem'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="min-h-11 text-red-600 focus:text-red-700 dark:text-red-400 dark:focus:text-red-300 sm:min-h-9"
                            onClick={() => handleDeleteUser(user.id, user.full_name || 'User')}
                          >
                            <Trash2 className="mr-2 h-4 w-4" aria-hidden />
                            Delete user
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <EditUserDialog
          open={Boolean(editingUserId)}
          onOpenChange={(open) => {
            if (!open) setEditingUserId(null)
          }}
          userId={editingUserId ?? ''}
          onSaved={() => refetch()}
        />

        {rlcUser ? (
          <AddToRlcDialog
            open={Boolean(rlcUser)}
            onOpenChange={(open) => {
              if (!open) setRlcUser(null)
            }}
            contactName={rlcUser.full_name}
            userId={rlcUser.id}
            memberId={rlcMemberId}
            existingRoles={rlcExistingRoles}
            onSuccess={() => {
              setRlcUser(null)
              refetch()
            }}
          />
        ) : null}
    </div>
  )
}
