'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import QRCode from 'react-qr-code'
import { ArrowLeft, Copy, Maximize2, Printer, Smartphone, Users, X, XCircle } from 'lucide-react'
import { useAuth } from '@/components/providers'
import { DashboardLayout } from '@/components/dashboard-layout'
import { PageHeader } from '@/components/layout/page-header'
import { AccessDenied } from '@/components/auth/access-denied'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { StatCard } from '@/components/ui/stat-card'
import { LoadingSpinner } from '@/components/ui/loading'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import {
  closeCheckinSessionAction,
  getCheckinSessionAction,
  listOpenCheckinSessionsAction,
  startCheckinSessionAction,
  type CheckinSessionWithUrl,
} from '@/lib/actions/self-check-in'
import { DEFAULT_CHECKIN_SESSION_HOURS, type CheckinCongregation } from '@/lib/attendance/checkin-session'
import { SERVICE_TYPE_OPTIONS } from '@/lib/constants/service-types'
import type { ServiceType } from '@/lib/types'

const POLL_MS = 5_000

function todayLocalIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function serviceLabel(type: string): string {
  return SERVICE_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? 'Other'
}

function congregationLabel(c: CheckinCongregation): string {
  return c === 'rlc' ? 'RLC' : 'Campus Gem'
}

function clock(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function StateBadge({ session }: { session: CheckinSessionWithUrl }) {
  if (session.state === 'open') return <Badge variant="success">Open until {clock(session.closes_at)}</Badge>
  if (session.state === 'not_open_yet') return <Badge variant="warning">Opens {clock(session.opens_at)}</Badge>
  return <Badge variant="danger">{session.state === 'closed' ? 'Closed' : 'Expired'}</Badge>
}

export default function SelfCheckInSessionPage() {
  const { user, loading: authLoading, can } = useAuth()
  const { toast } = useToast()

  const [serviceType, setServiceType] = useState<ServiceType>('sunday_service')
  const [serviceDate, setServiceDate] = useState(todayLocalIso)
  const [congregation, setCongregation] = useState<CheckinCongregation>('campus_gem')
  const [hours, setHours] = useState(String(DEFAULT_CHECKIN_SESSION_HOURS))
  const [starting, setStarting] = useState(false)

  const [session, setSession] = useState<CheckinSessionWithUrl | null>(null)
  const [openSessions, setOpenSessions] = useState<CheckinSessionWithUrl[]>([])
  const [presenting, setPresenting] = useState(false)
  const [closing, setClosing] = useState(false)

  const allowed = can('attendance.manage')

  const loadOpenSessions = useCallback(async () => {
    const { data } = await listOpenCheckinSessionsAction()
    setOpenSessions(data ?? [])
  }, [])

  useEffect(() => {
    if (allowed) void loadOpenSessions()
  }, [allowed, loadOpenSessions])

  // Live count while a session is on screen.
  const token = session?.token
  useEffect(() => {
    if (!token) return
    let cancelled = false
    const tick = async () => {
      const { data } = await getCheckinSessionAction(token).catch(() => ({ data: null }))
      if (!cancelled && data) setSession(data)
    }
    const id = window.setInterval(() => void tick(), POLL_MS)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [token])

  async function start() {
    setStarting(true)
    try {
      const { data, error } = await startCheckinSessionAction({
        service_type: serviceType,
        service_date: serviceDate,
        congregation,
        hours: Number(hours) || DEFAULT_CHECKIN_SESSION_HOURS,
      })
      if (error || !data) throw new Error(error ?? 'Could not start self check-in.')
      setSession(data)
      void loadOpenSessions()
    } catch (err) {
      toast({ variant: 'destructive', title: 'Could not start', description: err instanceof Error ? err.message : undefined })
    } finally {
      setStarting(false)
    }
  }

  async function close() {
    if (!session) return
    if (!window.confirm('Close self check-in? Members scanning this code will be asked to see an usher.')) return
    setClosing(true)
    try {
      const { data, error } = await closeCheckinSessionAction(session.token)
      if (error || !data) throw new Error(error ?? 'Could not close the session.')
      setSession(data)
      setPresenting(false)
      void loadOpenSessions()
      toast({ title: 'Self check-in closed', description: `${data.checkin_count} checked themselves in.` })
    } catch (err) {
      toast({ variant: 'destructive', title: 'Could not close', description: err instanceof Error ? err.message : undefined })
    } finally {
      setClosing(false)
    }
  }

  async function copyLink() {
    if (!session) return
    try {
      await navigator.clipboard.writeText(session.url)
      toast({ title: 'Link copied' })
    } catch {
      toast({ variant: 'destructive', title: 'Could not copy the link' })
    }
  }

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[400px] items-center justify-center">
          <LoadingSpinner />
        </div>
      </DashboardLayout>
    )
  }
  if (!user) return null
  if (!allowed) {
    return (
      <DashboardLayout>
        <AccessDenied permission="attendance.manage" />
      </DashboardLayout>
    )
  }

  const heading = session ? `${serviceLabel(session.service_type)} · ${congregationLabel(session.congregation)}` : ''

  return (
    <DashboardLayout>
      {/* Print only the poster. */}
      <style>{`@media print {
        body * { visibility: hidden !important; }
        #self-checkin-poster, #self-checkin-poster * { visibility: visible !important; }
        #self-checkin-poster { position: absolute; inset: 0; padding: 48px; background: #fff; }
      }`}</style>

      <div className="mx-auto max-w-5xl">
        <PageHeader
          title="Self check-in"
          description="Show a QR code at the entrance. Members scan it with their phone, sign in and tap “I’m here”."
          actions={
            <Button variant="outline" asChild className="h-11 sm:h-10">
              <Link href="/attendance">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Attendance
              </Link>
            </Button>
          }
        />

        {!session ? (
          <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
            <div className="dashboard-panel p-5" data-tour="sci-start">
              <h2 className="app-section-title">Start self check-in</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="sci-service">Service</Label>
                  <Select value={serviceType} onValueChange={(v) => setServiceType(v as ServiceType)}>
                    <SelectTrigger id="sci-service" className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICE_TYPE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sci-date">Date</Label>
                  <Input id="sci-date" type="date" className="h-11" value={serviceDate} onChange={(e) => setServiceDate(e.target.value || todayLocalIso())} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sci-congregation">Congregation</Label>
                  <Select value={congregation} onValueChange={(v) => setCongregation(v as CheckinCongregation)}>
                    <SelectTrigger id="sci-congregation" className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="campus_gem">Campus Gem</SelectItem>
                      <SelectItem value="rlc">RLC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sci-hours">Open for (hours)</Label>
                  <Input id="sci-hours" type="number" min={1} max={24} className="h-11" value={hours} onChange={(e) => setHours(e.target.value)} />
                </div>
              </div>
              <Button className="mt-5 h-11 w-full sm:w-auto" onClick={() => void start()} disabled={starting}>
                {starting ? <LoadingSpinner className="mr-2 h-4 w-4" /> : <Smartphone className="mr-2 h-4 w-4" />}
                Start self check-in
              </Button>
            </div>

            <div className="dashboard-panel p-5" data-tour="sci-open">
              <h2 className="app-section-title">Open sessions</h2>
              {openSessions.length === 0 ? (
                <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">None open. Start one to get a QR code.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {openSessions.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => setSession(s)}
                        className="w-full rounded-lg border border-neutral-200/80 bg-white px-3 py-2 text-left hover:bg-neutral-50 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.07]"
                      >
                        <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                          {serviceLabel(s.service_type)} · {congregationLabel(s.congregation)}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          {s.service_date} · {s.checkin_count} checked in · until {clock(s.closes_at)}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
            <div id="self-checkin-poster" className="dashboard-panel flex flex-col items-center p-6 text-center sm:p-8">
              <p className="app-overline">Scan to check in</p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">{heading}</h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">{session.service_date}</p>
              <div className="mt-6 rounded-2xl bg-white p-4 ring-1 ring-neutral-200 dark:bg-white dark:ring-white/10">
                <QRCode value={session.url} size={320} level="M" className="h-auto w-full max-w-[320px]" />
              </div>
              <p className="mt-4 max-w-sm text-sm text-neutral-600 dark:text-neutral-300">
                Open your phone camera, point it at the code, sign in and tap <strong>I’m here</strong>.
              </p>
              <p className="mt-2 break-all font-mono text-xs text-neutral-500 dark:text-neutral-400">{session.url}</p>
            </div>

            <div className="space-y-4">
              <StatCard label="Checked in" value={session.checkin_count} icon={Users} tone="success" sub={<StateBadge session={session} />} />
              <div className="dashboard-panel space-y-2 p-4">
                <Button className="h-11 w-full" onClick={() => setPresenting(true)} disabled={session.state !== 'open'}>
                  <Maximize2 className="mr-2 h-4 w-4" />
                  Show full screen
                </Button>
                <Button variant="outline" className="h-11 w-full" onClick={() => window.print()}>
                  <Printer className="mr-2 h-4 w-4" />
                  Print poster
                </Button>
                <Button variant="outline" className="h-11 w-full" onClick={() => void copyLink()}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy link
                </Button>
                {session.state === 'open' || session.state === 'not_open_yet' ? (
                  <Button variant="destructive" className="h-11 w-full" onClick={() => void close()} disabled={closing}>
                    <XCircle className="mr-2 h-4 w-4" />
                    Close check-in
                  </Button>
                ) : null}
                <Button variant="ghost" className="h-11 w-full" onClick={() => setSession(null)}>
                  Back to sessions
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {presenting && session ? (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white p-6 text-center dark:bg-neutral-950">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Exit full screen"
            className="absolute right-4 top-4 h-11 w-11"
            onClick={() => setPresenting(false)}
          >
            <X className="h-5 w-5" />
          </Button>
          <p className="app-overline">Scan to check in</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-5xl">{heading}</h2>
          <div className="mt-8 rounded-3xl bg-white p-6 ring-1 ring-neutral-200 dark:ring-white/10">
            <QRCode value={session.url} size={512} level="M" className="h-auto w-[min(70vh,80vw)]" />
          </div>
          <p className="mt-6 text-lg text-neutral-600 dark:text-neutral-300">
            <span className="app-stat-value text-emerald-600 dark:text-emerald-400">{session.checkin_count}</span> checked in
          </p>
        </div>
      ) : null}
    </DashboardLayout>
  )
}
