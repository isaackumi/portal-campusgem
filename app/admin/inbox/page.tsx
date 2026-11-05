'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { Archive, ArchiveRestore, ArrowLeft, Inbox, Loader2, Mail, MailOpen, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading'
import { PageHeader } from '@/components/layout/page-header'
import { AccessDenied } from '@/components/auth/access-denied'
import { PhoneLink } from '@/components/contact/phone-link'
import { useAuth } from '@/components/providers'
import { useToast } from '@/hooks/use-toast'
import { refreshInboxUnreadBadge } from '@/components/inbox/inbox-unread-badge'
import {
  archiveInboxThreadAction,
  getInboxThreadAction,
  listInboxThreadsAction,
  markInboxThreadAction,
  replyInboxThreadAction,
  setSmsOptOutAction,
  type InboxThread,
} from '@/lib/actions/inbox'
import { INBOX_TAG_LABELS, type InboxThreadSummary } from '@/lib/comms/inbound'
import { smsSegmentInfo } from '@/lib/comms/sms-segments'
import { cn } from '@/lib/utils'

const REFRESH_MS = 30_000

function displayPhone(p: string): string {
  return /^233\d{9}$/.test(p) ? `0${p.slice(3)}` : p
}

function when(ms: number): string {
  const d = new Date(ms)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) {
    return d.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' })
  }
  return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
}

function tagTone(tag: string): 'warning' | 'success' | 'secondary' | 'brand' {
  if (tag === 'opt-out' || tag === 'confirm-no') return 'warning'
  if (tag === 'confirm-yes' || tag === 'opt-in') return 'success'
  return 'secondary'
}

export default function InboxPage() {
  const { loading: authLoading, can } = useAuth()
  const allowed = can('sms.send')
  const [threads, setThreads] = useState<InboxThreadSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'inbox' | 'archived'>('inbox')
  const [selected, setSelected] = useState<string | null>(null)

  const loadThreads = useCallback(async () => {
    const res = await listInboxThreadsAction()
    if (res.error) setError(res.error)
    setThreads(res.data ?? [])
  }, [])

  useEffect(() => {
    if (!allowed) return
    void loadThreads()
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void loadThreads()
    }, REFRESH_MS)
    return () => window.clearInterval(timer)
  }, [allowed, loadThreads])

  const visible = useMemo(
    () => (threads ?? []).filter((t) => (view === 'archived' ? t.archived : !t.archived)),
    [threads, view]
  )
  const unreadTotal = useMemo(() => (threads ?? []).reduce((n, t) => n + t.unread, 0), [threads])

  if (authLoading) return <LoadingSpinner />
  if (!allowed) return <AccessDenied permission="sms.send" />

  return (
    <div>
      <PageHeader
        title="Inbox"
        description="Text replies from members, visitors and camp registrants. STOP opts someone out of bulk texts; YES and NO from camp registrants are tagged so you can update them."
      />
      {error ? <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p> : null}

      <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <section data-tour="inbox-threads" className={cn('dashboard-panel overflow-hidden', selected && 'max-lg:hidden')} aria-label="Conversations">
          <div data-tour="inbox-views" className="flex gap-1 border-b border-neutral-200/80 p-2 dark:border-white/[0.06]">
            {(['inbox', 'archived'] as const).map((v) => (
              <Button key={v} size="sm" variant={view === v ? 'secondary' : 'ghost'} onClick={() => setView(v)} aria-pressed={view === v}>
                {v === 'inbox' ? `Inbox${unreadTotal ? ` (${unreadTotal})` : ''}` : 'Archived'}
              </Button>
            ))}
          </div>
          {threads == null ? (
            <div className="p-6">
              <LoadingSpinner />
            </div>
          ) : visible.length === 0 ? (
            <div className="p-8 text-center">
              <Inbox className="mx-auto h-8 w-8 text-neutral-400 dark:text-neutral-500" aria-hidden />
              <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">
                {view === 'inbox' ? 'No replies yet. They appear here when people text back.' : 'Nothing archived.'}
              </p>
            </div>
          ) : (
            <ul className="max-h-[70vh] divide-y divide-neutral-100 overflow-y-auto dark:divide-white/[0.04]">
              {visible.map((t) => (
                <li key={t.phone}>
                  <button
                    type="button"
                    onClick={() => setSelected(t.phone)}
                    aria-current={selected === t.phone ? 'true' : undefined}
                    className={cn(
                      'block w-full px-4 py-3 text-left transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500/40 dark:hover:bg-white/[0.03]',
                      selected === t.phone && 'bg-brand-50/60 dark:bg-brand-400/10'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          'truncate text-sm text-neutral-900 dark:text-white',
                          t.unread ? 'font-semibold' : 'font-medium'
                        )}
                      >
                        {t.sender_name ?? <span className="font-mono">{displayPhone(t.phone)}</span>}
                      </span>
                      <span className="shrink-0 text-xs text-neutral-500 dark:text-neutral-400">{when(t.last_at)}</span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2">
                      <p className="line-clamp-1 flex-1 text-sm text-neutral-600 dark:text-neutral-400">{t.last_body}</p>
                      {t.unread ? (
                        <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-brand-600 px-1.5 text-[11px] font-semibold leading-5 text-white dark:bg-brand-500 dark:text-white">
                          {t.unread}
                          <span className="sr-only"> unread</span>
                        </span>
                      ) : null}
                    </div>
                    {t.tags.length ? (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {t.tags.map((tag) => (
                          <Badge key={tag} variant={tagTone(tag)}>
                            {INBOX_TAG_LABELS[tag] ?? tag}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section data-tour="inbox-conversation" className={cn('dashboard-panel min-h-[420px]', !selected && 'max-lg:hidden')} aria-label="Conversation">
          {selected ? (
            <ThreadView
              key={selected}
              phone={selected}
              onBack={() => setSelected(null)}
              onChanged={() => {
                void loadThreads()
                refreshInboxUnreadBadge()
              }}
            />
          ) : (
            <div className="flex h-full min-h-[420px] items-center justify-center p-8 text-sm text-neutral-500 dark:text-neutral-400">
              Choose a conversation.
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function ThreadView({ phone, onBack, onChanged }: { phone: string; onBack: () => void; onChanged: () => void }) {
  const { toast } = useToast()
  const [thread, setThread] = useState<InboxThread | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reply, setReply] = useState('')
  const [sending, startSend] = useTransition()
  const [working, startWork] = useTransition()
  const endRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    const res = await getInboxThreadAction(phone)
    if (res.data) setThread(res.data)
    else setError(res.error)
  }, [phone])

  useEffect(() => {
    void load().then(onChanged)
    // onChanged is stable enough; only reload when the phone changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load])

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [thread?.items.length])

  const segments = smsSegmentInfo(reply)

  function send() {
    const message = reply.trim()
    if (!message) return
    startSend(async () => {
      const res = await replyInboxThreadAction({ phone, message })
      if (res.error) {
        toast({ title: 'Reply not sent', description: res.error, variant: 'destructive' })
        return
      }
      setReply('')
      toast({ title: 'Reply sent' })
      await load()
      onChanged()
    })
  }

  function run(fn: () => Promise<{ error: string | null }>, done: string) {
    startWork(async () => {
      const res = await fn()
      if (res.error) toast({ title: 'Something went wrong', description: res.error, variant: 'destructive' })
      else toast({ title: done })
      await load()
      onChanged()
    })
  }

  if (!thread) {
    return error ? <p className="p-5 text-sm text-red-600 dark:text-red-400">{error}</p> : <div className="p-6"><LoadingSpinner /></div>
  }

  const { match } = thread
  const records = [
    match.user_id ? { href: `/members/${match.user_id}`, label: `Member: ${match.user_name ?? 'profile'}` } : null,
    match.visitor_id ? { href: `/admin/rlc/visitors/${match.visitor_id}`, label: `Visitor: ${match.visitor_name ?? 'record'}` } : null,
    match.camp_registration_id
      ? { href: `/admin/camp-meeting/registrations/${match.camp_registration_id}`, label: `Camp: ${match.camp_registration_name ?? 'registration'}` }
      : null,
  ].filter((r): r is { href: string; label: string } => r != null)

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-neutral-200/80 p-4 dark:border-white/[0.06]">
        <div className="flex min-w-0 items-start gap-2">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={onBack} aria-label="Back to conversations">
            <ArrowLeft className="h-4 w-4" aria-hidden />
          </Button>
          <div className="min-w-0">
            <p className="truncate font-semibold text-neutral-900 dark:text-white">{match.sender_name ?? 'Unknown sender'}</p>
            <PhoneLink phone={displayPhone(phone)} name={match.sender_name} className="text-sm text-neutral-600 dark:text-neutral-300" />
            {records.length ? (
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                {records.map((r) => (
                  <Link key={r.href} href={r.href} className="text-brand-600 hover:underline dark:text-brand-300">
                    {r.label}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">No matching record for this number.</p>
            )}
            {match.sms_opt_out ? (
              <p className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-amber-700 dark:text-amber-300">
                Opted out of bulk SMS.
                <button
                  type="button"
                  disabled={working}
                  className="font-medium underline"
                  onClick={() => run(() => setSmsOptOutAction(match.user_id!, false), 'Opted back in')}
                >
                  Opt back in
                </button>
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" disabled={working} onClick={() => run(() => markInboxThreadAction(phone, false), 'Marked unread')}>
            <Mail className="mr-1.5 h-4 w-4" aria-hidden />
            Mark unread
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={working}
            onClick={() => run(() => archiveInboxThreadAction(phone, !thread.archived), thread.archived ? 'Moved to inbox' : 'Archived')}
          >
            {thread.archived ? <ArchiveRestore className="mr-1.5 h-4 w-4" aria-hidden /> : <Archive className="mr-1.5 h-4 w-4" aria-hidden />}
            {thread.archived ? 'Unarchive' : 'Archive'}
          </Button>
        </div>
      </header>

      <div className="max-h-[55vh] flex-1 space-y-3 overflow-y-auto p-4">
        {thread.items.map((m) => (
          <div key={`${m.direction}-${m.id}`} className={cn('flex', m.direction === 'out' ? 'justify-end' : 'justify-start')}>
            <div className="max-w-[80%]">
              <p
                className={cn(
                  'whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                  m.direction === 'out'
                    ? 'rounded-br-md bg-brand-600 text-white dark:bg-brand-500 dark:text-white'
                    : 'rounded-bl-md bg-neutral-100 text-neutral-800 dark:bg-neutral-700/60 dark:text-neutral-100'
                )}
              >
                {m.body}
              </p>
              <p
                className={cn(
                  'mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-neutral-500 dark:text-neutral-400',
                  m.direction === 'out' && 'justify-end'
                )}
              >
                {m.direction === 'in' ? <MailOpen className="h-3 w-3" aria-hidden /> : null}
                {when(m.at)}
                {m.status && m.status !== 'sent' ? ` · ${m.status}` : ''}
                {(m.tags ?? []).map((tag) => (
                  <Badge key={tag} variant={tagTone(tag)}>
                    {INBOX_TAG_LABELS[tag] ?? tag}
                  </Badge>
                ))}
              </p>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form
        className="border-t border-neutral-200/80 p-4 dark:border-white/[0.06]"
        onSubmit={(e) => {
          e.preventDefault()
          send()
        }}
      >
        <label htmlFor="inbox-reply" className="sr-only">
          Reply
        </label>
        <textarea
          id="inbox-reply"
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send()
          }}
          rows={3}
          maxLength={918}
          placeholder="Write a reply…"
          className="w-full resize-y rounded-xl border border-neutral-200 bg-white p-3 text-base text-neutral-900 placeholder:text-neutral-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500 sm:text-sm"
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className={cn('text-xs', segments.segments > 1 ? 'text-amber-700 dark:text-amber-300' : 'text-neutral-500 dark:text-neutral-400')}>
            {reply ? `${segments.length} characters · ${segments.segments} SMS` : 'Ctrl+Enter to send'}
          </span>
          <Button type="submit" disabled={!reply.trim() || sending}>
            {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : <Send className="mr-2 h-4 w-4" aria-hidden />}
            Send reply
          </Button>
        </div>
      </form>
    </div>
  )
}
