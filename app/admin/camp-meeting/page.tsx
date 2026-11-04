'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BedDouble,
  Bell,
  Check,
  ClipboardList,
  Copy,
  CreditCard,
  MapPin,
  MessageSquare,
  PhoneCall,
  QrCode,
  RefreshCw,
  Upload,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading'
import { Meter, SegmentedBar } from '@/components/ui/meter'
import { PersonAvatar } from '@/components/ui/person'
import { useAuth } from '@/components/providers'
import { useCampRegistrations } from '@/lib/hooks/use-camp'
import { CampActiveYearEmpty } from '@/components/camp/camp-active-year-empty'
import { CampMyFollowUpsCard } from '@/components/camp/camp-my-follow-ups-card'
import { CampDailySummaryShare } from '@/components/camp/camp-daily-summary-share'
import { RegistrationTrendChart } from '@/components/camp/registration-trend-chart'
import { outcomeSegments } from '@/components/camp/call-outcome'
import { buildLiveRegistrationPulse } from '@/lib/camp/analytics'
import { summarizeCallCampaign } from '@/lib/camp/call-campaign'
import { registrationsPerDay, summarizeRoomAllocation } from '@/lib/camp/room-allocation'
import { getPublishedCampFormForYear } from '@/lib/actions/forms'
import { getCampRooms } from '@/lib/actions/camp'
import type { CampYear } from '@/lib/types'
import { cn } from '@/lib/utils'

const DAY = 86_400_000

function startOfDay(iso: string): number {
  const d = new Date(iso)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

/** "Starts in 12 days", "Day 2 of 5", or "Ended 3 days ago". */
function campTiming(year: CampYear, now = new Date()): { label: string; tone: 'brand' | 'success' | 'secondary' } {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const start = startOfDay(year.start_date)
  const end = startOfDay(year.end_date)
  if (Number.isNaN(start) || Number.isNaN(end)) return { label: 'Dates not set', tone: 'secondary' }
  if (today < start) {
    const days = Math.round((start - today) / DAY)
    return { label: days === 1 ? 'Starts tomorrow' : `Starts in ${days} days`, tone: 'brand' }
  }
  if (today <= end) {
    const day = Math.round((today - start) / DAY) + 1
    const total = Math.round((end - start) / DAY) + 1
    return { label: `Live · day ${day} of ${total}`, tone: 'success' }
  }
  const ago = Math.round((today - end) / DAY)
  return { label: ago === 0 ? 'Ended today' : `Ended ${ago} day${ago === 1 ? '' : 's'} ago`, tone: 'secondary' }
}

function formatRange(year: CampYear): string {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  const endYear = new Date(year.end_date).getFullYear()
  return `${fmt(year.start_date)} – ${fmt(year.end_date)} ${Number.isNaN(endYear) ? '' : endYear}`.trim()
}

function Kpi({
  href,
  label,
  value,
  sub,
  icon: Icon,
  tone = 'default',
  children,
}: {
  href?: string
  label: string
  value: ReactNode
  sub?: ReactNode
  icon: typeof Users
  tone?: 'default' | 'success' | 'warning'
  children?: ReactNode
}) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="app-stat-label">{label}</p>
        <Icon className="h-4 w-4 text-neutral-400 transition-colors group-hover:text-brand-600 dark:text-neutral-500 dark:group-hover:text-brand-400" aria-hidden />
      </div>
      <p className="app-stat-value max-sm:text-[24px]">{value}</p>
      {children}
      {sub ? (
        <p
          className={cn(
            'text-[13px]',
            tone === 'success' && 'text-emerald-700 dark:text-emerald-300',
            tone === 'warning' && 'text-amber-700 dark:text-amber-300',
            tone === 'default' && 'text-neutral-500 dark:text-neutral-400'
          )}
        >
          {sub}
        </p>
      ) : null}
    </>
  )
  const cls =
    'dashboard-panel group flex min-w-0 flex-col gap-2.5 p-4 text-left transition-[border-color,box-shadow] sm:gap-3 sm:p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40'
  return href ? (
    <Link href={href} className={cn(cls, 'hover:border-neutral-300 hover:shadow-card-hover dark:hover:border-white/[0.12]')}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  )
}

function Panel({
  title,
  description,
  action,
  className,
  children,
}: {
  title: string
  description?: string
  action?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <section className={cn('dashboard-panel flex flex-col p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="app-section-title">{title}</h2>
          {description ? <p className="mt-0.5 text-[13px] text-neutral-500 dark:text-neutral-400">{description}</p> : null}
        </div>
        {action}
      </div>
      <div className="mt-4 flex-1">{children}</div>
    </section>
  )
}

function PanelLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex shrink-0 items-center gap-1 text-[13px] font-medium text-brand-700 hover:underline dark:text-brand-400"
    >
      {children}
      <ArrowRight className="h-3.5 w-3.5" aria-hidden />
    </Link>
  )
}

const QUICK_LINKS: Array<{ href: string; label: string; hint: string; icon: typeof Users; permission?: 'camp.manage' | 'camp.payments' | 'camp.settings' | 'camp.calls' }> = [
  { href: '/admin/camp-meeting/calls', label: 'Confirmation calls', hint: 'Who is still coming', icon: PhoneCall, permission: 'camp.calls' },
  { href: '/admin/camp-meeting/rooms', label: 'Rooms', hint: 'Lodging and leaders', icon: BedDouble, permission: 'camp.manage' },
  { href: '/admin/camp-meeting/communications', label: 'Communications', hint: 'SMS, email, delivery', icon: MessageSquare, permission: 'camp.manage' },
  { href: '/admin/camp-meeting/analytics', label: 'Analytics', hint: 'Trends and exports', icon: BarChart3, permission: 'camp.manage' },
  { href: '/admin/camp-meeting/payments', label: 'Payments', hint: 'Fees and receipts', icon: CreditCard, permission: 'camp.payments' },
  { href: '/admin/camp-meeting/import', label: 'Import history', hint: 'Past years from Excel', icon: Upload, permission: 'camp.manage' },
  { href: '/admin/camp-meeting/notifications', label: 'Notifications', hint: 'Auto-SMS templates', icon: Bell, permission: 'camp.settings' },
]

export default function CampAdminDashboard() {
  const router = useRouter()
  const { user, loading: authLoading, can } = useAuth()
  const { registrations, campYear, loading, error, refresh } = useCampRegistrations()
  const [refreshing, setRefreshing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [registrationUrl, setRegistrationUrl] = useState('')

  const rooms = useQuery({
    queryKey: ['camp-rooms', campYear?.id],
    queryFn: async () => {
      const res = await getCampRooms(campYear!.id)
      if (res.error) throw new Error(res.error)
      return res.data ?? []
    },
    enabled: Boolean(campYear?.id),
    staleTime: 30_000,
  })

  useEffect(() => {
    if (!campYear?.id) return
    void getPublishedCampFormForYear(campYear.id).then(({ data }) => {
      const path = data?.slug ? `/f/${data.slug}` : '/camp-meeting/register'
      setRegistrationUrl(`${window.location.origin}${path}`)
    })
  }, [campYear?.id])

  useEffect(() => {
    if (!authLoading && !user) router.push('/auth?redirect=' + encodeURIComponent('/admin/camp-meeting'))
  }, [user, authLoading, router])

  const active = useMemo(() => registrations.filter((r) => r.status !== 'cancelled'), [registrations])
  const calls = useMemo(() => summarizeCallCampaign(registrations), [registrations])
  const allocation = useMemo(() => summarizeRoomAllocation(registrations, rooms.data ?? []), [registrations, rooms.data])
  const trend = useMemo(() => registrationsPerDay(registrations, 30), [registrations])
  const pulse = useMemo(() => buildLiveRegistrationPulse(registrations), [registrations])
  const demographics = useMemo(() => {
    const female = active.filter((r) => r.sex === 'Female').length
    const male = active.filter((r) => r.sex === 'Male').length
    const fresh = active.filter((r) => r.is_new_registrant).length
    const byResidence = new Map<string, number>()
    active.forEach((r) => {
      const key = r.residence?.trim()
      if (key) byResidence.set(key, (byResidence.get(key) ?? 0) + 1)
    })
    const topResidences = Array.from(byResidence.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
    return { female, male, unknown: active.length - female - male, fresh, returning: active.length - fresh, topResidences }
  }, [active])
  const recent = useMemo(
    () => [...registrations].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)).slice(0, 6),
    [registrations]
  )

  async function handleRefresh() {
    setRefreshing(true)
    try {
      await Promise.all([refresh(), rooms.refetch()])
    } finally {
      setRefreshing(false)
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(registrationUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Clipboard blocked: the link is still selectable in the field.
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }
  if (!user) return null
  if (error && !campYear) return <CampActiveYearEmpty title="Error loading data" error={error} />
  if (!campYear) return <CampActiveYearEmpty />

  const timing = campTiming(campYear)
  const checkedIn = active.filter((r) => r.status === 'checked_in').length
  const total = active.length
  const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0)

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Hero */}
      <header className="dashboard-panel relative overflow-hidden rounded-2xl px-5 py-5 sm:px-8 sm:py-7">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-500/10 blur-3xl dark:bg-brand-500/15"
          aria-hidden
        />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={timing.tone}>{timing.label}</Badge>
              <Badge variant={campYear.registration_open ? 'success' : 'secondary'}>
                <span className={cn('h-1.5 w-1.5 rounded-full', campYear.registration_open ? 'bg-emerald-500' : 'bg-neutral-400')} aria-hidden />
                Registration {campYear.registration_open ? 'open' : 'closed'}
              </Badge>
            </div>
            <h1 className="app-page-title mt-4">
              Camp meeting <span className="app-display-accent">{campYear.year}</span>
            </h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-600 dark:text-neutral-400">
              {campYear.theme ? <span className="font-medium text-neutral-800 dark:text-neutral-200">“{campYear.theme}”</span> : null}
              <span>{formatRange(campYear)}</span>
              {campYear.venue ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" aria-hidden />
                  {campYear.venue}
                </span>
              ) : null}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void handleRefresh()} disabled={refreshing} aria-label="Refresh">
              <RefreshCw className={cn('h-4 w-4 sm:mr-2', refreshing && 'animate-spin')} aria-hidden />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => router.push('/admin/camp-meeting/registrations')}>
              <ClipboardList className="mr-2 h-4 w-4" aria-hidden />
              Registrations
            </Button>
            <Button className="flex-1 sm:flex-none" onClick={() => router.push('/admin/camp-meeting/scan')}>
              <QrCode className="mr-2 h-4 w-4" aria-hidden />
              Check-in
            </Button>
          </div>
        </div>
      </header>

      {/* Headline numbers */}
      <section aria-label="Camp totals" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Kpi
          href="/admin/camp-meeting/registrations"
          label="Registered"
          value={total}
          icon={Users}
          sub={pulse.last7Days > 0 ? `+${pulse.last7Days} this week · ${pulse.today} today` : 'No new registrations this week'}
          tone={pulse.last7Days > 0 ? 'success' : 'default'}
        />
        <Kpi
          href={can('camp.calls') ? '/admin/camp-meeting/calls' : undefined}
          label="Confirmed coming"
          value={calls.expected}
          icon={PhoneCall}
          sub={calls.open > 0 ? `${calls.open} still to reach by phone` : total ? 'Everyone has been reached' : undefined}
          tone={calls.open > 0 ? 'warning' : 'success'}
        >
          <Meter value={calls.expected} max={total} tone="success" label="Confirmed share" />
        </Kpi>
        <Kpi
          href="/admin/camp-meeting/scan"
          label="Checked in"
          value={checkedIn}
          icon={QrCode}
          sub={`${pct(checkedIn, total)}% of registrations`}
          tone={checkedIn > 0 ? 'success' : 'default'}
        >
          <Meter value={checkedIn} max={total} label="Checked-in share" />
        </Kpi>
        <Kpi
          href={can('camp.manage') ? '/admin/camp-meeting/rooms' : undefined}
          label="Beds allocated"
          value={
            <>
              {allocation.occupied}
              <span className="text-base font-medium text-neutral-400 dark:text-neutral-500 sm:text-lg"> / {allocation.capacity}</span>
            </>
          }
          icon={BedDouble}
          sub={
            allocation.rooms === 0
              ? 'No rooms set up yet'
              : allocation.unassigned > 0
                ? `${allocation.unassigned} without a room`
                : 'Everyone has a room'
          }
          tone={allocation.rooms === 0 || allocation.unassigned > 0 ? 'warning' : 'success'}
        >
          <Meter value={allocation.occupied} max={allocation.capacity} tone={allocation.shortfall > 0 ? 'warning' : 'brand'} label="Beds filled" />
        </Kpi>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel
          className="lg:col-span-2"
          title="Registrations, last 30 days"
          description={
            pulse.peakDay && pulse.peakDayCount > 0
              ? `Busiest day ${new Date(pulse.peakDay).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} with ${pulse.peakDayCount}. Average ${pulse.avgPerDay} a day.`
              : 'Daily sign-ups for this camp year.'
          }
          action={can('camp.manage') ? <PanelLink href="/admin/camp-meeting/analytics">Analytics</PanelLink> : undefined}
        >
          <RegistrationTrendChart data={trend} />
        </Panel>

        <Panel
          title="Confirmation calls"
          description={`${calls.called} of ${calls.total} reached at least once`}
          action={can('camp.calls') ? <PanelLink href="/admin/camp-meeting/calls">Open</PanelLink> : undefined}
        >
          <SegmentedBar label="Call outcomes" segments={outcomeSegments(calls)} />
          {calls.unassigned > 0 && can('camp.manage') ? (
            <Link
              href="/admin/camp-meeting/calls?caller=unassigned"
              className="mt-4 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[13px] text-amber-900 transition-colors hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200 dark:hover:bg-amber-950/50"
            >
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
              <span className="flex-1">
                <span className="font-semibold tabular-nums">{calls.unassigned}</span> registrant{calls.unassigned === 1 ? ' has' : 's have'} no caller yet
              </span>
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          ) : null}
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel
          className="lg:col-span-2"
          title="Room allocation"
          description={
            allocation.rooms
              ? `${allocation.rooms} rooms · ${allocation.fullRooms} full · ${allocation.freeBeds} free bed${allocation.freeBeds === 1 ? '' : 's'}`
              : 'Set up rooms to start allocating beds.'
          }
          action={can('camp.manage') ? <PanelLink href="/admin/camp-meeting/rooms">Manage rooms</PanelLink> : undefined}
        >
          {rooms.isLoading ? (
            <div className="flex h-32 items-center justify-center"><LoadingSpinner /></div>
          ) : allocation.rooms === 0 ? (
            <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-neutral-300 p-5 dark:border-neutral-600">
              <p className="text-sm text-neutral-600 dark:text-neutral-300">
                {total} registrant{total === 1 ? '' : 's'} will need a bed. Add rooms with capacity and gender, then auto-fill or assign by hand.
              </p>
              {can('camp.manage') ? (
                <Button size="sm" onClick={() => router.push('/admin/camp-meeting/rooms')}>
                  <BedDouble className="mr-1.5 h-4 w-4" aria-hidden />
                  Set up rooms
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="space-y-5">
              {allocation.buckets.map((b) => {
                const over = b.waiting > Math.max(0, b.capacity - b.occupied)
                return (
                  <div key={b.key}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                      <span className="font-medium text-neutral-900 dark:text-neutral-100">
                        {b.label}
                        <span className="ml-2 text-[13px] font-normal text-neutral-500 dark:text-neutral-400">
                          {b.rooms} room{b.rooms === 1 ? '' : 's'}
                        </span>
                      </span>
                      <span className="tabular-nums text-neutral-600 dark:text-neutral-300">
                        {b.occupied}/{b.capacity} beds
                        {b.waiting > 0 ? (
                          <span className={cn('ml-3', over ? 'text-amber-700 dark:text-amber-300' : 'text-neutral-500 dark:text-neutral-400')}>
                            {b.waiting} waiting
                          </span>
                        ) : null}
                      </span>
                    </div>
                    <Meter className="mt-2" value={b.occupied} max={b.capacity} tone={over ? 'warning' : b.capacity && b.occupied >= b.capacity ? 'success' : 'brand'} label={`${b.label} beds filled`} />
                  </div>
                )
              })}
              {allocation.shortfall > 0 ? (
                <p className="flex items-center gap-2 text-[13px] text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
                  {allocation.shortfall} more bed{allocation.shortfall === 1 ? '' : 's'} needed than are free. Add rooms or raise capacity.
                </p>
              ) : null}
            </div>
          )}
        </Panel>

        <Panel title="Who's coming" description={`${total} active registrant${total === 1 ? '' : 's'}`}>
          <dl className="grid grid-cols-2 gap-3">
            {[
              ['Sisters', demographics.female],
              ['Brothers', demographics.male],
              ['First camp', demographics.fresh],
              ['Returning', demographics.returning],
            ].map(([label, value]) => (
              <div key={label as string} className="rounded-lg bg-neutral-50 px-3 py-2.5 dark:bg-neutral-900/40">
                <dt className="text-[13px] text-neutral-500 dark:text-neutral-400">{label}</dt>
                <dd className="mt-0.5 text-lg font-semibold tabular-nums text-neutral-900 dark:text-neutral-50">
                  {value as number}
                  <span className="ml-1.5 text-xs font-normal text-neutral-500 dark:text-neutral-400">{pct(value as number, total)}%</span>
                </dd>
              </div>
            ))}
          </dl>
          {demographics.topResidences.length > 0 ? (
            <div className="mt-5">
              <p className="app-overline mb-2">Top residences</p>
              <ul className="space-y-2">
                {demographics.topResidences.map(([name, count]) => (
                  <li key={name}>
                    <div className="flex justify-between gap-2 text-[13px]">
                      <span className="truncate text-neutral-700 dark:text-neutral-300">{name}</span>
                      <span className="tabular-nums text-neutral-500 dark:text-neutral-400">{count}</span>
                    </div>
                    <Meter className="mt-1 h-1.5" value={count} max={demographics.topResidences[0][1]} label={`${name} registrants`} />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Recent registrations" action={<PanelLink href="/admin/camp-meeting/registrations">View all</PanelLink>}>
          {recent.length === 0 ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">No registrations yet. Share the link to get started.</p>
          ) : (
            <ul className="-mx-2 space-y-0.5">
              {recent.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/admin/camp-meeting/registrations/${r.id}`}
                    className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-700/40"
                  >
                    <PersonAvatar name={r.full_name} seed={r.id} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">{r.full_name}</span>
                      <span className="block truncate text-xs text-neutral-500 dark:text-neutral-400">
                        {r.role} · {new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                    </span>
                    {r.is_new_registrant ? <Badge variant="brand">New</Badge> : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="space-y-6 lg:col-span-2">
          <Panel title="Registration link" description="Share it anywhere people can sign up for camp.">
            <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 py-1.5 pl-3 pr-1.5 dark:border-neutral-600 dark:bg-neutral-900/40">
              <input
                type="text"
                readOnly
                value={registrationUrl}
                aria-label="Registration link"
                onFocus={(e) => e.currentTarget.select()}
                className="min-w-0 flex-1 truncate bg-transparent text-sm text-neutral-700 outline-none dark:text-neutral-200"
              />
              <Button size="sm" variant="outline" onClick={() => void copyLink()} disabled={!registrationUrl}>
                {copied ? <Check className="mr-1 h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden /> : <Copy className="mr-1 h-4 w-4" aria-hidden />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </Panel>

          <nav aria-label="Camp tools" className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
            {QUICK_LINKS.filter((q) => !q.permission || can(q.permission)).map((q) => {
              const Icon = q.icon
              return (
                <Link
                  key={q.href}
                  href={q.href}
                  className="dashboard-panel group flex items-start gap-3 p-4 transition-colors hover:border-neutral-300 dark:hover:border-neutral-600"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700 transition-colors group-hover:bg-brand-100 dark:bg-brand-950/50 dark:text-brand-300 dark:group-hover:bg-brand-900/50">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">{q.label}</span>
                    <span className="block truncate text-xs text-neutral-500 dark:text-neutral-400">{q.hint}</span>
                  </span>
                </Link>
              )
            })}
          </nav>
        </div>
      </div>

      <CampMyFollowUpsCard
        userId={user.id}
        registrations={registrations}
        onOpenQueue={() => router.push('/admin/camp-meeting/calls')}
        onOpenRegistration={(id) => router.push(`/admin/camp-meeting/registrations/${id}`)}
      />

      {total > 0 ? (
        <CampDailySummaryShare
          variant="card"
          yearId={campYear.id}
          input={{
            year: campYear.year,
            theme: campYear.theme,
            total: registrations.length,
            newRegistrants: registrations.filter((r) => r.is_new_registrant).length,
            returning: registrations.filter((r) => !r.is_new_registrant).length,
            pulse,
            registrationUrl,
          }}
        />
      ) : null}
    </div>
  )
}
