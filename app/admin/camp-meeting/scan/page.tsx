'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { campService } from '@/lib/services/camp-service'
import { getActiveCampYear } from '@/lib/actions/camp'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  CheckCircle,
  XCircle,
  Users,
  TrendingUp,
  Clock,
  RefreshCw,
  QrCode as QrCodeIcon,
  Calendar,
} from 'lucide-react'
import { CampActivity, CampRegistration, CampSessionAttendance, CampYear } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/components/providers'
import { cn } from '@/lib/utils'
import { CampAdminPageHeader } from '@/components/camp/camp-admin-page-header'
import { CampManualCheckInPanel } from '@/components/camp/camp-manual-check-in-panel'
import { findCampRegistrationFromScan } from '@/lib/camp/resolve-registration-from-scan'
import {
  formatCampActivityLabel,
  mapRawCampActivity,
  sortCampActivities,
  suggestCampActivityId,
} from '@/lib/camp/activity-display'

interface RecentCheckIn {
  id: string
  full_name: string
  role: string
  checked_in_at: string
}

export default function CampScannerPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useAuth()
  const [campYear, setCampYear] = useState<CampYear | null>(null)
  const [activities, setActivities] = useState<CampActivity[]>([])
  const [selectedActivityId, setSelectedActivityId] = useState<string>('')
  const [scanResult, setScanResult] = useState<{
    success: boolean
    message: string
    data?: CampRegistration
  } | null>(null)
  const [registrations, setRegistrations] = useState<CampRegistration[]>([])
  const [sessionAttendances, setSessionAttendances] = useState<CampSessionAttendance[]>([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)
  const lastScannedRef = useRef<string | null>(null)

  const selectedActivity = useMemo(
    () => activities.find((a) => a.id === selectedActivityId) ?? null,
    [activities, selectedActivityId]
  )

  const sessionCheckedInIds = useMemo(
    () => new Set(sessionAttendances.map((row) => row.registration_id)),
    [sessionAttendances]
  )

  const sessionStats = useMemo(() => {
    const total = registrations.length
    const checkedInSession = sessionCheckedInIds.size
    return {
      totalRegistrations: total,
      checkedInSession,
      remaining: Math.max(0, total - checkedInSession),
      percentage: total > 0 ? Math.round((checkedInSession / total) * 100) : 0,
    }
  }, [registrations.length, sessionCheckedInIds])

  const loadSessionAttendances = useCallback(async (activityId: string) => {
    const { data } = await campService.getSessionAttendancesForActivity(activityId)
    setSessionAttendances(data ?? [])
  }, [])

  const loadRegistrations = useCallback(async (yearId: string) => {
    const { data: campRegs } = await campService.getCampRegistrations(yearId)
    if (campRegs) setRegistrations(campRegs)
  }, [])

  const loadActivities = useCallback(async (yearId: string) => {
    const { data } = await campService.getCampActivities(yearId)
    const mapped = (data ?? [])
      .map((row) => mapRawCampActivity(row as Record<string, unknown>))
      .filter((a): a is CampActivity => a != null)
    const sorted = sortCampActivities(mapped)
    setActivities(sorted)
    setSelectedActivityId((prev) => {
      if (prev && sorted.some((a) => a.id === prev)) return prev
      return suggestCampActivityId(sorted) ?? ''
    })
  }, [])

  const refreshCheckInData = useCallback(async () => {
    if (!campYear) return
    await loadRegistrations(campYear.id)
    if (selectedActivityId) {
      await loadSessionAttendances(selectedActivityId)
    }
  }, [campYear, loadRegistrations, loadSessionAttendances, selectedActivityId])

  useEffect(() => {
    async function loadCampYear() {
      const { data } = await getActiveCampYear()
      setCampYear(data ?? null)
      setLoading(false)
    }
    void loadCampYear()
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error)
      }
    }
  }, [])

  useEffect(() => {
    if (!campYear) return
    void loadRegistrations(campYear.id)
    void loadActivities(campYear.id)
  }, [campYear, loadRegistrations, loadActivities])

  useEffect(() => {
    if (!selectedActivityId) {
      setSessionAttendances([])
      return
    }
    void loadSessionAttendances(selectedActivityId)
  }, [selectedActivityId, loadSessionAttendances])

  useEffect(() => {
    if (campYear && selectedActivityId && !scannerRef.current && !scanning) {
      initializeScanner()
    }
  }, [campYear, selectedActivityId, scanning])

  function playBeep(type: 'success' | 'error' | 'warning' = 'success') {
    try {
      const audioContext = new (window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext!)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      oscillator.frequency.value = type === 'success' ? 800 : type === 'error' ? 400 : 600
      oscillator.type = 'sine'
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2)
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.2)
    } catch {
      // ignore
    }
  }

  function initializeScanner() {
    const element = document.getElementById('reader')
    if (!element || scannerRef.current) return

    setScanning(true)
    const scanner = new Html5QrcodeScanner(
      'reader',
      {
        fps: 10,
        qrbox: { width: 280, height: 280 },
        aspectRatio: 1.0,
        disableFlip: false,
      },
      false
    )

    scanner.render(onScanSuccess, onScanFailure)
    scannerRef.current = scanner
  }

  async function onScanSuccess(decodedText: string) {
    if (lastScannedRef.current === decodedText) return
    lastScannedRef.current = decodedText

    if (scannerRef.current) {
      scannerRef.current.pause(true)
    }

    if (!selectedActivityId) {
      setScanResult({
        success: false,
        message: 'Select a camp session before scanning.',
      })
      playBeep('error')
      toast({
        variant: 'destructive',
        title: 'No session selected',
        description: 'Choose the session you are checking people into.',
      })
    } else if (!user?.id) {
      setScanResult({ success: false, message: 'Sign in required to record check-ins.' })
      playBeep('error')
    } else {
      try {
        const registration = findCampRegistrationFromScan(registrations, decodedText)

        if (!registration) {
          setScanResult({
            success: false,
            message: 'Invalid QR code. Participant not found for this camp year.',
          })
          playBeep('error')
          toast({
            variant: 'destructive',
            title: 'Not found',
            description: 'This QR code is not registered.',
          })
        } else if (sessionCheckedInIds.has(registration.id)) {
          setScanResult({
            success: true,
            message: 'Already checked in to this session',
            data: registration,
          })
          playBeep('warning')
          toast({
            title: 'Already in session',
            description: `${registration.full_name || `${registration.first_name} ${registration.last_name}`} was already scanned for ${selectedActivity?.title ?? 'this session'}.`,
          })
        } else {
          const { data, error } = await campService.recordSessionCheckIn({
            activity_id: selectedActivityId,
            registration_id: registration.id,
            performed_by: user.id,
          })
          if (error || !data) throw new Error(error ?? 'Check-in failed')

          const updatedRegistration = (data.registration ?? registration) as CampRegistration
          if (data.attendance) {
            setSessionAttendances((prev) => [data.attendance!, ...prev.filter((row) => row.registration_id !== registration.id)])
          }
          setScanResult({
            success: true,
            message: data.already_checked_in
              ? 'Already checked in to this session'
              : 'Session check-in successful!',
            data: updatedRegistration,
          })
          playBeep(data.already_checked_in ? 'warning' : 'success')
          toast({
            title: data.already_checked_in ? 'Already in session' : 'Checked in',
            description: updatedRegistration.full_name || `${updatedRegistration.first_name} ${updatedRegistration.last_name}`,
          })
        }
      } catch (err: unknown) {
        setScanResult({
          success: false,
          message: err instanceof Error ? err.message : 'System error during check-in.',
        })
        playBeep('error')
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to process check-in. Please try again.',
        })
      }
    }

    setTimeout(() => {
      lastScannedRef.current = null
    }, 3000)

    setTimeout(() => {
      setScanResult(null)
      if (scannerRef.current) {
        scannerRef.current.resume()
      }
    }, 2500)
  }

  function onScanFailure(error: unknown) {
    if (error && typeof error === 'object' && 'message' in error) {
      const message = String((error as { message?: string }).message ?? '')
      if (!message.includes('No QR')) {
        console.log('Scan error:', error)
      }
    }
  }

  const recentCheckIns = useMemo((): RecentCheckIn[] => {
    const regById = new Map(registrations.map((r) => [r.id, r]))
    return sessionAttendances
      .map((attendance) => {
        const reg = regById.get(attendance.registration_id)
        if (!reg) return null
        return {
          id: attendance.id,
          full_name: reg.full_name || `${reg.first_name} ${reg.last_name}`,
          role: reg.role,
          checked_in_at: attendance.checked_in_at,
        }
      })
      .filter((row): row is RecentCheckIn => row != null)
      .slice(0, 12)
  }, [sessionAttendances, registrations])

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (!campYear) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="mb-4 text-muted-foreground">No active camp year found.</p>
            <Button onClick={() => router.push('/admin/camp-meeting/years')}>
              Manage camp years
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="mx-auto max-w-7xl space-y-6 p-6">
        <CampAdminPageHeader
          title="Camp session scanner"
          campYear={campYear}
          actions={
            <>
              <Button variant="outline" asChild>
                <Link href="/admin/camp-meeting/activities">Manage sessions</Link>
              </Button>
              <Button variant="outline" onClick={() => void refreshCheckInData()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </>
          }
        />

        <Card className="border-2 border-amber-200 bg-amber-50/40">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5 text-amber-700" />
              Active session
            </CardTitle>
            <CardDescription>
              Protocol scans the same printed QR at every session. Pick the session you are
              checking people into before scanning.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-700">
                  No camp sessions yet. Create worship, teaching, and meal sessions first.
                </p>
                <Button asChild>
                  <Link href="/admin/camp-meeting/activities">Add sessions</Link>
                </Button>
              </div>
            ) : (
              <Select value={selectedActivityId} onValueChange={setSelectedActivityId}>
                <SelectTrigger className="min-h-11 bg-white text-base">
                  <SelectValue placeholder="Select session…" />
                </SelectTrigger>
                <SelectContent>
                  {activities.map((activity) => (
                    <SelectItem key={activity.id} value={activity.id}>
                      {formatCampActivityLabel(activity)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-2">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Users className="h-4 w-4" />
                Registered
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{sessionStats.totalRegistrations}</div>
            </CardContent>
          </Card>
          <Card className="border-2">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <CheckCircle className="h-4 w-4 text-green-600" />
                In this session
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{sessionStats.checkedInSession}</div>
              <p className="mt-1 text-xs text-slate-500">{sessionStats.percentage}% of campers</p>
            </CardContent>
          </Card>
          <Card className="border-2">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Clock className="h-4 w-4 text-primary" />
                Session
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="line-clamp-2 text-sm font-semibold text-slate-900">
                {selectedActivity?.title ?? '—'}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {selectedActivity?.date ?? 'Select a session'}
              </p>
            </CardContent>
          </Card>
          <Card className="border-2">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <TrendingUp className="h-4 w-4 text-purple-600" />
                Not yet in session
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">{sessionStats.remaining}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card className="border-2">
              <CardHeader className="border-b bg-slate-50">
                <CardTitle className="flex items-center gap-2">
                  <QrCodeIcon className="h-5 w-5" />
                  QR scanner
                </CardTitle>
                <CardDescription>
                  {selectedActivityId
                    ? `Scanning for ${selectedActivity?.title ?? 'selected session'}`
                    : 'Select a session above to enable scanning'}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {!selectedActivityId ? (
                  <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 py-16 text-center text-sm text-slate-600">
                    Choose a camp session to start scanning printed QR codes.
                  </div>
                ) : (
                  <div id="reader" className="w-full" />
                )}

                {scanResult ? (
                  <div
                    className={cn(
                      'mt-6 rounded-lg border-2 p-4 transition-all',
                      scanResult.success
                        ? 'border-green-500 bg-green-50'
                        : 'border-red-500 bg-red-50'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {scanResult.success ? (
                        <CheckCircle className="mt-0.5 h-6 w-6 text-green-600" />
                      ) : (
                        <XCircle className="mt-0.5 h-6 w-6 text-red-600" />
                      )}
                      <div className="flex-1">
                        <p
                          className={cn(
                            'mb-2 text-lg font-bold',
                            scanResult.success ? 'text-green-800' : 'text-red-800'
                          )}
                        >
                          {scanResult.message}
                        </p>
                        {scanResult.data ? (
                          <div className="space-y-1 text-sm">
                            <p className="font-semibold text-slate-900">
                              {scanResult.data.full_name ||
                                `${scanResult.data.first_name} ${scanResult.data.last_name}`}
                            </p>
                            <Badge variant="outline" className="text-xs">
                              {scanResult.data.role}
                            </Badge>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <CampManualCheckInPanel
              campYearId={campYear.id}
              registrations={registrations}
              activityId={selectedActivityId || undefined}
              sessionCheckedInIds={sessionCheckedInIds}
              performedByUserId={user?.id}
              onCheckInComplete={() => void refreshCheckInData()}
            />
          </div>

          <div className="space-y-6">
            <Card className="border-2">
              <CardHeader className="border-b bg-slate-50">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Session check-ins
                </CardTitle>
                <CardDescription>
                  {sessionStats.checkedInSession} checked in to this session
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {recentCheckIns.length === 0 ? (
                  <div className="py-8 text-center text-sm text-slate-500">No check-ins yet</div>
                ) : (
                  <div className="max-h-[600px] space-y-3 overflow-y-auto">
                    {recentCheckIns.map((checkIn) => (
                      <div
                        key={checkIn.id}
                        className="rounded-lg border border-slate-200 bg-slate-50 p-3 transition-colors hover:bg-gray-100"
                      >
                        <div className="mb-1 flex items-start justify-between">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {checkIn.full_name}
                          </p>
                          <Badge variant="default" className="ml-2 text-xs">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            In
                          </Badge>
                        </div>
                        <p className="truncate text-xs text-slate-600">{checkIn.role}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(checkIn.checked_in_at).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
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
