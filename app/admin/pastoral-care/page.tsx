'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarClock, HeartHandshake, MessageSquare, Send, UserX, Users } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { StatCard } from '@/components/ui/stat-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LoadingSpinner } from '@/components/ui/loading'
import { PersonAvatar } from '@/components/ui/person'
import { PhoneLink, QuickContactButtons } from '@/components/contact/phone-link'
import { AccessDenied } from '@/components/auth/access-denied'
import { useAuth } from '@/components/providers'
import { useToast } from '@/hooks/use-toast'
import { useSmsPreview } from '@/components/comms/sms-preview'
import { ROLE_LABELS } from '@/lib/auth/roles'
import type { UserRole } from '@/lib/types'
import { shortDate } from '@/lib/pastoral/absence'
import {
  getPastoralCareOverviewAction,
  runPastoralCareJob,
  savePastoralSettingsAction,
  sendPastoralTextsNowAction,
  type PastoralCareOverview,
} from '@/lib/actions/pastoral-care'

type Draft = PastoralCareOverview['settings']

function roleLabel(role: string): string {
  return ROLE_LABELS[role as UserRole] ?? role
}

export default function PastoralCarePage() {
  const { loading: authLoading, can } = useAuth()
  const { toast } = useToast()
  const smsPreview = useSmsPreview()
  const [data, setData] = useState<PastoralCareOverview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await getPastoralCareOverviewAction()
    setError(res.error)
    setData(res.data)
    if (res.data) setDraft(res.data.settings)
    setLoading(false)
  }, [])

  const allowed = can('members.manage')
  useEffect(() => {
    if (!authLoading && allowed) void load()
  }, [authLoading, allowed, load])

  const dirty = useMemo(() => {
    if (!data || !draft) return false
    const a = data.settings
    return (
      !a.configured ||
      a.alerts_enabled !== draft.alerts_enabled ||
      a.digest_enabled !== draft.digest_enabled ||
      a.weeks_threshold !== draft.weeks_threshold ||
      a.fallback_user_ids.join() !== draft.fallback_user_ids.join()
    )
  }, [data, draft])

  if (authLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }
  if (!allowed) return <AccessDenied permission="members.manage" />

  const canSend = can('sms.send')

  async function save() {
    if (!draft) return
    setSaving(true)
    const res = await savePastoralSettingsAction(draft)
    setSaving(false)
    if (res.error) {
      toast({ title: 'Could not save', description: res.error, variant: 'destructive' })
      return
    }
    toast({ title: 'Settings saved', description: 'The Monday texts will follow these settings.' })
    void load()
  }

  async function sendNow() {
    // Dry run first so the preview shows exactly what each leader will get.
    setSending(true)
    const planned = await runPastoralCareJob({ dry_run: true })
    setSending(false)
    if (planned.error || !planned.data) {
      toast({ title: 'Could not prepare the texts', description: planned.error ?? 'Unknown error', variant: 'destructive' })
      return
    }
    const messages = planned.data.messages ?? []
    if (!messages.length) {
      toast({
        title: 'Nothing to send',
        description: planned.data.skipped === 'disabled' ? 'Alerts and the summary are both turned off.' : undefined,
      })
      return
    }
    const ok = await smsPreview({
      title: "This week's pastoral care texts",
      recipients: messages.map((m) => ({ name: m.name, phone: m.phone, message: m.text })),
      warnings: [
        'Alerts sent now will not repeat on Monday.',
        ...(dirty ? ['You have unsaved settings. These texts use the saved settings.'] : []),
      ],
    })
    if (!ok) return

    setSending(true)
    const res = await sendPastoralTextsNowAction()
    setSending(false)
    if (res.error || !res.data) {
      toast({ title: 'Send failed', description: res.error ?? 'Unknown error', variant: 'destructive' })
      return
    }
    const d = res.data
    toast({
      title: d.sent ? `Sent ${d.sent} text${d.sent === 1 ? '' : 's'}` : 'Nothing sent',
      description:
        d.failed || d.deferred
          ? `${d.failed} failed, ${d.deferred} not attempted. ${d.errors[0] ?? ''}`
          : d.skipped === 'disabled'
            ? 'Alerts and the summary are both turned off.'
            : undefined,
      variant: d.failed ? 'destructive' : undefined,
    })
    void load()
  }

  const toggleFallback = (id: string, on: boolean) =>
    setDraft((d) =>
      d ? { ...d, fallback_user_ids: on ? [...d.fallback_user_ids, id] : d.fallback_user_ids.filter((x) => x !== id) } : d
    )

  const previewCount = data?.preview.length ?? 0

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Pastoral care"
        description="Every Monday at 07:30 each group leader gets one text: how their group did on Sunday, birthdays this week, and anyone who has stopped coming. People in no group go to the fallback contacts."
        actions={
          canSend ? (
            <Button onClick={() => void sendNow()} disabled={loading || sending || !previewCount}>
              <Send className="mr-2 h-4 w-4" aria-hidden />
              Send now
            </Button>
          ) : null
        }
      />

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-200">
          {error}
        </p>
      ) : null}

      {loading && !data ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <LoadingSpinner />
        </div>
      ) : data && draft ? (
        <>
          {!data.scheduled_active ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200">
              {data.settings.configured
                ? 'Alerts and the weekly summary are both off, so nothing is sent on Mondays.'
                : 'Nothing is sent on Mondays until you save these settings once. Check the preview below first.'}
            </p>
          ) : null}

          <div data-tour="pastoral-stats" className="grid gap-3 sm:grid-cols-3">
            <StatCard label="Stopped coming" value={data.lapsed.length} icon={UserX} tone={data.lapsed.length ? 'warning' : 'default'} sub={`${draft.weeks_threshold}+ Sundays missed`} />
            <StatCard label="Texts this week" value={previewCount} icon={MessageSquare} sub={`For Sunday ${shortDate(data.last_sunday)}`} />
            <StatCard
              label="Last run"
              value={data.last_run_at ? new Date(data.last_run_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : 'Never'}
              icon={CalendarClock}
              sub={data.last_run_summary ? `${String(data.last_run_summary.sent ?? 0)} sent` : 'Mondays 07:30 UTC'}
            />
          </div>

          <section className="dashboard-panel p-5" data-tour="pastoral-settings">
            <h2 className="app-section-title">Settings</h2>
            <div className="mt-4 grid gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <label className="flex items-start gap-3">
                  <Checkbox
                    checked={draft.alerts_enabled}
                    onCheckedChange={(v) => setDraft({ ...draft, alerts_enabled: v === true })}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="block text-sm font-medium text-neutral-900 dark:text-neutral-100">Missed-church alerts</span>
                    <span className="block text-sm text-neutral-500 dark:text-neutral-400">
                      Tell leaders when a regular has missed several Sundays in a row. Once per lapse; again after 4 more weeks.
                    </span>
                  </span>
                </label>
                <label className="flex items-start gap-3">
                  <Checkbox
                    checked={draft.digest_enabled}
                    onCheckedChange={(v) => setDraft({ ...draft, digest_enabled: v === true })}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="block text-sm font-medium text-neutral-900 dark:text-neutral-100">Weekly leader summary</span>
                    <span className="block text-sm text-neutral-500 dark:text-neutral-400">
                      Sunday attendance for the group, birthdays this week, and who is missing.
                    </span>
                  </span>
                </label>
                <div className="space-y-1.5">
                  <Label htmlFor="weeks">Count someone as missing after</Label>
                  <Select
                    value={String(draft.weeks_threshold)}
                    onValueChange={(v) => setDraft({ ...draft, weeks_threshold: Number(v) })}
                  >
                    <SelectTrigger id="weeks" className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[2, 3, 4, 5, 6, 8].map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n} Sundays
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Only people who came at least 3 of the 8 Sundays before. Sundays with no attendance entered are skipped.
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Fallback contacts</p>
                <p className="mb-2 text-sm text-neutral-500 dark:text-neutral-400">
                  For people in no group with a leader. None chosen means every pastor.
                </p>
                <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-neutral-200/80 p-2 dark:border-white/10">
                  {data.contacts.length === 0 ? (
                    <p className="p-2 text-sm text-neutral-500 dark:text-neutral-400">No staff users yet.</p>
                  ) : (
                    data.contacts.map((c) => (
                      <label key={c.id} className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-neutral-50 dark:hover:bg-white/[0.04]">
                        <Checkbox
                          checked={draft.fallback_user_ids.includes(c.id)}
                          onCheckedChange={(v) => toggleFallback(c.id, v === true)}
                        />
                        <span className="flex-1 text-sm text-neutral-800 dark:text-neutral-200">{c.full_name}</span>
                        <Badge variant="secondary">{roleLabel(c.role)}</Badge>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <Button onClick={() => void save()} disabled={saving || !dirty}>
                {saving ? 'Saving…' : data.settings.configured ? 'Save settings' : 'Save and turn on'}
              </Button>
            </div>
          </section>

          <section className="dashboard-panel p-5" data-tour="pastoral-preview">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="app-section-title">Preview this week</h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Exactly what would be sent now, using the saved settings. Nothing is sent from here.
              </p>
            </div>
            {data.preview.length === 0 ? (
              <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
                No texts this week. Leaders get one once their group has attendance, a birthday or someone missing.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {data.preview.map((m) => (
                  <li key={m.user_id} className="rounded-lg border border-neutral-200/80 p-3 dark:border-white/[0.06]">
                    <div className="flex flex-wrap items-center gap-2">
                      <PersonAvatar name={m.name} seed={m.user_id} size="sm" />
                      <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{m.name}</span>
                      <PhoneLink phone={m.phone} name={m.name} className="text-sm text-neutral-600 dark:text-neutral-300" />
                      {m.fallback ? <Badge variant="brand">Fallback contact</Badge> : null}
                      {m.alert_member_ids.length ? <Badge variant="warning">{m.alert_member_ids.length} alert{m.alert_member_ids.length === 1 ? '' : 's'}</Badge> : null}
                      <Badge variant="outline" className="ml-auto">
                        {m.segments ?? 1} SMS
                      </Badge>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-700 dark:bg-white/[0.04] dark:text-neutral-300">
                      {m.text}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            {data.skipped.no_phone.length || data.skipped.no_recipient.length ? (
              <div className="mt-4 space-y-1 text-sm text-amber-800 dark:text-amber-200">
                {data.skipped.no_phone.length ? (
                  <p>No usable phone, not texted: {data.skipped.no_phone.map((s) => s.name).join(', ')}.</p>
                ) : null}
                {data.skipped.no_recipient.length ? (
                  <p>Nobody to tell about: {data.skipped.no_recipient.join(', ')}. Add a fallback contact.</p>
                ) : null}
              </div>
            ) : null}
          </section>

          <section className="dashboard-panel p-5" data-tour="pastoral-lapsed">
            <h2 className="app-section-title">Stopped coming</h2>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              Regulars who have missed {data.settings.weeks_threshold} or more Sundays in a row.
            </p>
            {data.lapsed.length === 0 ? (
              <div className="mt-6 flex flex-col items-center gap-2 py-6 text-center">
                <HeartHandshake className="h-8 w-8 text-emerald-500 dark:text-emerald-400" aria-hidden />
                <p className="text-sm text-neutral-600 dark:text-neutral-300">Nobody has stopped coming. Everyone regular was seen recently.</p>
              </div>
            ) : (
              <ul className="mt-4 divide-y divide-neutral-200/80 dark:divide-white/[0.06]">
                {data.lapsed.map((l) => (
                  <li key={l.member_id} className="flex flex-wrap items-center gap-3 py-3">
                    <PersonAvatar name={l.name} seed={l.member_id} />
                    <div className="min-w-0 flex-1">
                      <a
                        href={`/members/${l.member_id}`}
                        className="text-sm font-medium text-neutral-900 hover:text-brand-600 dark:text-neutral-100 dark:hover:text-brand-300"
                      >
                        {l.name}
                      </a>
                      <p className="flex flex-wrap items-center gap-x-2 text-xs text-neutral-500 dark:text-neutral-400">
                        <span>Last seen {l.last_seen ? shortDate(l.last_seen) : 'unknown'}</span>
                        <span aria-hidden>·</span>
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3 w-3" aria-hidden />
                          {l.groups.length ? l.groups.join(', ') : 'No group'}
                        </span>
                        {l.phone ? (
                          <>
                            <span aria-hidden>·</span>
                            <PhoneLink phone={l.phone} name={l.name} className="text-xs" />
                          </>
                        ) : null}
                      </p>
                    </div>
                    <Badge variant={l.streak >= 6 ? 'danger' : 'warning'}>{l.streak} Sundays</Badge>
                    {l.alert_due ? (
                      <Badge variant="brand">Alert this week</Badge>
                    ) : l.last_alerted_at ? (
                      <Badge variant="secondary">
                        Alerted {new Date(l.last_alerted_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                      </Badge>
                    ) : null}
                    <QuickContactButtons phone={l.phone} name={l.name} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}

    </div>
  )
}
