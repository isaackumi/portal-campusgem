'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { MessageCircle, Pencil, Phone, UserPlus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LoadingSpinner } from '@/components/ui/loading'
import { cn } from '@/lib/utils'
import { telHref, whatsAppChatHref } from '@/lib/contact-links'
import { shortDay, whatsAppOpener } from '@/lib/outreach/logic'
import {
  OUTREACH_OUTCOME_LABELS,
  OUTREACH_OUTCOMES,
  OUTREACH_STATUS_LABELS,
  OUTREACH_STATUS_TONES,
  isOutreachOutcome,
  type OutreachOutcome,
} from '@/lib/outreach/options'
import { OUTREACH_STATUSES, type OutreachCampus, type OutreachContact, type OutreachEvent, type OutreachStatus } from '@/lib/outreach/types'
import type { OutreachAssignee } from '@/lib/actions/outreach'
import { useOutreachContact, useOutreachMutations } from '@/components/outreach/use-outreach'

/** One student: call / WhatsApp, one-tap outcomes, assign, answers and timeline. */
export function ContactSheet({
  campus,
  contactId,
  placeholder,
  onClose,
  me,
  canManage,
  todayIso,
  assignees,
  onEdit,
}: {
  campus: OutreachCampus
  contactId: string | null
  placeholder?: OutreachContact
  onClose: () => void
  me: { id: string; name: string }
  canManage: boolean
  todayIso: string
  assignees?: OutreachAssignee[]
  onEdit: (contact: OutreachContact) => void
}) {
  const query = useOutreachContact(campus.id, contactId, placeholder)
  const m = useOutreachMutations(campus.id, me)
  const [channel, setChannel] = useState<'call' | 'whatsapp'>('call')
  const [note, setNote] = useState('')

  useEffect(() => {
    setNote('')
    setChannel('call')
  }, [contactId])

  const c = query.data?.contact
  const events = query.data?.events ?? []
  const canWork = canManage || Boolean(c && (c.assigned_to === me.id || c.met_by_user_id === me.id))
  const waNumber = c?.whatsapp || c?.phone
  const tel = telHref(c?.phone)
  const wa = c
    ? whatsAppChatHref(waNumber, whatsAppOpener({ contact: c, senderName: me.name, campusLabel: campus.label, campusPlace: campus.name, todayIso }))
    : null

  function outcome(o: OutreachOutcome) {
    if (!c) return
    m.record.mutate({ contactId: c.id, channel, outcome: o, note: note.trim() || undefined })
    setNote('')
  }

  function saveNote() {
    if (!c || !note.trim()) return
    m.record.mutate({ contactId: c.id, channel: 'note', note: note.trim() })
    setNote('')
  }

  return (
    <Dialog open={Boolean(contactId)} onOpenChange={(o) => (!o ? onClose() : undefined)}>
      <DialogContent className="grid-cols-1 sm:max-w-lg" data-tour="outreach-sheet">
        {!c ? (
          <div className="flex justify-center py-10">
            <DialogTitle className="sr-only">Loading</DialogTitle>
            <LoadingSpinner />
          </div>
        ) : (
          <>
            <DialogHeader className="min-w-0 pr-8 text-left">
              <DialogTitle className="break-words text-xl leading-tight">{c.full_name}</DialogTitle>
              <DialogDescription className="break-words">{placeLine(c) || 'No details yet'}</DialogDescription>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Badge variant={OUTREACH_STATUS_TONES[c.status]}>{OUTREACH_STATUS_LABELS[c.status]}</Badge>
                {c.bible_study === 'yes' ? <Badge variant="warning">Bible study: yes</Badge> : null}
                {c.user_id ? <Badge variant="success">In the fellowship</Badge> : null}
              </div>
            </DialogHeader>

            <div className="grid min-w-0 grid-cols-2 gap-3">
              <Button asChild={Boolean(tel)} disabled={!tel} className="h-14 text-base" onClick={() => setChannel('call')}>
                {tel ? (
                  <a href={tel}>
                    <Phone className="mr-2 h-5 w-5" aria-hidden />
                    Call
                  </a>
                ) : (
                  <span>No number</span>
                )}
              </Button>
              <Button
                asChild={Boolean(wa)}
                disabled={!wa}
                className="h-14 bg-emerald-600 text-base text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                onClick={() => setChannel('whatsapp')}
              >
                {wa ? (
                  <a href={wa} target="_blank" rel="noreferrer">
                    <MessageCircle className="mr-2 h-5 w-5" aria-hidden />
                    WhatsApp
                  </a>
                ) : (
                  <span>No WhatsApp</span>
                )}
              </Button>
            </div>
            <p className="-mt-1 break-words font-mono text-sm text-neutral-600 dark:text-neutral-400">
              {localPhone(c.phone)}
              {c.whatsapp && c.whatsapp !== c.phone ? ` · WhatsApp ${localPhone(c.whatsapp)}` : ''}
            </p>

            {canWork ? (
              <section className="grid min-w-0 grid-cols-1 gap-3" aria-label="How did it go?">
                <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                  <h3 className="app-section-title">How did it go?</h3>
                  <div className="flex rounded-lg bg-neutral-100 p-0.5 text-[13px] dark:bg-white/[0.06]" role="radiogroup" aria-label="By">
                    {(['call', 'whatsapp'] as const).map((ch) => (
                      <button
                        key={ch}
                        type="button"
                        role="radio"
                        aria-checked={channel === ch}
                        onClick={() => setChannel(ch)}
                        className={cn(
                          'min-h-11 rounded-md px-3 font-medium',
                          channel === ch
                            ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-800 dark:text-white'
                            : 'text-neutral-600 dark:text-neutral-400'
                        )}
                      >
                        {ch === 'call' ? 'Call' : 'WhatsApp'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid min-w-0 grid-cols-2 gap-2">
                  {OUTREACH_OUTCOMES.map((o) => (
                    <Button
                      key={o}
                      type="button"
                      variant="outline"
                      disabled={m.record.isPending}
                      onClick={() => outcome(o)}
                      className={cn(
                        'h-auto min-h-12 whitespace-normal px-3 py-2 text-[15px] leading-tight',
                        o === 'joined' && 'col-span-2',
                        c.last_outcome === o && 'border-brand-400 dark:border-brand-500/60'
                      )}
                    >
                      {OUTREACH_OUTCOME_LABELS[o]}
                    </Button>
                  ))}
                </div>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  placeholder="Note (optional): saved with the outcome you tap"
                  className="min-h-16 text-base sm:text-base"
                  aria-label="Note"
                />
                {note.trim() ? (
                  <Button type="button" variant="secondary" className="h-11" onClick={saveNote} disabled={m.record.isPending}>
                    Save just the note
                  </Button>
                ) : null}
              </section>
            ) : null}

            {canManage ? (
              <section className="grid min-w-0 grid-cols-1 gap-2">
                <h3 className="app-section-title">Following up</h3>
                <Select
                  value={c.assigned_to ?? 'nobody'}
                  onValueChange={(value) => {
                    const person = value === 'nobody' ? null : assignees?.find((a) => a.user_id === value) ?? null
                    if (value !== 'nobody' && !person) return
                    m.assign.mutate({ contactIds: [c.id], person })
                  }}
                >
                  <SelectTrigger className="h-12 text-base" aria-label="Who follows them up">
                    <SelectValue placeholder="Nobody yet" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nobody">Nobody yet</SelectItem>
                    {c.assigned_to && !assignees?.some((a) => a.user_id === c.assigned_to) ? (
                      <SelectItem value={c.assigned_to}>{c.assigned_name ?? 'Someone'}</SelectItem>
                    ) : null}
                    {(assignees ?? []).map((a) => (
                      <SelectItem key={a.user_id} value={a.user_id}>
                        {a.name} ({a.open} open)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </section>
            ) : c.assigned_name ? (
              <p className="text-sm text-neutral-600 dark:text-neutral-400">Followed up by {c.assigned_to === me.id ? 'you' : c.assigned_name}</p>
            ) : null}

            {canWork ? (
              <section className="grid min-w-0 grid-cols-1 gap-2">
                <h3 className="app-section-title">Status</h3>
                <Select value={c.status} onValueChange={(s) => m.setStatus.mutate({ contactId: c.id, status: s as OutreachStatus })}>
                  <SelectTrigger className="h-12 text-base" aria-label="Status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OUTREACH_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {OUTREACH_STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </section>
            ) : null}

            <section className="grid min-w-0 grid-cols-1 gap-3">
              <h3 className="app-section-title">Their answers</h3>
              <dl className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                <Answer label="Level" value={c.level ? (/^\d+$/.test(c.level) ? `Level ${c.level}` : c.level) : undefined} />
                <Answer label="Programme" value={c.programme} />
                <Answer
                  label="Lives"
                  value={
                    c.residence === 'hall'
                      ? [c.hall || 'Hall', c.room ? `room ${c.room}` : ''].filter(Boolean).join(', ')
                      : c.residence === 'non_resident'
                        ? `Non-resident${c.area ? `, ${c.area}` : ''}`
                        : undefined
                  }
                />
                <Answer label="Student ID" value={c.student_id} mono />
                <Answer
                  label="Can help with"
                  value={[...(c.ministry_interests ?? []).filter((x) => x !== 'Other'), c.ministry_other].filter(Boolean).join(', ') || undefined}
                  wide
                />
                <Answer label="Bible study" value={c.bible_study === 'yes' ? 'Yes' : c.bible_study === 'no' ? 'No' : undefined} />
                <Answer label="Met" value={`${shortDay(c.met_on)}${c.met_by_name ? ` by ${c.met_by_name}` : c.source === 'qr' ? ' (QR form)' : ''}`} />
                <Answer label="Prayer request" value={c.prayer_request} wide prewrap />
              </dl>
            </section>

            <section className="grid min-w-0 grid-cols-1 gap-2">
              <h3 className="app-section-title">Timeline</h3>
              {query.isPlaceholderData && events.length === 0 ? (
                <div className="flex justify-center py-3">
                  <LoadingSpinner size="sm" />
                </div>
              ) : events.length === 0 ? (
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Nothing yet.</p>
              ) : (
                <ol className="grid min-w-0 grid-cols-1 gap-3 border-l border-neutral-200 pl-4 dark:border-white/10">
                  {[...events].reverse().map((e) => (
                    <TimelineItem key={e.id} event={e} me={me.id} />
                  ))}
                </ol>
              )}
            </section>

            <div className="grid min-w-0 grid-cols-1 gap-2 border-t border-neutral-200/80 pt-4 dark:border-white/[0.08] sm:grid-cols-2">
              {canWork ? (
                <Button type="button" variant="outline" className="h-12" onClick={() => onEdit(c)}>
                  <Pencil className="mr-2 h-4 w-4" aria-hidden />
                  Edit details
                </Button>
              ) : null}
              {canManage ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-auto min-h-12 whitespace-normal py-2 leading-tight"
                  disabled={Boolean(c.user_id) || m.join.isPending}
                  onClick={() => m.join.mutate({ contactId: c.id })}
                >
                  {m.join.isPending ? <LoadingSpinner size="sm" className="mr-2" /> : <UserPlus className="mr-2 h-4 w-4 shrink-0" aria-hidden />}
                  {c.user_id ? `In the ${campus.label} fellowship` : `Add to ${campus.label} fellowship`}
                </Button>
              ) : null}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function localPhone(phone: string | undefined): string {
  if (!phone) return ''
  return /^\+233\d{9}$/.test(phone) ? `0${phone.slice(4)}` : phone
}

/** "Volta Hall, room B12 · Level 200 · BSc Nursing" */
export function placeLine(c: OutreachContact): string {
  const where =
    c.residence === 'hall'
      ? [c.hall, c.room ? `room ${c.room}` : ''].filter(Boolean).join(', ')
      : c.residence === 'non_resident'
        ? c.area || 'Non-resident'
        : ''
  const level = c.level ? (/^\d+$/.test(c.level) ? `Level ${c.level}` : c.level) : ''
  return [where, level, c.programme].filter(Boolean).join(' · ')
}

function Answer({ label, value, mono, wide, prewrap }: { label: string; value?: string; mono?: boolean; wide?: boolean; prewrap?: boolean }) {
  return (
    <div className={cn('min-w-0', wide && 'sm:col-span-2')}>
      <dt className="app-stat-label">{label}</dt>
      <dd
        className={cn(
          'mt-0.5 break-words text-[15px]',
          value ? 'text-neutral-900 dark:text-neutral-100' : 'text-neutral-400 dark:text-neutral-500',
          mono && value && 'font-mono',
          prewrap && 'whitespace-pre-wrap'
        )}
      >
        {value || 'Not given'}
      </dd>
    </div>
  )
}

function eventText(e: OutreachEvent): ReactNode {
  const outcome = e.outcome && isOutreachOutcome(e.outcome) ? OUTREACH_OUTCOME_LABELS[e.outcome] : null
  switch (e.kind) {
    case 'met':
      return 'Met on outreach'
    case 'call':
      return outcome ? `Call: ${outcome}` : 'Called'
    case 'whatsapp':
      return outcome ? `WhatsApp: ${outcome}` : 'WhatsApp'
    case 'status':
      return `Status: ${e.outcome && e.outcome in OUTREACH_STATUS_LABELS ? OUTREACH_STATUS_LABELS[e.outcome as OutreachStatus] : e.outcome ?? ''}`
    case 'assign':
      return 'Assignment'
    default:
      return 'Note'
  }
}

function TimelineItem({ event, me }: { event: OutreachEvent; me: string }) {
  const when = new Date(event.at)
  const label = when.toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
  return (
    <li className="relative min-w-0">
      <span className="absolute -left-[22px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-neutral-400 dark:border-neutral-900 dark:bg-neutral-500" aria-hidden />
      <p className="break-words text-[15px] font-medium text-neutral-900 dark:text-neutral-100">{eventText(event)}</p>
      {event.note ? <p className="whitespace-pre-wrap break-words text-sm text-neutral-700 dark:text-neutral-300">{event.note}</p> : null}
      <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
        {label}
        {event.by_name ? ` · ${event.by_user_id === me ? 'you' : event.by_name}` : ''}
      </p>
    </li>
  )
}
