'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { campService } from '@/lib/services/camp-service'
import { ensureDailyCampSessionsAction, getActiveCampYear } from '@/lib/actions/camp'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { LoadingSpinner } from '@/components/ui/loading'
import {
  CheckCircle,
  XCircle,
  Users,
  Clock,
  RefreshCw,
  QrCode as QrCodeIcon,
  Hash,
  AlertTriangle,
  Sunrise,
  Sun,
  Moon,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { CampActivity, CampRegistration, CampSessionAttendance, CampYear } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/components/providers'
import { cn } from '@/lib/utils'
import { CampManualCheckInPanel } from '@/components/camp/camp-manual-check-in-panel'
import { CampQuickCodeCheckIn } from '@/components/camp/camp-quick-code-check-in'
import { findCampRegistrationFromScan } from '@/lib/camp/resolve-registration-from-scan'
import { mapRawCampActivity, sortCampActivities } from '@/lib/camp/activity-display'
import {
  CAMP_DAILY_SESSION_META,
  CAMP_DAILY_SESSION_PERIODS,
  type CampDailySessionPeriod,
  isSuggestedDailySessionPeriod,
  matchDailySessionPeriod,
  suggestDailySessionPeriod,
  todayIsoDate,
} from '@/lib/camp/daily-sessions'
import { formatRelativeWhen } from '@/lib/camp/relative-time'

interface RecentCheckIn {
  id: string
  full_name: string
  role: string
  checked_in_at: string
}

const PERIOD_ICONS: Record<CampDailySessionPeriod, typeof Sunrise> = {
  morning: Sunrise,
  afternoon: Sun,
  evening: Moon,
}

export default function CampScannerPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useAuth()
  const [campYear, setCampYear] = useState<CampYear | null>(null)
  const [activities, setActivities] = useState<CampActivity[]>([])
  const [selectedActivityId, setSelectedActivityId] = useState<string>('')
  const [sessionDate, setSessionDate] = useState(todayIsoDate)
  const [ensuringSessions, setEnsuringSessions] = useState(false)
  const [periodOverride, setPeriodOverride] = useState(false)
  const [showMoreTools, setShowMoreTools] = useState(false)
  const [moreTool, setMoreTool] = useState<'code' | 'qr' | 'arrival'>('code')
  const [suggestedPeriod, setSuggestedPeriod] = useState<CampDailySessionPeriod>(() =>
    suggestDailySessionPeriod()
  )
  const [scanResult, setScanResult] = useState<{
    success: boolean
    message: string
    data?: CampRegistration
  } | null>(null)
  const [registrations, setRegistrations] = useState<CampRegistration[]>([])
  const [sessionAttendances, setSessionAttendances] = useState<CampSessionAttendance[]>([])
  const [loading, setLoading] = useState(true)
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)
  const lastScannedRef = useRef<string | null>(null)

  const selectedActivity = useMemo(
    () => activities.find((a) => a.id === selectedActivityId) ?? null,
    [activities, selectedActivityId]
  )

  const dailySessionsForDate = useMemo(() => {
    const byPeriod = new Map<CampDailySessionPeriod, CampActivity>()
    for (const activity of activities) {
      if (activity.date !== sessionDate) continue
      const period = matchDailySessionPeriod(activity)
      if (period && !byPeriod.has(period)) byPeriod.set(period, activity)
    }
    return byPeriod
  }, [activities, sessionDate])

  const selectedPeriod = useMemo(
    () => (selectedActivity ? matchDailySessionPeriod(selectedActivity) : null),
    [selectedActivity]
  )

  const sessionCheckedInIds = useMemo(
    () => new Set(sessionAttendances.map((row) => row.registration_id)),
    [sessionAttendances]
  )

  const activeCampers = useMemo(
    () => registrations.filter((r) => r.status !== 'cancelled'),
    [registrations]
  )

  const sessionStats = useMemo(() => {
    const total = activeCampers.length
    const checkedInSession = activeCampers.filter((r) => sessionCheckedInIds.has(r.id)).length
    return {
      totalRegistrations: total,
      checkedInSession,
      remaining: Math.max(0, total - checkedInSession),
      percentage: total > 0 ? Math.round((checkedInSession / total) * 100) : 0,
    }
  }, [activeCampers, sessionCheckedInIds])

  const missingCampers = useMemo(
    () =>
      activeCampers
        .filter((r) => !sessionCheckedInIds.has(r.id))
        .sort((a, b) =>
          (a.full_name || `${a.first_name} ${a.last_name}`).localeCompare(
            b.full_name || `${b.first_name} ${b.last_name}`
          )
        ),
    [activeCampers, sessionCheckedInIds]
  )

  const loadSessionAttendances = useCallback(async (activityId: string) => {
    const { data } = await campService.getSessionAttendancesForActivity(activityId)
    setSessionAttendances(data ?? [])
  }, [])

  const loadRegistrations = useCallback(async (yearId: string) => {
    const { data: campRegs } = await campService.getCampRegistrations(yearId)
    if (campRegs) setRegistrations(campRegs)
  }, [])

  const applySuggestedPeriod = useCallback(
    (list: CampActivity[], date: string, suggested: CampDailySessionPeriod) => {
      const byPeriod = new Map<CampDailySessionPeriod, CampActivity>()
      for (const activity of list) {
        if (activity.date !== date) continue
        const period = matchDailySessionPeriod(activity)
        if (period && !byPeriod.has(period)) byPeriod.set(period, activity)
      }
      const pick =
        byPeriod.get(suggested) ??
        CAMP_DAILY_SESSION_PERIODS.map((p) => byPeriod.get(p)).find(Boolean) ??
        list.find((a) => a.date === date) ??
        list[0]
      return pick?.id ?? ''
    },
    []
  )

  const loadActivities = useCallback(
    async (yearId: string, date: string, opts?: { keepOverride?: boolean }) => {
      const { data } = await campService.getCampActivities(yearId)
      const mapped = (data ?? [])
        .map((row) => mapRawCampActivity(row as Record<string, unknown>))
        .filter((a): a is CampActivity => a != null)
      const sorted = sortCampActivities(mapped)
      setActivities(sorted)
      const suggested = suggestDailySessionPeriod()
      setSuggestedPeriod(suggested)
      setSelectedActivityId((prev) => {
        if (opts?.keepOverride && periodOverride && prev && sorted.some((a) => a.id === prev)) {
          return prev
        }
        return applySuggestedPeriod(sorted, date, suggested)
      })
    },
    [applySuggestedPeriod, periodOverride]
  )

  const ensureDailySessions = useCallback(
    async (yearId: string, date: string, notify = false) => {
      setEnsuringSessions(true)
      try {
        const { data, error } = await ensureDailyCampSessionsAction({
          camp_year_id: yearId,
          date,
        })
        if (notify) {
          if (error) {
            toast({
              variant: 'destructive',
              title: 'Could not prepare daily sessions',
              description: error,
            })
          } else if (data && data.created > 0) {
            toast({
              title: 'Daily sessions ready',
              description: `Created ${data.created} session${data.created === 1 ? '' : 's'} for ${date}.`,
            })
          }
        }
        await loadActivities(yearId, date)
      } finally {
        setEnsuringSessions(false)
      }
    },
    [loadActivities, toast]
  )

  const refreshCheckInData = useCallback(async () => {
    if (!campYear) return
    await loadRegistrations(campYear.id)
    if (selectedActivityId) {
      await loadSessionAttendances(selectedActivityId)
    }
  }, [campYear, loadRegistrations, loadSessionAttendances, selectedActivityId])

  function selectPeriod(period: CampDailySessionPeriod) {
    const activity = dailySessionsForDate.get(period)
    if (!activity) return
    const suggested = suggestDailySessionPeriod()
    setSuggestedPeriod(suggested)
    setPeriodOverride(period !== suggested)
    setSelectedActivityId(activity.id)
    if (period !== suggested) {
      toast({
        title: `Switched to ${CAMP_DAILY_SESSION_META[period].label}`,
        description: `Clock suggests ${CAMP_DAILY_SESSION_META[suggested].label} right now. Double-check before marking people present.`,
      })
    }
  }

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
    setPeriodOverride(false)
    void loadRegistrations(campYear.id)
    void ensureDailySessions(campYear.id, sessionDate)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campYear, sessionDate])

  // Re-align to clock when user has not manually overridden
  useEffect(() => {
    if (!campYear || periodOverride) return
    const tick = () => {
      const next = suggestDailySessionPeriod()
      setSuggestedPeriod(next)
      const activity = dailySessionsForDate.get(next)
      if (activity && selectedActivityId !== activity.id) {
        setSelectedActivityId(activity.id)
      }
    }
    tick()
    const id = window.setInterval(tick, 60_000)
    return () => window.clearInterval(id)
  }, [campYear, periodOverride, dailySessionsForDate, selectedActivityId])

  useEffect(() => {
    if (!selectedActivityId) {
      setSessionAttendances((prev) => (prev.length === 0 ? prev : []))
      return
    }
    void loadSessionAttendances(selectedActivityId)
  }, [selectedActivityId, loadSessionAttendances])

  useEffect(() => {
    if (!campYear || !selectedActivityId || moreTool !== 'qr' || !showMoreTools) return

    const element = document.getElementById('reader')
    if (!element) return

    let cancelled = false
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

    return () => {
      cancelled = true
      scanner.clear().catch(() => {})
      if (scannerRef.current === scanner) {
        scannerRef.current = null
      }
      void cancelled
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campYear, selectedActivityId, moreTool, showMoreTools])

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
        } else if (sessionCheckedInIds.has(registration.id)) {
          setScanResult({
            success: true,
            message: 'Already checked in to this session',
            data: registration,
          })
          playBeep('warning')
        } else {
          const { data, error } = await campService.recordSessionCheckIn({
            activity_id: selectedActivityId,
            registration_id: registration.id,
            performed_by: user.id,
            check_in_method: 'qr',
          })
          if (error || !data) throw new Error(error ?? 'Check-in failed')

          const updatedRegistration = (data.registration ?? registration) as CampRegistration
          if (data.attendance) {
            setSessionAttendances((prev) => [
              data.attendance!,
              ...prev.filter((row) => row.registration_id !== registration.id),
            ])
          }
          setScanResult({
            success: true,
            message: data.already_checked_in
              ? 'Already checked in to this session'
              : 'Session check-in successful!',
            data: updatedRegistration,
          })
          playBeep(data.already_checked_in ? 'warning' : 'success')
        }
      } catch (err: unknown) {
        setScanResult({
          success: false,
          message: err instanceof Error ? err.message : 'System error during check-in.',
        })
        playBeep('error')
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

  const sessionLabel = selectedPeriod
    ? CAMP_DAILY_SESSION_META[selectedPeriod].label
    : selectedActivity?.title ?? 'Session'
  const outsideUsualHours =
    selectedPeriod != null && !isSuggestedDailySessionPeriod(selectedPeriod)

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (!campYear) {
    return (
      <div className="mx-auto max-w-lg p-4">
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
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-lg space-y-4 p-4 pb-16 sm:max-w-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Camp check-in</h1>
            <p className="text-sm text-slate-600">{campYear.year} · presence by session</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="min-h-10 shrink-0"
            disabled={ensuringSessions}
            onClick={() => {
              setPeriodOverride(false)
              void ensureDailySessions(campYear.id, sessionDate, true)
              void refreshCheckInData()
            }}
          >
            <RefreshCw className={cn('h-4 w-4', ensuringSessions && 'animate-spin')} />
          </Button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <label htmlFor="session-date" className="text-sm font-medium text-slate-700">
              Camp day
            </label>
            <Input
              id="session-date"
              type="date"
              value={sessionDate}
              onChange={(e) => {
                setPeriodOverride(false)
                setSessionDate(e.target.value || todayIsoDate())
              }}
              className="h-10 w-[10.5rem] bg-white"
            />
          </div>

          <p className="mb-2 text-xs text-slate-500">
            Auto: Morning until 12:00 · Afternoon until 17:00 · Evening after 17:00
          </p>

          <div className="grid grid-cols-3 gap-2">
            {CAMP_DAILY_SESSION_PERIODS.map((period) => {
              const meta = CAMP_DAILY_SESSION_META[period]
              const activity = dailySessionsForDate.get(period)
              const Icon = PERIOD_ICONS[period]
              const isSelected = selectedActivityId === activity?.id
              const isSuggested = period === suggestedPeriod
              return (
                <button
                  key={period}
                  type="button"
                  disabled={!activity || ensuringSessions}
                  onClick={() => selectPeriod(period)}
                  className={cn(
                    'rounded-xl border-2 p-3 text-left transition-colors',
                    isSelected
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : isSuggested
                        ? 'border-emerald-400 bg-emerald-50'
                        : 'border-slate-200 bg-white',
                    (!activity || ensuringSessions) && 'opacity-50'
                  )}
                >
                  <Icon className={cn('mb-1 h-4 w-4', isSelected ? 'text-white' : 'text-slate-700')} />
                  <div className={cn('text-sm font-semibold', isSelected ? 'text-white' : 'text-slate-900')}>
                    {meta.label}
                  </div>
                  <div className={cn('text-[11px]', isSelected ? 'text-slate-300' : 'text-slate-500')}>
                    {meta.hint}
                  </div>
                </button>
              )
            })}
          </div>

          {outsideUsualHours ? (
            <div className="mt-3 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Clock suggests <strong>{CAMP_DAILY_SESSION_META[suggestedPeriod].label}</strong> now.
                You overrode to <strong>{sessionLabel}</strong>.
              </span>
            </div>
          ) : (
            <p className="mt-3 text-sm text-emerald-800">
              Checking into <strong>{sessionLabel}</strong> (auto-selected for now).
            </p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl border bg-white p-3 text-center">
            <div className="text-2xl font-bold text-slate-900">{sessionStats.totalRegistrations}</div>
            <div className="text-xs text-slate-500">At camp</div>
          </div>
          <div className="rounded-xl border bg-white p-3 text-center">
            <div className="text-2xl font-bold text-green-600">{sessionStats.checkedInSession}</div>
            <div className="text-xs text-slate-500">Present</div>
          </div>
          <div className="rounded-xl border bg-white p-3 text-center">
            <div className="text-2xl font-bold text-rose-600">{sessionStats.remaining}</div>
            <div className="text-xs text-slate-500">Missing</div>
          </div>
        </div>

        <CampManualCheckInPanel
          simple
          campYearId={campYear.id}
          registrations={registrations}
          activityId={selectedActivityId || undefined}
          sessionCheckedInIds={sessionCheckedInIds}
          performedByUserId={user?.id}
          checkInMethod="manual"
          sessionLabel={sessionLabel}
          onCheckInComplete={() => void refreshCheckInData()}
        />

        <button
          type="button"
          className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700"
          onClick={() => setShowMoreTools((v) => !v)}
        >
          <span>More tools (code, QR, arrival)</span>
          {showMoreTools ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {showMoreTools ? (
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-3">
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'code' as const, label: 'Code', icon: Hash },
                  { id: 'qr' as const, label: 'QR', icon: QrCodeIcon },
                  { id: 'arrival' as const, label: 'Arrival', icon: Users },
                ] as const
              ).map((tool) => (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => setMoreTool(tool.id)}
                  className={cn(
                    'flex min-h-11 items-center justify-center gap-1.5 rounded-lg border text-sm font-medium',
                    moreTool === tool.id
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-slate-50 text-slate-700'
                  )}
                >
                  <tool.icon className="h-4 w-4" />
                  {tool.label}
                </button>
              ))}
            </div>

            {moreTool === 'code' ? (
              <CampQuickCodeCheckIn
                registrations={registrations}
                activityId={selectedActivityId || undefined}
                sessionCheckedInIds={sessionCheckedInIds}
                performedByUserId={user?.id}
                onCheckInComplete={() => void refreshCheckInData()}
              />
            ) : null}

            {moreTool === 'qr' ? (
              <Card className="border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">QR scanner</CardTitle>
                  <CardDescription>
                    {selectedActivityId
                      ? `Scanning for ${sessionLabel}`
                      : 'Select a session first'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!selectedActivityId ? (
                    <p className="py-8 text-center text-sm text-slate-500">Select a session first.</p>
                  ) : (
                    <div id="reader" className="w-full" />
                  )}
                  {scanResult ? (
                    <div
                      className={cn(
                        'mt-4 rounded-lg border-2 p-3',
                        scanResult.success
                          ? 'border-green-500 bg-green-50'
                          : 'border-red-500 bg-red-50'
                      )}
                    >
                      <div className="flex items-start gap-2">
                        {scanResult.success ? (
                          <CheckCircle className="mt-0.5 h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="mt-0.5 h-5 w-5 text-red-600" />
                        )}
                        <div>
                          <p className="font-semibold">{scanResult.message}</p>
                          {scanResult.data ? (
                            <p className="text-sm">
                              {scanResult.data.full_name ||
                                `${scanResult.data.first_name} ${scanResult.data.last_name}`}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ) : null}

            {moreTool === 'arrival' ? (
              <CampManualCheckInPanel
                campYearId={campYear.id}
                registrations={registrations}
                performedByUserId={user?.id}
                checkInMethod="arrival"
                onCheckInComplete={() => void refreshCheckInData()}
              />
            ) : null}
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <Card className="border">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4" /> Present
              </CardTitle>
              <CardDescription>{sessionStats.checkedInSession} this session</CardDescription>
            </CardHeader>
            <CardContent>
              {recentCheckIns.length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-500">No check-ins yet</p>
              ) : (
                <ul className="max-h-64 space-y-2 overflow-y-auto">
                  {recentCheckIns.map((checkIn) => {
                    const when = formatRelativeWhen(checkIn.checked_in_at)
                    return (
                      <li key={checkIn.id} className="rounded-lg border bg-slate-50 px-3 py-2">
                        <p className="truncate text-sm font-semibold">{checkIn.full_name}</p>
                        <p className="text-xs text-slate-500" title={when.absolute}>
                          {when.absoluteTime}
                          {when.relative ? ` · ${when.relative}` : ''}
                        </p>
                      </li>
                    )
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="border border-rose-200">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base text-rose-900">
                <AlertTriangle className="h-4 w-4" /> Missing
              </CardTitle>
              <CardDescription>Not yet marked for {sessionLabel}</CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedActivityId ? (
                <p className="py-4 text-center text-sm text-slate-500">Select a session</p>
              ) : missingCampers.length === 0 ? (
                <p className="py-4 text-center text-sm text-green-700">Everyone present</p>
              ) : (
                <ul className="max-h-64 space-y-2 overflow-y-auto">
                  {missingCampers.slice(0, 40).map((reg) => (
                    <li key={reg.id} className="rounded-lg border border-rose-100 px-3 py-2">
                      <p className="truncate text-sm font-medium">
                        {reg.full_name || `${reg.first_name} ${reg.last_name}`}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {reg.role}
                        {reg.phone ? ` · ${reg.phone}` : ''}
                      </p>
                    </li>
                  ))}
                  {missingCampers.length > 40 ? (
                    <li className="text-center text-xs text-slate-500">
                      +{missingCampers.length - 40} more
                    </li>
                  ) : null}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <p className="text-center text-xs text-slate-500">
          <Link href="/admin/camp-meeting/activities" className="underline">
            Manage sessions
          </Link>
          {' · '}
          <Link href="/admin/camp-meeting/rooms" className="underline">
            Rooms
          </Link>
        </p>
      </div>
    </div>
  )
}
