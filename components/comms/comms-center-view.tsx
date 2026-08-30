'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/components/providers'
import {
  getCommsProviderStatusAction,
  getCommsStatsAction,
  listCommunicationsAction,
  loadCommsGroupsAction,
  resolveGroupRecipientsAction,
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
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
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
      return <CheckCircle2 className="h-4 w-4 text-emerald-600" />
    case 'failed':
    case 'bounced':
      return <XCircle className="h-4 w-4 text-red-600" />
    case 'pending':
      return <Clock className="h-4 w-4 text-amber-600" />
    default:
      return <AlertCircle className="h-4 w-4 text-slate-400" />
  }
}

function StatTile({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </CardHeader>
    </Card>
  )
}

export function CommsCenterView() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [activeTab, setActiveTab] = useState('compose')
  const [moduleFilter, setModuleFilter] = useState<CommsModule | 'all'>('all')
  const [history, setHistory] = useState<CommunicationRecord[]>([])
  const [stats, setStats] = useState<CommsStats | null>(null)
  const [providers, setProviders] = useState<{ email: string; sms: boolean } | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  // Compose state
  const [module, setModule] = useState<CommsModule>('church')
  const [channel, setChannel] = useState<CommsChannel>('sms')
  const [audienceMode, setAudienceMode] = useState<'single' | 'group' | 'manual'>('single')
  const [subject, setSubject] = useState('')
  const [messageBody, setMessageBody] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<CommsRecipient[]>([])
  const [selectedRecipients, setSelectedRecipients] = useState<CommsRecipient[]>([])
  const [groups, setGroups] = useState<Array<{ id: string; name: string; group_type: string }>>([])
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [manualRecipients, setManualRecipients] = useState('')
  const [searching, setSearching] = useState(false)

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
    const timer = setTimeout(async () => {
      setSearching(true)
      const { data } = await searchCommsRecipientsAction({
        module,
        query: searchQuery,
        limit: 40,
      })
      setSearchResults(data ?? [])
      setSearching(false)
    }, 300)
    return () => clearTimeout(timer)
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

  const deliverableCount = useMemo(() => {
    return selectedRecipients.filter((r) => (channel === 'email' ? r.email : r.phone)).length
  }, [selectedRecipients, channel])

  async function handleSend() {
    if (!user?.id) return
    if (!messageBody.trim()) {
      toast({ variant: 'destructive', title: 'Message is required' })
      return
    }
    if (channel === 'email' && !subject.trim()) {
      toast({ variant: 'destructive', title: 'Subject is required for email' })
      return
    }

    setSending(true)
    const audience_type =
      audienceMode === 'group' ? 'group' : selectedRecipients.length > 1 ? 'bulk' : 'individual'

    const { data, error } = await sendCommsAction({
      module,
      channel,
      audience_type,
      sender_id: user.id,
      subject: channel === 'email' ? subject : undefined,
      message_body: messageBody,
      recipients: audienceMode === 'manual' ? [] : selectedRecipients,
      manual_recipients: audienceMode === 'manual' ? manualRecipients : undefined,
      metadata:
        audienceMode === 'group' && selectedGroupId
          ? { group_id: selectedGroupId, group_name: groups.find((g) => g.id === selectedGroupId)?.name }
          : undefined,
    })
    setSending(false)

    if (error || !data) {
      toast({ variant: 'destructive', title: 'Send failed', description: error ?? 'Unknown error' })
      return
    }

    toast({
      title: 'Messages sent',
      description: `${data.success_count} sent${data.error_count ? `, ${data.error_count} failed` : ''}.`,
    })

    setMessageBody('')
    setSubject('')
    setManualRecipients('')
    setSelectedRecipients([])
    setActiveTab('history')
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
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">Communications Center</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Send and track email & SMS across Campus Gem, RLC, and Camp — single, group, or bulk.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => void refresh()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/camp-meeting/communications">Camp bulk tools</Link>
          </Button>
        </div>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Total logged" value={stats?.total ?? 0} />
        <StatTile label="Sent / delivered" value={stats?.sent ?? 0} />
        <StatTile label="Failed" value={stats?.failed ?? 0} hint={`Email: ${providers?.email ?? 'mock'} · SMS: ${providers?.sms ? 'live' : 'mock / not configured'}`} />
        <StatTile label="SMS messages" value={stats?.sms ?? 0} hint={`${stats?.email ?? 0} emails logged`} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Label className="text-sm text-muted-foreground">History filter:</Label>
        <Select value={moduleFilter} onValueChange={(v) => setModuleFilter(v as CommsModule | 'all')}>
          <SelectTrigger className="w-44">
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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <ScrollableTabsList>
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
              <div className="grid gap-4 sm:grid-cols-3">
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
                    placeholder="Search by name, phone, or email…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <div className="max-h-56 overflow-y-auto rounded-lg border">
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
                            className="flex cursor-pointer items-center gap-3 border-b px-3 py-2 last:border-0 hover:bg-slate-50"
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

              {channel === 'email' ? (
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject line" />
                </div>
              ) : null}

              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea
                  rows={5}
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  placeholder="Hello {{name}}, …"
                />
              </div>

              {!providers?.sms && channel === 'sms' ? (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  SMS provider not configured yet — messages will use mock mode until{' '}
                  <code className="text-xs">SMS_API_URL</code> is set.
                </p>
              ) : null}

              <Button
                className="w-full sm:w-auto"
                disabled={sending || (audienceMode !== 'manual' && deliverableCount === 0 && !manualRecipients.trim())}
                onClick={() => void handleSend()}
              >
                <Send className="mr-2 h-4 w-4" />
                {sending ? 'Sending…' : `Send ${COMMS_CHANNEL_LABELS[channel]}`}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
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
                  {history.map((row) => (
                    <div key={row.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {statusIcon(row.status)}
                          <span className="font-medium">{row.recipient_name ?? 'Recipient'}</span>
                          <Badge variant="outline">{COMMS_MODULE_LABELS[row.module]}</Badge>
                          <Badge variant="secondary">{COMMS_CHANNEL_LABELS[row.channel]}</Badge>
                          <Badge
                            className={cn(
                              row.status === 'failed' || row.status === 'bounced'
                                ? 'bg-red-100 text-red-800'
                                : row.status === 'sent' || row.status === 'delivered'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                            )}
                          >
                            {COMMS_STATUS_LABELS[row.status]}
                          </Badge>
                        </div>
                        {row.subject ? <p className="text-sm font-medium text-slate-700">{row.subject}</p> : null}
                        <p className="line-clamp-2 text-sm text-muted-foreground">{row.message_body}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.recipient_email ?? row.recipient_phone ?? '—'}
                          {row.sent_at ? ` · ${new Date(row.sent_at).toLocaleString()}` : ''}
                        </p>
                        {row.error_message ? (
                          <p className="text-xs text-red-600">{row.error_message}</p>
                        ) : null}
                      </div>
                      {row.batch_id ? (
                        <Badge variant="outline" className="shrink-0 font-mono text-[10px]">
                          batch {row.batch_id.slice(0, 8)}
                        </Badge>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageContainer>
  )
}
