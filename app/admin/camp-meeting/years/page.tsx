'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers'
import { getCampRegistrations, createCampYear, updateCampYear, toggleCampYearRegistration, setActiveCampYear, deactivateCampYear, deleteCampYear, getAllCampYears } from '@/lib/actions/camp'
import { CampYear } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { LoadingSpinner } from '@/components/ui/loading'
import { useToast } from '@/hooks/use-toast'
import { 
    Plus, 
    Edit, 
    Calendar, 
    CheckCircle, 
    XCircle, 
    Lock, 
    Unlock,
    Users,
    BarChart3,
    Upload,
    Eye,
    ArrowLeft,
    TrendingUp,
    FileText,
    Download,
    Settings,
    MapPin,
    Clock,
    LayoutGrid,
    List,
    ArrowUpDown,
    Sparkles,
    Trash2,
} from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import Image from 'next/image'

interface YearStats {
    totalRegistrations: number
    checkedIn: number
    registered: number
    cancelled: number
    newRegistrants: number
    returning: number
    paid: number
    pending: number
}

interface CampYearWithStats extends CampYear {
    stats?: YearStats
}

export default function CampYearsPage() {
    const router = useRouter()
    const { toast } = useToast()
    const { user, loading: authLoading } = useAuth()
    const [years, setYears] = useState<CampYearWithStats[]>([])
    const [loading, setLoading] = useState(true)
    const [loadingStats, setLoadingStats] = useState<Set<string>>(new Set())
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingYear, setEditingYear] = useState<CampYear | null>(null)
    const [formData, setFormData] = useState({
        year: new Date().getFullYear(),
        theme: '',
        start_date: '',
        end_date: '',
        is_active: false,
        registration_open: false,
        flyer_image_url: '',
    })
    const [sortBy, setSortBy] = useState<'year' | 'registrations' | 'theme'>('year')
    const [viewMode, setViewMode] = useState<'cards' | 'grid' | 'list'>('cards')
    const [deleteTarget, setDeleteTarget] = useState<CampYear | null>(null)
    const [deleteConfirmValue, setDeleteConfirmValue] = useState('')
    const [deleting, setDeleting] = useState(false)

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/auth?redirect=' + encodeURIComponent('/admin/camp-meeting/years'))
        }
    }, [user, authLoading, router])

    useEffect(() => {
        if (user) {
            loadYears()
        }
    }, [user])

    const sortedYears = useMemo(() => {
        const copy = [...years]
        copy.sort((a, b) => {
            if (sortBy === 'registrations') {
                return (b.stats?.totalRegistrations || 0) - (a.stats?.totalRegistrations || 0)
            }
            if (sortBy === 'theme') {
                return a.theme.localeCompare(b.theme)
            }
            return b.year - a.year
        })
        return copy
    }, [years, sortBy])

    const gridClass =
        viewMode === 'grid'
            ? 'grid gap-4 md:grid-cols-3 xl:grid-cols-4'
            : viewMode === 'list'
              ? 'space-y-3'
              : 'grid gap-6 md:grid-cols-2 lg:grid-cols-3'

    async function loadYears() {
        try {
            setLoading(true)
            const result = await getAllCampYears()
            
            if (result.error) throw new Error(result.error)
            
            const yearsData = result.data || []
            setYears(yearsData)
            
            // Load stats for all years
            await Promise.all(yearsData.map(year => loadYearStats(year.id)))
        } catch (error: any) {
            console.error('Error loading camp years:', error)
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.message || 'Failed to load camp years',
            })
        } finally {
            setLoading(false)
        }
    }

    async function loadYearStats(yearId: string) {
        if (loadingStats.has(yearId)) return
        
        try {
            setLoadingStats(prev => new Set(prev).add(yearId))
            const result = await getCampRegistrations(yearId)
            
            if (result.data) {
                const registrations = result.data
                const stats: YearStats = {
                    totalRegistrations: registrations.length,
                    checkedIn: registrations.filter(r => r.status === 'checked_in').length,
                    registered: registrations.filter(r => r.status === 'registered').length,
                    cancelled: registrations.filter(r => r.status === 'cancelled').length,
                    newRegistrants: registrations.filter(r => r.is_new_registrant).length,
                    returning: registrations.filter(r => !r.is_new_registrant).length,
                    paid: registrations.filter(r => r.payment_status === 'paid' || r.payment_status === 'confirmed').length,
                    pending: registrations.filter(r => r.payment_status === 'pending').length,
                }

                setYears(prev => prev.map(y => 
                    y.id === yearId ? { ...y, stats } : y
                ))
            }
        } catch (error: any) {
            console.error(`Error loading stats for year ${yearId}:`, error)
        } finally {
            setLoadingStats(prev => {
                const newSet = new Set(prev)
                newSet.delete(yearId)
                return newSet
            })
        }
    }

    function openCreateDialog() {
        setEditingYear(null)
        setFormData({
            year: new Date().getFullYear(),
            theme: '',
            start_date: '',
            end_date: '',
            is_active: false,
            registration_open: false,
            flyer_image_url: '',
        })
        setDialogOpen(true)
    }

    function openEditDialog(year: CampYear) {
        setEditingYear(year)
        setFormData({
            year: year.year,
            theme: year.theme,
            start_date: year.start_date,
            end_date: year.end_date,
            is_active: year.is_active,
            registration_open: year.registration_open,
            flyer_image_url: year.flyer_image_url || '',
        })
        setDialogOpen(true)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()

        try {
            let result
            if (editingYear) {
                // Update existing year
                result = await updateCampYear(editingYear.id, {
                    theme: formData.theme,
                    start_date: formData.start_date,
                    end_date: formData.end_date,
                    is_active: formData.is_active,
                    registration_open: formData.registration_open,
                    flyer_image_url: formData.flyer_image_url || null,
                })
            } else {
                // Create new year
                result = await createCampYear({
                    year: formData.year,
                    theme: formData.theme,
                    start_date: formData.start_date,
                    end_date: formData.end_date,
                    is_active: formData.is_active,
                    registration_open: formData.registration_open,
                    flyer_image_url: formData.flyer_image_url || null,
                })
            }

            if (!result.success) {
                throw new Error(result.error || 'Failed to save camp year')
            }

            toast({
                title: 'Success',
                description: editingYear ? 'Camp year updated successfully' : 'Camp year created successfully',
            })

            setDialogOpen(false)
            loadYears()
        } catch (error: any) {
            console.error('Error saving camp year:', error)
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.message || 'Failed to save camp year',
            })
        }
    }

    async function toggleRegistration(yearId: string, currentStatus: boolean) {
        try {
            const result = await toggleCampYearRegistration(yearId, currentStatus)

            if (!result.success) {
                throw new Error(result.error || 'Failed to toggle registration')
            }

            toast({
                title: 'Success',
                description: `Registration ${!currentStatus ? 'opened' : 'closed'}`,
            })

            loadYears()
        } catch (error: any) {
            console.error('Error toggling registration:', error)
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.message || 'Failed to update registration status',
            })
        }
    }


    async function deactivateYear(yearId: string) {
        try {
            const result = await deactivateCampYear(yearId)
            if (!result.success) throw new Error(result.error || 'Failed to deactivate camp year')
            toast({
                title: 'Camp year deactivated',
                description: 'This year is no longer the active season. Set another year active when ready.',
            })
            loadYears()
        } catch (error: unknown) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error instanceof Error ? error.message : 'Failed to deactivate camp year',
            })
        }
    }

    async function setActiveYear(yearId: string) {
        try {
            const result = await setActiveCampYear(yearId)

            if (!result.success) {
                throw new Error(result.error || 'Failed to set active year')
            }

            toast({
                title: 'Success',
                description: 'Active camp year updated',
            })

            loadYears()
        } catch (error: any) {
            console.error('Error setting active year:', error)
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.message || 'Failed to set active year',
            })
        }
    }

    function openDeleteDialog(year: CampYear) {
        setDeleteTarget(year)
        setDeleteConfirmValue('')
    }

    async function confirmDeleteYear() {
        if (!deleteTarget) return
        const confirmYear = Number(deleteConfirmValue)
        if (confirmYear !== deleteTarget.year) {
            toast({
                variant: 'destructive',
                title: 'Confirmation failed',
                description: `Type ${deleteTarget.year} to confirm deletion.`,
            })
            return
        }

        setDeleting(true)
        try {
            const result = await deleteCampYear({
                yearId: deleteTarget.id,
                confirmYear: deleteTarget.year,
            })
            if (!result.success || !result.data) {
                throw new Error(result.error || 'Failed to delete camp year')
            }

            const { counts } = result.data
            toast({
                title: 'Camp year deleted',
                description: `Removed ${deleteTarget.year}: ${counts.registrations} registrations, ${counts.interactions} interactions, ${counts.activities} activities, ${counts.communications} communications, ${counts.forms} forms.`,
            })
            setDeleteTarget(null)
            setDeleteConfirmValue('')
            loadYears()
        } catch (error: unknown) {
            toast({
                variant: 'destructive',
                title: 'Delete failed',
                description: error instanceof Error ? error.message : 'Failed to delete camp year',
            })
        } finally {
            setDeleting(false)
        }
    }

    if (authLoading || (!user && !authLoading)) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <LoadingSpinner />
            </div>
        )
    }

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center min-h-[400px]">
                <LoadingSpinner />
            </div>
        )
    }

    // Calculate overall statistics
    const totalYears = years.length
    const activeYear = years.find(y => y.is_active)
    const totalRegistrations = years.reduce((sum, y) => sum + (y.stats?.totalRegistrations || 0), 0)
    const totalCheckedIn = years.reduce((sum, y) => sum + (y.stats?.checkedIn || 0), 0)

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="max-w-7xl mx-auto p-6 space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push('/admin/camp-meeting')}
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back
                        </Button>
                        <div>
                            <h1 className="text-4xl font-bold tracking-tight text-slate-900">
                                Camp Years Management
                            </h1>
                            <p className="text-muted-foreground mt-1">
                                Overview and management of all camp meeting years
                            </p>
                        </div>
                    </div>
                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={openCreateDialog} size="lg">
                                <Plus className="mr-2 h-4 w-4" /> Create New Year
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>{editingYear ? 'Edit Camp Year' : 'Create New Camp Year'}</DialogTitle>
                                <DialogDescription>
                                    {editingYear ? 'Update camp year details' : 'Add a new camp meeting year'}
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleSubmit}>
                                <div className="space-y-4 py-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="year">Year</Label>
                                            <Input
                                                id="year"
                                                type="number"
                                                required
                                                value={formData.year}
                                                onChange={e => setFormData({ ...formData, year: parseInt(e.target.value) })}
                                                disabled={!!editingYear}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="theme">Theme</Label>
                                        <Textarea
                                            id="theme"
                                            required
                                            value={formData.theme}
                                            onChange={e => setFormData({ ...formData, theme: e.target.value })}
                                            placeholder="Camp meeting theme"
                                            rows={2}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="flyer_image_url">Flyer Image URL (Optional)</Label>
                                        <Input
                                            id="flyer_image_url"
                                            type="url"
                                            value={formData.flyer_image_url}
                                            onChange={e => setFormData({ ...formData, flyer_image_url: e.target.value })}
                                            placeholder="https://example.com/flyer.jpg"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            URL to the program flyer/image that will be displayed at the top of the registration form
                                        </p>
                                        {formData.flyer_image_url && (
                                            <div className="mt-2 border rounded-lg overflow-hidden">
                                                <Image
                                                    src={formData.flyer_image_url}
                                                    alt="Flyer preview"
                                                    width={400}
                                                    height={225}
                                                    className="max-w-full h-auto max-h-48 object-contain"
                                                    onError={(e) => {
                                                        e.currentTarget.style.display = 'none'
                                                    }}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="start_date">Start Date</Label>
                                            <Input
                                                id="start_date"
                                                type="date"
                                                required
                                                value={formData.start_date}
                                                onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="end_date">End Date</Label>
                                            <Input
                                                id="end_date"
                                                type="date"
                                                required
                                                value={formData.end_date}
                                                onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between space-x-2">
                                        <div className="space-y-0.5 flex-1">
                                            <Label htmlFor="is_active">Set as Active Year</Label>
                                            <p className="text-sm text-muted-foreground">
                                                Only one year can be active. Uncheck to deactivate this year.
                                            </p>
                                        </div>
                                        <Checkbox
                                            id="is_active"
                                            checked={formData.is_active}
                                            onCheckedChange={checked => setFormData({ ...formData, is_active: checked === true })}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between space-x-2">
                                        <div className="space-y-0.5 flex-1">
                                            <Label htmlFor="registration_open">Open Registration</Label>
                                            <p className="text-sm text-muted-foreground">
                                                Allow public registration for this year
                                            </p>
                                        </div>
                                        <Checkbox
                                            id="registration_open"
                                            checked={formData.registration_open}
                                            onCheckedChange={checked => setFormData({ ...formData, registration_open: checked === true })}
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button type="submit">
                                        {editingYear ? 'Update' : 'Create'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Overall Statistics */}
                {activeYear ? (
                    <Card className="border-2 border-slate-200 bg-slate-50/60">
                        <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-900">Active camp year</p>
                                <p className="text-lg font-semibold text-slate-900">
                                    {activeYear.year}
                                    {activeYear.theme ? ` · ${activeYear.theme}` : ''}
                                </p>
                            </div>
                            <Button variant="outline" className="border-amber-300 bg-white" onClick={() => deactivateYear(activeYear.id)}>
                                Deactivate {activeYear.year}
                            </Button>
                        </CardContent>
                    </Card>
                ) : null}
                <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Total Years</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{totalYears}</div>
                            <p className="text-xs text-muted-foreground mt-1">Camp years created</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Total Registrations</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{totalRegistrations}</div>
                            <p className="text-xs text-muted-foreground mt-1">Across all years</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Total Checked In</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{totalCheckedIn}</div>
                            <p className="text-xs text-muted-foreground mt-1">Participants attended</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Active Year</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{activeYear ? activeYear.year : 'None'}</div>
                            <p className="text-xs text-muted-foreground mt-1">{activeYear?.theme || 'No active year'}</p>
                        </CardContent>
                    </Card>
                </div>


                <Card>
                    <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <ArrowUpDown className="h-4 w-4" />
                            Sort and view controls
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button variant={sortBy === 'year' ? 'default' : 'outline'} size="sm" onClick={() => setSortBy('year')}>Year</Button>
                            <Button variant={sortBy === 'registrations' ? 'default' : 'outline'} size="sm" onClick={() => setSortBy('registrations')}>Registrations</Button>
                            <Button variant={sortBy === 'theme' ? 'default' : 'outline'} size="sm" onClick={() => setSortBy('theme')}>Theme</Button>
                            <Button variant={viewMode === 'cards' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('cards')}>Cards</Button>
                            <Button variant={viewMode === 'grid' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('grid')}>Grid</Button>
                            <Button variant={viewMode === 'list' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('list')}><List className="mr-2 h-4 w-4" />List</Button>
                        </div>
                    </CardContent>
                </Card>

                <div className={gridClass}>
                    {sortedYears.map(year => {
                        const stats = year.stats
                        const isLoadingStats = loadingStats.has(year.id)
                        
                        return (
                            <Card 
                                key={year.id} 
                                className={`relative overflow-hidden transition-all hover:shadow-lg cursor-pointer ${
                                    year.is_active ? 'border-slate-900 border-2 shadow-md' : ''
                                }`}
                                onClick={() => router.push(`/admin/camp-meeting/registrations?year=${year.id}`)}
                            >
                                {year.is_active && (
                                    <div className="absolute top-0 right-0 bg-primary text-white px-3 py-1 text-xs font-semibold rounded-bl-lg">
                                        ACTIVE
                                    </div>
                                )}
                                
                                <CardHeader className="pb-3">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <CardTitle className="text-2xl font-bold">Camp Meeting {year.year}</CardTitle>
                                            <CardDescription className="mt-2 line-clamp-2">{year.theme}</CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                
                                <CardContent className="space-y-4">
                                    {/* Dates */}
                                    <div className="flex items-center text-sm text-muted-foreground">
                                        <Calendar className="mr-2 h-4 w-4" />
                                        <span>
                                            {new Date(year.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - {new Date(year.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </span>
                                    </div>

                                    {/* Registration Status */}
                                    <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                                        <span className="text-sm font-medium">Registration:</span>
                                        <div className="flex items-center gap-2">
                                            {year.registration_open ? (
                                                <>
                                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                                    <Badge variant="default" className="bg-green-600">Open</Badge>
                                                </>
                                            ) : (
                                                <>
                                                    <XCircle className="h-4 w-4 text-red-600" />
                                                    <Badge variant="destructive">Closed</Badge>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Statistics */}
                                    {isLoadingStats ? (
                                        <div className="flex items-center justify-center py-4">
                                            <LoadingSpinner />
                                        </div>
                                    ) : stats ? (
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            <div className="p-2 bg-slate-50 rounded">
                                                <div className="font-semibold text-slate-900">{stats.totalRegistrations}</div>
                                                <div className="text-xs text-slate-700">Total</div>
                                            </div>
                                            <div className="p-2 bg-green-50 rounded">
                                                <div className="font-semibold text-green-900">{stats.checkedIn}</div>
                                                <div className="text-xs text-green-700">Checked In</div>
                                            </div>
                                            <div className="p-2 bg-purple-50 rounded">
                                                <div className="font-semibold text-purple-900">{stats.newRegistrants}</div>
                                                <div className="text-xs text-purple-700">New</div>
                                            </div>
                                            <div className="p-2 bg-orange-50 rounded">
                                                <div className="font-semibold text-orange-900">{stats.returning}</div>
                                                <div className="text-xs text-orange-700">Returning</div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-2 text-sm text-muted-foreground">
                                            No registrations yet
                                        </div>
                                    )}

                                    {/* Quick Actions */}
                                    <div className="space-y-2 pt-2 border-t" onClick={(event) => event.stopPropagation()}>
                                        <div className="grid grid-cols-2 gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => router.push(`/admin/camp-meeting/registrations?year=${year.id}`)}
                                                className="w-full"
                                            >
                                                <Users className="mr-2 h-3 w-3" />
                                                View
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => router.push(`/admin/camp-meeting/analytics?year=${year.id}`)}
                                                className="w-full"
                                            >
                                                <BarChart3 className="mr-2 h-3 w-3" />
                                                Analytics
                                            </Button>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => router.push(`/admin/camp-meeting/import?year=${year.id}`)}
                                            className="w-full"
                                        >
                                            <Upload className="mr-2 h-3 w-3" />
                                            Import Data
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => router.push(`/admin/camp-meeting/years/${year.id}`)}
                                            className="w-full"
                                        >
                                            <Sparkles className="mr-2 h-3 w-3" />
                                            Year intelligence hub
                                        </Button>
                                    </div>

                                    {/* Management Actions */}
                                    <div className="flex gap-2 pt-2 border-t" onClick={(event) => event.stopPropagation()}>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1"
                                            onClick={() => openEditDialog(year)}
                                        >
                                            <Edit className="mr-2 h-3 w-3" /> Edit
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1"
                                            onClick={() => toggleRegistration(year.id, year.registration_open)}
                                        >
                                            {year.registration_open ? (
                                                <>
                                                    <Lock className="mr-2 h-3 w-3" /> Close
                                                </>
                                            ) : (
                                                <>
                                                    <Unlock className="mr-2 h-3 w-3" /> Open
                                                </>
                                            )}
                                        </Button>
                                    </div>

                                    <div onClick={(event) => event.stopPropagation()}>
                                    {year.is_active ? (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full border-amber-300 text-amber-900 hover:bg-amber-50"
                                            onClick={() => deactivateYear(year.id)}
                                        >
                                            Deactivate year
                                        </Button>
                                    ) : (
                                        <Button
                                            variant="default"
                                            size="sm"
                                            className="w-full"
                                            onClick={() => setActiveYear(year.id)}
                                        >
                                            <Settings className="mr-2 h-3 w-3" />
                                            Set as Active
                                        </Button>
                                    )}
                                    </div>

                                    <div onClick={(event) => event.stopPropagation()}>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full border-red-200 text-red-700 hover:bg-red-50"
                                            onClick={() => openDeleteDialog(year)}
                                        >
                                            <Trash2 className="mr-2 h-3 w-3" />
                                            Delete year
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>

                {years.length === 0 && (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground text-lg mb-2">No camp years found</p>
                            <p className="text-sm text-muted-foreground mb-4">Create your first camp year to get started</p>
                            <Button onClick={openCreateDialog}>
                                <Plus className="mr-2 h-4 w-4" /> Create First Camp Year
                            </Button>
                        </CardContent>
                    </Card>
                )}

                <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Delete camp year {deleteTarget?.year}?</DialogTitle>
                            <DialogDescription>
                                This permanently removes the camp year and all associated data: registrations,
                                follow-up notes, activities, communications, and any registration forms linked
                                to this year. This cannot be undone.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-2">
                            <Label htmlFor="delete_confirm_year">
                                Type <strong>{deleteTarget?.year}</strong> to confirm
                            </Label>
                            <Input
                                id="delete_confirm_year"
                                inputMode="numeric"
                                value={deleteConfirmValue}
                                onChange={(e) => setDeleteConfirmValue(e.target.value)}
                                placeholder={deleteTarget ? String(deleteTarget.year) : ''}
                            />
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setDeleteTarget(null)}
                                disabled={deleting}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                variant="destructive"
                                onClick={() => void confirmDeleteYear()}
                                disabled={
                                    deleting ||
                                    !deleteTarget ||
                                    Number(deleteConfirmValue) !== deleteTarget.year
                                }
                            >
                                {deleting ? 'Deleting…' : `Delete ${deleteTarget?.year}`}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    )
}
