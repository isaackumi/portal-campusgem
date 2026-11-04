'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { campService } from '@/lib/services/camp-service'
import { getActiveCampYear } from '@/lib/actions/camp'
import { dataService } from '@/lib/services/data-service'
import { CampActivity, CampYear, AppUser } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading'
import { CampAdminPageHeader } from '@/components/camp/camp-admin-page-header'
import { StatCard } from '@/components/ui/stat-card'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/components/providers'
import {
    Plus, Calendar, Clock, MapPin, Users, Edit, Trash2, ArrowLeft,
    CheckCircle2, XCircle, AlertCircle, FileText, Coffee, Music,
    GraduationCap, Gamepad2, Heart, Briefcase, MoreHorizontal
} from 'lucide-react'
import { cn } from '@/lib/utils'

const ACTIVITY_TYPES = [
    { value: 'session', label: 'Session', icon: FileText },
    { value: 'workshop', label: 'Workshop', icon: GraduationCap },
    { value: 'meeting', label: 'Meeting', icon: Briefcase },
    { value: 'worship', label: 'Worship', icon: Music },
    { value: 'break', label: 'Break', icon: Coffee },
    { value: 'meal', label: 'Meal', icon: Coffee },
    { value: 'recreation', label: 'Recreation', icon: Gamepad2 },
    { value: 'seminar', label: 'Seminar', icon: GraduationCap },
    { value: 'prayer', label: 'Prayer', icon: Heart },
    { value: 'other', label: 'Other', icon: MoreHorizontal },
]

const STATUS_COLORS = {
    scheduled: 'bg-neutral-100 text-neutral-700 border-neutral-300 dark:bg-white/5 dark:text-neutral-300 dark:border-white/10',
    in_progress: 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-400/10 dark:text-amber-300 dark:border-amber-400/20',
    completed: 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-400/10 dark:text-emerald-300 dark:border-emerald-400/20',
    cancelled: 'bg-red-50 text-red-800 border-red-300 dark:bg-red-400/10 dark:text-red-300 dark:border-red-400/20',
}

export default function CampActivitiesPage() {
    const router = useRouter()
    const { toast } = useToast()
    const { user } = useAuth()

    const [campYear, setCampYear] = useState<CampYear | null>(null)
    const [activities, setActivities] = useState<CampActivity[]>([])
    const [staffMembers, setStaffMembers] = useState<AppUser[]>([])
    const [loading, setLoading] = useState(true)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingActivity, setEditingActivity] = useState<CampActivity | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [dateFilter, setDateFilter] = useState<string>('')

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        activity_type: 'session' as CampActivity['activity_type'],
        date: '',
        start_time: '',
        end_time: '',
        location: '',
        venue: '',
        capacity: '',
        assigned_staff: '',
        status: 'scheduled' as CampActivity['status'],
        notes: '',
    })

    useEffect(() => {
        loadData()
        loadStaffMembers()
    }, [])

    async function loadData() {
        const { data: year } = await getActiveCampYear()
        if (year) {
            setCampYear(year)
            const { data } = await campService.getCampActivities(year.id)
            if (data) setActivities(data as CampActivity[])
        }
        setLoading(false)
    }

    async function loadStaffMembers() {
        const { data } = await dataService.getAllUsers()
        const staff = (data ?? []).filter(u => ['admin', 'pastor', 'elder', 'finance_officer'].includes(u.role))
        setStaffMembers(staff)
    }

    function openCreateDialog() {
        setEditingActivity(null)
        const today = new Date().toISOString().split('T')[0]
        setFormData({
            title: '',
            description: '',
            activity_type: 'session',
            date: today,
            start_time: '09:00',
            end_time: '10:00',
            location: '',
            venue: '',
            capacity: '',
            assigned_staff: '',
            status: 'scheduled',
            notes: '',
        })
        setDialogOpen(true)
    }

    function openEditDialog(activity: CampActivity) {
        setEditingActivity(activity)
        setFormData({
            title: activity.title,
            description: activity.description || '',
            activity_type: activity.activity_type,
            date: activity.date,
            start_time: activity.start_time,
            end_time: activity.end_time,
            location: activity.location || '',
            venue: activity.venue || '',
            capacity: activity.capacity?.toString() || '',
            assigned_staff: activity.assigned_staff || '',
            status: activity.status,
            notes: activity.notes || '',
        })
        setDialogOpen(true)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!campYear || !user) return

        try {
            const submitData = {
                ...formData,
                camp_year_id: campYear.id,
                capacity: formData.capacity ? parseInt(formData.capacity) : null,
                assigned_staff: formData.assigned_staff || null,
                created_by: editingActivity ? undefined : user.id,
            }

            if (editingActivity) {
                const res = await campService.updateActivity(editingActivity.id, submitData)
                if (res.error) throw new Error(res.error)
                toast({
                    title: 'Success',
                    description: 'Activity updated successfully',
                })
            } else {
                const res = await campService.createActivity(submitData)
                if (res.error) throw new Error(res.error)
                toast({
                    title: 'Success',
                    description: 'Activity created successfully',
                })
            }

            setDialogOpen(false)
            loadData()
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.message || 'Failed to save activity',
            })
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Are you sure you want to delete this activity?')) return

        setDeletingId(id)
        try {
            const res = await campService.deleteActivity(id)
            if (res.error) throw new Error(res.error)
            toast({
                title: 'Success',
                description: 'Activity deleted successfully',
            })
            loadData()
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.message || 'Failed to delete activity',
            })
        } finally {
            setDeletingId(null)
        }
    }

    const filteredActivities = activities.filter(activity => {
        if (!dateFilter) return true
        return activity.date === dateFilter
    })

    const groupedByDate = filteredActivities.reduce((acc, activity) => {
        if (!acc[activity.date]) {
            acc[activity.date] = []
        }
        acc[activity.date].push(activity)
        return acc
    }, {} as Record<string, CampActivity[]>)

    const sortedDates = Object.keys(groupedByDate).sort()

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <LoadingSpinner />
            </div>
        )
    }

    if (!campYear) {
        return (
            <div className="mx-auto max-w-4xl">
                <Card>
                    <CardHeader>
                        <CardTitle>No Active Camp Year</CardTitle>
                        <CardDescription>Please create or activate a camp year first.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={() => router.push('/admin/camp-meeting/years')}>
                            Manage Camp Years
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div>
            <div className="mx-auto max-w-7xl space-y-4 sm:space-y-6">
                <CampAdminPageHeader
                    title="Camp Activities"
                    campYear={campYear}
                    actions={
                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={openCreateDialog}>
                                <Plus className="mr-2 h-4 w-4" /> Add Activity
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>
                                    {editingActivity ? 'Edit Activity' : 'Create New Activity'}
                                </DialogTitle>
                                <DialogDescription>
                                    {editingActivity ? 'Update activity details' : 'Add a new activity to the camp schedule'}
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleSubmit}>
                                <div className="space-y-6 py-4">
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="space-y-2 md:col-span-2">
                                            <Label htmlFor="title">Activity Title *</Label>
                                            <Input
                                                id="title"
                                                required
                                                value={formData.title}
                                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                                placeholder="e.g., Opening Session, Morning Devotion"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="activity_type">Activity Type *</Label>
                                            <Select
                                                value={formData.activity_type}
                                                onValueChange={(v: any) => setFormData({ ...formData, activity_type: v })}
                                                required
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {ACTIVITY_TYPES.map(type => (
                                                        <SelectItem key={type.value} value={type.value}>
                                                            {type.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="status">Status</Label>
                                            <Select
                                                value={formData.status}
                                                onValueChange={(v: any) => setFormData({ ...formData, status: v })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="scheduled">Scheduled</SelectItem>
                                                    <SelectItem value="in_progress">In Progress</SelectItem>
                                                    <SelectItem value="completed">Completed</SelectItem>
                                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="date">Date *</Label>
                                            <Input
                                                id="date"
                                                type="date"
                                                required
                                                value={formData.date}
                                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="start_time">Start Time *</Label>
                                            <Input
                                                id="start_time"
                                                type="time"
                                                required
                                                value={formData.start_time}
                                                onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="end_time">End Time *</Label>
                                            <Input
                                                id="end_time"
                                                type="time"
                                                required
                                                value={formData.end_time}
                                                onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="location">Location</Label>
                                            <Input
                                                id="location"
                                                value={formData.location}
                                                onChange={e => setFormData({ ...formData, location: e.target.value })}
                                                placeholder="e.g., Main Hall, Field"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="venue">Venue</Label>
                                            <Input
                                                id="venue"
                                                value={formData.venue}
                                                onChange={e => setFormData({ ...formData, venue: e.target.value })}
                                                placeholder="e.g., Conference Center"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="capacity">Capacity</Label>
                                            <Input
                                                id="capacity"
                                                type="number"
                                                min="1"
                                                value={formData.capacity}
                                                onChange={e => setFormData({ ...formData, capacity: e.target.value })}
                                                placeholder="Maximum participants"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="assigned_staff">Assigned Staff</Label>
                                            <Select
                                                value={formData.assigned_staff || '__none__'}
                                                onValueChange={v => setFormData({
                                                    ...formData,
                                                    assigned_staff: v === '__none__' ? '' : v,
                                                })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select staff member" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="__none__">None</SelectItem>
                                                    {staffMembers.map(staff => (
                                                        <SelectItem key={staff.id} value={staff.id}>
                                                            {staff.full_name} ({staff.role})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2 md:col-span-2">
                                            <Label htmlFor="description">Description</Label>
                                            <Textarea
                                                id="description"
                                                value={formData.description}
                                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                                placeholder="Activity description..."
                                                rows={3}
                                            />
                                        </div>

                                        <div className="space-y-2 md:col-span-2">
                                            <Label htmlFor="notes">Notes</Label>
                                            <Textarea
                                                id="notes"
                                                value={formData.notes}
                                                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                                placeholder="Additional notes..."
                                                rows={2}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button type="submit">
                                        {editingActivity ? 'Update Activity' : 'Create Activity'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                    }
                />

                {/* Filters */}
                <Card>
                    <CardHeader className="p-4 sm:p-6">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
                            <div className="flex-1 space-y-2 sm:max-w-xs">
                                <Label htmlFor="date_filter">Filter by Date</Label>
                                <Input
                                    id="date_filter"
                                    type="date"
                                    className="h-11 sm:h-10"
                                    value={dateFilter}
                                    onChange={e => setDateFilter(e.target.value)}
                                />
                            </div>
                            {dateFilter && (
                                <Button variant="outline" className="h-11 sm:h-10" onClick={() => setDateFilter('')}>
                                    Clear Filter
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                </Card>

                {/* Activities List */}
                {sortedDates.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <p className="text-muted-foreground mb-4">
                                {dateFilter ? 'No activities found for selected date' : 'No activities scheduled yet'}
                            </p>
                            <Button onClick={openCreateDialog}>
                                <Plus className="mr-2 h-4 w-4" /> Create First Activity
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4 sm:space-y-6">
                        {sortedDates.map(date => (
                            <Card key={date}>
                                <CardHeader className="border-b border-neutral-200/80 bg-neutral-50 p-4 dark:border-white/10 dark:bg-white/[0.03] sm:p-6">
                                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                                        <Calendar className="h-5 w-5" />
                                        {new Date(date).toLocaleDateString('en-US', {
                                            weekday: 'long',
                                            month: 'long',
                                            day: 'numeric',
                                            year: 'numeric'
                                        })}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-3 pt-3 sm:p-6 sm:pt-6">
                                    <div className="space-y-3 sm:space-y-4">
                                        {groupedByDate[date]
                                            .sort((a, b) => a.start_time.localeCompare(b.start_time))
                                            .map(activity => {
                                                const TypeIcon = ACTIVITY_TYPES.find(t => t.value === activity.activity_type)?.icon || FileText
                                                return (
                                                    <div
                                                        key={activity.id}
                                                        className="rounded-lg border border-neutral-200/80 bg-white p-3 transition-shadow hover:shadow-md dark:border-white/10 dark:bg-neutral-800/60 sm:p-4"
                                                    >
                                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex items-start gap-3">
                                                                    <div className={cn(
                                                                        "shrink-0 rounded-lg p-2",
                                                                        activity.activity_type === 'worship' && "bg-violet-100 text-violet-600 dark:bg-violet-400/10 dark:text-violet-300",
                                                                        activity.activity_type === 'session' && "bg-brand-50 text-brand-600 dark:bg-brand-400/10 dark:text-brand-300",
                                                                        activity.activity_type === 'workshop' && "bg-teal-50 text-teal-600 dark:bg-teal-400/10 dark:text-teal-300",
                                                                        activity.activity_type === 'meal' && "bg-orange-50 text-orange-600 dark:bg-orange-400/10 dark:text-orange-300",
                                                                        activity.activity_type === 'break' && "bg-neutral-100 text-neutral-600 dark:bg-white/5 dark:text-neutral-300",
                                                                        activity.activity_type === 'prayer' && "bg-pink-50 text-pink-600 dark:bg-pink-400/10 dark:text-pink-300",
                                                                        !['worship', 'session', 'workshop', 'meal', 'break', 'prayer'].includes(activity.activity_type) && "bg-neutral-100 text-neutral-600 dark:bg-white/5 dark:text-neutral-300"
                                                                    )}>
                                                                        <TypeIcon className="h-5 w-5" />
                                                                    </div>
                                                                    <div className="min-w-0 flex-1">
                                                                        <div className="mb-1 flex flex-wrap items-center gap-2">
                                                                            <h3 className="break-words text-base font-semibold text-neutral-900 dark:text-neutral-100 sm:text-lg">
                                                                                {activity.title}
                                                                            </h3>
                                                                            <Badge variant="outline" className={cn(STATUS_COLORS[activity.status])}>
                                                                                {activity.status.replace('_', ' ')}
                                                                            </Badge>
                                                                        </div>
                                                                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-600 dark:text-neutral-400">
                                                                            <div className="flex items-center gap-1">
                                                                                <Clock className="h-4 w-4" />
                                                                                <span>
                                                                                    {new Date(`2000-01-01T${activity.start_time}`).toLocaleTimeString('en-US', {
                                                                                        hour: 'numeric',
                                                                                        minute: '2-digit',
                                                                                        hour12: true
                                                                                    })} - {new Date(`2000-01-01T${activity.end_time}`).toLocaleTimeString('en-US', {
                                                                                        hour: 'numeric',
                                                                                        minute: '2-digit',
                                                                                        hour12: true
                                                                                    })}
                                                                                </span>
                                                                            </div>
                                                                            {activity.location && (
                                                                                <div className="flex items-center gap-1">
                                                                                    <MapPin className="h-4 w-4" />
                                                                                    <span>{activity.location}</span>
                                                                                    {activity.venue && <span className="text-neutral-400 dark:text-neutral-500">• {activity.venue}</span>}
                                                                                </div>
                                                                            )}
                                                                            {activity.capacity && (
                                                                                <div className="flex items-center gap-1">
                                                                                    <Users className="h-4 w-4" />
                                                                                    <span>Capacity: {activity.capacity}</span>
                                                                                    {activity.attendance_count !== undefined && (
                                                                                        <span className="text-neutral-400 dark:text-neutral-500">
                                                                                            ({activity.attendance_count} attended)
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                            {activity.assigned_user && (
                                                                                <div className="flex items-center gap-1">
                                                                                    <Users className="h-4 w-4" />
                                                                                    <span>{activity.assigned_user.full_name}</span>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        {activity.description && (
                                                                            <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">{activity.description}</p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2 border-t border-neutral-100 pt-3 dark:border-white/5 sm:ml-4 sm:border-0 sm:pt-0">
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="h-11 flex-1 sm:h-9 sm:flex-none"
                                                                    aria-label="Edit activity"
                                                                    onClick={() => openEditDialog(activity)}
                                                                >
                                                                    <Edit className="h-4 w-4" />
                                                                    <span className="sm:hidden">Edit</span>
                                                                </Button>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="h-11 flex-1 sm:h-9 sm:flex-none"
                                                                    aria-label="Delete activity"
                                                                    onClick={() => handleDelete(activity.id)}
                                                                    disabled={deletingId === activity.id}
                                                                >
                                                                    {deletingId === activity.id ? (
                                                                        <LoadingSpinner size="sm" />
                                                                    ) : (
                                                                        <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                                                                    )}
                                                                    <span className="sm:hidden">Delete</span>
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Stats Summary */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                    <StatCard label="Total activities" value={activities.length} icon={Calendar} />
                    <StatCard label="Scheduled" value={activities.filter(a => a.status === 'scheduled').length} icon={Clock} />
                    <StatCard label="Completed" value={activities.filter(a => a.status === 'completed').length} tone="success" icon={CheckCircle2} />
                    <StatCard label="Unique dates" value={sortedDates.length} />
                </div>
            </div>
        </div>
    )
}
