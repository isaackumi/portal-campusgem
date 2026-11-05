'use client'

import { use, useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { CalendarDays, Check, Download, HelpCircle, MapPin, Pencil, RefreshCw, Search, UserPlus, Users, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { StatCard } from '@/components/ui/stat-card'
import { LoadingSpinner } from '@/components/ui/loading'
import { PageHeader } from '@/components/layout/page-header'
import { AccessDenied } from '@/components/auth/access-denied'
import { PhoneLink } from '@/components/contact/phone-link'
import { useAuth } from '@/components/providers'
import { useToast } from '@/hooks/use-toast'
import { useAllUsers } from '@/lib/hooks/use-data'
import { EventStatusBadge } from '@/components/events/event-status-badge'
import { EventInviteComposer } from '@/components/events/event-invite-composer'
import { addEventInviteesAction, getEventAction, removeEventInviteeAction, type EventDetail } from '@/lib/actions/events'
import type { EventInvitee } from '@/lib/convex/events-bridge'
import { RESPONSE_LABELS, capacityLeft, formatEventWhen, tallyRsvps, type RsvpResponse } from '@/lib/events/rsvp'
import { downloadCsv, slugForFilename, textCell, toCsv } from '@/lib/csv'
import { cn } from '@/lib/utils'

const REFRESH_MS = 20_000
type Filter = 'all' | RsvpResponse | 'none'

const RESPONSE_BADGE: Record<RsvpResponse, 'success' | 'warning' | 'secondary'> = {
  yes: 'success',
  maybe: 'warning',
  no: 'secondary',
}

function when(ms?: number): string {
  if (!ms) return ''
  return new Date(ms).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
}

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { loading: authLoading, can } = useAuth()
  const { toast } = useToast()
  const allowed = can('groups.manage')
  const canSms = can('sms.send')
  const [detail, setDetail] = useState<EventDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [syncing, startSync] = useTransition()

  const load = useCallback(async () => {
    const res = await getEventAction(id)
    if (res.data) {
      setDetail(res.data)
      setError(null)
    } else setError(res.error)
  }, [id])

  useEffect(() => {
    if (!allowed) return
    void load()
    // A live-ish headcount: refresh while the tab is visible.
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load()
    }, REFRESH_MS)
    return () => window.clearInterval(timer)
  }, [allowed, load])

  const tally = useMemo(() => tallyRsvps(detail?.rsvps ?? []), [detail])
  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return (detail?.rsvps ?? [])
      .filter((r) => (filter === 'all' ? true : filter === 'none' ? !r.response : r.response === filter))
      .filter((r) => !needle || r.name.toLowerCase().includes(needle) || (r.phone ?? '').includes(needle))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [detail, filter, query])

  function syncInvitees(userIds?: string[]) {
    startSync(async () => {
      const res = await addEventInviteesAction({ event_id: id, user_ids: userIds })
      if (res.error) toast({ title: 'Could not update the list', description: res.error, variant: 'destructive' })
      else toast({ title: res.data?.added ? `${res.data.added} added to the invite list` : 'Invite list is up to date' })
      await load()
    })
  }

  async function remove(r: EventInvitee) {
    if (!window.confirm(`Remove ${r.name} from the invite list? Their link stops working.`)) return
    const res = await removeEventInviteeAction(r.id)
    if (res.error) toast({ title: 'Could not remove', description: res.error, variant: 'destructive' })
    await load()
  }

  function exportCsv() {
    if (!detail) return
    const csv = toCsv(
      ['Name', 'Phone', 'Membership ID', 'Response', 'Guests', 'Headcount', 'Responded', 'Invited', 'Reminded'],
      detail.rsvps.map((r) => [
        r.name,
        textCell(r.phone),
        textCell(r.membership_id),
        r.response ? RESPONSE_LABELS[r.response] : 'No reply',
        r.response === 'yes' ? r.guests : '',
        r.response === 'yes' ? 1 + r.guests : 0,
        when(r.responded_at),
        when(r.invited_at),
        when(r.reminder_sent_at),
      ])
    )
    downloadCsv(`${slugForFilename(detail.event.title)}-rsvps.csv`, csv)
  }

  if (authLoading) return <LoadingSpinner />
  if (!allowed) return <AccessDenied permission="groups.manage" />
  if (!detail) return error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : <LoadingSpinner />

  const { event } = detail
  const left = capacityLeft(event.capacity, tally.headcount)
  const audienceLabel =
    event.audience === 'all' ? 'All members' : event.audience === 'group' ? `Group: ${detail.group_name ?? 'unknown'}` : 'Chosen people'

  return (
    <div>
      <PageHeader
        eyebrow="Events"
        title={event.title}
        description={event.description}
        actions={
          <>
            <Button variant="outline" onClick={exportCsv}>
              <Download className="mr-2 h-4 w-4" aria-hidden />
              Export CSV
            </Button>
            <Button asChild variant="outline">
              <Link href={`/admin/events/${event.id}/edit`}>
                <Pencil className="mr-2 h-4 w-4" aria-hidden />
                Edit
              </Link>
            </Button>
          </>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-neutral-600 dark:text-neutral-300">
        <EventStatusBadge status={event.status} />
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays className="h-4 w-4 text-neutral-400 dark:text-neutral-500" aria-hidden />
          {formatEventWhen(event.starts_at, event.ends_at)}
        </span>
        {event.location ? (
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-neutral-400 dark:text-neutral-500" aria-hidden />
            {event.location}
          </span>
        ) : null}
        <span className="inline-flex items-center gap-1.5">
          <Users className="h-4 w-4 text-neutral-400 dark:text-neutral-500" aria-hidden />
          {audienceLabel}
        </span>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Coming" value={tally.headcount} sub={`${tally.yes} yes + ${tally.guests} guests`} tone="success" icon={Check} />
        <StatCard label="Maybe" value={tally.maybe} icon={HelpCircle} tone="warning" />
        <StatCard label="Not going" value={tally.no} icon={X} />
        <StatCard label="No reply" value={tally.noReply} sub={`${tally.invited} of ${tally.total} texted`} />
        <StatCard
          label="Places left"
          value={left == null ? '∞' : left}
          sub={event.capacity ? `of ${event.capacity}` : 'No limit'}
          tone={left === 0 ? 'danger' : 'default'}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="dashboard-panel p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="app-section-title">Invitees ({detail.rsvps.length})</h2>
            {event.audience !== 'custom' ? (
              <Button variant="outline" size="sm" onClick={() => syncInvitees()} disabled={syncing}>
                <RefreshCw className={cn('mr-2 h-4 w-4', syncing && 'animate-spin')} aria-hidden />
                {detail.rsvps.length ? 'Add new members' : 'Build invite list'}
              </Button>
            ) : null}
          </div>

          {event.audience === 'custom' ? <PeoplePicker existing={detail.rsvps} onAdd={syncInvitees} busy={syncing} /> : null}

          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" aria-hidden />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or phone" className="pl-9" aria-label="Search invitees" />
            </div>
            <div className="flex flex-wrap gap-1">
              {(['all', 'yes', 'maybe', 'no', 'none'] as const).map((f) => (
                <Button key={f} size="sm" variant={filter === f ? 'default' : 'outline'} onClick={() => setFilter(f)} aria-pressed={filter === f}>
                  {f === 'all' ? 'All' : f === 'none' ? 'No reply' : RESPONSE_LABELS[f]}
                </Button>
              ))}
            </div>
          </div>

          {detail.rsvps.length === 0 ? (
            <p className="py-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
              {event.audience === 'custom' ? 'Add people above to invite them.' : 'Build the invite list to give everyone in the audience their link.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200/80 text-left dark:border-white/[0.06]">
                    <th className="app-overline py-2 pr-3 font-medium">Name</th>
                    <th className="app-overline py-2 pr-3 font-medium">Phone</th>
                    <th className="app-overline py-2 pr-3 font-medium">Answer</th>
                    <th className="app-overline py-2 pr-3 font-medium">Texted</th>
                    {event.audience === 'custom' ? <th className="sr-only">Remove</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b border-neutral-100 last:border-0 dark:border-white/[0.04]">
                      <td className="py-2 pr-3 font-medium text-neutral-900 dark:text-white">
                        <Link href={`/members/${r.user_id}`} className="hover:underline">
                          {r.name}
                        </Link>
                        {r.sms_opt_out ? (
                          <Badge variant="warning" className="ml-2">
                            STOP
                          </Badge>
                        ) : null}
                      </td>
                      <td className="py-2 pr-3 text-neutral-700 dark:text-neutral-300">
                        <PhoneLink phone={r.phone} name={r.name} />
                      </td>
                      <td className="py-2 pr-3">
                        {r.response ? (
                          <Badge variant={RESPONSE_BADGE[r.response]}>
                            {RESPONSE_LABELS[r.response]}
                            {r.response === 'yes' && r.guests ? ` +${r.guests}` : ''}
                          </Badge>
                        ) : (
                          <span className="text-neutral-400 dark:text-neutral-500">No reply</span>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-xs text-neutral-500 dark:text-neutral-400">
                        {r.reminder_sent_at ? `Reminded ${when(r.reminder_sent_at)}` : r.invited_at ? when(r.invited_at) : 'Not yet'}
                      </td>
                      {event.audience === 'custom' ? (
                        <td className="py-2 text-right">
                          <Button variant="ghost" size="icon" aria-label={`Remove ${r.name}`} onClick={() => void remove(r)}>
                            <X className="h-4 w-4" aria-hidden />
                          </Button>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length === 0 ? <p className="py-4 text-center text-sm text-neutral-500 dark:text-neutral-400">Nobody matches.</p> : null}
            </div>
          )}
        </section>

        <section className="dashboard-panel h-fit p-5">
          <h2 className="app-section-title mb-4">Invite by SMS</h2>
          {canSms ? (
            <EventInviteComposer event={event} rsvps={detail.rsvps} linkOrigin={detail.link_origin} onSent={() => void load()} />
          ) : (
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Texting invitations needs the Send SMS permission. Ask an administrator under Access &amp; roles.
            </p>
          )}
        </section>
      </div>
    </div>
  )
}

function PeoplePicker({ existing, onAdd, busy }: { existing: EventInvitee[]; onAdd: (ids: string[]) => void; busy: boolean }) {
  const { data: users } = useAllUsers()
  const [q, setQ] = useState('')
  const invited = useMemo(() => new Set(existing.map((r) => r.user_id)), [existing])
  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (needle.length < 2) return []
    const digits = needle.replace(/\D/g, '')
    return (users ?? [])
      .filter((u) => !u.merged_into && !invited.has(u.id))
      .filter(
        (u) =>
          u.full_name.toLowerCase().includes(needle) ||
          (digits.length >= 3 && (u.phone ?? '').replace(/\D/g, '').includes(digits)) ||
          u.membership_id.toLowerCase() === needle
      )
      .slice(0, 8)
  }, [users, q, invited])

  return (
    <div className="mb-4 rounded-xl border border-neutral-200/80 p-3 dark:border-white/[0.06]">
      <label htmlFor="ev-add-person" className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
        Add people
      </label>
      <Input id="ev-add-person" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, phone or membership ID" className="mt-1.5" />
      {matches.length ? (
        <ul className="mt-2 divide-y divide-neutral-100 dark:divide-white/[0.04]">
          {matches.map((u) => (
            <li key={u.id} className="flex items-center justify-between gap-2 py-1.5">
              <span className="text-sm text-neutral-800 dark:text-neutral-100">
                {u.full_name} <span className="font-mono text-xs text-neutral-500 dark:text-neutral-400">{u.phone}</span>
              </span>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => onAdd([u.id])}>
                <UserPlus className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                Add
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
