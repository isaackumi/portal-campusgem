'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { campService } from '@/lib/services/camp-service'
import { getActiveCampYear } from '@/lib/actions/camp'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading'
import { CheckCircle, XCircle, Users, TrendingUp, Clock, ArrowLeft, RefreshCw, QrCode as QrCodeIcon } from 'lucide-react'
import { CampRegistration, CampYear } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/components/providers'
import { cn } from '@/lib/utils'

interface CheckInStats {
    totalRegistrations: number
    checkedInToday: number
    checkedInTotal: number
    percentage: number
}

interface RecentCheckIn {
    id: string
    full_name: string
    role: string
    checked_in_at: string
    qr_code: string
}

export default function CampScannerPage() {
    const router = useRouter()
    const { toast } = useToast()
    const { user } = useAuth()
    const [campYear, setCampYear] = useState<CampYear | null>(null)
    const [scanResult, setScanResult] = useState<{ success: boolean; message: string; data?: CampRegistration } | null>(null)
    const [stats, setStats] = useState<CheckInStats>({
        totalRegistrations: 0,
        checkedInToday: 0,
        checkedInTotal: 0,
        percentage: 0
    })
    const [recentCheckIns, setRecentCheckIns] = useState<RecentCheckIn[]>([])
    const [loading, setLoading] = useState(true)
    const [scanning, setScanning] = useState(false)
    const scannerRef = useRef<Html5QrcodeScanner | null>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const lastScannedRef = useRef<string | null>(null)

    useEffect(() => {
        loadCampYear()
        loadStats()
        loadRecentCheckIns()
        setupAudio()
        
        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(console.error)
            }
        }
    }, [])

    useEffect(() => {
        if (campYear && !scannerRef.current && !scanning) {
            initializeScanner()
        }
    }, [campYear, scanning])

    async function loadCampYear() {
        const { data } = await getActiveCampYear()
        if (data) {
            setCampYear(data)
        }
        setLoading(false)
    }

    async function loadStats() {
        if (!campYear) return
        
        try {
            const { data: registrations } = await campService.getCampRegistrations(campYear.id)
            if (registrations) {
                const today = new Date().toISOString().split('T')[0]
                const total = registrations.length
                const checkedInTotal = registrations.filter(r => r.status === 'checked_in').length
                
                // Get registrations checked in today (based on updated_at)
                const todayCheckIns = registrations.filter(r => {
                    if (r.status !== 'checked_in') return false
                    const updatedDate = new Date(r.updated_at).toISOString().split('T')[0]
                    return updatedDate === today
                }).length
                
                setStats({
                    totalRegistrations: total,
                    checkedInToday: todayCheckIns,
                    checkedInTotal,
                    percentage: total > 0 ? Math.round((checkedInTotal / total) * 100) : 0
                })
            }
        } catch (error) {
            console.error('Error loading stats:', error)
        }
    }

    async function loadRecentCheckIns(limit = 10) {
        if (!campYear) return
        
        try {
            const { data: registrations } = await campService.getCampRegistrations(campYear.id)
            if (registrations) {
                const checkedIn = registrations
                    .filter(r => r.status === 'checked_in')
                    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
                    .slice(0, limit)
                    .map(r => ({
                        id: r.id,
                        full_name: r.full_name || `${r.first_name} ${r.last_name}`,
                        role: r.role,
                        checked_in_at: r.updated_at,
                        qr_code: r.qr_code
                    }))
                
                setRecentCheckIns(checkedIn)
            }
        } catch (error) {
            console.error('Error loading recent check-ins:', error)
        }
    }

    function setupAudio() {
        // Create audio context for beep sounds
        audioRef.current = new Audio()
    }

    function playBeep(type: 'success' | 'error' | 'warning' = 'success') {
        try {
            // Use Web Audio API to generate beep sounds
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
            const oscillator = audioContext.createOscillator()
            const gainNode = audioContext.createGain()
            
            oscillator.connect(gainNode)
            gainNode.connect(audioContext.destination)
            
            // Different frequencies for different types
            oscillator.frequency.value = type === 'success' ? 800 : type === 'error' ? 400 : 600
            oscillator.type = 'sine'
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2)
            
            oscillator.start(audioContext.currentTime)
            oscillator.stop(audioContext.currentTime + 0.2)
        } catch (error) {
            console.log('Audio beep:', type)
        }
    }

    function initializeScanner() {
        const element = document.getElementById('reader')
        if (!element || scannerRef.current) return

        setScanning(true)
        const scanner = new Html5QrcodeScanner(
            "reader",
            {
                fps: 10,
                qrbox: { width: 280, height: 280 },
                aspectRatio: 1.0,
                disableFlip: false
            },
            false
        )

        scanner.render(onScanSuccess, onScanFailure)
        scannerRef.current = scanner
    }

    async function onScanSuccess(decodedText: string, decodedResult: any) {
        // Prevent duplicate scans within 2 seconds
        const now = Date.now()
        if (lastScannedRef.current === decodedText) {
            return
        }
        lastScannedRef.current = decodedText

        // Pause scanning
        if (scannerRef.current) {
            scannerRef.current.pause(true)
        }

        console.log('QR Code scanned:', decodedText)

        try {
            let qrCodeValue = decodedText
            try {
                const parsed = JSON.parse(decodedText)
                qrCodeValue = parsed.id || parsed.code || decodedText
            } catch {
                // use as is
            }

            const { data: registrations } = await campService.getCampRegistrations(campYear!.id)
            const registration = registrations?.find(
              r => r.qr_code === qrCodeValue || r.qr_code === decodedText || r.id === qrCodeValue
            )

            if (!registration) {
                setScanResult({
                    success: false,
                    message: 'Invalid QR Code. Participant not found in system.'
                })
                playBeep('error')
                toast({
                    variant: 'destructive',
                    title: 'Not Found',
                    description: 'This QR code is not registered.'
                })
            } else {
                // Check status
                if (registration.status === 'checked_in') {
                    setScanResult({
                        success: true,
                        message: 'Already Checked In!',
                        data: registration as CampRegistration
                    })
                    playBeep('warning')
                    toast({
                        title: 'Already Checked In',
                        description: `${registration.full_name || `${registration.first_name} ${registration.last_name}`} is already checked in.`,
                        variant: 'default'
                    })
                } else {
                    // Update status to checked_in
                    const { error: updateError } = await campService.updateRegistration(registration.id, {
                        status: 'checked_in',
                        updated_at: new Date().toISOString()
                    })
                    if (updateError) throw new Error(updateError)

                    // Log interaction (use current app user from auth context)
                    try {
                        if (user?.id) {
                            await campService.addInteraction({
                                registration_id: registration.id,
                                performed_by: user.id,
                                interaction_type: 'status_change',
                                notes: `Checked in via QR scanner`
                            })
                        }
                    } catch (err) {
                        console.log('Could not log interaction:', err)
                    }

                    const updatedRegistration = { ...registration, status: 'checked_in' } as CampRegistration
                    setScanResult({
                        success: true,
                        message: 'Check-in Successful!',
                        data: updatedRegistration
                    })
                    playBeep('success')
                    toast({
                        title: 'Check-in Successful',
                        description: `${registration.full_name || `${registration.first_name} ${registration.last_name}`} has been checked in.`,
                    })

                    // Refresh stats and recent check-ins
                    loadStats()
                    loadRecentCheckIns()
                }
            }
        } catch (err: any) {
            console.error('Check-in error:', err)
            setScanResult({ 
                success: false, 
                message: err.message || 'System error during check-in. Please try again.' 
            })
            playBeep('error')
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to process check-in. Please try again.'
            })
        }

        // Clear last scanned after 3 seconds to allow rescanning
        setTimeout(() => {
            lastScannedRef.current = null
        }, 3000)

        // Resume scanning after 2.5 seconds
        setTimeout(() => {
            setScanResult(null)
            if (scannerRef.current) {
                scannerRef.current.resume()
            }
        }, 2500)
    }

    function onScanFailure(error: any) {
        // Silently handle scan failures (usually just "no QR code found")
        // Only log actual errors
        if (error && !error.message?.includes('No QR')) {
            console.log('Scan error:', error)
        }
    }

    const handleManualCheckIn = () => {
        router.push('/admin/camp-meeting/registrations')
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <LoadingSpinner />
            </div>
        )
    }

    if (!campYear) {
        return (
            <div className="p-6 max-w-4xl mx-auto">
                <Card>
                    <CardContent className="py-12 text-center">
                        <p className="text-muted-foreground mb-4">No active camp year found.</p>
                        <Button onClick={() => router.push('/admin/camp-meeting/years')}>
                            Manage Camp Years
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

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
                            <h1 className="text-4xl font-bold tracking-tight text-gray-900">
                                Camp Check-In Scanner
                            </h1>
                            <p className="text-muted-foreground mt-1">
                                Camp Meeting {campYear.year} • {campYear.theme}
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={handleManualCheckIn}>
                            Manual Check-In
                        </Button>
                        <Button variant="outline" onClick={() => { loadStats(); loadRecentCheckIns() }}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Refresh
                        </Button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid gap-4 md:grid-cols-4">
                    <Card className="border-2">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                Total Registered
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-gray-900">{stats.totalRegistrations}</div>
                        </CardContent>
                    </Card>
                    <Card className="border-2">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                Checked In Total
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-green-600">{stats.checkedInTotal}</div>
                            <p className="text-xs text-gray-500 mt-1">
                                {stats.percentage}% Attendance
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="border-2">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                <Clock className="h-4 w-4 text-blue-600" />
                                Checked In Today
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-blue-600">{stats.checkedInToday}</div>
                            <p className="text-xs text-gray-500 mt-1">
                                Today's check-ins
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="border-2">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-purple-600" />
                                Remaining
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-purple-600">
                                {stats.totalRegistrations - stats.checkedInTotal}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                Still pending
                            </p>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Scanner - Main */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card className="border-2">
                            <CardHeader className="bg-gray-50 border-b">
                                <CardTitle className="flex items-center gap-2">
                                    <QrCodeIcon className="h-5 w-5" />
                                    QR Code Scanner
                                </CardTitle>
                                <CardDescription>
                                    Point camera at participant's QR code
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div id="reader" className="w-full"></div>
                                
                                {scanResult && (
                                    <div className={cn(
                                        "mt-6 p-4 rounded-lg border-2 transition-all",
                                        scanResult.success 
                                            ? "bg-green-50 border-green-500" 
                                            : "bg-red-50 border-red-500"
                                    )}>
                                        <div className="flex items-start gap-3">
                                            {scanResult.success ? (
                                                <CheckCircle className="h-6 w-6 text-green-600 mt-0.5" />
                                            ) : (
                                                <XCircle className="h-6 w-6 text-red-600 mt-0.5" />
                                            )}
                                            <div className="flex-1">
                                                <p className={cn(
                                                    "font-bold text-lg mb-2",
                                                    scanResult.success ? "text-green-800" : "text-red-800"
                                                )}>
                                                    {scanResult.message}
                                                </p>
                                                {scanResult.data && (
                                                    <div className="space-y-1 text-sm">
                                                        <p className="font-semibold text-gray-900">
                                                            {scanResult.data.full_name || `${scanResult.data.first_name} ${scanResult.data.last_name}`}
                                                        </p>
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant="outline" className="text-xs">
                                                                {scanResult.data.role}
                                                            </Badge>
                                                            {scanResult.data.is_new_registrant && (
                                                                <Badge variant="secondary" className="text-xs">
                                                                    New
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Recent Check-ins - Sidebar */}
                    <div className="space-y-6">
                        <Card className="border-2">
                            <CardHeader className="bg-gray-50 border-b">
                                <CardTitle className="flex items-center gap-2">
                                    <Clock className="h-5 w-5" />
                                    Recent Check-ins
                                </CardTitle>
                                <CardDescription>
                                    Last {recentCheckIns.length} check-ins
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6">
                                {recentCheckIns.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500 text-sm">
                                        No check-ins yet
                                    </div>
                                ) : (
                                    <div className="space-y-3 max-h-[600px] overflow-y-auto">
                                        {recentCheckIns.map((checkIn) => (
                                            <div
                                                key={checkIn.id}
                                                className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
                                            >
                                                <div className="flex items-start justify-between mb-1">
                                                    <p className="font-semibold text-sm text-gray-900 truncate">
                                                        {checkIn.full_name}
                                                    </p>
                                                    <Badge variant="default" className="text-xs ml-2">
                                                        <CheckCircle className="h-3 w-3 mr-1" />
                                                        In
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center justify-between text-xs text-gray-600">
                                                    <span className="truncate">{checkIn.role}</span>
                                                    <span>
                                                        {new Date(checkIn.checked_in_at).toLocaleTimeString('en-US', {
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    )
}
