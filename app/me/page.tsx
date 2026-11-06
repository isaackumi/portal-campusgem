'use client'

import { useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import QRCode from 'react-qr-code'
import { useQuery } from '@tanstack/react-query'
import {
  Cake,
  CalendarCheck,
  Copy,
  Flame,
  Home,
  Pencil,
  Phone,
  Tent,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { useAuth } from '@/components/providers'
import { DashboardLayout } from '@/components/dashboard-layout'
import { ErrorBoundary } from '@/components/error-boundary'
import { ErrorDisplay } from '@/components/ui/error-display'
import { LoadingPage } from '@/components/ui/loading'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StatCard } from '@/components/ui/stat-card'
import { PersonAvatar } from '@/components/ui/person'
import { AttendanceWeeks } from '@/components/me/attendance-weeks'
import { MyEvents } from '@/components/events/my-events'
import { MyCampusCard } from '@/components/campus/my-campus-card'
import { MyDetailsForm, type MyDetailsValues } from '@/components/me/my-details-form'
import { useToast } from '@/hooks/use-toast'
import { loadMyGemAction } from '@/lib/actions/me'
import { summarizeAttendance } from '@/lib/me/attendance-summary'
import { birthdayPartsFromDob, daysUntilNextBirthday, nextBirthdayDate } from '@/lib/birthdays/upcoming-birthdays'
import type { MyGem } from '@/lib/me/types'

function todayIso(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

function titleCase(value?: string): string {
  if (!value) return ''
  const text = value.replace(/_/g, ' ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function formatDay(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
}

function Panel({
  icon: Icon,
  title,
  action,
  children,
  tour,
}: {
  icon: LucideIcon
  title: string
  action?: ReactNode
  children: ReactNode
  /** Guided-tour anchor (lib/tour/tours.ts). */
  tour?: string
}) {
  return (
    <section className="dashboard-panel p-4 sm:p-5" data-tour={tour}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="app-section-title flex items-center gap-2">
          <Icon className="h-4 w-4 text-neutral-400 dark:text-neutral-500" aria-hidden />
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function Detail({ label, value, mono }: { label: string; value?: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="app-stat-label">{label}</dt>
      <dd
        className={
          value
            ? `mt-0.5 break-words text-sm text-neutral-800 dark:text-neutral-200 ${mono ? 'font-mono' : ''}`
            : 'mt-0.5 text-sm text-neutral-400 dark:text-neutral-500'
        }
      >
        {value || 'Not set'}
      </dd>
    </div>
  )
}

const campStatusTone: Record<string, BadgeProps['variant']> = {
  registered: 'brand',
  checked_in: 'success',
  cancelled: 'danger',
}

function MyGemContent() {
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const [editing, setEditing] = useState(false)

  const query = useQuery({
    queryKey: ['my-gem', user?.id],
    queryFn: async () => {
      const res = await loadMyGemAction()
      if (res.error || !res.data) throw new Error(res.error ?? 'Could not load your page')
      return res.data
    },
    enabled: Boolean(user?.id),
    staleTime: 30_000,
  })

  const today = todayIso()
  const summary = useMemo(
    () => summarizeAttendance(query.data?.attendanceDates ?? [], today),
    [query.data?.attendanceDates, today]
  )

  if (authLoading || (user && query.isLoading)) return <LoadingPage title="Loading your page…" />
  if (!user) return null
  if (query.error || !query.data) {
    return (
      <ErrorDisplay
        error={query.error instanceof Error ? query.error.message : 'Could not load your page'}
        onRetry={() => void query.refetch()}
        variant="page"
        title="Could not load My GEM"
      />
    )
  }

  const data: MyGem = query.data
  const me = data.user
  const member = data.member
  const firstName = me.first_name || me.full_name.split(' ')[0] || 'friend'
  const checkInCode = member?.check_in_code
  const qrValue = member?.qr_code || checkInCode

  const dob = member?.dob
  const hasBirthday = Boolean(dob && birthdayPartsFromDob(dob).month != null)
  const birthdayDays = hasBirthday ? daysUntilNextBirthday(dob!) : null
  const birthdayDate = hasBirthday
    ? nextBirthdayDate(dob!).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })
    : null

  const detailValues: MyDetailsValues = {
    email: me.email ?? '',
    address: member?.address ?? '',
    area_of_residence: member?.area_of_residence ?? '',
    occupation: me.occupation ?? '',
    place_of_work: me.place_of_work ?? '',
    marital_status: me.marital_status ?? '',
    emergency_contact_name: me.emergency_contact_name ?? '',
    emergency_contact_phone: me.emergency_contact_phone ?? '',
    emergency_contact_relation: me.emergency_contact_relation ?? '',
  }

  const camp = data.camp
  const reg = camp?.registration

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Greeting + identity */}
      <section className="dashboard-panel p-4 sm:p-5" data-tour="me-identity">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            {member?.profile_photo_url ? (
              <img
                src={member.profile_photo_url}
                alt=""
                className="h-16 w-16 shrink-0 rounded-full object-cover"
              />
            ) : (
              <PersonAvatar name={me.full_name} seed={me.id} size="lg" className="h-16 w-16 text-lg" />
            )}
            <div className="min-w-0">
              <p className="app-overline">My GEM</p>
              <h1 className="app-page-title mt-1 break-words">
                Hello, {firstName}
              </h1>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">{me.full_name}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{titleCase(me.role)}</Badge>
                {me.membership_id ? (
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard?.writeText(me.membership_id)
                      toast({ title: 'Copied', description: 'Membership ID copied' })
                    }}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-md font-mono text-sm text-neutral-700 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white"
                    aria-label={`Copy membership ID ${me.membership_id}`}
                  >
                    {me.membership_id}
                    <Copy className="h-3.5 w-3.5" aria-hidden />
                  </button>
                ) : null}
              </div>
              {me.phone ? (
                <p className="mt-1 flex items-center gap-1.5 text-sm text-neutral-600 dark:text-neutral-400">
                  <Phone className="h-3.5 w-3.5" aria-hidden />
                  <span className="font-mono">{me.phone}</span>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">(your sign-in)</span>
                </p>
              ) : null}
            </div>
          </div>

          {qrValue ? (
            <div data-tour="me-qr" className="flex shrink-0 items-center gap-4 rounded-xl border border-neutral-200/80 p-3 dark:border-white/[0.06] sm:flex-col sm:gap-2">
              {/* QR stays dark-on-white in both themes so scanners can read it. */}
              <div className="rounded-lg bg-white p-2">
                <QRCode value={qrValue} size={112} aria-label="Your check-in QR code" />
              </div>
              <div className="sm:text-center">
                <p className="app-overline">Check-in code</p>
                {checkInCode ? (
                  <p className="mt-0.5 font-mono text-base font-semibold text-neutral-900 dark:text-white">{checkInCode}</p>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {/* Headline numbers */}
      <div data-tour="me-stats" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Streak"
          value={`${summary.streak} wk${summary.streak === 1 ? '' : 's'}`}
          sub={summary.streak > 0 ? 'Weeks in a row' : 'Come this week to start one'}
          icon={Flame}
        />
        <StatCard label="This month" value={summary.thisMonth} sub="Services attended" icon={CalendarCheck} />
        <StatCard
          label="Last 12 weeks"
          value={`${summary.weeksAttended}/12`}
          sub="Weeks you were there"
          icon={CalendarCheck}
        />
        <StatCard label="Groups" value={data.groups.length} sub="You belong to" icon={Users} />
      </div>

      <div data-tour="me-events" className="empty:hidden">
        <MyEvents />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Panel icon={CalendarCheck} title="Attendance, last 12 weeks" tour="me-attendance">
            {member ? (
              <AttendanceWeeks weeks={summary.weeks} />
            ) : (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Your member profile is not set up yet, so attendance can&apos;t be shown. Ask the church office.
              </p>
            )}
          </Panel>

          <Panel
            icon={Pencil}
            title="My details"
            tour="me-details"
            action={
              !editing ? (
                <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="h-11 sm:h-9">
                  <Pencil className="mr-2 h-4 w-4" aria-hidden />
                  Edit my details
                </Button>
              ) : null
            }
          >
            {editing ? (
              <MyDetailsForm
                initial={detailValues}
                onCancel={() => setEditing(false)}
                onSaved={() => {
                  setEditing(false)
                  void query.refetch()
                }}
              />
            ) : (
              <>
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Detail label="Email" value={me.email} />
                  <Detail label="Area of residence" value={member?.area_of_residence} />
                  <Detail label="Address" value={member?.address} />
                  <Detail label="Occupation" value={me.occupation} />
                  <Detail label="Place of work or school" value={me.place_of_work} />
                  <Detail label="Marital status" value={titleCase(me.marital_status)} />
                  <Detail
                    label="Emergency contact"
                    value={
                      [me.emergency_contact_name, me.emergency_contact_relation && `(${me.emergency_contact_relation})`]
                        .filter(Boolean)
                        .join(' ') || undefined
                    }
                  />
                  <Detail label="Emergency contact phone" value={me.emergency_contact_phone} mono />
                </dl>
                <p className="mt-4 border-t border-neutral-200/80 pt-3 text-[13px] text-neutral-500 dark:border-white/[0.06] dark:text-neutral-400">
                  Need to change your phone number? It&apos;s how you sign in, so please contact the church office.
                </p>
              </>
            )}
          </Panel>

          <Panel icon={Users} title="My groups" tour="me-groups">
            {data.groups.length === 0 ? (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                You&apos;re not in a group yet. Ask a leader about joining a fellowship or ministry.
              </p>
            ) : (
              <ul className="divide-y divide-neutral-200/80 dark:divide-white/[0.06]">
                {data.groups.map((group) => (
                  <li key={group.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">{group.name}</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">{titleCase(group.group_type)}</p>
                    </div>
                    <Badge variant={group.role === 'member' ? 'outline' : 'brand'}>{titleCase(group.role)}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <MyCampusCard />
          <Panel icon={Tent} title="Camp meeting">
            {!camp ? (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">No camp meeting is scheduled right now.</p>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                    Camp {camp.year.year}
                    {camp.year.theme ? `: ${camp.year.theme}` : ''}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {formatDay(camp.year.start_date)} to {formatDay(camp.year.end_date)}
                    {camp.year.venue ? ` · ${camp.year.venue}` : ''}
                  </p>
                </div>
                {reg ? (
                  <dl className="space-y-2 border-t border-neutral-200/80 pt-3 text-sm dark:border-white/[0.06]">
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-neutral-500 dark:text-neutral-400">Status</dt>
                      <dd>
                        <Badge variant={campStatusTone[reg.status] ?? 'secondary'}>{titleCase(reg.status)}</Badge>
                      </dd>
                    </div>
                    {reg.check_in_code ? (
                      <div className="flex items-center justify-between gap-2">
                        <dt className="text-neutral-500 dark:text-neutral-400">Camp code</dt>
                        <dd className="font-mono font-semibold text-neutral-900 dark:text-white">{reg.check_in_code}</dd>
                      </div>
                    ) : null}
                    {reg.payment_status ? (
                      <div className="flex items-center justify-between gap-2">
                        <dt className="text-neutral-500 dark:text-neutral-400">Payment</dt>
                        <dd className="text-neutral-800 dark:text-neutral-200">{titleCase(reg.payment_status)}</dd>
                      </div>
                    ) : null}
                    {reg.room_name ? (
                      <div className="flex items-center justify-between gap-2">
                        <dt className="text-neutral-500 dark:text-neutral-400">Room</dt>
                        <dd className="text-neutral-800 dark:text-neutral-200">{reg.room_name}</dd>
                      </div>
                    ) : null}
                  </dl>
                ) : (
                  <div className="border-t border-neutral-200/80 pt-3 dark:border-white/[0.06]">
                    <p className="text-sm text-neutral-600 dark:text-neutral-300">You haven&apos;t registered yet.</p>
                    {camp.year.registration_open ? (
                      <Button asChild size="sm" className="mt-3 h-11 w-full sm:h-9">
                        <Link href="/camp-meeting/register">Register for camp</Link>
                      </Button>
                    ) : null}
                  </div>
                )}
              </div>
            )}
          </Panel>

          <Panel icon={Home} title="My household" tour="me-household">
            {data.household ? (
              <>
                <p className="text-sm font-medium text-neutral-900 dark:text-white">{data.household.name}</p>
                <ul className="mt-3 space-y-2">
                  {data.household.members.map((person) => (
                    <li key={person.id} className="flex items-center gap-2.5 text-sm text-neutral-700 dark:text-neutral-300">
                      <PersonAvatar name={person.full_name} seed={person.id} size="sm" />
                      <span className="truncate">
                        {person.full_name}
                        {person.id === me.id ? <span className="text-neutral-500 dark:text-neutral-400"> (you)</span> : null}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                You&apos;re not linked to a household. The church office can link your family.
              </p>
            )}
          </Panel>

          <Panel icon={Cake} title="Birthday">
            {birthdayDays == null ? (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Your birthday isn&apos;t on record. Tell the church office so we can celebrate with you.
              </p>
            ) : birthdayDays === 0 ? (
              <p className="text-sm font-medium text-neutral-900 dark:text-white">Happy birthday, {firstName}!</p>
            ) : (
              <p className="text-sm text-neutral-700 dark:text-neutral-300">
                <span className="font-semibold text-neutral-900 dark:text-white">{birthdayDate}</span>
                <span className="block text-xs text-neutral-500 dark:text-neutral-400">
                  in {birthdayDays} day{birthdayDays === 1 ? '' : 's'}
                </span>
              </p>
            )}
          </Panel>
        </div>
      </div>
    </div>
  )
}

export default function MyGemPage() {
  return (
    <ErrorBoundary>
      <DashboardLayout>
        <MyGemContent />
      </DashboardLayout>
    </ErrorBoundary>
  )
}
