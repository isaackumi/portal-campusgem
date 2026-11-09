'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/components/providers'
import { useBackgroundJobs } from '@/components/background-jobs'
import { parseManualRecipients, personalizeMessage } from '@/lib/comms/recipients'
import { useSmsPreview } from '@/components/comms/sms-preview'
import { householdIdsOf, onePerHousehold } from '@/lib/households/one-per-household'
import { loadHouseholdPrimariesAction } from '@/lib/actions/households'
import {
  getCommsProviderStatusAction,
  getCommsStatsAction,
  listCommunicationsAction,
  loadCommsGroupsAction,
  resolveGroupRecipientsAction,
  resendCommunicationAction,
  searchCommsRecipientsAction,
  sendCommsAction,
} from '@/lib/actions/comms'
import {
  COMMS_CHANNEL_LABELS,
  COMMS_MODULE_LABELS,
  COMMS_STATUS_LABELS,
  type CommunicationRecord,
  type CommsChannel,
  type CommsModule,
  type CommsRecipient,
  type CommsStats,
} from '@/lib/comms/types'
import { PageContainer } from '@/components/layout/page-container'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoadingSpinner } from '@/components/ui/loading'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, ScrollableTabsList, TabsTrigger } from '@/components/ui/tabs'
import { StatCard } from '@/components/ui/stat-card'
import { PageHeader } from '@/components/layout/page-header'
import { PhoneLink } from '@/components/contact/phone-link'
import { FormActionBar } from '@/components/admin/form-action-bar'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { isValidSmsPhone, normalizeSmsPhone } from '@/lib/comms/sms-client'
import {
  SmsProviderBanner,
  type SmsProviderStatus,
  commsMetaBadge,
} from '@/components/comms/sms-provider-banner'
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Mail,
  MessageSquare,
  RefreshCw,
  Send,
  Users,
  XCircle,
} from 'lucide-react'

const MODULES: CommsModule[] = ['church', 'rlc', 'camp']

function statusIcon(status: CommunicationRecord['status']) {
  switch (status) {
    case 'sent':
    case 'delivered':
      return <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
    case 'failed':
    case 'bounced':
      return <XCircle className="h-4 w-4 text-red-600 dark:text-red-300" />
    case 'pending':
      return <Clock className="h-4 w-4 text-amber-600 dark:text-amber-300" />
    default:
      return <AlertCircle className="h-4 w-4 text-neutral-400 dark:text-neutral-400" />
  }
}

function StatTile({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return <StatCard className="p-4 sm:p-5" label={label} value={value} sub={hint} />
}

export function CommsCenterView() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [activeTab, setActiveTab] = useState('compose')
  const [moduleFilter, setModuleFilter] = useState<CommsModule | 'all'>('all')
  const [history, setHistory] = useState<CommunicationRecord[]>([])
  const [stats, setStats] = useState<CommsStats | null>(null)
  const [providers, setProviders] = useState<SmsProviderStatus | null>(null)
  const [loading, setLoading] = useState(true)
  // Sends run as a background job; the page stays usable and shows progress.
  const { start: startJob, isRunning: sending } = useBackgroundJobs()
  const preview = useSmsPreview()
  const [dryRun, setDryRun] = useState(false)
  const [forceMock, setForceMock] = useState(false)

  // Compose state
  const [module, setModule] = useState<CommsModule>('church')
  const [channel, setChannel] = useState<CommsChannel>('sms')
  const [audienceMode, setAudienceMode] = useState<'single' | 'group' | 'manual'>('single')
  const [subject, setSubject] = useState('')
  const [messageBody, setMessageBody] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<CommsRecipient[]>([])
  const [selectedRecipients, setSelectedRecipients] = useState<CommsRecipient[]>([])
  const [onePerHouse, setOnePerHouse] = useState(false)
  const [householdPrimaries, setHouseholdPrimaries] = useState<Record<string, string | null>>({})
  const [groups, setGroups] = useState<Array<{ id: string; name: string; group_type: string }>>([])
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [manualRecipients, setManualRecipients] = useState('')
  const [searching, setSearching] = useState(false)
  const [resendingId, setResendingId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    const [historyRes, statsRes, providerRes] = await Promise.all([
      listCommunicationsAction({
        module: moduleFilter === 'all' ? undefined : moduleFilter,
        limit: 150,
      }),
      getCommsStatsAction(moduleFilter === 'all' ? undefined : moduleFilter),
      getCommsProviderStatusAction(),
    ])
    setHistory(historyRes.data ?? [])
    setStats(statsRes.data ?? null)
    setProviders(providerRes.data ?? null)
    if (providerRes.data?.devModeAvailable && providerRes.data.environment !== 'production') {
      setDryRun((prev) => prev || false)
    }
    setLoading(false)
  }, [moduleFilter])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    void loadCommsGroupsAction().then(({ data }) => setGroups(data ?? []))
  }, [])

  useEffect(() => {
    if (audienceMode !== 'single') return
    // Only the latest search may show its results: an older, slower reply is dropped.
    let current = true
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const { data } = await searchCommsRecipientsAction({
          module,
          query: searchQuery,
          limit: 40,
        })
        if (current) setSearchResults(data ?? [])
      } catch {
        if (current) setSearchResults([])
      } finally {
        if (current) setSearching(false)
      }
    }, 300)
    return () => {
      current = false
      clearTimeout(timer)
    }
  }, [module, searchQuery, audienceMode])

  useEffect(() => {
    setSelectedRecipients([])
    setSelectedGroupId('')
    setSearchQuery('')
  }, [module, audienceMode])

  async function loadGroupMembers(groupId: string) {
    if (!groupId) {
      setSelectedRecipients([])
      return
    }
    const { data, error } = await resolveGroupRecipientsAction({ group_id: groupId, module })
    if (error) {
      toast({ variant: 'destructive', title: 'Could not load group', description: error })
      return
    }
    setSelectedRecipients(data ?? [])
  }

  function toggleRecipient(recipient: CommsRecipient, checked: boolean) {
    setSelectedRecipients((prev) => {
      const exists = prev.some((r) => r.id === recipient.id && r.entity_id === recipient.entity_id)
      if (checked && !exists) return [...prev, recipient]
      if (!checked) return prev.filter((r) => !(r.id === recipient.id && r.entity_id === recipient.entity_id))
      return prev
    })
  }

  const householdIds = useMemo(
    () => householdIdsOf(selectedRecipients, (r) => r.household_id),
    [selectedRecipients]
  )

  useEffect(() => {
    if (!onePerHouse || householdIds.length === 0) return
    let alive = true
    void loadHouseholdPrimariesAction(householdIds)
      .then((res) => {
        if (alive && res.data) setHouseholdPrimaries(res.data)
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [onePerHouse, householdIds])

  /** Selected people after "One text per household" (when on). */
  const { kept: effectiveRecipients, dropped: householdDropped } = useMemo(
    () =>
      onePerHouse
        ? onePerHousehold(selectedRecipients, {
            householdId: (r) => r.household_id,
            userId: (r) => r.user_id,
            isReachable: (r) => (channel === 'email' ? Boolean(r.email) : isValidSmsPhone(r.phone)),
            primaryByHousehold: householdPrimaries,
          })
        : { kept: selectedRecipients, dropped: [] as CommsRecipient[] },
    [onePerHouse, selectedRecipients, channel, householdPrimaries]
  )

  const deliverableCount = useMemo(() => {
    return effectiveRecipients.filter((r) =>
      channel === 'email' ? Boolean(r.email) : isValidSmsPhone(r.phone)
    ).length
  }, [effectiveRecipients, channel])

  function canStartSend(): boolean {
    if (!user?.id) return false
    if (!messageBody.trim()) {
      toast({ variant: 'destructive', title: 'Message is required' })
      return false
    }
    if (channel === 'email' && !subject.trim()) {
      toast({ variant: 'destructive', title: 'Subject is required for email' })
      return false
    }
    return true
  }

  function requestSend() {
    if (!canStartSend()) return
    void handleSend()
  }

  async function handleSend() {
    if (!canStartSend()) return

    const audience_type =
      audienceMode === 'group' ? 'group' : selectedRecipients.length > 1 ? 'bulk' : 'individual'

    // Build the full list here (same de-duplication as the server) so it can be sent in chunks.
    const unique = new Map<string, CommsRecipient>()
    const all = [
      ...(audienceMode === 'manual' ? [] : effectiveRecipients),
      ...(audienceMode === 'manual' && manualRecipients.trim()
        ? parseManualRecipients(manualRecipients, channel, module)
        : []),
    ]
    for (const r of all) {
      const key = `${r.entity_type}:${r.entity_id}:${r.email ?? ''}:${r.phone ?? ''}`
      if (!unique.has(key)) unique.set(key, r)
    }
    const recipients = Array.from(unique.values())
    if (recipients.length === 0) {
      toast({ variant: 'destructive', title: 'Send failed', description: 'Select at least one recipient' })
      return
    }

    const request = {
      module,
      channel,
      audience_type,
      sender_id: user!.id,
      subject: channel === 'email' ? subject : undefined,
      message_body: messageBody,
      dry_run: channel === 'sms' ? dryRun : undefined,
      force_mock: channel === 'sms' ? forceMock : undefined,
      batch_id: crypto.randomUUID(),
      metadata:
        audienceMode === 'group' && selectedGroupId
          ? { group_id: selectedGroupId, group_name: groups.find((g) => g.id === selectedGroupId)?.name }
          : undefined,
    } as const
    const isDryRun = dryRun && channel === 'sms'

    if (channel === 'sms') {
      const deliverable = recipients.filter((r) => isValidSmsPhone(r.phone))
      const skipped = recipients.length - deliverable.length
      const ok = await preview({
        title: `${COMMS_MODULE_LABELS[module]} SMS`,
        message: messageBody,
        recipients: deliverable.map((r) => ({
          name: r.name,
          phone: normalizeSmsPhone(r.phone!),
          message: personalizeMessage(messageBody, {
            name: r.name.split(' ')[0] ?? r.name,
            full_name: r.name,
            ...(r.variables ?? {}),
          }),
        })),
        warnings: [
          ...(skipped > 0 ? [`${skipped} ${skipped === 1 ? 'person has' : 'people have'} no valid phone and will be skipped.`] : []),
          ...(isDryRun ? ['Dry run: nothing will actually be sent.'] : []),
          ...(forceMock ? ['Force mock is on: messages go to the mock provider, not real phones.'] : []),
        ],
        sendLabel: isDryRun ? 'Run dry run' : undefined,
      })
      if (!ok) return
    }

    startJob({
      title: `${isDryRun ? 'Dry run: ' : ''}${channel === 'sms' ? 'SMS' : 'Email'} to ${recipients.length}`,
      verb: isDryRun ? 'checked' : 'sent',
      items: recipients,
      runChunk: async (chunk) => {
        const { data, error } = await sendCommsAction({ ...request, recipients: chunk })
        if (error || !data) throw new Error(error ?? 'Unknown error')
        return { ok: data.success_count, failed: data.error_count, errors: data.errors }
      },
      onComplete: () => void refresh(),
    })
    setMessageBody('')
    setSubject('')
    setManualRecipients('')
    setSelectedRecipients([])
    setActiveTab('history')
  }

  async function handleResend(row: CommunicationRecord) {
    if (!user?.id) return
    const canResend =
      row.status === 'sent' ||
      row.status === 'delivered' ||
      row.status === 'failed' ||
      row.status === 'bounced'
    if (!canResend) return
    if (
      row.channel === 'sms' &&
      !(await preview({
        title: 'Resend SMS',
        message: row.message_body,
        recipients: [{ name: row.recipient_name, phone: row.recipient_phone }],
      }))
    )
      return

    setResendingId(row.id)
    const { data, error } = await resendCommunicationAction({
      sender_id: user.id,
      record: {
        id: row.id,
        module: row.module,
        channel: row.channel,
        audience_type: row.audience_type,
        recipient_name: row.recipient_name,
        recipient_email: row.recipient_email,
        recipient_phone: row.recipient_phone,
        recipient_entity_type: row.recipient_entity_type,
        recipient_entity_id: row.recipient_entity_id,
        subject: row.subject,
        message_body: row.message_body,
        status: row.status,
      },
    })
    setResendingId(null)

    if (error || !data) {
      toast({
        variant: 'destructive',
        title: 'Resend failed',
        description: error ?? 'Unknown error',
      })
      return
    }

    toast({
      title: data.success_count > 0 ? 'Message resent' : 'Resend failed',
      variant: data.success_count > 0 ? 'default' : 'destructive',
      description:
        data.success_count > 0
          ? `New ${COMMS_CHANNEL_LABELS[row.channel]} logged${
              data.batch_id ? ` · batch ${data.batch_id.slice(0, 8)}` : ''
            }`
          : data.errors[0] ?? 'Could not deliver',
    })
    await refresh()
  }

  if (loading && !history.length) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <PageContainer>
      <PageHeader
        className="mb-0"
        title="Communications Center"
        description="Send and track email & SMS across Campus Gem, RLC, and Camp — single, group, or bulk."
        actions={
          <>
            <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => void refresh()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button variant="outline" className="flex-1 sm:flex-none" asChild>
              <Link href="/admin/camp-meeting/communications">Camp bulk tools</Link>
            </Button>
          </>
        }
      />

      <div data-tour="comms-stats" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Total logged" value={stats?.total ?? 0} />
        <StatTile label="Sent / delivered" value={stats?.sent ?? 0} />
        <StatTile
          label="Failed"
          value={stats?.failed ?? 0}
          hint={`Email: ${providers?.email ?? 'mock'} · SMS: ${providers?.smsProvider ?? 'mock'}${
            providers?.smsConfigured ? '' : ' (not configured)'
          }`}
        />
        <StatTile label="SMS messages" value={stats?.sms ?? 0} hint={`${stats?.email ?? 0} emails logged`} />
      </div>

      {channel === 'sms' || providers ? (
        <div>
          <SmsProviderBanner
            status={providers}
            dryRun={dryRun}
            onDryRunChange={setDryRun}
            forceMock={forceMock}
            onForceMockChange={setForceMock}
            senderId={user?.id}
          />
        </div>
      ) : null}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <ScrollableTabsList data-tour="comms-tabs">
          <TabsTrigger value="compose">Compose</TabsTrigger>
          <TabsTrigger value="history">History ({history.length})</TabsTrigger>
        </ScrollableTabsList>

        <TabsContent value="compose" className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>New message</CardTitle>
              <CardDescription>
                Use {'{{name}}'} or {'{{full_name}}'} in your message for personalization.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div data-tour="comms-audience" className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Module</Label>
                  <Select value={module} onValueChange={(v) => setModule(v as CommsModule)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MODULES.map((m) => (
                        <SelectItem key={m} value={m}>
                          {COMMS_MODULE_LABELS[m]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Channel</Label>
                  <Select value={channel} onValueChange={(v) => setChannel(v as CommsChannel)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sms">
                        <span className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" /> SMS
                        </span>
                      </SelectItem>
                      <SelectItem value="email">
                        <span className="flex items-center gap-2">
                          <Mail className="h-4 w-4" /> Email
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Audience</Label>
                  <Select value={audienceMode} onValueChange={(v) => setAudienceMode(v as typeof audienceMode)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Search & select</SelectItem>
                      <SelectItem value="group">Group</SelectItem>
                      <SelectItem value="manual">Paste list</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {audienceMode === 'single' ? (
                <div className="space-y-3">
                  <Input
                    type="search"
                    placeholder="Search by name, phone, or email…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <div className="max-h-72 overflow-y-auto rounded-lg border sm:max-h-56">
                    {searching ? (
                      <p className="p-4 text-sm text-muted-foreground">Searching…</p>
                    ) : searchResults.length === 0 ? (
                      <p className="p-4 text-sm text-muted-foreground">No matches. Try another search.</p>
                    ) : (
                      searchResults.map((r) => {
                        const checked = selectedRecipients.some(
                          (s) => s.id === r.id && s.entity_id === r.entity_id
                        )
                        const contact = channel === 'email' ? r.email : r.phone
                        return (
                          <label
                            key={`${r.entity_type}-${r.entity_id}`}
                            className="flex min-h-12 cursor-pointer items-center gap-3 border-b px-3 py-2 last:border-0 hover:bg-neutral-50 dark:hover:bg-white/[0.06]"
                          >
                            <Checkbox checked={checked} onCheckedChange={(c) => toggleRecipient(r, c === true)} />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{r.name}</p>
                              <p className="truncate text-xs text-muted-foreground">{contact ?? 'No contact'}</p>
                            </div>
                            <Badge variant="outline" className="text-[10px]">
                              {r.entity_type}
                            </Badge>
                          </label>
                        )
                      })
                    )}
                  </div>
                </div>
              ) : null}

              {audienceMode === 'group' ? (
                <div className="space-y-3">
                  <Select
                    value={selectedGroupId}
                    onValueChange={(v) => {
                      setSelectedGroupId(v)
                      void loadGroupMembers(v)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a group" />
                    </SelectTrigger>
                    <SelectContent>
                      {groups.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.name} ({g.group_type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedRecipients.length > 0 ? (
                    <p className="text-sm text-muted-foreground">
                      <Users className="mr-1 inline h-4 w-4" />
                      {selectedRecipients.length} members loaded · {deliverableCount} reachable via {COMMS_CHANNEL_LABELS[channel]}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {audienceMode === 'manual' ? (
                <div className="space-y-2">
                  <Label>Paste phones or emails (one per line, or comma-separated)</Label>
                  <Textarea
                    rows={4}
                    placeholder={channel === 'sms' ? '+233241234567\n+233551234567' : 'name@example.com'}
                    value={manualRecipients}
                    onChange={(e) => setManualRecipients(e.target.value)}
                  />
                </div>
              ) : null}

              {audienceMode !== 'manual' && selectedRecipients.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {selectedRecipients.slice(0, 8).map((r) => (
                    <Badge key={`${r.entity_id}-${r.id}`} variant="secondary">
                      {r.name}
                    </Badge>
                  ))}
                  {selectedRecipients.length > 8 ? (
                    <Badge variant="outline">+{selectedRecipients.length - 8} more</Badge>
                  ) : null}
                </div>
              ) : null}

              {audienceMode !== 'manual' && householdIds.length > 0 ? (
                <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                  <Checkbox
                    checked={onePerHouse}
                    onCheckedChange={(value) => setOnePerHouse(value === true)}
                    aria-describedby="comms-household-hint"
                  />
                  <span>
                    One text per household
                    <span id="comms-household-hint" className="block text-xs text-neutral-500 dark:text-neutral-400">
                      {onePerHouse && householdDropped.length > 0
                        ? `${householdDropped.length} family member${householdDropped.length === 1 ? '' : 's'} left out; the main contact gets it`
                        : 'Send only to the main contact (or first reachable person) in each family'}
                    </span>
                  </span>
                </label>
              ) : null}

              {channel === 'email' ? (
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject line" />
                </div>
              ) : null}

              <div className="space-y-2" data-tour="comms-message">
                <Label>Message</Label>
                <Textarea
                  rows={5}
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  placeholder="Hello {{name}}, …"
                />
              </div>

              {channel === 'sms' && selectedRecipients.length > 0 ? (
                <div className="space-y-1 break-words rounded-lg border bg-neutral-50 px-3 py-2 text-xs text-neutral-700 dark:bg-white/[0.04] dark:text-neutral-300">
                  <p>
                    {deliverableCount} valid Ghana phones · Hubtel format 233XXXXXXXXX
                  </p>
                  {selectedRecipients
                    .filter((r) => r.phone)
                    .slice(0, 5)
                    .map((r) => (
                      <p key={`${r.entity_id}-${r.id}`} className="font-mono">
                        {r.name}: {r.phone} → {normalizeSmsPhone(r.phone!)}{' '}
                        {isValidSmsPhone(r.phone) ? '✓' : '✗'}
                      </p>
                    ))}
                </div>
              ) : null}

              <FormActionBar className="sm:justify-start">
              <Button
                data-tour="comms-send"
                disabled={sending || (audienceMode !== 'manual' && deliverableCount === 0 && !manualRecipients.trim())}
                onClick={requestSend}
              >
                <Send className="mr-2 h-4 w-4" />
                {sending
                  ? 'Sending…'
                  : channel === 'sms'
                    ? dryRun
                      ? 'Review dry-run SMS'
                      : 'Review & send SMS'
                    : `Send ${COMMS_CHANNEL_LABELS[channel]}`}
              </Button>
              </FormActionBar>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <Label className="text-sm text-muted-foreground">Show module</Label>
            <Select value={moduleFilter} onValueChange={(v) => setModuleFilter(v as CommsModule | 'all')}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All modules</SelectItem>
                {MODULES.map((m) => (
                  <SelectItem key={m} value={m}>
                    {COMMS_MODULE_LABELS[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Message log</CardTitle>
              <CardDescription>All outbound messages across modules, newest first.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {history.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">No messages logged yet.</p>
              ) : (
                <div className="divide-y">
                  {history.map((row) => {
                    const meta = commsMetaBadge(row.metadata)
                    return (
                    <div key={row.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:px-6">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {statusIcon(row.status)}
                          <span className="min-w-0 break-words font-medium">{row.recipient_name ?? 'Recipient'}</span>
                          <Badge variant="outline">{COMMS_MODULE_LABELS[row.module]}</Badge>
                          <Badge variant="secondary">{COMMS_CHANNEL_LABELS[row.channel]}</Badge>
                          <Badge
                            variant={
                              row.status === 'failed' || row.status === 'bounced'
                                ? 'danger'
                                : row.status === 'sent' || row.status === 'delivered'
                                  ? 'success'
                                  : 'warning'
                            }
                          >
                            {COMMS_STATUS_LABELS[row.status]}
                          </Badge>
                          {meta.provider ? (
                            <Badge variant="outline" className="font-mono text-[10px]">
                              {meta.provider}
                            </Badge>
                          ) : null}
                          {meta.dryRun ? <Badge variant="secondary">dry-run</Badge> : null}
                          {meta.test ? <Badge variant="secondary">test</Badge> : null}
                        </div>
                        {row.subject ? <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{row.subject}</p> : null}
                        <p className="line-clamp-2 text-sm text-muted-foreground">{row.message_body}</p>
                        <p className="flex flex-wrap items-center gap-x-1 text-xs text-muted-foreground">
                          {row.recipient_email ? (
                            <span className="break-all">{row.recipient_email}</span>
                          ) : row.recipient_phone ? (
                            <PhoneLink phone={row.recipient_phone} name={row.recipient_name} />
                          ) : (
                            '—'
                          )}
                          {row.sent_at ? <span>· {new Date(row.sent_at).toLocaleString()}</span> : null}
                        </p>
                        {row.provider_message_id ? (
                          <p className="font-mono text-[11px] text-neutral-500 dark:text-neutral-400">
                            id {row.provider_message_id}
                          </p>
                        ) : null}
                        {row.error_message ? (
                          <p className="text-xs text-red-600 dark:text-red-300">{row.error_message}</p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 flex-row-reverse items-center justify-end gap-2 sm:flex-col sm:items-end">
                        {(row.status === 'sent' ||
                          row.status === 'delivered' ||
                          row.status === 'failed' ||
                          row.status === 'bounced') &&
                        (row.channel === 'sms'
                          ? Boolean(row.recipient_phone)
                          : Boolean(row.recipient_email)) ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="min-h-10 cursor-pointer"
                            disabled={resendingId === row.id}
                            aria-label={`Resend ${row.channel} to ${
                              row.recipient_phone ?? row.recipient_email ?? 'recipient'
                            }`}
                            onClick={() => void handleResend(row)}
                          >
                            <RefreshCw
                              className={cn(
                                'mr-1.5 h-3.5 w-3.5',
                                resendingId === row.id && 'animate-spin'
                              )}
                            />
                            {resendingId === row.id ? 'Resending…' : 'Resend'}
                          </Button>
                        ) : null}
                        {row.batch_id ? (
                          <Badge variant="outline" className="font-mono text-[10px]">
                            batch {row.batch_id.slice(0, 8)}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

    </PageContainer>
  )
}
