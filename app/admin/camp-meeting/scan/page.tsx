'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { checkInError } from '@/convex/lib/states/campRegistration'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CameraQrScanner } from '@/components/camera-qr-scanner'
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
  CloudOff,
  UploadCloud,
} from 'lucide-react'
import { CampActivity, CampRegistration, CampSessionAttendance, CampYear } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/components/providers'
import { cn } from '@/lib/utils'
import { CampManualCheckInPanel } from '@/components/camp/camp-manual-check-in-panel'
import { CampQuickCodeCheckIn } from '@/components/camp/camp-quick-code-check-in'
import { PhoneLink, QuickContactButtons } from '@/components/contact/phone-link'
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
import { recordCampCheckInOrQueue, useCampOfflineQueue } from '@/components/camp/use-camp-offline-queue'
import { queuedRegistrationIds } from '@/lib/camp/offline-checkin-queue'
import { loadCampDeskSnapshot, saveCampDeskSnapshot } from '@/lib/camp/offline-lookup-cache'

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
  /**
   * Who is already in a session, tagged with the session it was loaded for. Only the list for the
   * selected session counts, so a slow or offline load can never pass one session's list off as
   * another's ("Already checked in" for someone who isn't).
   */
  const [attendanceState, setAttendanceState] = useState<{ activityId: string; rows: CampSessionAttendance[] }>({ activityId: '', rows: [] })
  const [loading, setLoading] = useState(true)
  const [scanPaused, setScanPaused] = useState(false)
  const lastScannedRef = useRef<string | null>(null)
  /** True while a scan is being saved: later reads wait their turn (no two check-ins at once). */
  const scanBusyRef = useRef(false)
  /** The current scan's "clear the result" timers, cancelled when the next scan starts. */
  const scanTimersRef = useRef<number[]>([])
  /** Set when the desk data came from this phone's cache (loaded offline). */
  const [cachedAt, setCachedAt] = useState<number | null>(null)
  const refreshRef = useRef<() => void>(() => {})

  const offline = useCampOfflineQueue({
    autoSync: true,
    onSynced: (summary) => {
      if (summary.synced > 0) {
        toast({
          title: 'Synced',
          description: `${summary.synced} check-in${summary.synced === 1 ? '' : 's'} saved on this phone ${summary.synced === 1 ? 'is' : 'are'} now on the server.`,
        })
      }
      if (summary.failed > 0) {
        toast({
          variant: 'destructive',
          title: 'Some check-ins could not sync',
          description: `${summary.failed} need attention. See the list on this page.`,
        })
      }
      refreshRef.current()
    },
  })

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

  const queuedIds = useMemo(
    () => queuedRegistrationIds(offline.queue, selectedActivityId),
    [offline.queue, selectedActivityId]
  )

  // Saved-on-this-phone check-ins count as present so nobody is queued twice.
  const sessionAttendances = useMemo(
    () => (attendanceState.activityId === selectedActivityId ? attendanceState.rows : []),
    [attendanceState, selectedActivityId]
  )
  const selectedActivityRef = useRef(selectedActivityId)
  selectedActivityRef.current = selectedActivityId

  const sessionCheckedInIds = useMemo(
    () => new Set([...sessionAttendances.map((row) => row.registration_id), ...Array.from(queuedIds)]),
    [sessionAttendances, queuedIds]
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
    const { data, error } = await campService.getSessionAttendancesForActivity(activityId)
    // Offline: keep what is on screen for this session rather than wiping it. A reply for a
    // session that is no longer selected is dropped.
    if (!error && selectedActivityRef.current === activityId) setAttendanceState({ activityId, rows: data ?? [] })
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
      const { data, error } = await campService.getCampActivities(yearId)
      if (error || !data) return // offline: keep the sessions already loaded
      const mapped = data
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
        }).catch(() => ({ data: null, error: navigator.onLine === false ? null : 'Could not reach the server.' }))
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
  refreshRef.current = () => void refreshCheckInData()

  // Online data → cache for offline lookups (id, name, code, phone per camper).
  useEffect(() => {
    if (!campYear || cachedAt != null || registrations.length === 0 || activities.length === 0) return
    void saveCampDeskSnapshot({ campYear, activities, registrations })
  }, [campYear, activities, registrations, cachedAt])

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
      try {
        if (navigator.onLine === false) throw new Error('offline')
        const { data } = await getActiveCampYear()
        setCampYear(data ?? null)
        setCachedAt(null)
      } catch {
        // Offline: fall back to the lookup list saved the last time this page loaded online.
        const snapshot = await loadCampDeskSnapshot()
        if (snapshot) {
          const sorted = sortCampActivities(snapshot.activities)
          setActivities(sorted)
          setRegistrations(snapshot.registrations)
          setSelectedActivityId(applySuggestedPeriod(sorted, todayIsoDate(), suggestDailySessionPeriod()))
          setCachedAt(snapshot.saved_at)
          setCampYear(snapshot.campYear)
        }
      } finally {
        setLoading(false)
      }
    }
    void loadCampYear()
  }, [applySuggestedPeriod])

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
      setAttendanceState((prev) => (prev.activityId === '' ? prev : { activityId: '', rows: [] }))
      return
    }
    void loadSessionAttendances(selectedActivityId)
  }, [selectedActivityId, loadSessionAttendances])

  useEffect(() => () => {
    for (const t of scanTimersRef.current) window.clearTimeout(t)
  }, [])

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
    // One scan at a time: ignore anything read while a check-in is still being saved, and the
    // same code read again within a few seconds.
    if (scanBusyRef.current || lastScannedRef.current === decodedText) return
    scanBusyRef.current = true
    lastScannedRef.current = decodedText
    const activityAtScan = selectedActivityId
    for (const t of scanTimersRef.current) window.clearTimeout(t)
    scanTimersRef.current = []

    setScanPaused(true)

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
        } else if (checkInError(registration.status)) {
          setScanResult({ success: false, message: checkInError(registration.status)!, data: registration })
          playBeep('error')
        } else if (sessionCheckedInIds.has(registration.id)) {
          setScanResult({
            success: true,
            message: 'Already checked in to this session',
            data: registration,
          })
          playBeep('warning')
        } else {
          const outcome = await recordCampCheckInOrQueue({
            activity_id: selectedActivityId,
            registration_id: registration.id,
            performed_by: user.id,
            check_in_method: 'qr',
            camp_year_id: registration.camp_year_id,
            name: registration.full_name || `${registration.first_name ?? ''} ${registration.last_name ?? ''}`.trim(),
          })

          if (outcome.kind === 'queued' || outcome.kind === 'already_queued') {
            setScanResult({
              success: true,
              message: 'Saved on this phone, will sync',
              data: registration,
            })
            playBeep(outcome.kind === 'queued' ? 'success' : 'warning')
          } else {
            const updatedRegistration = (outcome.registration ?? registration) as CampRegistration
            const attendance = outcome.attendance
            if (attendance) {
              setAttendanceState((prev) =>
                prev.activityId === activityAtScan
                  ? { activityId: activityAtScan, rows: [attendance, ...prev.rows.filter((row) => row.registration_id !== registration.id)] }
                  : prev
              )
            }
            setScanResult({
              success: true,
              message: outcome.kind === 'already'
                ? 'Already checked in to this session'
                : 'Session check-in successful!',
              data: updatedRegistration,
            })
            playBeep(outcome.kind === 'already' ? 'warning' : 'success')
          }
        }
      } catch (err: unknown) {
        setScanResult({
          success: false,
          message: err instanceof Error ? err.message : 'System error during check-in.',
        })
        playBeep('error')
      }
    }

    scanBusyRef.current = false
    scanTimersRef.current = [
      window.setTimeout(() => {
        lastScannedRef.current = null
      }, 3000),
      window.setTimeout(() => {
        setScanResult(null)
        setScanPaused(false)
      }, 2500),
    ]
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
      <div className="mx-auto max-w-lg">
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
    <div>
      <div className="mx-auto max-w-lg space-y-4 pb-6 sm:max-w-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="app-page-title flex flex-wrap items-center gap-2">
              Camp check-in
              {offline.pending.length > 0 ? (
                <Badge variant="warning" aria-label={`${offline.pending.length} check-ins waiting to sync`}>
                  <UploadCloud className="h-3.5 w-3.5" aria-hidden />
                  {offline.pending.length} to sync
                </Badge>
              ) : null}
            </h1>
            <p className="app-page-description">{campYear.year} · presence by session</p>
          </div>
          <Button
            variant="outline"
            size="icon"
            aria-label="Refresh sessions and check-ins"
            className="h-11 w-11 shrink-0"
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

        {!offline.online || cachedAt != null || offline.pending.length > 0 || offline.failed.length > 0 ? (
          <div
            role="status"
            className={cn(
              'rounded-xl border px-3 py-3 text-sm',
              offline.failed.length > 0
                ? 'border-red-200 bg-red-50 text-red-900 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-200'
                : 'border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200'
            )}
          >
            <div className="flex items-start gap-2">
              <CloudOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <div className="min-w-0 flex-1 space-y-1">
                {!offline.online ? (
                  <p>
                    <strong>Offline.</strong> Keep checking people in: each one is saved on this phone and syncs
                    when the connection is back.
                  </p>
                ) : null}
                {cachedAt != null ? (
                  <p>
                    Using the camper list saved on this phone at{' '}
                    {new Date(cachedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}.
                  </p>
                ) : null}
                {offline.pending.length > 0 ? (
                  <p>
                    <strong>{offline.pending.length}</strong> check-in{offline.pending.length === 1 ? '' : 's'} saved on
                    this phone, will sync automatically.
                  </p>
                ) : null}
                {offline.failed.length > 0 ? (
                  <div>
                    <p>
                      <strong>{offline.failed.length}</strong> could not sync:
                    </p>
                    <ul className="mt-1 list-disc space-y-0.5 pl-5">
                      {offline.failed.slice(0, 10).map((item) => (
                        <li key={item.client_uuid}>
                          {item.name || item.registration_id}: {item.last_error ?? 'Rejected by the server'}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {offline.pending.length > 0 ? (
                <Button
                  size="sm"
                  className="min-h-11 sm:min-h-9"
                  disabled={offline.syncing || !offline.online}
                  onClick={() =>
                    void offline.sync().then((s) => {
                      if (s.error) toast({ variant: 'destructive', title: 'Not synced yet', description: s.error })
                    })
                  }
                >
                  <RefreshCw className={cn('mr-2 h-4 w-4', offline.syncing && 'animate-spin')} />
                  Sync now
                </Button>
              ) : null}
              {offline.failed.length > 0 ? (
                <Button size="sm" variant="outline" className="min-h-11 sm:min-h-9" onClick={offline.dismissFailed}>
                  Dismiss failed
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="dashboard-panel p-4" data-tour="scan-session">
          <div className="mb-3 flex items-center justify-between gap-2">
            <label htmlFor="session-date" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
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
              className="h-11 w-[10.5rem] sm:h-10"
            />
          </div>

          <p className="mb-2 text-xs text-neutral-500 dark:text-neutral-400">
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
                    'min-w-0 rounded-xl border-2 p-2.5 text-left transition-colors sm:p-3',
                    isSelected
                      ? 'border-brand-700 bg-brand-600 text-white dark:border-brand-400 dark:bg-brand-500'
                      : isSuggested
                        ? 'border-emerald-400 bg-emerald-50 dark:border-emerald-400/40 dark:bg-emerald-400/10'
                        : 'border-neutral-200 bg-white dark:border-white/10 dark:bg-neutral-800/60',
                    (!activity || ensuringSessions) && 'opacity-50'
                  )}
                >
                  <Icon className={cn('mb-1 h-4 w-4', isSelected ? 'text-white' : 'text-neutral-700 dark:text-neutral-300')} />
                  <div className={cn('truncate text-sm font-semibold', isSelected ? 'text-white' : 'text-neutral-900 dark:text-neutral-100')}>
                    {meta.label}
                  </div>
                  <div className={cn('truncate text-xs', isSelected ? 'text-brand-100' : 'text-neutral-500 dark:text-neutral-400')}>
                    {meta.hint}
                  </div>
                </button>
              )
            })}
          </div>

          {outsideUsualHours ? (
            <div className="mt-3 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Clock suggests <strong>{CAMP_DAILY_SESSION_META[suggestedPeriod].label}</strong> now.
                You overrode to <strong>{sessionLabel}</strong>.
              </span>
            </div>
          ) : (
            <p className="mt-3 text-sm text-emerald-800 dark:text-emerald-300">
              Checking into <strong>{sessionLabel}</strong> (auto-selected for now).
            </p>
          )}
        </div>

        <div data-tour="scan-stats" className="grid grid-cols-3 gap-2">
          <div className="dashboard-panel p-3 text-center">
            <div className="app-stat-value text-neutral-900 dark:text-neutral-100">{sessionStats.totalRegistrations}</div>
            <div className="app-stat-label">At camp</div>
          </div>
          <div className="dashboard-panel p-3 text-center">
            <div className="app-stat-value text-emerald-600 dark:text-emerald-400">{sessionStats.checkedInSession}</div>
            <div className="app-stat-label">Present</div>
          </div>
          <div className="dashboard-panel p-3 text-center">
            <div className="app-stat-value text-red-600 dark:text-red-400">{sessionStats.remaining}</div>
            <div className="app-stat-label">Missing</div>
          </div>
        </div>

        <div data-tour="scan-manual">
        <CampManualCheckInPanel
          simple
          campYearId={campYear.id}
          registrations={registrations}
          activityId={selectedActivityId || undefined}
          sessionCheckedInIds={sessionCheckedInIds}
          performedByUserId={user?.id}
          checkInMethod="manual"
          sessionLabel={sessionLabel}
          savedOfflineIds={queuedIds}
          onCheckInComplete={() => void refreshCheckInData()}
        />
        </div>

        <button
          type="button"
          data-tour="scan-more"
          className="flex min-h-11 w-full items-center justify-between rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-neutral-700 dark:border-white/10 dark:bg-neutral-800/60 dark:text-neutral-200"
          onClick={() => setShowMoreTools((v) => !v)}
        >
          <span>More tools (code, QR, arrival)</span>
          {showMoreTools ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {showMoreTools ? (
          <div className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-3 dark:border-white/10 dark:bg-neutral-800/60">
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
                      ? 'border-brand-700 bg-brand-600 text-white dark:border-brand-400 dark:bg-brand-500'
                      : 'border-neutral-200 bg-neutral-50 text-neutral-700 dark:border-white/10 dark:bg-white/[0.03] dark:text-neutral-300'
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
                    <p className="py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">Select a session first.</p>
                  ) : (
                    <CameraQrScanner
                      onScan={(text) => void onScanSuccess(text)}
                      paused={scanPaused}
                      hint="Point the camera at the camper’s QR code"
                    />
                  )}
                  {scanResult ? (
                    <div
                      className={cn(
                        'mt-4 rounded-lg border-2 p-3',
                        scanResult.success
                          ? 'border-emerald-500 bg-emerald-50 dark:border-emerald-400/40 dark:bg-emerald-400/10'
                          : 'border-red-500 bg-red-50 dark:border-red-400/40 dark:bg-red-400/10'
                      )}
                    >
                      <div className="flex items-start gap-2">
                        {scanResult.success ? (
                          <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-neutral-900 dark:text-neutral-100">{scanResult.message}</p>
                          {scanResult.data ? (
                            <>
                              <p className="text-sm text-neutral-700 dark:text-neutral-300">
                                {scanResult.data.full_name ||
                                  `${scanResult.data.first_name} ${scanResult.data.last_name}`}
                              </p>
                              {scanResult.data.phone ? (
                                <PhoneLink
                                  phone={scanResult.data.phone}
                                  whatsapp={scanResult.data.whatsapp}
                                  name={scanResult.data.full_name}
                                  className="text-sm text-neutral-600 dark:text-neutral-400"
                                />
                              ) : null}
                            </>
                          ) : null}
                        </div>
                        {scanResult.data ? (
                          <QuickContactButtons
                            phone={scanResult.data.phone}
                            whatsapp={scanResult.data.whatsapp}
                            name={scanResult.data.full_name}
                          />
                        ) : null}
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
                <p className="py-4 text-center text-sm text-neutral-500 dark:text-neutral-400">No check-ins yet</p>
              ) : (
                <ul className="max-h-64 space-y-2 overflow-y-auto">
                  {recentCheckIns.map((checkIn) => {
                    const when = formatRelativeWhen(checkIn.checked_in_at)
                    return (
                      <li key={checkIn.id} className="rounded-lg border border-neutral-200/80 bg-neutral-50 px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
                        <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{checkIn.full_name}</p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400" title={when.absolute}>
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

          <Card className="border border-red-200 dark:border-red-400/20">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base text-red-900 dark:text-red-300">
                <AlertTriangle className="h-4 w-4" /> Missing
              </CardTitle>
              <CardDescription>Not yet marked for {sessionLabel}</CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedActivityId ? (
                <p className="py-4 text-center text-sm text-neutral-500 dark:text-neutral-400">Select a session</p>
              ) : missingCampers.length === 0 ? (
                <p className="py-4 text-center text-sm text-emerald-700 dark:text-emerald-300">Everyone present</p>
              ) : (
                <ul className="max-h-80 space-y-2 overflow-y-auto">
                  {missingCampers.slice(0, 40).map((reg) => {
                    const name = reg.full_name || `${reg.first_name} ${reg.last_name}`
                    return (
                      <li key={reg.id} className="flex min-h-11 items-center gap-2 rounded-lg border border-red-100 px-3 py-2 dark:border-red-400/10">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">{name}</p>
                          <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                            {reg.role}
                            {reg.phone ? ' · ' : ''}
                            {reg.phone ? <PhoneLink phone={reg.phone} whatsapp={reg.whatsapp} name={name} /> : null}
                          </p>
                        </div>
                        <QuickContactButtons phone={reg.phone} whatsapp={reg.whatsapp} name={name} />
                      </li>
                    )
                  })}
                  {missingCampers.length > 40 ? (
                    <li className="text-center text-xs text-neutral-500 dark:text-neutral-400">
                      +{missingCampers.length - 40} more
                    </li>
                  ) : null}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <p className="text-center text-sm text-neutral-500 dark:text-neutral-400">
          <Link href="/admin/camp-meeting/activities" className="inline-flex min-h-11 items-center underline">
            Manage sessions
          </Link>
          {' · '}
          <Link href="/admin/camp-meeting/rooms" className="inline-flex min-h-11 items-center underline">
            Rooms
          </Link>
        </p>
      </div>
    </div>
  )
}
